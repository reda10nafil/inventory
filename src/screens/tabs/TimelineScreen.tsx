// FurInventory Pro - Global Timeline Screen
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import { useInventory } from '../../../contexts/InventoryContext';
import { usePlaceLabel } from '../../../hooks/usePlaceLabel';
import { useContacts } from '../../../contexts/ContactsContext';
import { describeStockEvent } from '../../../utils/stock';
import { TimelineEvent } from '../../../types';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { formatPrice } from '../../../utils/price';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';

type FilterType = 'all' | 'created' | 'moved' | 'modified' | 'sold' | 'photo_added' | 'stock';
type DateFilter = 'all' | 'today' | 'week' | 'month';

const TYPE_FILTERS: [FilterType, string][] = [
  ['all', 'Tutti'],
  ['created', 'Creati'],
  ['moved', 'Spostati'],
  ['modified', 'Modificati'],
  ['sold', 'Venduti'],
  ['photo_added', 'Foto'],
  ['stock', 'Movimenti'],
];

const DATE_FILTERS: [DateFilter, string][] = [
  ['all', 'Tutti i Periodi'],
  ['today', 'Oggi'],
  ['week', 'Questa Settimana'],
  ['month', 'Questo Mese'],
];

export default function TimelineScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { timeline, getProductById } = useInventory();
  // Nome della posizione, con lo scaffale per la giacenza sugli scaffali (S1b): «Magazzino › A1»
  const placeLabel = usePlaceLabel();
  // Fornitore o cliente del movimento (M10): «· Fornitore Rossi» in fondo al testo
  const { labelOf: contactLabel } = useContacts();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created': return 'add-circle';
      case 'moved': return 'swap-horiz';
      case 'modified': return 'edit';
      case 'sold': return 'sell';
      case 'scanned': return 'qr-code-scanner';
      case 'photo_added': return 'add-photo-alternate';
      case 'deleted': return 'delete';
      case 'restored': return 'restore-from-trash';
      case 'stock': return 'inventory';
      default: return 'circle';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'created': return '#10B981';
      case 'moved': return '#3B82F6';
      case 'modified': return t.colors.accent;
      case 'sold': return '#10B981';
      case 'scanned': return '#8B5CF6';
      case 'photo_added': return '#F59E0B';
      case 'deleted': return t.colors.notification;
      case 'restored': return '#10B981';
      case 'stock': return '#3B82F6';
      default: return t.colors.textSecondary;
    }
  };

  const getEventTitle = (event: TimelineEvent) => {
    const product = getProductById(event.productId);
    const sku = product?.sku || 'Prodotto eliminato';

    switch (event.type) {
      case 'created':
        return `${sku} - Creato`;
      case 'moved':
        return `${sku} - Spostato: ${event.details.from} → ${event.details.to}`;
      case 'modified':
        if (event.details.changes && event.details.changes.length > 0) {
          return `${sku} - ${event.details.changes[0]}`;
        }
        return `${sku} - Modificato`;
      case 'sold':
        const price = event.details.finalPrice ? ` - ${formatPrice(event.details.finalPrice)}` : '';
        return `${sku} - Venduto${price}`;
      case 'scanned':
        return `${sku} - Scansionato`;
      case 'photo_added':
        const count = event.details.photoCount || 1;
        return `${sku} - ${count} foto aggiunte`;
      case 'deleted':
        return `${sku} - Spostato nel Cestino`;
      case 'restored':
        return `${sku} - Ripristinato dal Cestino`;
      case 'stock':
        return `${sku} - ${describeStockEvent(event.details, placeLabel, product?.unit, contactLabel)}`;
      default:
        return `${sku} - Evento`;
    }
  };

  const getEventDescription = (event: TimelineEvent) => {
    if (event.type === 'modified' && event.details.changes) {
      return event.details.changes.slice(1).join(' • ');
    }
    return '';
  };

  const filterByDate = (event: TimelineEvent): boolean => {
    const eventDate = new Date(event.timestamp);
    const now = new Date();

    switch (dateFilter) {
      case 'today':
        return eventDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return eventDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return eventDate >= monthAgo;
      default:
        return true;
    }
  };

  const filteredTimeline = timeline
    .filter((event) => filterType === 'all' || event.type === filterType)
    .filter((event) => filterByDate(event))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleEventPress = (event: TimelineEvent) => {
    const product = getProductById(event.productId);
    if (product) {
      router.push(`/product/${event.productId}`);
    } else {
      Alert.alert('Prodotto Non Trovato', 'Questo prodotto è stato eliminato');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cronologia Completa</Text>
        <Text style={styles.headerCount}>{filteredTimeline.length} eventi</Text>
      </View>

      {/* Type Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRowContent}
        style={styles.filterScroll}
      >
        {TYPE_FILTERS.map(([value, label]) => {
          const active = filterType === value;
          return (
            <Pressable key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilterType(value)}>
              {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Date Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRowContent}
        style={styles.dateFilterScroll}
      >
        {DATE_FILTERS.map(([value, label]) => {
          const active = dateFilter === value;
          return (
            <Pressable key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => setDateFilter(value)}>
              {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Timeline List */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.screenPadding,
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {filteredTimeline.length === 0 && (
          <View style={styles.emptyState}>
            <AppIcon name="timeline" size={64} color={t.colors.textSecondary} />
            <Text style={styles.emptyText}>Nessun evento trovato</Text>
          </View>
        )}

        {filteredTimeline.map((event, index) => (
          <Pressable
            key={`${event.id}-${index}`}
            style={styles.timelineItem}
            onPress={() => handleEventPress(event)}
          >
            <View style={[styles.eventIcon, { backgroundColor: withAlpha(getEventColor(event.type), 0.125) }]}>
              <AppIcon
                name={getEventIcon(event.type) as any}
                size={24}
                color={getEventColor(event.type)}
              />
            </View>
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{getEventTitle(event)}</Text>
              {getEventDescription(event) !== '' && (
                <Text style={styles.eventDescription}>{getEventDescription(event)}</Text>
              )}
              <Text style={styles.eventDate}>
                {new Date(event.timestamp).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: t.title.size,
    fontWeight: t.title.weight,
    letterSpacing: t.title.tracking,
    color: t.colors.textPrimary,
  },
  headerCount: {
    ...t.typography.caption,
    marginTop: 2,
  },
  // Le righe orizzontali non devono allungarsi né stringersi: su web lo ScrollView ha `flex: 1` e le pillole
  // venivano gonfiate e tagliate (D10).
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    paddingVertical: 4,
  },
  dateFilterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    paddingVertical: 4,
    marginBottom: 12,
  },
  chipRowContent: {
    paddingHorizontal: t.spacing.screenPadding,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
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
  chipActive: {
    backgroundColor: t.colors.chipActive,
    borderColor: t.colors.chipActiveBorder,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: t.colors.chipText,
  },
  chipTextActive: {
    fontWeight: '600',
    color: t.colors.chipActiveText,
  },
  timelineItem: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: t.radius.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    ...t.typography.cardTitle,
    fontSize: 14,
    marginBottom: 2,
  },
  eventDescription: {
    ...t.typography.caption,
    fontSize: 12,
    marginBottom: 4,
  },
  eventDate: {
    ...t.typography.caption,
    fontSize: 11,
    color: t.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    ...t.typography.caption,
    fontSize: 16,
    marginTop: 16,
  },
}));
