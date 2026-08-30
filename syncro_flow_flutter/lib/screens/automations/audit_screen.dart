import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/product.dart';
import '../../models/location.dart';
import '../../providers/inventory_provider.dart';
import '../../providers/locations_provider.dart';
import '../../services/sound_service.dart';
import '../../widgets/barcode_scanner_view.dart';

enum AuditStatus { missing, found, intruder }

class AuditItem {
  final String id;
  final String sku;
  final String furType;
  AuditStatus status;

  AuditItem({
    required this.id,
    required this.sku,
    required this.furType,
    this.status = AuditStatus.missing,
  });
}

class AuditScreen extends ConsumerStatefulWidget {
  const AuditScreen({super.key});

  @override
  ConsumerState<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends ConsumerState<AuditScreen> {
  String _step = 'scan_location'; // 'scan_location' | 'audit_loop'
  Location? _targetLocation;
  List<AuditItem> _auditItems = [];
  bool _showScanner = false;
  String? _feedbackMessage;

  int get _foundCount => _auditItems.where((i) => i.status == AuditStatus.found).length;
  int get _missingCount => _auditItems.where((i) => i.status == AuditStatus.missing).length;
  int get _intruderCount => _auditItems.where((i) => i.status == AuditStatus.intruder).length;
  int get _totalExpected => _auditItems.where((i) => i.status != AuditStatus.intruder).length;

  void _startAudit(Location loc) {
    final inventory = ref.read(inventoryProvider);
    // G4 real: location può essere salvata come id o label — confrontiamo entrambi
    final expected = inventory.products
        .where((p) =>
            p.deletedAt == null &&
            p.status == ProductStatusType.available &&
            (p.location == loc.id || p.location == loc.label))
        .map((p) => AuditItem(
              id: p.id,
              sku: p.sku,
              furType: p.furType,
              status: AuditStatus.missing,
            ))
        .toList();

    setState(() {
      _targetLocation = loc;
      _auditItems = expected;
      _step = 'audit_loop';
      _showScanner = false;
    });
    if (expected.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Nessun prodotto atteso in "${loc.label}".'), backgroundColor: AppColors.warning),
      );
    }
  }

  void _handleLocationScan(String data) {
    final locations = ref.read(locationsProvider);
    final loc = locations.where((l) =>
        l.id == data ||
        l.label.toLowerCase() == data.toLowerCase() ||
        l.barcode == data);

    if (loc.isNotEmpty) {
      _startAudit(loc.first);
    } else {
      SoundService.playBlockingError(isAutomation: true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Posizione non trovata nel database.')),
      );
    }
  }

  void _handleProductScan(String data) {
    final locations = ref.read(locationsProvider);
    final isLocation = locations.any((l) => l.id == data || l.barcode == data);
    if (isLocation) {
      SoundService.playBlockingError(isAutomation: true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hai scansionato una Posizione. Scansiona un prodotto.')),
      );
      return;
    }

    final inventory = ref.read(inventoryProvider);

    // Check if in auditItems (by ID or SKU)
    int index = _auditItems.indexWhere((i) => i.id == data || i.sku.toLowerCase() == data.toLowerCase());

    if (index != -1) {
      if (_auditItems[index].status == AuditStatus.found) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Prodotto già scansionato.')),
        );
        return;
      }

      setState(() {
        _auditItems[index].status = AuditStatus.found;
      });
      // G4 real: persisti lastScannedAt sul prodotto
      final pid = _auditItems[index].id;
      final prod = ref.read(inventoryProvider.notifier).getProductById(pid);
      if (prod != null) {
        ref.read(inventoryProvider.notifier).updateProduct(prod.id, prod.copyWith(lastScannedAt: DateTime.now()));
      }
      SoundService.playSuccess(isAutomation: true);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✅ ${_auditItems[index].sku} Trovato!'),
          duration: const Duration(seconds: 1),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      // Intruder or unknown
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
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppColors.surface,
            title: const Row(
              children: [
                Icon(Icons.warning, color: AppColors.warning),
                SizedBox(width: 8),
                Text('Intruso Rilevato!'),
              ],
            ),
            content: Text(
              'Il prodotto ${product!.sku} risulta in "${product.location}".\nLo hai trovato qui in "${_targetLocation?.label}".',
              style: const TextStyle(color: Colors.white70),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Ignora', style: TextStyle(color: AppColors.textSecondary)),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  setState(() {
                    _auditItems.insert(
                      0,
                      AuditItem(
                        id: product!.id,
                        sku: product.sku,
                        furType: product.furType,
                        status: AuditStatus.intruder,
                      ),
                    );
                  });
                  SoundService.playSuccess(isAutomation: true);
                },
                child: const Text('Aggiungi all\'Audit', style: TextStyle(color: AppColors.warning)),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                onPressed: () async {
                  Navigator.pop(ctx);
                  final p = product;
                  if (p != null && _targetLocation != null) {
                    await ref.read(inventoryProvider.notifier).moveProduct(p.id, _targetLocation!.id);
                    setState(() {
                      _auditItems.insert(
                        0,
                        AuditItem(
                          id: p.id,
                          sku: p.sku,
                          furType: p.furType,
                          status: AuditStatus.intruder,
                        ),
                      );
                    });
                    SoundService.playSuccess(isAutomation: true);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Prodotto spostato qui e aggiunto.')),
                      );
                    }
                  }
                },
                child: const Text('Sposta Qui & Aggiungi', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
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
  }

  @override
  Widget build(BuildContext context) {
    final locations = ref.watch(locationsProvider);
    final progress = _totalExpected > 0 ? (_foundCount / _totalExpected) : 0.0;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Audit Posizione', style: TextStyle(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          _step == 'scan_location'
              ? Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.fact_check, size: 72, color: AppColors.warning),
                        const SizedBox(height: 16),
                        Text('Inizia Inventario', style: AppTypography.headlineSmall.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Text(
                          'Scansiona una posizione per vedere la lista dei prodotti attesi e verificare le discrepanze.',
                          style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 32),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 28),
                          label: const Text('Scansiona Posizione', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.warning,
                            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                          ),
                          onPressed: () => setState(() => _showScanner = true),
                        ),
                        const SizedBox(height: 36),
                        Text('POSIZIONI RECENTI', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, letterSpacing: 1)),
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
                              onPressed: () => _startAudit(loc),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                )
              : Column(
                  children: [
                    // Header Audit in corso
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: const BoxDecoration(
                        color: AppColors.surface,
                        border: Border(bottom: BorderSide(color: AppColors.border)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('AUDIT IN CORSO', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Text(_targetLocation?.label ?? '', style: AppTypography.titleLarge.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.success, width: 4),
                            ),
                            child: Center(
                              child: Text(
                                '${(progress * 100).round()}%',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Stats row
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                      color: AppColors.backgroundSecondary,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Text.rich(TextSpan(
                            text: 'Trovati: ',
                            style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                            children: [
                              TextSpan(text: '$_foundCount', style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold)),
                            ],
                          )),
                          Text.rich(TextSpan(
                            text: 'Mancanti: ',
                            style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                            children: [
                              TextSpan(text: '$_missingCount', style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                            ],
                          )),
                          Text.rich(TextSpan(
                            text: 'Intrusi: ',
                            style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                            children: [
                              TextSpan(text: '$_intruderCount', style: const TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold)),
                            ],
                          )),
                        ],
                      ),
                    ),

                    // Audit Items List
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _auditItems.length,
                        itemBuilder: (ctx, i) {
                          final item = _auditItems[i];
                          Color bgColor = AppColors.surface;
                          Color borderColor = Colors.transparent;
                          IconData icon = Icons.check_box_outline_blank;
                          Color iconColor = AppColors.textMuted;

                          if (item.status == AuditStatus.found) {
                            icon = Icons.check_box;
                            iconColor = AppColors.success;
                            bgColor = AppColors.surfaceElevated;
                          } else if (item.status == AuditStatus.intruder) {
                            icon = Icons.warning;
                            iconColor = AppColors.warning;
                            borderColor = AppColors.warning;
                          }

                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: bgColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: borderColor),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.sku,
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                          color: item.status == AuditStatus.missing ? AppColors.textSecondary : AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(item.furType, style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
                                      if (item.status == AuditStatus.intruder)
                                        const Padding(
                                          padding: EdgeInsets.only(top: 4.0),
                                          child: Text('INTRUSO', style: TextStyle(color: AppColors.warning, fontSize: 10, fontWeight: FontWeight.bold)),
                                        ),
                                    ],
                                  ),
                                ),
                                Icon(icon, color: iconColor, size: 24),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),

          // Floating Action Button for Scanner
          if (_step == 'audit_loop' && !_showScanner)
            Positioned(
              bottom: 28,
              right: 24,
              child: FloatingActionButton.large(
                backgroundColor: AppColors.warning,
                onPressed: () => setState(() => _showScanner = true),
                child: const Icon(Icons.qr_code_scanner, size: 36, color: Colors.white),
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
        ],
      ),
    );
  }
}
