import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/automation.dart';
import '../../providers/automations_provider.dart';
import '../../services/sound_service.dart';

class AutomationBuilderScreen extends ConsumerStatefulWidget {
  final CustomAutomation? existingAutomation;

  const AutomationBuilderScreen({
    super.key,
    this.existingAutomation,
  });

  @override
  ConsumerState<AutomationBuilderScreen> createState() => _AutomationBuilderScreenState();
}

class _AutomationBuilderScreenState extends ConsumerState<AutomationBuilderScreen> {
  late TextEditingController _nameController;
  late TextEditingController _descController;
  List<AutomationStep> _steps = [];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.existingAutomation?.name ?? '');
    _descController = TextEditingController(text: widget.existingAutomation?.description ?? '');
    _steps = widget.existingAutomation?.steps != null
        ? List.from(widget.existingAutomation!.steps)
        : [
            const AutomationStep(
              id: 'step_1',
              order: 0,
              type: StepType.scanProduct,
              config: AutomationStepConfig(),
              label: 'Scansiona Capo',
            ),
          ];
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _addStep() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Aggiungi Step di Automazione', style: AppTypography.titleLarge),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.qr_code_scanner, color: AppColors.accentGold),
              title: const Text('Scansiona Prodotto'),
              onTap: () {
                Navigator.pop(context);
                _insertStep(StepType.scanProduct, 'Scansiona Capo');
              },
            ),
            ListTile(
              leading: const Icon(Icons.location_on, color: AppColors.accentGold),
              title: const Text('Sposta in Posizione Specifica'),
              onTap: () {
                Navigator.pop(context);
                _insertStep(StepType.moveTo, 'Sposta in Posizione Target');
              },
            ),
            ListTile(
              leading: const Icon(Icons.shopping_bag, color: AppColors.accentGold),
              title: const Text('Segna come Venduto'),
              onTap: () {
                Navigator.pop(context);
                _insertStep(StepType.markSold, 'Registra Vendita');
              },
            ),
          ],
        ),
      ),
    );
  }

  void _insertStep(StepType type, String label) {
    setState(() {
      _steps.add(
        AutomationStep(
          id: const Uuid().v4(),
          order: _steps.length,
          type: type,
          config: const AutomationStepConfig(),
          label: label,
        ),
      );
    });
    SoundService.playBeep();
  }

  void _saveAutomation() {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inserisci un nome per l\'automazione')),
      );
      return;
    }

    final id = widget.existingAutomation?.id ?? const Uuid().v4();
    final automation = CustomAutomation(
      id: id,
      name: name,
      icon: 'auto_awesome',
      color: '#D4AF37',
      description: _descController.text.trim(),
      qrValue: 'AUTO:$id',
      steps: _steps,
      createdAt: widget.existingAutomation?.createdAt ?? DateTime.now(),
    );

    if (widget.existingAutomation != null) {
      ref.read(automationsProvider.notifier).updateAutomation(automation);
    } else {
      ref.read(automationsProvider.notifier).addAutomation(automation);
    }

    SoundService.playSuccessBeep();
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.existingAutomation != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(isEditing ? 'Modifica Automazione' : 'Automation Builder', style: AppTypography.titleMedium),
        actions: [
          IconButton(
            icon: const Icon(Icons.check, color: AppColors.accentGold),
            onPressed: _saveAutomation,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nome Workflow / Automazione',
                hintText: 'es. Trasferimento in Vetrina',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descController,
              decoration: const InputDecoration(
                labelText: 'Descrizione (opzionale)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('SEQUENZA STEP', style: AppTypography.titleMedium.copyWith(color: AppColors.accentGold)),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline, color: AppColors.accentGold),
                  onPressed: _addStep,
                ),
              ],
            ),
            const SizedBox(height: 12),
            ReorderableListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _steps.length,
              onReorder: (oldIndex, newIndex) {
                if (newIndex > oldIndex) newIndex--;
                setState(() {
                  final step = _steps.removeAt(oldIndex);
                  _steps.insert(newIndex, step);
                });
              },
              itemBuilder: (context, index) {
                final step = _steps[index];
                return Card(
                  key: ValueKey(step.id),
                  color: AppColors.surface,
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppColors.primary,
                      child: Text('${index + 1}', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                    ),
                    title: Text(step.label, style: AppTypography.titleMedium),
                    subtitle: Text(step.type.name, style: AppTypography.bodySmall),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: AppColors.error),
                          onPressed: () {
                            setState(() => _steps.removeAt(index));
                            SoundService.playBeep();
                          },
                        ),
                        const Icon(Icons.drag_handle, color: AppColors.textMuted),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 30),
            ElevatedButton.icon(
              icon: const Icon(Icons.save),
              label: const Text('Salva Automazione Workflow'),
              style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
              onPressed: _saveAutomation,
            ),
          ],
        ),
      ),
    );
  }
}
