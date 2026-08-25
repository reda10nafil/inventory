import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/custom_field.dart';
import '../../providers/custom_fields_provider.dart';

class FieldsScreen extends ConsumerStatefulWidget {
  const FieldsScreen({super.key});

  @override
  ConsumerState<FieldsScreen> createState() => _FieldsScreenState();
}

class _FieldsScreenState extends ConsumerState<FieldsScreen> {
  void _showAddEditFieldModal([CustomField? existingField]) {
    final isEditing = existingField != null;
    final nameController = TextEditingController(text: existingField?.name ?? '');
    final unitController = TextEditingController(text: existingField?.unit ?? '');
    FieldDataType selectedType = existingField?.type ?? FieldDataType.textShort;
    bool isRequired = existingField?.required ?? false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return AlertDialog(
            backgroundColor: AppColors.surface,
            title: Text(
              isEditing ? 'Modifica Campo' : 'Nuovo Campo Personalizzato',
              style: AppTypography.titleLarge,
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: nameController,
                    autofocus: true,
                    decoration: const InputDecoration(
                      labelText: 'Nome Campo (es. Origine Certificata)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<FieldDataType>(
                    value: selectedType,
                    dropdownColor: AppColors.surfaceElevated,
                    decoration: const InputDecoration(
                      labelText: 'Tipo di Dato',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: FieldDataType.textShort, child: Text('Testo Breve')),
                      DropdownMenuItem(value: FieldDataType.textLong, child: Text('Testo Esteso')),
                      DropdownMenuItem(value: FieldDataType.number, child: Text('Numero / Misura')),
                      DropdownMenuItem(value: FieldDataType.currency, child: Text('Valuta (€)')),
                      DropdownMenuItem(value: FieldDataType.date, child: Text('Data')),
                      DropdownMenuItem(value: FieldDataType.dropdown, child: Text('Lista a Discesa')),
                    ],
                    onChanged: (val) {
                      if (val != null) setModalState(() => selectedType = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  if (selectedType == FieldDataType.number) ...[
                    TextField(
                      controller: unitController,
                      decoration: const InputDecoration(
                        labelText: 'Unità di Misura (es. cm, kg, m)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Campo Obbligatorio', style: AppTypography.bodyMedium),
                    value: isRequired,
                    onChanged: (val) => setModalState(() => isRequired = val),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Annulla'),
              ),
              ElevatedButton(
                onPressed: () {
                  final name = nameController.text.trim();
                  if (name.isEmpty) return;

                  if (isEditing) {
                    ref.read(customFieldsProvider.notifier).updateField(
                      existingField.id,
                      existingField.copyWith(
                        name: name,
                        type: selectedType,
                        unit: unitController.text.trim().isNotEmpty ? unitController.text.trim() : null,
                        required: isRequired,
                      ),
                    );
                  } else {
                    ref.read(customFieldsProvider.notifier).addField(
                      CustomField(
                        id: const Uuid().v4(),
                        name: name,
                        type: selectedType,
                        uiType: FieldUIType.text,
                        unit: unitController.text.trim().isNotEmpty ? unitController.text.trim() : null,
                        required: isRequired,
                        order: 99,
                      ),
                    );
                  }

                  Navigator.pop(context);
                },
                child: Text(isEditing ? 'Salva' : 'Crea'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fieldsNotifier = ref.watch(customFieldsProvider.notifier);
    final activeFields = fieldsNotifier.activeFields;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Campi Personalizzati', style: AppTypography.titleMedium),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.accentGold),
            tooltip: 'Ripristina Campi di Sistema',
            onPressed: () {
              ref.read(customFieldsProvider.notifier).resetToDefaults();
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.black),
        label: Text('Nuovo Campo', style: AppTypography.buttonPrimary.copyWith(color: Colors.black)),
        onPressed: () => _showAddEditFieldModal(),
      ),
      body: ReorderableListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: activeFields.length,
        onReorder: (oldIndex, newIndex) {
          if (newIndex > oldIndex) newIndex--;
          final item = activeFields.removeAt(oldIndex);
          activeFields.insert(newIndex, item);
          ref.read(customFieldsProvider.notifier).reorderFields(
            activeFields.map((f) => f.id).toList(),
          );
        },
        itemBuilder: (context, index) {
          final field = activeFields[index];
          final isSystem = field.isSystem == true;

          return Card(
            key: ValueKey(field.id),
            color: AppColors.surface,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppColors.border),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: CircleAvatar(
                backgroundColor: isSystem ? AppColors.surfaceElevated : AppColors.primary.withAlpha(40),
                child: Icon(
                  isSystem ? Icons.lock_outline : Icons.tune,
                  color: isSystem ? AppColors.textSecondary : AppColors.accentGold,
                ),
              ),
              title: Row(
                children: [
                  Text(field.name, style: AppTypography.titleMedium),
                  if (field.required) ...[
                    const SizedBox(width: 6),
                    Text('*', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                  ],
                ],
              ),
              subtitle: Text(
                '${_getFieldTypeName(field.type)} ${field.unit != null ? "(${field.unit})" : ""} ${isSystem ? "[Di Sistema]" : ""}',
                style: AppTypography.bodySmall,
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!isSystem) ...[
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, color: AppColors.textSecondary),
                      onPressed: () => _showAddEditFieldModal(field),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: AppColors.error),
                      onPressed: () {
                        ref.read(customFieldsProvider.notifier).softDeleteField(field.id);
                      },
                    ),
                  ],
                  const Icon(Icons.drag_handle, color: AppColors.textMuted),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _getFieldTypeName(FieldDataType type) {
    switch (type) {
      case FieldDataType.textShort:
        return 'Testo Breve';
      case FieldDataType.textLong:
        return 'Testo Esteso';
      case FieldDataType.number:
        return 'Numero';
      case FieldDataType.currency:
        return 'Valuta (€)';
      case FieldDataType.date:
        return 'Data';
      case FieldDataType.dropdown:
        return 'Lista a Discesa';
      default:
        return 'Generico';
    }
  }
}
