import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/product.dart';
import '../models/location.dart';
import '../providers/inventory_provider.dart';
import '../providers/locations_provider.dart';
import '../services/sound_service.dart';
import 'product_detail_screen.dart';

class ScannerActionScreen extends ConsumerStatefulWidget {
  final String type; // 'product', 'location', 'library'
  final String entityId;

  const ScannerActionScreen({
    super.key,
    required this.type,
    required this.entityId,
  });

  @override
  ConsumerState<ScannerActionScreen> createState() => _ScannerActionScreenState();
}

class _ScannerActionScreenState extends ConsumerState<ScannerActionScreen> {
  String? _selectedLocationId;

  void _handleMove(Product product, List<Location> locations) {
    if (_selectedLocationId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seleziona prima una nuova posizione')),
      );
      return;
    }

    ref.read(inventoryProvider.notifier).moveProduct(product.id, _selectedLocationId!);
    SoundService.playBeep();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Prodotto ${product.sku} spostato con successo!')),
    );
    Navigator.pop(context);
  }

  void _handleSell(Product product) {
    ref.read(inventoryProvider.notifier).sellProduct(product.id);
    SoundService.playSuccessBeep();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Prodotto ${product.sku} registrato come VENDUTO!')),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final inventory = ref.watch(inventoryProvider);
    final locations = ref.watch(locationsProvider);

    if (widget.type == 'product') {
      final product = inventory.products.firstWhere(
        (p) => p.id == widget.entityId,
        orElse: () => Product(
          id: '',
          sku: 'N/A',
          furType: 'N/A',
          location: '',
          createdAt: DateTime.now(),
        ),
      );

      if (product.id.isEmpty) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(title: const Text('Non trovato')),
          body: const Center(child: Text('Prodotto non trovato')),
        );
      }

      final currentLocation = locations.firstWhere(
        (l) => l.id == product.location,
        orElse: () => Location(id: product.location, label: product.location),
      );

      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: Text('Azione Rapida: ${product.sku}', style: AppTypography.titleMedium),
          centerTitle: true,
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Product Preview Header Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: product.images.isNotEmpty && product.images.first.startsWith('assets/')
                          ? Image.asset(product.images.first, fit: BoxFit.cover)
                          : const Icon(Icons.inventory_2_outlined, size: 36, color: AppColors.accentGold),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(product.furType.toUpperCase(), style: AppTypography.titleLarge.copyWith(color: AppColors.accentGold)),
                          Text('SKU: ${product.sku}', style: AppTypography.bodySmall),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.location_on, size: 14, color: AppColors.accentGold),
                              const SizedBox(width: 4),
                              Text(currentLocation.label, style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),
              Text('SELEZIONA AZIONE', style: AppTypography.titleSmall.copyWith(color: AppColors.accentGold)),
              const SizedBox(height: 12),

              // Action 1: Move Location
              Card(
                color: AppColors.surface,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.swap_horiz, color: AppColors.accentGold),
                          const SizedBox(width: 8),
                          Text('Sposta in Posizione', style: AppTypography.titleMedium),
                        ],
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _selectedLocationId,
                        dropdownColor: AppColors.surfaceElevated,
                        decoration: const InputDecoration(
                          hintText: 'Seleziona Nuova Posizione',
                          border: OutlineInputBorder(),
                        ),
                        items: locations.map((loc) {
                          return DropdownMenuItem(
                            value: loc.id,
                            child: Text(loc.label),
                          );
                        }).toList(),
                        onChanged: (val) => setState(() => _selectedLocationId = val),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.check),
                        label: const Text('Conferma Spostamento'),
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                        ),
                        onPressed: () => _handleMove(product, locations),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Action 2: Sell Product
              Card(
                color: AppColors.surface,
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.success,
                    child: Icon(Icons.shopping_bag_outlined, color: Colors.white),
                  ),
                  title: Text('Registra Vendita', style: AppTypography.titleMedium),
                  subtitle: Text(
                    product.sellPrice != null ? 'Prezzo: €${product.sellPrice!.toStringAsFixed(2)}' : 'Segna come venduto',
                    style: AppTypography.bodySmall,
                  ),
                  trailing: const Icon(Icons.chevron_right, color: AppColors.accentGold),
                  onTap: () => _handleSell(product),
                ),
              ),

              const SizedBox(height: 16),

              // Action 3: View Full Details
              Card(
                color: AppColors.surface,
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.surfaceElevated,
                    child: Icon(Icons.info_outline, color: AppColors.accentGold),
                  ),
                  title: Text('Apri Scheda Dettaglio', style: AppTypography.titleMedium),
                  subtitle: Text('Visualizza misure, galleria foto e timeline completa', style: AppTypography.bodySmall),
                  trailing: const Icon(Icons.chevron_right, color: AppColors.accentGold),
                  onTap: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ProductDetailScreen(productId: product.id),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
    } else if (widget.type == 'location') {
      final location = locations.firstWhere(
        (l) => l.id == widget.entityId,
        orElse: () => Location(id: widget.entityId, label: widget.entityId),
      );

      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: Text('Posizione: ${location.label}')),
        body: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                color: AppColors.surface,
                child: ListTile(
                  leading: Icon(Icons.location_on, size: 36, color: location.color),
                  title: Text(location.label, style: AppTypography.titleLarge),
                  subtitle: Text('Capacità: ${location.capacity ?? "Illimitata"}'),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                icon: const Icon(Icons.fact_check),
                label: const Text('Esegui Audit / Inventario Posizione'),
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Avvio Audit Posizione...')),
                  );
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Scansione')),
      body: const Center(child: Text('Entità riconosciuta.')),
    );
  }
}
