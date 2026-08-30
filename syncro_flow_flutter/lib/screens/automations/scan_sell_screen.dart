import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/product.dart';
import '../../providers/inventory_provider.dart';
import '../../services/sound_service.dart';
import '../../widgets/barcode_scanner_view.dart';

class ScanSellScreen extends ConsumerStatefulWidget {
  const ScanSellScreen({super.key});

  @override
  ConsumerState<ScanSellScreen> createState() => _ScanSellScreenState();
}

class _ScanSellScreenState extends ConsumerState<ScanSellScreen> {
  int _scannedCount = 0;
  double _totalRevenue = 0.0;
  String? _lastSoldProduct;
  bool _showScanner = false;
  bool _showPriceModal = false;
  Product? _pendingProduct;
  final TextEditingController _priceInputController = TextEditingController();

  @override
  void dispose() {
    _priceInputController.dispose();
    super.dispose();
  }

  void _handleProductScan(String data) {
    final inventory = ref.read(inventoryProvider);
    Product? product;
    try {
      product = inventory.products.firstWhere(
        (p) =>
            p.deletedAt == null &&
            (p.id == data ||
                p.sku.toLowerCase() == data.toLowerCase() ||
                p.barcode == data ||
                p.nfcTag == data),
      );
    } catch (_) {
      product = null;
    }

    if (product != null) {
      setState(() => _showScanner = false);

      if (product.status == ProductStatusType.sold) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Questo prodotto risulta già venduto.')),
        );
        return;
      }

      setState(() {
        _pendingProduct = product;
        _priceInputController.text = product!.sellPrice != null ? product.sellPrice.toString() : '';
        _showPriceModal = true;
      });
    } else {
      SoundService.playBlockingError(isAutomation: true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Prodotto non trovato: $data'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _confirmSale() async {
    if (_pendingProduct == null) return;

    final price = double.tryParse(_priceInputController.text.trim());
    await ref.read(inventoryProvider.notifier).sellProduct(_pendingProduct!.id, price);

    setState(() {
      _scannedCount++;
      _totalRevenue += (price ?? 0.0);
      _lastSoldProduct = '${_pendingProduct!.sku} - €${price ?? 0.0}';
      _showPriceModal = false;
      _pendingProduct = null;
      _priceInputController.clear();
    });

    await SoundService.playSuccess(isAutomation: true);

    // Auto-reopen scanner for next sale
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) {
        setState(() => _showScanner = true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Vendita Flash', style: TextStyle(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const SizedBox(height: 12),
                // Stats row
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.success),
                        ),
                        child: Column(
                          children: [
                            Text('$_scannedCount', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.success)),
                            const SizedBox(height: 4),
                            Text('Capi Venduti', style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
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
                          border: Border.all(color: AppColors.accentGold),
                        ),
                        child: Column(
                          children: [
                            Text(
                              '€ ${_totalRevenue.toStringAsFixed(0)}',
                              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.accentGold),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text('Totale', style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                if (_lastSoldProduct != null) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF064E3B),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: AppColors.success),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text('Venduto: $_lastSoldProduct', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                const SizedBox(height: 12),
                const Icon(Icons.shopping_cart_checkout, size: 72, color: AppColors.success),
                const SizedBox(height: 16),
                Text(
                  'Scansiona i prodotti in uscita per segnarli come VENDUTI e registrare il prezzo finale.',
                  style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 32),

                ElevatedButton.icon(
                  icon: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 28),
                  label: const Text('Scansiona Prodotto', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                  ),
                  onPressed: () => setState(() => _showScanner = true),
                ),
              ],
            ),
          ),

          // Scanner Overlay
          if (_showScanner)
            Positioned.fill(
              child: BarcodeScannerView(
                instructions: 'Inquadra Prodotto da Vendere',
                onScan: _handleProductScan,
                onClose: () => setState(() => _showScanner = false),
              ),
            ),

          // Price Modal
          if (_showPriceModal)
            Container(
              color: Colors.black.withValues(alpha: 0.7),
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Conferma Vendita', style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        if (_pendingProduct != null) ...[
                          Text(_pendingProduct!.sku, style: AppTypography.headlineSmall.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)),
                          Text(_pendingProduct!.furType, style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
                        ],
                        const SizedBox(height: 20),
                        TextField(
                          controller: _priceInputController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                          decoration: InputDecoration(
                            hintText: '0.00',
                            prefixText: '€ ',
                            prefixStyle: const TextStyle(fontSize: 26, color: AppColors.accentGold),
                            filled: true,
                            fillColor: AppColors.backgroundSecondary,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          autofocus: true,
                        ),
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Expanded(
                              child: TextButton(
                                onPressed: () => setState(() {
                                  _showPriceModal = false;
                                  _pendingProduct = null;
                                }),
                                child: const Text('Annulla', style: TextStyle(color: AppColors.textSecondary)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.success,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: _confirmSale,
                                child: const Text('CONFERMA VENDITA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
