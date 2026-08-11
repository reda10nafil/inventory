import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/theme/app_theme.dart';
import 'providers/storage_provider.dart';
import 'services/storage_service.dart';
import 'screens/app_shell.dart';
import 'screens/home_screen.dart';
import 'screens/timeline_screen.dart';
import 'screens/automations_screen.dart';
import 'screens/add_product_screen.dart';
import 'screens/settings_screen.dart';

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
    // Placeholder routes for future phases
    GoRoute(
      path: '/product/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        return Scaffold(
          backgroundColor: const Color(0xFF0A0A0A),
          appBar: AppBar(
            title: const Text('Dettaglio Prodotto'),
          ),
          body: Center(
            child: Text(
              'Dettaglio prodotto: ${state.pathParameters['id']}\n\n(Fase 5)',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 16),
            ),
          ),
        );
      },
    ),
    GoRoute(
      path: '/scanner',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        return Scaffold(
          backgroundColor: const Color(0xFF0A0A0A),
          appBar: AppBar(
            title: const Text('Scanner'),
          ),
          body: const Center(
            child: Text(
              'Scanner Live\n\n(Fase 5)',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 16),
            ),
          ),
        );
      },
    ),
  ],
);

class SyncroFlowApp extends StatelessWidget {
  const SyncroFlowApp({super.key});

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
