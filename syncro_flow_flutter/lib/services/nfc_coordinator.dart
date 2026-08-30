import 'dart:async';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:nfc_manager/platform_tags.dart';
import 'nfc_foreground_dispatch.dart';
import 'nfc_service.dart';

/// Coordinator NFC a priorita: garantisce una sola NfcManager.startSession attiva.
/// Solo la funzione richiesta è attiva: read OR write OR clean, mai assieme.
/// Priorita: explicitRead / explicitWrite / explicitClean (10) > tools (5) > global (0).
/// Inhibit 2500ms dopo ogni explicit per evitare loop di rilettura.
enum NfcMode { global, explicitRead, explicitWrite, explicitClean, tools }

class NfcCoordinator {
  static NfcMode _activeMode = NfcMode.global;
  static String? _activeToken;
  static bool _sessionRunning = false;
  static String? _lastPayload;
  static DateTime? _lastAt;
  static DateTime? _inhibitUntil;
  static Future<void> Function(String payload)? _globalOnTag;

  // 2.5s dopo explicit read/write/clean — evita loop su tag appoggiato
  static const Duration inhibitDuration = Duration(milliseconds: 2500);
  static const Duration globalInhibitDuration = Duration(milliseconds: 4000);

  static bool get isInhibited => _inhibitUntil != null && DateTime.now().isBefore(_inhibitUntil!);

  // Exposed for tests
  static NfcMode get activeModeForTest => _activeMode;
  static String? get activeTokenForTest => _activeToken;
  static DateTime? get inhibitUntilForTest => _inhibitUntil;
  static int priorityForTest(NfcMode m) => _priority(m);
  static void resetForTest() {
    _activeMode = NfcMode.global;
    _activeToken = null;
    _sessionRunning = false;
    _lastPayload = null;
    _lastAt = null;
    _inhibitUntil = null;
    _globalOnTag = null;
  }

  static void _setInhibit() {
    _inhibitUntil = DateTime.now().add(inhibitDuration);
  }

  static void _setGlobalInhibit() {
    _inhibitUntil = DateTime.now().add(globalInhibitDuration);
  }

  /// Registra callback globale (chiamato da GlobalNfcListener)
  static void registerGlobalCallback(Future<void> Function(String payload) cb) {
    _globalOnTag = cb;
  }

  static int _priority(NfcMode m) {
    switch (m) {
      case NfcMode.global:
        return 0;
      case NfcMode.tools:
        // blocca globale ma si fa sorpassare da qualsiasi explicit
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
    // Foreground dispatch: attivo solo quando esplicitamente richiesto (read/write/clean) o tools globale voluto
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
    _activeMode = NfcMode.global;
    _activeToken = null;
    if (_globalOnTag != null) {
      await Future.delayed(const Duration(milliseconds: 180));
      if (!isInhibited) {
        await NfcForegroundDispatch.enable();
        await startGlobalSession();
      } else {
        final remaining = _inhibitUntil!.difference(DateTime.now());
        final wait = remaining.isNegative ? Duration.zero : remaining + const Duration(milliseconds: 150);
        Future.delayed(wait, () async {
          if (_activeMode == NfcMode.global && !isInhibited) {
            await NfcForegroundDispatch.enable();
            startGlobalSession();
          }
        });
      }
    }
  }

  static Future<void> startGlobalSession() async {
    if (_activeMode != NfcMode.global) return;
    if (_sessionRunning) return;
    if (_globalOnTag == null) return;
    final available = await NfcService().isSupported();
    if (!available) return;
    await NfcForegroundDispatch.enable();
    _sessionRunning = true;
    try {
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          if (_activeMode != NfcMode.global) return;
          if (isInhibited) return;
          String? payload;
          final ndef = Ndef.from(tag);
          if (ndef != null) {
            try {
              final msg = await ndef.read();
              if (msg.records.isNotEmpty) {
                payload = NfcService.decodeRecord(msg.records.first);
              }
            } catch (_) {}
          }
          if (payload == null || payload.isEmpty) {
            final nfcA = NfcA.from(tag);
            if (nfcA != null) {
              payload = nfcA.identifier.map((e) => e.toRadixString(16).padLeft(2, '0')).join(':').toUpperCase();
            }
          }
          if (payload == null || payload.isEmpty) {
            payload = tag.data['id']?.toString();
          }
          if (payload != null && payload.isNotEmpty) {
            // Global: anti-rilettura continua se stesso tag resta appoggiato — 4000ms e payload identico bloccato
            if (_lastPayload == payload && _lastAt != null && DateTime.now().difference(_lastAt!).inMilliseconds < 4000) return;
            _lastPayload = payload;
            _lastAt = DateTime.now();
            _setGlobalInhibit();
            await _globalOnTag!(payload);
          }
        },
      );
    } catch (_) {
      _sessionRunning = false;
    }
  }

  static Future<void> stopGlobalSession() async {
    try { await NfcManager.instance.stopSession(); } catch (_) {}
    await NfcForegroundDispatch.disable();
    _sessionRunning = false;
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
