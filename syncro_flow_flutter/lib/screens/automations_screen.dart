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
import 'scanner_screen.dart';

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
              'Centro Automazioni',
              style: AppTypography.titleMedium.copyWith(color: AppColors.textPrimary),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(30),
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: const Icon(Icons.qr_code_scanner_rounded, color: AppColors.primary),
              tooltip: 'Apri Scanner',
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const ScannerScreen()));
              },
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Custom Automations Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'LE MIE AUTOMAZIONI',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.textSecondary,
                    letterSpacing: 1.0,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                InkWell(
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AutomationBuilderScreen()));
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.add, size: 20, color: Colors.black),
                        const SizedBox(width: 4),
                        Text(
                          'Crea Nuova',
                          style: AppTypography.caption.copyWith(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (customAutomations.isEmpty)
              InkWell(
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const AutomationBuilderScreen()));
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                  ),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.auto_awesome_rounded,
                        size: 40,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Nessuna automazione personalizzata',
                        style: AppTypography.titleSmall.copyWith(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Crea la tua prima automazione per velocizzare il lavoro.',
                        textAlign: TextAlign.center,
                        style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
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

            const SizedBox(height: 32),

            // Standard Preset Workflows Section
            Text(
              'TEMPLATE PREDEFINITI',
              style: AppTypography.caption.copyWith(
                color: AppColors.textSecondary,
                letterSpacing: 1.0,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Automazioni pronte all\'uso per le operazioni più comuni.',
              style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            _buildPresetList(context),

            const SizedBox(height: 32),

            // Pro Tip Section
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFCD34D)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.lightbulb_outline_rounded, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Lo sapevi?',
                          style: TextStyle(
                            color: Color(0xFFB45309),
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Ogni automazione ha un QR code unico. Stampalo e scansionalo per avviarla istantaneamente!',
                          style: TextStyle(
                            color: Color(0xFF92400E),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPresetList(BuildContext context) {
    final presets = [
      {
        'title': 'Spostamento Rapido',
        'desc': 'Sposta velocemente una serie di prodotti in una nuova posizione.',
        'icon': Icons.move_to_inbox_rounded,
        'color': const Color(0xFF3B82F6),
        'screen': const BatchMoveScreen(),
      },
      {
        'title': 'Vendita Flash',
        'desc': 'Segna come venduti i prodotti scansionati in sequenza.',
        'icon': Icons.shopping_cart_checkout_rounded,
        'color': const Color(0xFF10B981),
        'screen': const ScanSellScreen(),
      },
      {
        'title': 'Audit Posizione',
        'desc': 'Verifica la corrispondenza tra fisico e digitale di uno scaffale.',
        'icon': Icons.fact_check_rounded,
        'color': const Color(0xFFF59E0B),
        'screen': const AuditScreen(),
      },
      {
        'title': 'Tagging di Massa',
        'desc': 'Applica note o etichette a un gruppo di prodotti.',
        'icon': Icons.label_rounded,
        'color': const Color(0xFF8B5CF6),
        'screen': const QuickTagScreen(),
      },
    ];

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: presets.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
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
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(12),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: color.withAlpha(51),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 32),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['title'] as String,
                        style: AppTypography.titleMedium.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item['desc'] as String,
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary, size: 24),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCustomAutomationCard(BuildContext context, WidgetRef ref, CustomAutomation auto) {
    return InkWell(
      onTap: () {
        SoundService.playBeep();
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => CustomRunnerScreen(automationId: auto.id)),
        );
      },
      onLongPress: () {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppColors.surface,
            title: const Text('Elimina', style: TextStyle(color: AppColors.error)),
            content: Text('Eliminare "${auto.name}"?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Annulla'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                onPressed: () {
                  ref.read(automationsProvider.notifier).deleteAutomation(auto.id);
                  Navigator.pop(ctx);
                },
                child: const Text('Elimina'),
              ),
            ],
          ),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(12),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Color(int.parse(auto.color.replaceFirst('#', '0xFF'))).withAlpha(51),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.flash_on_rounded, color: Color(int.parse(auto.color.replaceFirst('#', '0xFF'))), size: 32),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    auto.name,
                    style: AppTypography.titleMedium.copyWith(color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${auto.steps.length} step · ${auto.usageCount} utilizzi',
                    style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary, size: 24),
          ],
        ),
      ),
    );
  }
}
