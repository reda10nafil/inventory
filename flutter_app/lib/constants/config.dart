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
  final String? barcode;
  final int? capacity;
  const LocationItem({required this.id, required this.label, required this.color, this.barcode, this.capacity});
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
    LocationItem(id: 'magazzino', label: 'Magazzino', color: Color(0xFF3B82F6), barcode: 'LOC-MAGAZZINO'),
    LocationItem(id: 'vetrina', label: 'Vetrina', color: Color(0xFFD4AF37), barcode: 'LOC-VETRINA'),
    LocationItem(id: 'stand_a', label: 'Stand A', color: Color(0xFF10B981), barcode: 'LOC-STAND-A'),
    LocationItem(id: 'stand_b', label: 'Stand B', color: Color(0xFF10B981), barcode: 'LOC-STAND-B'),
    LocationItem(id: 'stand_c', label: 'Stand C', color: Color(0xFF10B981), barcode: 'LOC-STAND-C'),
    LocationItem(id: 'sartoria', label: 'Sartoria', color: Color(0xFF8B5CF6), barcode: 'LOC-SARTORIA'),
  ];

  static LocationItem? byId(String id) {
    for (final l in all) {
      if (l.id == id) return l;
    }
    return null;
  }

  static LocationItem? byBarcode(String code) {
    for (final l in all) {
      if (l.barcode == code || l.id == code) return l;
    }
    return null;
  }

  static String labelFor(String id) => byId(id)?.label ?? id;
  static Color colorFor(String id) => byId(id)?.color ?? const Color(0xFF9CA3AF);
}

class QuickAction {
  final String id;
  final String label;
  final IconData icon;
  final Color color;
  const QuickAction({required this.id, required this.label, required this.icon, required this.color});
}

class QuickActions {
  static const List<QuickAction> all = [
    QuickAction(id: 'moved', label: 'SPOSTATO', icon: Icons.swap_horiz, color: Color(0xFF3B82F6)),
    QuickAction(id: 'sold', label: 'VENDUTO', icon: Icons.sell, color: Color(0xFF10B981)),
    QuickAction(id: 'details', label: 'DETTAGLI/MODIFICA', icon: Icons.edit, color: Color(0xFFD4AF37)),
  ];
}

const int dormantThresholdDays = 180;
const int promotionThresholdDays = 90;

class GS1Config {
  final String baseUrl;
  final bool enableSerial;
  final String serialMode; // 'uuid' | 'progressive'
  final bool enableLotto;
  final String lottoFieldId;

  const GS1Config({
    this.baseUrl = 'https://syncroflow.app/id',
    this.enableSerial = true,
    this.serialMode = 'uuid',
    this.enableLotto = false,
    this.lottoFieldId = '',
  });

  GS1Config copyWith({
    String? baseUrl, bool? enableSerial, String? serialMode,
    bool? enableLotto, String? lottoFieldId,
  }) => GS1Config(
    baseUrl: baseUrl ?? this.baseUrl,
    enableSerial: enableSerial ?? this.enableSerial,
    serialMode: serialMode ?? this.serialMode,
    enableLotto: enableLotto ?? this.enableLotto,
    lottoFieldId: lottoFieldId ?? this.lottoFieldId,
  );

  static const GS1Config defaults = GS1Config();
}
