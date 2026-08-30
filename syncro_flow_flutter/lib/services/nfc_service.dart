import 'dart:async';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:nfc_manager/platform_tags.dart';

/// NFC Service with real read/write/clean operations using nfc_manager.
/// Replaces the previous stub implementation that only checked availability
/// without performing actual NDEF operations.
class NfcService {
  /// Check if NFC hardware is available and enabled
  Future<bool> isSupported() async {
    try {
      return await NfcManager.instance.isAvailable();
    } catch (_) {
      return false;
    }
  }

  /// Alias for isSupported
  Future<bool> isNfcAvailable() => isSupported();

  /// Read NDEF data from an NFC tag.
  /// Returns the text/URI payload, or the tag identifier if no NDEF data found.
  Future<String?> readTag() async {
    if (!await isSupported()) return null;
    final completer = Completer<String?>();

    try {
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          try {
            final ndef = Ndef.from(tag);
            if (ndef != null) {
              final message = await ndef.read();
              if (message.records.isNotEmpty) {
                final record = message.records.first;
                final payload = _decodeNdefRecord(record);
                if (!completer.isCompleted) completer.complete(payload);
                await NfcManager.instance.stopSession(alertMessage: 'Tag letto con successo!');
                return;
              }
            }

            // Fallback: return tag identifier
            final nfcA = NfcA.from(tag);
            if (nfcA != null) {
              final id = nfcA.identifier
                  .map((e) => e.toRadixString(16).padLeft(2, '0'))
                  .join(':')
                  .toUpperCase();
              if (!completer.isCompleted) completer.complete(id);
              await NfcManager.instance.stopSession(alertMessage: 'ID Tag: $id');
              return;
            }

            if (!completer.isCompleted) completer.complete(null);
            await NfcManager.instance.stopSession(errorMessage: 'Nessun dato NDEF trovato');
          } catch (e) {
            if (!completer.isCompleted) completer.complete(null);
            await NfcManager.instance.stopSession(errorMessage: 'Errore lettura: $e');
          }
        },
        onError: (error) async {
          if (!completer.isCompleted) completer.complete(null);
        },
      );
    } catch (e) {
      if (!completer.isCompleted) completer.complete(null);
    }

    return completer.future;
  }

  /// Write a GS1 URI (or any URI) to an NFC tag as an NDEF URI record.
  /// Gestisce anche tag Mifare grezzi via NdefFormatable (formatta + scrive).
  Future<bool> writeGS1Uri(String uri) async {
    if (!await isSupported()) return false;
    final completer = Completer<bool>();

    try {
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          try {
            final ndef = Ndef.from(tag);
            // Usa toString senza ulteriore encode per preservare prefix URI
            final message = NdefMessage([NdefRecord.createUri(Uri.parse(uri.toString()))]);

            if (ndef != null) {
              if (!ndef.isWritable) {
                if (!completer.isCompleted) completer.complete(false);
                await NfcManager.instance.stopSession(errorMessage: 'Tag protetto da scrittura');
                return;
              }
              if (message.byteLength > ndef.maxSize) {
                if (!completer.isCompleted) completer.complete(false);
                await NfcManager.instance.stopSession(errorMessage: 'Tag troppo piccolo: ${message.byteLength} bytes necessari, ${ndef.maxSize} disponibili');
                return;
              }
              await ndef.write(message);
              if (!completer.isCompleted) completer.complete(true);
              await NfcManager.instance.stopSession(alertMessage: 'URI scritto con successo!');
              return;
            }
            // Fallback: NdefFormatable per tag vergini Mifare
            final fmt = NdefFormatable.from(tag);
            if (fmt != null) {
              await fmt.format(message);
              if (!completer.isCompleted) completer.complete(true);
              await NfcManager.instance.stopSession(alertMessage: 'Tag formattato e URI scritto!');
              return;
            }
            if (!completer.isCompleted) completer.complete(false);
            await NfcManager.instance.stopSession(errorMessage: 'Tag non supporta NDEF');
          } catch (e) {
            if (!completer.isCompleted) completer.complete(false);
            await NfcManager.instance.stopSession(errorMessage: 'Errore scrittura: $e');
          }
        },
        onError: (error) async {
          if (!completer.isCompleted) completer.complete(false);
        },
      );
    } catch (e) {
      if (!completer.isCompleted) completer.complete(false);
    }

    return completer.future;
  }

  /// Write a text payload to an NFC tag as an NDEF Text record.
  /// Gestisce anche Mifare grezzo via NdefFormatable.
  Future<bool> writeNfcTag(String data) async {
    if (!await isSupported()) return false;
    final completer = Completer<bool>();

    try {
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          try {
            final ndef = Ndef.from(tag);
            final message = NdefMessage([NdefRecord.createText(data)]);

            if (ndef != null) {
              if (!ndef.isWritable) {
                if (!completer.isCompleted) completer.complete(false);
                await NfcManager.instance.stopSession(errorMessage: 'Tag protetto da scrittura');
                return;
              }
              if (message.byteLength > ndef.maxSize) {
                if (!completer.isCompleted) completer.complete(false);
                await NfcManager.instance.stopSession(errorMessage: 'Dati troppo grandi per questo tag');
                return;
              }
              await ndef.write(message);
              if (!completer.isCompleted) completer.complete(true);
              await NfcManager.instance.stopSession(alertMessage: 'Tag scritto con successo!');
              return;
            }
            final fmt = NdefFormatable.from(tag);
            if (fmt != null) {
              await fmt.format(message);
              if (!completer.isCompleted) completer.complete(true);
              await NfcManager.instance.stopSession(alertMessage: 'Tag formattato e scritto!');
              return;
            }
            if (!completer.isCompleted) completer.complete(false);
            await NfcManager.instance.stopSession(errorMessage: 'Tag non NDEF e non formattabile');
          } catch (e) {
            if (!completer.isCompleted) completer.complete(false);
            await NfcManager.instance.stopSession(errorMessage: 'Errore scrittura: $e');
          }
        },
        onError: (error) async {
          if (!completer.isCompleted) completer.complete(false);
        },
      );
    } catch (e) {
      if (!completer.isCompleted) completer.complete(false);
    }

    return completer.future;
  }

  /// Erase/clean an NFC tag by writing an empty NDEF message.
  /// Se il tag non è NDEF formattato (es. Mifare Classic raw), prova a formattarlo via NdefFormatable.
  Future<bool> cleanTag() async {
    if (!await isSupported()) return false;
    final completer = Completer<bool>();

    try {
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          try {
            final ndef = Ndef.from(tag);
            if (ndef != null) {
              if (!ndef.isWritable) {
                if (!completer.isCompleted) completer.complete(false);
                await NfcManager.instance.stopSession(errorMessage: 'Tag protetto da scrittura');
                return;
              }
              final message = NdefMessage([NdefRecord.createText('')]);
              await ndef.write(message);
              if (!completer.isCompleted) completer.complete(true);
              await NfcManager.instance.stopSession(alertMessage: 'Tag cancellato e formattato NDEF!');
              return;
            }
            // Fallback: prova NdefFormatable (formatta il tag Mifare/Classic grezzo)
            final ndefFormatable = NdefFormatable.from(tag);
            if (ndefFormatable != null) {
              // Format richiede un messaggio iniziale — usiamo empty
              await ndefFormatable.format(NdefMessage([NdefRecord.createText('')]));
              if (!completer.isCompleted) completer.complete(true);
              await NfcManager.instance.stopSession(alertMessage: 'Tag formattato NDEF con successo!');
              return;
            }
            if (!completer.isCompleted) completer.complete(false);
            await NfcManager.instance.stopSession(errorMessage: 'Tag non NDEF e non formattabile');
          } catch (e) {
            if (!completer.isCompleted) completer.complete(false);
            await NfcManager.instance.stopSession(errorMessage: 'Errore cancellazione: $e');
          }
        },
        onError: (error) async {
          if (!completer.isCompleted) completer.complete(false);
        },
      );
    } catch (e) {
      if (!completer.isCompleted) completer.complete(false);
    }

    return completer.future;
  }

  /// Lettura dettagliata avanzata stile NFC Tools: UID, ATQA, SAK, tecnologie, memoria, NDEF payload.
  /// Ritorna mappa con chiavi: identifier, atqa, sak, techList, ndefInfo, payload, isWritable, maxSize, canMakeReadOnly, tagType
  Future<Map<String, dynamic>?> readTagDetailed() async {
    if (!await isSupported()) return null;
    final completer = Completer<Map<String, dynamic>?>();
    try {
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          try {
            final Map<String, dynamic> info = {};
            // Raw tag data
            final tagData = tag.data;
            // Identifier via NfcA / generic
            String identifier = 'N/D';
            List<String> techList = [];
            String atqa = 'N/D';
            String sak = 'N/D';
            String tagType = 'Sconosciuto';

            final nfcA = NfcA.from(tag);
            if (nfcA != null) {
              identifier = nfcA.identifier.map((e) => e.toRadixString(16).padLeft(2, '0')).join(':').toUpperCase();
              // atqa = byte array 2 bytes
              if (nfcA.atqa.isNotEmpty) {
                atqa = '0x${nfcA.atqa.map((b) => b.toRadixString(16).padLeft(2, '0')).join('')}';
              }
              sak = '0x${nfcA.sak.toRadixString(16).padLeft(2, '0')}';
              techList.add('NfcA');
              // SAK hints for Mifare Classic vs NTAG
              if (sak == '0x08') tagType = 'NXP - Mifare Classic 1k';
              if (sak == '0x00') tagType = 'NTAG / ISO 14443-3A';
            }
            // Detect other techs from raw data
            if (tagData.containsKey('mifareclassic')) techList.add('MifareClassic');
            if (tagData.containsKey('ndef')) techList.add('Ndef');
            if (tagData.containsKey('ndefformatable')) techList.add('NdefFormatable');
            if (tagData.containsKey('nfca')) techList.add('NfcA');
            if (tagData['mifareclassic'] != null) {
              final mc = tagData['mifareclassic'] as Map;
              // size info if available
              info['mifareSize'] = mc['size']?.toString() ?? '1024';
            }

            // NDEF info
            String payload = '';
            bool isWritable = false;
            int maxSize = 0;
            bool canMakeReadOnly = false;
            String ndefType = 'N/D';
            final ndef = Ndef.from(tag);
            if (ndef != null) {
              isWritable = ndef.isWritable;
              maxSize = ndef.maxSize;
              // nfc_manager 3.3.0 non espone canMakeReadOnly su tutte le piattaforme — usiamo false sicuro
              try {
                canMakeReadOnly = (ndef as dynamic).canMakeReadOnly as bool? ?? false;
              } catch (_) {
                canMakeReadOnly = false;
              }
              try {
                final msg = await ndef.read();
                if (msg.records.isNotEmpty) {
                  payload = _decodeNdefRecord(msg.records.first) ?? '';
                  ndefType = msg.records.first.type.isNotEmpty ? String.fromCharCodes(msg.records.first.type) : 'Text';
                }
              } catch (_) {}
              // Cache additional info
              info['ndefCachedMessage'] = payload;
            }
            // Try read payload if not yet
            if (payload.isEmpty) {
              final ndefLocal = Ndef.from(tag);
              if (ndefLocal != null) {
                try {
                  final msg = await ndefLocal.read();
                  if (msg.records.isNotEmpty) payload = _decodeNdefRecord(msg.records.first) ?? '';
                } catch (_) {}
              }
            }
            if (payload.isEmpty && nfcA != null) {
              // fallback to UID as payload
              payload = identifier;
            }

            info['identifier'] = identifier;
            info['atqa'] = atqa;
            info['sak'] = sak;
            info['tagType'] = tagType;
            info['techList'] = techList.isEmpty ? ['NfcA'] : techList;
            info['isWritable'] = isWritable;
            info['maxSize'] = maxSize;
            info['canMakeReadOnly'] = canMakeReadOnly;
            info['payload'] = payload;
            info['ndefType'] = ndefType;
            // Memory estimate: try to infer from maxSize or mifareSize
            int totalBytes = maxSize > 0 ? maxSize : 716;
            int usedBytes = payload.length;
            info['totalBytes'] = totalBytes;
            info['usedBytes'] = usedBytes;

            if (!completer.isCompleted) completer.complete(info);
            await NfcManager.instance.stopSession(alertMessage: 'Tag letto!');
          } catch (e) {
            if (!completer.isCompleted) completer.complete(null);
            await NfcManager.instance.stopSession(errorMessage: 'Errore: $e');
          }
        },
        onError: (err) async {
          if (!completer.isCompleted) completer.complete(null);
        },
      );
    } catch (_) {
      if (!completer.isCompleted) completer.complete(null);
    }
    return completer.future;
  }

  /// Start a continuous NFC session that calls [onDiscovered] for each tag found.
  /// Used by automations (quick-tag, scanner, etc.) for loop scanning.
  Future<void> startNfcSession(void Function(String) onDiscovered) async {
    if (!await isSupported()) return;

    try {
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          String? result;

          // Try to read NDEF data
          final ndef = Ndef.from(tag);
          if (ndef != null) {
            try {
              final message = await ndef.read();
              if (message.records.isNotEmpty) {
                result = _decodeNdefRecord(message.records.first);
              }
            } catch (_) {}
          }

          // Fallback: tag identifier
          if (result == null) {
            final nfcA = NfcA.from(tag);
            if (nfcA != null) {
              result = nfcA.identifier
                  .map((e) => e.toRadixString(16).padLeft(2, '0'))
                  .join(':')
                  .toUpperCase();
            }
          }

          if (result != null) {
            onDiscovered(result);
          }
        },
      );
    } catch (_) {}
  }

  /// Stop any active NFC session
  Future<void> stopNfcSession() => stopSession();

  /// Stop any active NFC session
  Future<void> stopSession() async {
    try {
      await NfcManager.instance.stopSession();
    } catch (_) {}
  }

  /// Public wrapper for decoding (usato dal listener globale)
  static String? decodeRecord(NdefRecord record) => _decodeNdefRecord(record);

  /// Decode an NDEF record payload to a human-readable string.
  /// Handles URI records (TNF 0x01 / type 'U') and Text records (TNF 0x01 / type 'T').
  static String? _decodeNdefRecord(NdefRecord record) {
    // URI record
    if (record.typeNameFormat == NdefTypeNameFormat.nfcWellknown &&
        record.type.length == 1 &&
        record.type[0] == 0x55) {
      // First byte is the URI identifier code
      const uriPrefixes = [
        '', 'http://www.', 'https://www.', 'http://', 'https://',
        'tel:', 'mailto:', 'ftp://anonymous:anonymous@', 'ftp://ftp.',
        'ftps://', 'sftp://', 'smb://', 'nfs://', 'ftp://', 'dav://',
        'news:', 'telnet://', 'imap:', 'rtsp://', 'urn:', 'pop:',
        'sip:', 'sips:', 'tftp:', 'btspp://', 'btl2cap://', 'btgoep://',
        'tcpobex://', 'irdaobex://', 'file://', 'urn:epc:id:', 'urn:epc:tag:',
        'urn:epc:pat:', 'urn:epc:raw:', 'urn:epc:', 'urn:nfc:',
      ];
      final prefixIndex = record.payload[0];
      final prefix = prefixIndex < uriPrefixes.length ? uriPrefixes[prefixIndex] : '';
      return prefix + String.fromCharCodes(record.payload.sublist(1));
    }

    // Text record
    if (record.typeNameFormat == NdefTypeNameFormat.nfcWellknown &&
        record.type.length == 1 &&
        record.type[0] == 0x54) {
      final languageCodeLength = record.payload[0] & 0x3F;
      return String.fromCharCodes(record.payload.sublist(1 + languageCodeLength));
    }

    // Generic fallback
    if (record.payload.isNotEmpty) {
      try {
        return String.fromCharCodes(record.payload);
      } catch (_) {
        return record.payload
            .map((e) => e.toRadixString(16).padLeft(2, '0'))
            .join(':');
      }
    }

    return null;
  }
}
