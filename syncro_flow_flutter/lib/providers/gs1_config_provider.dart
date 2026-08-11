import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/gs1_config.dart';
import '../services/storage_service.dart';
import 'storage_provider.dart';

const String _gs1ConfigStorageKey = 'furinventory_gs1_config';

class GS1ConfigNotifier extends StateNotifier<GS1Config> {
  final StorageService _storageService;

  GS1ConfigNotifier(this._storageService) : super(const GS1Config()) {
    _loadConfig();
  }

  void _loadConfig() {
    final raw = _storageService.getJson(_gs1ConfigStorageKey);
    if (raw != null && raw is Map<String, dynamic>) {
      state = GS1Config.fromJson(raw);
    }
  }

  Future<void> updateConfig({
    String? baseUrl,
    bool? enableSerial,
    SerialMode? serialMode,
    bool? enableLotto,
    String? lottoFieldId,
  }) async {
    state = state.copyWith(
      baseUrl: baseUrl,
      enableSerial: enableSerial,
      serialMode: serialMode,
      enableLotto: enableLotto,
      lottoFieldId: lottoFieldId,
    );
    await _storageService.setJson(_gs1ConfigStorageKey, state.toJson());
  }

  Future<void> resetConfig() async {
    state = const GS1Config();
    await _storageService.setJson(_gs1ConfigStorageKey, state.toJson());
  }
}

final gs1ConfigProvider =
    StateNotifierProvider<GS1ConfigNotifier, GS1Config>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return GS1ConfigNotifier(storage);
});
