import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/product.dart';
import '../../providers/inventory_provider.dart';
import '../../services/sound_service.dart';
import '../../widgets/barcode_scanner_view.dart';

class CommonTagItem {
  final String label;
  final IconData icon;
  final Color color;

  const CommonTagItem({
    required this.label,
    required this.icon,
    required this.color,
  });
}

const List<CommonTagItem> commonTags = [
  CommonTagItem(label: 'Da Pulire', icon: Icons.cleaning_services, color: Color(0xFF3B82F6)),
  CommonTagItem(label: 'Riparare', icon: Icons.build, color: Color(0xFFF59E0B)),
  CommonTagItem(label: 'Riservato', icon: Icons.lock, color: Color(0xFFEF4444)),
  CommonTagItem(label: 'Vetrina', icon: Icons.star, color: Color(0xFFD4AF37)),
];

class QuickTagScreen extends ConsumerStatefulWidget {
  const QuickTagScreen({super.key});

  @override
  ConsumerState<QuickTagScreen> createState() => _QuickTagScreenState();
}

class _QuickTagScreenState extends ConsumerState<QuickTagScreen> {
  String _step = 'select_tag'; // 'select_tag' | 'scan_loop'
  String _activeTag = '';
  int _taggedCount = 0;
  String? _lastTaggedProduct;
  bool _showScanner = false;
  final TextEditingController _customTagController = TextEditingController();
  String? _feedbackMessage;
  bool _isFeedbackError = false;

  @override
  void dispose() {
    _customTagController.dispose();
    super.dispose();
  }

  void _showFeedback(String message, {bool isError = false}) {
    if (!mounted) return;
    setState(() {
      _feedbackMessage = message;
      _isFeedbackError = isError;
    });

    Future.delayed(Duration(milliseconds: isError ? 2000 : 1000), () {
      if (mounted && _feedbackMessage == message) {
        setState(() => _feedbackMessage = null);
      }
    });
  }

  void _handleStartTagging(String tag) {
    if (tag.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inserisci un tag valido.')),
      );
      return;
    }
    setState(() {
      _activeTag = tag.trim();
      _step = 'scan_loop';
    });
  }

  void _handleProductScan(String data) async {
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
      final currentNotes = product.technicalNotes ?? '';
      if (currentNotes.contains('[$_activeTag]')) {
        _showFeedback('${product.sku} già taggato');
        return;
      }

      final newNotes = currentNotes.isNotEmpty
          ? '$currentNotes\n[$_activeTag]'
          : '[$_activeTag]';

      await ref.read(inventoryProvider.notifier).updateProduct(
            product.id,
            product.copyWith(technicalNotes: newNotes),
          );

      setState(() {
        _taggedCount++;
        _lastTaggedProduct = product!.sku;
      });

      await SoundService.playSuccess(isAutomation: true);
      _showFeedback('${product.sku} Taggato!');
    } else {
      await SoundService.playBlockingError(isAutomation: true);
      _showFeedback('Non trovato: $data', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Tagging Rapido', style: TextStyle(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          _step == 'select_tag'
              ? SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Column(
                          children: [
                            const SizedBox(height: 12),
                            const Icon(Icons.label, size: 72, color: AppColors.info),
                            const SizedBox(height: 16),
                            Text('Scegli un Tag', style: AppTypography.headlineSmall.copyWith(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            Text(
                              'Seleziona un\'etichetta da applicare a tutti i prodotti che scannerizzerai.',
                              style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 28),
                          ],
                        ),
                      ),

                      Text('TAG COMUNI', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, letterSpacing: 1, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),

                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 1.4,
                        children: commonTags.map((tag) {
                          return InkWell(
                            onTap: () => _handleStartTagging(tag.label),
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: tag.color),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(tag.icon, color: tag.color, size: 32),
                                  const SizedBox(height: 8),
                                  Text(tag.label, style: TextStyle(color: tag.color, fontWeight: FontWeight.bold, fontSize: 15)),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),

                      const SizedBox(height: 28),
                      Text('O SCRIVI UN TAG PERSONALIZZATO', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, letterSpacing: 1, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _customTagController,
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                hintText: 'Es. Collezione 2024',
                                hintStyle: const TextStyle(color: AppColors.textSecondary),
                                filled: true,
                                fillColor: AppColors.surface,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(color: AppColors.border),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          IconButton.filled(
                            iconSize: 28,
                            style: IconButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              padding: const EdgeInsets.all(14),
                            ),
                            icon: const Icon(Icons.arrow_forward, color: Colors.black),
                            onPressed: () => _handleStartTagging(_customTagController.text),
                          ),
                        ],
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          children: [
                            Text('MODALITÀ TAGGING ATTIVA', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, letterSpacing: 1)),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.info,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.label, color: Colors.white, size: 20),
                                  const SizedBox(width: 8),
                                  Text(_activeTag, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text('$_taggedCount prodotti taggati', style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      if (_lastTaggedProduct != null) ...[
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
                                child: Text('Taggato: $_lastTaggedProduct', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      ElevatedButton.icon(
                        icon: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 28),
                        label: const Text('Scansiona Prodotto', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.info,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                        ),
                        onPressed: () => setState(() => _showScanner = true),
                      ),

                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => setState(() => _step = 'select_tag'),
                        child: const Text('Termina Sessione', style: TextStyle(color: AppColors.textSecondary, decoration: TextDecoration.underline)),
                      ),
                    ],
                  ),
                ),

          // Scanner Overlay
          if (_showScanner)
            Positioned.fill(
              child: BarcodeScannerView(
                instructions: 'Inquadra Prodotto da Taggare con "$_activeTag"',
                onScan: _handleProductScan,
                onClose: () => setState(() => _showScanner = false),
              ),
            ),

          // Feedback overlay
          if (_feedbackMessage != null)
            Positioned(
              bottom: 110,
              left: 32,
              right: 32,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: _isFeedbackError ? AppColors.error.withValues(alpha: 0.9) : Colors.black.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text(
                  _feedbackMessage!,
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
