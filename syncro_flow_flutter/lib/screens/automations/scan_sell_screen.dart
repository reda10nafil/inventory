import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/product.dart';
import '../../providers/inventory_provider.dart';
import '../../services/sound_service.dart';
import '../scanner_screen.dart';

class ScanSellScreen extends ConsumerStatefulWidget {
  const ScanSellScreen({super.key});

  @override
  ConsumerState<ScanSellScreen> createState() => _ScanSellScreenState();
}

class _ScanSellScreenState extends ConsumerState<ScanSellScreen> {
  final List<Product> _soldProducts = [];
  double _totalRevenue = 0.0;

  void _recordSale(Product product) {
    ref.read(inventoryProvider.notifier).sellProduct(product.id);
    setState(() {
      _soldProducts.add(product);
      _totalRevenue += product.sellPrice ?? 0.0;
    });
    SoundService.playSuccessBeep();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Scansiona & Vendi a Raffica', style: AppTypography.titleMedium),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.primary),
              ),
              child: Column(
                children: [
                  Text('TOTALE VENDITE SESSIONE', style: AppTypography.labelMedium.copyWith(color: AppColors.accentGold)),
                  const SizedBox(height: 8),
                  Text('€${_totalRevenue.toStringAsFixed(2)}', style: AppTypography.headlineMedium.copyWith(color: AppColors.accentGoldLight)),
                  const SizedBox(height: 4),
                  Text('Capi venduti: ${_soldProducts.length}', style: AppTypography.bodySmall),
                ],
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('Avvia Fotocamera Scanner'),
              style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const ScannerScreen()));
              },
            ),
            const SizedBox(height: 24),
            Text('CAPI REGISTRATI COME VENDUTI', style: AppTypography.titleSmall.copyWith(color: AppColors.accentGold)),
            const SizedBox(height: 12),
            Expanded(
              child: _soldProducts.isEmpty
                  ? const Center(child: Text('Nessuna vendita registrata nella sessione corrente.'))
                  : ListView.builder(
                      itemCount: _soldProducts.length,
                      itemBuilder: (context, index) {
                        final p = _soldProducts[index];
                        return Card(
                          color: AppColors.surface,
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: AppColors.success,
                              child: Icon(Icons.check, color: Colors.white),
                            ),
                            title: Text(p.furType.toUpperCase(), style: AppTypography.titleMedium),
                            subtitle: Text('SKU: ${p.sku}', style: AppTypography.bodySmall),
                            trailing: Text('€${p.sellPrice?.toStringAsFixed(2) ?? "0.00"}', style: AppTypography.titleSmall.copyWith(color: AppColors.accentGold)),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
