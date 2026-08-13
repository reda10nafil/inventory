import 'package:flutter/material.dart';

class FurType {
  final String id;
  final String label;
  const FurType({required this.id, required this.label});
}

class LocationItem {
  final String id;
  final String label;
  final Color color;
  const LocationItem({required this.id, required this.label, required this.color});
}

class FurTypes {
  static const List<FurType> all = [
    FurType(id: 'visone', label: 'Visone'),
    FurType(id: 'volpe', label: 'Volpe'),
    FurType(id: 'zibellino', label: 'Zibellino'),
    FurType(id: 'cincilla', label: 'Cincillà'),
    FurType(id: 'ermellino', label: 'Ermellino'),
    FurType(id: 'astrakan', label: 'Astrakan'),
    FurType(id: 'altro', label: 'Altro'),
  ];

  static String labelFor(String id) {
    for (final t in all) {
      if (t.id == id) return t.label;
    }
    return id;
  }
}

class Locations {
  static const List<LocationItem> all = [
    LocationItem(id: 'magazzino', label: 'Magazzino', color: Color(0xFF3B82F6)),
    LocationItem(id: 'vetrina', label: 'Vetrina', color: Color(0xFFD4AF37)),
    LocationItem(id: 'stand_a', label: 'Stand A', color: Color(0xFF10B981)),
    LocationItem(id: 'stand_b', label: 'Stand B', color: Color(0xFF10B981)),
    LocationItem(id: 'stand_c', label: 'Stand C', color: Color(0xFF10B981)),
    LocationItem(id: 'sartoria', label: 'Sartoria', color: Color(0xFF8B5CF6)),
  ];

  static LocationItem? byId(String id) {
    for (final l in all) {
      if (l.id == id) return l;
    }
    return null;
  }

  static String labelFor(String id) => byId(id)?.label ?? id;
  static Color colorFor(String id) => byId(id)?.color ?? const Color(0xFF9CA3AF);
}

const int dormantThresholdDays = 180;
const int promotionThresholdDays = 90;
