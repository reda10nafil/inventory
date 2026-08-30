enum SerialMode { uuid, progressive }

class GS1Config {
  final String baseUrl;
  final bool enableSerial;
  final SerialMode serialMode;
  final bool enableLotto;
  final String lottoFieldId;
  final bool enableGS1; // master toggle: se false usa solo SKU, non apre Chrome

  const GS1Config({
    this.baseUrl = 'https://syncroflow.app/id',
    this.enableSerial = true,
    this.serialMode = SerialMode.uuid,
    this.enableLotto = false,
    this.lottoFieldId = '',
    this.enableGS1 = false, // default spento finché non hai sito
  });

  String get domain => baseUrl;
  bool get isEnabled => enableGS1 && baseUrl.isNotEmpty;

  Map<String, dynamic> toJson() {
    return {
      'baseUrl': baseUrl,
      'enableSerial': enableSerial,
      'serialMode': serialMode.name,
      'enableLotto': enableLotto,
      'lottoFieldId': lottoFieldId,
      'enableGS1': enableGS1,
    };
  }

  factory GS1Config.fromJson(Map<String, dynamic> json) {
    return GS1Config(
      baseUrl: json['baseUrl'] as String? ?? 'https://syncroflow.app/id',
      enableSerial: json['enableSerial'] as bool? ?? true,
      serialMode: json['serialMode'] == 'progressive'
          ? SerialMode.progressive
          : SerialMode.uuid,
      enableLotto: json['enableLotto'] as bool? ?? false,
      lottoFieldId: json['lottoFieldId'] as String? ?? '',
      enableGS1: json['enableGS1'] as bool? ?? false,
    );
  }

  GS1Config copyWith({
    String? baseUrl,
    bool? enableSerial,
    SerialMode? serialMode,
    bool? enableLotto,
    String? lottoFieldId,
    bool? enableGS1,
  }) {
    return GS1Config(
      baseUrl: baseUrl ?? this.baseUrl,
      enableSerial: enableSerial ?? this.enableSerial,
      serialMode: serialMode ?? this.serialMode,
      enableLotto: enableLotto ?? this.enableLotto,
      lottoFieldId: lottoFieldId ?? this.lottoFieldId,
      enableGS1: enableGS1 ?? this.enableGS1,
    );
  }
}
