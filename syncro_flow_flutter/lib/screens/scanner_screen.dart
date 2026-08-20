import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../providers/inventory_provider.dart';
import '../providers/locations_provider.dart';
import '../providers/automations_provider.dart';
import '../services/sound_service.dart';
import '../services/nfc_service.dart';
import 'scanner_action_screen.dart';

class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _isProcessingScan = false;
  bool _isTorchOn = false;
  final TextEditingController _manualInputController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _startNfcListening();
  }

  void _startNfcListening() async {
    final available = await NfcService().isNfcAvailable();
    if (available && mounted) {
      NfcService().startNfcSession((tagData) {
        if (!_isProcessingScan && mounted) {
          _handleScannedData(tagData, isNfc: true);
        }
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _manualInputController.dispose();
    NfcService().stopNfcSession();
    super.dispose();
  }

  void _handleScannedData(String data, {bool isNfc = false}) async {
    if (_isProcessingScan) return;
    setState(() => _isProcessingScan = true);

    final inventory = ref.read(inventoryProvider);
    final locations = ref.read(locationsProvider);
    final automations = ref.read(automationsProvider);

    final cleanData = data.trim();

    // 1. Check Products by SKU, Barcode, NFC Tag, or ID
    final product = inventory.products.firstWhere(
      (p) => p.sku == cleanData || p.barcode == cleanData || p.nfcTag == cleanData || p.id == cleanData,
      orElse: () => inventory.products.firstWhere(
        (p) => p.id == 'NOT_FOUND',
        orElse: () => inventory.products.isNotEmpty ? inventory.products.last : inventory.products.first,
      ),
    );

    final isActualProduct = inventory.products.any(
      (p) => p.sku == cleanData || p.barcode == cleanData || p.nfcTag == cleanData || p.id == cleanData,
    );

    if (isActualProduct) {
      if (product.isFragile == true) {
        await SoundService.playFragileBeep();
      } else {
        await SoundService.playSuccessBeep();
      }

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ScannerActionScreen(
              type: 'product',
              entityId: product.id,
            ),
          ),
        );
      }
      return;
    }

    // 2. Check Locations by Barcode or ID
    final location = locations.firstWhere(
      (l) => l.barcode == cleanData || l.id == cleanData,
      orElse: () => locations.first,
    );

    final isActualLocation = locations.any(
      (l) => l.barcode == cleanData || l.id == cleanData,
    );

    if (isActualLocation) {
      await SoundService.playSuccessBeep();
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ScannerActionScreen(
              type: 'location',
              entityId: location.id,
            ),
          ),
        );
      }
      return;
    }

    // 3. Check Folders/Libraries by ID
    final library = inventory.libraries.firstWhere(
      (lib) => lib.id == cleanData,
      orElse: () => inventory.libraries.isNotEmpty ? inventory.libraries.first : inventory.libraries.first,
    );

    final isActualLibrary = inventory.libraries.any(
      (lib) => lib.id == cleanData,
    );

    if (isActualLibrary) {
      await SoundService.playSuccessBeep();
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ScannerActionScreen(
              type: 'library',
              entityId: library.id,
            ),
          ),
        );
      }
      return;
    }

    // 4. Check Automations (AUTO:...)
    if (cleanData.startsWith('AUTO:')) {
      final autoId = cleanData.replaceFirst('AUTO:', '');
      final automationExists = automations.any((a) => a.id == autoId || a.qrValue == cleanData);
      if (automationExists) {
        await SoundService.playSuccessBeep();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Automazione $autoId identificata! Execution in corso...')),
          );
          Navigator.pop(context);
        }
        return;
      }
    }

    // 5. Code not recognized
    await SoundService.playBeep();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Codice non riconosciuto: $cleanData'),
          backgroundColor: AppColors.error,
          duration: const Duration(seconds: 2),
        ),
      );
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) setState(() => _isProcessingScan = false);
    }
  }

  void _showManualInputDialog() {
    _manualInputController.clear();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Inserisci Codice Manuale', style: AppTypography.titleLarge),
        content: TextField(
          controller: _manualInputController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Inserisci SKU, Barcode o ID...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annulla'),
          ),
          ElevatedButton(
            onPressed: () {
              final code = _manualInputController.text.trim();
              Navigator.pop(context);
              if (code.isNotEmpty) {
                _handleScannedData(code);
              }
            },
            child: const Text('Cerca'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Live Camera Feed
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
                  _handleScannedData(barcode.rawValue!);
                  break;
                }
              }
            },
          ),

          // Custom Scanner Overlay Viewport
          Center(
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.accentGold, width: 3),
                borderRadius: BorderRadius.circular(24),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black54,
                    blurRadius: 20,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(width: 20, height: 20, decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.accentGold, width: 4), left: BorderSide(color: AppColors.accentGold, width: 4)))),
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Container(width: 20, height: 20, decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.accentGold, width: 4), right: BorderSide(color: AppColors.accentGold, width: 4)))),
                  ),
                  Positioned(
                    bottom: 12,
                    left: 12,
                    child: Container(width: 20, height: 20, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.accentGold, width: 4), left: BorderSide(color: AppColors.accentGold, width: 4)))),
                  ),
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: Container(width: 20, height: 20, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.accentGold, width: 4), right: BorderSide(color: AppColors.accentGold, width: 4)))),
                  ),
                ],
              ),
            ),
          ),

          // Top Navigation Controls
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white, size: 28),
                    onPressed: () => Navigator.pop(context),
                  ),
                  Text('SCANNER MAGRO', style: AppTypography.titleMedium.copyWith(color: AppColors.accentGold)),
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

          // Bottom Control Overlay
          Positioned(
            bottom: 40,
            left: 24,
            right: 24,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black70,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.nfc, color: AppColors.accentGold, size: 20),
                      const SizedBox(width: 8),
                      Text('NFC & Barcode Attivi', style: AppTypography.bodySmall.copyWith(color: Colors.white)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    ElevatedButton.icon(
                      icon: const Icon(Icons.keyboard),
                      label: const Text('Inserimento Manuale'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.surfaceElevated,
                        foregroundColor: AppColors.accentGold,
                      ),
                      onPressed: _showManualInputDialog,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
