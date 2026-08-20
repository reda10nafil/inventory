import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/hardware_config.dart';
import '../../providers/hardware_config_provider.dart';
import '../../services/sound_service.dart';

class HardwareScreen extends ConsumerWidget {
  const HardwareScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hwConfig = ref.watch(hardwareConfigProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Configurazione Hardware & Scanner', style: AppTypography.titleMedium),
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
                      const Icon(Icons.qr_code_scanner, color: AppColors.accentGold),
                      const SizedBox(width: 8),
                      Text('Modalità Scansione Hardware', style: AppTypography.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 12),
                  RadioListTile<ScanMode>(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Entrambi (NFC + Barcode / QR)', style: AppTypography.bodyMedium),
                    subtitle: Text('Rileva sia codici visuali dalla fotocamera che chip NFC', style: AppTypography.bodySmall),
                    value: ScanMode.both,
                    groupValue: hwConfig.scanMode,
                    onChanged: (mode) {
                      if (mode != null) {
                        ref.read(hardwareConfigProvider.notifier).updateConfig(scanMode: mode);
                        SoundService.playBeep();
                      }
                    },
                  ),
                  RadioListTile<ScanMode>(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Solo Barcode / QR Code', style: AppTypography.bodyMedium),
                    subtitle: Text('Disattiva il lettore NFC background per risparmio batteria', style: AppTypography.bodySmall),
                    value: ScanMode.barcodeOnly,
                    groupValue: hwConfig.scanMode,
                    onChanged: (mode) {
                      if (mode != null) {
                        ref.read(hardwareConfigProvider.notifier).updateConfig(scanMode: mode);
                        SoundService.playBeep();
                      }
                    },
                  ),
                  RadioListTile<ScanMode>(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Solo Chip NFC', style: AppTypography.bodyMedium),
                    subtitle: Text('Usa solo il sensore di prossimità NFC', style: AppTypography.bodySmall),
                    value: ScanMode.nfcOnly,
                    groupValue: hwConfig.scanMode,
                    onChanged: (mode) {
                      if (mode != null) {
                        ref.read(hardwareConfigProvider.notifier).updateConfig(scanMode: mode);
                        SoundService.playBeep();
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            color: AppColors.surface,
            child: SwitchListTile(
              contentPadding: const EdgeInsets.all(16),
              secondary: const Icon(Icons.nfc, color: AppColors.accentGold),
              title: Text('Scrittura Automatica Tag NFC', style: AppTypography.titleMedium),
              subtitle: Text(
                'Chiedi di avvicinare un tag NFC subito dopo la creazione di un nuovo prodotto',
                style: AppTypography.bodySmall,
              ),
              value: hwConfig.autoWriteNfcOnSave,
              onChanged: (val) {
                ref.read(hardwareConfigProvider.notifier).updateConfig(autoWriteNfcOnSave: val);
                SoundService.playBeep();
              },
            ),
          ),
        ],
      ),
    );
  }
}
