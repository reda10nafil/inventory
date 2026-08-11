import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/gs1_config.dart';
import 'storage_provider.dart';

const String _gs1ConfigStorageKey = 'furinventory_gs1_config';

class GS1ConfigNotifier extends Notifier<GS1Config> {
  @override
  GS1Config build() {
    final storage = ref.watch(storageServiceProvider);
    final raw = storage.getJson(_gs1ConfigStorageKey);
    if (raw != null && raw is Map<String, dynamic>) {
      return GS1Config.fromJson(raw);
    }
    return const GS1Config();
  }

  Future<void> updateConfig({
    String? baseUrl,
    bool? enableSerial,
    SerialMode? serialMode,
    bool? enableLotto,
    String? lottoFieldId,
  }) async {
    final storage = ref.read(storageServiceProvider);
    state = state.copyWith(
      baseUrl: baseUrl,
      enableSerial: enableSerial,
      serialMode: serialMode,
      enableLotto: enableLotto,
      lottoFieldId: lottoFieldId,
    );
    await storage.setJson(_gs1ConfigStorageKey, state.toJson());
  }

  Future<void> resetConfig() async {
    final storage = ref.read(storageServiceProvider);
    state = const GS1Config();
    await storage.setJson(_gs1ConfigStorageKey, state.toJson());
  }
}

final gs1ConfigProvider =
    NotifierProvider<GS1ConfigNotifier, GS1Config>(GS1ConfigNotifier.new);
