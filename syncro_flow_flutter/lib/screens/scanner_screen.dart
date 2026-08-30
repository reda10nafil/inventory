import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../providers/inventory_provider.dart';
import '../providers/locations_provider.dart';
import '../providers/automations_provider.dart';
import '../services/barcode_decoder_service.dart';
import '../services/global_nfc_service.dart';
import '../services/nfc_foreground_dispatch.dart';
import '../services/nfc_service.dart';
import 'scanner_action_screen.dart';

class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> with WidgetsBindingObserver {
  late final MobileScannerController _controller;
  bool _isProcessingScan = false;
  bool _hasCameraError = false;
  String _cameraErrorMsg = '';
  final TextEditingController _manualInputController = TextEditingController();
  String? _lastScannedCode;
  DateTime? _lastScannedAt;

  Future<bool> _ensureCameraPermission() async {
    var status = await Permission.camera.status;
    if (status.isGranted) return true;
    if (status.isDenied) {
      status = await Permission.camera.request();
      if (status.isGranted) return true;
    }
    if (status.isPermanentlyDenied) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Permesso fotocamera negato permanentemente — aprilo nelle impostazioni')));
      }
      await openAppSettings();
    }
    return false;
  }

  Future<void> _startCameraSafe() async {
    final ok = await _ensureCameraPermission();
    if (!ok) {
      if (mounted) setState(() { _hasCameraError = true; _cameraErrorMsg = 'permission'; });
      return;
    }
    try {
      await _controller.start();
      if (mounted) setState(() { _hasCameraError = false; _cameraErrorMsg = ''; });
    } catch (e) {
      debugPrint('[Scanner] start error: $e');
      if (mounted) setState(() { _hasCameraError = true; _cameraErrorMsg = e.toString(); });
      await Future.delayed(const Duration(milliseconds: 800));
      if (!mounted) return;
      try {
        await _controller.start();
        if (mounted) setState(() { _hasCameraError = false; _cameraErrorMsg = ''; });
      } catch (e2) {
        if (mounted) setState(() { _hasCameraError = true; _cameraErrorMsg = e2.toString(); });
      }
    }
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = MobileScannerController(
      facing: CameraFacing.back,
      detectionSpeed: DetectionSpeed.normal,
      autoStart: false,
      torchEnabled: false,
      returnImage: false,
    );
    GlobalNfcService.pause();
    _startNfcListening();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await Future.delayed(const Duration(milliseconds: 300));
      if (!mounted) return;
      await _startCameraSafe();
    });
  }

  void _startNfcListening() async {
    final available = await NfcService().isNfcAvailable();
    if (available && mounted) {
      await NfcForegroundDispatch.enable();
      NfcService().startNfcSession((tagData) {
        if (!_isProcessingScan && mounted) {
          _handleScannedData(tagData, isNfc: true);
        }
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!mounted) return;
    switch (state) {
      case AppLifecycleState.resumed:
        _startCameraSafe();
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
        _controller.stop();
        break;
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        break;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    _manualInputController.dispose();
    NfcForegroundDispatch.disable();
    NfcService().stopNfcSession();
    GlobalNfcService.resume();
    super.dispose();
  }

  void _handleScannedData(String data, {bool isNfc = false}) async {
    if (_isProcessingScan) return;
    final trimmed = data.trim();
    if (_lastScannedCode == trimmed && _lastScannedAt != null && DateTime.now().difference(_lastScannedAt!).inMilliseconds < 1000) return;
    _lastScannedCode = trimmed;
    _lastScannedAt = DateTime.now();
    setState(() => _isProcessingScan = true);

    final inventory = ref.read(inventoryProvider);
    final locations = ref.read(locationsProvider);
    final automations = ref.read(automationsProvider);

    final cleanData = data.trim();
    final skuExtracted = _extractSku(cleanData);

    // 1. Check Products by SKU, Barcode, NFC Tag, or ID (gestisce syncroflow:// e GS1 URI)
    final product = inventory.products.where(
      (p) => p.deletedAt == null && (p.sku == cleanData || p.sku.toLowerCase() == skuExtracted.toLowerCase() || p.sku == skuExtracted || p.barcode == cleanData || p.nfcTag == cleanData || p.nfcTag == skuExtracted || p.gs1DigitalLink == cleanData || p.id == cleanData || p.id == skuExtracted),
    ).toList();

    final isActualProduct = product.isNotEmpty;

    if (isActualProduct) {
      if (mounted) {
        final pid = product.first.id;
        // Guard: mai navigare con id vuoto — già filtrato ma double-check
        if (pid.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Tag: $cleanData — nessun prodotto'), backgroundColor: AppColors.error));
          await Future.delayed(const Duration(seconds: 2));
          if (mounted) setState(() => _isProcessingScan = false);
          return;
        }
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ScannerActionScreen(
              type: 'product',
              entityId: pid,
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

    // 4. Code not recognized — guard nero: non usare firstWhere con fallback last product
    if (mounted) {
      debugPrint('[Scanner] no match for: $cleanData (skuExtracted: $skuExtracted)');
    }
    // 4. Check Automations (AUTO:...)
    if (cleanData.startsWith('AUTO:')) {
      final autoId = cleanData.replaceFirst('AUTO:', '');
      final automationExists = automations.any((a) => a.id == autoId || a.qrValue == cleanData);
      if (automationExists) {
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
    // Audio disabilitato fuori automazioni
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

  String _extractSku(String raw) {
    final t = raw.trim();
    // syncroflow://product/SKU-2026-001
    if (t.startsWith('syncroflow://')) {
      final uri = Uri.tryParse(t);
      if (uri != null && uri.pathSegments.isNotEmpty) return uri.pathSegments.last;
      return t.split('/').last;
    }
    // https://syncroflow.app/id/01/... o GS1
    if (t.startsWith('http')) {
      final m = RegExp(r'SKU-\d{4}-\d+').firstMatch(t);
      if (m != null) return m.group(0)!;
      final uri = Uri.tryParse(t);
      if (uri != null && uri.pathSegments.isNotEmpty) return uri.pathSegments.last;
    }
    return t;
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

  Future<void> _pickFromGallery() async {
    try {
      final picker = ImagePicker();
      final XFile? picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
      if (picked == null) return;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Decodifica immagine...'), duration: Duration(seconds: 1)),
      );
      final bytes = await picked.readAsBytes();
      final result = await BarcodeDecoderService.decodeBytes(bytes, filename: picked.name);
      if (!mounted) return;
      if (result.success && result.data != null && result.data!.isNotEmpty) {
        _handleScannedData(result.data!);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result.error ?? 'Nessun codice trovato'), backgroundColor: AppColors.error),
        );
        setState(() => _isProcessingScan = false);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Errore galleria: $e'), backgroundColor: AppColors.error),
        );
        setState(() => _isProcessingScan = false);
      }
    }
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
              try {
                final List<Barcode> barcodes = capture.barcodes;
                for (final barcode in barcodes) {
                  if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
                    _handleScannedData(barcode.rawValue!);
                    break;
                  }
                }
              } catch (e) {
                debugPrint('MobileScanner onDetect error: $e');
              }
            },
            errorBuilder: (context, error) {
              final msg = error.toString();
              final isPermissionDenied = msg.toLowerCase().contains('permission') || msg.contains('PERMISSION');
              final isGenericNull = msg.contains('t5.d') || msg.contains('null object reference') || msg.contains('genericError');
              // segna errore per nascondere overlay giallo che altrimenti copre Riprova
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted && !_hasCameraError) setState(() { _hasCameraError = true; _cameraErrorMsg = msg; });
              });
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(isPermissionDenied ? Icons.no_photography : Icons.error_outline, color: Colors.white, size: 48),
                      const SizedBox(height: 12),
                      Text(isPermissionDenied ? 'Permesso fotocamera negato' : isGenericNull ? 'Inizializzazione fotocamera...' : 'Errore fotocamera', style: AppTypography.titleMedium.copyWith(color: Colors.white)),
                      const SizedBox(height: 4),
                      Text(isPermissionDenied ? 'Abilita la fotocamera nelle impostazioni di sistema per usare lo scanner.' : isGenericNull ? 'Riprovo ad avviare la camera...' : msg, style: AppTypography.caption.copyWith(color: Colors.white70), textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      if (isPermissionDenied)
                        ElevatedButton.icon(
                          icon: const Icon(Icons.settings),
                          label: const Text('Apri impostazioni'),
                          onPressed: () async {
                            setState(() => _hasCameraError = false);
                            final ok = await _ensureCameraPermission();
                            if (!ok) return;
                            try { await _controller.stop(); } catch (_) {}
                            await Future.delayed(const Duration(milliseconds: 300));
                            await _startCameraSafe();
                          },
                        ),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.refresh),
                        label: const Text('Riprova'),
                        onPressed: () async {
                          setState(() => _hasCameraError = false);
                          try { await _controller.stop(); } catch (_) {}
                          await Future.delayed(const Duration(milliseconds: 300));
                          await _startCameraSafe();
                        },
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Chiudi', style: TextStyle(color: Colors.white70)),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

          // Custom Scanner Overlay Viewport — nascosto quando camera in errore (non copre Riprova)
          if (!_hasCameraError)
            Center(
              child: IgnorePointer(
                child: Container(
                  width: 280,
                  height: 280,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.accentGold, width: 3),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: const [
                      BoxShadow(color: Colors.black54, blurRadius: 20, spreadRadius: 5),
                    ],
                  ),
                  child: Stack(
                    children: [
                      Positioned(top: 12, left: 12, child: Container(width: 20, height: 20, decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.accentGold, width: 4), left: BorderSide(color: AppColors.accentGold, width: 4))))),
                      Positioned(top: 12, right: 12, child: Container(width: 20, height: 20, decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.accentGold, width: 4), right: BorderSide(color: AppColors.accentGold, width: 4))))),
                      Positioned(bottom: 12, left: 12, child: Container(width: 20, height: 20, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.accentGold, width: 4), left: BorderSide(color: AppColors.accentGold, width: 4))))),
                      Positioned(bottom: 12, right: 12, child: Container(width: 20, height: 20, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.accentGold, width: 4), right: BorderSide(color: AppColors.accentGold, width: 4))))),
                    ],
                  ),
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
                  ValueListenableBuilder<MobileScannerState>(
                    valueListenable: _controller,
                    builder: (context, state, _) {
                      final isOn = state.torchState == TorchState.on;
                      return IconButton(
                        icon: Icon(
                          isOn ? Icons.flash_on : Icons.flash_off,
                          color: isOn ? AppColors.accentGold : Colors.white,
                          size: 28,
                        ),
                        onPressed: () async {
                          try {
                            await _controller.toggleTorch();
                          } catch (_) {}
                        },
                      );
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
                    color: const Color(0xB3000000),
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
                      icon: const Icon(Icons.photo_library_rounded),
                      label: const Text('Galleria'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.surfaceElevated,
                        foregroundColor: AppColors.accentGold,
                      ),
                      onPressed: _pickFromGallery,
                    ),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.keyboard),
                      label: const Text('Manuale'),
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
