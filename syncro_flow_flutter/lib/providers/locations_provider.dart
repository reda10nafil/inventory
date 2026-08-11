import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/location.dart';
import 'storage_provider.dart';

const String _locationsStorageKey = 'furinventory_locations';

final defaultLocations = [
  const Location(id: 'magazzino', label: 'Magazzino', color: Color(0xFF3B82F6)),
  const Location(id: 'vetrina', label: 'Vetrina', color: Color(0xFFD4AF37)),
  const Location(id: 'stand_a', label: 'Stand A', color: Color(0xFF10B981)),
  const Location(id: 'stand_b', label: 'Stand B', color: Color(0xFF10B981)),
  const Location(id: 'stand_c', label: 'Stand C', color: Color(0xFF10B981)),
  const Location(id: 'sartoria', label: 'Sartoria', color: Color(0xFF8B5CF6)),
];

class LocationsNotifier extends Notifier<List<Location>> {
  @override
  List<Location> build() {
    final storage = ref.watch(storageServiceProvider);
    final raw = storage.getJson(_locationsStorageKey);
    if (raw != null && raw is List) {
      return raw
          .map((e) => Location.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return defaultLocations;
  }

  Future<void> _saveLocations() async {
    final storage = ref.read(storageServiceProvider);
    await storage.setJson(
      _locationsStorageKey,
      state.map((l) => l.toJson()).toList(),
    );
  }

  Future<void> addLocation(Location location) async {
    state = [...state, location];
    await _saveLocations();
  }

  Future<void> updateLocation(String id, Location updated) async {
    state = [
      for (final loc in state)
        if (loc.id == id) updated else loc
    ];
    await _saveLocations();
  }

  Future<void> deleteLocation(String id) async {
    state = state.where((l) => l.id != id).toList();
    await _saveLocations();
  }

  Future<void> resetToDefaults() async {
    state = defaultLocations;
    await _saveLocations();
  }

  Location? getLocation(String id) {
    try {
      return state.firstWhere((l) => l.id == id);
    } catch (_) {
      return null;
    }
  }
}

final locationsProvider =
    NotifierProvider<LocationsNotifier, List<Location>>(LocationsNotifier.new);
