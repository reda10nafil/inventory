import 'package:uuid/uuid.dart';
import '../models/gs1_config.dart';

class GS1Service {
  static const Uuid _uuid = Uuid();

  /// Validate that GTIN/SKU is provided (AI 01 mandatory)
  static String? validateGTIN(String? gtin) {
    if (gtin == null || gtin.trim().isEmpty) {
      return 'Il codice GTIN/EAN (SKU) è obbligatorio per generare il Digital Link GS1.';
    }
    return null;
  }

  /// Generate serial number for AI 21
  static String generateSerial(SerialMode mode, [int existingCount = 0]) {
    if (mode == SerialMode.progressive) {
      return (existingCount + 1).toString().padLeft(6, '0');
    }
    final ts = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
    final rand = _uuid.v4().substring(0, 6);
    return '$ts-$rand'.toUpperCase();
  }

  /// Build GS1 Digital Link URI: {baseUrl}/01/{gtin}[/21/{serial}][?10={lotto}]
  static String generateGS1DigitalLink({
    required GS1Config config,
    required String gtin,
    int existingProductCount = 0,
    String? lottoValue,
  }) {
    final base = config.baseUrl.replaceAll(RegExp(r'/+$'), '');
    var uri = '$base/01/${Uri.encodeComponent(gtin.trim())}';

    if (config.enableSerial) {
      final serial = generateSerial(config.serialMode, existingProductCount);
      uri += '/21/${Uri.encodeComponent(serial)}';
    }

    if (config.enableLotto && lottoValue != null && lottoValue.trim().isNotEmpty) {
      uri += '?10=${Uri.encodeComponent(lottoValue.trim())}';
    }

    return uri;
  }

  /// Build sample preview link for settings page
  static String buildPreviewLink(GS1Config config) {
    final base = config.baseUrl.replaceAll(RegExp(r'/+$'), '').isNotEmpty
        ? config.baseUrl.replaceAll(RegExp(r'/+$'), '')
        : 'https://syncroflow.app/id';
    var uri = '$base/01/8001234567890';

    if (config.enableSerial) {
      uri += config.serialMode == SerialMode.progressive ? '/21/000042' : '/21/M5X2K-A3B7';
    }
    if (config.enableLotto) {
      uri += '?10=LOTTO-2026A';
    }
    return uri;
  }
}
