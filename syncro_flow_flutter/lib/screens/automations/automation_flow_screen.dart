import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/automation.dart';
import '../../providers/automations_provider.dart';

class AutomationFlowScreen extends ConsumerWidget {
  final String automationId;

  const AutomationFlowScreen({
    super.key,
    required this.automationId,
  });

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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Mappa Flusso: ${automation.name}', style: AppTypography.titleMedium),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(20.0),
        itemCount: automation.steps.length,
        itemBuilder: (context, index) {
          final step = automation.steps[index];
          final isLast = index == automation.steps.length - 1;

          return Column(
            children: [
              Card(
                color: AppColors.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primary,
                    child: Text('${index + 1}', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  ),
                  title: Text(step.label, style: AppTypography.titleMedium),
                  subtitle: Text('Azione: ${step.type.name}', style: AppTypography.bodySmall),
                ),
              ),
              if (!isLast) ...[
                const SizedBox(height: 8),
                const Icon(Icons.arrow_downward, color: AppColors.accentGold),
                const SizedBox(height: 8),
              ],
            ],
          );
        },
      ),
    );
  }
}
