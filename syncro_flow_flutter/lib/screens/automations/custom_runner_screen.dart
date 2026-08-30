import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/automation.dart';
import '../../models/product.dart';
import '../../providers/automations_provider.dart';
import '../../providers/inventory_provider.dart';
import '../../providers/locations_provider.dart';
import '../../services/nfc_service.dart';
import '../../services/sound_service.dart';
import '../../widgets/barcode_scanner_view.dart';

class CustomRunnerScreen extends ConsumerStatefulWidget {
  final String automationId;

  const CustomRunnerScreen({
    super.key,
    required this.automationId,
  });

  @override
  ConsumerState<CustomRunnerScreen> createState() => _CustomRunnerScreenState();
}

class _CustomRunnerScreenState extends ConsumerState<CustomRunnerScreen> {
  int _currentStepIndex = 0;
  bool _showScanner = false;
  String? _feedbackMessage;
  bool _isFeedbackError = false;
  int _completedCount = 0;

  // Runtime context
  String? _scannedProductId;
  String? _scannedLocationId;

  // Sell modal
  bool _showPriceModal = false;
  final TextEditingController _priceInputController = TextEditingController();
  String? _pendingSellProductId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(automationsProvider.notifier).recordUsage(widget.automationId);
    });
  }

  @override
  void dispose() {
    _priceInputController.dispose();
    super.dispose();
  }

  void _showFeedback(String message, {bool isError = false}) {
    if (!mounted) return;
    setState(() {
      _feedbackMessage = message;
      _isFeedbackError = isError;
    });

    Future.delayed(Duration(milliseconds: isError ? 2200 : 1200), () {
      if (mounted && _feedbackMessage == message) {
        setState(() => _feedbackMessage = null);
      }
    });
  }

  IconData _getIconData(String name) {
    switch (name) {
      case 'qr-code-scanner':
      case 'qr_code_scanner':
        return Icons.qr_code_scanner;
      case 'location-on':
      case 'location_on':
        return Icons.location_on;
      case 'move-to-inbox':
      case 'move_to_inbox':
        return Icons.move_to_inbox;
      case 'shopping-cart-checkout':
      case 'shopping_cart_checkout':
        return Icons.shopping_cart_checkout;
      case 'label':
        return Icons.label;
      case 'edit':
        return Icons.edit;
      case 'nfc':
        return Icons.nfc;
      case 'auto_awesome':
        return Icons.auto_awesome;
      default:
        return Icons.bolt;
    }
  }

  void _handleScan(String data, CustomAutomation automation) async {
    final steps = automation.steps;
    if (_currentStepIndex >= steps.length) return;
    final currentStep = steps[_currentStepIndex];

    final inventory = ref.read(inventoryProvider);
    final locations = ref.read(locationsProvider);

    if (currentStep.type == StepType.scanProduct) {
      // Find product by id, sku, barcode, or nfcTag
      final matched = inventory.products.where((p) =>
          p.deletedAt == null &&
          (p.id == data ||
              p.sku.toLowerCase() == data.toLowerCase() ||
              p.barcode == data ||
              p.nfcTag == data));

      if (matched.isNotEmpty) {
        final product = matched.first;
        await SoundService.playSuccess(isAutomation: true);
        setState(() => _scannedProductId = product.id);
        _showFeedback('✅ ${product.sku}');

        Future.delayed(const Duration(milliseconds: 300), () {
          _advanceToNextScanStep(
            _currentStepIndex + 1,
            product.id,
            _scannedLocationId,
            automation,
          );
        });
      } else {
        await SoundService.playBlockingError(isAutomation: true);
        _showFeedback('❌ Non trovato: $data', isError: true);
      }
    } else if (currentStep.type == StepType.scanLocation) {
      final loc = locations.where((l) =>
          l.barcode == data ||
          l.id == data ||
          l.label.toLowerCase() == data.toLowerCase());

      if (loc.isNotEmpty) {
        final foundLoc = loc.first;
        await SoundService.playSuccess(isAutomation: true);
        setState(() {
          _scannedLocationId = foundLoc.id;
          _showScanner = false;
        });
        _showFeedback('📍 ${foundLoc.label}');

        Future.delayed(const Duration(milliseconds: 300), () {
          _advanceToNextScanStep(
            _currentStepIndex + 1,
            _scannedProductId,
            foundLoc.id,
            automation,
          );
        });
      } else {
        await SoundService.playBlockingError(isAutomation: true);
        _showFeedback('❌ Posizione non trovata', isError: true);
      }
    }
  }

  void _advanceToNextScanStep(
    int fromIndex,
    String? productId,
    String? locationId,
    CustomAutomation automation,
  ) async {
    final steps = automation.steps;
    int idx = fromIndex;
    String? tmpProductId = productId;
    String? tmpLocationId = locationId;

    while (idx < steps.length) {
      final step = steps[idx];
      if (step.type == StepType.scanProduct || step.type == StepType.scanLocation) {
        if (mounted) {
          setState(() => _currentStepIndex = idx);
        }
        return;
      }

      // Execute auto steps
      if (step.type == StepType.moveTo && tmpProductId != null) {
        final targetLoc = (step.config.useLastScannedLocation == true)
            ? tmpLocationId
            : step.config.locationId;
        if (targetLoc != null && targetLoc.isNotEmpty) {
          await ref.read(inventoryProvider.notifier).moveProduct(tmpProductId, targetLoc);
          _completedCount++;
        }
      } else if (step.type == StepType.addTag && tmpProductId != null) {
        final product = ref.read(inventoryProvider.notifier).getProductById(tmpProductId);
        if (product != null) {
          final tag = step.config.tag ?? 'Tagged';
          final notes = product.technicalNotes ?? '';
          if (!notes.contains('[$tag]')) {
            final newNotes = notes.isNotEmpty ? '$notes\n[$tag]' : '[$tag]';
            await ref.read(inventoryProvider.notifier).updateProduct(
              product.id,
              product.copyWith(technicalNotes: newNotes),
            );
          }
          _completedCount++;
        }
      } else if (step.type == StepType.setField && tmpProductId != null) {
        final product = ref.read(inventoryProvider.notifier).getProductById(tmpProductId);
        if (product != null) {
          final fieldName = step.config.fieldName ?? '';
          final fieldValue = step.config.fieldValue ?? '';
          final notes = product.technicalNotes ?? '';
          final entry = '[$fieldName=$fieldValue]';
          if (!notes.contains(entry)) {
            final newNotes = notes.isNotEmpty ? '$notes\n$entry' : entry;
            await ref.read(inventoryProvider.notifier).updateProduct(
              product.id,
              product.copyWith(technicalNotes: newNotes),
            );
          }
          _completedCount++;
        }
      } else if (step.type == StepType.markSold && tmpProductId != null) {
        if (step.config.pricePrompt == true) {
          final p = ref.read(inventoryProvider.notifier).getProductById(tmpProductId);
          _priceInputController.text = p?.sellPrice?.toString() ?? '';
          if (mounted) {
            setState(() {
              _currentStepIndex = idx;
              _pendingSellProductId = tmpProductId;
              _showPriceModal = true;
            });
          }
          return;
        } else {
          await ref.read(inventoryProvider.notifier).sellProduct(tmpProductId);
          _completedCount++;
        }
      } else if (step.type == StepType.writeNfc && tmpProductId != null) {
        final product = ref.read(inventoryProvider.notifier).getProductById(tmpProductId);
        if (product != null) {
          final raw = step.config.nfcData?.trim() ?? step.config.tag?.trim() ?? '';
          final payload = raw.isNotEmpty
              ? raw
              : (product.gs1DigitalLink?.isNotEmpty == true ? product.gs1DigitalLink! : product.sku);
          if (kIsWeb) {
            _showFeedback('NFC non disponibile su Web', isError: true);
            await SoundService.playBlockingError(isAutomation: true);
          } else {
            _showFeedback('Avvicina tag NFC per scrivere: $payload');
            final ok = await NfcService().writeNfcTag(payload);
            if (ok) {
              await ref.read(inventoryProvider.notifier).associateNfcTag(product.id, payload);
              await SoundService.playSuccess(isAutomation: true);
              _showFeedback('✅ NFC scritto: $payload');
              _completedCount++;
            } else {
              await SoundService.playBlockingError(isAutomation: true);
              _showFeedback('❌ Scrittura NFC fallita', isError: true);
              // Non blocchiamo il flusso: avanziamo comunque ma senza incrementare
            }
          }
        }
      }

      idx++;
    }

    // Check if loopback to last scanProduct
    final hasScanProduct = steps.any((s) => s.type == StepType.scanProduct);
    if (hasScanProduct) {
      int lastScanIdx = -1;
      for (int i = steps.length - 1; i >= 0; i--) {
        if (steps[i].type == StepType.scanProduct) {
          lastScanIdx = i;
          break;
        }
      }
      if (mounted && lastScanIdx != -1) {
        setState(() => _currentStepIndex = lastScanIdx);
        await SoundService.playSuccess(isAutomation: true);
        _showFeedback('✅ Fatto! Scansiona il prossimo...');
      }
    } else {
      if (mounted) {
        setState(() => _currentStepIndex = steps.length);
        await SoundService.playSuccess(isAutomation: true);
      }
    }
  }

  void _confirmSale(CustomAutomation automation) async {
    if (_pendingSellProductId == null) return;
    final price = double.tryParse(_priceInputController.text.trim());
    await ref.read(inventoryProvider.notifier).sellProduct(_pendingSellProductId!, price);
    await SoundService.playSuccess(isAutomation: true);
    _showFeedback('💰 Venduto! €${price ?? 0}');
    _completedCount++;

    final savedPendingId = _pendingSellProductId;
    setState(() {
      _showPriceModal = false;
      _pendingSellProductId = null;
    });

    Future.delayed(const Duration(milliseconds: 300), () {
      _advanceToNextScanStep(
        _currentStepIndex + 1,
        savedPendingId,
        _scannedLocationId,
        automation,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final automations = ref.watch(automationsProvider);
    final automation = automations.firstWhere(
      (a) => a.id == widget.automationId,
      orElse: () => CustomAutomation(
        id: widget.automationId,
        name: 'Workflow',
        icon: 'auto_awesome',
        color: '#D4AF37',
        description: '',
        qrValue: '',
        steps: [],
        createdAt: DateTime.now(),
      ),
    );

    final steps = automation.steps;
    final isComplete = _currentStepIndex >= steps.length;
    final currentStep = (!isComplete && steps.isNotEmpty) ? steps[_currentStepIndex] : null;
    final meta = currentStep != null ? stepTypeMetaMap[currentStep.type] : null;
    final autoColor = AppColors.fromHex(automation.color);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.close, color: AppColors.textPrimary),
                        onPressed: () => Navigator.pop(context),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              automation.name,
                              style: AppTypography.titleMedium.copyWith(color: AppColors.textPrimary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              '$_completedCount azioni completate',
                              style: AppTypography.caption.copyWith(color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: autoColor,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _getIconData(automation.icon),
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ],
                  ),
                ),

                // Progress dots bar
                if (steps.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: const BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: AppColors.border, width: 1),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(steps.length, (i) {
                        final isPast = i < _currentStepIndex;
                        final isCurrent = i == _currentStepIndex;
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: isCurrent ? 14 : 10,
                          height: isCurrent ? 14 : 10,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isPast
                                ? AppColors.success
                                : isCurrent
                                    ? autoColor
                                    : AppColors.border,
                          ),
                        );
                      }),
                    ),
                  ),

                // Body content
                Expanded(
                  child: isComplete || steps.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32.0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.check_circle, size: 80, color: AppColors.success),
                                const SizedBox(height: 20),
                                Text(
                                  'Automazione Completata!',
                                  style: AppTypography.headlineSmall.copyWith(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '$_completedCount azioni eseguite',
                                  style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
                                ),
                                const SizedBox(height: 32),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: autoColor,
                                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                                  ),
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text('Chiudi', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Step Card
                              Container(
                                padding: const EdgeInsets.all(28),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Column(
                                  children: [
                                    Container(
                                      width: 80,
                                      height: 80,
                                      decoration: BoxDecoration(
                                        color: meta != null ? AppColors.fromHex(meta.color).withValues(alpha: 0.2) : autoColor.withValues(alpha: 0.2),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        meta != null ? _getIconData(meta.icon) : Icons.bolt,
                                        size: 40,
                                        color: meta != null ? AppColors.fromHex(meta.color) : autoColor,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      currentStep!.label,
                                      style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Step ${_currentStepIndex + 1} di ${steps.length}',
                                      style: AppTypography.caption.copyWith(color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ),

                              const SizedBox(height: 24),

                              // Scan button if scan step
                              if (currentStep.type == StepType.scanProduct ||
                                  currentStep.type == StepType.scanLocation)
                                ElevatedButton.icon(
                                  icon: const Icon(Icons.qr_code_scanner, size: 28, color: Colors.white),
                                  label: Text(
                                    currentStep.type == StepType.scanProduct
                                        ? 'Scansiona Prodotto'
                                        : 'Scansiona Posizione',
                                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: meta != null ? AppColors.fromHex(meta.color) : autoColor,
                                    padding: const EdgeInsets.symmetric(vertical: 18),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                                  ),
                                  onPressed: () => setState(() => _showScanner = true),
                                ),

                              const SizedBox(height: 32),

                              // Mini Flow (Upcoming steps)
                              if (_currentStepIndex + 1 < steps.length) ...[
                                Text(
                                  'PROSSIMI STEP',
                                  style: AppTypography.labelSmall.copyWith(
                                    color: AppColors.textSecondary,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                ...steps.sublist(_currentStepIndex + 1, (_currentStepIndex + 4).clamp(0, steps.length)).map((s) {
                                  final sMeta = stepTypeMetaMap[s.type];
                                  final sColor = sMeta != null ? AppColors.fromHex(sMeta.color) : AppColors.accentGold;
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 8.0),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: BoxDecoration(shape: BoxShape.circle, color: sColor),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            s.label,
                                            style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                                if (steps.length - _currentStepIndex - 1 > 3)
                                  Text(
                                    '+${steps.length - _currentStepIndex - 4} altri...',
                                    style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                                  ),
                              ],
                            ],
                          ),
                        ),
                ),
              ],
            ),
          ),

          // Scanner Overlay
          if (_showScanner)
            Positioned.fill(
              child: BarcodeScannerView(
                instructions: currentStep?.type == StepType.scanProduct
                    ? 'Inquadra Prodotto (SKU, Barcode o NFC)'
                    : 'Inquadra Posizione (Barcode o QR)',
                onScan: (data) => _handleScan(data, automation),
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
                  color: _isFeedbackError
                      ? AppColors.error.withValues(alpha: 0.9)
                      : Colors.black.withValues(alpha: 0.85),
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

          // Sell Price Dialog
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
                        Text('Prezzo Vendita', style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold)),
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
                                onPressed: () => setState(() => _showPriceModal = false),
                                child: const Text('Annulla', style: TextStyle(color: AppColors.textSecondary)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: autoColor,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: () => _confirmSale(automation),
                                child: const Text('CONFERMA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
