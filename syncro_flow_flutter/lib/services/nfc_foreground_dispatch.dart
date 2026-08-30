import 'package:flutter/services.dart';

class NfcForegroundDispatch {
  static const _channel = MethodChannel('nfc_dispatch_channel');

  static Future<void> enable() async {
    try {
      await _channel.invokeMethod('startForegroundDispatch');
    } catch (_) {}
  }

  static Future<void> disable() async {
    try {
      await _channel.invokeMethod('stopForegroundDispatch');
    } catch (_) {}
  }
}
