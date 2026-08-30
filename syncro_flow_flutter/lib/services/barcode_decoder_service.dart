import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../widgets/file_stub.dart' if (dart.library.io) 'dart:io';

class BarcodeDecodeResult {
  final bool success;
  final String? data;
  final String? source;
  final String? error;

  const BarcodeDecodeResult({
    required this.success,
    this.data,
    this.source,
    this.error,
  });
}

class BarcodeDecoderService {
  /// Try QRServer API via file path (mobile/desktop only)
  static Future<BarcodeDecodeResult?> tryQRServer(String imagePath) async {
    if (kIsWeb) return null;
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('https://api.qrserver.com/v1/read-qr-code/'),
      );
      request.files.add(await http.MultipartFile.fromPath('file', imagePath));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty && data[0]['symbol'] != null) {
          final symbols = data[0]['symbol'] as List;
          if (symbols.isNotEmpty && symbols[0]['data'] != null) {
            final resultText = symbols[0]['data'].toString();
            if (resultText.isNotEmpty && resultText != 'null') {
              return BarcodeDecodeResult(
                success: true,
                data: resultText,
                source: 'qrserver',
              );
            }
          }
        }
      }
    } catch (_) {}
    return null;
  }

  /// Try ZXing online decoder API
  static Future<BarcodeDecodeResult?> tryZXing(String imagePath) async {
    if (kIsWeb) return null;
    try {
      final bytes = await File(imagePath).readAsBytes();
      final base64Image = base64Encode(bytes);
      final dataUrl = 'data:image/jpeg;base64,$base64Image';

      final response = await http.post(
        Uri.parse('https://zxing.org/w/decode'),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'f=${Uri.encodeComponent(dataUrl)}',
      );

      if (response.statusCode == 200) {
        final html = response.body;

        final RegExp rawTextRegex = RegExp(r'Raw\s+text:?[\s\S]*?<pre[^>]*>(.*?)<\/pre>', caseSensitive: false);
        final match = rawTextRegex.firstMatch(html);
        if (match != null && match.group(1) != null) {
          final clean = match.group(1)!.replaceAll(RegExp(r'<[^>]+>'), '').trim();
          if (clean.isNotEmpty) {
            return BarcodeDecodeResult(
              success: true,
              data: clean,
              source: 'zxing',
            );
          }
        }
      }
    } catch (_) {}
    return null;
  }

  /// Try QRServer API via bytes (web + mobile)
  static Future<BarcodeDecodeResult?> tryQRServerBytes(Uint8List bytes, {String filename = 'image.jpg'}) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('https://api.qrserver.com/v1/read-qr-code/'),
      );
      request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty && data[0]['symbol'] != null) {
          final symbols = data[0]['symbol'] as List;
          if (symbols.isNotEmpty && symbols[0]['data'] != null) {
            final resultText = symbols[0]['data'].toString();
            if (resultText.isNotEmpty && resultText != 'null') {
              return BarcodeDecodeResult(success: true, data: resultText, source: 'qrserver');
            }
          }
        }
        // Check error field from API
        if (data.isNotEmpty && data[0]['symbol'] != null) {
          final sym = (data[0]['symbol'] as List).isNotEmpty ? (data[0]['symbol'] as List)[0] : null;
          if (sym != null && sym['error'] != null) {
            return BarcodeDecodeResult(success: false, error: sym['error'].toString());
          }
        }
      }
    } catch (_) {}
    return null;
  }

  /// Decode from bytes (universal — works on Web and mobile)
  static Future<BarcodeDecodeResult> decodeBytes(Uint8List bytes, {String filename = 'image.jpg'}) async {
    final qrResult = await tryQRServerBytes(bytes, filename: filename);
    if (qrResult != null && qrResult.success) return qrResult;
    // Fallback: tryZXing via base64 dataUrl (mobile only, needs File but we have bytes)
    try {
      final base64Image = base64Encode(bytes);
      final dataUrl = 'data:image/jpeg;base64,$base64Image';
      final response = await http.post(
        Uri.parse('https://zxing.org/w/decode'),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'f=${Uri.encodeComponent(dataUrl)}',
      );
      if (response.statusCode == 200) {
        final html = response.body;
        final RegExp rawTextRegex = RegExp(r'Raw\s+text:?[\s\S]*?<pre[^>]*>(.*?)<\/pre>', caseSensitive: false);
        final match = rawTextRegex.firstMatch(html);
        if (match != null && match.group(1) != null) {
          final clean = match.group(1)!.replaceAll(RegExp(r'<[^>]+>'), '').trim();
          if (clean.isNotEmpty) return BarcodeDecodeResult(success: true, data: clean, source: 'zxing');
        }
      }
    } catch (_) {}
    return const BarcodeDecodeResult(success: false, error: 'Nessun codice trovato nell\'immagine. Assicurati che sia ben visibile e nitida.');
  }

  /// Decode barcode/QR code from image file path (legacy — mobile only)
  static Future<BarcodeDecodeResult> decodeImage(String imagePath) async {
    if (kIsWeb) {
      // Su Web imagePath è blob: — prova a leggere via File stub (sarà vuoto)
      // Il chiamante dovrebbe usare decodeBytes con XFile.readAsBytes()
      return const BarcodeDecodeResult(
        success: false,
        error: 'Usa decodeBytes su Web (XFile bytes).',
      );
    }
    final qrResult = await tryQRServer(imagePath);
    if (qrResult != null && qrResult.success) return qrResult;
    final zxingResult = await tryZXing(imagePath);
    if (zxingResult != null && zxingResult.success) return zxingResult;
    // Ultimo tentativo: leggi bytes localmente e riprova via bytes
    try {
      final bytes = await File(imagePath).readAsBytes();
      return await decodeBytes(Uint8List.fromList(bytes));
    } catch (_) {}
    return const BarcodeDecodeResult(success: false, error: 'Nessun codice trovato nell\'immagine. Assicurati che sia ben visibile e nitida.');
  }
}
