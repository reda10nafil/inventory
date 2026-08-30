import 'package:audioplayers/audioplayers.dart';

/// SoundService — frequenze audio consentite SOLO dentro le automazioni.
/// Per requisito: "Le frequenze sonore servono solamente per le automazioni.
/// Nessun altra circostanza dovrebbe attivarsi".
/// Tutti i play fuori da automazioni/* devono essere rimossi o gate-ati.
/// Questa classe mantiene un gate centrale: se [enableAutomationSoundsOnly] è true,
/// i suoni generici sono silenziati a meno che [isAutomation] non sia true.
class SoundService {
  /// Gate centrale — quando true, solo le chiamate con isAutomation=true emettono suono.
  static bool enableAutomationSoundsOnly = true;

  late final AudioPlayer _player;
  static final AudioPlayer _staticPlayer = AudioPlayer();

  SoundService() {
    _player = AudioPlayer();
  }

  Future<void> _playAsset(String assetPath, {bool isAutomation = false}) async {
    if (enableAutomationSoundsOnly && !isAutomation) return;
    try {
      await _player.stop();
      await _player.play(AssetSource(assetPath));
    } catch (_) {}
  }

  static Future<void> playBeep({bool isAutomation = false}) async {
    if (enableAutomationSoundsOnly && !isAutomation) return;
    try {
      await _staticPlayer.stop();
      await _staticPlayer.play(AssetSource('audio/beep_short.wav'));
    } catch (_) {}
  }

  static Future<void> playAlarm({bool isAutomation = false}) async {
    if (enableAutomationSoundsOnly && !isAutomation) return;
    try {
      await _staticPlayer.stop();
      await _staticPlayer.play(AssetSource('audio/beep_long.wav'));
    } catch (_) {}
  }

  /// Alias espliciti per contesto automazione — sempre consentiti.
  static Future<void> playAutomationBeep() => playBeep(isAutomation: true);
  static Future<void> playAutomationAlarm() => playAlarm(isAutomation: true);

  /// NFC distinct tones — bypass automation gate (suoni NFC sempre consentiti)
  static Future<void> playNfcRead() async {
    try {
      await _staticPlayer.stop();
      // 1200Hz approx: beep breve 180ms
      await _staticPlayer.play(AssetSource('audio/beep_short.wav'));
      await Future.delayed(const Duration(milliseconds: 180));
      await _staticPlayer.stop();
    } catch (_) {}
  }

  static Future<void> playNfcWrite() async {
    try {
      await _staticPlayer.stop();
      // 1800Hz approx: beep medio 250ms
      await _staticPlayer.play(AssetSource('audio/beep_short.wav'));
      await Future.delayed(const Duration(milliseconds: 250));
      await _staticPlayer.stop();
      await Future.delayed(const Duration(milliseconds: 60));
      await _staticPlayer.play(AssetSource('audio/beep_short.wav'));
    } catch (_) {}
  }

  static Future<void> playNfcClean() async {
    try {
      await _staticPlayer.stop();
      // 800Hz approx: beep lungo 400ms
      await _staticPlayer.play(AssetSource('audio/beep_long.wav'));
    } catch (_) {}
  }

  static Future<void> playSuccess({bool isAutomation = false}) async {
    await playBeep(isAutomation: isAutomation);
  }

  static Future<void> playSuccessBeep({bool isAutomation = false}) async {
    await playBeep(isAutomation: isAutomation);
  }

  static Future<void> playFragileBeep({bool isAutomation = false}) async {
    await playAlarm(isAutomation: isAutomation);
  }

  Future<void> playBeepInstance({bool isAutomation = false}) async {
    await playBeep(isAutomation: isAutomation);
  }

  // Instance method alias
  Future<void> playBeepSound({bool isAutomation = false}) async {
    await playBeep(isAutomation: isAutomation);
  }

  Future<void> playFragileBeepInstance({bool isAutomation = false}) async {
    await playFragileAlert(isAutomation: isAutomation);
  }

  static Future<void> playError({bool isAutomation = false}) async {
    await playAlarm(isAutomation: isAutomation);
  }

  static Future<void> playBlockingError({bool isAutomation = false}) async {
    await playAlarm(isAutomation: isAutomation);
  }

  static Future<void> playAnomaly({bool isAutomation = false}) async {
    await playBeep(isAutomation: isAutomation);
    await Future.delayed(const Duration(milliseconds: 300));
    await playBeep(isAutomation: isAutomation);
    await Future.delayed(const Duration(milliseconds: 300));
    await playBeep(isAutomation: isAutomation);
  }

  Future<void> playFragileAlert({bool isAutomation = false}) async {
    await _playAsset('audio/beep_short.wav', isAutomation: isAutomation);
    await Future.delayed(const Duration(milliseconds: 600));
    await _playAsset('audio/beep_short.wav', isAutomation: isAutomation);
  }

  Future<void> playOrderComplete({bool isAutomation = false}) async {
    for (int i = 0; i < 4; i++) {
      await _playAsset('audio/beep_short.wav', isAutomation: isAutomation);
      await Future.delayed(const Duration(milliseconds: 150));
    }
  }

  Future<void> playBatteryLow({bool isAutomation = false}) async {
    await _playAsset('audio/beep_long.wav', isAutomation: isAutomation);
    await Future.delayed(const Duration(milliseconds: 1200));
    await _playAsset('audio/beep_long.wav', isAutomation: isAutomation);
  }

  void dispose() {
    _player.dispose();
  }
}
