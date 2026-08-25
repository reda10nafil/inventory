import 'package:audioplayers/audioplayers.dart';

class SoundService {
  late final AudioPlayer _player;
  static final AudioPlayer _staticPlayer = AudioPlayer();

  SoundService() {
    _player = AudioPlayer();
  }

  Future<void> _playAsset(String assetPath) async {
    try {
      await _player.stop();
      await _player.play(AssetSource(assetPath));
    } catch (_) {}
  }

  static Future<void> playBeep() async {
    try {
      await _staticPlayer.stop();
      await _staticPlayer.play(AssetSource('audio/beep_short.wav'));
    } catch (_) {}
  }

  static Future<void> playAlarm() async {
    try {
      await _staticPlayer.stop();
      await _staticPlayer.play(AssetSource('audio/beep_long.wav'));
    } catch (_) {}
  }

  static Future<void> playSuccess() async {
    await playBeep();
  }

  static Future<void> playSuccessBeep() async {
    await playBeep();
  }

  static Future<void> playFragileBeep() async {
    await playAlarm();
  }

  Future<void> playBeepInstance() async {
    await playBeep();
  }

  // Instance method alias
  Future<void> playBeepSound() async {
    await playBeep();
  }

  Future<void> playFragileBeepInstance() async {
    await playFragileAlert();
  }

  static Future<void> playError() async {
    await playAlarm();
  }

  Future<void> playAnomaly() async {
    await _playAsset('audio/beep_short.wav');
    await Future.delayed(const Duration(milliseconds: 300));
    await _playAsset('audio/beep_short.wav');
    await Future.delayed(const Duration(milliseconds: 300));
    await _playAsset('audio/beep_short.wav');
  }

  Future<void> playFragileAlert() async {
    await _playAsset('audio/beep_short.wav');
    await Future.delayed(const Duration(milliseconds: 600));
    await _playAsset('audio/beep_short.wav');
  }

  Future<void> playOrderComplete() async {
    for (int i = 0; i < 4; i++) {
      await _playAsset('audio/beep_short.wav');
      await Future.delayed(const Duration(milliseconds: 150));
    }
  }

  Future<void> playBatteryLow() async {
    await _playAsset('audio/beep_long.wav');
    await Future.delayed(const Duration(milliseconds: 1200));
    await _playAsset('audio/beep_long.wav');
  }

  void dispose() {
    _player.dispose();
  }
}
