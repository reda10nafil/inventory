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
          // Master toggle + guida
          Card(
            color: AppColors.surface,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Abilita GS1 Digital Link', style: AppTypography.titleMedium),
                  subtitle: Text(gs1Config.enableGS1 ? 'QR e NFC scrivono link https (apre Chrome)' : 'QR e NFC usano solo SKU (consigliato senza sito)', style: AppTypography.bodySmall),
                  value: gs1Config.enableGS1,
                  activeColor: AppColors.primary,
                  onChanged: (v) => ref.read(gs1ConfigProvider.notifier).updateConfig(enableGS1: v),
                ),
                const Divider(color: AppColors.border),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppColors.backgroundSecondary, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [const Icon(Icons.info_outline, size: 16, color: AppColors.accentGold), const SizedBox(width: 6), Text('Come funziona', style: AppTypography.labelSmall.copyWith(color: AppColors.accentGold, fontWeight: FontWeight.bold))]),
                    const SizedBox(height: 6),
                    Text('• SPENTO (consigliato ora): QR = solo SKU. NFC = Text con SKU. Scanner mostra prodotto senza aprire Chrome.\n• ACCESO: QR/NFC = https://tuo-dominio/01/GTIN/21/SERIALE . Richiede sito con Digital Link Resolver. Scrivendo come URI, Android apre Chrome automaticamente.', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, height: 1.4)),
                    const SizedBox(height: 8),
                    Text('Anteprima: ${gs1Config.isEnabled ? "${gs1Config.baseUrl}/01/.../21/..." : "SKU-2026-001"}', style: AppTypography.caption.copyWith(color: gs1Config.isEnabled ? AppColors.success : AppColors.textMuted, fontWeight: FontWeight.bold)),
                  ]),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            color: AppColors.surface,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.qr_code_2, color: gs1Config.isEnabled ? AppColors.accentGold : AppColors.textMuted),
                      const SizedBox(width: 8),
                      Text('Dominio Base Resolver GS1', style: AppTypography.titleMedium.copyWith(color: gs1Config.isEnabled ? Colors.white : AppColors.textMuted)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _urlController,
                    enabled: gs1Config.isEnabled,
                    decoration: InputDecoration(
                      hintText: 'https://id.syncroflow.app/01',
                      border: const OutlineInputBorder(),
                      helperText: gs1Config.isEnabled ? 'URL base utilizzato per la risoluzione dei QR Code GS1 Digital Link' : 'Disabilitato — attiva GS1 sopra per modificare',
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
