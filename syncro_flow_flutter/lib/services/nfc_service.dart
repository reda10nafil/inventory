import 'package:nfc_manager/nfc_manager.dart';

class NfcService {
  Future<bool> isSupported() async {
    final availability = await NfcManager.instance.checkAvailability();
    return availability == NfcAvailability.available;
  }

  Future<String?> readTag() async {
    String? result;
    final availability = await NfcManager.instance.checkAvailability();
    if (availability != NfcAvailability.available) return null;

    try {
      NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          final ndef = tag.data['ndef'];
          if (ndef != null && ndef['cachedMessage'] != null) {
            final records = ndef['cachedMessage']['records'];
            if (records is List && records.isNotEmpty) {
              final record = records.first;
              final payload = record['payload'] as List<int>?;
              if (payload != null) {
                result = String.fromCharCodes(payload);
              }
            }
          }
          await NfcManager.instance.stopSession();
        },
      );
    } catch (e) {
      await NfcManager.instance.stopSession();
    }
    return result;
  }

  Future<bool> writeGS1Uri(String uri) async {
    bool success = false;
    final availability = await NfcManager.instance.checkAvailability();
    if (availability != NfcAvailability.available) return false;

    try {
      NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          final ndef = tag.data['ndef'];
          if (ndef != null && ndef['isWritable'] == true) {
            success = true;
          }
          await NfcManager.instance.stopSession();
        },
      );
    } catch (e) {
      await NfcManager.instance.stopSession();
    }
    return success;
  }

  Future<void> stopSession() async {
    await NfcManager.instance.stopSession();
  }
}
