import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/location.dart';
import '../../providers/inventory_provider.dart';
import '../../providers/locations_provider.dart';
import '../../services/sound_service.dart';

class BatchMoveScreen extends ConsumerStatefulWidget {
  const BatchMoveScreen({super.key});

  @override
  ConsumerState<BatchMoveScreen> createState() => _BatchMoveScreenState();
}

class _BatchMoveScreenState extends ConsumerState<BatchMoveScreen> {
  Location? _targetLocation;
  final Set<String> _selectedProductIds = {};

  @override
  Widget build(BuildContext context) {
    final locations = ref.watch(locationsProvider);
    final inventory = ref.watch(inventoryProvider);
    final availableProducts = inventory.products.where((p) => p.deletedAt == null).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Spostamento di Massa Capi', style: AppTypography.titleMedium),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<Location>(
              value: _targetLocation,
              dropdownColor: AppColors.surfaceElevated,
              decoration: const InputDecoration(
                labelText: 'Seleziona Nuova Posizione per i Capi',
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
              onChanged: (val) => setState(() => _targetLocation = val),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('SELEZIONA CAPI (${_selectedProductIds.length})', style: AppTypography.titleSmall.copyWith(color: AppColors.accentGold)),
                TextButton(
                  onPressed: () {
                    setState(() {
                      if (_selectedProductIds.length == availableProducts.length) {
                        _selectedProductIds.clear();
                      } else {
                        _selectedProductIds.addAll(availableProducts.map((p) => p.id));
                      }
                    });
                  },
                  child: Text(_selectedProductIds.length == availableProducts.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'),
                ),
              ],
            ),
            Expanded(
              child: ListView.builder(
                itemCount: availableProducts.length,
                itemBuilder: (context, index) {
                  final product = availableProducts[index];
                  final isSelected = _selectedProductIds.contains(product.id);

                  return Card(
                    color: AppColors.surface,
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Checkbox(
                        value: isSelected,
                        activeColor: AppColors.accentGold,
                        onChanged: (val) {
                          setState(() {
                            if (val == true) {
                              _selectedProductIds.add(product.id);
                            } else {
                              _selectedProductIds.remove(product.id);
                            }
                          });
                        },
                      ),
                      title: Text(product.furType.toUpperCase(), style: AppTypography.titleMedium),
                      subtitle: Text('SKU: ${product.sku} | Posizione attuale: ${product.location}', style: AppTypography.bodySmall),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              icon: const Icon(Icons.swap_horiz),
              label: Text('Sposta ${_selectedProductIds.length} Capi in Target'),
              style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
              onPressed: () {
                if (_targetLocation == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Seleziona la posizione di destinazione')),
                  );
                  return;
                }
                if (_selectedProductIds.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Seleziona almeno un capo da spostare')),
                  );
                  return;
                }

                final notifier = ref.read(inventoryProvider.notifier);
                for (final pId in _selectedProductIds) {
                  notifier.moveProduct(pId, _targetLocation!.id);
                }

                SoundService.playSuccessBeep();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('${_selectedProductIds.length} capi spostati in ${_targetLocation!.label}!')),
                );
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }
}
