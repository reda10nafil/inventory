import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/product.dart';
import '../../providers/inventory_provider.dart';
import '../../services/sound_service.dart';

class TrashScreen extends ConsumerWidget {
  const TrashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inventory = ref.watch(inventoryProvider);
    final trashProducts = inventory.products.where((p) => p.deletedAt != null).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Cestino Prodotti', style: AppTypography.titleMedium),
        actions: [
          if (trashProducts.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_forever, color: AppColors.error),
              tooltip: 'Svuota Cestino',
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    backgroundColor: AppColors.surface,
                    title: Text('Svuota Cestino', style: AppTypography.titleLarge.copyWith(color: AppColors.error)),
                    content: Text(
                      'Sei sicuro di voler eliminare PERMANENTEMENTE tutti i ${trashProducts.length} prodotti nel cestino? Questa azione è irreversibile.',
                      style: AppTypography.bodyMedium,
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Annulla'),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                        onPressed: () {
                          ref.read(inventoryProvider.notifier).emptyTrash();
                          SoundService.playBeep();
                          Navigator.pop(context);
                        },
                        child: const Text('Svuota Tutto'),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
      body: trashProducts.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.delete_outline, size: 64, color: AppColors.textMuted),
                  const SizedBox(height: 16),
                  Text('Il cestino è vuoto', style: AppTypography.titleMedium.copyWith(color: AppColors.textSecondary)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: trashProducts.length,
              itemBuilder: (context, index) {
                final product = trashProducts[index];
                return Card(
                  color: AppColors.surface,
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(12),
                    leading: CircleAvatar(
                      backgroundColor: AppColors.surfaceElevated,
                      child: const Icon(Icons.inventory_2_outlined, color: AppColors.textSecondary),
                    ),
                    title: Text(product.furType.toUpperCase(), style: AppTypography.titleMedium),
                    subtitle: Text('SKU: ${product.sku}', style: AppTypography.bodySmall),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.restore_from_trash, color: AppColors.success),
                          tooltip: 'Ripristina',
                          onPressed: () {
                            ref.read(inventoryProvider.notifier).restoreProduct(product.id);
                            SoundService.playSuccessBeep();
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_forever, color: AppColors.error),
                          tooltip: 'Elimina Definitivamente',
                          onPressed: () {
                            ref.read(inventoryProvider.notifier).permanentlyDeleteProduct(product.id);
                            SoundService.playBeep();
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
