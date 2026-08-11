import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/timeline_event.dart';
import '../models/product.dart';
import '../providers/inventory_provider.dart';

enum _TimelineFilter { all, created, moved, sold, modified, scanned, deleted }

class TimelineScreen extends ConsumerStatefulWidget {
  const TimelineScreen({super.key});

  @override
  ConsumerState<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends ConsumerState<TimelineScreen> {
  _TimelineFilter _selectedFilter = _TimelineFilter.all;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inventoryState = ref.watch(inventoryProvider);
    final timelineEvents = inventoryState.timeline;
    final products = inventoryState.products;

    // Map products for fast lookup by ID
    final Map<String, Product> productMap = {
      for (final p in products) p.id: p
    };

    // Filter events
    final filteredEvents = timelineEvents.where((event) {
      // Type filter
      if (_selectedFilter != _TimelineFilter.all) {
        switch (_selectedFilter) {
          case _TimelineFilter.created:
            if (event.type != TimelineEventType.created) return false;
            break;
          case _TimelineFilter.moved:
            if (event.type != TimelineEventType.moved) return false;
            break;
          case _TimelineFilter.sold:
            if (event.type != TimelineEventType.sold) return false;
            break;
          case _TimelineFilter.modified:
            if (event.type != TimelineEventType.modified) return false;
            break;
          case _TimelineFilter.scanned:
            if (event.type != TimelineEventType.scanned) return false;
            break;
          case _TimelineFilter.deleted:
            if (event.type != TimelineEventType.deleted) return false;
            break;
          case _TimelineFilter.all:
            break;
        }
      }

      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final product = productMap[event.productId];
        final skuMatch = product?.sku.toLowerCase().contains(query) ?? false;
        final furMatch = product?.furType.toLowerCase().contains(query) ?? false;
        final detailsFrom = event.details.from?.toLowerCase().contains(query) ?? false;
        final detailsTo = event.details.to?.toLowerCase().contains(query) ?? false;

        return skuMatch || furMatch || detailsFrom || detailsTo;
      }

      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAlignment.start,
          children: [
            Text(
              'Cronologia Eventi',
              style: AppTypography.titleMedium.copyWith(color: AppColors.textPrimary),
            ),
            Text(
              '${filteredEvents.length} eventi registrati',
              style: AppTypography.caption.copyWith(color: AppColors.textMuted),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search & Filter Header
          Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.backgroundSecondary,
            child: Column(
              children: [
                // Search Field
                TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() => _searchQuery = val),
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Cerca per SKU, tipologia, posizione...',
                    hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
                    prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 20),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: AppColors.textMuted, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: AppColors.surface,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Filter Chips List
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip(_TimelineFilter.all, 'Tutti'),
                      const SizedBox(width: 8),
                      _buildFilterChip(_TimelineFilter.created, 'Creati'),
                      const SizedBox(width: 8),
                      _buildFilterChip(_TimelineFilter.moved, 'Spostati'),
                      const SizedBox(width: 8),
                      _buildFilterChip(_TimelineFilter.sold, 'Venduti'),
                      const SizedBox(width: 8),
                      _buildFilterChip(_TimelineFilter.modified, 'Modificati'),
                      const SizedBox(width: 8),
                      _buildFilterChip(_TimelineFilter.scanned, 'Scansionati'),
                      const SizedBox(width: 8),
                      _buildFilterChip(_TimelineFilter.deleted, 'Eliminati'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Timeline Event List
          Expanded(
            child: filteredEvents.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.border),
                          ),
                          child: const Icon(
                            Icons.history_toggle_off_rounded,
                            size: 48,
                            color: AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Nessun evento trovato',
                          style: AppTypography.titleMedium.copyWith(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Prova a modificare i filtri o il termine di ricerca',
                          style: AppTypography.bodySmall.copyWith(color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    itemCount: filteredEvents.length,
                    itemBuilder: (context, index) {
                      final event = filteredEvents[index];
                      final product = productMap[event.productId];
                      final isLast = index == filteredEvents.length - 1;

                      return _TimelineEventTile(
                        event: event,
                        product: product,
                        isLast: isLast,
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(_TimelineFilter filter, String label) {
    final isSelected = _selectedFilter == filter;

    return FilterChip(
      selected: isSelected,
      label: Text(label),
      labelStyle: AppTypography.caption.copyWith(
        color: isSelected ? AppColors.background : AppColors.textSecondary,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
      ),
      backgroundColor: AppColors.surface,
      selectedColor: AppColors.primary,
      checkmarkColor: AppColors.background,
      side: BorderSide(
        color: isSelected ? AppColors.primary : AppColors.border,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      onSelected: (selected) {
        if (selected) {
          setState(() => _selectedFilter = filter);
        }
      },
    );
  }
}

class _TimelineEventTile extends StatelessWidget {
  final TimelineEvent event;
  final Product? product;
  final bool isLast;

  const _TimelineEventTile({
    required this.event,
    required this.product,
    required this.isLast,
  });

  IconData _getEventIcon(TimelineEventType type) {
    switch (type) {
      case TimelineEventType.created:
        return Icons.add_circle_outline_rounded;
      case TimelineEventType.moved:
        return Icons.compare_arrows_rounded;
      case TimelineEventType.modified:
        return Icons.edit_note_rounded;
      case TimelineEventType.sold:
        return Icons.shopping_bag_outlined;
      case TimelineEventType.scanned:
        return Icons.qr_code_scanner_rounded;
      case TimelineEventType.photoAdded:
        return Icons.add_a_photo_outlined;
      case TimelineEventType.deleted:
        return Icons.delete_outline_rounded;
      case TimelineEventType.restored:
        return Icons.restore_rounded;
    }
  }

  Color _getEventColor(TimelineEventType type) {
    switch (type) {
      case TimelineEventType.created:
        return AppColors.primary; // Gold
      case TimelineEventType.moved:
        return const Color(0xFF3B82F6); // Blue
      case TimelineEventType.modified:
        return const Color(0xFFF59E0B); // Amber
      case TimelineEventType.sold:
        return const Color(0xFF10B981); // Emerald Green
      case TimelineEventType.scanned:
        return const Color(0xFF8B5CF6); // Purple
      case TimelineEventType.photoAdded:
        return const Color(0xFFEC4899); // Pink
      case TimelineEventType.deleted:
        return const Color(0xFFEF4444); // Red
      case TimelineEventType.restored:
        return const Color(0xFF10B981); // Emerald Green
    }
  }

  String _getEventTitle(TimelineEventType type) {
    switch (type) {
      case TimelineEventType.created:
        return 'Prodotto Creato';
      case TimelineEventType.moved:
        return 'Spostamento Posizione';
      case TimelineEventType.modified:
        return 'Scheda Modificata';
      case TimelineEventType.sold:
        return 'Prodotto Venduto';
      case TimelineEventType.scanned:
        return 'Scansione Effettuata';
      case TimelineEventType.photoAdded:
        return 'Foto Aggiunta';
      case TimelineEventType.deleted:
        return 'Spostato nel Cestino';
      case TimelineEventType.restored:
        return 'Ripristinato dal Cestino';
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getEventColor(event.type);
    final icon = _getEventIcon(event.type);
    final title = _getEventTitle(event.type);
    final formattedTime = DateFormat('dd/MM/yyyy HH:mm').format(event.timestamp);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAlignment.start,
        children: [
          // Timeline indicator line + icon dot
          Column(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: color.withValues(alpha: 0.4), width: 1.5),
                ),
                child: Icon(icon, size: 18, color: color),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    color: AppColors.border,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),

          // Event Card Content
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        title,
                        style: AppTypography.titleSmall.copyWith(
                          color: color,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        formattedTime,
                        style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (product != null)
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.backgroundSecondary,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Text(
                            product!.sku,
                            style: AppTypography.caption.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            product!.furType,
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),

                  // Detail payload details
                  if (event.details.from != null && event.details.to != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Text(
                            event.details.from!,
                            style: AppTypography.caption.copyWith(color: AppColors.textSecondary),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 6),
                            child: Icon(Icons.arrow_forward_rounded, size: 14, color: AppColors.primary),
                          ),
                          Text(
                            event.details.to!,
                            style: AppTypography.caption.copyWith(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  if (event.details.changes != null && event.details.changes!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Column(
                      crossAxisAlignment: CrossAlignment.start,
                      children: event.details.changes!
                          .map(
                            (c) => Padding(
                              padding: const EdgeInsets.only(bottom: 2),
                              child: Row(
                                children: [
                                  const Icon(Icons.chevron_right_rounded, size: 14, color: AppColors.textMuted),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      c,
                                      style: AppTypography.caption.copyWith(color: AppColors.textSecondary),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ],

                  if (event.details.finalPrice != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Prezzo Finale: €${event.details.finalPrice!.toStringAsFixed(2)}',
                      style: AppTypography.bodySmall.copyWith(
                        color: const Color(0xFF10B981),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
