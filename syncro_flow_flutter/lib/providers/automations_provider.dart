import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/automation.dart';
import 'storage_provider.dart';

const String _automationsStorageKey = '@furinventory_custom_automations';

class AutomationsNotifier extends Notifier<List<CustomAutomation>> {
  @override
  List<CustomAutomation> build() {
    final storage = ref.watch(storageServiceProvider);
    final raw = storage.getJson(_automationsStorageKey);
    if (raw != null && raw is List) {
      return raw
          .map((e) => CustomAutomation.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<void> _saveAutomations() async {
    final storage = ref.read(storageServiceProvider);
    await storage.setJson(
      _automationsStorageKey,
      state.map((a) => a.toJson()).toList(),
    );
  }

  Future<CustomAutomation> addAutomation({
    required String name,
    required String icon,
    required String color,
    required String description,
    required List<AutomationStep> steps,
  }) async {
    final id =
        'auto_${DateTime.now().millisecondsSinceEpoch}_${(1000 + (9000 * (DateTime.now().microsecond / 1000000))).toInt()}';
    final newAuto = CustomAutomation(
      id: id,
      name: name,
      icon: icon,
      color: color,
      description: description,
      qrValue: 'AUTO:$id',
      steps: steps,
      createdAt: DateTime.now(),
      usageCount: 0,
    );
    state = [...state, newAuto];
    await _saveAutomations();
    return newAuto;
  }

  Future<void> updateAutomation(String id, CustomAutomation updated) async {
    state = [
      for (final a in state)
        if (a.id == id) updated else a
    ];
    await _saveAutomations();
  }

  Future<void> deleteAutomation(String id) async {
    state = state.where((a) => a.id != id).toList();
    await _saveAutomations();
  }

  Future<void> recordUsage(String id) async {
    state = [
      for (final a in state)
        if (a.id == id)
          a.copyWith(
            usageCount: a.usageCount + 1,
            lastUsedAt: DateTime.now(),
          )
        else
          a
    ];
    await _saveAutomations();
  }

  CustomAutomation? getAutomationByQR(String qrValue) {
    try {
      return state.firstWhere((a) => a.qrValue == qrValue);
    } catch (_) {
      return null;
    }
  }

  CustomAutomation? getAutomationById(String id) {
    try {
      return state.firstWhere((a) => a.id == id);
    } catch (_) {
      return null;
    }
  }
}

final automationsProvider =
    NotifierProvider<AutomationsNotifier, List<CustomAutomation>>(AutomationsNotifier.new);
