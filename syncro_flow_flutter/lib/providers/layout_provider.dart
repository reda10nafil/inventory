import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/layout_config.dart';
import 'storage_provider.dart';

const String _layoutConfigStorageKey = 'furinventory_layout_config';

class LayoutNotifier extends Notifier<LayoutConfig> {
  @override
  LayoutConfig build() {
    final storage = ref.watch(storageServiceProvider);
    final raw = storage.getJson(_layoutConfigStorageKey);
    if (raw != null && raw is Map<String, dynamic>) {
      final parsed = LayoutConfig.fromJson(raw);
      if (parsed.version < LayoutConfig.defaultConfig.version) {
        return LayoutConfig.defaultConfig;
      }
      return parsed;
    }
    return LayoutConfig.defaultConfig;
  }

  Future<void> _saveLayout() async {
    final storage = ref.read(storageServiceProvider);
    await storage.setJson(_layoutConfigStorageKey, state.toJson());
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
    NotifierProvider<LayoutNotifier, LayoutConfig>(LayoutNotifier.new);
