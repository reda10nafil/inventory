import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/layout_config.dart';
import '../services/storage_service.dart';
import 'storage_provider.dart';

const String _layoutConfigStorageKey = 'furinventory_layout_config';

class LayoutNotifier extends StateNotifier<LayoutConfig> {
  final StorageService _storageService;

  LayoutNotifier(this._storageService) : super(LayoutConfig.defaultConfig) {
    _loadLayout();
  }

  void _loadLayout() {
    final raw = _storageService.getJson(_layoutConfigStorageKey);
    if (raw != null && raw is Map<String, dynamic>) {
      final parsed = LayoutConfig.fromJson(raw);
      if (parsed.version < LayoutConfig.defaultConfig.version) {
        state = LayoutConfig.defaultConfig;
        _saveLayout();
      } else {
        state = parsed;
      }
    }
  }

  Future<void> _saveLayout() async {
    await _storageService.setJson(_layoutConfigStorageKey, state.toJson());
  }

  Future<void> updateFieldOrder(List<LayoutField> fields) async {
    state = LayoutConfig(fields: fields, version: state.version);
    await _saveLayout();
  }

  Future<void> updateFieldSize(String fieldId, FieldSize size) async {
    final updated = state.fields.map((f) {
      if (f.id == fieldId) return f.copyWith(size: size);
      return f;
    }).toList();
    state = LayoutConfig(fields: updated, version: state.version);
    await _saveLayout();
  }

  Future<void> toggleFieldVisibility(String fieldId) async {
    final updated = state.fields.map((f) {
      if (f.id == fieldId) return f.copyWith(visible: !f.visible);
      return f;
    }).toList();
    state = LayoutConfig(fields: updated, version: state.version);
    await _saveLayout();
  }

  Future<void> addFieldToLayout(LayoutField field) async {
    if (state.fields.any((f) => f.id == field.id)) return;
    final updated = [...state.fields, field];
    state = LayoutConfig(fields: updated, version: state.version);
    await _saveLayout();
  }

  Future<void> removeFieldFromLayout(String fieldId) async {
    final updated = state.fields.where((f) => f.id != fieldId).toList();
    state = LayoutConfig(fields: updated, version: state.version);
    await _saveLayout();
  }

  Future<void> resetToDefault() async {
    state = LayoutConfig.defaultConfig;
    await _saveLayout();
  }

  List<LayoutField> get visibleFields =>
      state.fields.where((f) => f.visible).toList();
}

final layoutProvider =
    StateNotifierProvider<LayoutNotifier, LayoutConfig>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return LayoutNotifier(storage);
});
