enum StepType {
  scanProduct,
  scanLocation,
  moveTo,
  markSold,
  addTag,
  setField,
}

class StepTypeMeta {
  final String label;
  final String icon;
  final String color;

  const StepTypeMeta({
    required this.label,
    required this.icon,
    required this.color,
  });
}

class AutomationStepConfig {
  final String? locationId;
  final String? locationName;
  final String? tag;
  final String? fieldName;
  final String? fieldValue;
  final bool? pricePrompt;
  final bool? useLastScannedLocation;

  const AutomationStepConfig({
    this.locationId,
    this.locationName,
    this.tag,
    this.fieldName,
    this.fieldValue,
    this.pricePrompt,
    this.useLastScannedLocation,
  });

  Map<String, dynamic> toJson() {
    return {
      if (locationId != null) 'locationId': locationId,
      if (locationName != null) 'locationName': locationName,
      if (tag != null) 'tag': tag,
      if (fieldName != null) 'fieldName': fieldName,
      if (fieldValue != null) 'fieldValue': fieldValue,
      if (pricePrompt != null) 'pricePrompt': pricePrompt,
      if (useLastScannedLocation != null)
        'useLastScannedLocation': useLastScannedLocation,
    };
  }

  factory AutomationStepConfig.fromJson(Map<String, dynamic> json) {
    return AutomationStepConfig(
      locationId: json['locationId'] as String?,
      locationName: json['locationName'] as String?,
      tag: json['tag'] as String?,
      fieldName: json['fieldName'] as String?,
      fieldValue: json['fieldValue'] as String?,
      pricePrompt: json['pricePrompt'] as bool?,
      useLastScannedLocation: json['useLastScannedLocation'] as bool?,
    );
  }
}

class AutomationStep {
  final String id;
  final int order;
  final StepType type;
  final AutomationStepConfig config;
  final String label;

  const AutomationStep({
    required this.id,
    required this.order,
    required this.type,
    required this.config,
    required this.label,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order': order,
      'type': _stepTypeToString(type),
      'config': config.toJson(),
      'label': label,
    };
  }

  factory AutomationStep.fromJson(Map<String, dynamic> json) {
    return AutomationStep(
      id: json['id'] as String,
      order: (json['order'] as num?)?.toInt() ?? 0,
      type: _stringToStepType(json['type'] as String),
      config: AutomationStepConfig.fromJson(
        (json['config'] as Map<String, dynamic>?) ?? {},
      ),
      label: json['label'] as String? ?? '',
    );
  }

  static String _stepTypeToString(StepType type) {
    switch (type) {
      case StepType.scanProduct:
        return 'scan_product';
      case StepType.scanLocation:
        return 'scan_location';
      case StepType.moveTo:
        return 'move_to';
      case StepType.markSold:
        return 'mark_sold';
      case StepType.addTag:
        return 'add_tag';
      case StepType.setField:
        return 'set_field';
    }
  }

  static StepType _stringToStepType(String str) {
    switch (str) {
      case 'scan_product':
      case 'scanProduct':
        return StepType.scanProduct;
      case 'scan_location':
      case 'scanLocation':
        return StepType.scanLocation;
      case 'move_to':
      case 'moveTo':
        return StepType.moveTo;
      case 'mark_sold':
      case 'markSold':
        return StepType.markSold;
      case 'add_tag':
      case 'addTag':
        return StepType.addTag;
      case 'set_field':
      case 'setField':
        return StepType.setField;
      default:
        return StepType.scanProduct;
    }
  }
}

class CustomAutomation {
  final String id;
  final String name;
  final String icon;
  final String color;
  final String description;
  final String qrValue;
  final List<AutomationStep> steps;
  final DateTime createdAt;
  final DateTime? lastUsedAt;
  final int usageCount;

  const CustomAutomation({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.description,
    required this.qrValue,
    required this.steps,
    required this.createdAt,
    this.lastUsedAt,
    this.usageCount = 0,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'icon': icon,
      'color': color,
      'description': description,
      'qrValue': qrValue,
      'steps': steps.map((s) => s.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
      if (lastUsedAt != null) 'lastUsedAt': lastUsedAt!.toIso8601String(),
      'usageCount': usageCount,
    };
  }

  factory CustomAutomation.fromJson(Map<String, dynamic> json) {
    return CustomAutomation(
      id: json['id'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String? ?? 'auto_awesome',
      color: json['color'] as String? ?? '#3B82F6',
      description: json['description'] as String? ?? '',
      qrValue: json['qrValue'] as String? ?? '',
      steps: (json['steps'] as List<dynamic>?)
              ?.map((s) => AutomationStep.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: DateTime.parse(json['createdAt'] as String),
      lastUsedAt: json['lastUsedAt'] != null
          ? DateTime.tryParse(json['lastUsedAt'] as String)
          : null,
      usageCount: (json['usageCount'] as num?)?.toInt() ?? 0,
    );
  }

  CustomAutomation copyWith({
    String? id,
    String? name,
    String? icon,
    String? color,
    String? description,
    String? qrValue,
    List<AutomationStep>? steps,
    DateTime? createdAt,
    DateTime? lastUsedAt,
    int? usageCount,
  }) {
    return CustomAutomation(
      id: id ?? this.id,
      name: name ?? this.name,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      description: description ?? this.description,
      qrValue: qrValue ?? this.qrValue,
      steps: steps ?? this.steps,
      createdAt: createdAt ?? this.createdAt,
      lastUsedAt: lastUsedAt ?? this.lastUsedAt,
      usageCount: usageCount ?? this.usageCount,
    );
  }
}
