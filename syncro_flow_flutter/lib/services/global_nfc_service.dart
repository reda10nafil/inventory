import 'nfc_coordinator.dart';
import 'nfc_foreground_dispatch.dart';

/// Listener NFC globale delegato al NfcCoordinator.
/// Mantiene compatibilita con chiamate esistenti pause()/resume().
class GlobalNfcService {
  static bool _paused = false;
  static Future<void> Function(String payload)? _lastOnTag;

  static bool get isPaused => _paused;

  static Future<void> pause() async {
    _paused = true;
    await NfcForegroundDispatch.disable();
    await NfcCoordinator.forceStop();
  }

  static Future<void> resume() async {
    _paused = false;
    if (_lastOnTag != null) {
      await startGlobalListener(onTag: _lastOnTag!);
    }
  }

  static Future<void> startGlobalListener({
    required Future<void> Function(String payload) onTag,
  }) async {
    _lastOnTag = onTag;
    if (_paused) return;
    NfcCoordinator.registerGlobalCallback(onTag);
    await NfcForegroundDispatch.enable();
    await NfcCoordinator.startGlobalSession();
  }

  static Future<void> stopGlobalListener() async {
    await NfcForegroundDispatch.disable();
    await NfcCoordinator.stopGlobalSession();
  }
}
