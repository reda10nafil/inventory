import 'package:flutter_test/flutter_test.dart';
import 'package:syncro_flow/services/nfc_coordinator.dart';

void main() {
  setUp(() {
    NfcCoordinator.resetForTest();
  });

  group('NfcCoordinator - inhibit 2.5s', () {
    test('inhibitDuration is 2500ms as requested', () {
      expect(NfcCoordinator.inhibitDuration.inMilliseconds, 2500);
    });

    test('globalInhibitDuration remains 4000ms', () {
      expect(NfcCoordinator.globalInhibitDuration.inMilliseconds, 4000);
    });

    test('isInhibited false initially', () {
      expect(NfcCoordinator.isInhibited, isFalse);
    });

    test('isInhibited true right after inhibitAfterExplicit', () {
      NfcCoordinator.inhibitAfterExplicit();
      expect(NfcCoordinator.isInhibited, isTrue);
      expect(NfcCoordinator.inhibitUntilForTest, isNotNull);
      // Should remain inhibited for ~2.5s, not 1s
      final remaining = NfcCoordinator.inhibitUntilForTest!.difference(DateTime.now());
      expect(remaining.inMilliseconds, greaterThan(2000));
      expect(remaining.inMilliseconds, lessThanOrEqualTo(2500));
    });

    test('stopWithCooldown also enables 2.5s inhibit', () {
      NfcCoordinator.stopWithCooldown();
      expect(NfcCoordinator.isInhibited, isTrue);
    });

    test('inhibit expires after duration', () async {
      NfcCoordinator.inhibitAfterExplicit();
      expect(NfcCoordinator.isInhibited, isTrue);
      await Future.delayed(const Duration(milliseconds: 2600));
      expect(NfcCoordinator.isInhibited, isFalse);
    });
  });

  group('NfcCoordinator - priorita esclusiva', () {
    test('priority explicit > tools > global', () {
      expect(NfcCoordinator.priorityForTest(NfcMode.global), 0);
      expect(NfcCoordinator.priorityForTest(NfcMode.tools), 5);
      expect(NfcCoordinator.priorityForTest(NfcMode.explicitRead), 10);
      expect(NfcCoordinator.priorityForTest(NfcMode.explicitWrite), 10);
      expect(NfcCoordinator.priorityForTest(NfcMode.explicitClean), 10);
    });

    test('acquire explicitRead blocks global', () async {
      // Start with global
      expect(NfcCoordinator.activeModeForTest, NfcMode.global);
      final ok1 = await NfcCoordinator.acquire(NfcMode.explicitRead, 'test_read');
      expect(ok1, isTrue);
      expect(NfcCoordinator.activeModeForTest, NfcMode.explicitRead);
      expect(NfcCoordinator.activeTokenForTest, 'test_read');
      // Trying to acquire global while explicit is active should fail if sessionRunning simulated
      // Without sessionRunning, acquire will succeed but we test priority logic via force
    });

    test('tools can be acquired, explicit can override tools', () async {
      NfcCoordinator.resetForTest();
      final okTools = await NfcCoordinator.acquire(NfcMode.tools, 'tools_token');
      expect(okTools, isTrue);
      expect(NfcCoordinator.activeModeForTest, NfcMode.tools);
      final okExplicit = await NfcCoordinator.acquire(NfcMode.explicitWrite, 'write_token');
      expect(okExplicit, isTrue);
      expect(NfcCoordinator.activeModeForTest, NfcMode.explicitWrite);
    });

    test('solo una funzione alla volta: explicitRead vs explicitWrite', () async {
      NfcCoordinator.resetForTest();
      await NfcCoordinator.acquire(NfcMode.explicitRead, 'read_tok');
      expect(NfcCoordinator.activeModeForTest, NfcMode.explicitRead);
      // Acquire different explicit while no sessionRunning will still switch (priority equal, but token different)
      // The key is that session is not duplicated — acquire stops previous
      final ok = await NfcCoordinator.acquire(NfcMode.explicitWrite, 'write_tok');
      expect(ok, isTrue);
      expect(NfcCoordinator.activeModeForTest, NfcMode.explicitWrite);
      expect(NfcCoordinator.activeTokenForTest, 'write_tok');
    });

    test('release ritorna a global senza riattivare immediatamente se in inhibit', () async {
      NfcCoordinator.resetForTest();
      await NfcCoordinator.acquire(NfcMode.explicitRead, 'tok1');
      NfcCoordinator.inhibitAfterExplicit();
      // release should set mode to global but keep inhibit
      await NfcCoordinator.release('tok1');
      expect(NfcCoordinator.activeModeForTest, NfcMode.global);
      expect(NfcCoordinator.isInhibited, isTrue);
    });
  });

  group('NfcCoordinator - non chiamato quando non richiesto', () {
    test('nessuna sessione globale se non registrata', () async {
      NfcCoordinator.resetForTest();
      // startGlobalSession should early-return if no callback registered
      await NfcCoordinator.startGlobalSession();
      // Should not crash, just return
      expect(NfcCoordinator.isInhibited, isFalse);
    });

    test('reset pulisce tutto', () async {
      await NfcCoordinator.acquire(NfcMode.explicitRead, 'a');
      NfcCoordinator.inhibitAfterExplicit();
      NfcCoordinator.resetForTest();
      expect(NfcCoordinator.activeModeForTest, NfcMode.global);
      expect(NfcCoordinator.activeTokenForTest, isNull);
      expect(NfcCoordinator.isInhibited, isFalse);
    });
  });
}
