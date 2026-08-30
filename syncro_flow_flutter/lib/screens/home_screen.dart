import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../core/theme/app_theme.dart';
import '../models/product.dart';
import '../models/alert_model.dart';
import '../providers/inventory_provider.dart';
import '../widgets/app_image.dart';

enum _FilterType { all, available, sold, alert, trash }

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  _FilterType _activeFilter = _FilterType.all;
  String? _activeLibraryId;
  String _searchQuery = '';
  bool _isSearchVisible = false;
  List<String> _selectedIds = [];
  bool _showActionModal = false;

  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inventoryState = ref.watch(inventoryProvider);
    final products = inventoryState.products;
    final alerts = inventoryState.alerts;
    final libraries = inventoryState.libraries;
    final activeAlerts = alerts.where((a) => !a.dismissed).toList();
    final trashProducts = products.where((p) => p.deletedAt != null).toList();

    // 1. Filter by Library (Folder)
    final folderFilteredProducts = products.where((p) {
      if (_activeLibraryId == null) return true;
      return p.libraryId == _activeLibraryId;
    }).toList();

    // Calculate stats
    final statsAvailable = folderFilteredProducts
        .where((p) => p.status == ProductStatusType.available && p.deletedAt == null)
        .length;
    final statsSold = folderFilteredProducts
        .where((p) => p.status == ProductStatusType.sold && p.deletedAt == null)
        .length;
    final statsAlerts = activeAlerts
        .where((a) => folderFilteredProducts.any((p) => p.id == a.productId))
        .length;
    final statsTrash = trashProducts.where((p) {
      if (_activeLibraryId == null) return true;
      return p.libraryId == _activeLibraryId;
    }).length;

    // 2. Apply status filter + search
    final filteredProducts = folderFilteredProducts.where((p) {
      // Status filter
      switch (_activeFilter) {
        case _FilterType.available:
          if (p.status != ProductStatusType.available || p.deletedAt != null) return false;
          break;
        case _FilterType.sold:
          if (p.status != ProductStatusType.sold || p.deletedAt != null) return false;
          break;
        case _FilterType.trash:
          return p.deletedAt != null;
        case _FilterType.alert:
          return activeAlerts.any((a) => a.productId == p.id);
        case _FilterType.all:
          if (p.deletedAt != null) return false;
          break;
      }

      // Search query
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return p.sku.toLowerCase().contains(query) ||
            p.furType.toLowerCase().contains(query) ||
            p.location.toLowerCase().contains(query);
      }
      return true;
    }).toList();

    final filters = [
      (_FilterType.all, 'Tutti', folderFilteredProducts.length - statsTrash),
      (_FilterType.available, 'Disponibili', statsAvailable),
      (_FilterType.sold, 'Venduti', statsSold),
      (_FilterType.alert, 'Attenzione', statsAlerts),
      (_FilterType.trash, 'Cestino', statsTrash),
    ];

    return SafeArea(
      bottom: false,
      child: Stack(
        children: [
          Column(
            children: [
              // Header
              _buildHeader(filteredProducts.length),

              // Search bar
              if (_isSearchVisible) _buildSearchBar(),

              // Library/Folder selector
              _buildLibrarySelector(libraries),

              // Stats cards
              _buildStatsCards(statsAvailable, statsSold, statsAlerts),

              // Filter chips
              _buildFilterChips(filters),

              // Products grid
              Expanded(
                child: filteredProducts.isEmpty
                    ? _buildEmptyState()
                    : GridView.builder(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.spacingScreenPadding,
                          vertical: 8,
                        ),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.65,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: filteredProducts.length,
                        itemBuilder: (context, index) {
                          return _buildProductCard(
                            filteredProducts[index],
                            activeAlerts,
                          );
                        },
                      ),
              ),
            ],
          ),

          // Selection bottom bar
          if (_selectedIds.isNotEmpty)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _buildSelectionBar(libraries),
            ),

          // Action modal overlay
          if (_showActionModal)
            _buildActionModal(libraries),
        ],
      ),
    );
  }

  Widget _buildHeader(int count) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.spacingScreenPadding,
        vertical: 12,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'SyncroFlow Pro',
                style: AppTypography.cardTitle.copyWith(fontSize: 20),
              ),
              const SizedBox(height: 2),
              Text(
                '$count prodotti',
                style: AppTypography.caption,
              ),
            ],
          ),
          Row(
            children: [
              if (_selectedIds.isNotEmpty)
                GestureDetector(
                  onTap: _handleSelectAll,
                  child: Text(
                    _selectedIds.length == ref.read(inventoryProvider).products.length
                        ? 'Deseleziona'
                        : 'Seleziona Tutto',
                    style: AppTypography.buttonSecondary.copyWith(fontSize: 14),
                  ),
                )
              else ...[
                IconButton(
                  tooltip: 'Scanner',
                  onPressed: () => context.push('/scanner'),
                  icon: const Icon(
                    Icons.qr_code_scanner_rounded,
                    color: AppColors.primary,
                    size: 24,
                  ),
                ),
                IconButton(
                  onPressed: () {
                    setState(() {
                      _isSearchVisible = !_isSearchVisible;
                      if (!_isSearchVisible) {
                        _searchQuery = '';
                        _searchController.clear();
                      }
                    });
                  },
                  icon: Icon(
                    _isSearchVisible ? Icons.close : Icons.search,
                    color: AppColors.primary,
                    size: 24,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.spacingScreenPadding,
      ),
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
          border: Border.all(color: AppColors.border, width: 1),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(
          children: [
            const Icon(Icons.search, size: 20, color: AppColors.textSecondary),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _searchController,
                autofocus: true,
                style: AppTypography.body.copyWith(fontSize: 15),
                decoration: InputDecoration(
                  hintText: 'Cerca SKU, tipo, posizione...',
                  hintStyle: AppTypography.caption.copyWith(color: AppColors.textMuted),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                  isDense: true,
                ),
                onChanged: (value) {
                  setState(() => _searchQuery = value);
                },
              ),
            ),
            if (_searchQuery.isNotEmpty)
              GestureDetector(
                onTap: () {
                  _searchController.clear();
                  setState(() => _searchQuery = '');
                },
                child: const Icon(Icons.cancel, size: 18, color: AppColors.textSecondary),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLibrarySelector(List libraries) {
    return SizedBox(
      height: 50,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spacingScreenPadding,
          vertical: 6,
        ),
        children: [
          _buildLibraryChip(
            icon: Icons.apps,
            label: 'Tutti',
            isActive: _activeLibraryId == null,
            onTap: () => setState(() => _activeLibraryId = null),
          ),
          ...libraries.map((lib) => _buildLibraryChip(
                icon: _getLibraryIcon(lib.icon),
                label: lib.name,
                isActive: _activeLibraryId == lib.id,
                onTap: () => setState(() => _activeLibraryId = lib.id),
              )),
        ],
      ),
    );
  }

  Widget _buildLibraryChip({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: isActive ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            border: Border.all(
              color: isActive ? AppColors.primary : AppColors.border,
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 18,
                color: isActive ? Colors.black : AppColors.textSecondary,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: AppTypography.caption.copyWith(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isActive ? Colors.black : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsCards(int available, int sold, int alerts) {
    return SizedBox(
      height: 104,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spacingScreenPadding,
          vertical: 6,
        ),
        children: [
          _buildStatCard('DISPONIBILI', available.toString(), null),
          const SizedBox(width: 12),
          _buildStatCard('VENDUTI', sold.toString(), null),
          const SizedBox(width: 12),
          _buildStatCard(
            'RICHIEDONO ATTENZIONE',
            alerts.toString(),
            alerts > 0 ? AppColors.warning : null,
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color? borderColor) {
    return Container(
      constraints: const BoxConstraints(minWidth: 140),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        border: borderColor != null
            ? Border.all(color: borderColor, width: 1)
            : null,
        boxShadow: AppTheme.shadowCard,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                value,
                style: AppTypography.cardValue.copyWith(
                  fontSize: 28,
                  color: AppColors.primary,
                ),
              ),
              if (borderColor != null) ...[
                const SizedBox(width: 8),
                Icon(Icons.warning, size: 18, color: borderColor),
              ],
            ],
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTypography.heroLabel.copyWith(
              fontSize: 11,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips(List<(_FilterType, String, int)> filters) {
    return SizedBox(
      height: 50,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spacingScreenPadding,
          vertical: 4,
        ),
        children: filters.map((f) {
          final (type, label, count) = f;
          final isActive = _activeFilter == type;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _activeFilter = type),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: isActive ? AppColors.primary : AppColors.surface,
                  borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                  border: Border.all(
                    color: isActive ? AppColors.primary : AppColors.border,
                    width: 1.5,
                  ),
                ),
                child: Center(
                  child: Text(
                    '$label ($count)',
                    style: AppTypography.caption.copyWith(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isActive ? Colors.black : AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildProductCard(Product product, List<AlertModel> activeAlerts) {
    final hasAlert = activeAlerts.any((a) => a.productId == product.id);
    final isSelected = _selectedIds.contains(product.id);
    final isSelectionMode = _selectedIds.isNotEmpty;

    return GestureDetector(
      onTap: () => _handleProductTap(product),
      onLongPress: () => _handleProductLongPress(product),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.transparent,
            width: 2,
          ),
          boxShadow: AppTheme.shadowCard,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image area
            Stack(
              children: [
                Container(
                  height: 140,
                  width: double.infinity,
                  color: AppColors.backgroundSecondary,
                  child: product.images.isNotEmpty
                      ? _buildProductImage(product.images.first)
                      : _buildImagePlaceholder(),
                ),

                // Selection checkbox
                if (isSelectionMode)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isSelected
                            ? AppColors.primary
                            : Colors.black.withValues(alpha: 0.5),
                        border: Border.all(
                          color: isSelected ? AppColors.primary : Colors.white,
                          width: 1.5,
                        ),
                      ),
                      child: isSelected
                          ? const Icon(Icons.check, size: 14, color: Colors.black)
                          : null,
                    ),
                  ),

                // Status badges
                Positioned(
                  top: 8,
                  left: 8,
                  child: Row(
                    children: [
                      if (product.status == ProductStatusType.sold)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.textSecondary,
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          ),
                          child: const Text(
                            'VENDUTO',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Colors.black,
                            ),
                          ),
                        ),
                      if (hasAlert && product.status == ProductStatusType.available) ...[
                        if (product.status == ProductStatusType.sold) const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.warning,
                            borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.warning, size: 12, color: Colors.black),
                              SizedBox(width: 4),
                              Text(
                                'ALERT',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.black,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),

            // Product info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.sku,
                      style: AppTypography.cardTitle.copyWith(fontSize: 14),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      product.furType[0].toUpperCase() + product.furType.substring(1),
                      style: AppTypography.caption.copyWith(fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 14, color: AppColors.textSecondary),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            product.location.replaceAll('_', ' ').toUpperCase(),
                            style: AppTypography.caption.copyWith(fontSize: 11),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    if (product.sellPrice != null)
                      Text(
                        '€${product.sellPrice!.toStringAsFixed(0)}',
                        style: AppTypography.cardValue.copyWith(
                          fontSize: 16,
                          color: AppColors.primary,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductImage(String path) {
    return AppImage(
      path: path,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => _buildImagePlaceholder(),
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: AppColors.backgroundSecondary,
      child: const Center(
        child: Icon(
          Icons.image_outlined,
          size: 40,
          color: AppColors.textMuted,
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.inventory_2_outlined, size: 64, color: AppColors.textMuted),
          const SizedBox(height: 16),
          Text(
            'Nessun prodotto trovato',
            style: AppTypography.caption.copyWith(fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            'Aggiungi il tuo primo prodotto\ncon il tab "Aggiungi"',
            textAlign: TextAlign.center,
            style: AppTypography.caption.copyWith(
              fontSize: 14,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectionBar(List libraries) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1),
        ),
        boxShadow: AppTheme.shadowCardElevated,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              ),
              child: Text(
                '${_selectedIds.length}',
                style: AppTypography.cardTitle.copyWith(color: AppColors.primary),
              ),
            ),
            const Spacer(),
            // Move to folder
            GestureDetector(
              onTap: () => setState(() => _showActionModal = true),
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                ),
                child: const Icon(Icons.folder_open, size: 24, color: Colors.black),
              ),
            ),
            const SizedBox(width: 12),
            // Delete
            GestureDetector(
              onTap: _confirmDelete,
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                ),
                child: const Icon(Icons.delete, size: 24, color: Colors.white),
              ),
            ),
            const SizedBox(width: 12),
            // Close selection
            GestureDetector(
              onTap: _exitSelectionMode,
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                ),
                child: const Icon(Icons.close, size: 24, color: AppColors.textPrimary),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionModal(List libraries) {
    return GestureDetector(
      onTap: () => setState(() => _showActionModal = false),
      child: Container(
        color: Colors.black.withValues(alpha: 0.7),
        child: Center(
          child: GestureDetector(
            onTap: () {}, // Prevent tap-through
            child: Container(
              margin: const EdgeInsets.all(AppTheme.spacingScreenPadding),
              constraints: const BoxConstraints(maxHeight: 500),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                boxShadow: AppTheme.shadowCardElevated,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      'Gestisci ${_selectedIds.length} Prodotti',
                      style: AppTypography.cardTitle.copyWith(fontSize: 18),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'SPOSTA IN CARTELLA',
                        style: AppTypography.caption.copyWith(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Options
                  Flexible(
                    child: ListView(
                      shrinkWrap: true,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      children: [
                        _buildModalOption(
                          icon: Icons.folder_off,
                          iconColor: AppColors.textSecondary,
                          label: 'Rimuovi dalla cartella',
                          onTap: () => _handleMoveToLibrary(null),
                        ),
                        ...libraries.map((lib) => _buildModalOption(
                              icon: _getLibraryIcon(lib.icon),
                              iconColor: AppColors.primary,
                              label: lib.name,
                              onTap: () => _handleMoveToLibrary(lib.id),
                            )),
                      ],
                    ),
                  ),
                  // Cancel
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () => setState(() => _showActionModal = false),
                        child: const Text('Annulla'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildModalOption({
    required IconData icon,
    required Color iconColor,
    required String label,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.backgroundSecondary,
            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                ),
                child: Icon(icon, size: 20, color: iconColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(label, style: AppTypography.body),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- Event handlers ---

  void _handleProductTap(Product product) {
    if (_selectedIds.isNotEmpty) {
      _toggleSelection(product.id);
    } else {
      context.push('/product/${product.id}');
    }
  }

  void _handleProductLongPress(Product product) {
    if (_selectedIds.isEmpty) {
      setState(() => _selectedIds = [product.id]);
    } else {
      _toggleSelection(product.id);
    }
  }

  void _toggleSelection(String id) {
    setState(() {
      if (_selectedIds.contains(id)) {
        _selectedIds = _selectedIds.where((i) => i != id).toList();
      } else {
        _selectedIds = [..._selectedIds, id];
      }
    });
  }

  void _handleSelectAll() {
    final products = ref.read(inventoryProvider).products;
    setState(() {
      if (_selectedIds.length == products.length) {
        _selectedIds = [];
      } else {
        _selectedIds = products.map((p) => p.id).toList();
      }
    });
  }

  void _exitSelectionMode() {
    setState(() {
      _selectedIds = [];
      _showActionModal = false;
    });
  }

  void _handleMoveToLibrary(String? libraryId) {
    // TODO: Implement batch move when updateProduct supports libraryId update
    final messenger = ScaffoldMessenger.of(context);
    if (libraryId == null) {
      messenger.showSnackBar(
        SnackBar(content: Text('${_selectedIds.length} prodotti rimossi dalla cartella')),
      );
    } else {
      final libraries = ref.read(inventoryProvider).libraries;
      final libName = libraries.firstWhere((l) => l.id == libraryId).name;
      messenger.showSnackBar(
        SnackBar(content: Text('${_selectedIds.length} prodotti spostati in "$libName"')),
      );
    }
    _exitSelectionMode();
  }

  void _confirmDelete() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text(
          'Conferma Eliminazione',
          style: AppTypography.cardTitle,
        ),
        content: Text(
          'Vuoi spostare ${_selectedIds.length} prodotti nel cestino?',
          style: AppTypography.body,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Annulla'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              final notifier = ref.read(inventoryProvider.notifier);
              for (final id in _selectedIds) {
                notifier.softDeleteProduct(id);
              }
              _exitSelectionMode();
            },
            child: Text(
              'Elimina',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getLibraryIcon(String iconName) {
    switch (iconName) {
      case 'inventory':
      case 'inventory_2':
        return Icons.inventory_2;
      case 'folder':
        return Icons.folder;
      case 'star':
        return Icons.star;
      case 'favorite':
        return Icons.favorite;
      case 'label':
        return Icons.label;
      case 'category':
        return Icons.category;
      case 'style':
        return Icons.style;
      case 'shopping_bag':
        return Icons.shopping_bag;
      default:
        return Icons.folder;
    }
  }
}
