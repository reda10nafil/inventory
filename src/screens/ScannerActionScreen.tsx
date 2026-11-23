// FurInventory Pro - Scanner Quick Actions Modal
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../navigation/compat';
import { Image } from '../lib/ExpoImage';
import { useInventory } from '../../contexts/InventoryContext';
import { useLocations } from '../../contexts/LocationsContext';
import { useProductKind } from '../../hooks/useProductKind';
import { categoryPath } from '../../utils/categories';
import { useContacts } from '../../contexts/ContactsContext';
import { useShelves } from '../../contexts/ShelvesContext';
import { productShelfId, shelfKind } from '../../utils/shelves';
import { AppIcon } from '../../components/ui/AppIcon';
import { Text, TextInput } from '../../components/ui/Text';
import { makeStyles, useTheme } from '../../contexts/ThemeContext';
import { formatPrice } from '../../utils/price';
import { Backdrop } from '../../components/ui/Backdrop';
import { GradientFill } from '../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../components/ui/surfaces';
import { parseNumber } from '../../utils/number';
import { PhotoPlaceholder } from '../../components/ui/PhotoPlaceholder';
import { moveOf, refusalText, saleOf } from '../../utils/inventoryOps';
import { canMoveStock } from '../../utils/productRules';
import { describeStockEvent, formatQty, isOutOfStock, isStocked, totalStock, type Movement } from '../../utils/stock';
import { MovementSheet } from '../../components/MovementSheet';
import type { MovementKind } from '../../types';

type ActionType = 'moved' | 'sold' | 'details' | 'audit' | 'batch-move' | null;

export default function ScannerActionScreen() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { type = 'product', id } = params;
  // Support legacy param productId (un solo `useLocalSearchParams`: prima il secondo era chiamato solo a volte)
  const entityId = (id as string) || (params.productId as string);

  const { getProductById, moveProduct, sellProduct, libraries, products } = useInventory();
  const { locations } = useLocations();
  const { shelves } = useShelves();
  const kindOf = useProductKind();
  const { labelOf: contactLabel } = useContacts();

  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  // Carico o Scarico (M09): la finestra «Movimenta» della Scheda aperta con il tipo già scelto
  const [sheetKind, setSheetKind] = useState<MovementKind | null>(null);

  // Resolve entity based on type
  const product = type === 'product' ? getProductById(entityId) : null;
  const location = type === 'location' ? locations.find(l => l.id === entityId) : null;
  const library = type === 'library' ? libraries.find(l => l.id === entityId) : null;
  const shelf = type === 'shelf' ? shelves.find((s) => s.id === entityId) : null;

  // Render NOT FOUND states
  if (type === 'product' && !product) return <NotFoundScreen message="Prodotto non trovato" router={router} />;
  if (type === 'location' && !location) return <NotFoundScreen message="Posizione non trovata" router={router} />;
  if (type === 'library' && !library) return <NotFoundScreen message="Categoria non trovata" router={router} />;
  if (type === 'shelf' && !shelf) return <NotFoundScreen message="Scaffale non trovato" router={router} />;

  // --- HANDLERS ---
  const handleAction = () => {
    if (type === 'product' && product) {
      // Existing Product Logic
      if (selectedAction === 'moved') {
        if (!selectedLocation) { Alert.alert('Errore', 'Seleziona una posizione'); return; }
        if (!moveProduct(product.id, selectedLocation)) {
          const refused = moveOf(product, selectedLocation, '');
          Alert.alert('Non spostato', refusalText(refused.ok ? 'not_allowed' : refused.reason, product.sku));
          return;
        }
        Alert.alert('Spostamento Registrato', `${product.sku} spostato.`, [{ text: 'OK', onPress: () => router.back() }]);
      } else if (selectedAction === 'sold') {
        if (!sellProduct(product.id, parseNumber(finalPrice))) {
          const refused = saleOf(product, parseNumber(finalPrice), 1, '');
          Alert.alert('Non venduto', refusalText(refused.ok ? 'not_allowed' : refused.reason, product.sku));
          return;
        }
        Alert.alert('Vendita Registrata', `${product.sku} venduto.`, [{ text: 'OK', onPress: () => router.back() }]);
      } else if (selectedAction === 'details') {
        router.replace(`/product/${product.id}` as any);
      }
    } else if (type === 'location' && location) {
      if (selectedAction === 'audit') {
        // Navigate to audit with pre-selected location? 
        // Currently audit doesn't take params, but we can make it smart or just open it.
        // For now, let's just go to Audit screen, user can scan again or select.
        // BETTER: Pass param to audit if we modify audit to accept it.
        router.push('/automations/audit' as any);
        // Note for future: Edit audit.tsx to accept ?locationId=...
      } else if (selectedAction === 'batch-move') {
        router.push('/automations/batch-move' as any);
      }
    } else if (type === 'library' && library) {
      // Just view folder
      // We don't have a direct link to folder view yet, maybe search results filter?
      // Let's go to inventory with filter
      router.push(`/(tabs)/?library=${library.id}` as any);
    }
  };

  // --- RENDERERS ---

  if (type === 'location' && location) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <Backdrop />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.headerCard, { borderLeftColor: location.color, borderLeftWidth: 6 }]}>
            <AppIcon name="location-on" size={40} color={location.color} />
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.headerTitle}>POSIZIONE</Text>
              <Text style={styles.headerSubtitle}>{location.label}</Text>
              <Text style={styles.headerMeta}>Capacità: {location.capacity || 'Infinito'}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Azioni disponibili</Text>

          <Pressable style={styles.actionButton} onPress={() => router.push('/automations/batch-move')}>
            <View style={[styles.actionIcon, { backgroundColor: t.colors.accent }]}>
              <AppIcon name="move-to-inbox" size={24} color={t.colors.onAccent} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>SPOSTAMENTO DI MASSA</Text>
              <Text style={styles.actionDescription}>Sposta prodotti QUI o da QUI</Text>
            </View>
            <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.actionButton} onPress={() => router.push('/automations/audit')}>
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
              <AppIcon name="fact-check" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>INVENTARIO / AUDIT</Text>
              <Text style={styles.actionDescription}>Verifica contenuto posizione</Text>
            </View>
            <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>Chiudi</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (type === 'library' && library) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <Backdrop />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.headerCard, { borderLeftColor: t.colors.accent, borderLeftWidth: 6 }]}>
            <AppIcon name={library.icon as any || 'folder'} size={40} color={t.colors.accentInk} />
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.headerTitle}>CATEGORIA</Text>
              <Text style={styles.headerSubtitle}>{categoryPath(libraries, library.id)}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Azioni</Text>

          <Pressable style={styles.actionButton} onPress={() => router.push(`/(tabs)/?library=${library.id}` as any)}>
            <View style={[styles.actionIcon, { backgroundColor: t.colors.accent }]}>
              <AppIcon name="list" size={24} color={t.colors.onAccent} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>VEDI PRODOTTI</Text>
              <Text style={styles.actionDescription}>Vai all'inventario filtrato</Text>
            </View>
            <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>Chiudi</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Scaffale letto dallo Scanner (S1a): dove sta, di che categoria, e i pezzi unici che ci stanno (tocco = Scheda)
  if (type === 'shelf' && shelf) {
    const place = locations.find((l) => l.id === shelf.locationId);
    const onShelf = products.filter((p) => !p.deletedAt && productShelfId(p, shelves) === shelf.id).sort((a, b) => a.sku.localeCompare(b.sku));
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <Backdrop />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.headerCard, { borderLeftColor: place?.color || t.colors.accent, borderLeftWidth: 6 }]}>
            <AppIcon name="shelves" size={40} color={place?.color || t.colors.accentInk} />
            <View style={styles.shelfHeading}>
              <Text style={styles.headerTitle}>SCAFFALE</Text>
              <Text style={styles.headerSubtitle}>{shelf.name}</Text>
              <Text style={styles.headerMeta}>{place?.label ?? shelf.locationId} · {shelfKind(shelf, libraries)}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Prodotti sullo scaffale ({onShelf.length})</Text>
          {onShelf.length === 0 && <Text style={styles.shelfEmpty}>Nessun prodotto su questo scaffale.</Text>}
          {onShelf.map((p) => {
            const kind = kindOf(p);
            return (
              <Pressable key={p.id} style={styles.actionButton} onPress={() => router.replace(`/product/${p.id}` as any)} accessibilityLabel={`Apri ${p.sku}`}>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>{p.sku}</Text>
                  {!!kind.line && <Text style={styles.actionDescription}>{kind.line}</Text>}
                </View>
                <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
              </Pressable>
            );
          })}

          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>Chiudi</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- PRODUCT RENDER (Existing logic adapted) ---
  // Explicit check for Product Render
  if (type === 'product' && product) {
    const unit = product.unit || 'pz';
    const placeName = (placeId: string) => locations.find((l) => l.id === placeId)?.label ?? placeId;
    const stocked = isStocked(product);
    const where = !stocked ? placeName(product.location)
      : isOutOfStock(product) ? `${placeName(product.location)} · Esaurito`
        : `${placeName(product.location)} · ${formatQty(totalStock(product), unit)}`;
    // Dopo un movimento registrato: che cosa è stato fatto, poi si torna allo scanner come per Spostato e Venduto.
    // Con il fornitore o cliente e il prezzo scelti nella finestra (M10); senza, il testo è quello di prima.
    const movementDone = (m: Movement) => {
      const text = m.kind === 'rettifica'
        ? `${product.sku}: rettifica in ${placeName(m.at)} a ${formatQty(m.counted, unit)}.`
        : `${product.sku} · ${describeStockEvent({
          movement: m.kind, qty: m.qty,
          ...('from' in m && { from: m.from }), ...('to' in m && { to: m.to }), ...(m.reason && { reason: m.reason }),
          ...(m.kind === 'scarico' && m.finalPrice != null && { finalPrice: m.finalPrice }),
          ...(m.contactId && { contactId: m.contactId }),
        }, placeName, unit, contactLabel)}`;
      Alert.alert('Movimento registrato', text, [{ text: 'OK', onPress: () => router.back() }]);
    };
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <Backdrop />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Preview */}
          <View style={styles.productPreview}>
            {product.images?.[0] ? (
              <Image
                source={{ uri: product.images[0] }}
                style={styles.productImage}
                contentFit="cover"
              />
            ) : (
              <PhotoPlaceholder size={28} style={styles.productImage} />
            )}
            <View style={styles.productDetails}>
              <Text style={styles.productSku}>{product.sku}</Text>
              {/* C1: categoria e tipo di pelle, ognuno solo se c'è */}
              {!!kindOf(product).line && (
                <Text style={styles.productType}>
                  {kindOf(product).line}
                </Text>
              )}
              <View style={styles.locationBadge}>
                <AppIcon name="location-on" size={14} color={t.colors.accentInk} />
                <Text style={styles.locationText}>{where}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Azione rapida</Text>

          <Pressable
            style={[
              styles.actionButton,
              selectedAction === 'moved' && styles.actionButtonActive,
            ]}
            onPress={() => setSelectedAction('moved')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#3B82F6' }]}>
              <AppIcon name="swap-horiz" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>SPOSTATO</Text>
              <Text style={styles.actionDescription}>
                Registra cambio di posizione
              </Text>
            </View>
            <AppIcon
              name={selectedAction === 'moved' ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={24}
              color={selectedAction === 'moved' ? t.colors.checkOn : t.colors.checkRing}
            />
          </Pressable>

          {selectedAction === 'moved' && (
            <View style={styles.optionsContainer}>
              <Text style={styles.optionsLabel}>Seleziona nuova posizione:</Text>
              {locations.map((location) => (
                <Pressable
                  key={location.id}
                  style={[
                    styles.optionChip,
                    selectedLocation === location.id && styles.optionChipActive,
                  ]}
                  onPress={() => setSelectedLocation(location.id)}
                >
                  <View
                    style={[styles.optionDot, { backgroundColor: location.color }]}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      selectedLocation === location.id && styles.optionTextActive,
                    ]}
                  >
                    {location.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            style={[
              styles.actionButton,
              selectedAction === 'sold' && styles.actionButtonActive,
            ]}
            onPress={() => setSelectedAction('sold')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
              <AppIcon name="sell" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>VENDUTO</Text>
              <Text style={styles.actionDescription}>
                {stocked ? `Scarica 1 ${unit} con causale vendita` : 'Segna come venduto e archivia'}
              </Text>
            </View>
            <AppIcon
              name={selectedAction === 'sold' ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={24}
              color={selectedAction === 'sold' ? t.colors.checkOn : t.colors.checkRing}
            />
          </Pressable>

          {selectedAction === 'sold' && (
            <View style={styles.optionsContainer}>
              <Text style={styles.optionsLabel}>Prezzo di vendita finale (opzionale):</Text>
              <TextInput
                style={styles.priceInput}
                placeholder={formatPrice(product.sellPrice || 0)}
                placeholderTextColor={t.colors.placeholder}
                keyboardType="numeric"
                value={finalPrice}
                onChangeText={setFinalPrice}
              />
            </View>
          )}

          {/* Carico e Scarico con quantità (M09): stessa finestra e stessa logica di «Movimenta» nella Scheda */}
          {canMoveStock(product) && (
            <>
              <Pressable style={styles.actionButton} onPress={() => setSheetKind('carico')} accessibilityLabel="Carico">
                <View style={[styles.actionIcon, { backgroundColor: '#0EA5E9' }]}>
                  <AppIcon name="add-box" size={24} color={t.colors.onData} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>CARICO</Text>
                  <Text style={styles.actionDescription}>Aggiungi una quantità in una posizione</Text>
                </View>
                <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => setSheetKind('scarico')} accessibilityLabel="Scarico">
                <View style={[styles.actionIcon, { backgroundColor: '#F97316' }]}>
                  <AppIcon name="indeterminate-check-box" size={24} color={t.colors.onData} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>SCARICO</Text>
                  <Text style={styles.actionDescription}>Togli una quantità da una posizione</Text>
                </View>
                <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
              </Pressable>
            </>
          )}

          <Pressable
            style={[
              styles.actionButton,
              selectedAction === 'details' && styles.actionButtonActive,
            ]}
            onPress={() => setSelectedAction('details')}
          >
            <View style={[styles.actionIcon, { backgroundColor: t.colors.accent }]}>
              <AppIcon name="edit" size={24} color={t.colors.onAccent} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>DETTAGLI/MODIFICA</Text>
              <Text style={styles.actionDescription}>
                Visualizza e modifica tutti i campi
              </Text>
            </View>
            <AppIcon
              name={selectedAction === 'details' ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={24}
              color={selectedAction === 'details' ? t.colors.checkOn : t.colors.checkRing}
            />
          </Pressable>

          {/* Execute Button */}
          <Pressable
            style={[
              styles.executeButton,
              !selectedAction && styles.executeButtonDisabled,
            ]}
            onPress={handleAction}
            disabled={!selectedAction}
          >
            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
            <Text style={styles.executeButtonText}>
              {selectedAction === 'moved' && 'Conferma Spostamento'}
              {selectedAction === 'sold' && 'Conferma Vendita'}
              {selectedAction === 'details' && 'Vai ai Dettagli'}
              {!selectedAction && 'Seleziona un\'azione'}
            </Text>
          </Pressable>
        </ScrollView>
        <MovementSheet
          product={product}
          visible={sheetKind != null}
          initialKind={sheetKind ?? 'carico'}
          onClose={() => setSheetKind(null)}
          onDone={movementDone}
        />
      </SafeAreaView>
    );
  }

  // Default fallback (should not reach here ideally)
  return <NotFoundScreen message="Elemento non riconosciuto" router={router} />;
}

function NotFoundScreen({ message, router }: { message: string, router: any }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <View style={styles.errorContainer}>
        <AppIcon name="error-outline" size={64} color={t.colors.error} />
        <Text style={styles.errorText}>{message}</Text>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>Chiudi</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: t.colors.textSecondary,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
    marginVertical: 4,
  },
  headerMeta: {
    fontSize: 14,
    color: t.colors.textSecondary,
  },
  // Scaffale (S1a): il nome lungo va a capo invece di uscire dalla scheda
  shelfHeading: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
  },
  shelfEmpty: {
    ...t.typography.caption,
    lineHeight: 18,
    marginBottom: 16,
  },
  productPreview: {
    ...cardSurface(t),
    flexDirection: 'row',
    padding: 12,
    marginBottom: 24,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: t.radius.tile,
    backgroundColor: t.colors.backgroundSecondary,
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productSku: {
    ...t.typography.cardTitle,
    fontSize: 18,
    marginBottom: 4,
  },
  productType: {
    ...t.typography.caption,
    marginBottom: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    ...t.typography.caption,
    fontSize: 12,
    color: t.colors.accentInk,
  },
  sectionTitle: {
    ...t.typography.sectionHeader,
    marginBottom: 12,
    ...(t.section.line ? { borderBottomWidth: 1, borderBottomColor: t.section.line, paddingBottom: 6 } : null),
  },
  actionButton: {
    ...tileSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  actionButtonActive: {
    backgroundColor: t.colors.tileSelected,
    borderColor: t.colors.tileSelectedBorder,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: t.radius.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    ...t.typography.cardTitle,
    fontSize: 16,
    marginBottom: 2,
  },
  actionDescription: {
    ...t.typography.caption,
    fontSize: 13,
  },
  optionsContainer: {
    paddingHorizontal: 8,
    paddingTop: 4,
    marginBottom: 12,
  },
  optionsLabel: {
    ...t.typography.caption,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionChip: {
    ...tileSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  optionChipActive: {
    backgroundColor: t.colors.tileSelected,
    borderColor: t.colors.tileSelectedBorder,
  },
  optionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  optionText: {
    ...t.typography.body,
    fontSize: 15,
  },
  optionTextActive: {
    color: t.colors.tileSelectedText,
    fontWeight: '600',
  },
  priceInput: {
    height: t.input.height,
    backgroundColor: t.colors.input,
    borderRadius: t.radius.input,
    paddingHorizontal: 14,
    fontSize: 16,
    color: t.colors.inputText,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
  },
  executeButton: {
    backgroundColor: t.colors.button,
    borderRadius: t.radius.button,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    overflow: 'hidden',
    ...t.shadows.button,
  },
  executeButtonDisabled: {
    opacity: 0.5,
  },
  executeButtonText: {
    ...t.typography.buttonPrimary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    ...t.typography.cardTitle,
    fontSize: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: t.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: t.radius.button,
    alignItems: 'center', // Fix alignment
  },
  closeButtonText: {
    ...t.typography.buttonPrimary,
    fontSize: 16,
    color: t.colors.onButtonSecondary,
  },
}));
