import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/hardware_config.dart';
import 'storage_provider.dart';

const String _hwConfigStorageKey = 'furinventory_hardware_config';

class HardwareConfigNotifier extends Notifier<HardwareConfig> {
  @override
  HardwareConfig build() {
    final storage = ref.watch(storageServiceProvider);
    final raw = storage.getJson(_hwConfigStorageKey);
    if (raw != null && raw is Map<String, dynamic>) {
      return HardwareConfig.fromJson(raw);
    }
    return const HardwareConfig();
  }

  Future<void> updateConfig({ScanMode? scanMode, bool? autoWriteNfcOnSave}) async {
    final storage = ref.read(storageServiceProvider);
    state = state.copyWith(
      scanMode: scanMode,
      autoWriteNfcOnSave: autoWriteNfcOnSave,
    );
    await storage.setJson(_hwConfigStorageKey, state.toJson());
  }

  Future<void> resetConfig() async {
    final storage = ref.read(storageServiceProvider);
    state = const HardwareConfig();
    await storage.setJson(_hwConfigStorageKey, state.toJson());
  }
}

final hardwareConfigProvider =
    NotifierProvider<HardwareConfigNotifier, HardwareConfig>(HardwareConfigNotifier.new);
