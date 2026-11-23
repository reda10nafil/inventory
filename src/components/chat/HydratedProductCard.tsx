/**
 * SyncroFlow — HydratedProductCard (Bare RN 0.81.5) — Logistica Universale
 * Luxury Dark #0A0A0A / #D4AF37 — no Expo deps, bare RN only.
 *
 * Props ultraleggere: { skus: string[], automationId?: string } (<2KB)
 * Hydration REALE: WatermelonDB JSI withObservables / Q.where('sku', Q.oneOf) + fallback useInventory
 * Render: Card interattiva con anteprima WebP nativo (FastImage → Image), SKU, categoria, location, giacenza
 *         + selezione sottoinsieme (checkbox) + bottone bulk "Approva Spostamento" / "Conferma" per gruppo automazione
 *         + bottoni singoli Sposta/Vendi se senza automazione di gruppo
 *
 * Flusso Boss->Operaio:
 *  Capo invia payload leggero {skus: [LOG-2026-001,...], automationIds:['auto-audit-vetrina']}
 *  Operaio riceve → DB locale idrata → vede cards con checkbox → deseleziona → Approva su subset → sync timeline
 */

import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Pressable,
  Image as RNImage,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../../components/ui/surfaces';

// ---------------------------------------------------------------------------
// WatermelonDB reactive — JSI sync read, fallback InventoryContext
// ---------------------------------------------------------------------------
// IND-P9 (ticket 28): il database nasce alla prima card che lo chiede (Chat), non all'avvio dell'app. Prima il
// `require` stava qui fuori e, attraverso RootNavigator › ChatScreen › ChatMessageItem, creava il database a ogni
// avvio: sul web, ricaricando durante la prima preparazione, LokiJS scriveva «Deleting database failed… blocked».
let DB: any;
let Q: any;
function loadDb() {
  if (DB !== undefined) return;
  try {
    const wm = require('@nozbe/watermelondb');
    Q = wm.Q;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dbMod = require('../../db');
    DB = dbMod.database ?? dbMod.default?.database ?? dbMod;
  } catch {
    DB = null;
    Q = null;
  }
}

function useObservedProducts(skus: string[]): any[] {
  const [observed, setObserved] = useState<any[]>([]);
  useEffect(() => {
    if (skus.length) loadDb();
    if (!DB || !Q || !skus.length) {
      setObserved([]);
      return;
    }
    let sub: any = null;
    try {
      const query = DB.get('products').query(Q.where('sku', Q.oneOf(skus)));
      // observe() è sync JSI (ui thread) — 120Hz su S25 Ultra
      sub = query.observe().subscribe((res: any[]) => setObserved(res));
    } catch (e) {
      console.log('[HydratedCard] observe fallback', e);
    }
    return () => {
      try { sub?.unsubscribe(); } catch {}
    };
  }, [skus.join(',')]);
  return observed;
}

// ---------------------------------------------------------------------------
// Types — logistica universale
// ---------------------------------------------------------------------------
export type HydratedPayload = {
  skus: string[];
  automationId?: string;
  sku?: string[];
  automationIds?: string[];
  text?: string;
};

export type HydratedProductCardProps = {
  payload: HydratedPayload | string;
  onAction?: (sku: string, action: 'sposta' | 'vendi') => void;
  /** Bulk approve su sottoinsieme selezionato */
  onApproveAutomation?: (selectedSkus: string[], automationId: string) => void;
  hydratedCache?: Record<string, any> | null;
  /** Se true, mostra checkbox selezione */
  selectable?: boolean;
};

type InventoryProduct = {
  id: string;
  sku: string;
  furType: string; // mantenuto per compat ma rappresenta categoria logistica (elettronica/meccanica/tessile)
  location: string;
  status: 'available' | 'sold' | 'archived';
  images: string[];
  purchasePrice?: number;
  sellPrice?: number;
  weight?: number;
};

// ---------------------------------------------------------------------------
// JSON ultraleggero
// ---------------------------------------------------------------------------
function parsePayload(input: HydratedPayload | string): HydratedPayload {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return { skus: [] };
    try {
      const p = JSON.parse(trimmed);
      return normalizePayload(p);
    } catch {
      return { skus: [] };
    }
  }
  return normalizePayload(input as any);
}

function normalizePayload(raw: any): HydratedPayload {
  if (!raw || typeof raw !== 'object') return { skus: [] };
  const skus: string[] = Array.isArray(raw.skus)
    ? raw.skus.filter((s: any) => typeof s === 'string')
    : Array.isArray(raw.sku)
      ? raw.sku.filter((s: any) => typeof s === 'string')
      : [];
  const automationId: string | undefined =
    typeof raw.automationId === 'string'
      ? raw.automationId
      : Array.isArray(raw.automationIds) && raw.automationIds[0]
        ? String(raw.automationIds[0])
        : undefined;
  return {
    skus,
    automationId,
    sku: skus,
    automationIds: automationId ? [automationId] : raw.automationIds,
    text: typeof raw.text === 'string' ? raw.text : undefined,
  };
}

// ---------------------------------------------------------------------------
// FastImage fallback — WebP nativo
// ---------------------------------------------------------------------------
let FastImageComp: any = null;
let fastImageAvailable = false;
try {
  const mod = require('react-native-fast-image');
  FastImageComp = mod?.default ?? mod;
  fastImageAvailable = !!FastImageComp;
} catch {
  fastImageAvailable = false;
}

type WebPImageProps = { uri: string | undefined; style: any; sku?: string };
const WebPImage: React.FC<WebPImageProps> = memo(({ uri, style }) => {
  const t = useTheme();
  const styles = useStyles();
  if (!uri) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <AppIcon name="inventory-2" size={28} color={t.colors.textMuted} />
        <Text style={styles.imagePlaceholderText}>LOG — WebP</Text>
      </View>
    );
  }
  if (fastImageAvailable && FastImageComp) {
    return (
      <FastImageComp
        source={{ uri, priority: FastImageComp.priority?.normal, cacheControl: FastImageComp.cacheControl?.immutable }}
        style={style}
        resizeMode={FastImageComp.resizeMode?.cover}
        fallback
      />
    );
  }
  return <RNImage source={{ uri }} style={style} resizeMode="cover" progressiveRenderingEnabled />;
});
WebPImage.displayName = 'WebPImage';

// ---------------------------------------------------------------------------
// Single Card with checkbox + WebP preview + actions
// ---------------------------------------------------------------------------
type ProductCardProps = {
  product: InventoryProduct | null;
  sku: string;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (sku: string) => void;
  hydratedFallback?: Record<string, any> | null;
  onAction?: (sku: string, action: 'sposta' | 'vendi') => void;
};

const ProductCard: React.FC<ProductCardProps> = memo(({ product, sku, selectable, selected, onToggle, hydratedFallback, onAction }) => {
  const t = useTheme();
  const styles = useStyles();
  let inventory: any = null;
  try {
    const ctx = require('../../../contexts/InventoryContext');
    if (ctx?.useInventory) inventory = ctx.useInventory();
  } catch { inventory = null; }

  const handleSposta = useCallback(() => {
    const targetSku = product?.sku ?? sku;
    try {
      if (inventory?.moveProduct && product?.id) {
        const nextLocation = product.location === 'vetrina' ? 'magazzino' : 'vetrina';
        inventory.moveProduct(product.id, nextLocation);
      }
    } catch {}
    onAction?.(targetSku, 'sposta');
  }, [inventory, product, sku, onAction]);

  const handleVendi = useCallback(() => {
    const targetSku = product?.sku ?? sku;
    try { if (inventory?.sellProduct && product?.id) inventory.sellProduct(product.id); } catch {}
    onAction?.(targetSku, 'vendi');
  }, [inventory, product, sku, onAction]);

  const display: any = product ?? (hydratedFallback as any) ?? null;
  const isSold = display?.status === 'sold';
  const location: string = display?.location ?? '—';
  const categoria: string = display?.furType ?? display?.fur_type ?? 'logistica';
  const giacenza: string = isSold ? 'Venduto' : 'Disponibile';
  const imageUri: string | undefined = display?.images?.[0];
  const locationColor = location === 'vetrina' ? t.colors.showcase : location === 'magazzino' ? t.colors.warehouse : location === 'sartoria' || location === 'workshop' ? t.colors.workshop : t.colors.textSecondary;

  if (!display && !product) {
    return (
      <View style={styles.card}>
        <View style={[styles.image, styles.imagePlaceholder]}>
          <ActivityIndicator color={t.colors.accentInk} />
          <Text style={styles.skeletonText}>Sync {sku}…</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.skuText}>{sku}</Text>
          <Text style={styles.metaMuted}>In sincronizzazione…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, isSold && styles.cardSold, selectable && selected && styles.cardSelected]}>
      <WebPImage uri={imageUri} style={styles.image} />
      {/* Checkbox selezione sottoinsieme */}
      {selectable && (
        <Pressable onPress={() => onToggle?.(sku)} style={[styles.checkbox, selected ? styles.checkboxSelected : styles.checkboxIdle]} hitSlop={8}>
          {selected ? <AppIcon name="check-circle" size={22} color={t.colors.onAccent} /> : <AppIcon name="radio-button-unchecked" size={22} color={t.colors.onData} />}
        </Pressable>
      )}
      <View style={[styles.badge, { backgroundColor: locationColor }]}>
        <Text style={styles.badgeText}>{location.toUpperCase()}</Text>
      </View>
      {isSold && <View style={styles.soldOverlay}><Text style={styles.soldText}>VENDUTO</Text></View>}
      <View style={styles.cardBody}>
        <Text style={styles.skuText} numberOfLines={1}>{sku}</Text>
        <Text style={styles.furTypeText} numberOfLines={1}>{categoria}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Location</Text>
            <Text style={[styles.metaValue, { color: locationColor }]}>{location}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Giacenza</Text>
            <Text style={[styles.metaValue, { color: isSold ? t.colors.sold : t.colors.available }]}>{giacenza}</Text>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.btn, styles.btnOutline, isSold && styles.btnDisabled]} onPress={handleSposta} activeOpacity={0.8} disabled={isSold}>
            <Text style={[styles.btnOutlineText, isSold && styles.btnTextDisabled]}>Sposta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary, isSold && styles.btnDisabled]} onPress={handleVendi} activeOpacity={0.8} disabled={isSold}>
            {!isSold && <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />}
            <Text style={[styles.btnPrimaryText, isSold && styles.btnTextDisabled]}>Vendi</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.goldHairline} />
    </View>
  );
});
ProductCard.displayName = 'ProductCard';

// ---------------------------------------------------------------------------
// Main HydratedProductCard — lista con selezione + bulk automation
// ---------------------------------------------------------------------------
const HydratedProductCard: React.FC<HydratedProductCardProps> = memo(({ payload, onAction, onApproveAutomation, hydratedCache, selectable }) => {
  const t = useTheme();
  const styles = useStyles();
  const parsed = useMemo(() => parsePayload(payload as any), [payload]);
  const skus = parsed.skus;
  const automationId = parsed.automationId;

  // --- Reactive DB: WatermelonDB JSI — fallback useInventory ---
  const observedProducts = useObservedProducts(skus);
  let products: InventoryProduct[] = [];
  let getProductBySku: ((sku: string) => InventoryProduct | undefined) | undefined;
  try {
    const ctx = require('../../../contexts/InventoryContext');
    if (ctx?.useInventory) {
      const inv = ctx.useInventory();
      products = inv.products ?? [];
      getProductBySku = inv.getProductBySku;
    }
  } catch {}

  // Se observedProducts ha dati, usali come source preferito (JSI sync)
  const observedMap = useMemo(() => {
    const m = new Map<string, any>();
    observedProducts.forEach((p: any) => {
      const sku = p.sku ?? p._raw?.sku;
      if (sku) m.set(sku, { id: p.id ?? p._raw?.id, sku, furType: p.furType ?? p._raw?.fur_type ?? 'logistica', location: p.location ?? p._raw?.location, status: p.status ?? p._raw?.status, images: (()=>{ try{ const raw = p.images ?? p._raw?.images; return typeof raw==='string'? JSON.parse(raw): raw??[] }catch{ return [] }})() });
    });
    return m;
  }, [observedProducts]);

  const resolved = useMemo(() => {
    if (!skus.length) return [];
    return skus.map((sku) => {
      const fromObserved = observedMap.get(sku) ?? null;
      const fromCtx = getProductBySku ? getProductBySku(sku) : products.find((p) => p.sku === sku);
      const cacheForSku = hydratedCache && typeof hydratedCache === 'object' ? (hydratedCache as any)[sku] ?? null : null;
      const product = (fromObserved as InventoryProduct) ?? (fromCtx as InventoryProduct) ?? null;
      return { sku, product, cacheForSku };
    });
  }, [skus, products, getProductBySku, hydratedCache, observedMap]);

  // --- Selezione sottoinsieme ---
  const isSelectable = selectable ?? !!automationId; // se c'è automazione, abilita selezione di default
  const [selected, setSelected] = useState<Set<string>>(() => new Set(skus));
  useEffect(() => { setSelected(new Set(skus)); }, [skus.join(',')]);

  const toggle = useCallback((sku: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }, []);

  const handleApprove = useCallback(() => {
    const list = Array.from(selected);
    if (!list.length) return;
    if (onApproveAutomation && automationId) {
      onApproveAutomation(list, automationId);
    } else {
      // fallback: sposta tutti i selezionati
      list.forEach((sku) => onAction?.(sku, 'sposta'));
    }
  }, [selected, onApproveAutomation, automationId, onAction]);

  const allSelected = selected.size === skus.length && skus.length > 0;
  const toggleAll = useCallback(() => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(skus));
  }, [allSelected, skus]);

  if (!skus.length) {
    if (parsed.text) return <View style={styles.textFallback}><Text style={styles.textFallbackContent}>{parsed.text}</Text></View>;
    return null;
  }

  // Single sku — card singola con checkbox opzionale + bulk bar sotto
  if (resolved.length === 1) {
    const { sku, product, cacheForSku } = resolved[0];
    return (
      <View style={styles.singleWrapper}>
        <ProductCard sku={sku} product={product} hydratedFallback={cacheForSku} onAction={onAction} selectable={isSelectable} selected={selected.has(sku)} onToggle={toggle} />
        {isSelectable && automationId && (
          <View style={styles.bulkBar}>
            <Text style={styles.bulkText}>1 prodotto • {automationId}</Text>
            <TouchableOpacity style={[styles.bulkBtn, selected.size===0 && styles.btnDisabled]} onPress={handleApprove} disabled={selected.size===0}>
              {selected.size > 0 && <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />}
              <AppIcon name="task-alt" size={18} color={selected.size? t.colors.onButton : t.colors.textMuted} />
              <Text style={[styles.bulkBtnText, selected.size===0 && styles.btnTextDisabled]}>Approva Spostamento</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.groupWrapper}>
      {/* Header selezione */}
      {isSelectable && (
        <View style={styles.selectHeader}>
          <Pressable onPress={toggleAll} style={styles.selectAllBtn}>
            <AppIcon name={allSelected ? 'check-box' : 'check-box-outline-blank'} size={18} color={t.colors.accentInk} />
            <Text style={styles.selectAllText}>{allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'} ({selected.size}/{skus.length})</Text>
          </Pressable>
          {parsed.text ? <Text style={styles.groupCaption} numberOfLines={2}>{parsed.text}</Text> : null}
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent} style={styles.scroll}>
        {resolved.map(({ sku, product, cacheForSku }) => (
          <View key={sku} style={styles.scrollItem}>
            <ProductCard sku={sku} product={product} hydratedFallback={cacheForSku} onAction={onAction} selectable={isSelectable} selected={selected.has(sku)} onToggle={toggle} />
          </View>
        ))}
      </ScrollView>
      {/* Bulk automation bar — reattiva */}
      {automationId && (
        <View style={styles.bulkBar}>
          <View style={styles.bulkInfo}>
            <AppIcon name="auto-awesome" size={16} color={t.colors.accentInk} />
            <Text style={styles.bulkInfoText} numberOfLines={1}>Automazione: {automationId}</Text>
          </View>
          <TouchableOpacity style={[styles.bulkBtn, selected.size===0 && styles.btnDisabled]} onPress={handleApprove} disabled={selected.size===0} activeOpacity={0.85}>
            {selected.size > 0 && <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />}
            <AppIcon name="task-alt" size={18} color={selected.size ? t.colors.onButton : t.colors.textMuted} />
            <Text style={[styles.bulkBtnText, selected.size===0 && styles.btnTextDisabled]}>Approva Spostamento ({selected.size}/{skus.length})</Text>
          </TouchableOpacity>
          <Text style={styles.bulkHint}>L'operaio può scegliere il sottoinsieme prima di confermare</Text>
        </View>
      )}
    </View>
  );
});
HydratedProductCard.displayName = 'HydratedProductCard';
export default HydratedProductCard;

// Styles — Luxury Dark #0A0A0A / #D4AF37
const useStyles = makeStyles((t) => ({
  singleWrapper: { paddingVertical: 6, paddingHorizontal: 2, gap: 8 },
  groupWrapper: { gap: 8, paddingVertical: 4 },
  selectHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:4, gap:8 },
  selectAllBtn: { flexDirection:'row', alignItems:'center', gap:6, paddingVertical:4 },
  selectAllText: { color: t.colors.accentInk, fontSize:12, fontWeight:'700' },
  groupCaption: { flex:1, color: t.colors.textSecondary, fontSize:12, textAlign:'right' },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingVertical: 6, paddingHorizontal: 4, gap: 12 },
  scrollItem: { width: 260 },
  card: { ...cardSurface(t), overflow: 'hidden', position:'relative' },
  cardSold: { opacity: 0.92, borderColor: t.colors.sold },
  cardSelected: { borderColor: t.colors.accent, borderWidth: 1.5 },
  goldHairline: { position:'absolute', bottom:0, left:0, right:0, height:2, backgroundColor:t.colors.accent, opacity:0.85 },
  image: { width:'100%', height:168, backgroundColor: t.colors.backgroundSecondary },
  imagePlaceholder: { justifyContent:'center', alignItems:'center', gap:8 },
  imagePlaceholderText: { color:t.colors.textMuted, fontSize:13, fontWeight:'500' },
  skeletonText: { color:t.colors.textSecondary, fontSize:12, marginTop:6 },
  checkbox: { position:'absolute', top:10, right:10, width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center', borderWidth:1.5, zIndex:5 },
  checkboxIdle: { backgroundColor:withAlpha(t.colors.shadow, 0.45), borderColor:withAlpha(t.colors.onData, 0.9) },
  checkboxSelected: { backgroundColor:t.colors.checkOn, borderColor:t.colors.checkOn },
  badge: { position:'absolute', top:10, left:10, paddingHorizontal:8, paddingVertical:4, borderRadius:t.radius.badge },
  badgeText: { color:t.colors.onData, fontSize:10, fontWeight:'700', letterSpacing:0.6 },
  soldOverlay: { position:'absolute', top:10, right:38, backgroundColor:t.colors.soldBadge, paddingHorizontal:8, paddingVertical:4, borderRadius:t.radius.badge },
  soldText: { color:t.colors.soldBadgeText, fontSize:10, fontWeight:'700', letterSpacing:0.8 },
  cardBody: { padding:12, gap:6 },
  skuText: { color:t.colors.textPrimary, fontSize:15, fontWeight:'700', letterSpacing:0.3 },
  furTypeText: { color:t.colors.accentInk, fontSize:13, fontWeight:'600', textTransform:'capitalize' },
  metaRow: { flexDirection:'row', gap:10, marginTop:8 },
  metaChip: { ...tileSurface(t), flex:1, paddingHorizontal:10, paddingVertical:8 },
  metaLabel: { color:t.colors.textMuted, fontSize:10, fontWeight:'600', textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 },
  metaValue: { fontSize:13, fontWeight:'700', textTransform:'capitalize' },
  metaMuted: { color:t.colors.textSecondary, fontSize:12, marginTop:4 },
  actionsRow: { flexDirection:'row', gap:8, marginTop:10 },
  btn: { flex:1, height:38, borderRadius:t.radius.button, justifyContent:'center', alignItems:'center', borderWidth:1 },
  btnPrimary: { backgroundColor:t.colors.button, borderColor:t.colors.button, overflow:'hidden' },
  btnOutline: { backgroundColor:t.colors.buttonSecondary, borderColor:t.colors.buttonSecondaryBorder },
  btnDisabled: { opacity:0.45, borderColor:t.colors.border, backgroundColor:t.colors.surfaceElevated },
  btnPrimaryText: { color:t.colors.onButton, fontSize:13, fontWeight:'700', letterSpacing:0.3 },
  btnOutlineText: { color:t.colors.onButtonSecondary, fontSize:13, fontWeight:'700', letterSpacing:0.3 },
  btnTextDisabled: { color:t.colors.textMuted },
  bulkBar: { ...cardSurface(t), padding:10, gap:8 },
  bulkInfo: { flexDirection:'row', gap:6, alignItems:'center' },
  bulkInfoText: { color:t.colors.textSecondary, fontSize:12, fontWeight:'600', flex:1 },
  bulkBtn: { flexDirection:'row', gap:8, backgroundColor:t.colors.button, borderRadius:t.radius.button, paddingVertical:10, alignItems:'center', justifyContent:'center', overflow:'hidden', ...t.shadows.button },
  bulkBtnText: { color:t.colors.onButton, fontWeight:'700', fontSize:13 },
  bulkText: { color:t.colors.textSecondary, fontSize:12 },
  bulkHint: { color:t.colors.textMuted, fontSize:10, textAlign:'center' },
  textFallback: { ...cardSurface(t), padding:12 },
  textFallbackContent: { color:t.colors.textPrimary, fontSize:14, lineHeight:20 },
}));
