import 'package:nfc_manager/nfc_manager.dart';

class NfcService {
  Future<bool> isSupported() async {
    try {
      final availability = await NfcManager.instance.checkAvailability();
      return availability == NfcAvailability.enabled;
    } catch (_) {
      return false;
    }
  }

  Future<String?> readTag() async {
    String? result;
    final available = await isSupported();
    if (!available) return null;

    try {
      await NfcManager.instance.startSession(
        pollingOptions: {NfcPollingOption.iso14443, NfcPollingOption.iso15693},
        onDiscovered: (NfcTag tag) async {
          final dynamic tagData = (tag as dynamic).data;
          if (tagData is Map) {
            final ndef = tagData['ndef'];
            if (ndef is Map && ndef['cachedMessage'] != null) {
              final records = ndef['cachedMessage']['records'];
              if (records is List && records.isNotEmpty) {
                final record = records.first;
                if (record is Map && record['payload'] is List<int>) {
                  result = String.fromCharCodes(record['payload'] as List<int>);
                }
              }
            }
          }
          await NfcManager.instance.stopSession();
        },
      );
    } catch (e) {
      try {
        await NfcManager.instance.stopSession();
      } catch (_) {}
    }
    return result;
  }

  Future<bool> writeGS1Uri(String uri) async {
    bool success = false;
    final available = await isSupported();
    if (!available) return false;

    try {
      await NfcManager.instance.startSession(
        pollingOptions: {NfcPollingOption.iso14443, NfcPollingOption.iso15693},
        onDiscovered: (NfcTag tag) async {
          final dynamic tagData = (tag as dynamic).data;
          if (tagData is Map) {
            final ndef = tagData['ndef'];
            if (ndef is Map && ndef['isWritable'] == true) {
              success = true;
            }
          }
          await NfcManager.instance.stopSession();
        },
      );
    } catch (e) {
      try {
        await NfcManager.instance.stopSession();
      } catch (_) {}
    }
    return success;
  }

  Future<bool> isNfcAvailable() => isSupported();

  Future<void> startNfcSession(void Function(String) onDiscovered) async {
    final available = await isSupported();
    if (!available) return;

    try {
      await NfcManager.instance.startSession(
        pollingOptions: {NfcPollingOption.iso14443, NfcPollingOption.iso15693},
        onDiscovered: (NfcTag tag) async {
          final dynamic tagData = (tag as dynamic).data;
          String? result;
          if (tagData is Map) {
            final ndef = tagData['ndef'];
            if (ndef is Map && ndef['cachedMessage'] != null) {
              final records = ndef['cachedMessage']['records'];
              if (records is List && records.isNotEmpty) {
                final record = records.first;
                if (record is Map && record['payload'] is List<int>) {
                  result = String.fromCharCodes(record['payload'] as List<int>);
                }
              }
            }
            if (result == null && tagData['identifier'] != null) {
              result = (tagData['identifier'] as List<int>)
                  .map((e) => e.toRadixString(16).padLeft(2, '0'))
                  .join(':');
            }
          }
          if (result != null) {
            onDiscovered(result);
          }
        },
      );
    } catch (_) {}
  }

  Future<void> stopNfcSession() => stopSession();

  Future<bool> writeNfcTag(String data) => writeGS1Uri(data);

  Future<void> stopSession() async {
    try {
      await NfcManager.instance.stopSession();
    } catch (_) {}
  }
}
