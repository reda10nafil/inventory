import 'package:flutter_test/flutter_test.dart';
import 'package:syncro_flow/core/utils/nfc_route_guard.dart';

void main() {
  group('isNfcSuppressedRoute - NFC disabilitato su add/settings', () {
    test('suppressed su /add', () {
      expect(isNfcSuppressedRoute('/add'), isTrue);
    });

    test('suppressed su /add con query o subroute', () {
      expect(isNfcSuppressedRoute('/add/foo'), isTrue);
      expect(isNfcSuppressedRoute('/add?sku=1'), isTrue);
    });

    test('suppressed su /settings', () {
      expect(isNfcSuppressedRoute('/settings'), isTrue);
      expect(isNfcSuppressedRoute('/settings/hardware'), isTrue);
      expect(isNfcSuppressedRoute('/settings/nfc_tools'), isTrue);
    });

    test('non suppressed su / (home) - scanner deve funzionare', () {
      expect(isNfcSuppressedRoute('/'), isFalse);
      expect(isNfcSuppressedRoute('/timeline'), isFalse);
      expect(isNfcSuppressedRoute('/automations'), isFalse);
      expect(isNfcSuppressedRoute('/scanner'), isFalse);
      expect(isNfcSuppressedRoute('/product/123'), isFalse);
    });

    test('NFC non viene chiamato quando non interpellato: suppressed ritorna true solo dove richiesto', () {
      // Simula: se sei su home, NFC globale PUO agire; se su add/settings NO
      final suppressedHome = isNfcSuppressedRoute('/');
      final suppressedAdd = isNfcSuppressedRoute('/add');
      expect(suppressedHome, isFalse, reason: 'Home deve permettere scan NFC');
      expect(suppressedAdd, isTrue, reason: 'Add non deve triggerare NFC globale');
    });
  });

  group('extractSkuCandidate - estrazione senza navigazione inutile', () {
    test('plain SKU resta invariato', () {
      expect(extractSkuCandidate('SKU-2026-001'), 'SKU-2026-001');
      expect(extractSkuCandidate('  SKU-2026-001  '), 'SKU-2026-001');
    });

    test('syncroflow://product/SKU-2026-001 estrae ultimo segmento', () {
      expect(extractSkuCandidate('syncroflow://product/SKU-2026-001'), 'SKU-2026-001');
    });

    test('https con SKU- in path', () {
      expect(extractSkuCandidate('https://syncroflow.app/id/01/123/SKU-2026-042'), 'SKU-2026-042');
    });

    test('GS1 uri con SKU in query', () {
      expect(extractSkuCandidate('https://syncroflow.app/01/01234567/21/SKU-2026-999'), 'SKU-2026-999');
    });

    test('payload vuoto o spazio', () {
      expect(extractSkuCandidate('   '), '');
    });
  });
}
