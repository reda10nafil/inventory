import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/gs1_config.dart';
import '../../providers/gs1_config_provider.dart';

class GS1ConfigScreen extends ConsumerStatefulWidget {
  const GS1ConfigScreen({super.key});

  @override
  ConsumerState<GS1ConfigScreen> createState() => _GS1ConfigScreenState();
}

class _GS1ConfigScreenState extends ConsumerState<GS1ConfigScreen> {
  late TextEditingController _urlController;

  @override
  void initState() {
    super.initState();
    final config = ref.read(gs1ConfigProvider);
    _urlController = TextEditingController(text: config.baseUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final gs1Config = ref.watch(gs1ConfigProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Impostazioni GS1 Digital Link', style: AppTypography.titleMedium),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Card(
            color: AppColors.surface,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.qr_code_2, color: AppColors.accentGold),
                      const SizedBox(width: 8),
                      Text('Dominio Base Resolver GS1', style: AppTypography.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _urlController,
                    decoration: const InputDecoration(
                      hintText: 'https://id.syncroflow.app/01',
                      border: OutlineInputBorder(),
                      helperText: 'URL base utilizzato per la risoluzione dei QR Code GS1 Digital Link',
                    ),
                    onChanged: (val) {
                      ref.read(gs1ConfigProvider.notifier).updateConfig(baseUrl: val.trim());
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            color: AppColors.surface,
            child: Column(
              children: [
                SwitchListTile(
                  contentPadding: const EdgeInsets.all(16),
                  title: Text('Includi Numero di Serie (AI 21)', style: AppTypography.titleMedium),
                  subtitle: Text('Genera codice seriale univoco per ogni singolo capo inventariato', style: AppTypography.bodySmall),
                  value: gs1Config.enableSerial,
                  onChanged: (val) {
                    ref.read(gs1ConfigProvider.notifier).updateConfig(enableSerial: val);
                  },
                ),
                if (gs1Config.enableSerial) ...[
                  const Divider(color: AppColors.border),
                  RadioListTile<SerialMode>(
                    title: Text('Algoritmo UUID v4', style: AppTypography.bodyMedium),
                    subtitle: Text('Identificativo alfa-numerico univoco globale', style: AppTypography.bodySmall),
                    value: SerialMode.uuid,
                    groupValue: gs1Config.serialMode,
                    onChanged: (mode) {
                      if (mode != null) {
                        ref.read(gs1ConfigProvider.notifier).updateConfig(serialMode: mode);
                      }
                    },
                  ),
                  RadioListTile<SerialMode>(
                    title: Text('Numerazione Progressiva', style: AppTypography.bodyMedium),
                    subtitle: Text('Contatore sequenziale (00001, 00002, ...)', style: AppTypography.bodySmall),
                    value: SerialMode.progressive,
                    groupValue: gs1Config.serialMode,
                    onChanged: (mode) {
                      if (mode != null) {
                        ref.read(gs1ConfigProvider.notifier).updateConfig(serialMode: mode);
                      }
                    },
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            color: AppColors.surface,
            child: SwitchListTile(
              contentPadding: const EdgeInsets.all(16),
              title: Text('Gestione Lotto / Partita (AI 10)', style: AppTypography.titleMedium),
              subtitle: Text('Traccia codice lotto di lavorazione delle pelli nelle etichette', style: AppTypography.bodySmall),
              value: gs1Config.enableLotto,
              onChanged: (val) {
                ref.read(gs1ConfigProvider.notifier).updateConfig(enableLotto: val);
              },
            ),
          ),
        ],
      ),
    );
  }
}
