import 'dart:typed_data';
import 'package:nfc_manager/nfc_manager.dart';

class NfcService {
  static Future<bool> isSupported() async {
    try {
      return await NfcManager.instance.isAvailable();
    } catch (_) {
      return false;
    }
  }

  static Future<void> start() async {
    try {
      await NfcManager.instance.startSession();
    } catch (_) {}
  }

  static Future<void> stop() async {
    try {
      await NfcManager.instance.stopSession();
    } catch (_) {}
  }

  /// Read an NFC tag and return decoded URI or text.
  static Future<String?> readTag({String alertMessage = 'Avvicina il tag NFC da scansionare'}) async {
    String? tagValue;
    try {
      await NfcManager.instance.startSession(
        alertMessage: alertMessage,
        onDiscovered: (NfcTag tag) async {
          final ndef = Ndef.from(tag);
          if (ndef == null || ndef.cachedMessage == null) {
            await NfcManager.instance.stopSession(errorMessage: 'Tag non NDEF');
            return;
          }
          final records = ndef.cachedMessage!.records;
          if (records.isEmpty) {
            await NfcManager.instance.stopSession(errorMessage: 'Tag vuoto');
            return;
          }
          final record = records.first;
          final payload = record.payload;
          tagValue = _decodePayload(payload, record.typeNameFormat);
          await NfcManager.instance.stopSession(alertMessage: 'Tag letto con successo!');
        },
      );
    } catch (_) {
      try { await NfcManager.instance.stopSession(); } catch (_) {}
    }
    return tagValue;
  }

  /// Clean (reset) an NFC tag by writing an empty NDEF record.
  static Future<bool> cleanTag({String alertMessage = 'Avvicina il tag NFC per pulirlo'}) async {
    var result = false;
    try {
      await NfcManager.instance.startSession(
        alertMessage: alertMessage,
        onDiscovered: (NfcTag tag) async {
          final ndef = Ndef.from(tag);
          if (ndef == null) {
            await NfcManager.instance.stopSession(errorMessage: 'Tag non NDEF');
            return;
          }
          final emptyRecord = NdefRecord(
            typeNameFormat: NdefTypeNameFormat.empty,
            type: Uint8List(0),
            identifier: Uint8List(0),
            payload: Uint8List(0),
          );
          final message = NdefMessage([emptyRecord]);
          await ndef.write(message);
          result = true;
          await NfcManager.instance.stopSession(alertMessage: 'Tag pulito con successo!');
        },
      );
    } catch (_) {
      try { await NfcManager.instance.stopSession(); } catch (_) {}
    }
    return result;
  }

  /// Write a GS1 Digital Link URI to an NFC tag.
  static Future<bool> writeGS1Uri(String uri, {String alertMessage = 'Avvicina il tag NFC per registrare il prodotto'}) async {
    var result = false;
    try {
      await NfcManager.instance.startSession(
        alertMessage: alertMessage,
        onDiscovered: (NfcTag tag) async {
          final ndef = Ndef.from(tag);
          if (ndef == null) {
            await NfcManager.instance.stopSession(errorMessage: 'Tag non NDEF');
            return;
          }
          final uriRecord = NdefRecord.createUri(uri);
          final message = NdefMessage([uriRecord]);
          await ndef.write(message);
          result = true;
          await NfcManager.instance.stopSession(alertMessage: 'Prodotto registrato sul tag!');
        },
      );
    } catch (_) {
      try { await NfcManager.instance.stopSession(); } catch (_) {}
    }
    return result;
  }

  static String? _decodePayload(Uint8List payload, NdefTypeNameFormat tnf) {
    try {
      if (tnf == NdefTypeNameFormat.nfcWellKnown) {
        // URI record: first byte is URI prefix code
        if (payload.isNotEmpty) {
          final prefixCode = payload[0];
          const prefixes = [
            '', 'http://www.', 'https://www.', 'http://', 'https://',
            'tel:', 'mailto:', 'ftp://', 'ftp://', 'ftp://', 'smb://',
            'nfs://', 'ftp://', 'dav://', 'news:', 'telnet://', 'imap:',
            'rtsp://', 'urn:', 'pop:', 'sip:', 'sips://', 'tftp://',
          ];
          final prefix = prefixCode < prefixes.length ? prefixes[prefixCode] : '';
          final rest = String.fromCharCodes(payload.sublist(1));
          return '$prefix$rest';
        }
      } else if (tnf == NdefTypeNameFormat.media || tnf == NdefTypeNameFormat.absoluteUri) {
        return String.fromCharCodes(payload);
      } else {
        return String.fromCharCodes(payload);
      }
    } catch (_) {}
    return null;
  }
}
