import 'package:flutter/material.dart';

class AppConfig {
  static const int dormantThresholdDays = 180; // 6 months
  static const int promotionThresholdDays = 90; // 3 months

  static const List<Map<String, dynamic>> locations = [
    {'id': 'magazzino', 'label': 'Magazzino', 'color': 0xFF3B82F6},
    {'id': 'vetrina', 'label': 'Vetrina', 'color': 0xFFD4AF37},
    {'id': 'stand_a', 'label': 'Stand A', 'color': 0xFF10B981},
    {'id': 'stand_b', 'label': 'Stand B', 'color': 0xFF10B981},
    {'id': 'stand_c', 'label': 'Stand C', 'color': 0xFF10B981},
    {'id': 'sartoria', 'label': 'Sartoria', 'color': 0xFF8B5CF6},
  ];

  static const List<Map<String, String>> furTypes = [
    {'id': 'visone', 'label': 'Visone'},
    {'id': 'volpe', 'label': 'Volpe'},
    {'id': 'zibellino', 'label': 'Zibellino'},
    {'id': 'cincilla', 'label': 'Cincillà'},
    {'id': 'ermellino', 'label': 'Ermellino'},
    {'id': 'astrakan', 'label': 'Astrakan'},
    {'id': 'altro', 'label': 'Altro'},
  ];

  static const List<Map<String, dynamic>> quickActions = [
    {'id': 'moved', 'label': 'SPOSTATO', 'icon': 'swap_horiz', 'color': 0xFF3B82F6},
    {'id': 'sold', 'label': 'VENDUTO', 'icon': 'sell', 'color': 0xFF10B981},
    {'id': 'details', 'label': 'DETTAGLI/MODIFICA', 'icon': 'edit', 'color': 0xFFD4AF37},
  ];
}

class ProductStatus {
  static const String available = 'available';
  static const String sold = 'sold';
  static const String archived = 'archived';
}

class ShareTypes {
  static const String client = 'client';
  static const String professional = 'professional';
}
