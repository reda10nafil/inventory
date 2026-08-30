import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/constants/sector_templates.dart';
import '../../models/layout_config.dart';
import '../../models/custom_field.dart';
import '../../providers/layout_provider.dart';
import '../../providers/custom_fields_provider.dart';

class LayoutBuilderScreen extends ConsumerStatefulWidget {
  const LayoutBuilderScreen({super.key});

  @override
  ConsumerState<LayoutBuilderScreen> createState() => _LayoutBuilderScreenState();
}

class _LayoutBuilderScreenState extends ConsumerState<LayoutBuilderScreen> {
  String? _selectedFieldId;
  bool _hasChanges = false;

  double _widthPercentForSize(FieldSize size) {
    switch (size) {
      case FieldSize.small:
        return 0.33;
      case FieldSize.medium:
        return 0.5;
      case FieldSize.half:
        return 0.5;
      case FieldSize.full:
        return 1.0;
    }
  }

  String _labelForSize(FieldSize size) {
    switch (size) {
      case FieldSize.small:
        return '1/3 (33%)';
      case FieldSize.medium:
      case FieldSize.half:
        return '1/2 (50%)';
      case FieldSize.full:
        return 'Intera (100%)';
    }
  }

  IconData _iconDataFromString(String? name) {
    if (name == 'straighten') return Icons.straighten;
    if (name == 'palette') return Icons.palette;
    if (name == 'ac_unit') return Icons.ac_unit;
    if (name == 'local_shipping') return Icons.local_shipping;
    if (name == 'verified') return Icons.verified;
    if (name == 'star') return Icons.star;
    if (name == 'event') return Icons.event;
    if (name == 'diamond') return Icons.diamond;
    if (name == 'auto_awesome') return Icons.auto_awesome;
    if (name == 'sell') return Icons.sell;
    if (name == 'inventory') return Icons.inventory;
    if (name == 'qr-code' || name == 'qr_code') return Icons.qr_code;
    if (name == 'text-fields' || name == 'text_fields') return Icons.text_fields;
    if (name == 'calendar-today' || name == 'calendar_today') return Icons.calendar_today;
    if (name == 'image') return Icons.image;
    if (name == 'person') return Icons.person;
    if (name == 'check-box' || name == 'check_box') return Icons.check_box;
    if (name == 'menu') return Icons.menu;
    return Icons.tune;
  }

  void _moveField(int index, String direction) {
    final layout = ref.read(layoutProvider);
    final fields = List<LayoutField>.from(layout.fields);
    if (direction == 'up' && index == 0) return;
    if (direction == 'down' && index == fields.length - 1) return;

    final targetIndex = direction == 'up' ? index - 1 : index + 1;
    final temp = fields[index];
    fields[index] = fields[targetIndex];
    fields[targetIndex] = temp;

    ref.read(layoutProvider.notifier).updateFieldOrder(fields);
    setState(() => _hasChanges = true);
  }

  void _addSectionHeader() {
    final section = LayoutField(
      id: 'section_${DateTime.now().millisecondsSinceEpoch}',
      type: 'section',
      size: FieldSize.full,
      visible: true,
      label: 'NUOVA SEZIONE',
    );
    ref.read(layoutProvider.notifier).addFieldToLayout(section);
    setState(() => _hasChanges = true);
  }

  void _showAddFieldModal() {
    final customFields = ref.read(customFieldsProvider);
    final layoutFields = ref.read(layoutProvider).fields;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Aggiungi Campo al Layout', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 8),
              const Text('Seleziona un campo dal registro per aggiungerlo al form Aggiungi Prodotto.', style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 16),
              SizedBox(
                height: 300,
                child: ListView.builder(
                  itemCount: customFields.length,
                  itemBuilder: (c, i) {
                    final cf = customFields[i];
                    final alreadyAdded = layoutFields.any((lf) => lf.id == cf.id);
                    if (alreadyAdded) return const SizedBox.shrink();

                    return ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(_iconDataFromString(cf.icon), color: AppColors.primary),
                      ),
                      title: Text(cf.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      subtitle: Text(cf.isSystem == true ? 'Campo di Sistema' : 'Campo Personalizzato', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                      trailing: const Icon(Icons.add_circle, color: AppColors.accentGold),
                      onTap: () {
                        final newField = LayoutField(
                          id: cf.id,
                          type: cf.isSystem == true ? 'base' : 'custom',
                          size: FieldSize.medium,
                          visible: true,
                        );
                        ref.read(layoutProvider.notifier).addFieldToLayout(newField);
                        setState(() => _hasChanges = true);
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Campo "${cf.name}" aggiunto al layout!')),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showTemplatesModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Modelli di Settore', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 8),
              const Text('Sostituisci il layout attuale con campi consigliati per il settore selezionato.', style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 16),
              SizedBox(
                height: 280,
                child: ListView.builder(
                  itemCount: SectorTemplates.templates.length,
                  itemBuilder: (c, i) {
                    final t = SectorTemplates.templates[i];
                    final color = AppColors.fromHex(t.color);
                    return Card(
                      color: AppColors.backgroundSecondary,
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: color.withValues(alpha: 0.3),
                          child: Text(t.emoji),
                        ),
                        title: Text(t.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        subtitle: Text(t.description, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: AppColors.textSecondary),
                        onTap: () async {
                          final customFieldsNotifier = ref.read(customFieldsProvider.notifier);
                          final currentFields = ref.read(customFieldsProvider);

                          int imported = 0;
                          for (final tf in t.fields) {
                            final exists = currentFields.any((f) =>
                                f.deletedAt == null && f.name.toLowerCase() == tf.name.toLowerCase());
                            if (!exists) {
                              List<dynamic>? opts;
                              if (tf.options != null) {
                                opts = tf.options!
                                    .map((o) => {'id': o['id'] ?? '', 'label': o['label'] ?? ''})
                                    .toList();
                              }
                              await customFieldsNotifier.addField(CustomField(
                                id: 'field_${DateTime.now().millisecondsSinceEpoch}_$imported',
                                name: tf.name,
                                type: tf.type,
                                uiType: tf.uiType,
                                icon: tf.icon,
                                unit: tf.unit,
                                required: tf.required,
                                options: opts,
                                dataset: tf.dataset,
                                order: currentFields.length + imported,
                              ));
                              imported++;
                            }
                          }

                          Navigator.pop(ctx);
                          setState(() => _hasChanges = true);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Modello "${t.name}" applicato ($imported campi aggiunti)!')),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final layout = ref.watch(layoutProvider);
    final fields = layout.fields;
    final customFields = ref.watch(customFieldsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Layout Builder Form Aggiungi', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.auto_awesome, color: AppColors.accentGold),
            tooltip: 'Carica Modello',
            onPressed: _showTemplatesModal,
          ),
          IconButton(
            icon: const Icon(Icons.playlist_add, color: AppColors.accentGold),
            tooltip: 'Aggiungi Sezione',
            onPressed: _addSectionHeader,
          ),
          IconButton(
            icon: const Icon(Icons.add_circle, color: AppColors.accentGold),
            tooltip: 'Aggiungi Campo',
            onPressed: _showAddFieldModal,
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.accentGold),
            tooltip: 'Ripristina Default',
            onPressed: () {
              ref.read(layoutProvider.notifier).resetToDefault();
              setState(() => _hasChanges = false);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Layout ripristinato al default.')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            color: AppColors.backgroundSecondary,
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: AppColors.accentGold, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Riordina, attiva/disattiva o cambia la dimensione dei campi nel form Aggiungi Prodotto.',
                    style: AppTypography.caption.copyWith(color: AppColors.textSecondary),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ReorderableListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: fields.length,
              onReorder: (oldIndex, newIndex) {
                if (newIndex > oldIndex) newIndex--;
                final list = List<LayoutField>.from(fields);
                final item = list.removeAt(oldIndex);
                list.insert(newIndex, item);
                ref.read(layoutProvider.notifier).updateFieldOrder(list);
                setState(() => _hasChanges = true);
              },
              itemBuilder: (context, index) {
                final field = fields[index];
                final isSelected = _selectedFieldId == field.id;
                final isSection = field.type == 'section';

                // Resolve label/icon
                String displayLabel = field.label ?? field.id;
                IconData displayIcon = _iconDataFromString(field.icon);
                if (field.type == 'custom') {
                  CustomField? cf;
                  try {
                    cf = customFields.firstWhere((c) => c.id == field.id);
                  } catch (_) {
                    cf = null;
                  }
                  if (cf != null) {
                    displayLabel = field.label ?? cf.name;
                    displayIcon = _iconDataFromString(cf.icon);
                  }
                }

                return Card(
                  key: ValueKey(field.id),
                  color: AppColors.surface,
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: isSelected ? AppColors.accentGold : AppColors.border,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      ListTile(
                        onTap: () => setState(() => _selectedFieldId = isSelected ? null : field.id),
                        leading: isSection
                            ? const Icon(Icons.menu, color: AppColors.accentGold)
                            : Icon(displayIcon, color: field.visible ? AppColors.accentGold : AppColors.textMuted),
                        title: Text(
                          displayLabel.toUpperCase(),
                          style: AppTypography.titleMedium.copyWith(
                            color: field.visible ? Colors.white : AppColors.textMuted,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        subtitle: Text(
                          isSection ? 'Sezione Intestazione' : 'Dimensione: ${_labelForSize(field.size)}',
                          style: AppTypography.caption.copyWith(color: AppColors.textSecondary),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: Icon(field.visible ? Icons.check_circle : Icons.circle_outlined, color: field.visible ? AppColors.success : AppColors.textMuted),
                              onPressed: () {
                                ref.read(layoutProvider.notifier).toggleFieldVisibility(field.id);
                                setState(() => _hasChanges = true);
                              },
                            ),
                            const Icon(Icons.drag_handle, color: AppColors.textMuted),
                          ],
                        ),
                      ),
                      if (isSelected && !isSection)
                        Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Dimensione Colonna:', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 8),
                              Row(
                                children: [FieldSize.small, FieldSize.medium, FieldSize.full].map((size) {
                                  final isActive = field.size == size || (size == FieldSize.medium && field.size == FieldSize.half);
                                  return Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 4.0),
                                      child: ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: isActive ? AppColors.accentGold : AppColors.backgroundSecondary,
                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                        ),
                                        onPressed: () {
                                          ref.read(layoutProvider.notifier).updateFieldSize(field.id, size);
                                          setState(() => _hasChanges = true);
                                        },
                                        child: Text(
                                          size == FieldSize.small ? '1/3' : size == FieldSize.medium ? '1/2' : 'Intera',
                                          style: TextStyle(color: isActive ? Colors.black : Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  TextButton.icon(
                                    icon: const Icon(Icons.delete, color: AppColors.error, size: 18),
                                    label: const Text('Rimuovi', style: TextStyle(color: AppColors.error, fontSize: 12)),
                                    onPressed: () {
                                      ref.read(layoutProvider.notifier).removeFieldFromLayout(field.id);
                                      setState(() => _hasChanges = false);
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: _hasChanges
          ? SafeArea(
              child: Container(
                padding: const EdgeInsets.all(16),
                color: AppColors.backgroundSecondary,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.check, color: Colors.black),
                  label: const Text('Salva Modifiche Layout', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentGold,
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    setState(() => _hasChanges = false);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Layout aggiornato e applicato al form!')),
                    );
                  },
                ),
              ),
            )
          : null,
    );
  }
}
