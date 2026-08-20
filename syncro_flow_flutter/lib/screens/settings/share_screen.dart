import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../providers/inventory_provider.dart';
import '../../services/sound_service.dart';

class ShareScreen extends ConsumerWidget {
  const ShareScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inventory = ref.watch(inventoryProvider);
    final availableProducts = inventory.products.where((p) => p.deletedAt == null).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Esporta & Condividi Catalogo', style: AppTypography.titleMedium),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Card(
            color: AppColors.surface,
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(
                backgroundColor: AppColors.primary,
                child: Icon(Icons.share, color: Colors.black),
              ),
              title: Text('Condividi Summary Catalogo', style: AppTypography.titleMedium),
              subtitle: Text(
                'Genera un report di testo di tutti i ${availableProducts.length} capi in magazzino per WhatsApp / Email',
                style: AppTypography.bodySmall,
              ),
              onTap: () {
                StringBuffer sb = StringBuffer();
                sb.writeln('📦 CATALOGO INVENTARIO SYNCRO FLOW');
                sb.writeln('Totale capi disponibili: ${availableProducts.length}');
                sb.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                for (final p in availableProducts) {
                  sb.writeln('• ${p.furType.toUpperCase()} (SKU: ${p.sku}) - €${p.sellPrice?.toStringAsFixed(2) ?? "N/D"}');
                }
                SoundService.playBeep();
                Share.share(sb.toString());
              },
            ),
          ),
          const SizedBox(height: 16),
          Card(
            color: AppColors.surface,
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(
                backgroundColor: AppColors.surfaceElevated,
                child: Icon(Icons.file_download_outlined, color: AppColors.accentGold),
              ),
              title: Text('Esporta Dati in JSON', style: AppTypography.titleMedium),
              subtitle: Text('Scarica backup completo di prodotti, posizioni e configurazioni', style: AppTypography.bodySmall),
              onTap: () {
                final jsonString = inventory.products.map((p) => p.toJson()).toList().toString();
                SoundService.playBeep();
                Share.share(jsonString, subject: 'SyncroFlow_Inventory_Backup.json');
              },
            ),
          ),
        ],
      ),
    );
  }
}
