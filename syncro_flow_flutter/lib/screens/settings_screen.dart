import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../providers/inventory_provider.dart';
import '../providers/locations_provider.dart';
import '../providers/custom_fields_provider.dart';
import '../providers/hardware_config_provider.dart';
import '../services/sound_service.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inventoryState = ref.watch(inventoryProvider);
    final locations = ref.watch(locationsProvider);
    final customFields = ref.watch(customFieldsProvider);
    final hardwareConfig = ref.watch(hardwareConfigProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAlignment.start,
          children: [
            Text(
              'Impostazioni di Sistema',
              style: AppTypography.titleMedium.copyWith(color: AppColors.textPrimary),
            ),
            Text(
              'Pannello centrale di configurazione SyncroFlow Pro',
              style: AppTypography.caption.copyWith(color: AppColors.textMuted),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAlignment.start,
          children: [
            // Section 1: GESTIONE INVENTARIO
            _buildSectionHeader('GESTIONE INVENTARIO & STRUTTURA'),
            const SizedBox(height: 10),
            _buildSettingsTile(
              context: context,
              icon: Icons.location_on_rounded,
              title: 'Posizioni Fisiche',
              subtitle: '${locations.length} posizioni configurate (Magazzino, Vetrina...)',
              color: const Color(0xFF3B82F6),
              onTap: () => _showModalMessage(context, 'Posizioni Fisiche (Fase 6)'),
            ),
            const SizedBox(height: 8),
            _buildSettingsTile(
              context: context,
              icon: Icons.tune_rounded,
              title: 'Campi Personalizzati',
              subtitle: '${customFields.length} campi custom attivi',
              color: const Color(0xFFF59E0B),
              onTap: () => _showModalMessage(context, 'Campi Personalizzati (Fase 6)'),
            ),
            const SizedBox(height: 8),
            _buildSettingsTile(
              context: context,
              icon: Icons.folder_copy_rounded,
              title: 'Cartelle & Settori',
              subtitle: '${inventoryState.libraries.length} librerie prodotto definite',
              color: AppColors.primary,
              onTap: () => _showModalMessage(context, 'Cartelle & Settori (Fase 6)'),
            ),
            const SizedBox(height: 8),
            _buildSettingsTile(
              context: context,
              icon: Icons.dashboard_customize_rounded,
              title: 'Layout Form Builder',
              subtitle: 'Personalizza l\'ordine dei campi nel form inserimento',
              color: const Color(0xFF8B5CF6),
              onTap: () => _showModalMessage(context, 'Layout Form Builder (Fase 6)'),
            ),

            const SizedBox(height: 24),

            // Section 2: HARDWARE & STANDARD
            _buildSectionHeader('HARDWARE & DIGITAL LINK GS1'),
            const SizedBox(height: 10),
            _buildSettingsTile(
              context: context,
              icon: Icons.qr_code_2_rounded,
              title: 'Parametri GS1 Digital Link',
              subtitle: 'Domain URI, GTIN prefix e serializzatore avanzato',
              color: const Color(0xFF10B981),
              onTap: () => _showModalMessage(context, 'Configurazione GS1 (Fase 6)'),
            ),
            const SizedBox(height: 8),
            _buildSettingsTile(
              context: context,
              icon: Icons.nfc_rounded,
              title: 'Hardware NFC & Scanner',
              subtitle: 'Lettore NFC: ${hardwareConfig.nfcEnabled ? "Attivo" : "Disattivato"} | Bip: ${hardwareConfig.soundEnabled ? "Attivo" : "Disattivato"}',
              color: const Color(0xFFEC4899),
              onTap: () => _showModalMessage(context, 'Configurazione Hardware (Fase 6)'),
            ),

            const SizedBox(height: 24),

            // Section 3: AUTOMAZIONI & SISTEMA
            _buildSectionHeader('SISTEMA & RECOVERABILITY'),
            const SizedBox(height: 10),
            _buildSettingsTile(
              context: context,
              icon: Icons.delete_outline_rounded,
              title: 'Cestino Prodotti (Soft Delete)',
              subtitle: '${inventoryState.products.where((p) => p.deletedAt != null).length} capi rimossi nel cestino',
              color: const Color(0xFFEF4444),
              onTap: () => _showModalMessage(context, 'Cestino & Ripristino (Fase 6)'),
            ),
            const SizedBox(height: 8),
            _buildSettingsTile(
              context: context,
              icon: Icons.share_rounded,
              title: 'Esporta & Condividi Dati',
              subtitle: 'Export backup JSON completo inventario',
              color: const Color(0xFF06B6D4),
              onTap: () => _showModalMessage(context, 'Esporta Dati (Fase 6)'),
            ),

            const SizedBox(height: 28),

            // Section 4: DIAGNOSTICA & COLLAUDO SUONO
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAlignment.start,
                children: [
                  Text(
                    'DIAGNOSTICA DI SISTEMA',
                    style: AppTypography.caption.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Prodotti in Database:', style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
                      Text('${inventoryState.products.length}', style: AppTypography.bodySmall.copyWith(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Eventi in Cronologia:', style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
                      Text('${inventoryState.timeline.length}', style: AppTypography.bodySmall.copyWith(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            await SoundService.playBeep();
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.volume_up_rounded, size: 18),
                          label: const Text('Test Bip Audio'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            await SoundService.playAlarm();
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFEF4444),
                            side: const BorderSide(color: Color(0xFFEF4444)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.warning_amber_rounded, size: 18),
                          label: const Text('Test Allarme'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Footer Version Info
            Center(
              child: Column(
                children: [
                  Text(
                    'SyncroFlow Pro v1.0.0+1',
                    style: AppTypography.caption.copyWith(color: AppColors.textMuted, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Flutter 3.x • Riverpod 3 State Engine • Luxury Dark Edition',
                    style: AppTypography.caption.copyWith(color: AppColors.textMuted, fontSize: 10),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: AppTypography.caption.copyWith(
        color: AppColors.primary,
        letterSpacing: 1.2,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildSettingsTile({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: () {
        SoundService.playBeep();
        onTap();
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.titleSmall.copyWith(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: AppTypography.bodySmall.copyWith(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
          ],
        ),
      ),
    );
  }

  void _showModalMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Apertura schermata: $message'),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
