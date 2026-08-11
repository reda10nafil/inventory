enum FieldSize { small, medium, full }

class LayoutField {
  final String id;
  final String type; // 'base' | 'custom' | 'section'
  final FieldSize size;
  final bool visible;
  final String? label;
  final String? icon;

  const LayoutField({
    required this.id,
    required this.type,
    required this.size,
    required this.visible,
    this.label,
    this.icon,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'size': size.name,
      'visible': visible,
      if (label != null) 'label': label,
      if (icon != null) 'icon': icon,
    };
  }

  factory LayoutField.fromJson(Map<String, dynamic> json) {
    FieldSize s = FieldSize.medium;
    if (json['size'] == 'small') {
      s = FieldSize.small;
    } else if (json['size'] == 'full') {
      s = FieldSize.full;
    }

    return LayoutField(
      id: json['id'] as String,
      type: json['type'] as String? ?? 'base',
      size: s,
      visible: json['visible'] as bool? ?? true,
      label: json['label'] as String?,
      icon: json['icon'] as String?,
    );
  }

  LayoutField copyWith({
    String? id,
    String? type,
    FieldSize? size,
    bool? visible,
    String? label,
    String? icon,
  }) {
    return LayoutField(
      id: id ?? this.id,
      type: type ?? this.type,
      size: size ?? this.size,
      visible: visible ?? this.visible,
      label: label ?? this.label,
      icon: icon ?? this.icon,
    );
  }
}

class LayoutConfig {
  final List<LayoutField> fields;
  final int version;

  const LayoutConfig({
    required this.fields,
    this.version = 3,
  });

  Map<String, dynamic> toJson() {
    return {
      'fields': fields.map((f) => f.toJson()).toList(),
      'version': version,
    };
  }

  factory LayoutConfig.fromJson(Map<String, dynamic> json) {
    return LayoutConfig(
      fields: (json['fields'] as List<dynamic>?)
              ?.map((f) => LayoutField.fromJson(f as Map<String, dynamic>))
              .toList() ??
          [],
      version: (json['version'] as num?)?.toInt() ?? 3,
    );
  }

  static const LayoutConfig defaultConfig = LayoutConfig(
    fields: [
      LayoutField(id: 'images', type: 'base', size: FieldSize.full, visible: true),
      LayoutField(
        id: 'section_prodotto',
        type: 'section',
        size: FieldSize.full,
        visible: true,
        label: 'DATI PRODOTTO',
      ),
      LayoutField(id: 'sku', type: 'base', size: FieldSize.medium, visible: true),
      LayoutField(id: 'furType', type: 'base', size: FieldSize.full, visible: true),
      LayoutField(id: 'location', type: 'base', size: FieldSize.medium, visible: true),
      LayoutField(id: 'folder', type: 'base', size: FieldSize.medium, visible: true),
      LayoutField(
        id: 'section_economici',
        type: 'section',
        size: FieldSize.full,
        visible: true,
        label: 'DATI ECONOMICI',
      ),
      LayoutField(id: 'purchasePrice', type: 'base', size: FieldSize.medium, visible: true),
      LayoutField(id: 'sellPrice', type: 'base', size: FieldSize.medium, visible: true),
      LayoutField(
        id: 'section_misure',
        type: 'section',
        size: FieldSize.full,
        visible: true,
        label: 'MISURE',
      ),
      LayoutField(id: 'length', type: 'base', size: FieldSize.small, visible: true),
      LayoutField(id: 'width', type: 'base', size: FieldSize.small, visible: true),
      LayoutField(id: 'weight', type: 'base', size: FieldSize.small, visible: true),
      LayoutField(
        id: 'section_note',
        type: 'section',
        size: FieldSize.full,
        visible: true,
        label: 'NOTE',
      ),
      LayoutField(id: 'technicalNotes', type: 'base', size: FieldSize.full, visible: true),
    ],
    version: 3,
  );
}
