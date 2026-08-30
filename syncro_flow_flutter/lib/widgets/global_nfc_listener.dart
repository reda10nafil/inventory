import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/utils/nfc_route_guard.dart';
import '../providers/inventory_provider.dart';
import '../services/global_nfc_service.dart';
import '../screens/scanner_action_screen.dart';

class GlobalNfcListener extends ConsumerStatefulWidget {
  final Widget child;
  const GlobalNfcListener({super.key, required this.child});

  @override
  ConsumerState<GlobalNfcListener> createState() => _GlobalNfcListenerState();
}

class _GlobalNfcListenerState extends ConsumerState<GlobalNfcListener> with WidgetsBindingObserver {
  String? _lastPayload;
  DateTime? _lastAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _start();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    GlobalNfcService.stopGlobalListener();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _start();
    } else if (state == AppLifecycleState.paused) {
      GlobalNfcService.pause();
    }
  }

  Future<void> _start() async {
    await GlobalNfcService.startGlobalListener(onTag: _handleTag);
  }

  Future<void> _handleTag(String payload) async {
    if (!mounted) return;
    final clean = payload.trim();
    if (_lastPayload == clean && _lastAt != null && DateTime.now().difference(_lastAt!).inMilliseconds < 4000) return;
    _lastPayload = clean;
    _lastAt = DateTime.now();
    if (clean.isEmpty) return;
    final loc = GoRouterState.of(context).uri.path;
    final suppressed = isNfcSuppressedRoute(loc);
    final skuCandidate = extractSkuCandidate(clean);

    final inventory = ref.read(inventoryProvider);
    final match = inventory.products.where((p) => p.deletedAt == null && (p.sku.toLowerCase() == skuCandidate.toLowerCase() || p.id == skuCandidate || p.barcode == skuCandidate || p.nfcTag == skuCandidate || p.nfcTag == clean || p.gs1DigitalLink == clean)).toList();

    if (match.isNotEmpty) {
      final product = match.first;
      if (mounted) {
        if (suppressed) {
          // Su /add e /settings non navigare mai: solo snackbar compatibilità
          final isAdd = loc.startsWith('/add');
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(isAdd
                ? 'Tag rilevato: ${product.sku} (${product.furType}) — già associato a un prodotto. Usa NFC Tools per gestirlo.'
                : 'Tag rilevato: ${product.sku} — NFC disabilitato in Impostazioni. Vai in NFC Tools.'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: const Color(0xFFD4AF37),
            duration: const Duration(seconds: 3),
          ));
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('NFC → ${product.sku} (${product.furType})'), behavior: SnackBarBehavior.floating, backgroundColor: const Color(0xFF06B6D4)));
        Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(builder: (_) => ScannerActionScreen(type: 'product', entityId: product.id)));
      }
    } else {
      final direct = inventory.products.where((p) => p.deletedAt == null && (p.sku.toLowerCase() == clean.toLowerCase() || p.nfcTag == clean)).toList();
      if (direct.isNotEmpty) {
        if (mounted) {
          if (suppressed) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('Tag rilevato: ${direct.first.sku} — già associato. Vai in NFC Tools per leggerlo.'),
              behavior: SnackBarBehavior.floating,
              backgroundColor: const Color(0xFFD4AF37),
            ));
            return;
          }
          Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(builder: (_) => ScannerActionScreen(type: 'product', entityId: direct.first.id)));
        }
      } else {
        if (mounted) {
          if (suppressed) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('Tag NFC: $clean — non associato. ${loc.startsWith('/add') ? "Puoi leggerlo con \"Leggi Tag NFC\" per verificarne la compatibilità." : "NFC disabilitato qui — usa NFC Tools."}'),
              behavior: SnackBarBehavior.floating,
            ));
            return;
          }
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Tag NFC: $clean — nessun prodotto associato'), behavior: SnackBarBehavior.floating));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
