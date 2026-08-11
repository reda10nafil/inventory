enum FieldDataType {
  number,
  currency,
  date,
  textShort,
  textLong,
  images,
  singleChoice,
  multiChoice,
  document,
}

enum FieldUIType {
  grid,
  stepper,
  segmented,
  text,
  gpsLink,
  date,
  images,
  picker,
  modalList,
  document,
}

class CustomField {
  final String id;
  final String name;
  final FieldDataType type;
  final FieldUIType uiType;
  final dynamic dataset;
  final String? unit;
  final String? icon;
  final List<dynamic>? options;
  final bool required;
  final int order;
  final bool? isSystem;
  final DateTime? deletedAt;
  final bool? isBarcode;
  final String? linkTo; // 'locations' | 'libraries' | 'furType'

  const CustomField({
    required this.id,
    required this.name,
    required this.type,
    required this.uiType,
    this.dataset,
    this.unit,
    this.icon,
    this.options,
    this.required = false,
    required this.order,
    this.isSystem,
    this.deletedAt,
    this.isBarcode,
    this.linkTo,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': _typeToString(type),
      'uiType': _uiTypeToString(uiType),
      if (dataset != null) 'dataset': dataset,
      if (unit != null) 'unit': unit,
      if (icon != null) 'icon': icon,
      if (options != null) 'options': options,
      'required': required,
      'order': order,
      if (isSystem != null) 'isSystem': isSystem,
      if (deletedAt != null) 'deletedAt': deletedAt!.toIso8601String(),
      if (isBarcode != null) 'isBarcode': isBarcode,
      if (linkTo != null) 'linkTo': linkTo,
    };
  }

  factory CustomField.fromJson(Map<String, dynamic> json) {
    return CustomField(
      id: json['id'] as String,
      name: json['name'] as String,
      type: _stringToType(json['type'] as String),
      uiType: _stringToUIType(json['uiType'] as String),
      dataset: json['dataset'],
      unit: json['unit'] as String?,
      icon: json['icon'] as String?,
      options: json['options'] as List<dynamic>?,
      required: json['required'] as bool? ?? false,
      order: (json['order'] as num?)?.toInt() ?? 0,
      isSystem: json['isSystem'] as bool?,
      deletedAt: json['deletedAt'] != null
          ? DateTime.tryParse(json['deletedAt'] as String)
          : null,
      isBarcode: json['isBarcode'] as bool?,
      linkTo: json['linkTo'] as String?,
    );
  }

  static String _typeToString(FieldDataType type) {
    switch (type) {
      case FieldDataType.number:
        return 'number';
      case FieldDataType.currency:
        return 'currency';
      case FieldDataType.date:
        return 'date';
      case FieldDataType.textShort:
        return 'text_short';
      case FieldDataType.textLong:
        return 'text_long';
      case FieldDataType.images:
        return 'images';
      case FieldDataType.singleChoice:
        return 'single_choice';
      case FieldDataType.multiChoice:
        return 'multi_choice';
      case FieldDataType.document:
        return 'document';
    }
  }

  static FieldDataType _stringToType(String str) {
    switch (str) {
      case 'number':
        return FieldDataType.number;
      case 'currency':
        return FieldDataType.currency;
      case 'date':
        return FieldDataType.date;
      case 'text_short':
        return FieldDataType.textShort;
      case 'text_long':
        return FieldDataType.textLong;
      case 'images':
        return FieldDataType.images;
      case 'single_choice':
        return FieldDataType.singleChoice;
      case 'multi_choice':
        return FieldDataType.multiChoice;
      case 'document':
        return FieldDataType.document;
      default:
        return FieldDataType.textShort;
    }
  }

  static String _uiTypeToString(FieldUIType uiType) {
    switch (uiType) {
      case FieldUIType.grid:
        return 'grid';
      case FieldUIType.stepper:
        return 'stepper';
      case FieldUIType.segmented:
        return 'segmented';
      case FieldUIType.text:
        return 'text';
      case FieldUIType.gpsLink:
        return 'gps-link';
      case FieldUIType.date:
        return 'date';
      case FieldUIType.images:
        return 'images';
      case FieldUIType.picker:
        return 'picker';
      case FieldUIType.modalList:
        return 'modal_list';
      case FieldUIType.document:
        return 'document';
    }
  }

  static FieldUIType _stringToUIType(String str) {
    switch (str) {
      case 'grid':
        return FieldUIType.grid;
      case 'stepper':
        return FieldUIType.stepper;
      case 'segmented':
        return FieldUIType.segmented;
      case 'text':
        return FieldUIType.text;
      case 'gps-link':
      case 'gpsLink':
        return FieldUIType.gpsLink;
      case 'date':
        return FieldUIType.date;
      case 'images':
        return FieldUIType.images;
      case 'picker':
        return FieldUIType.picker;
      case 'modal_list':
      case 'modalList':
        return FieldUIType.modalList;
      case 'document':
        return FieldUIType.document;
      default:
        return FieldUIType.text;
    }
  }

  CustomField copyWith({
    String? id,
    String? name,
    FieldDataType? type,
    FieldUIType? uiType,
    dynamic dataset,
    String? unit,
    String? icon,
    List<dynamic>? options,
    bool? required,
    int? order,
    bool? isSystem,
    DateTime? deletedAt,
    bool? isBarcode,
    String? linkTo,
  }) {
    return CustomField(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      uiType: uiType ?? this.uiType,
      dataset: dataset ?? this.dataset,
      unit: unit ?? this.unit,
      icon: icon ?? this.icon,
      options: options ?? this.options,
      required: required ?? this.required,
      order: order ?? this.order,
      isSystem: isSystem ?? this.isSystem,
      deletedAt: deletedAt ?? this.deletedAt,
      isBarcode: isBarcode ?? this.isBarcode,
      linkTo: linkTo ?? this.linkTo,
    );
  }
}
