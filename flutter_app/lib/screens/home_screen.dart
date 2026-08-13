import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/theme.dart';
import '../constants/config.dart';
import '../models/models.dart';
import '../providers/inventory_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

enum FilterType { all, available, sold, alert, trash }

class _HomeScreenState extends State<HomeScreen> {
  FilterType _activeFilter = FilterType.all;
  String? _activeLibraryId;
  String _searchQuery = '';
  bool _isSearchVisible = false;
  List<String> _selectedIds = [];

  @override
  Widget build(BuildContext context) {
    final inventory = context.watch<InventoryProvider>();
    final activeAlerts = inventory.alerts.where((a) => !a.dismissed).toList();
    final folderFiltered = inventory.products.where((p) {
      if (_activeLibraryId == null) return true;
      return p.libraryId == _activeLibraryId;
    }).toList();
    final stats = _calculateStats(folderFiltered, activeAlerts);
    final filtered = _applyFilters(folderFiltered, activeAlerts);

    return SafeArea(
      top: true,
      child: Container(
        color: AppTheme.background,
        child: Column(
          children: [
            _buildHeader(filtered.length),
            if (_isSearchVisible) _buildSearchBar(),
            _buildLibraryChips(inventory.libraries),
            _buildStatsCards(stats),
            _buildFilterChips(stats),
            Expanded(
              child: Stack(
                children: [
                  _buildProductGrid(filtered, activeAlerts),
                  if (_selectedIds.isNotEmpty) _buildBottomActionBar(inventory),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Map<String, int> _calculateStats(List<Product> products, List<ProductAlert> alerts) => {
    'total': products.length,
    'available': products.where((p) => p.status == ProductStatus.available && p.deletedAt == null).length,
    'sold': products.where((p) => p.status == ProductStatus.sold && p.deletedAt == null).length,
    'alerts': alerts.where((a) => products.any((p) => p.id == a.productId)).length,
    'trash': products.where((p) => p.deletedAt != null).length,
  };

  List<Product> _applyFilters(List<Product> products, List<ProductAlert> alerts) {
    return products.where((p) {
      if (_activeFilter == FilterType.available && (p.status != ProductStatus.available || p.deletedAt != null)) return false;
      if (_activeFilter == FilterType.sold && (p.status != ProductStatus.sold || p.deletedAt != null)) return false;
      if (_activeFilter == FilterType.trash) return p.deletedAt != null;
      if (_activeFilter == FilterType.alert) return alerts.any((a) => a.productId == p.id);
      if (_activeFilter == FilterType.all && p.deletedAt != null) return false;
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        return p.sku.toLowerCase().contains(q) || p.furType.toLowerCase().contains(q) || p.location.toLowerCase().contains(q);
      }
      return true;
    }).toList();
  }

  Widget _buildHeader(int count) {
    final isSelectionMode = _selectedIds.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('FurInventory Pro', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            Text('$count prodotti', style: AppTypography.caption),
          ]),
          if (isSelectionMode)
            TextButton(
              onPressed: _handleSelectAll,
              child: Text(_selectedIds.length == count ? 'Deseleziona' : 'Seleziona Tutto',
                style: const TextStyle(color: AppTheme.primary, fontSize: 14, fontWeight: FontWeight.w600)),
            )
          else
            IconButton(
              icon: Icon(_isSearchVisible ? Icons.close : Icons.search, color: AppTheme.primary),
              onPressed: () => setState(() { _isSearchVisible = !_isSearchVisible; if (_isSearchVisible) _searchQuery = ''; }),
            ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() => Padding(
    padding: const EdgeInsets.only(left: AppTheme.screenPadding, right: AppTheme.screenPadding, bottom: 12),
    child: Container(
      height: 44,
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium), border: Border.all(color: AppTheme.border)),
      child: Row(children: [
        const SizedBox(width: 12),
        const Icon(Icons.search, size: 20, color: AppTheme.textSecondary),
        const SizedBox(width: 8),
        Expanded(child: TextField(
          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 15),
          decoration: const InputDecoration(hintText: 'Cerca SKU, tipo, posizione...', hintStyle: TextStyle(color: AppTheme.textSecondary), border: InputBorder.none),
          autofocus: true,
          onChanged: (v) => setState(() => _searchQuery = v),
        )),
        if (_searchQuery.isNotEmpty) IconButton(icon: const Icon(Icons.cancel, size: 18, color: AppTheme.textSecondary), onPressed: () => setState(() => _searchQuery = '')),
      ]),
    ),
  );

  Widget _buildLibraryChips(List<Library> libraries) => SizedBox(
    height: 50,
    child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding), children: [
      _libraryChip('Tutti', null, Icons.apps),
      ...libraries.map((lib) => _libraryChip(lib.name, lib.id, Icons.folder)),
    ]),
  );

  Widget _libraryChip(String name, String? id, IconData icon) {
    final isActive = _activeLibraryId == id;
    return GestureDetector(
      onTap: () => setState(() => _activeLibraryId = id),
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(color: isActive ? AppTheme.primary : AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: isActive ? AppTheme.primary : AppTheme.border)),
        child: Row(children: [
          Icon(icon, size: 18, color: isActive ? Colors.black : AppTheme.textSecondary),
          const SizedBox(width: 6),
          Text(name, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isActive ? Colors.black : AppTheme.textSecondary)),
        ]),
      ),
    );
  }

  Widget _buildStatsCards(Map<String, int> stats) => SizedBox(
    height: 100,
    child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding, vertical: 8), children: [
      _statCard(stats['available']!.toString(), 'DISPONIBILI'),
      const SizedBox(width: 12),
      _statCard(stats['sold']!.toString(), 'VENDUTI'),
      const SizedBox(width: 12),
      _statCardWithAlert(stats['alerts']!, 'RICHIEDONO ATTENZIONE'),
    ]),
  );

  Widget _statCard(String value, String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium), boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 8, offset: Offset(0, 2))]),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(value, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: AppTheme.primary)),
      Text(label, style: AppTypography.heroLabel),
    ]),
  );

  Widget _statCardWithAlert(int value, String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium), border: value > 0 ? Border.all(color: AppTheme.warning) : null, boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 8, offset: Offset(0, 2))]),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text(value.toString(), style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: AppTheme.primary)),
        if (value > 0) ...[const SizedBox(width: 8), const Icon(Icons.warning, size: 20, color: AppTheme.warning)],
      ]),
      Text(label, style: AppTypography.heroLabel),
    ]),
  );

  Widget _buildFilterChips(Map<String, int> stats) {
    final filters = [('Tutti', FilterType.all, stats['total']! - stats['trash']!), ('Disponibili', FilterType.available, stats['available']!), ('Venduti', FilterType.sold, stats['sold']!), ('Attenzione', FilterType.alert, stats['alerts']!), ('Cestino', FilterType.trash, stats['trash']!)];
    return SizedBox(
      height: 50,
      child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding, vertical: 8), children: filters.map((f) {
        final isActive = _activeFilter == f.$2;
        return GestureDetector(
          onTap: () => setState(() => _activeFilter = f.$2),
          child: Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(color: isActive ? AppTheme.primary : AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusFull), border: Border.all(color: isActive ? AppTheme.primary : AppTheme.border, width: 1.5)),
            child: Text('${f.$1} (${f.$3})', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: isActive ? Colors.black : AppTheme.textSecondary)),
          ),
        );
      }).toList()),
    );
  }

  Widget _buildProductGrid(List<Product> products, List<ProductAlert> alerts) {
    if (products.isEmpty) return const Center(child: Text('Nessun prodotto trovato', style: AppTypography.caption));
    return GridView.builder(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 0.68, crossAxisSpacing: 12, mainAxisSpacing: 12),
      itemCount: products.length,
      itemBuilder: (context, index) => _productCard(products[index], alerts),
    );
  }

  Widget _productCard(Product product, List<ProductAlert> alerts) {
    final hasAlert = alerts.any((a) => a.productId == product.id);
    final isSelected = _selectedIds.contains(product.id);
    final isSelectionMode = _selectedIds.isNotEmpty;
    return GestureDetector(
      onTap: () { if (isSelectionMode) _toggleSelection(product.id); },
      onLongPress: () { if (_selectedIds.isEmpty) { setState(() => _selectedIds = [product.id]); } else { _toggleSelection(product.id); } },
      child: Container(
        decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium), border: Border.all(color: isSelected ? AppTheme.primary : Colors.transparent, width: 2), boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 8, offset: Offset(0, 2))]),
        child: Stack(children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTheme.radiusMedium)),
              child: Image.network(product.images.isNotEmpty ? product.images.first : '', height: 160, width: double.infinity, fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(height: 160, color: AppTheme.backgroundSecondary, child: const Icon(Icons.image, color: AppTheme.textMuted, size: 40))),
            ),
            Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(product.sku, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary), maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              Text(_capitalize(FurTypes.labelFor(product.furType)), style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 6),
              Row(children: [const Icon(Icons.location_on, size: 14, color: AppTheme.textSecondary), const SizedBox(width: 4), Expanded(child: Text(Locations.labelFor(product.location).toUpperCase(), style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis))]),
              if (product.sellPrice != null) ...[const SizedBox(height: 6), Text('€${product.sellPrice!.toStringAsFixed(0)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.primary))],
            ])),
          ]),
          if (isSelectionMode) Positioned(top: 8, right: 8, child: Container(width: 24, height: 24, decoration: BoxDecoration(shape: BoxShape.circle, color: isSelected ? AppTheme.primary : Colors.black54, border: Border.all(color: isSelected ? AppTheme.primary : Colors.white, width: 1.5)), child: isSelected ? const Icon(Icons.check, size: 14, color: Colors.black) : null)),
          Positioned(top: 8, left: 8, child: Row(children: [
            if (product.status == ProductStatus.sold) _badge('VENDUTO', AppTheme.sold),
            if (hasAlert && product.status == ProductStatus.available) ...[const SizedBox(width: 4), _badge('ALERT', AppTheme.warning, icon: Icons.warning)],
          ])),
        ]),
      ),
    );
  }

  Widget _badge(String text, Color color, {IconData? icon}) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(AppTheme.radiusSmall)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      if (icon != null) Icon(icon, size: 12, color: Colors.black),
      if (icon != null) const SizedBox(width: 4),
      Text(text, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.black)),
    ]),
  );

  Widget _buildBottomActionBar(InventoryProvider inventory) => Positioned(
    bottom: 20, left: 16, right: 16,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border.all(color: AppTheme.border), boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 12, offset: Offset(0, 4))]),
      child: Row(children: [
        Text('${_selectedIds.length}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
        const Spacer(),
        GestureDetector(onTap: () => _showMoveModal(inventory), child: Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(AppTheme.radiusFull)), child: const Icon(Icons.folder_open, size: 24, color: Colors.black))),
        const SizedBox(width: 8),
        GestureDetector(onTap: () => _confirmDelete(inventory), child: Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), decoration: BoxDecoration(color: AppTheme.error, borderRadius: BorderRadius.circular(AppTheme.radiusFull)), child: const Icon(Icons.delete, size: 24, color: Colors.white))),
        const SizedBox(width: 8),
        GestureDetector(onTap: _exitSelectionMode, child: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppTheme.backgroundSecondary, borderRadius: BorderRadius.circular(AppTheme.radiusFull)), child: const Icon(Icons.close, size: 24, color: AppTheme.textPrimary))),
      ]),
    ),
  );

  void _showMoveModal(InventoryProvider inventory) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.background,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Gestisci ${_selectedIds.length} Prodotti', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            const SizedBox(height: 20),
            const Text('SPOSTA IN CARTELLA', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
            const SizedBox(height: 12),
            ListTile(leading: const Icon(Icons.folder_off, color: AppTheme.textSecondary), title: const Text('Rimuovi dalla cartella'), onTap: () { _handleMoveToLibrary(inventory, null); Navigator.pop(ctx); }),
            ...inventory.libraries.map((lib) => ListTile(leading: Icon(Icons.folder, color: AppTheme.primary), title: Text(lib.name), onTap: () { _handleMoveToLibrary(inventory, lib.id); Navigator.pop(ctx); })),
            const SizedBox(height: 8),
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annulla', style: TextStyle(fontWeight: FontWeight.w600))),
          ]),
        ),
      ),
    );
  }

  void _handleMoveToLibrary(InventoryProvider inventory, String? libraryId) {
    for (final id in _selectedIds) {
      inventory.updateProduct(id, {'libraryId': libraryId});
    }
    _exitSelectionMode();
  }

  void _toggleSelection(String id) => setState(() {
    if (_selectedIds.contains(id)) { _selectedIds = _selectedIds.where((e) => e != id).toList(); } else { _selectedIds = [..._selectedIds, id]; }
  });

  void _handleSelectAll() {
    final inventory = context.read<InventoryProvider>();
    final activeAlerts = inventory.alerts.where((a) => !a.dismissed).toList();
    final folderFiltered = inventory.products.where((p) => _activeLibraryId == null || p.libraryId == _activeLibraryId).toList();
    final filtered = _applyFilters(folderFiltered, activeAlerts);
    setState(() { _selectedIds = _selectedIds.length == filtered.length ? [] : filtered.map((p) => p.id).toList(); });
  }

  void _exitSelectionMode() => setState(() => _selectedIds = []);

  void _confirmDelete(InventoryProvider inventory) {
    showDialog(context: context, builder: (ctx) => AlertDialog(
      backgroundColor: AppTheme.surface,
      title: const Text('Conferma Eliminazione', style: TextStyle(color: AppTheme.textPrimary)),
      content: Text('Vuoi spostare ${_selectedIds.length} prodotti nel cestino?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annulla')),
        TextButton(onPressed: () { for (final id in _selectedIds) { inventory.deleteProduct(id); } _exitSelectionMode(); if (ctx.mounted) Navigator.pop(ctx); }, child: const Text('Elimina', style: TextStyle(color: AppTheme.error))),
      ],
    ));
  }

  String _capitalize(String s) => s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';
}
