import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../services/nfc_service.dart';

class BarcodeScannerView extends StatefulWidget {
  final void Function(String data) onScan;
  final VoidCallback onClose;
  final Duration delay;
  final String? instructions;

  const BarcodeScannerView({
    super.key,
    required this.onScan,
    required this.onClose,
    this.delay = const Duration(milliseconds: 600),
    this.instructions,
  });

  @override
  State<BarcodeScannerView> createState() => _BarcodeScannerViewState();
}

class _BarcodeScannerViewState extends State<BarcodeScannerView> {
  final MobileScannerController _controller = MobileScannerController();
  final TextEditingController _manualController = TextEditingController();
  bool _isProcessing = false;
  bool _isTorchOn = false;

  @override
  void initState() {
    super.initState();
    _startNfcListening();
  }

  void _startNfcListening() async {
    final available = await NfcService().isNfcAvailable();
    if (available && mounted) {
      NfcService().startNfcSession((tagData) {
        if (!_isProcessing && mounted) {
          _handleScannedData(tagData);
        }
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _manualController.dispose();
    NfcService().stopNfcSession();
    super.dispose();
  }

  void _handleScannedData(String rawData) {
    final data = rawData.trim();
    if (data.isEmpty || _isProcessing) return;

    setState(() => _isProcessing = true);
    widget.onScan(data);

    Future.delayed(widget.delay, () {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    });
  }

  void _showManualInputDialog() {
    _manualController.clear();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Inserisci Codice Manuale', style: AppTypography.titleLarge),
        content: TextField(
          controller: _manualController,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'SKU, Barcode o ID...',
            hintStyle: TextStyle(color: AppColors.textSecondary),
            filled: true,
            fillColor: AppColors.backgroundSecondary,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annulla', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              final code = _manualController.text.trim();
              Navigator.pop(ctx);
              if (code.isNotEmpty) {
                _handleScannedData(code);
              }
            },
            child: const Text('Conferma', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Camera feed — con errorBuilder così Riprova non è coperto dal giallo
        MobileScanner(
          controller: _controller,
          onDetect: (capture) {
            final barcodes = capture.barcodes;
            for (final barcode in barcodes) {
              if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
                _handleScannedData(barcode.rawValue!);
                break;
              }
            }
          },
          errorBuilder: (context, error) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.no_photography, color: Colors.white, size: 48),
                const SizedBox(height: 12),
                Text('Fotocamera non disponibile', style: AppTypography.titleMedium.copyWith(color: Colors.white)),
                const SizedBox(height: 4),
                Text(error.toString(), style: AppTypography.caption.copyWith(color: Colors.white70), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton.icon(icon: const Icon(Icons.refresh), label: const Text('Riprova'), onPressed: () async { try { await _controller.stop(); } catch (_) {} await Future.delayed(const Duration(milliseconds: 400)); try { await _controller.start(); } catch (_) {} if (context.mounted) (context as Element).markNeedsBuild(); }),
                const SizedBox(height: 8),
                TextButton(onPressed: widget.onClose, child: const Text('Chiudi', style: TextStyle(color: Colors.white70))),
              ]),
            ),
          ),
        ),

        // Dark focus viewport overlay — IgnorePointer così non copre Riprova in caso di errore
        Positioned.fill(
          child: IgnorePointer(
            child: Column(
              children: [
                Expanded(child: Container(color: Colors.black.withValues(alpha: 0.55))),
                Row(
                  children: [
                    Expanded(child: Container(color: Colors.black.withValues(alpha: 0.55), height: 260)),
                    Container(
                      width: 260,
                      height: 260,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.accentGold, width: 2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                    child: Stack(
                      children: [
                        Positioned(
                          top: 8,
                          left: 8,
                          child: Container(
                            width: 24,
                            height: 24,
                            decoration: const BoxDecoration(
                              border: Border(
                                top: BorderSide(color: AppColors.accentGold, width: 4),
                                left: BorderSide(color: AppColors.accentGold, width: 4),
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            width: 24,
                            height: 24,
                            decoration: const BoxDecoration(
                              border: Border(
                                top: BorderSide(color: AppColors.accentGold, width: 4),
                                right: BorderSide(color: AppColors.accentGold, width: 4),
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 8,
                          left: 8,
                          child: Container(
                            width: 24,
                            height: 24,
                            decoration: const BoxDecoration(
                              border: Border(
                                bottom: BorderSide(color: AppColors.accentGold, width: 4),
                                left: BorderSide(color: AppColors.accentGold, width: 4),
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 8,
                          right: 8,
                          child: Container(
                            width: 24,
                            height: 24,
                            decoration: const BoxDecoration(
                              border: Border(
                                bottom: BorderSide(color: AppColors.accentGold, width: 4),
                                right: BorderSide(color: AppColors.accentGold, width: 4),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(child: Container(color: Colors.black.withValues(alpha: 0.55), height: 260)),
                ],
              ),
              Expanded(child: Container(color: Colors.black.withValues(alpha: 0.55))),
            ],
          ),
          ),
        ),

        // Top bar
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 28),
                  onPressed: widget.onClose,
                ),
                Text(
                  widget.instructions ?? 'Inquadra Barcode / QR / NFC',
                  style: AppTypography.bodySmall.copyWith(
                    color: Colors.white,
                    backgroundColor: Colors.black54,
                  ),
                ),
                IconButton(
                  icon: Icon(
                    _isTorchOn ? Icons.flash_on : Icons.flash_off,
                    color: _isTorchOn ? AppColors.accentGold : Colors.white,
                    size: 28,
                  ),
                  onPressed: () {
                    _controller.toggleTorch();
                    setState(() => _isTorchOn = !_isTorchOn);
                  },
                ),
              ],
            ),
          ),
        ),

        // Bottom controls
        Positioned(
          bottom: 36,
          left: 24,
          right: 24,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton.icon(
                icon: const Icon(Icons.keyboard, color: Colors.black),
                label: const Text('Inserimento Manuale', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentGold,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
                onPressed: _showManualInputDialog,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
