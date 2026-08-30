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
  IconData _iconDataFromString(String? name) {
    if (name == 'tune') return Icons.tune;
    if (name == 'text_fields' || name == 'text-fields') return Icons.text_fields;
    if (name == 'tag') return Icons.label;
    if (name == 'calendar_today' || name == 'calendar-today') return Icons.calendar_today;
    if (name == 'image') return Icons.image;
    if (name == 'list') return Icons.list;
    if (name == 'check_box' || name == 'check-box') return Icons.check_box;
    if (name == 'attach_money' || name == 'attach-money') return Icons.attach_money;
    if (name == 'straighten') return Icons.straighten;
    if (name == 'place') return Icons.place;
    if (name == 'description') return Icons.description;
    if (name == 'person') return Icons.person;
    if (name == 'local_shipping' || name == 'local-shipping') return Icons.local_shipping;
    if (name == 'palette') return Icons.palette;
    if (name == 'qr_code' || name == 'qr-code') return Icons.qr_code;
    if (name == 'category') return Icons.category;
    if (name == 'sell') return Icons.sell;
    if (name == 'star') return Icons.star;
    if (name == 'verified') return Icons.verified;
    return Icons.tune;
  }

  void _showAddEditFieldModal([CustomField? existingField]) {
    final isEditing = existingField != null;
    final nameController = TextEditingController(text: existingField?.name ?? '');
    final unitController = TextEditingController(text: existingField?.unit ?? '');
    FieldDataType selectedType = existingField?.type ?? FieldDataType.textShort;
    FieldUIType selectedUIType = existingField?.uiType ?? FieldUIType.text;
    String selectedIcon = existingField?.icon ?? 'tune';
    bool isRequired = existingField?.required ?? false;
    bool isBarcode = existingField?.isBarcode ?? false;
    String? linkTo = existingField?.linkTo;
    List<TextEditingController> optionControllers = [];

    if (existingField?.dataset is List) {
      final list = existingField!.dataset as List;
      for (var o in list) {
        optionControllers.add(TextEditingController(text: o.toString()));
      }
    }
    if (optionControllers.isEmpty) {
      optionControllers.add(TextEditingController());
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
              top: 20,
              left: 20,
              right: 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isEditing ? 'Modifica Campo' : 'Crea Nuovo Campo',
                        style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  TextField(
                    controller: nameController,
                    autofocus: !isEditing,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Nome Campo *',
                      labelStyle: const TextStyle(color: AppColors.textSecondary),
                      filled: true,
                      fillColor: AppColors.backgroundSecondary,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 16),

                  DropdownButtonFormField<FieldDataType>(
                    value: selectedType,
                    dropdownColor: AppColors.surfaceElevated,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Tipo di Dato',
                      labelStyle: const TextStyle(color: AppColors.textSecondary),
                      filled: true,
                      fillColor: AppColors.backgroundSecondary,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: const [
                      DropdownMenuItem(value: FieldDataType.textShort, child: Text('Testo Breve')),
                      DropdownMenuItem(value: FieldDataType.textLong, child: Text('Testo Esteso')),
                      DropdownMenuItem(value: FieldDataType.number, child: Text('Numero / Misura')),
                      DropdownMenuItem(value: FieldDataType.currency, child: Text('Valuta (€)')),
                      DropdownMenuItem(value: FieldDataType.date, child: Text('Data')),
                      DropdownMenuItem(value: FieldDataType.singleChoice, child: Text('Scelta Singola')),
                      DropdownMenuItem(value: FieldDataType.multiChoice, child: Text('Scelta Multipla')),
                      DropdownMenuItem(value: FieldDataType.images, child: Text('Immagini')),
                      DropdownMenuItem(value: FieldDataType.document, child: Text('Documento PDF')),
                      DropdownMenuItem(value: FieldDataType.dropdown, child: Text('Lista a Discesa')),
                    ],
                    onChanged: (val) {
                      if (val != null) setModalState(() => selectedType = val);
                    },
                  ),
                  const SizedBox(height: 16),

                  if (selectedType == FieldDataType.number || selectedType == FieldDataType.currency) ...[
                    TextField(
                      controller: unitController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Unità di Misura (opzionale)',
                        hintText: 'Es: cm, kg, €',
                        hintStyle: const TextStyle(color: AppColors.textMuted),
                        labelStyle: const TextStyle(color: AppColors.textSecondary),
                        filled: true,
                        fillColor: AppColors.backgroundSecondary,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (selectedType == FieldDataType.textShort) ...[
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Abilita Scanner Barcode / QR', style: TextStyle(color: Colors.white)),
                      subtitle: const Text('Mostra bottone per scansione diretta nel campo', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      value: isBarcode,
                      onChanged: (val) => setModalState(() => isBarcode = val ?? false),
                      activeColor: AppColors.primary,
                    ),
                    const SizedBox(height: 8),
                  ],

                  if (selectedType == FieldDataType.singleChoice || selectedType == FieldDataType.multiChoice) ...[
                    Text('Aspetto UI', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        _uiChoiceChip('Grid', FieldUIType.grid, selectedUIType, (val) => setModalState(() => selectedUIType = val)),
                        _uiChoiceChip('Segmented', FieldUIType.segmented, selectedUIType, (val) => setModalState(() => selectedUIType = val)),
                        _uiChoiceChip('Picker', FieldUIType.picker, selectedUIType, (val) => setModalState(() => selectedUIType = val)),
                        _uiChoiceChip('Modal List', FieldUIType.modalList, selectedUIType, (val) => setModalState(() => selectedUIType = val)),
                      ],
                    ),
                    const SizedBox(height: 16),

                    Text('Sorgente Dati (Opzionale)', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        _linkToChip('Manuale', null, linkTo, (val) => setModalState(() => linkTo = val)),
                        _linkToChip('Posizioni (Locations)', 'locations', linkTo, (val) => setModalState(() => linkTo = val)),
                        _linkToChip('Cartelle (Libraries)', 'libraries', linkTo, (val) => setModalState(() => linkTo = val)),
                        _linkToChip('Categorie (FurType)', 'furType', linkTo, (val) => setModalState(() => linkTo = val)),
                      ],
                    ),
                    const SizedBox(height: 12),

                    if (linkTo == null) ...[
                      Text('Opzioni Menu (Manuale)', style: AppTypography.caption.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      ...optionControllers.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final ctrl = entry.value;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: ctrl,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: InputDecoration(
                                    hintText: 'Valore Opzione ${idx + 1}',
                                    hintStyle: const TextStyle(color: AppColors.textMuted),
                                    filled: true,
                                    fillColor: AppColors.backgroundSecondary,
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ),
                              if (optionControllers.length > 1)
                                IconButton(
                                  icon: const Icon(Icons.remove_circle, color: AppColors.error),
                                  onPressed: () {
                                    setModalState(() => optionControllers.removeAt(idx));
                                  },
                                ),
                            ],
                          ),
                        );
                      }),
                      TextButton.icon(
                        icon: const Icon(Icons.add, color: AppColors.primary),
                        label: const Text('Aggiungi Opzione', style: TextStyle(color: AppColors.primary)),
                        onPressed: () {
                          setModalState(() => optionControllers.add(TextEditingController()));
                        },
                      ),
                    ],
                  ],

                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Campo obbligatorio in fase di aggiunta', style: TextStyle(color: Colors.white)),
                    value: isRequired,
                    onChanged: (val) => setModalState(() => isRequired = val ?? false),
                    activeColor: AppColors.primary,
                  ),

                  const SizedBox(height: 20),

                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Annulla', style: TextStyle(color: AppColors.textSecondary)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () {
                            final name = nameController.text.trim();
                            if (name.isEmpty) return;

                            dynamic dataset;
                            List<dynamic>? options;
                            if (selectedType == FieldDataType.singleChoice || selectedType == FieldDataType.multiChoice) {
                              if (linkTo == null) {
                                dataset = optionControllers.map((c) => c.text.trim()).where((t) => t.isNotEmpty).toList();
                                options = dataset.map<dynamic>((o) => {'id': o, 'label': o}).toList();
                              }
                            }

                            final fieldToSave = CustomField(
                              id: existingField?.id ?? const Uuid().v4(),
                              name: name,
                              type: selectedType,
                              uiType: selectedUIType,
                              dataset: dataset,
                              unit: unitController.text.trim().isNotEmpty ? unitController.text.trim() : null,
                              icon: selectedIcon,
                              options: options,
                              required: isRequired,
                              isBarcode: isBarcode ? true : null,
                              linkTo: linkTo,
                              order: existingField?.order ?? 99,
                              isSystem: existingField?.isSystem,
                            );

                            if (isEditing) {
                              ref.read(customFieldsProvider.notifier).updateField(fieldToSave.id, fieldToSave);
                            } else {
                              ref.read(customFieldsProvider.notifier).addField(fieldToSave);
                            }

                            Navigator.pop(context);
                          },
                          child: Text(isEditing ? 'Salva Campo' : 'Crea Campo', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _uiChoiceChip(String label, FieldUIType type, FieldUIType current, Function(FieldUIType) onSelect) {
    final isActive = current == type;
    return ChoiceChip(
      label: Text(label, style: TextStyle(color: isActive ? Colors.black : Colors.white, fontSize: 12)),
      selected: isActive,
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.surfaceElevated,
      onSelected: (_) => onSelect(type),
    );
  }

  Widget _linkToChip(String label, String? type, String? current, Function(String?) onSelect) {
    final isActive = current == type;
    return ChoiceChip(
      label: Text(label, style: TextStyle(color: isActive ? Colors.black : Colors.white, fontSize: 12)),
      selected: isActive,
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.surfaceElevated,
      onSelected: (_) => onSelect(type),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fields = ref.watch(customFieldsProvider);
    final activeFields = fields.where((f) => f.deletedAt == null).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Campi Personalizzati', style: TextStyle(fontWeight: FontWeight.bold)),
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
        label: const Text('Nuovo Campo', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        onPressed: () => _showAddEditFieldModal(),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16.0),
            color: AppColors.backgroundSecondary,
            child: Row(
              children: [
                const Icon(Icons.security, color: AppColors.primary, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Se elimini un campo, finirà nel Cestino. I prodotti già creati manterranno i loro dati originali.',
                    style: AppTypography.caption.copyWith(color: AppColors.textSecondary, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ReorderableListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: activeFields.length,
              onReorder: (oldIndex, newIndex) {
                if (newIndex > oldIndex) newIndex--;
                final list = List<CustomField>.from(activeFields);
                final item = list.removeAt(oldIndex);
                list.insert(newIndex, item);
                ref.read(customFieldsProvider.notifier).reorderFields(list.map((f) => f.id).toList());
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
                        isSystem ? Icons.lock_outline : _iconDataFromString(field.icon),
                        color: isSystem ? AppColors.textSecondary : AppColors.accentGold,
                      ),
                    ),
                    title: Row(
                      children: [
                        Text(field.name, style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold)),
                        if (field.required) ...[
                          const SizedBox(width: 6),
                          Text('*', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                        ],
                      ],
                    ),
                    subtitle: Text(
                      '${field.type.name}${field.unit != null ? " (${field.unit})" : ""} ${isSystem ? "[Di Sistema]" : ""}',
                      style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (!isSystem) ...[
                          IconButton(
                            icon: const Icon(Icons.edit, color: AppColors.accentGold, size: 20),
                            onPressed: () => _showAddEditFieldModal(field),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete, color: AppColors.error, size: 20),
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
          ),
        ],
      ),
    );
  }
}
