import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/layout_config.dart';
import '../../providers/layout_provider.dart';
import '../../services/sound_service.dart';

class LayoutBuilderScreen extends ConsumerWidget {
  const LayoutBuilderScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final layoutConfig = ref.watch(layoutProvider);
    final fields = layoutConfig.fields;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Layout Builder Form Aggiungi', style: AppTypography.titleMedium),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.accentGold),
            tooltip: 'Ripristina Layout Default',
            onPressed: () {
              ref.read(layoutProvider.notifier).resetToDefault();
              SoundService.playBeep();
            },
          ),
        ],
      ),
      body: ReorderableListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: fields.length,
        onReorder: (oldIndex, newIndex) {
          if (newIndex > oldIndex) newIndex--;
          final list = List<LayoutField>.from(fields);
          final item = list.removeAt(oldIndex);
          list.insert(newIndex, item);
          ref.read(layoutProvider.notifier).updateFieldOrder(list);
          SoundService.playBeep();
        },
        itemBuilder: (context, index) {
          final field = fields[index];

          return Card(
            key: ValueKey(field.id),
            color: AppColors.surface,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: field.visible ? AppColors.border : AppColors.border.withAlpha(50),
              ),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: Icon(
                field.visible ? Icons.visibility : Icons.visibility_off,
                color: field.visible ? AppColors.accentGold : AppColors.textMuted,
              ),
              title: Text(
                field.label ?? field.name ?? field.id,
                style: AppTypography.titleMedium.copyWith(
                  color: field.visible ? AppColors.textPrimary : AppColors.textMuted,
                ),
              ),
              subtitle: Text(
                'Dimensione: ${field.size == FieldSize.full ? "Riga Intera (100%)" : "Mezza Riga (50%)"}',
                style: AppTypography.bodySmall,
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: Icon(
                      field.size == FieldSize.full ? Icons.view_headline : Icons.view_column,
                      color: AppColors.accentGold,
                    ),
                    tooltip: 'Cambia Dimensione',
                    onPressed: () {
                      final newSize = field.size == FieldSize.full ? FieldSize.half : FieldSize.full;
                      ref.read(layoutProvider.notifier).updateFieldSize(field.id, newSize);
                      SoundService.playBeep();
                    },
                  ),
                  IconButton(
                    icon: Icon(
                      field.visible ? Icons.check_circle : Icons.circle_outlined,
                      color: field.visible ? AppColors.success : AppColors.textMuted,
                    ),
                    onPressed: () {
                      ref.read(layoutProvider.notifier).toggleFieldVisibility(field.id);
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
    );
  }
}
