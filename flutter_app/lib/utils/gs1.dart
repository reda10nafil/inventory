import '../constants/config.dart';

class GS1Util {
  static String? validateGTIN(String? gtin) {
    if (gtin == null || gtin.trim().isEmpty) {
      return 'Il codice GTIN/EAN (SKU) è obbligatorio per generare il Digital Link GS1.';
    }
    return null;
  }

  static String generateSerial(String mode, int existingCount) {
    if (mode == 'progressive') {
      return '${existingCount + 1}'.padLeft(6, '0');
    }
    final ts = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
    final rand = DateTime.now().microseconds.toRadixString(36).substring(0, 6);
    return '${ts.toUpperCase()}-$rand'.toUpperCase();
  }

  static String generateGS1DigitalLink(
    GS1Config config,
    String gtin,
    int existingProductCount, {
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

  static String buildPreviewLink(GS1Config config) {
    final base = config.baseUrl.replaceAll(RegExp(r'/+$'), '');
    var uri = '$base/01/8001234567890';
    if (config.enableSerial) {
      uri += '/21/${config.serialMode == 'progressive' ? '000042' : 'M5X2K-A3B7'}';
    }
    if (config.enableLotto) {
      uri += '?10=LOTTO-2026A';
    }
    return uri;
  }

  /// Parse a GS1 Digital Link URI and extract components.
  static Map<String, String> parseGS1DigitalLink(String uri) {
    final result = <String, String>{};
    final regex = RegExp(r'/01/([^/]+)(?:/21/([^/?]+))?(?:\?10=([^&]+))?');
    final match = regex.firstMatch(uri);
    if (match != null) {
      if (match.group(1) != null) result['gtin'] = match.group(1)!;
      if (match.group(2) != null) result['serial'] = match.group(2)!;
      if (match.group(3) != null) result['lotto'] = match.group(3)!;
    }
    return result;
  }
}
