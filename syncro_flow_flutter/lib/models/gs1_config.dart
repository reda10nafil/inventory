enum SerialMode { uuid, progressive }

class GS1Config {
  final String baseUrl;
  final bool enableSerial;
  final SerialMode serialMode;
  final bool enableLotto;
  final String lottoFieldId;

  const GS1Config({
    this.baseUrl = 'https://syncroflow.app/id',
    this.enableSerial = true,
    this.serialMode = SerialMode.uuid,
    this.enableLotto = false,
    this.lottoFieldId = '',
  });

  Map<String, dynamic> toJson() {
    return {
      'baseUrl': baseUrl,
      'enableSerial': enableSerial,
      'serialMode': serialMode.name,
      'enableLotto': enableLotto,
      'lottoFieldId': lottoFieldId,
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
    );
  }

  GS1Config copyWith({
    String? baseUrl,
    bool? enableSerial,
    SerialMode? serialMode,
    bool? enableLotto,
    String? lottoFieldId,
  }) {
    return GS1Config(
      baseUrl: baseUrl ?? this.baseUrl,
      enableSerial: enableSerial ?? this.enableSerial,
      serialMode: serialMode ?? this.serialMode,
      enableLotto: enableLotto ?? this.enableLotto,
      lottoFieldId: lottoFieldId ?? this.lottoFieldId,
    );
  }
}
