import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/automation.dart';
import '../../providers/automations_provider.dart';
import '../../services/sound_service.dart';

class CustomRunnerScreen extends ConsumerStatefulWidget {
  final String automationId;

  const CustomRunnerScreen({
    super.key,
    required this.automationId,
  });

  @override
  ConsumerState<CustomRunnerScreen> createState() => _CustomRunnerScreenState();
}

class _CustomRunnerScreenState extends ConsumerState<CustomRunnerScreen> {
  int _currentStepIndex = 0;
  bool _isFinished = false;

  @override
  Widget build(BuildContext context) {
    final automations = ref.watch(automationsProvider);
    final automation = automations.firstWhere(
      (a) => a.id == widget.automationId,
      orElse: () => CustomAutomation(
        id: widget.automationId,
        name: 'Workflow',
        icon: 'auto_awesome',
        color: '#D4AF37',
        description: '',
        qrValue: '',
        steps: [],
        createdAt: DateTime.now(),
      ),
    );

    final steps = automation.steps;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Esecutore Workflow: ${automation.name}', style: AppTypography.titleMedium),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: _isFinished || steps.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle, size: 80, color: AppColors.success),
                    const SizedBox(height: 16),
                    Text('Automazione Completata!', style: AppTypography.headlineSmall.copyWith(color: AppColors.success)),
                    const SizedBox(height: 8),
                    Text('Tutti gli step del workflow sono stati eseguiti.', style: AppTypography.bodySmall),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Torna alle Automazioni'),
                    ),
                  ],
                ),
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Step Progress Indicator Bar
                  LinearProgressIndicator(
                    value: (_currentStepIndex + 1) / steps.length,
                    backgroundColor: AppColors.surfaceElevated,
                    color: AppColors.accentGold,
                    minHeight: 8,
                  ),
                  const SizedBox(height: 24),

                  Text(
                    'STEP ${_currentStepIndex + 1} DI ${steps.length}',
                    style: AppTypography.labelMedium.copyWith(color: AppColors.accentGold),
                  ),
                  const SizedBox(height: 8),

                  Card(
                    color: AppColors.surface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: const BorderSide(color: AppColors.primary, width: 2),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(steps[_currentStepIndex].label, style: AppTypography.titleLarge),
                          const SizedBox(height: 8),
                          Text('Tipo azione: ${steps[_currentStepIndex].type.name}', style: AppTypography.bodySmall),
                        ],
                      ),
                    ),
                  ),

                  const Spacer(),

                  ElevatedButton.icon(
                    icon: const Icon(Icons.arrow_forward),
                    label: Text(_currentStepIndex + 1 == steps.length ? 'Concludi Esecuzione' : 'Avanza allo Step Successivo'),
                    style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                    onPressed: () {
                      SoundService.playBeep();
                      if (_currentStepIndex + 1 >= steps.length) {
                        setState(() => _isFinished = true);
                        ref.read(automationsProvider.notifier).incrementUsageCount(automation.id);
                      } else {
                        setState(() => _currentStepIndex++);
                      }
                    },
                  ),
                ],
              ),
      ),
    );
  }
}
