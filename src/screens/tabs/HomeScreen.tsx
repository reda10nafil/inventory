// FurInventory Pro - Home Screen
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
import { FlashList } from '@shopify/flash-list';
import { Image } from '../../lib/ExpoImage';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations } from '../../../contexts/LocationsContext';
import { useFurTypes } from '../../../contexts/FurTypesContext';
import { useProductKind } from '../../../hooks/useProductKind';
import { useShelves } from '../../../contexts/ShelvesContext';
import { placeWithShelf } from '../../../utils/shelves';
import { categoryPath, categoryPicker, categoryTree, categoryWithDescendants, rootCategories } from '../../../utils/categories';
import { isDormant, needsPromotion } from '../../../services/mockData';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { formatPrice } from '../../../utils/price';
import { PhotoPlaceholder } from '../../../components/ui/PhotoPlaceholder';
import { PermissionNote } from '../../../components/PermissionNote';
import { usePermission } from '../../../contexts/ProfileContext';
import { matchesFilter, matchesSearch } from '../../../utils/inventoryFilter';
import { formatQty, isOutOfStock, isStocked, storedTotal } from '../../../utils/stock';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import { useFieldOptions } from '../../../hooks/useFieldOptions';
import { cardFields, cardText, optionOf } from '../../../utils/fieldValues';
import { useLayout } from '../../../contexts/LayoutContext';
import { fieldIcon } from '../../../components/FieldInput';
import { OptionMark, hasMark } from '../../../components/OptionMark';

type FilterType = 'all' | 'available' | 'sold' | 'alert' | 'trash';


export default function HomeScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams(); // Read params
  const { products, alerts, filterProducts, deleteProduct, updateProduct, libraries } = useInventory();
  // ACC1 (ticket 32): Elimina della selezione spento col motivo per un ruolo che non elimina
  const deletePerm = usePermission('eliminare');
  const { locations } = useLocations();
  const { furTypes } = useFurTypes();
  const kindOf = useProductKind();
  const { shelfOf } = useShelves();
  const { customFields, allFieldsIncludingDeleted } = useCustomFields();
  const optionsOf = useFieldOptions();
  const { layout } = useLayout();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeLibraryId, setActiveLibraryId] = useState<string | null>(null);

  // React to param changes (e.g. deep link from scanner). Dipende dall'oggetto dei parametri e non dal solo valore: da
  // C2 «Vedi prodotti» torna a questa stessa Home (`popTo` in compat.ts) e, per la stessa categoria letta di nuovo,
  // il filtro va rimesso anche se nel frattempo se n'è scelto un altro
  React.useEffect(() => {
    if (params.library) {
      setActiveLibraryId(params.library as string);
    }
  }, [params]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showActionModal, setShowActionModal] = useState(false); // Controls Modal visibility

  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const activeAlerts = alerts.filter((a) => !a.dismissed);
  const alertedIds = new Set(activeAlerts.map((a) => a.productId));
  const trashProducts = products.filter((p) => p.deletedAt);

  // 1. Prima il filtro per categoria (C1: una categoria principale include le sue sottocategorie)
  const inCategory = activeLibraryId === null ? null : categoryWithDescendants(libraries, activeLibraryId);
  const inActiveCategory = (p: { libraryId?: string }) => inCategory === null || (!!p.libraryId && inCategory.has(p.libraryId));
  const folderFilteredProducts = products.filter(inActiveCategory);
  // Pillole: la principale accesa e, sotto, le sue sottocategorie (anche per un codice di sottocategoria letto)
  const picker = categoryPicker(libraries, activeLibraryId ?? undefined);
  const categoryLabels = libraries.map((l) => ({ id: l.id, label: categoryPath(libraries, l.id) }));

  // Calculate stats based on the FOLDER (Library) view
  const stats = {
    total: folderFilteredProducts.length,
    available: folderFilteredProducts.filter((p) => p.status === 'available' && !p.deletedAt).length,
    sold: folderFilteredProducts.filter((p) => p.status === 'sold' && !p.deletedAt).length,
    // Prodotti con almeno un avviso, non numero di avvisi (P15)
    alerts: folderFilteredProducts.filter((p) => matchesFilter(p, 'alert', alertedIds)).length,
    trash: trashProducts.filter(inActiveCategory).length,
  };

  // 2. Then, apply Status Filter & Search on the Folder-filtered list
  // La ricerca vale in tutti i filtri, anche Cestino e Attenzione, e trova la posizione per nome (P14)
  // EDC: anche il testo mostrato dei campi personalizzati (testi brevi, numeri, prezzi, scelte scritte a mano)
  const filteredProducts = folderFilteredProducts.filter((p) =>
    matchesFilter(p, activeFilter, alertedIds) && matchesSearch(p, searchQuery, locations, furTypes, categoryLabels, allFieldsIncludingDeleted));
  // Campi con «Mostra nella card» (EDC, al massimo 2; nessuno nei campi di partenza: la card di sempre non cambia)
  const onCard = cardFields(customFields);

  const filters: { id: FilterType; label: string; count: number }[] = [
    { id: 'all', label: 'Tutti', count: stats.total - stats.trash },
    { id: 'available', label: 'Disponibili', count: stats.available },
    { id: 'sold', label: 'Venduti', count: stats.sold },
    { id: 'alert', label: 'Attenzione', count: stats.alerts },
    { id: 'trash', label: 'Cestino', count: stats.trash },
  ];

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleLongPress = (product: any) => {
    // Enter selection mode if not already active, otherwise toggle
    if (selectedIds.length === 0) {
      setSelectedIds([product.id]);
    } else {
      toggleSelection(product.id);
    }
  };

  const handlePress = (product: any) => {
    if (selectedIds.length > 0) {
      toggleSelection(product.id);
    } else {
      router.push(`/product/${product.id}`);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const exitSelectionMode = () => {
    setSelectedIds([]);
    setShowActionModal(false);
  };

  const handleMoveToLibrary = (libraryId: string | undefined) => {
    if (selectedIds.length === 0) return;

    // Batch update
    selectedIds.forEach(id => {
      updateProduct(id, { libraryId });
    });

    if (libraryId === undefined) {
      Alert.alert('Spostato', `${selectedIds.length} prodotti rimossi dalla categoria`);
    } else {
      const libName = categoryPath(libraries, libraryId);
      Alert.alert('Spostato', `${selectedIds.length} prodotti spostati in "${libName}"`);
    }

    exitSelectionMode();
  };

  const CONFIRM_DELETE_PRODUCT = () => {
    if (selectedIds.length === 0 || !deletePerm.allowed) return;

    Alert.alert(
      'Conferma Eliminazione',
      `Vuoi spostare ${selectedIds.length} prodotti nel cestino?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            selectedIds.forEach(id => deleteProduct(id));
            exitSelectionMode();
          }
        }
      ]
    );
  };

  const renderProductCard = ({ item }: any) => {
    const product = item;
    const hasAlert = activeAlerts.some((a) => a.productId === product.id);
    const dormant = isDormant(product);
    const promotion = needsPromotion(product);

    const isSelected = selectedIds.includes(product.id);
    const isSelectionMode = selectedIds.length > 0;
    // Posizione con il suo nome e il suo colore (dati dell'utente); se non c'è più resta l'id, come nella Scheda.
    const location = locations.find((l) => l.id === product.location);
    const kind = kindOf(product);
    const shelf = shelfOf(product);

    return (
      <Pressable
        style={[styles.productCard, isSelected && styles.productCardSelected]}
        onPress={() => handlePress(product)}
        onLongPress={() => handleLongPress(product)}
        delayLongPress={300}
      >
        <View style={styles.photo}>
          {product.images?.[0] ? (
            <Image
              source={{ uri: product.images[0] }}
              style={styles.productImage}
              contentFit="cover"
            />
          ) : (
            <PhotoPlaceholder style={styles.productImage} />
          )}

          {/* Selection Overlay */}
          {isSelectionMode && (
            <View style={styles.selectionOverlay}>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <AppIcon name="check" size={14} color={t.colors.onAccent} />}
              </View>
            </View>
          )}

          {/* Status Badges */}
          <View style={styles.badgeContainer}>
            {product.status === 'sold' && (
              <View style={[styles.badge, styles.badgeSold]}>
                <Text style={styles.badgeText}>Venduto</Text>
              </View>
            )}
            {/* Articolo a quantità a 0 (M03): resta disponibile, ma non c'è */}
            {isOutOfStock(product) && (
              <View style={[styles.badge, styles.badgeSold]}>
                <Text style={styles.badgeText}>Esaurito</Text>
              </View>
            )}
            {hasAlert && product.status === 'available' && (
              <View style={[styles.badge, styles.badgeAlert]}>
                <AppIcon name="warning" size={13} color={t.colors.alertBadgeText} />
                <Text style={[styles.badgeText, styles.badgeTextAlert]}>Attenzione</Text>
              </View>
            )}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productSku} numberOfLines={1}>
            {product.sku}
          </Text>
          {/* C1: categoria e tipo di pelle, su due righe se serve (niente testo tagliato) */}
          {!!kind.line && (
            <Text style={styles.productType} numberOfLines={2}>
              {kind.line}
            </Text>
          )}

          {/* S1a: «Magazzino › A1» per un pezzo unico sul suo scaffale, su due righe se serve */}
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: location?.color || t.colors.textMuted }]} />
            <Text style={styles.locationText} numberOfLines={shelf ? 2 : 1}>
              {placeWithShelf(location?.label || product.location, shelf)}
            </Text>
          </View>

          {isStocked(product) && (
            <Text style={styles.qtyText} numberOfLines={1}>{formatQty(storedTotal(product), product.unit)}</Text>
          )}

          {/* EDC: i campi con «Mostra nella card», con l'icona del campo e il colore e l'icona del valore */}
          {onCard.map((field) => {
            const entry = (product.customData || []).find((d: any) => d.fieldSnapshot?.id === field.id);
            if (!entry) return null;
            const options = optionsOf(field);
            const text = cardText(field, entry.value, { options, snapshot: entry.fieldSnapshot });
            if (!text) return null;
            const option = field.type === 'single_choice' ? optionOf(entry.value, options, entry.fieldSnapshot) : undefined;
            return (
              <View key={field.id} style={styles.cardFieldRow} accessibilityLabel={`${field.name}: ${text}`}>
                <AppIcon name={fieldIcon(field, layout.fields.find((f) => f.id === field.id)?.icon)} size={13} color={t.colors.fieldIcon} />
                {hasMark(option) && <OptionMark option={option} size={8} />}
                <Text style={styles.cardFieldText} numberOfLines={1}>{text}</Text>
              </View>
            );
          })}

          {!!product.sellPrice && (
            <Text style={styles.priceText}>{formatPrice(product.sellPrice)}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <Backdrop />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Syncro Flow</Text>
          <Text style={styles.headerSubtitle}>{filteredProducts.length} prodotti</Text>

        </View>
        <View style={styles.headerActions}>
          {selectedIds.length > 0 ? (
            <Pressable
              style={styles.textButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.textButtonLabel}>
                {selectedIds.length === filteredProducts.length ? 'Deseleziona' : 'Seleziona Tutto'}
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                style={styles.iconButton}
                onPress={() => {
                  setIsSearchVisible(!isSearchVisible);
                  if (isSearchVisible) setSearchQuery('');
                }}
              >
                <AppIcon name={isSearchVisible ? "close" : "search"} size={22} color={t.colors.textPrimary} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Search Bar */}
      {isSearchVisible && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <AppIcon name="search" size={20} color={t.colors.fieldIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca SKU, categoria, posizione..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              placeholderTextColor={t.colors.placeholder}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <AppIcon name="cancel" size={18} color={t.colors.fieldIcon} />
              </Pressable>
            )}
          </View>
        </View>
      )}
      {/* Categorie principali (C1: le cartelle di prima) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.libraryContainer}
        style={styles.libraryScroll}
      >
        <Pressable
          style={[
            styles.libraryChip,
            activeLibraryId === null && styles.libraryChipActive,
          ]}
          onPress={() => setActiveLibraryId(null)}
        >
          {activeLibraryId === null && <GradientFill gradient={t.gradients.chipActive} style={styles.chipFill} />}
          <AppIcon
            name="apps"
            size={18}
            color={activeLibraryId === null ? t.colors.chipActiveText : t.colors.textSecondary}
          />
          <Text
            style={[
              styles.libraryText,
              activeLibraryId === null && styles.libraryTextActive,
            ]}
          >
            Tutti
          </Text>
        </Pressable>

        {rootCategories(libraries).map((lib) => {
          const active = picker.rootId === lib.id;
          return (
            <Pressable
              key={lib.id}
              style={[styles.libraryChip, active && styles.libraryChipActive]}
              onPress={() => setActiveLibraryId(lib.id)}
            >
              {active && <GradientFill gradient={t.gradients.chipActive} style={styles.chipFill} />}
              <AppIcon
                name={lib.icon as any}
                size={18}
                color={active ? t.colors.chipActiveText : t.colors.textSecondary}
              />
              <Text style={[styles.libraryText, active && styles.libraryTextActive]}>
                {lib.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Sottocategorie della categoria scelta: «Tutte» = la categoria con le sue sottocategorie */}
      {picker.rootId && picker.children.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.libraryContainer, styles.subLibraryContainer]}
          style={styles.libraryScroll}
        >
          {[{ id: picker.rootId, name: 'Tutte', icon: 'apps' }, ...picker.children].map((lib, i) => {
            const active = i === 0 ? activeLibraryId === picker.rootId : picker.childId === lib.id;
            return (
              <Pressable
                key={i === 0 ? 'tutte' : lib.id}
                style={[styles.libraryChip, styles.subLibraryChip, active && styles.libraryChipActive]}
                onPress={() => setActiveLibraryId(lib.id)}
              >
                {active && <GradientFill gradient={t.gradients.chipActive} style={styles.chipFill} />}
                <AppIcon
                  name={(i === 0 ? 'apps' : lib.icon || 'subdirectory-arrow-right') as any}
                  size={16}
                  color={active ? t.colors.chipActiveText : t.colors.textSecondary}
                />
                <Text style={[styles.libraryText, styles.subLibraryText, active && styles.libraryTextActive]}>
                  {lib.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Stats Cards: tre colonne uguali, tutte visibili. Il riquadro degli avvisi si colora solo se ce ne sono. */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.available}</Text>
          <Text style={styles.statLabel}>Disponibili</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.sold}</Text>
          <Text style={styles.statLabel}>Venduti</Text>
        </View>
        <View style={stats.alerts > 0 ? styles.statCardAlert : styles.statCard}>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, stats.alerts > 0 && styles.statTextAlert]}>{stats.alerts}</Text>
            {stats.alerts > 0 && (
              <AppIcon name="warning" size={20} color={t.colors.warningText} />
            )}
          </View>
          <Text style={[styles.statLabel, stats.alerts > 0 && styles.statTextAlert]}>Richiedono attenzione</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        style={styles.filterScroll}
      >
        {filters.map((filter) => {
          const active = activeFilter === filter.id;
          return (
            <Pressable
              key={filter.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter.id)}
            >
              {active && <GradientFill gradient={t.gradients.chipActive} style={styles.chipFill} />}
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {filter.label}{' '}
                <Text style={active ? styles.filterCountActive : styles.filterCount}>{filter.count}</Text>
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        numColumns={2}
        style={{ flex: 1 }}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          // D06: un messaggio quando l'inventario è vuoto o nessun prodotto passa cartella, filtro e ricerca
          <View style={styles.empty}>
            <AppIcon name={products.length > 0 ? 'search-off' : 'inventory-2'} size={40} color={t.colors.textMuted} />
            <Text style={styles.emptyTitle}>{products.length > 0 ? 'Nessun prodotto qui' : 'Inventario vuoto'}</Text>
            <Text style={styles.emptyText}>
              {products.length > 0
                ? 'Nessun prodotto corrisponde a categoria, filtro o ricerca scelti.'
                : 'Aggiungi il primo prodotto dalla scheda Aggiungi.'}
            </Text>
          </View>
        }
      />

      {/* Selection Bottom Bar */}
      {selectedIds.length > 0 && (
        <View style={styles.bottomActionBar}>
          <PermissionNote text={deletePerm.reason} floating />
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionCount}>{selectedIds.length}</Text>
          </View>
          <View style={styles.actionButtons}>
            <Pressable style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => setShowActionModal(true)}>
              <GradientFill gradient={t.gradients.button} style={styles.actionButtonFill} />
              <AppIcon name="folder-open" size={24} color={t.colors.onButton} />
            </Pressable>
            <Pressable style={[styles.actionButton, styles.actionButtonDestructive, !deletePerm.allowed && styles.actionButtonOff]} onPress={CONFIRM_DELETE_PRODUCT} accessibilityLabel="Elimina">
              <AppIcon name="delete" size={24} color={t.colors.onData} />
            </Pressable>
            <Pressable style={styles.closeSelectionButton} onPress={exitSelectionMode}>
              <AppIcon name="close" size={24} color={t.colors.onButtonSecondary} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Product Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowActionModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gestisci {selectedIds.length} Prodotti</Text>
            </View>

            <Text style={styles.modalSectionLabel}>Sposta in categoria</Text>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalList}>
              {/* Togli la categoria */}
              <Pressable
                style={styles.modalOption}
                onPress={() => handleMoveToLibrary(undefined)}
              >
                <View style={styles.modalOptionIcon}>
                  <AppIcon name="folder-off" size={20} color={t.colors.textSecondary} />
                </View>
                <Text style={styles.modalOptionText}>Rimuovi dalla categoria</Text>
              </Pressable>

              {/* Ad albero: le sottocategorie rientrate sotto la loro categoria */}
              {categoryTree(libraries).map(({ category: lib, depth }) => (
                <Pressable
                  key={lib.id}
                  style={[styles.modalOption, depth > 0 && { marginLeft: 20 * Math.min(depth, 2) }]}
                  onPress={() => handleMoveToLibrary(lib.id)}
                >
                  <View style={styles.modalOptionIcon}>
                    <AppIcon
                      name={lib.icon as any}
                      size={20}
                      color={t.colors.accentInk}
                    />
                  </View>
                  <Text style={styles.modalOptionText}>{lib.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable style={styles.modalCancelButton} onPress={() => setShowActionModal(false)}>
              <Text style={styles.modalCancelText}>Annulla</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: t.title.size,
    lineHeight: Math.round(t.title.size * 1.15),
    fontWeight: t.title.weight,
    letterSpacing: t.title.tracking,
    color: t.colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: t.colors.textSecondary,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardSurface(t),
    borderRadius: t.radius.chip,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: t.spacing.screenPadding,
    paddingVertical: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    ...cardSurface(t),
    borderRadius: t.radius.tile,
  },
  // Al posto di `statCard` quando ci sono avvisi (senza ombra, come nella tela)
  statCardAlert: {
    flex: 1,
    padding: 12,
    borderRadius: t.radius.tile,
    borderWidth: 1,
    borderColor: t.colors.warningLine,
    backgroundColor: t.colors.warningSoft,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: t.colors.statNumber,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  statTextAlert: {
    color: t.colors.warningText,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterContainer: {
    paddingHorizontal: t.spacing.screenPadding,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.colors.chip,
    borderRadius: t.radius.chip,
    borderWidth: 1,
    borderColor: t.colors.chipBorder,
    overflow: 'hidden',
  },
  filterChipActive: {
    backgroundColor: t.colors.chipActive,
    borderColor: t.colors.chipActiveBorder,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: t.colors.chipText,
  },
  filterTextActive: {
    fontWeight: '600',
    color: t.colors.chipActiveText,
  },
  filterCount: {
    color: t.colors.textSecondary,
  },
  filterCountActive: {
    fontWeight: '500',
    color: withAlpha(t.colors.chipActiveText, 0.8),
  },
  chipFill: {
    borderRadius: t.radius.chip,
  },
  grid: {
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 8,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    ...t.typography.cardTitle,
  },
  emptyText: {
    ...t.typography.caption,
    textAlign: 'center',
  },
  gridRow: {
    gap: 12,
  },
  productCard: {
    flex: 1,
    ...cardSurface(t),
    overflow: 'hidden',
  },
  productCardSelected: {
    borderWidth: 2,
    borderColor: t.colors.accent,
  },
  photo: {
    height: 160,
    marginTop: t.photo.inset.top,
    marginRight: t.photo.inset.right,
    marginBottom: t.photo.inset.bottom,
    marginLeft: t.photo.inset.left,
    borderRadius: t.radius.photo,
    overflow: 'hidden',
    backgroundColor: t.colors.backgroundSecondary,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: t.colors.scrim,
    borderWidth: 1.5,
    borderColor: t.colors.onData, // anello bianco fisso sopra la foto
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: t.colors.checkOn,
    borderColor: t.colors.checkOn,
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: t.radius.badge,
    gap: 4,
  },
  badgeSold: {
    backgroundColor: t.colors.soldBadge,
  },
  badgeAlert: {
    backgroundColor: t.colors.alertBadge,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: t.colors.soldBadgeText,
  },
  badgeTextAlert: {
    color: t.colors.alertBadgeText,
  },
  productInfo: {
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 4,
  },
  productSku: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
  },
  productType: {
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.textSecondary,
  },
  qtyText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: t.colors.textPrimary,
  },
  // EDC: campo con «Mostra nella card»
  cardFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  cardFieldText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.textSecondary,
  },
  priceText: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: t.weights.price,
    fontVariant: ['tabular-nums'],
    color: t.colors.accentInk,
  },
  searchContainer: {
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.input,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: t.radius.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: t.colors.inputText,
  },
  cardDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButtonActive: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radius.full,
  },
  libraryScroll: {
    flexGrow: 0,
  },
  libraryContainer: {
    paddingHorizontal: t.spacing.screenPadding,
    paddingVertical: 8,
    gap: 8,
  },
  libraryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: t.radius.chip,
    backgroundColor: t.colors.chip,
    gap: 6,
    borderWidth: 1,
    borderColor: t.colors.chipBorder,
    overflow: 'hidden',
  },
  libraryChipActive: {
    backgroundColor: t.colors.chipActive,
    borderColor: t.colors.chipActiveBorder,
  },
  libraryText: {
    fontSize: 14,
    fontWeight: '500',
    color: t.colors.chipText,
  },
  libraryTextActive: {
    fontWeight: '600',
    color: t.colors.chipActiveText,
  },
  // Seconda fila (sottocategorie): un po' più piccola, attaccata alla prima
  subLibraryContainer: {
    paddingTop: 0,
  },
  subLibraryChip: {
    height: 32,
    paddingHorizontal: 12,
  },
  subLibraryText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: t.colors.scrimStrong,
    justifyContent: 'center',
    padding: t.spacing.screenPadding,
  },
  // Pannello sopra il contenuto: fondo opaco (regola 7)
  modalContent: {
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 20,
    maxHeight: '80%',
    ...t.shadows.cardElevated,
  },
  modalHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  modalTitle: {
    ...t.typography.cardTitle,
    fontSize: 18,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...t.typography.caption,
    fontSize: 14,
    color: t.colors.accentInk,
  },
  modalSectionLabel: {
    ...t.typography.sectionHeader,
    marginBottom: 12,
    marginTop: 4,
    ...(t.section.line ? { paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalList: {
    gap: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    ...tileSurface(t),
  },
  modalOptionSelected: {
    borderColor: t.colors.accent,
    backgroundColor: withAlpha(t.colors.accent, 0.082), // 15% opacity gold
  },
  modalOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: t.radius.iconWrap,
    backgroundColor: t.colors.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalOptionIconSelected: {
    backgroundColor: t.colors.accent,
  },
  modalOptionText: {
    ...t.typography.body,
    fontSize: 15,
    flex: 1,
  },
  modalOptionTextSelected: {
    color: t.colors.accentInk,
    fontWeight: '600',
  },
  modalDivider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginVertical: 20,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: t.radius.medium,
    backgroundColor: withAlpha(t.colors.error, 0.082),
    marginBottom: 12,
  },
  modalDeleteText: {
    ...t.typography.buttonPrimary,
    color: t.colors.error,
    fontSize: 15,
  },
  modalCancelText: {
    ...t.typography.bodySecondary,
    fontWeight: '600',
  },
  modalCancelButton: {
    paddingVertical: 14,
    borderRadius: t.radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  // Barra della selezione multipla, sopra la griglia: fondo opaco (regola 7)
  bottomActionBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radius.card,
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...t.shadows.cardElevated,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionCount: {
    ...t.typography.cardTitle,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: t.radius.button,
    overflow: 'hidden',
  },
  actionButtonPrimary: {
    backgroundColor: t.colors.button,
    ...t.shadows.button,
  },
  actionButtonFill: {
    borderRadius: t.radius.button,
  },
  actionButtonDestructive: {
    backgroundColor: t.colors.error,
  },
  actionButtonOff: { opacity: 0.4 },
  actionButtonText: {
    ...t.typography.caption,
    fontWeight: '700',
    color: t.colors.onAccent,
    fontSize: 13,
  },
  closeSelectionButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: t.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
    borderRadius: t.radius.button,
  },
  textButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  textButtonLabel: {
    ...t.typography.buttonPrimary,
    color: t.colors.accentInk,
    fontSize: 14,
  },
}));
