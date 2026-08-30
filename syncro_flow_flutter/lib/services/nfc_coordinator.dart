import 'dart:async';
import 'package:nfc_manager/nfc_manager.dart';
import 'nfc_foreground_dispatch.dart';

/// Coordinator NFC a priorita: garantisce una sola NfcManager.startSession attiva.
/// Solo la funzione richiesta è attiva: read OR write OR clean, mai assieme.
/// Priorita: explicitRead / explicitWrite / explicitClean (10) > tools (5).
/// Inhibit 2500ms dopo ogni explicit per evitare loop di rilettura.
enum NfcMode { explicitRead, explicitWrite, explicitClean, tools }

class NfcCoordinator {
  static NfcMode? _activeMode;
  static String? _activeToken;
  static bool _sessionRunning = false;
  static DateTime? _inhibitUntil;

  // 2.5s dopo explicit read/write/clean — evita loop su tag appoggiato
  static const Duration inhibitDuration = Duration(milliseconds: 2500);

  static bool get isInhibited => _inhibitUntil != null && DateTime.now().isBefore(_inhibitUntil!);

  // Exposed for tests
  static NfcMode? get activeModeForTest => _activeMode;
  static String? get activeTokenForTest => _activeToken;
  static DateTime? get inhibitUntilForTest => _inhibitUntil;
  static int priorityForTest(NfcMode m) => _priority(m);
  static void resetForTest() {
    _activeMode = null;
    _activeToken = null;
    _sessionRunning = false;
    _inhibitUntil = null;
  }

  static void _setInhibit() {
    _inhibitUntil = DateTime.now().add(inhibitDuration);
  }

  static int _priority(NfcMode? m) {
    if (m == null) return 0;
    switch (m) {
      case NfcMode.tools:
        return 5;
      case NfcMode.explicitRead:
      case NfcMode.explicitWrite:
      case NfcMode.explicitClean:
        return 10;
    }
  }

  /// Acquisisce NFC per [mode]. Se priorita piu alta dell'attuale, ferma sessione corrente e ne avvia una nuova.
  /// Ritorna true se acquisito, false se un modo a priorita maggiore e gia attivo.
  static Future<bool> acquire(NfcMode mode, String token) async {
    if (_activeToken == token && _activeMode == mode) return true;
    if (_priority(mode) < _priority(_activeMode) && _sessionRunning) {
      return false;
    }
    if (_sessionRunning) {
      try { await NfcManager.instance.stopSession(); } catch (_) {}
      _sessionRunning = false;
    }
    _activeMode = mode;
    _activeToken = token;
    
    // Foreground dispatch: attivo solo quando esplicitamente richiesto
    if (mode == NfcMode.explicitRead || mode == NfcMode.explicitWrite || mode == NfcMode.explicitClean) {
      await NfcForegroundDispatch.enable();
    } else if (mode == NfcMode.tools) {
      // tools = blocco totale: disabilita foreground finché su /add o /settings
      await NfcForegroundDispatch.disable();
    }
    return true;
  }

  static Future<void> release(String token) async {
    if (_activeToken != token) return;
    try { await NfcManager.instance.stopSession(); } catch (_) {}
    await NfcForegroundDispatch.disable();
    _sessionRunning = false;
    _activeMode = null;
    _activeToken = null;
  }

  /// Chiamato dopo ogni operazione explicit (read/write/clean) per 2.5s di pausa
  static void inhibitAfterExplicit() {
    _setInhibit();
  }

  /// Stop con inhibit 2.5s — disabilita NFC per la durata richiesta senza spegnerlo per sempre
  static void stopWithCooldown() {
    _setInhibit();
  }

  static Future<void> forceStop() async {
    try { await NfcManager.instance.stopSession(); } catch (_) {}
    await NfcForegroundDispatch.disable();
    _sessionRunning = false;
  }
}
