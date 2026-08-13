import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/theme.dart';
import '../models/models.dart';
import '../providers/inventory_provider.dart';

class TimelineScreen extends StatefulWidget {
  const TimelineScreen({super.key});
  @override
  State<TimelineScreen> createState() => _TimelineScreenState();
}

enum TypeFilter { all, created, moved, modified, sold, photoAdded }
enum DateFilter { all, today, week, month }

class _TimelineScreenState extends State<TimelineScreen> {
  TypeFilter _typeFilter = TypeFilter.all;
  DateFilter _dateFilter = DateFilter.all;

  @override
  Widget build(BuildContext context) {
    final inventory = context.watch<InventoryProvider>();
    final filtered = _filterTimeline(inventory);
    return SafeArea(
      top: true,
      child: Container(
        color: AppTheme.background,
        child: Column(children: [
          _buildHeader(filtered.length),
          _buildTypeFilters(),
          _buildDateFilters(),
          Expanded(child: _buildTimelineList(filtered, inventory)),
        ]),
      ),
    );
  }

  List<TimelineEvent> _filterTimeline(InventoryProvider inventory) {
    return inventory.timeline.where((event) {
      if (_typeFilter != TypeFilter.all) {
        final typeMap = {TypeFilter.created: TimelineEventType.created, TypeFilter.moved: TimelineEventType.moved, TypeFilter.modified: TimelineEventType.modified, TypeFilter.sold: TimelineEventType.sold, TypeFilter.photoAdded: TimelineEventType.photoAdded};
        if (event.type != typeMap[_typeFilter]) return false;
      }
      final eventDate = event.timestamp;
      final now = DateTime.now();
      switch (_dateFilter) {
        case DateFilter.today: return _isSameDay(eventDate, now);
        case DateFilter.week: return eventDate.isAfter(now.subtract(const Duration(days: 7)));
        case DateFilter.month: return eventDate.isAfter(now.subtract(const Duration(days: 30)));
        default: return true;
      }
    }).toList()..sort((a, b) => b.timestamp.compareTo(a.timestamp));
  }

  bool _isSameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  Widget _buildHeader(int count) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding, vertical: 12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Cronologia Completa', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      Text('$count eventi', style: AppTypography.caption),
    ]),
  );

  Widget _buildTypeFilters() {
    final chips = [('Tutti', TypeFilter.all), ('Creati', TypeFilter.created), ('Spostati', TypeFilter.moved), ('Modificati', TypeFilter.modified), ('Venduti', TypeFilter.sold), ('Foto', TypeFilter.photoAdded)];
    return SizedBox(height: 48, child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding), children: chips.map((c) {
      final isActive = _typeFilter == c.$2;
      return GestureDetector(onTap: () => setState(() => _typeFilter = c.$2), child: Container(margin: const EdgeInsets.only(right: 8), padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12), decoration: BoxDecoration(color: isActive ? AppTheme.primary : AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusFull), border: Border.all(color: isActive ? AppTheme.primary : AppTheme.border)), child: Text(c.$1, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isActive ? Colors.black : AppTheme.textSecondary))));
    }).toList()));
  }

  Widget _buildDateFilters() {
    final chips = [('Tutti i Periodi', DateFilter.all), ('Oggi', DateFilter.today), ('Questa Settimana', DateFilter.week), ('Questo Mese', DateFilter.month)];
    return Padding(padding: const EdgeInsets.only(bottom: 16), child: SizedBox(height: 48, child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding), children: chips.map((c) {
      final isActive = _dateFilter == c.$2;
      return GestureDetector(onTap: () => setState(() => _dateFilter = c.$2), child: Container(margin: const EdgeInsets.only(right: 8), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12), decoration: BoxDecoration(color: isActive ? AppTheme.primary.withOpacity(0.3) : AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium), border: Border.all(color: isActive ? AppTheme.primary : AppTheme.border)), child: Text(c.$1, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isActive ? AppTheme.primary : AppTheme.textSecondary))));
    }).toList())));
  }

  Widget _buildTimelineList(List<TimelineEvent> events, InventoryProvider inventory) {
    if (events.isEmpty) return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: const [Icon(Icons.timeline, size: 64, color: AppTheme.textSecondary), SizedBox(height: 16), Text('Nessun evento trovato', style: TextStyle(fontSize: 16, color: AppTheme.textSecondary))]));
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index];
        final product = inventory.getProductById(event.productId);
        final sku = product?.sku ?? 'Prodotto eliminato';
        return GestureDetector(
          onTap: () { if (product != null) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Apri prodotto: $sku'))); } },
          child: Container(margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
            child: Row(children: [
              Container(width: 48, height: 48, decoration: BoxDecoration(color: _eventColor(event.type).withOpacity(0.2), borderRadius: BorderRadius.circular(AppTheme.radiusMedium)), child: Icon(_eventIcon(event.type), size: 24, color: _eventColor(event.type))),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_eventTitle(event, sku), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary), maxLines: 1, overflow: TextOverflow.ellipsis),
                if (_eventDescription(event).isNotEmpty) Text(_eventDescription(event), style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                Text(_formatDate(event.timestamp), style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
              ])),
              const Icon(Icons.chevron_right, size: 24, color: AppTheme.textSecondary),
            ]),
          ),
        );
      },
    );
  }

  IconData _eventIcon(TimelineEventType type) => switch (type) {
    TimelineEventType.created => Icons.add_circle,
    TimelineEventType.moved => Icons.swap_horiz,
    TimelineEventType.modified => Icons.edit,
    TimelineEventType.sold => Icons.sell,
    TimelineEventType.scanned => Icons.qr_code_scanner,
    TimelineEventType.photoAdded => Icons.add_photo_alternate,
    TimelineEventType.deleted => Icons.delete,
    TimelineEventType.restored => Icons.restore_from_trash,
  };

  Color _eventColor(TimelineEventType type) => switch (type) {
    TimelineEventType.created || TimelineEventType.sold || TimelineEventType.restored => const Color(0xFF10B981),
    TimelineEventType.moved => const Color(0xFF3B82F6),
    TimelineEventType.modified => AppTheme.primary,
    TimelineEventType.scanned => const Color(0xFF8B5CF6),
    TimelineEventType.photoAdded => const Color(0xFFF59E0B),
    TimelineEventType.deleted => AppTheme.notification,
  };

  String _eventTitle(TimelineEvent event, String sku) => switch (event.type) {
    TimelineEventType.created => '$sku - Creato',
    TimelineEventType.moved => '$sku - Spostato: ${event.details.from} → ${event.details.to}',
    TimelineEventType.modified => event.details.changes != null && event.details.changes!.isNotEmpty ? '$sku - ${event.details.changes![0]}' : '$sku - Modificato',
    TimelineEventType.sold => '$sku - Venduto${event.details.finalPrice != null ? ' - €${event.details.finalPrice!.toStringAsFixed(0)}' : ''}',
    TimelineEventType.scanned => '$sku - Scansionato',
    TimelineEventType.photoAdded => '$sku - ${event.details.photoCount ?? 1} foto aggiunte',
    TimelineEventType.deleted => '$sku - Spostato nel Cestino',
    TimelineEventType.restored => '$sku - Ripristinato dal Cestino',
  };

  String _eventDescription(TimelineEvent event) {
    if (event.type == TimelineEventType.modified && event.details.changes != null) return event.details.changes!.skip(1).join(' • ');
    return '';
  }

  String _formatDate(DateTime date) {
    final months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
    return '${date.day.toString().padLeft(2, '0')} ${months[date.month - 1]} ${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}
