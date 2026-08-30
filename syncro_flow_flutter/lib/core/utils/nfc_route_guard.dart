/// Guard per NFC globale: ritorna true se la rotta attuale deve sopprimere
/// la navigazione automatica su tag NFC (per non perdere stato form).
bool isNfcSuppressedRoute(String location) {
  return location.startsWith('/add') || location.startsWith('/settings');
}

/// Estrae SKU candidato da payload NFC (syncroflow://, https://, plain)
String extractSkuCandidate(String clean) {
  String skuCandidate = clean.trim();
  if (skuCandidate.startsWith('syncroflow://')) {
    final uri = Uri.tryParse(skuCandidate);
    if (uri != null && uri.pathSegments.isNotEmpty) {
      skuCandidate = uri.pathSegments.last;
    } else {
      skuCandidate = skuCandidate.split('/').last;
    }
  } else if (skuCandidate.startsWith('https://') || skuCandidate.startsWith('http://')) {
    final uri = Uri.tryParse(skuCandidate);
    if (uri != null && uri.pathSegments.isNotEmpty) {
      final last = uri.pathSegments.last;
      if (last.contains('SKU-')) {
        skuCandidate = last;
      } else {
        final m = RegExp(r'SKU-\d{4}-\d+').firstMatch(skuCandidate);
        if (m != null) skuCandidate = m.group(0)!;
      }
    }
  }
  return skuCandidate;
}
