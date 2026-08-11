import 'package:nfc_manager/nfc_manager.dart';
import 'package:nfc_manager/platform_tags.dart';

class NfcService {
  Future<bool> isSupported() async {
    return await NfcManager.instance.checkAvailability();
  }

  Future<String?> readTag() async {
    String? result;
    bool isAvailable = await NfcManager.instance.checkAvailability();
    if (!isAvailable) return null;

    try {
      NfcManager.instance.startSession(
        pollingOptions: {
          NfcPollingOption.iso14443,
          NfcPollingOption.iso15693,
          NfcPollingOption.iso18092,
        },
        onDiscovered: (NfcTag tag) async {
          final ndef = Ndef.from(tag);
          if (ndef != null && ndef.cachedMessage != null) {
            final records = ndef.cachedMessage!.records;
            if (records.isNotEmpty) {
              final record = records.first;
              result = String.fromCharCodes(record.payload);
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
    bool isAvailable = await NfcManager.instance.checkAvailability();
    if (!isAvailable) return false;

    try {
      NfcManager.instance.startSession(
        pollingOptions: {
          NfcPollingOption.iso14443,
          NfcPollingOption.iso15693,
          NfcPollingOption.iso18092,
        },
        onDiscovered: (NfcTag tag) async {
          final ndef = Ndef.from(tag);
          if (ndef != null && ndef.isWritable) {
            final record = NdefRecord.createUri(Uri.parse(uri));
            final message = NdefMessage([record]);
            await ndef.write(message);
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
