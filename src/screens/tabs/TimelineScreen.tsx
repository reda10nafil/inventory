// FurInventory Pro - Global Timeline Screen
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import { useInventory } from '../../../contexts/InventoryContext';
import { TimelineEvent } from '../../../types';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

type FilterType = 'all' | 'created' | 'moved' | 'modified' | 'sold' | 'photo_added';
type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function TimelineScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { timeline, getProductById } = useInventory();
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
        const price = event.details.finalPrice ? ` - €${event.details.finalPrice.toLocaleString()}` : '';
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cronologia Completa</Text>
        <Text style={styles.headerCount}>{filteredTimeline.length} eventi</Text>
      </View>

      {/* Type Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        style={styles.filterScroll}
      >
        <Pressable
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
            Tutti
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, filterType === 'created' && styles.filterChipActive]}
          onPress={() => setFilterType('created')}
        >
          <Text style={[styles.filterChipText, filterType === 'created' && styles.filterChipTextActive]}>
            Creati
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, filterType === 'moved' && styles.filterChipActive]}
          onPress={() => setFilterType('moved')}
        >
          <Text style={[styles.filterChipText, filterType === 'moved' && styles.filterChipTextActive]}>
            Spostati
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, filterType === 'modified' && styles.filterChipActive]}
          onPress={() => setFilterType('modified')}
        >
          <Text style={[styles.filterChipText, filterType === 'modified' && styles.filterChipTextActive]}>
            Modificati
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, filterType === 'sold' && styles.filterChipActive]}
          onPress={() => setFilterType('sold')}
        >
          <Text style={[styles.filterChipText, filterType === 'sold' && styles.filterChipTextActive]}>
            Venduti
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, filterType === 'photo_added' && styles.filterChipActive]}
          onPress={() => setFilterType('photo_added')}
        >
          <Text style={[styles.filterChipText, filterType === 'photo_added' && styles.filterChipTextActive]}>
            Foto
          </Text>
        </Pressable>
      </ScrollView>

      {/* Date Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateFilterScrollContent}
        style={styles.dateFilterScroll}
      >
        <Pressable
          style={[styles.dateChip, dateFilter === 'all' && styles.dateChipActive]}
          onPress={() => setDateFilter('all')}
        >
          <Text style={[styles.dateChipText, dateFilter === 'all' && styles.dateChipTextActive]}>
            Tutti i Periodi
          </Text>
        </Pressable>
        <Pressable
          style={[styles.dateChip, dateFilter === 'today' && styles.dateChipActive]}
          onPress={() => setDateFilter('today')}
        >
          <Text style={[styles.dateChipText, dateFilter === 'today' && styles.dateChipTextActive]}>
            Oggi
          </Text>
        </Pressable>
        <Pressable
          style={[styles.dateChip, dateFilter === 'week' && styles.dateChipActive]}
          onPress={() => setDateFilter('week')}
        >
          <Text style={[styles.dateChipText, dateFilter === 'week' && styles.dateChipTextActive]}>
            Questa Settimana
          </Text>
        </Pressable>
        <Pressable
          style={[styles.dateChip, dateFilter === 'month' && styles.dateChipActive]}
          onPress={() => setDateFilter('month')}
        >
          <Text style={[styles.dateChipText, dateFilter === 'month' && styles.dateChipTextActive]}>
            Questo Mese
          </Text>
        </Pressable>
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
    paddingVertical: 12,
  },
  headerTitle: {
    ...t.typography.cardTitle,
    fontSize: 24,
  },
  headerCount: {
    ...t.typography.caption,
    fontSize: 14,
    marginTop: 4,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterScrollContent: {
    paddingHorizontal: t.spacing.screenPadding,
    gap: 8,
  },
  dateFilterScroll: {
    marginBottom: 16,
  },
  dateFilterScrollContent: {
    paddingHorizontal: t.spacing.screenPadding,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.colors.chip,
    borderRadius: t.radius.chip,
    borderWidth: 1,
    borderColor: t.colors.chipBorder,
    minHeight: 48,
    minWidth: 80,
  },
  filterChipActive: {
    backgroundColor: t.colors.chipActive,
    borderColor: t.colors.chipActiveBorder,
  },
  filterChipText: {
    ...t.typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.chipText,
  },
  filterChipTextActive: {
    color: t.colors.chipActiveText,
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.colors.chip,
    borderRadius: t.radius.medium,
    borderWidth: 1,
    borderColor: t.colors.chipBorder,
    minHeight: 48,
    minWidth: 90,
  },
  dateChipActive: {
    backgroundColor: withAlpha(t.colors.accent, 0.19),
    borderColor: t.colors.accent,
  },
  dateChipText: {
    ...t.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: t.colors.chipText,
  },
  dateChipTextActive: {
    color: t.colors.accentInk,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
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
