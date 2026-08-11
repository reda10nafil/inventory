import 'custom_field.dart';

class LibraryModel {
  final String id;
  final String name;
  final String icon;
  final List<CustomField> fields;
  final DateTime createdAt;

  const LibraryModel({
    required this.id,
    required this.name,
    required this.icon,
    required this.fields,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'icon': icon,
      'fields': fields.map((f) => f.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory LibraryModel.fromJson(Map<String, dynamic> json) {
    return LibraryModel(
      id: json['id'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String? ?? 'folder',
      fields: (json['fields'] as List<dynamic>?)
              ?.map((f) => CustomField.fromJson(f as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  LibraryModel copyWith({
    String? id,
    String? name,
    String? icon,
    List<CustomField>? fields,
    DateTime? createdAt,
  }) {
    return LibraryModel(
      id: id ?? this.id,
      name: name ?? this.name,
      icon: icon ?? this.icon,
      fields: fields ?? this.fields,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
