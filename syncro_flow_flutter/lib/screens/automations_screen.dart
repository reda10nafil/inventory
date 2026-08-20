import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/automation.dart';
import '../providers/automations_provider.dart';
import '../services/sound_service.dart';

import 'automations/audit_screen.dart';
import 'automations/batch_move_screen.dart';
import 'automations/scan_sell_screen.dart';
import 'automations/quick_tag_screen.dart';
import 'automations/custom_runner_screen.dart';
import 'settings/automation_builder_screen.dart';

class AutomationsScreen extends ConsumerWidget {
  const AutomationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customAutomations = ref.watch(automationsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Automazioni Inventario',
              style: AppTypography.titleMedium.copyWith(color: AppColors.textPrimary),
            ),
            Text(
              'Esecuzione rapida workflow multi-step',
              style: AppTypography.caption.copyWith(color: AppColors.textMuted),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: AppColors.primary),
            tooltip: 'Nuova Automazione',
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AutomationBuilderScreen()));
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Standard Preset Workflows Section
            Text(
              'WORKFLOW PREDEFINITI',
              style: AppTypography.caption.copyWith(
                color: AppColors.primary,
                letterSpacing: 1.2,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            _buildPresetGrid(context),

            const SizedBox(height: 28),

            // Custom Automations Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'LE TUE AUTOMAZIONI CUSTOM (${customAutomations.length})',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.primary,
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton.icon(
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AutomationBuilderScreen()));
                  },
                  icon: const Icon(Icons.add, size: 16, color: AppColors.primary),
                  label: Text(
                    'Crea',
                    style: AppTypography.caption.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            if (customAutomations.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.account_tree_outlined,
                      size: 40,
                      color: AppColors.textMuted,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Nessuna automazione personalizzata',
                      style: AppTypography.titleSmall.copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Crea una nuova automazione per velocizzare spostamenti, vendite o aggiornamenti di gruppo',
                      textAlign: TextAlign.center,
                      style: AppTypography.bodySmall.copyWith(color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const AutomationBuilderScreen()));
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.background,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.flash_on_rounded, size: 18),
                      label: const Text('Crea Ora'),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: customAutomations.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final auto = customAutomations[index];
                  return _buildCustomAutomationCard(context, ref, auto);
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPresetGrid(BuildContext context) {
    final presets = [
      {
        'title': 'Spostamento Rapido',
        'desc': 'Sposta capi in massa tra posizioni',
        'icon': Icons.compare_arrows_rounded,
        'color': const Color(0xFF3B82F6),
        'screen': const BatchMoveScreen(),
      },
      {
        'title': 'Vendita Express',
        'desc': 'Scansiona e vendi a raffica',
        'icon': Icons.point_of_sale_rounded,
        'color': const Color(0xFF10B981),
        'screen': const ScanSellScreen(),
      },
      {
        'title': 'Audit Inventario',
        'desc': 'Verifica conteggio stock e capi mancanti',
        'icon': Icons.fact_check_rounded,
        'color': const Color(0xFF8B5CF6),
        'screen': const AuditScreen(),
      },
      {
        'title': 'Tagging NFC / QR',
        'desc': 'Scrittura rapida chip NFC o etichette',
        'icon': Icons.nfc_rounded,
        'color': const Color(0xFFF59E0B),
        'screen': const QuickTagScreen(),
      },
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.25,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: presets.length,
      itemBuilder: (context, index) {
        final item = presets[index];
        final color = item['color'] as Color;
        final icon = item['icon'] as IconData;
        final targetScreen = item['screen'] as Widget;

        return InkWell(
          onTap: () {
            SoundService.playBeep();
            Navigator.push(context, MaterialPageRoute(builder: (_) => targetScreen));
          },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['title'] as String,
                      style: AppTypography.titleSmall.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item['desc'] as String,
                      style: AppTypography.caption.copyWith(
                        color: AppColors.textMuted,
                        fontSize: 11,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCustomAutomationCard(BuildContext context, WidgetRef ref, CustomAutomation auto) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: AppColors.primary.withAlpha(40),
          child: const Icon(Icons.flash_on_rounded, color: AppColors.accentGold),
        ),
        title: Text(auto.name, style: AppTypography.titleMedium),
        subtitle: Text('${auto.steps.length} step configurati | Eseguita ${auto.usageCount} volte', style: AppTypography.bodySmall),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.play_arrow_rounded, color: AppColors.success, size: 28),
              onPressed: () {
                SoundService.playBeep();
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => CustomRunnerScreen(automationId: auto.id)),
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.edit_outlined, color: AppColors.textSecondary),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => AutomationBuilderScreen(existingAutomation: auto)),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
