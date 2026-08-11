import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/custom_field.dart';
import 'storage_provider.dart';

const String _customFieldsStorageKey = 'furinventory_custom_fields';

final systemFields = [
  const CustomField(id: 'images', name: 'Foto Prodotto', type: FieldDataType.images, uiType: FieldUIType.images, required: false, order: 0, isSystem: true, icon: 'add_photo_alternate'),
  const CustomField(id: 'sku', name: 'SKU / Codice', type: FieldDataType.textShort, uiType: FieldUIType.text, required: true, order: 1, isSystem: true, icon: 'qr_code'),
  const CustomField(id: 'furType', name: 'Tipo Pelle', type: FieldDataType.textShort, uiType: FieldUIType.text, required: true, order: 2, isSystem: true, icon: 'category'),
  const CustomField(id: 'location', name: 'Posizione', type: FieldDataType.textShort, uiType: FieldUIType.text, required: true, order: 3, isSystem: true, icon: 'place'),
  const CustomField(id: 'folder', name: 'Cartella', type: FieldDataType.textShort, uiType: FieldUIType.text, required: false, order: 4, isSystem: true, icon: 'folder'),
  const CustomField(id: 'purchasePrice', name: 'Prezzo Acquisto', type: FieldDataType.currency, uiType: FieldUIType.text, required: false, order: 5, isSystem: true, icon: 'shopping_cart'),
  const CustomField(id: 'sellPrice', name: 'Prezzo Vendita', type: FieldDataType.currency, uiType: FieldUIType.text, required: false, order: 6, isSystem: true, icon: 'sell'),
  const CustomField(id: 'length', name: 'Lunghezza', type: FieldDataType.number, uiType: FieldUIType.text, required: false, order: 7, isSystem: true, icon: 'straighten', unit: 'cm'),
  const CustomField(id: 'width', name: 'Larghezza', type: FieldDataType.number, uiType: FieldUIType.text, required: false, order: 8, isSystem: true, icon: 'straighten', unit: 'cm'),
  const CustomField(id: 'weight', name: 'Peso', type: FieldDataType.number, uiType: FieldUIType.text, required: false, order: 9, isSystem: true, icon: 'fitness_center', unit: 'kg'),
  const CustomField(id: 'technicalNotes', name: 'Note Tecniche', type: FieldDataType.textLong, uiType: FieldUIType.text, required: false, order: 10, isSystem: true, icon: 'notes'),
];

class CustomFieldsNotifier extends Notifier<List<CustomField>> {
  @override
  List<CustomField> build() {
    final storage = ref.watch(storageServiceProvider);
    final raw = storage.getJson(_customFieldsStorageKey);
    if (raw != null && raw is List) {
      final parsed = raw
          .map((e) => CustomField.fromJson(e as Map<String, dynamic>))
          .toList();
      final existingIds = parsed.map((p) => p.id).toSet();
      final missingSystem = systemFields.where((sf) => !existingIds.contains(sf.id));
      final merged = [...parsed, ...missingSystem];
      merged.sort((a, b) => a.order.compareTo(b.order));
      return merged;
    }
    return systemFields;
  }

  Future<void> _saveFields() async {
    final storage = ref.read(storageServiceProvider);
    await storage.setJson(
      _customFieldsStorageKey,
      state.map((f) => f.toJson()).toList(),
    );
  }

  List<CustomField> get activeFields =>
      state.where((f) => f.deletedAt == null).toList()
        ..sort((a, b) => a.order.compareTo(b.order));

  List<CustomField> get deletedFields =>
      state.where((f) => f.deletedAt != null && f.isSystem != true).toList();

  Future<void> addField(CustomField field) async {
    final newOrder = activeFields.length;
    final newField = field.copyWith(order: newOrder, isSystem: false);
    state = [...state, newField];
    await _saveFields();
  }

  Future<void> updateField(String id, CustomField updated) async {
    state = [
      for (final f in state)
        if (f.id == id) updated else f
    ];
    await _saveFields();
  }

  Future<void> softDeleteField(String id) async {
    state = [
      for (final f in state)
        if (f.id == id) f.copyWith(deletedAt: DateTime.now()) else f
    ];
    await _saveFields();
  }

  Future<void> restoreField(String id) async {
    state = [
      for (final f in state)
        if (f.id == id)
          CustomField(
            id: f.id,
            name: f.name,
            type: f.type,
            uiType: f.uiType,
            dataset: f.dataset,
            unit: f.unit,
            icon: f.icon,
            options: f.options,
            required: f.required,
            order: f.order,
            isSystem: f.isSystem,
            deletedAt: null,
            isBarcode: f.isBarcode,
            linkTo: f.linkTo,
          )
        else
          f
    ];
    await _saveFields();
  }

  Future<void> permanentlyDeleteField(String id) async {
    state = state.where((f) => f.id != id).toList();
    await _saveFields();
  }

  Future<void> reorderFields(List<String> orderedIds) async {
    final Map<String, int> orderMap = {
      for (int i = 0; i < orderedIds.length; i++) orderedIds[i]: i
    };

    state = [
      for (final f in state)
        if (orderMap.containsKey(f.id))
          f.copyWith(order: orderMap[f.id]!)
        else
          f
    ]..sort((a, b) => a.order.compareTo(b.order));

    await _saveFields();
  }

  Future<void> resetToDefaults() async {
    state = systemFields;
    await _saveFields();
  }

  CustomField? getField(String id) {
    try {
      return state.firstWhere((f) => f.id == id);
    } catch (_) {
      return null;
    }
  }
}

final customFieldsProvider =
    NotifierProvider<CustomFieldsNotifier, List<CustomField>>(CustomFieldsNotifier.new);
