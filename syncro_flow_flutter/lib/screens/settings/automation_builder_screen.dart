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
  final String? automationId;

  const AutomationBuilderScreen({
    super.key,
    this.existingAutomation,
    this.automationId,
  });

  @override
  ConsumerState<AutomationBuilderScreen> createState() => _AutomationBuilderScreenState();
}

class _AutomationBuilderScreenState extends ConsumerState<AutomationBuilderScreen> {
  late TextEditingController _nameController;
  late TextEditingController _descController;
  List<AutomationStep> _steps = [];
  CustomAutomation? _existingAutomation;

  @override
  void initState() {
    super.initState();
    _existingAutomation = widget.existingAutomation;

    _nameController = TextEditingController(text: _existingAutomation?.name ?? '');
    _descController = TextEditingController(text: _existingAutomation?.description ?? '');
    _steps = _existingAutomation?.steps != null
        ? List.from(_existingAutomation!.steps)
        : [
            const AutomationStep(
              id: 'step_1',
              order: 0,
              type: StepType.scanProduct,
              config: AutomationStepConfig(),
              label: 'Scansiona Capo',
            ),
          ];

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_existingAutomation == null && widget.automationId != null) {
        final auto = ref.read(automationsProvider.notifier).getAutomationById(widget.automationId!);
        if (auto != null) {
          setState(() {
            _existingAutomation = auto;
            _nameController.text = auto.name;
            _descController.text = auto.description;
            _steps = List.from(auto.steps);
          });
        }
      }
    });
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
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Aggiungi Step di Automazione', style: AppTypography.titleLarge),
              const SizedBox(height: 8),
              Text('Scegli il tipo di azione reale che verrà eseguita.', style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.qr_code_scanner, color: Color(0xFF3B82F6)),
                title: const Text('Scansiona Prodotto'),
                subtitle: const Text('Barcode / SKU / NFC', style: TextStyle(fontSize: 11)),
                onTap: () {
                  Navigator.pop(context);
                  _insertStep(StepType.scanProduct, 'Scansiona Capo');
                },
              ),
              ListTile(
                leading: const Icon(Icons.location_on, color: Color(0xFF10B981)),
                title: const Text('Scansiona Posizione'),
                subtitle: const Text('QR scaffale / ubicazione', style: TextStyle(fontSize: 11)),
                onTap: () {
                  Navigator.pop(context);
                  _insertStep(StepType.scanLocation, 'Scansiona Posizione');
                },
              ),
              ListTile(
                leading: const Icon(Icons.move_to_inbox, color: Color(0xFF8B5CF6)),
                title: const Text('Sposta in Posizione'),
                subtitle: const Text('Usa ultima posizione scansita', style: TextStyle(fontSize: 11)),
                onTap: () {
                  Navigator.pop(context);
                  _insertStep(StepType.moveTo, 'Sposta Prodotto', config: const AutomationStepConfig(useLastScannedLocation: true));
                },
              ),
              ListTile(
                leading: const Icon(Icons.shopping_bag, color: Color(0xFFEF4444)),
                title: const Text('Segna come Venduto'),
                subtitle: const Text('Con richiesta prezzo', style: TextStyle(fontSize: 11)),
                onTap: () {
                  Navigator.pop(context);
                  _insertStep(StepType.markSold, 'Registra Vendita', config: const AutomationStepConfig(pricePrompt: true));
                },
              ),
              ListTile(
                leading: const Icon(Icons.label, color: Color(0xFFF59E0B)),
                title: const Text('Aggiungi Tag'),
                subtitle: const Text('Aggiunge [Tag] a note', style: TextStyle(fontSize: 11)),
                onTap: () {
                  Navigator.pop(context);
                  _promptForTag();
                },
              ),
              ListTile(
                leading: const Icon(Icons.edit, color: Color(0xFF6366F1)),
                title: const Text('Imposta Campo'),
                subtitle: const Text('Campo custom → valore', style: TextStyle(fontSize: 11)),
                onTap: () {
                  Navigator.pop(context);
                  _promptForField();
                },
              ),
              ListTile(
                leading: const Icon(Icons.nfc, color: Color(0xFF06B6D4)),
                title: const Text('Scrivi NFC'),
                subtitle: const Text('Scrive SKU/GS1 su tag', style: TextStyle(fontSize: 11)),
                onTap: () {
                  Navigator.pop(context);
                  _promptForNfc();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _insertStep(StepType type, String label, {AutomationStepConfig? config}) {
    setState(() {
      _steps.add(
        AutomationStep(
          id: const Uuid().v4(),
          order: _steps.length,
          type: type,
          config: config ?? const AutomationStepConfig(),
          label: label,
        ),
      );
    });
    SoundService.playBeep();
  }

  void _promptForTag() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Tag da aggiungere'),
        content: TextField(controller: ctrl, decoration: const InputDecoration(hintText: 'Es. Da Pulire', border: OutlineInputBorder()), autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annulla')),
          ElevatedButton(onPressed: () { final t = ctrl.text.trim(); Navigator.pop(ctx); if (t.isNotEmpty) _insertStep(StepType.addTag, 'Aggiungi Tag: $t', config: AutomationStepConfig(tag: t)); }, child: const Text('Aggiungi')),
        ],
      ),
    );
  }

  void _promptForField() {
    final nameCtrl = TextEditingController();
    final valueCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Imposta Campo'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nome campo', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: valueCtrl, decoration: const InputDecoration(labelText: 'Valore', border: OutlineInputBorder())),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annulla')),
          ElevatedButton(onPressed: () { final n = nameCtrl.text.trim(); final v = valueCtrl.text.trim(); Navigator.pop(ctx); if (n.isNotEmpty) _insertStep(StepType.setField, 'Imposta $n=$v', config: AutomationStepConfig(fieldName: n, fieldValue: v)); }, child: const Text('Aggiungi')),
        ],
      ),
    );
  }

  void _promptForNfc() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Payload NFC'),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          TextField(controller: ctrl, decoration: const InputDecoration(hintText: 'Lascia vuoto per SKU automatico', border: OutlineInputBorder())),
          const SizedBox(height: 8),
          const Text('Vuoto = SKU o GS1 Digital Link del prodotto scansito', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annulla')),
          ElevatedButton(onPressed: () { final d = ctrl.text.trim(); Navigator.pop(ctx); _insertStep(StepType.writeNfc, d.isEmpty ? 'Scrivi NFC (SKU)' : 'Scrivi NFC: $d', config: AutomationStepConfig(nfcData: d.isEmpty ? null : d)); }, child: const Text('Aggiungi')),
        ],
      ),
    );
  }

  void _saveAutomation() {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inserisci un nome per l\'automazione')),
      );
      return;
    }

    final id = _existingAutomation?.id ?? const Uuid().v4();
    final automation = CustomAutomation(
      id: id,
      name: name,
      icon: 'auto_awesome',
      color: '#D4AF37',
      description: _descController.text.trim(),
      qrValue: 'AUTO:$id',
      steps: _steps,
      createdAt: _existingAutomation?.createdAt ?? DateTime.now(),
    );

    if (_existingAutomation != null) {
      ref.read(automationsProvider.notifier).updateAutomation(automation);
    } else {
      ref.read(automationsProvider.notifier).addAutomation(automation);
    }

    SoundService.playSuccessBeep();
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = _existingAutomation != null;

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
