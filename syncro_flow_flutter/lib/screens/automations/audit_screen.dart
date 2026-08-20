import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/product.dart';
import '../../models/location.dart';
import '../../providers/inventory_provider.dart';
import '../../providers/locations_provider.dart';
import '../../services/sound_service.dart';
import '../scanner_screen.dart';

class AuditScreen extends ConsumerStatefulWidget {
  const AuditScreen({super.key});

  @override
  ConsumerState<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends ConsumerState<AuditScreen> {
  Location? _selectedLocation;
  final Set<String> _scannedProductIds = {};

  @override
  Widget build(BuildContext context) {
    final locations = ref.watch(locationsProvider);
    final inventory = ref.watch(inventoryProvider);

    final expectedProducts = _selectedLocation == null
        ? <Product>[]
        : inventory.products
            .where((p) => p.location == _selectedLocation!.id && p.deletedAt == null)
            .toList();

    final foundCount = _scannedProductIds.length;
    final totalExpected = expectedProducts.length;
    final missingCount = (totalExpected - foundCount).clamp(0, totalExpected);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Audit & Inventario Posizione', style: AppTypography.titleMedium),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Location Selector Dropdown
            DropdownButtonFormField<Location>(
              value: _selectedLocation,
              dropdownColor: AppColors.surfaceElevated,
              decoration: const InputDecoration(
                labelText: 'Seleziona Posizione da Verificare',
                border: OutlineInputBorder(),
              ),
              items: locations.map((loc) {
                return DropdownMenuItem(
                  value: loc,
                  child: Row(
                    children: [
                      Icon(Icons.location_on, color: loc.color, size: 20),
                      const SizedBox(width: 8),
                      Text(loc.label),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (val) {
                setState(() {
                  _selectedLocation = val;
                  _scannedProductIds.clear();
                });
              },
            ),

            const SizedBox(height: 20),

            // Audit Counter Stats Grid
            if (_selectedLocation != null) ...[
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Text('Riconosciuti', style: AppTypography.labelSmall.copyWith(color: AppColors.success)),
                          const SizedBox(height: 4),
                          Text('$foundCount / $totalExpected', style: AppTypography.headlineMedium.copyWith(color: AppColors.success)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Text('Mancanti', style: AppTypography.labelSmall.copyWith(color: AppColors.error)),
                          const SizedBox(height: 4),
                          Text('$missingCount', style: AppTypography.headlineMedium.copyWith(color: AppColors.error)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Avvia Scansione Capi'),
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
                onPressed: () async {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const ScannerScreen()));
                },
              ),
              const SizedBox(height: 20),
              Text('ELENCO CAPI ATTESI', style: AppTypography.titleSmall.copyWith(color: AppColors.accentGold)),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.builder(
                  itemCount: expectedProducts.length,
                  itemBuilder: (context, index) {
                    final product = expectedProducts[index];
                    final isFound = _scannedProductIds.contains(product.id);

                    return Card(
                      color: AppColors.surface,
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: Icon(
                          isFound ? Icons.check_circle : Icons.radio_button_unchecked,
                          color: isFound ? AppColors.success : AppColors.textMuted,
                        ),
                        title: Text(product.furType.toUpperCase(), style: AppTypography.titleMedium),
                        subtitle: Text('SKU: ${product.sku}', style: AppTypography.bodySmall),
                        trailing: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isFound ? AppColors.surfaceElevated : AppColors.primary,
                          ),
                          onPressed: () {
                            setState(() {
                              if (isFound) {
                                _scannedProductIds.remove(product.id);
                              } else {
                                _scannedProductIds.add(product.id);
                              }
                            });
                            SoundService.playBeep();
                          },
                          child: Text(isFound ? 'Segna Mancante' : 'Segna Trovato'),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ] else
              const Expanded(
                child: Center(
                  child: Text('Seleziona una posizione per iniziare l\'audit inventario.'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
