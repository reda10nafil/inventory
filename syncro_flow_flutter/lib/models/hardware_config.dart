enum ScanMode { nfcOnly, qrOnly, barcodeOnly, both }

class HardwareConfig {
  final ScanMode scanMode;
  final bool autoWriteNfcOnSave;

  const HardwareConfig({
    this.scanMode = ScanMode.both,
    this.autoWriteNfcOnSave = false,
  });

  bool get nfcEnabled => scanMode != ScanMode.qrOnly;
  bool get soundEnabled => true;

  Map<String, dynamic> toJson() {
    return {
      'scanMode': scanMode.name,
      'autoWriteNfcOnSave': autoWriteNfcOnSave,
    };
  }

  factory HardwareConfig.fromJson(Map<String, dynamic> json) {
    ScanMode mode = ScanMode.both;
    if (json['scanMode'] == 'nfc_only' || json['scanMode'] == 'nfcOnly') {
      mode = ScanMode.nfcOnly;
    } else if (json['scanMode'] == 'qr_only' || json['scanMode'] == 'qrOnly') {
      mode = ScanMode.qrOnly;
    }

    return HardwareConfig(
      scanMode: mode,
      autoWriteNfcOnSave: json['autoWriteNfcOnSave'] as bool? ?? false,
    );
  }

  HardwareConfig copyWith({
    ScanMode? scanMode,
    bool? autoWriteNfcOnSave,
  }) {
    return HardwareConfig(
      scanMode: scanMode ?? this.scanMode,
      autoWriteNfcOnSave: autoWriteNfcOnSave ?? this.autoWriteNfcOnSave,
    );
  }
}
