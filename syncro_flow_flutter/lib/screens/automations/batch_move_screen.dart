import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/location.dart';
import '../../providers/inventory_provider.dart';
import '../../providers/locations_provider.dart';
import '../../services/sound_service.dart';
import '../../widgets/barcode_scanner_view.dart';

class BatchMoveScreen extends ConsumerStatefulWidget {
  const BatchMoveScreen({super.key});

  @override
  ConsumerState<BatchMoveScreen> createState() => _BatchMoveScreenState();
}

class _BatchMoveScreenState extends ConsumerState<BatchMoveScreen> {
  String _step = 'scan_location'; // 'scan_location' | 'scan_products'
  Location? _targetLocation;
  int _scannedCount = 0;
  String? _lastScannedProduct;
  bool _showScanner = false;
  String? _feedbackMessage;
  bool _isFeedbackError = false;

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

  void _checkCapacityAndSetLocation(Location loc) {
    final inventory = ref.read(inventoryProvider);
    final currentItems = inventory.products.where((p) => (p.location == loc.id || p.location == loc.label) && p.deletedAt == null).length;
    final capacity = loc.capacity ?? 9999;

    if (currentItems >= capacity) {
      final locations = ref.read(locationsProvider);
      final nextLoc = locations.firstWhere((l) => l.id != loc.id, orElse: () => loc);

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Row(
            children: [
              Icon(Icons.warning, color: AppColors.warning),
              SizedBox(width: 8),
              Text('Posizione Piena!'),
            ],
          ),
          content: Text(
            'La posizione "${loc.label}" ha raggiunto la capacità ($currentItems/$capacity).\n\nVuoi usare invece "${nextLoc.label}"?',
            style: const TextStyle(color: Colors.white70),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _confirmLocation(loc);
              },
              child: Text('Usa ${loc.label} comunque', style: const TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () {
                Navigator.pop(ctx);
                _confirmLocation(nextLoc);
              },
              child: Text('Sì, usa ${nextLoc.label}', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    } else {
      _confirmLocation(loc);
    }
  }

  void _confirmLocation(Location loc) {
    setState(() {
      _targetLocation = loc;
      _step = 'scan_products';
      _showScanner = false;
    });
    SoundService.playSuccess(isAutomation: true);
  }

  void _handleLocationScan(String data) {
    final locations = ref.read(locationsProvider);
    final loc = locations.where((l) =>
        l.id == data ||
        l.label.toLowerCase() == data.toLowerCase() ||
        l.barcode == data);

    if (loc.isNotEmpty) {
      _checkCapacityAndSetLocation(loc.first);
    } else {
      SoundService.playBlockingError(isAutomation: true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Posizione non trovata.')),
      );
    }
  }

  void _handleProductScan(String data) async {
    final locations = ref.read(locationsProvider);
    final potentialLoc = locations.where((l) => l.id == data || l.barcode == data);

    if (potentialLoc.isNotEmpty) {
      final newLoc = potentialLoc.first;
      setState(() => _showScanner = false);

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Cambio Destinazione'),
          content: Text('Vuoi cambiare la destinazione a "${newLoc.label}"?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('No', style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () {
                Navigator.pop(ctx);
                _checkCapacityAndSetLocation(newLoc);
              },
              child: const Text('Sì', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
      return;
    }

    if (_targetLocation == null) return;

    final inventory = ref.read(inventoryProvider);
    final matched = inventory.products.where(
      (p) =>
          p.deletedAt == null &&
          (p.id == data ||
              p.sku.toLowerCase() == data.toLowerCase() ||
              p.barcode == data ||
              p.nfcTag == data),
    );

    if (matched.isNotEmpty) {
      final product = matched.first;
      // G4: confronta sia id che label per robustezza
      if (product.location == _targetLocation!.id || product.location == _targetLocation!.label) {
        _showFeedback('${product.sku} già qui!');
        return;
      }

      // Salviamo destinazione come label per compatibilità con inventario esistente
      await ref.read(inventoryProvider.notifier).moveProduct(product.id, _targetLocation!.id);
      setState(() {
        _scannedCount++;
        _lastScannedProduct = '${product.sku} (${product.furType})';
      });
      await SoundService.playSuccess(isAutomation: true);
      _showFeedback('${product.sku} Spostato!');
    } else {
      await SoundService.playBlockingError(isAutomation: true);
      _showFeedback('Non trovato: $data', isError: true);
    }
  }

  void _resetFlow() {
    setState(() {
      _step = 'scan_location';
      _targetLocation = null;
      _scannedCount = 0;
      _lastScannedProduct = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final locations = ref.watch(locationsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Spostamento Rapido', style: TextStyle(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: _step == 'scan_location'
                ? Column(
                    children: [
                      const SizedBox(height: 20),
                      const Icon(Icons.location_on, size: 72, color: AppColors.primary),
                      const SizedBox(height: 16),
                      Text('Fase 1: Scannerizza Posizione', style: AppTypography.headlineSmall.copyWith(fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                      const SizedBox(height: 8),
                      Text(
                        'Inquadra il QR della posizione o scaffale dove vuoi spostare la merce.',
                        style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 28),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.qr_code_scanner, color: Colors.black, size: 28),
                        label: const Text('Scansiona Posizione', style: TextStyle(color: Colors.black, fontSize: 18, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                        ),
                        onPressed: () => setState(() => _showScanner = true),
                      ),
                      const SizedBox(height: 36),
                      Text('OPPURE SELEZIONA', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, letterSpacing: 1)),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        alignment: WrapAlignment.center,
                        children: locations.map((loc) {
                          return ActionChip(
                            backgroundColor: AppColors.surface,
                            side: BorderSide(color: loc.color),
                            label: Text(loc.label, style: TextStyle(color: loc.color, fontWeight: FontWeight.w600)),
                            onPressed: () => _checkCapacityAndSetLocation(loc),
                          );
                        }).toList(),
                      ),
                    ],
                  )
                : Column(
                    children: [
                      // Target Card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          children: [
                            Text('Destinazione Attuale:', style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
                            const SizedBox(height: 4),
                            Text(_targetLocation?.label ?? '', style: AppTypography.headlineMedium.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: _resetFlow,
                              child: const Text('Cambia', style: TextStyle(color: AppColors.textSecondary, decoration: TextDecoration.underline)),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Stats circle
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.success, width: 4),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('$_scannedCount', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                            Text('Spostati', style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Last scanned product card
                      if (_lastScannedProduct != null) ...[
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
                                child: Text('Spostato: $_lastScannedProduct', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
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
                    ],
                  ),
          ),

          // Scanner Overlay
          if (_showScanner)
            Positioned.fill(
              child: BarcodeScannerView(
                instructions: _step == 'scan_location' ? 'Inquadra Posizione' : 'Inquadra Prodotto',
                onScan: (data) {
                  if (_step == 'scan_location') {
                    _handleLocationScan(data);
                  } else {
                    _handleProductScan(data);
                  }
                },
                onClose: () => setState(() => _showScanner = false),
              ),
            ),

          // Feedback message
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
