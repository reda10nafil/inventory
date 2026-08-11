import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/hardware_config.dart';
import '../services/storage_service.dart';
import 'storage_provider.dart';

const String _hwConfigStorageKey = 'furinventory_hardware_config';

class HardwareConfigNotifier extends StateNotifier<HardwareConfig> {
  final StorageService _storageService;

  HardwareConfigNotifier(this._storageService)
      : super(const HardwareConfig()) {
    _loadConfig();
  }

  void _loadConfig() {
    final raw = _storageService.getJson(_hwConfigStorageKey);
    if (raw != null && raw is Map<String, dynamic>) {
      state = HardwareConfig.fromJson(raw);
    }
  }

  Future<void> updateConfig({ScanMode? scanMode, bool? autoWriteNfcOnSave}) async {
    state = state.copyWith(
      scanMode: scanMode,
      autoWriteNfcOnSave: autoWriteNfcOnSave,
    );
    await _storageService.setJson(_hwConfigStorageKey, state.toJson());
  }

  Future<void> resetConfig() async {
    state = const HardwareConfig();
    await _storageService.setJson(_hwConfigStorageKey, state.toJson());
  }
}

final hardwareConfigProvider =
    StateNotifierProvider<HardwareConfigNotifier, HardwareConfig>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return HardwareConfigNotifier(storage);
});
