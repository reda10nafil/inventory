import 'package:flutter/material.dart';

class Location {
  final String id;
  final String label;
  final Color color;
  final int? capacity;
  final String? barcode;
  final String? nfcTag;

  const Location({
    required this.id,
    required this.label,
    this.color = const Color(0xFF3B82F6),
    this.capacity,
    this.barcode,
    this.nfcTag,
  });

  String get name => label;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'color': '#${color.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}',
      if (capacity != null) 'capacity': capacity,
      if (barcode != null) 'barcode': barcode,
      if (nfcTag != null) 'nfcTag': nfcTag,
    };
  }

  factory Location.fromJson(Map<String, dynamic> json) {
    Color parsedColor = const Color(0xFF3B82F6);
    if (json['color'] != null) {
      final hexString = (json['color'] as String).replaceAll('#', '');
      final val = int.tryParse(hexString, radix: 16);
      if (val != null) {
        parsedColor = Color(0xFF000000 | val);
      }
    }
    return Location(
      id: json['id'] as String,
      label: json['label'] as String,
      color: parsedColor,
      capacity: json['capacity'] as int?,
      barcode: json['barcode'] as String?,
      nfcTag: json['nfcTag'] as String?,
    );
  }

  Location copyWith({
    String? id,
    String? label,
    Color? color,
    int? capacity,
    String? barcode,
    String? nfcTag,
  }) {
    return Location(
      id: id ?? this.id,
      label: label ?? this.label,
      color: color ?? this.color,
      capacity: capacity ?? this.capacity,
      barcode: barcode ?? this.barcode,
      nfcTag: nfcTag ?? this.nfcTag,
    );
  }
}
