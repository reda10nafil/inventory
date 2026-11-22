// FurInventory Pro - Inventory Context
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, TimelineEvent, Alert } from '../types';
import { isDormant, needsPromotion } from '../services/mockData';
import { useAuth } from './AuthContext';
import { supabase } from '../backend-auth/supabase/client';
import { ensureOrganizationDriveFolder, uploadDriveFile } from '../backend-auth/google/driveApi';
import { usage } from '../utils/productRules';
import { describeChanges } from '../utils/productChanges';
import { countOf, editableUpdates, moveOf, movementOf, saleOf, withInitialStock, withStartingStock, type CountResult } from '../utils/inventoryOps';
import { lowStockAlert, mergeAlerts } from '../utils/alerts';
import type { Movement, MovementError } from '../utils/stock';

/** Library/Folder structure - ID uses slug format for Google Sheets compatibility */
export interface Library {
  id: string; // slug format, e.g., 'pellicce', 'accessori'
  name: string;
  icon: string;
  createdAt: string;
  updatedAt?: string;
  barcode?: string;
  nfcTag?: string;
}

const DEFAULT_LIBRARIES: Library[] = [
  { id: 'pellicce', name: 'Pellicce', icon: 'inventory', createdAt: new Date().toISOString() },
];

async function hydrateSharedProductImages(items: Product[]): Promise<Product[]> {
  return Promise.all(items.map(async (product) => {
    const paths = product.storageImagePaths || [];
    const customPaths = product.storageCustomDataPaths || {};
    if (!paths.some(Boolean) && !Object.values(customPaths).some((items) => items.some(Boolean))) return product;
    const images = [...(product.images || [])];
    await Promise.all(paths.map(async (path, index) => {
      if (!path) return;
      const { data, error } = await supabase.storage.from('organization-media').createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!error && data?.signedUrl) images[index] = data.signedUrl;
    }));
    const customData = await Promise.all((product.customData || []).map(async (entry) => {
      const fieldId = entry.fieldSnapshot?.id;
      const documentPaths = fieldId ? customPaths[fieldId] || [] : [];
      if (!documentPaths.length || !Array.isArray(entry.value)) return entry;
      const values = [...entry.value];
      await Promise.all(documentPaths.map(async (path, index) => {
        if (!path) return;
        const { data, error } = await supabase.storage.from('organization-media').createSignedUrl(path, 60 * 60 * 24 * 7);
        if (!error && data?.signedUrl) values[index] = data.signedUrl;
      }));
      return { ...entry, value: values };
    }));
    return { ...product, images, customData };
  }));
}

function inferMediaType(uri: string, detectedType?: string) {
  if (detectedType) return detectedType;
  const extension = uri.match(/\.([a-z0-9]{2,8})(?:[?#]|$)/i)?.[1]?.toLowerCase();
  const known: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', pdf: 'application/pdf',
    csv: 'text/csv', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return (extension && known[extension]) || 'application/octet-stream';
}

interface InventoryContextType {
  products: Product[];
  timeline: TimelineEvent[];
  alerts: Alert[];
  libraries: Library[];
  /** Con `qty` il prodotto nasce articolo a quantità (carico iniziale nella sua posizione), con `stock` con la giacenza
   *  per posizione (import CSV, un carico iniziale per posizione); false se la quantità non va. */
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, options?: { qty?: number; stock?: Record<string, number> }) => boolean;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  restoreProduct: (id: string) => void;
  permanentlyDeleteProduct: (id: string) => void;
  moveProduct: (id: string, newLocation: string) => boolean;
  /** Pezzo unico: «venduto». Articolo a quantità: scarico di `qty` (predefinita 1) con causale vendita. */
  sellProduct: (id: string, finalPrice?: number, qty?: number) => boolean;
  /** Movimento di magazzino dalla Scheda (M04): carico, scarico, trasferimento, rettifica; il motivo se rifiutato. */
  moveStock: (id: string, movement: Movement) => { ok: true } | { ok: false; error: MovementError; available?: number };
  /** Conferma della Conta (M07): id → quantità contata (solo quelle scritte); rettifiche «conta» in un solo aggiornamento. */
  countStock: (at: string, counts: Record<string, number>) => Pick<CountResult, 'adjusted' | 'unchanged' | 'refused'>;
  scanProduct: (id: string) => void;
  dismissAlert: (alertId: string) => void;
  getProductById: (id: string) => Product | undefined;
  getTimelineForProduct: (productId: string) => TimelineEvent[];
  filterProducts: (filter: 'all' | 'available' | 'sold' | 'alert' | 'trash') => Product[];
  getTrashProducts: () => Product[];
  addLibrary: (name: string, icon: string) => void;
  updateLibrary: (id: string, updates: Partial<Library>) => void;
  deleteLibrary: (id: string) => boolean;
  getProductBySku: (sku: string) => Product | undefined;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
};

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const { organizationId, session, user } = useAuth();
  // Senza sessione (login disattivato) l'inventario resta solo locale: niente Supabase, Storage o Drive.
  const cloudEnabled = !!session;
  const [products, setProducts] = useState<Product[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [libraries, setLibraries] = useState<Library[]>(DEFAULT_LIBRARIES);
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>([]);
  // Copia dei prodotti aggiornata subito (M03): due operazioni nello stesso istante (un'automazione che sposta e
  // poi vende) devono vedere l'una il risultato dell'altra. Si legge da qui, non da `products`; ogni scrittura
  // cambia nello stato solo i campi del prodotto toccato (`patchProduct`), così non cancella le altre in coda.
  const productsRef = useRef<Product[]>(products);
  productsRef.current = products;
  const loadedOrganization = useRef<string | null>(null);
  const lastRemoteUpdate = useRef<string | null>(null);
  const uploadingMedia = useRef(new Set<string>());
  const backedUpMedia = useRef(new Set<string>());

  // Local state is keyed by organization; no operator can read another account's cache.
  useEffect(() => {
    let active = true;
    loadedOrganization.current = null;
    lastRemoteUpdate.current = null;
    backedUpMedia.current.clear();
    if (!organizationId) {
      setProducts([]); setTimeline([]); setAlerts([]); setLibraries(DEFAULT_LIBRARIES); setDeletedProductIds([]);
      return;
    }
    void loadData(organizationId, cloudEnabled).then(() => {
      if (active) loadedOrganization.current = organizationId;
    });
    return () => { active = false; };
  }, [organizationId, cloudEnabled]);

  // Persist offline immediately and coalesce cloud writes while editing.
  useEffect(() => {
    if (!organizationId || loadedOrganization.current !== organizationId) return;
    const prefix = `inventory:v1:${organizationId}`;
    const serialized = { products, timeline, alerts, libraries, deleted_product_ids: deletedProductIds };
    void Promise.all(Object.entries(serialized).map(([key, value]) =>
      AsyncStorage.setItem(`${prefix}:${key}`, JSON.stringify(value)),
    ));
    if (!cloudEnabled) return;

    const timer = setTimeout(() => {
      void (supabase as any).rpc('merge_inventory_snapshot', {
        target_organization_id: organizationId,
        incoming_products: products,
        incoming_timeline: timeline,
        incoming_alerts: alerts,
        incoming_libraries: libraries,
        incoming_deleted_product_ids: deletedProductIds,
      }).then(({ data, error }: { data: any; error: unknown }) => {
          if (error) console.warn('Inventario salvato sul dispositivo; sincronizzazione cloud non riuscita.', error);
          else if (data) {
            lastRemoteUpdate.current = data.updated_at;
            if (JSON.stringify(data.products) !== JSON.stringify(products)) setProducts(data.products || []);
            if (JSON.stringify(data.timeline) !== JSON.stringify(timeline)) setTimeline(data.timeline || []);
            if (JSON.stringify(data.alerts) !== JSON.stringify(alerts)) setAlerts(data.alerts || []);
            if (JSON.stringify(data.libraries) !== JSON.stringify(libraries)) setLibraries(data.libraries || DEFAULT_LIBRARIES);
            if (JSON.stringify(data.deleted_product_ids) !== JSON.stringify(deletedProductIds)) setDeletedProductIds(data.deleted_product_ids || []);
          }
        });
    }, 900);
    return () => clearTimeout(timer);
  }, [organizationId, cloudEnabled, products, timeline, alerts, libraries, deletedProductIds]);

  // Realtime propagation keeps operator profiles in the same organization in sync.
  useEffect(() => {
    if (!organizationId || !cloudEnabled) return;
    const channel = supabase.channel(`inventory:${organizationId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'organization_inventory_snapshots',
        filter: `organization_id=eq.${organizationId}`,
      }, (payload: any) => {
        if (payload.eventType === 'DELETE' || !payload.new) return;
        const incoming = payload.new;
        if (incoming.updated_by === user?.id) return;
        if (lastRemoteUpdate.current && incoming.updated_at <= lastRemoteUpdate.current) return;
        lastRemoteUpdate.current = incoming.updated_at;
        loadedOrganization.current = organizationId;
        void hydrateSharedProductImages(Array.isArray(incoming.products) ? incoming.products : []).then(setProducts);
        setTimeline(Array.isArray(incoming.timeline) ? incoming.timeline : []);
        setAlerts(Array.isArray(incoming.alerts) ? incoming.alerts : []);
        setLibraries(Array.isArray(incoming.libraries) && incoming.libraries.length ? incoming.libraries : DEFAULT_LIBRARIES);
        setDeletedProductIds(Array.isArray(incoming.deleted_product_ids) ? incoming.deleted_product_ids : []);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [organizationId, cloudEnabled, user?.id]);

  // Keep product photos in tenant-private Storage for team sync; copy them to private Drive too when authorized.
  useEffect(() => {
    const token = (session as any)?.provider_token as string | undefined;
    if (!organizationId || !cloudEnabled || !products.length) return;
    const localAssets = products.flatMap((product) => [
      ...(product.images || []).map((uri, index) => ({ product, uri, index, fieldId: undefined as string | undefined })),
      ...(product.customData || []).flatMap((entry) => {
        const fieldId = entry.fieldSnapshot?.id;
        const fieldType = entry.fieldSnapshot?.type;
        if (!fieldId || (fieldType !== 'images' && fieldType !== 'document') || !Array.isArray(entry.value)) return [];
        return entry.value.map((uri: string, index: number) => ({ product, uri, index, fieldId }));
      }),
    ]).filter(({ uri }) => typeof uri === 'string' && !/^https?:\/\//i.test(uri) && !uploadingMedia.current.has(uri) && !backedUpMedia.current.has(uri));
    if (!localAssets.length) return;
    let cancelled = false;
    void (token ? ensureOrganizationDriveFolder(token, organizationId).catch((error) => {
      console.warn('Cartella Google Drive non disponibile; salvo comunque le foto nel cloud del team.', error);
      return null;
    }) : Promise.resolve(null)).then(async (folderId) => {
      await Promise.all(localAssets.map(async ({ product, uri, index, fieldId }) => {
        uploadingMedia.current.add(uri);
        try {
          const extension = uri.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i)?.[1] || 'jpg';
          const response = await fetch(uri);
          if (!response.ok) throw new Error('Il file locale non è leggibile.');
          const blob = await response.blob();
          const path = `${organizationId}/${product.id}/${Date.now()}_${index + 1}.${extension}`;
          const contentType = inferMediaType(uri, blob.type);
          const [storageResult, driveResult] = await Promise.all([
            supabase.storage.from('organization-media').upload(path, blob, {
              contentType, upsert: true,
            }).then(async ({ error }) => {
              if (error) throw error;
              const { data, error: signedError } = await supabase.storage.from('organization-media').createSignedUrl(path, 60 * 60 * 24 * 7);
              if (signedError) throw signedError;
              return { path, url: data.signedUrl };
            }).catch((error) => ({ error })),
            folderId && token
              ? uploadDriveFile(token, folderId, `${product.sku}_${index + 1}.${extension}`, blob, contentType)
                .then((file) => ({ link: file.webViewLink }))
                .catch((error) => ({ error }))
              : Promise.resolve({ link: undefined }),
          ]);
          if (cancelled) return;
          const shared = 'url' in storageResult ? storageResult : null;
          const driveLink = 'link' in driveResult ? driveResult.link : undefined;
          if (!shared && !driveLink) throw new Error('Nessun backup cloud è riuscito per questa foto.');
          if (shared) backedUpMedia.current.add(uri);
          setProducts((current) => current.map((item) => item.id !== product.id ? item : {
            ...item,
            ...(fieldId ? {
              customData: item.customData.map((entry) => entry.fieldSnapshot?.id !== fieldId || !Array.isArray(entry.value) ? entry : {
                ...entry, value: entry.value.map((value: string) => value === uri && shared ? shared.url : value),
              }),
              storageCustomDataPaths: shared ? {
                ...(item.storageCustomDataPaths || {}),
                [fieldId]: (item.customData.find((entry) => entry.fieldSnapshot?.id === fieldId)?.value || []).map((_: unknown, dataIndex: number) =>
                  dataIndex === index ? shared.path : item.storageCustomDataPaths?.[fieldId]?.[dataIndex] || ''),
              } : item.storageCustomDataPaths,
              backupCustomDataLinks: driveLink ? {
                ...(item.backupCustomDataLinks || {}),
                [fieldId]: Array.from(new Set([...(item.backupCustomDataLinks?.[fieldId] || []), driveLink])),
              } : item.backupCustomDataLinks,
            } : {
              images: item.images.map((image) => image === uri && shared ? shared.url : image),
              storageImagePaths: shared ? item.images.map((_, imageIndex) => imageIndex === index ? shared.path : item.storageImagePaths?.[imageIndex] || '') : item.storageImagePaths,
              backupImageLinks: driveLink ? Array.from(new Set([...(item.backupImageLinks || []), driveLink])) : item.backupImageLinks,
            }),
            updatedAt: new Date().toISOString(),
          }));
        } catch (error) {
          console.warn(`Backup Drive non riuscito per ${product.sku}.`, error);
        } finally {
          uploadingMedia.current.delete(uri);
        }
      }));
    }).catch((error) => console.warn('Backup foto cloud non riuscito.', error));
    return () => { cancelled = true; };
  }, [organizationId, session, products]);

  // Generate alerts for dormant products and promotion suggestions
  useEffect(() => {
    generateAlerts();
  }, [products]);

  const loadData = async (orgId: string, useCloud: boolean) => {
    try {
      const prefix = `inventory:v1:${orgId}`;
      const keys = ['products', 'timeline', 'alerts', 'libraries', 'deleted_product_ids'] as const;
      let localValues = await Promise.all(keys.map((key) => AsyncStorage.getItem(`${prefix}:${key}`)));

      // Move the pre-tenant local inventory to the first authenticated workspace once.
      const migrationKey = `inventory:migrated:${orgId}`;
      if (localValues.every((value) => value == null) && await AsyncStorage.getItem(migrationKey) !== 'yes') {
        const legacy = await Promise.all(keys.slice(0, 4).map((key) => AsyncStorage.getItem(key)));
        if (legacy.some((value) => value != null)) {
          await Promise.all(keys.slice(0, 4).map((key, index) => legacy[index] == null
            ? Promise.resolve()
            : AsyncStorage.setItem(`${prefix}:${key}`, legacy[index]!)));
          await Promise.all(keys.slice(0, 4).map((key) => AsyncStorage.removeItem(key)));
          localValues = legacy;
        }
        await AsyncStorage.setItem(migrationKey, 'yes');
      }

      const { data: cloud, error: cloudError } = useCloud
        ? await (supabase as any).from('organization_inventory_snapshots').select('*').eq('organization_id', orgId).maybeSingle()
        : { data: null, error: null };
      if (cloudError) console.warn('Uso i dati locali: il backup cloud non è raggiungibile.', cloudError);

      if (cloud) {
        lastRemoteUpdate.current = cloud.updated_at;
        const cloudProducts = await hydrateSharedProductImages(Array.isArray(cloud.products) ? cloud.products : []);
        setProducts(cloudProducts);
        setTimeline(Array.isArray(cloud.timeline) ? cloud.timeline : []);
        setAlerts(Array.isArray(cloud.alerts) ? cloud.alerts : []);
        setLibraries(Array.isArray(cloud.libraries) && cloud.libraries.length ? cloud.libraries : DEFAULT_LIBRARIES);
        setDeletedProductIds(Array.isArray(cloud.deleted_product_ids) ? cloud.deleted_product_ids : []);
        await Promise.all(keys.map((key) => AsyncStorage.setItem(`${prefix}:${key}`, JSON.stringify(key === 'products' ? cloudProducts : cloud[key] ?? []))));
      } else {
        const parsed = localValues.map((value) => value ? JSON.parse(value) : null);
        setProducts(await hydrateSharedProductImages(Array.isArray(parsed[0]) ? parsed[0] : []));
        setTimeline(Array.isArray(parsed[1]) ? parsed[1] : []);
        setAlerts(Array.isArray(parsed[2]) ? parsed[2] : []);
        setLibraries(Array.isArray(parsed[3]) ? parsed[3] : DEFAULT_LIBRARIES);
        setDeletedProductIds(Array.isArray(parsed[4]) ? parsed[4] : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setProducts([]);
      setTimeline([]);
      setAlerts([]);
      setLibraries(DEFAULT_LIBRARIES);
      setDeletedProductIds([]);
    }
  };

  const generateAlerts = () => {
    const newAlerts: Alert[] = [];

    products.forEach((product) => {
      if (product.status === 'available' && !product.deletedAt) {
        // Check for dormant products
        if (isDormant(product)) {
          newAlerts.push({
            id: `alert-dormant-${product.id}`,
            productId: product.id,
            type: 'dormant',
            message: `${product.sku} non viene mosso da oltre 6 mesi`,
            createdAt: new Date().toISOString(),
            dismissed: false,
          });
        }

        // Check for promotion suggestions
        if (needsPromotion(product)) {
          newAlerts.push({
            id: `alert-promo-${product.id}`,
            productId: product.id,
            type: 'promotion_suggestion',
            message: `${product.sku} in magazzino da 3+ mesi. Considera di spostarlo in vetrina`,
            createdAt: new Date().toISOString(),
            dismissed: false,
          });
        }

        // Articolo a quantità sotto la scorta minima (M06)
        const low = lowStockAlert(product, new Date().toISOString());
        if (low) newAlerts.push(low);
      }
    });

    // Quelli scartati restano scartati (quello di scorta finché il prodotto non torna sopra la scorta minima)
    setAlerts(mergeAlerts(newAlerts, alerts));
  };

  const generateSKU = (): string => {
    const year = new Date().getFullYear();
    const prefix = `LOG-${year}-`;
    const existingSKUs = products
      .filter((p) => !p.deletedAt)
      .map((p) => p.sku)
      .filter((sku) => sku.startsWith(prefix));

    let nextNumber = 1;
    if (existingSKUs.length > 0) {
      const numbers = existingSKUs.map((sku) => {
        const match = sku.match(/LOG-\d{4}-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      nextNumber = Math.max(...numbers) + 1;
    }

    return `LOG-${year}-${String(nextNumber).padStart(3, '0')}`;
  };

  /** Cambia solo i campi `patch` del prodotto `id`, nella copia subito e nello stato in coda. */
  const patchProduct = (id: string, patch: Partial<Product>) => {
    const apply = (list: Product[]) => list.map((p) => (p.id === id ? { ...p, ...patch } : p));
    productsRef.current = apply(productsRef.current);
    setProducts(apply);
  };

  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, options?: { qty?: number; stock?: Record<string, number> }): boolean => {
    const sku = productData.sku || generateSKU();
    const now = new Date().toISOString();

    let newProduct: Product = {
      ...productData,
      sku,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    // Quantità scritta in Aggiungi (M03) o giacenza per posizione dall'import CSV (M08): articolo a quantità,
    // con un carico iniziale come evento per ogni posizione
    let stockEvents: Omit<TimelineEvent, 'id'>[] = [];
    if (options?.stock != null || options?.qty != null) {
      const r = options.stock != null
        ? withStartingStock(newProduct, options.stock, now)
        : withInitialStock(newProduct, options.qty ?? 0, now);
      if (!r.ok) return false;
      newProduct = r.product;
      stockEvents = r.events;
    }

    productsRef.current = [newProduct, ...productsRef.current];
    setProducts((prev) => [newProduct, ...prev]);

    addTimelineEvent({
      productId: newProduct.id,
      type: 'created',
      timestamp: now,
      details: {},
    });
    stockEvents.forEach(addTimelineEvent);
    return true;
  };

  const updateProduct = (id: string, allUpdates: Partial<Product>) => {
    const product = productsRef.current.find((p) => p.id === id);
    if (!product) return;
    // Articolo a quantità: posizione e giacenza cambiano solo con i movimenti, non da Modifica (M03)
    const updates = editableUpdates(product, allUpdates);

    // Tutto ciò che cambia davvero, compresi peso, misure, SKU, tipo, cartella e campi personalizzati (P13)
    const changes = describeChanges(product, updates);
    if (updates.images && updates.images.length > product.images.length) {
      const newPhotos = updates.images.length - product.images.length;
      changes.push(`${newPhotos} foto aggiunte`);

      // Add photo timeline event
      addTimelineEvent({
        productId: id,
        type: 'photo_added',
        timestamp: new Date().toISOString(),
        details: { photoCount: newPhotos },
      });
    }

    patchProduct(id, { ...updates, updatedAt: new Date().toISOString() });

    // Add timeline event with details
    if (changes.length > 0) {
      addTimelineEvent({
        productId: id,
        type: 'modified',
        timestamp: new Date().toISOString(),
        details: { changes },
      });
    }
  };

  const deleteProduct = (id: string) => {
    patchProduct(id, { deletedAt: new Date().toISOString() });

    addTimelineEvent({
      productId: id,
      type: 'deleted',
      timestamp: new Date().toISOString(),
      details: {},
    });
  };

  const restoreProduct = (id: string) => {
    patchProduct(id, { deletedAt: undefined });

    addTimelineEvent({
      productId: id,
      type: 'restored',
      timestamp: new Date().toISOString(),
      details: {},
    });
  };

  const permanentlyDeleteProduct = (id: string) => {
    productsRef.current = productsRef.current.filter((p) => p.id !== id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeletedProductIds((prev) => prev.includes(id) ? prev : [...prev, id]);
  };

  // Restituisce false se non sposta: prodotto inesistente o nel cestino, già in quella posizione, oppure
  // articolo a quantità esaurito. Pezzo unico: evento «spostato»; articolo a quantità: trasferimento di tutta la
  // giacenza della posizione principale, evento `stock` (M03, `utils/inventoryOps.ts`).
  const moveProduct = (id: string, newLocation: string): boolean => {
    const result = moveOf(productsRef.current.find((p) => p.id === id), newLocation, new Date().toISOString());
    if (!result.ok) return false;
    patchProduct(id, result.patch);
    result.events.forEach(addTimelineEvent);
    return true;
  };

  // Restituisce false se non vende: prodotto inesistente, nel cestino o già venduto (P05, P06), oppure articolo
  // a quantità senza giacenza sufficiente. Articolo a quantità: scarico con causale vendita, resta disponibile.
  const sellProduct = (id: string, finalPrice?: number, qty = 1): boolean => {
    const result = saleOf(productsRef.current.find((p) => p.id === id), finalPrice, qty, new Date().toISOString());
    if (!result.ok) return false;
    patchProduct(id, result.patch);
    result.events.forEach(addTimelineEvent);
    return true;
  };

  // Movimento dalla Scheda (M04): calcolato sulla copia più recente, nello stato solo i campi del movimento.
  const moveStock = (id: string, movement: Movement): { ok: true } | { ok: false; error: MovementError; available?: number } => {
    const result = movementOf(productsRef.current.find((p) => p.id === id), movement, new Date().toISOString());
    if (!result.ok) return result;
    patchProduct(id, result.patch);
    result.events.forEach(addTimelineEvent);
    return { ok: true };
  };

  // Conta (M07): tutte le rettifiche calcolate sulla copia più recente e scritte con un solo aggiornamento, così
  // nessuna si perde e `before`/`after` sono giusti; nello stato solo i campi dei movimenti.
  const countStock = (at: string, counts: Record<string, number>) => {
    const { patches, events, adjusted, unchanged, refused } = countOf(productsRef.current, at, counts, new Date().toISOString());
    if (patches.length > 0) {
      const byId = new Map(patches.map((x) => [x.id, x.patch]));
      const apply = (list: Product[]) => list.map((p) => (byId.has(p.id) ? { ...p, ...byId.get(p.id) } : p));
      productsRef.current = apply(productsRef.current);
      setProducts(apply);
      events.forEach(addTimelineEvent);
    }
    return { adjusted, unchanged, refused };
  };

  const scanProduct = (id: string) => {
    patchProduct(id, { lastScannedAt: new Date().toISOString() });

    // Add timeline event
    addTimelineEvent({
      productId: id,
      type: 'scanned',
      timestamp: new Date().toISOString(),
      details: {},
    });
  };

  const addTimelineEvent = (event: Omit<TimelineEvent, 'id'>) => {
    const newEvent: TimelineEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setTimeline((prev) => [newEvent, ...prev]);
  };

  const dismissAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, dismissed: true, updatedAt: new Date().toISOString() } : a))
    );
  };

  const getProductById = (id: string) => {
    return products.find((p) => p.id === id);
  };

  const getProductBySku = (sku: string) => {
    return products.find((p) => p.sku === sku);
  };

  const getTimelineForProduct = (productId: string) => {
    return timeline.filter((t) => t.productId === productId);
  };

  const filterProducts = (filter: 'all' | 'available' | 'sold' | 'alert' | 'trash') => {
    if (filter === 'trash') {
      return products.filter((p) => p.deletedAt);
    }

    const activeProducts = products.filter((p) => !p.deletedAt);

    switch (filter) {
      case 'all':
        return activeProducts;
      case 'available':
        return activeProducts.filter((p) => p.status === 'available');
      case 'sold':
        return activeProducts.filter((p) => p.status === 'sold');
      case 'alert':
        return activeProducts.filter((p) => {
          return alerts.some((a) => a.productId === p.id && !a.dismissed);
        });
      default:
        return activeProducts;
    }
  };

  const getTrashProducts = () => {
    return products.filter((p) => p.deletedAt);
  };

  /** Generate a slug from name (lowercase, no spaces, no special chars) */
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, ''); // Trim leading/trailing dashes
  };

  const addLibrary = (name: string, icon: string) => {
    const slug = generateSlug(name);
    // Ensure unique ID
    let uniqueSlug = slug;
    let counter = 1;
    while (libraries.some((l) => l.id === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const newLibrary: Library = {
      id: uniqueSlug,
      name,
      icon,
      createdAt: new Date().toISOString(),
    };
    setLibraries((prev) => [...prev, newLibrary]);
  };

  const updateLibrary = (id: string, updates: Partial<Library>) => {
    setLibraries((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l))
    );
  };

  const deleteLibrary = (id: string): boolean => {
    // Check if any products are assigned to this library
    if (usage(productsRef.current, { libraryId: id }).active > 0) {
      return false; // Cannot delete, has products
    }
    // I prodotti nel cestino perdono la cartella: ripristinati, non puntano a una cartella che non c'è più (P09)
    const clear = (list: Product[]) => list.map((p) => (p.libraryId === id ? { ...p, libraryId: undefined } : p));
    productsRef.current = clear(productsRef.current);
    setProducts(clear);
    setLibraries((prev) => prev.filter((l) => l.id !== id));
    return true;
  };

  return (
    <InventoryContext.Provider
      value={{
        products,
        timeline,
        alerts,
        libraries,
        addProduct,
        updateProduct,
        deleteProduct,
        moveProduct,
        sellProduct,
        moveStock,
        countStock,
        scanProduct,
        dismissAlert,
        getProductById,
        getProductBySku,
        getTimelineForProduct,
        filterProducts,
        restoreProduct,
        permanentlyDeleteProduct,
        getTrashProducts,
        addLibrary,
        updateLibrary,
        deleteLibrary,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};
