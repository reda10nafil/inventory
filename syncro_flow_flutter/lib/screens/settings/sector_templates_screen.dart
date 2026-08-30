import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/constants/sector_templates.dart';
import '../../models/custom_field.dart';
import '../../providers/custom_fields_provider.dart';

class SectorTemplatesScreen extends ConsumerStatefulWidget {
  const SectorTemplatesScreen({super.key});

  @override
  ConsumerState<SectorTemplatesScreen> createState() => _SectorTemplatesScreenState();
}

class _SectorTemplatesScreenState extends ConsumerState<SectorTemplatesScreen> {
  SectorTemplate? _selectedTemplate;

  void _importTemplate(SectorTemplate template) async {
    final existingFields = ref.read(customFieldsProvider);
    int importedCount = 0;

    for (final tf in template.fields) {
      final exists = existingFields.any((f) =>
          f.deletedAt == null && f.name.toLowerCase() == tf.name.toLowerCase());

      if (!exists) {
        List<dynamic>? opts;
        if (tf.options != null) {
          opts = tf.options!
              .map((o) => {'id': o['id'] ?? '', 'label': o['label'] ?? ''})
              .toList();
        }

        final newField = CustomField(
          id: 'field_${DateTime.now().millisecondsSinceEpoch}_${importedCount + 1}',
          name: tf.name,
          type: tf.type,
          uiType: tf.uiType,
          icon: tf.icon,
          unit: tf.unit,
          required: tf.required,
          options: opts,
          dataset: tf.dataset,
          order: existingFields.length + importedCount,
        );

        await ref.read(customFieldsProvider.notifier).addField(newField);
        importedCount++;
      }
    }

    if (!mounted) return;
    setState(() => _selectedTemplate = null);

    if (importedCount > 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('🎉 $importedCount campi del modello "${template.name}" importati!'),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Tutti i campi di "${template.name}" sono già presenti nel tuo registro.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Modelli di Settore', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Scegli un modello pre-configurato per il tuo settore. I campi verranno aggiunti direttamente al tuo registro.',
                  style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 24),
                Text('MODELLI DISPONIBILI (${SectorTemplates.templates.length})',
                    style: AppTypography.caption.copyWith(color: AppColors.textSecondary, letterSpacing: 1, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),

                ...SectorTemplates.templates.map((template) {
                  return Card(
                    color: AppColors.surface,
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: AppColors.border),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => setState(() => _selectedTemplate = template),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          children: [
                            Container(
                              width: 52,
                              height: 52,
                              decoration: BoxDecoration(
                                color: AppColors.fromHex(template.color).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Center(
                                child: Text(template.emoji, style: const TextStyle(fontSize: 26)),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(template.name, style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 2),
                                  Text(template.description, style: AppTypography.caption.copyWith(color: AppColors.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 4),
                                  Text('${template.fields.length} campi inclusi', style: TextStyle(color: AppColors.fromHex(template.color), fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),

          // Template Detail Modal / BottomSheet
          if (_selectedTemplate != null)
            Container(
              color: Colors.black.withValues(alpha: 0.7),
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Container(
                    constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Modal Header
                        Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.close, color: Colors.white),
                                onPressed: () => setState(() => _selectedTemplate = null),
                              ),
                              const Expanded(
                                child: Text('Anteprima Modello', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18), textAlign: TextAlign.center),
                              ),
                              TextButton(
                                onPressed: () => _importTemplate(_selectedTemplate!),
                                child: const Text('Importa', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 16)),
                              ),
                            ],
                          ),
                        ),
                        const Divider(color: AppColors.border, height: 1),

                        Expanded(
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              children: [
                                Text(_selectedTemplate!.emoji, style: const TextStyle(fontSize: 48)),
                                const SizedBox(height: 8),
                                Text(_selectedTemplate!.name, style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text(_selectedTemplate!.description, style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary), textAlign: TextAlign.center),
                                const SizedBox(height: 20),

                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: Text('CAMPI INCLUSI (${_selectedTemplate!.fields.length})', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                                ),
                                const SizedBox(height: 12),

                                ..._selectedTemplate!.fields.map((field) {
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppColors.backgroundSecondary,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 36,
                                          height: 36,
                                          decoration: BoxDecoration(
                                            color: AppColors.fromHex(_selectedTemplate!.color).withValues(alpha: 0.2),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Icon(Icons.tune, size: 20, color: AppColors.fromHex(_selectedTemplate!.color)),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(field.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                              Text(
                                                '${field.type.name}${field.unit != null ? ' (${field.unit})' : ''}',
                                                style: AppTypography.caption.copyWith(color: AppColors.textSecondary),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                              ],
                            ),
                          ),
                        ),

                        Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.download, color: Colors.white),
                            label: Text('Importa ${_selectedTemplate!.fields.length} Campi', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.fromHex(_selectedTemplate!.color),
                              minimumSize: const Size.fromHeight(50),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () => _importTemplate(_selectedTemplate!),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
