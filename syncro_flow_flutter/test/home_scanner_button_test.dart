import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:syncro_flow/screens/home_screen.dart';
import 'package:syncro_flow/providers/storage_provider.dart';
import 'package:syncro_flow/services/storage_service.dart';
import 'package:syncro_flow/screens/scanner_screen.dart';
import 'package:syncro_flow/screens/app_shell.dart';
import 'package:syncro_flow/screens/timeline_screen.dart';
import 'package:syncro_flow/screens/automations_screen.dart';
import 'package:syncro_flow/screens/add_product_screen.dart';
import 'package:syncro_flow/screens/settings_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  ProviderScope wrapWithRouter(GoRouter router) {
    final prefs = SharedPreferences.getInstance();
    return ProviderScope(
      overrides: [],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  testWidgets('Home ha pulsante scanner vicino a ricerca', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final storage = StorageService(prefs);

    final router = GoRouter(
      initialLocation: '/',
      routes: [
        ShellRoute(
          builder: (context, state, child) => AppShell(child: child),
          routes: [
            GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
            GoRoute(path: '/timeline', builder: (context, state) => const TimelineScreen()),
            GoRoute(path: '/automations', builder: (context, state) => const AutomationsScreen()),
            GoRoute(path: '/add', builder: (context, state) => const AddProductScreen()),
            GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
          ],
        ),
        GoRoute(path: '/scanner', builder: (context, state) => const ScannerScreen()),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [storageServiceProvider.overrideWithValue(storage)],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    // Verifica presenza pulsante scanner in Home header vicino a ricerca
    expect(find.byIcon(Icons.qr_code_scanner_rounded), findsOneWidget,
        reason: 'Home deve avere bottone scanner vicino a ricerca');
    expect(find.byIcon(Icons.search), findsOneWidget);
    expect(find.byTooltip('Scanner'), findsOneWidget);
  });

  testWidgets('Scanner accessibile anche da Home senza passare da bottom bar', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final storage = StorageService(prefs);

    final router = GoRouter(
      initialLocation: '/',
      routes: [
        ShellRoute(
          builder: (context, state, child) => AppShell(child: child),
          routes: [
            GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
          ],
        ),
        GoRoute(path: '/scanner', builder: (context, state) => const ScannerScreen()),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [storageServiceProvider.overrideWithValue(storage)],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byTooltip('Scanner'), findsOneWidget);
  });
}
