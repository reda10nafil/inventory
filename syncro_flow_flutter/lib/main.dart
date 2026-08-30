import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/theme/app_theme.dart';
import 'core/utils/nfc_route_guard.dart';
import 'providers/inventory_provider.dart';
import 'providers/storage_provider.dart';
import 'services/storage_service.dart';
import 'screens/app_shell.dart';
import 'screens/home_screen.dart';
import 'screens/timeline_screen.dart';
import 'screens/automations_screen.dart';
import 'screens/add_product_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/product_detail_screen.dart';
import 'screens/product_edit_screen.dart';
import 'screens/scanner_action_screen.dart';
import 'screens/scanner_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait mode
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Set system UI overlay style for dark theme
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF1A1A1A),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  // Initialize storage service
  final prefs = await SharedPreferences.getInstance();
  final storageService = StorageService(prefs);

  runApp(
    ProviderScope(
      overrides: [
        storageServiceProvider.overrideWithValue(storageService),
      ],
      child: const SyncroFlowApp(),
    ),
  );
}

// Navigation key for ShellRoute
final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final GoRouter _router = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  // Evita Page Not Found quando l'OS lancia syncroflow://product/... come deep link
  redirect: (context, state) {
    final loc = state.uri.toString();
    if (loc.startsWith('syncroflow://')) return '/';
    return null;
  },
  errorBuilder: (context, state) => Scaffold(
    backgroundColor: const Color(0xFF1A1A1A),
    body: Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.error_outline, color: Colors.white70, size: 48),
        const SizedBox(height: 12),
        Text('Pagina non trovata', style: const TextStyle(color: Colors.white, fontSize: 20)),
        const SizedBox(height: 8),
        Text(state.error.toString(), style: const TextStyle(color: Colors.white54, fontSize: 12), textAlign: TextAlign.center),
        const SizedBox(height: 20),
        ElevatedButton(onPressed: () => _router.go('/'), child: const Text('Home')),
      ]),
    ),
  ),
  routes: [
    ShellRoute(
      navigatorKey: _shellNavigatorKey,
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(
          path: '/',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: HomeScreen(),
          ),
        ),
        GoRoute(
          path: '/timeline',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: TimelineScreen(),
          ),
        ),
        GoRoute(
          path: '/automations',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: AutomationsScreen(),
          ),
        ),
        GoRoute(
          path: '/add',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: AddProductScreen(),
          ),
        ),
        GoRoute(
          path: '/settings',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: SettingsScreen(),
          ),
        ),
      ],
    ),
    GoRoute(
      path: '/product/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => ProductDetailScreen(
        productId: state.pathParameters['id']!,
      ),
      routes: [
        GoRoute(
          path: 'edit',
          parentNavigatorKey: _rootNavigatorKey,
          builder: (context, state) => ProductEditScreen(
            productId: state.pathParameters['id']!,
          ),
        ),
      ],
    ),
    GoRoute(
      path: '/scanner',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const ScannerScreen(),
    ),
  ],
);

class SyncroFlowApp extends ConsumerStatefulWidget {
  const SyncroFlowApp({super.key});

  @override
  ConsumerState<SyncroFlowApp> createState() => _SyncroFlowAppState();
}

class _SyncroFlowAppState extends ConsumerState<SyncroFlowApp> {
  late AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSub;

  @override
  void initState() {
    super.initState();
    _appLinks = AppLinks();
    _handleInitialLink();
    _linkSub = _appLinks.uriLinkStream.listen((uri) => _handleUri(uri), onError: (_) {});
  }

  @override
  void dispose() {
    _linkSub?.cancel();
    super.dispose();
  }

  Future<void> _handleInitialLink() async {
    try {
      final uri = await _appLinks.getInitialLink();
      debugPrint('[DeepLink] getInitialLink: $uri');
      if (uri != null) {
        // Attendi idratazione storage/inventory prima di matchare
        await Future.delayed(const Duration(milliseconds: 350));
        if (!mounted) return;
        // Secondo tentativo se primo era null su cold-start ucciso
        final retry = uri;
        _handleUri(retry);
        // Fallback: riprova getInitialLink dopo breve se non navigato
        await Future.delayed(const Duration(milliseconds: 400));
        if (!mounted) return;
        try {
          final uri2 = await _appLinks.getInitialLink();
          if (uri2 != null && uri2.toString() != retry.toString()) {
            debugPrint('[DeepLink] retry link: $uri2');
            _handleUri(uri2);
          }
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('[DeepLink] getInitialLink error: $e');
    }
  }

  void _handleUri(Uri uri) {
    debugPrint('[DeepLink] _handleUri: $uri');
    String? sku;
    if (uri.scheme == 'syncroflow' && uri.host == 'product' && uri.pathSegments.isNotEmpty) {
      sku = uri.pathSegments.last;
    } else if ((uri.scheme == 'https' || uri.scheme == 'http') && uri.host.contains('syncroflow.app')) {
      final m = RegExp(r'SKU-\d{4}-\d+').firstMatch(uri.toString());
      if (m != null) sku = m.group(0);
      else if (uri.pathSegments.isNotEmpty) sku = uri.pathSegments.last;
    } else {
      final m = RegExp(r'SKU-\d{4}-\d+').firstMatch(uri.toString());
      if (m != null) sku = m.group(0);
      else sku = uri.toString().split('/').last;
    }
    if (sku == null || sku.isEmpty) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final inv = ref.read(inventoryProvider);
      // Se inventory non ancora idratato, ritarda
      if (inv.products.isEmpty) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (!mounted) return;
          final inv2 = ref.read(inventoryProvider);
          _navigateForSku(sku!, uri);
          debugPrint('[DeepLink] delayed inventory size: ${inv2.products.length}');
        });
        return;
      }
      _navigateForSku(sku!, uri);
    });
  }

  void _navigateForSku(String sku, Uri uri) {
    final inv = ref.read(inventoryProvider);
    final match = inv.products.where((p) => p.deletedAt == null && (p.sku.toLowerCase() == sku.toLowerCase() || p.id == sku || p.barcode == sku || p.nfcTag == sku || p.nfcTag == uri.toString() || p.gs1DigitalLink == uri.toString())).toList();
    final ctx = _rootNavigatorKey.currentContext;
    if (ctx == null) return;
    final loc = _router.routerDelegate.currentConfiguration.uri.toString();
    final suppressed = isNfcSuppressedRoute(loc);
    if (suppressed) {
      ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Tag NFC rilevato ($sku) — NFC disabilitato qui. Vai in NFC Tools per gestirlo.')));
      return;
    }
    if (match.isNotEmpty) {
      Navigator.of(ctx, rootNavigator: true).push(MaterialPageRoute(builder: (_) => ScannerActionScreen(type: 'product', entityId: match.first.id)));
    } else {
      ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Prodotto NFC: $sku non trovato')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'SyncroFlow Pro',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      routerConfig: _router,
    );
  }
}
