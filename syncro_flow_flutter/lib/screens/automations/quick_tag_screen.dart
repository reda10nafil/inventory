import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/product.dart';
import '../../providers/inventory_provider.dart';
import '../../services/nfc_service.dart';
import '../../services/sound_service.dart';

class QuickTagScreen extends ConsumerStatefulWidget {
  const QuickTagScreen({super.key});

  @override
  ConsumerState<QuickTagScreen> createState() => _QuickTagScreenState();
}

class _QuickTagScreenState extends ConsumerState<QuickTagScreen> {
  Product? _selectedProduct;

  @override
  Widget build(BuildContext context) {
    final inventory = ref.watch(inventoryProvider);
    final availableProducts = inventory.products.where((p) => p.deletedAt == null).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Scrittura Rapida Tag NFC', style: AppTypography.titleMedium),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<Product>(
              value: _selectedProduct,
              dropdownColor: AppColors.surfaceElevated,
              decoration: const InputDecoration(
                labelText: 'Seleziona Capo da Associare',
                border: OutlineInputBorder(),
              ),
              items: availableProducts.map((p) {
                return DropdownMenuItem(
                  value: p,
                  child: Text('${p.furType.toUpperCase()} (${p.sku})'),
                );
              }).toList(),
              onChanged: (val) => setState(() => _selectedProduct = val),
            ),
            const SizedBox(height: 30),
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.primary),
              ),
              child: Column(
                children: [
                  const Icon(Icons.nfc, size: 80, color: AppColors.accentGold),
                  const SizedBox(height: 16),
                  Text('Scrittura Tag NFC Prossimità', style: AppTypography.titleLarge),
                  const SizedBox(height: 8),
                  Text(
                    _selectedProduct != null
                        ? 'Pronto a scrivere lo SKU ${_selectedProduct!.sku} sul tag NFC'
                        : 'Seleziona un capo dal menu a tendina sopra per iniziare',
                    textAlign: TextAlign.center,
                    style: AppTypography.bodySmall,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),
            ElevatedButton.icon(
              icon: const Icon(Icons.sensors),
              label: const Text('Avvia Scrittura NFC'),
              style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
              onPressed: () async {
                if (_selectedProduct == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Seleziona prima un capo')),
                  );
                  return;
                }

                final success = await NfcService().writeNfcTag(_selectedProduct!.id);
                if (mounted) {
                  if (success) {
                    ref.read(inventoryProvider.notifier).associateNfcTag(_selectedProduct!.id, _selectedProduct!.id);
                    SoundService.playSuccessBeep();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Tag NFC per ${_selectedProduct!.sku} scritto con successo!')),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Errore durante la scrittura NFC')),
                    );
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
