import 'package:audioplayers/audioplayers.dart';

class SoundService {
  late final AudioPlayer _player;

  SoundService() {
    _player = AudioPlayer();
  }

  Future<void> _playAsset(String assetPath) async {
    try {
      await _player.stop();
      await _player.play(AssetSource(assetPath));
    } catch (e) {
      // Audio playback fallback
    }
  }

  Future<void> playSuccess() async {
    await _playAsset('audio/beep_short.wav');
  }

  Future<void> playAnomaly() async {
    await _playAsset('audio/beep_short.wav');
    await Future.delayed(const Duration(milliseconds: 300));
    await _playAsset('audio/beep_short.wav');
    await Future.delayed(const Duration(milliseconds: 300));
    await _playAsset('audio/beep_short.wav');
  }

  Future<void> playError() async {
    await _playAsset('audio/beep_long.wav');
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
