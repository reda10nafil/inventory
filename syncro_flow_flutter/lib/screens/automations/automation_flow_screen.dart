import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/automation.dart';
import '../../providers/automations_provider.dart';
import '../settings/automation_builder_screen.dart';
import 'custom_runner_screen.dart';

class AutomationFlowScreen extends ConsumerWidget {
  final String automationId;

  const AutomationFlowScreen({
    super.key,
    required this.automationId,
  });

  IconData _getIconData(String name) {
    switch (name) {
      case 'qr-code-scanner':
      case 'qr_code_scanner':
        return Icons.qr_code_scanner;
      case 'location-on':
      case 'location_on':
        return Icons.location_on;
      case 'move-to-inbox':
      case 'move_to_inbox':
        return Icons.move_to_inbox;
      case 'shopping-cart-checkout':
      case 'shopping_cart_checkout':
        return Icons.shopping_cart_checkout;
      case 'label':
        return Icons.label;
      case 'edit':
        return Icons.edit;
      case 'auto_awesome':
        return Icons.auto_awesome;
      default:
        return Icons.bolt;
    }
  }

  void _handleDelete(BuildContext context, WidgetRef ref, CustomAutomation automation) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Elimina Automazione'),
        content: Text('Sei sicuro di voler eliminare "${automation.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annulla', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () async {
              Navigator.pop(ctx);
              await ref.read(automationsProvider.notifier).deleteAutomation(automation.id);
              if (context.mounted) {
                Navigator.pop(context);
              }
            },
            child: const Text('Elimina', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _handleShare(CustomAutomation automation) {
    final stepsText = automation.steps
        .asMap()
        .entries
        .map((e) => '${e.key + 1}. ${e.value.label}')
        .join('\n');
    SharePlus.instance.share(
      ShareParams(
        text: 'Automazione: ${automation.name}\nQR Code: ${automation.qrValue}\n\nStep:\n$stepsText',
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final automations = ref.watch(automationsProvider);
    final automation = automations.firstWhere(
      (a) => a.id == automationId,
      orElse: () => CustomAutomation(
        id: automationId,
        name: 'Workflow',
        icon: 'auto_awesome',
        color: '#D4AF37',
        description: '',
        qrValue: '',
        steps: [],
        createdAt: DateTime.now(),
      ),
    );

    final autoColor = AppColors.fromHex(automation.color);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(automation.name, style: AppTypography.titleMedium, maxLines: 1),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit, color: AppColors.textSecondary),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => AutomationBuilderScreen(automationId: automation.id),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete, color: AppColors.error),
            onPressed: () => _handleDelete(context, ref, automation),
          ),
        ],
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Info Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: autoColor.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(_getIconData(automation.icon), size: 36, color: autoColor),
                      ),
                      const SizedBox(height: 16),
                      Text(automation.name, style: AppTypography.headlineSmall.copyWith(fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                      if (automation.description.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(automation.description, style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary), textAlign: TextAlign.center),
                      ],
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Column(
                            children: [
                              Text('${automation.steps.length}', style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold)),
                              Text('STEP', style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
                            ],
                          ),
                          Column(
                            children: [
                              Text('${automation.usageCount}', style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold)),
                              Text('UTILIZZI', style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
                            ],
                          ),
                          Column(
                            children: [
                              Text(
                                automation.lastUsedAt != null
                                    ? DateFormat('dd MMM', 'it_IT').format(automation.lastUsedAt!)
                                    : 'Mai',
                                style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold),
                              ),
                              Text('ULTIMO USO', style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 28),

                // FLOW MAP
                Text('MAPPA DEL FLUSSO', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, letterSpacing: 1, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),

                Center(
                  child: Column(
                    children: [
                      // START node
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.play_circle_filled, color: AppColors.success, size: 28),
                          const SizedBox(width: 8),
                          Text('INIZIO', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.bold, letterSpacing: 1)),
                        ],
                      ),
                      Container(width: 2, height: 16, color: AppColors.border),

                      ...automation.steps.asMap().entries.map((entry) {
                        final index = entry.key;
                        final step = entry.value;
                        final meta = stepTypeMetaMap[step.type];
                        final metaColor = meta != null ? AppColors.fromHex(meta.color) : AppColors.accentGold;
                        final isLoop = step.type == StepType.scanProduct || step.type == StepType.scanLocation;

                        return Column(
                          children: [
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border(
                                  left: BorderSide(color: metaColor, width: 4),
                                  top: const BorderSide(color: AppColors.border),
                                  right: const BorderSide(color: AppColors.border),
                                  bottom: const BorderSide(color: AppColors.border),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        width: 24,
                                        height: 24,
                                        decoration: BoxDecoration(color: metaColor, shape: BoxShape.circle),
                                        child: Center(
                                          child: Text('${index + 1}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Icon(meta != null ? _getIconData(meta.icon) : Icons.bolt, size: 20, color: metaColor),
                                      const SizedBox(width: 8),
                                      Text(meta?.label ?? '', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(step.label, style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold)),
                                  if (isLoop) ...[
                                    const SizedBox(height: 6),
                                    const Text('🔄 Ripetibile — fino a chiusura manuale', style: TextStyle(color: AppColors.warning, fontSize: 12)),
                                  ],
                                ],
                              ),
                            ),
                            if (index < automation.steps.length - 1) ...[
                              Container(width: 2, height: 12, color: AppColors.border),
                              const Icon(Icons.arrow_downward, size: 20, color: AppColors.textSecondary),
                              Container(width: 2, height: 12, color: AppColors.border),
                            ] else ...[
                              Container(width: 2, height: 16, color: AppColors.border),
                            ],
                          ],
                        );
                      }),

                      // END node
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.stop_circle, color: AppColors.error, size: 28),
                          const SizedBox(width: 8),
                          Text('FINE', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.bold, letterSpacing: 1)),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // QR CODE SECTION
                Text('QR CODE DELL\'AUTOMAZIONE', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, letterSpacing: 1, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),

                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: QrImageView(
                          data: automation.qrValue.isNotEmpty ? automation.qrValue : 'AUTO:${automation.id}',
                          version: QrVersions.auto,
                          size: 180.0,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(automation.qrValue, style: const TextStyle(fontFamily: 'monospace', color: AppColors.textSecondary, fontSize: 13)),
                      const SizedBox(height: 8),
                      Text(
                        'Stampa o salva questo QR. Scansionalo per avviare l\'automazione.',
                        style: AppTypography.caption.copyWith(color: AppColors.textSecondary),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.share, size: 20, color: Colors.white),
                        label: const Text('Condividi', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.info,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        ),
                        onPressed: () => _handleShare(automation),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Floating Run Button
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: AppColors.background,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: ElevatedButton.icon(
                icon: const Icon(Icons.play_arrow, size: 28, color: Colors.white),
                label: const Text('Avvia Automazione', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: autoColor,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                ),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => CustomRunnerScreen(automationId: automation.id),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
