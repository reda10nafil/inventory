import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../core/constants/config.dart';
import '../models/custom_field.dart';
import '../providers/inventory_provider.dart';
import '../providers/locations_provider.dart';
import 'app_image.dart';

/// Singola opzione risolta per campi chooser.
class FieldOption {
  final String id;
  final String label;
  const FieldOption(this.id, this.label);
}

/// Renderer/editore completo dei campi personalizzati.
/// Porting 1:1 di components/DynamicFieldRenderer.tsx (React Native).
class DynamicFieldEditor extends ConsumerWidget {
  final CustomField field;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;

  const DynamicFieldEditor({
    super.key,
    required this.field,
    required this.value,
    required this.onChanged,
  });

  /// Risolve le opzioni da: field.options, dataset (lista) o linkTo.
  List<FieldOption> _resolveOptions(WidgetRef ref) {
    // linkTo ha priorita' (lista dinamica da provider)
    switch (field.linkTo) {
      case 'locations':
        return ref
            .watch(locationsProvider)
            .map((l) => FieldOption(l.id, l.name))
            .toList();
      case 'libraries':
        return ref
            .watch(inventoryProvider.select((s) => s.libraries))
            .map((l) => FieldOption(l.id, l.name))
            .toList();
      case 'furType':
        return AppConfig.furTypes
            .map((f) => FieldOption(f['id']!, f['label']!))
            .toList();
    }
    final raw = field.options ?? (field.dataset is List ? field.dataset as List : null);
    if (raw == null) return [];
    return raw.map<FieldOption>((o) {
      if (o is Map) {
        return FieldOption(
          (o['id'] ?? o['label'] ?? '').toString(),
          (o['label'] ?? o['id'] ?? '').toString(),
        );
      }
      return FieldOption(o.toString(), o.toString());
    }).toList();
  }

  String _displayValue() {
    if (value == null) return '';
    if (value is DateTime) return DateFormat('dd/MM/yyyy').format(value);
    final s = value.toString();
    final parsed = DateTime.tryParse(s);
    if (field.type == FieldDataType.date && parsed != null) {
      return DateFormat('dd/MM/yyyy').format(parsed);
    }
    return s;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final options = _resolveOptions(ref);
    final label = '${field.name}${field.required ? ' *' : ''}${field.unit != null && field.unit!.isNotEmpty ? ' (${field.unit})' : ''}';

    Widget child;

    // Stepper (uiType prioritario per numerici)
    if (field.uiType == FieldUIType.stepper) {
      final ds = field.dataset is Map ? Map<String, dynamic>.from(field.dataset as Map) : <String, dynamic>{};
      final minV = (ds['min'] as num?)?.toDouble() ?? 0;
      final maxV = (ds['max'] as num?)?.toDouble() ?? 100;
      final step = (ds['step'] as num?)?.toDouble() ?? 1;
      final current = (value is num) ? (value as num).toDouble() : double.tryParse(value?.toString() ?? '') ?? minV;
      child = _Stepper(
        value: current,
        min: minV,
        max: maxV,
        step: step,
        unit: field.unit,
        onChanged: (v) => onChanged(v == v.roundToDouble() && step == step.roundToDouble() ? v.toInt() : v),
      );
    } else if (field.type == FieldDataType.singleChoice ||
        field.uiType == FieldUIType.grid ||
        field.uiType == FieldUIType.segmented ||
        ((field.uiType == FieldUIType.picker || field.uiType == FieldUIType.modalList) &&
            field.type != FieldDataType.multiChoice &&
            field.type != FieldDataType.textShort &&
            field.type != FieldDataType.number &&
            field.type != FieldDataType.currency &&
            field.type != FieldDataType.textLong &&
            field.type != FieldDataType.date &&
            field.type != FieldDataType.images &&
            field.type != FieldDataType.document)) {
      if (field.uiType == FieldUIType.picker || field.uiType == FieldUIType.modalList) {
        child = _ModalPickerField(
          label: label,
          placeholder: 'Seleziona ${field.name.toLowerCase()}',
          options: options,
          multi: false,
          value: value?.toString(),
          onChanged: onChanged,
        );
      } else {
        child = _ChoiceChips(
          options: options,
          multi: false,
          selected: value is List ? (value as List).map((e) => e.toString()).toSet() : {value?.toString() ?? ''},
          onChanged: (sel) => onChanged(sel.isEmpty ? null : sel.first),
        );
      }
    } else {
      switch (field.type) {
        case FieldDataType.singleChoice:
          child = _ChoiceChips(
            options: options,
            multi: false,
            selected: value is List ? (value as List).map((e) => e.toString()).toSet() : {value?.toString() ?? ''},
            onChanged: (sel) => onChanged(sel.isEmpty ? null : sel.first),
          );
        case FieldDataType.textShort:
          child = _TextFieldWithBarcode(
            field: field,
            value: value?.toString() ?? '',
            onChanged: onChanged,
          );
        case FieldDataType.textLong:
          child = _StyledTextField(
            initialValue: value?.toString() ?? '',
            hint: 'Inserisci ${field.name.toLowerCase()}',
            maxLines: 3,
            onChanged: onChanged,
          );
        case FieldDataType.number:
        case FieldDataType.currency:
          child = _StyledTextField(
            initialValue: value?.toString() ?? '',
            hint: field.type == FieldDataType.currency ? '0.00' : 'Inserisci ${field.name.toLowerCase()}',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            prefixText: field.type == FieldDataType.currency ? '€ ' : null,
            onChanged: (v) {
              final n = double.tryParse(v.replaceAll(',', '.'));
              onChanged(n ?? v);
            },
          );
        case FieldDataType.date:
          child = _DateField(
            display: _displayValue(),
            hint: 'Seleziona ${field.name.toLowerCase()}',
            onPick: () async {
              final now = DateTime.now();
              final initial = DateTime.tryParse(value?.toString() ?? '') ?? now;
              final picked = await showDatePicker(
                context: context,
                initialDate: initial,
                firstDate: DateTime(1990),
                lastDate: DateTime(now.year + 10),
                builder: (ctx, c) => Theme(
                  data: ThemeData.dark().copyWith(
                    colorScheme: const ColorScheme.dark(
                      primary: AppColors.primary,
                      surface: AppColors.surface,
                      onSurface: AppColors.textPrimary,
                    ),
                  ),
                  child: c!,
                ),
              );
              if (picked != null) onChanged(picked.toIso8601String());
            },
          );
        case FieldDataType.images:
          child = _ImagesField(
            images: value is List ? (value as List).map((e) => e.toString()).toList() : const [],
            onChanged: (imgs) => onChanged(imgs),
          );
        case FieldDataType.document:
          child = _DocumentField(
            docs: value is List ? (value as List).map((e) => e.toString()).toList() : (value != null && value.toString().isNotEmpty ? [value.toString()] : const []),
            onChanged: (docs) => onChanged(docs),
          );
        case FieldDataType.multiChoice:
          child = field.uiType == FieldUIType.picker || field.uiType == FieldUIType.modalList
              ? _ModalPickerField(
                  label: label,
                  placeholder: 'Seleziona ${field.name.toLowerCase()}',
                  options: options,
                  multi: true,
                  value: value,
                  onChanged: onChanged,
                )
              : _ChoiceChips(
                  options: options,
                  multi: true,
                  selected: value is List ? (value as List).map((e) => e.toString()).toSet() : const {},
                  onChanged: (sel) => onChanged(sel.toList()),
                );
        case FieldDataType.dropdown:
          child = Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: options.any((o) => o.id == value?.toString()) ? value?.toString() : null,
                dropdownColor: AppColors.surfaceElevated,
                isExpanded: true,
                hint: Text('Seleziona ${field.name.toLowerCase()}', style: const TextStyle(color: AppColors.textMuted)),
                style: const TextStyle(color: AppColors.textPrimary),
                items: options.map((o) => DropdownMenuItem(value: o.id, child: Text(o.label))).toList(),
                onChanged: (v) => onChanged(v),
              ),
            ),
          );
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.caption.copyWith(
            color: AppColors.textMuted,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }
}

/// Renderer read-only (sola lettura) per dettaglio/preview.
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
    if (onChanged != null) {
      return DynamicFieldEditor(field: field, value: value, onChanged: onChanged!);
    }
    String display;
    final v = value;
    if (v == null || (v is String && v.isEmpty) || (v is List && v.isEmpty)) {
      display = 'N/D';
    } else if (v is List) {
      display = v
          .map((e) {
            final opts = field.options;
            if (opts != null) {
              for (final o in opts) {
                if (o is Map && o['id']?.toString() == e.toString()) {
                  return o['label']?.toString() ?? e.toString();
                }
              }
            }
            return e.toString();
          })
          .join(', ');
    } else if (field.type == FieldDataType.date) {
      final d = DateTime.tryParse(v.toString());
      display = d != null ? DateFormat('dd/MM/yyyy').format(d) : v.toString();
    } else if (field.type == FieldDataType.currency) {
      display = '€ ${v.toString()}${field.unit != null ? ' ${field.unit}' : ''}';
    } else {
      display = v.toString();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(field.name, style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
          ),
          Flexible(
            child: Text(
              display,
              style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Componenti interni
// ---------------------------------------------------------------------------

InputDecoration _darkInputDecoration(String hint, {String? prefixText, Widget? suffix}) {
  return InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(color: AppColors.textMuted),
    prefixText: prefixText,
    prefixStyle: const TextStyle(color: AppColors.textPrimary),
    suffixIcon: suffix,
    filled: true,
    fillColor: AppColors.surface,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.border),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.primary),
    ),
  );
}

class _StyledTextField extends StatelessWidget {
  final String initialValue;
  final String hint;
  final int maxLines;
  final TextInputType? keyboardType;
  final String? prefixText;
  final ValueChanged<String> onChanged;

  const _StyledTextField({
    required this.initialValue,
    required this.hint,
    this.maxLines = 1,
    this.keyboardType,
    this.prefixText,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      initialValue: initialValue,
      maxLines: maxLines,
      keyboardType: keyboardType,
      style: const TextStyle(color: AppColors.textPrimary),
      decoration: _darkInputDecoration(hint, prefixText: prefixText),
      onChanged: onChanged,
    );
  }
}

class _TextFieldWithBarcode extends StatelessWidget {
  final CustomField field;
  final String value;
  final ValueChanged<dynamic> onChanged;

  const _TextFieldWithBarcode({
    required this.field,
    required this.value,
    required this.onChanged,
  });

  Future<void> _openScanner(BuildContext context) async {
    final result = await Navigator.of(context).push<String?>(
      MaterialPageRoute(builder: (_) => const _InlineBarcodeScanner()),
    );
    if (result != null && result.isNotEmpty) onChanged(result);
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      initialValue: value,
      style: const TextStyle(color: AppColors.textPrimary),
      decoration: _darkInputDecoration(
        field.isBarcode == true ? 'Scansiona o inserisci ${field.name.toLowerCase()}' : 'Inserisci ${field.name.toLowerCase()}',
        suffix: field.isBarcode == true
            ? IconButton(
                icon: const Icon(Icons.qr_code_scanner_rounded, color: AppColors.primary),
                tooltip: 'Scansiona',
                onPressed: () => _openScanner(context),
              )
            : null,
      ),
      onChanged: onChanged,
    );
  }
}

/// Scanner inline che restituisce il primo codice letto.
class _InlineBarcodeScanner extends StatefulWidget {
  const _InlineBarcodeScanner();

  @override
  State<_InlineBarcodeScanner> createState() => _InlineBarcodeScannerState();
}

class _InlineBarcodeScannerState extends State<_InlineBarcodeScanner> {
  final MobileScannerController _controller = MobileScannerController();
  bool _found = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Scansiona Codice')),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              if (_found) return;
              final code = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
              if (code != null && code.isNotEmpty) {
                _found = true;
                HapticFeedback.mediumImpact();
                Navigator.of(context).pop(code);
              }
            },
          ),
          Center(
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.primary, width: 2),
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Text('Inquadra il codice a barre o QR',
                  style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  final double value;
  final double min;
  final double max;
  final double step;
  final String? unit;
  final ValueChanged<double> onChanged;

  const _Stepper({
    required this.value,
    required this.min,
    required this.max,
    required this.step,
    this.unit,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.remove_circle_outline, color: AppColors.primary),
            onPressed: value - step >= min ? () => onChanged(value - step) : null,
          ),
          Expanded(
            child: Text(
              '${value % 1 == 0 ? value.toInt() : value}${unit != null ? ' $unit' : ''}',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
            onPressed: value + step <= max ? () => onChanged(value + step) : null,
          ),
        ],
      ),
    );
  }
}

class _ChoiceChips extends StatelessWidget {
  final List<FieldOption> options;
  final bool multi;
  final Set<String> selected;
  final ValueChanged<Set<String>> onChanged;

  const _ChoiceChips({
    required this.options,
    required this.multi,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: options.map((o) {
          final isSel = selected.contains(o.id) || selected.contains(o.label);
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(o.label),
              selected: isSel,
              selectedColor: AppColors.primary,
              backgroundColor: AppColors.surface,
              labelStyle: TextStyle(
                color: isSel ? AppColors.background : AppColors.textSecondary,
                fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
              ),
              side: BorderSide(color: isSel ? AppColors.primary : AppColors.border),
              onSelected: (_) {
                if (multi) {
                  final next = {...selected};
                  isSel ? next.remove(o.id) : next.add(o.id);
                  onChanged(next);
                } else {
                  onChanged(isSel ? {} : {o.id});
                }
              },
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _ModalPickerField extends StatelessWidget {
  final String label;
  final String placeholder;
  final List<FieldOption> options;
  final bool multi;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;

  const _ModalPickerField({
    required this.label,
    required this.placeholder,
    required this.options,
    required this.multi,
    required this.value,
    required this.onChanged,
  });

  String _display() {
    if (multi) {
      final list = value is List ? value.map((e) => e.toString()).toList() : <String>[];
      if (list.isEmpty) return '';
      return list
          .map((id) => options.firstWhere((o) => o.id == id || o.label == id, orElse: () => FieldOption(id, id)).label)
          .join(', ');
    }
    if (value == null || value.toString().isEmpty) return '';
    return options
        .firstWhere((o) => o.id == value.toString() || o.label == value.toString(),
            orElse: () => FieldOption(value.toString(), value.toString()))
        .label;
  }

  void _open(BuildContext context) {
    final selected = multi
        ? (value is List ? (value as List).map((e) => e.toString()).toSet() : <String>{})
        : {value?.toString() ?? ''};
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(builder: (ctx2, setSheetState) {
          return SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(label, style: AppTypography.titleMedium),
                ),
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: options.length,
                    itemBuilder: (_, i) {
                      final o = options[i];
                      final isSel = selected.contains(o.id) || selected.contains(o.label);
                      return ListTile(
                        title: Text(o.label, style: const TextStyle(color: AppColors.textPrimary)),
                        trailing: Icon(
                          isSel ? Icons.check_circle : Icons.circle_outlined,
                          color: isSel ? AppColors.primary : AppColors.textMuted,
                        ),
                        onTap: () {
                          if (multi) {
                            setSheetState(() {
                              isSel ? selected.remove(o.id) : selected.add(o.id);
                            });
                          } else {
                            onChanged(o.id);
                            Navigator.pop(ctx);
                          }
                        },
                      );
                    },
                  ),
                ),
                if (multi)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          onChanged(selected.where((e) => e.isNotEmpty).toList());
                          Navigator.pop(ctx);
                        },
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: AppColors.background),
                        child: const Text('CONFERMA'),
                      ),
                    ),
                  ),
              ],
            ),
          );
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final d = _display();
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => _open(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                d.isEmpty ? placeholder : d,
                style: TextStyle(color: d.isEmpty ? AppColors.textMuted : AppColors.textPrimary),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String display;
  final String hint;
  final VoidCallback onPick;

  const _DateField({required this.display, required this.hint, required this.onPick});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onPick,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              display.isEmpty ? hint : display,
              style: TextStyle(color: display.isEmpty ? AppColors.textMuted : AppColors.textPrimary),
            ),
            const Icon(Icons.calendar_today_rounded, color: AppColors.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}

class _ImagesField extends StatelessWidget {
  final List<String> images;
  final ValueChanged<List<String>> onChanged;

  const _ImagesField({required this.images, required this.onChanged});

  Future<void> _pick() async {
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(imageQuality: 80);
    if (picked.isNotEmpty) {
      onChanged([...images, ...picked.map((x) => x.path)].take(10).toList());
    }
  }

  Widget _thumb(String path) {
    return AppImage(
      path: path,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, color: AppColors.textMuted),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (images.isNotEmpty)
          SizedBox(
            height: 80,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: images.length,
              itemBuilder: (_, i) {
                return Stack(
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      margin: const EdgeInsets.only(right: 8),
                      clipBehavior: Clip.antiAlias,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                        color: AppColors.backgroundSecondary,
                      ),
                      child: _thumb(images[i]),
                    ),
                    Positioned(
                      top: 2,
                      right: 10,
                      child: GestureDetector(
                        onTap: () {
                          final next = [...images]..removeAt(i);
                          onChanged(next);
                        },
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: const BoxDecoration(color: AppColors.error, shape: BoxShape.circle),
                          child: const Icon(Icons.close, size: 12, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: images.length >= 10 ? null : _pick,
          icon: const Icon(Icons.add_photo_alternate_rounded, color: AppColors.primary, size: 20),
          label: const Text('Aggiungi Foto', style: TextStyle(color: AppColors.primary)),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.primary),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ],
    );
  }
}

class _DocumentField extends StatelessWidget {
  final List<String> docs;
  final ValueChanged<List<String>> onChanged;

  const _DocumentField({required this.docs, required this.onChanged});

  Future<void> _pick() async {
    final files = await FilePicker.pickFiles();
    if (files.isNotEmpty) {
      final f = files.first;
      final path = f.path ?? f.name;
      onChanged([...docs, path]);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ...docs.asMap().entries.map((e) {
          final name = e.value.split(RegExp(r'[\\/]')).last;
          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.insert_drive_file_rounded, color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(name, style: const TextStyle(color: AppColors.textPrimary), overflow: TextOverflow.ellipsis),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 20),
                  onPressed: () {
                    final next = [...docs]..removeAt(e.key);
                    onChanged(next);
                  },
                ),
              ],
            ),
          );
        }),
        OutlinedButton.icon(
          onPressed: _pick,
          icon: const Icon(Icons.upload_file_rounded, color: AppColors.primary, size: 20),
          label: const Text('Allega File / PDF', style: TextStyle(color: AppColors.primary)),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.primary),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ],
    );
  }
}
