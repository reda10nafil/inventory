import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/custom_field.dart';

class DynamicFieldRenderer extends StatelessWidget {
  final CustomField field;
  final dynamic value;
  final ValueChanged<dynamic>? onChanged;

  const DynamicFieldRenderer({
    super.key,
    required this.field,
    this.value,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isReadOnly = onChanged == null;

    switch (field.type) {
      case FieldDataType.textShort:
        if (isReadOnly) return _buildReadOnlyTile(field.name, value?.toString() ?? 'N/D');
        return TextField(
          controller: TextEditingController(text: value?.toString() ?? ''),
          decoration: InputDecoration(
            labelText: field.name,
            border: const OutlineInputBorder(),
            suffixText: field.unit,
          ),
          onChanged: onChanged,
        );

      case FieldDataType.textLong:
        if (isReadOnly) return _buildReadOnlyTile(field.name, value?.toString() ?? 'N/D');
        return TextField(
          controller: TextEditingController(text: value?.toString() ?? ''),
          maxLines: 3,
          decoration: InputDecoration(
            labelText: field.name,
            border: const OutlineInputBorder(),
          ),
          onChanged: onChanged,
        );

      case FieldDataType.number:
      case FieldDataType.currency:
        if (isReadOnly) {
          final prefix = field.type == FieldDataType.currency ? '€' : '';
          final suffix = field.unit != null ? ' ${field.unit}' : '';
          return _buildReadOnlyTile(field.name, '$prefix${value?.toString() ?? "0.00"}$suffix');
        }
        return TextField(
          controller: TextEditingController(text: value?.toString() ?? ''),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: field.name,
            prefixText: field.type == FieldDataType.currency ? '€ ' : null,
            suffixText: field.unit,
            border: const OutlineInputBorder(),
          ),
          onChanged: (val) {
            final numVal = double.tryParse(val);
            onChanged?.call(numVal);
          },
        );

      case FieldDataType.dropdown:
        final options = field.options ?? [];
        if (isReadOnly) return _buildReadOnlyTile(field.name, value?.toString() ?? 'N/D');
        final currentVal = value?.toString();
        final selected = (currentVal != null && options.contains(currentVal))
            ? currentVal
            : (options.isNotEmpty ? options.first.toString() : null);
        return DropdownButtonFormField<String>(
          value: selected,
          dropdownColor: AppColors.surfaceElevated,
          decoration: InputDecoration(
            labelText: field.name,
            border: const OutlineInputBorder(),
          ),
          items: options
              .map<DropdownMenuItem<String>>(
                (opt) => DropdownMenuItem<String>(
                  value: opt.toString(),
                  child: Text(opt.toString()),
                ),
              )
              .toList(),
          onChanged: (val) => onChanged?.call(val),
        );

      default:
        return _buildReadOnlyTile(field.name, value?.toString() ?? 'N/D');
    }
  }

  Widget _buildReadOnlyTile(String label, String val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
          Text(val, style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
