import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/custom_field.dart';
import '../models/product.dart';
import '../models/layout_config.dart';
import '../providers/inventory_provider.dart';
import '../providers/locations_provider.dart';
import '../providers/custom_fields_provider.dart';
import '../providers/gs1_config_provider.dart';
import '../providers/layout_provider.dart';
import '../services/gs1_service.dart';
import '../widgets/dynamic_field_renderer.dart';
import '../widgets/app_image.dart';

class ProductEditScreen extends ConsumerStatefulWidget {
  final String productId;

  const ProductEditScreen({super.key, required this.productId});

  @override
  ConsumerState<ProductEditScreen> createState() => _ProductEditScreenState();
}

class _ProductEditScreenState extends ConsumerState<ProductEditScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _skuController;
  late TextEditingController _furTypeController;
  late TextEditingController _purchasePriceController;
  late TextEditingController _sellPriceController;
  late TextEditingController _lengthController;
  late TextEditingController _widthController;
  late TextEditingController _weightController;
  late TextEditingController _notesController;

  Product? _product;
  String? _selectedLocation;
  String? _selectedLibraryId;
  late List<String> _productImages;
  late Map<String, dynamic> _customFieldValues;

  final List<String> _furTypeSuggestions = [
    'Visone Stretto',
    'Visone Maschio',
    'Volpe Argentata',
    'Zibellino delle Foreste',
    'Astrakan Persiano',
    'Castoro Rasato',
    'Cincillà',
    'Montone Rovesciato',
  ];

  @override
  void initState() {
    super.initState();
    _product = ref.read(inventoryProvider.notifier).getProductById(widget.productId);
    final p = _product;

    _skuController = TextEditingController(text: p?.sku ?? '');
    _furTypeController = TextEditingController(text: p?.furType ?? '');
    _purchasePriceController =
        TextEditingController(text: p?.purchasePrice?.toString() ?? '');
    _sellPriceController =
        TextEditingController(text: p?.sellPrice?.toString() ?? '');
    _lengthController = TextEditingController(text: p?.length?.toString() ?? '');
    _widthController = TextEditingController(text: p?.width?.toString() ?? '');
    _weightController = TextEditingController(text: p?.weight?.toString() ?? '');
    _notesController = TextEditingController(text: p?.technicalNotes ?? '');
    _selectedLocation = p?.location.isNotEmpty == true ? p!.location : null;
    _selectedLibraryId = p?.libraryId;
    _productImages = List<String>.from(p?.images ?? []);
    _customFieldValues = p?.customFields ?? {};
  }

  void _regenerateSKU() {
    final year = DateTime.now().year;
    final prefix = 'SKU-$year-';
    final products = ref.read(inventoryProvider).products;
    final cur = _skuController.text.trim();

    int maxInDb = 0;
    for (final p in products.where((p) => p.deletedAt == null && p.sku.startsWith(prefix))) {
      final m = RegExp(r'SKU-\d{4}-(\d+)').firstMatch(p.sku);
      if (m != null) maxInDb = math.max(maxInDb, int.tryParse(m.group(1)!) ?? 0);
    }
    int currentNum = 0;
    if (cur.startsWith(prefix)) {
      final m = RegExp(r'SKU-\d{4}-(\d+)').firstMatch(cur);
      if (m != null) currentNum = int.tryParse(m.group(1)!) ?? 0;
    }
    int nextNum = math.max(currentNum + 1, maxInDb + 1);
    if (nextNum < 1) nextNum = 1;

    final existingSet = products.map((p) => p.sku).toSet();
    // Exclude current product's own SKU from uniqueness check
    existingSet.remove(_product?.sku);
    String candidate;
    do {
      candidate = 'SKU-$year-${nextNum.toString().padLeft(3, '0')}';
      if (!existingSet.contains(candidate) && candidate != cur) break;
      nextNum++;
    } while (true);

    setState(() {
      _skuController.text = candidate;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Nuovo SKU generato: $candidate'),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(milliseconds: 900),
      ),
    );
  }

  @override
  void dispose() {
    _skuController.dispose();
    _furTypeController.dispose();
    _purchasePriceController.dispose();
    _sellPriceController.dispose();
    _lengthController.dispose();
    _widthController.dispose();
    _weightController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickImagesFromGallery() async {
    if (_productImages.length >= 10) return;
    final picked = await ImagePicker().pickMultiImage(imageQuality: 80);
    if (picked.isNotEmpty) {
      setState(() {
        _productImages.addAll(picked.map((x) => x.path));
        if (_productImages.length > 10) {
          _productImages.removeRange(10, _productImages.length);
        }
      });
    }
  }

  Future<void> _takePhoto() async {
    if (_productImages.length >= 10) return;
    final picked = await ImagePicker()
        .pickImage(source: ImageSource.camera, imageQuality: 80);
    if (picked != null) {
      setState(() => _productImages.add(picked.path));
    }
  }

  void _showImageSourcePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_rounded, color: AppColors.primary),
              title: const Text('Galleria (multipla)', style: TextStyle(color: AppColors.textPrimary)),
              onTap: () { Navigator.pop(ctx); _pickImagesFromGallery(); },
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_rounded, color: AppColors.primary),
              title: const Text('Fotocamera', style: TextStyle(color: AppColors.textPrimary)),
              onTap: () { Navigator.pop(ctx); _takePhoto(); },
            ),
          ],
        ),
      ),
    );
  }

  double? _parseNum(String text) =>
      double.tryParse(text.trim().replaceAll(',', '.'));

  Future<void> _saveProduct() async {
    final product = _product;
    if (product == null) return;
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final customFields = ref.read(customFieldsProvider);

    // Validazione campi custom obbligatori (escludendo i campi di sistema gestiti dal form principale)
    for (final cf in customFields) {
      if (cf.required && cf.deletedAt == null && cf.isSystem != true) {
        final v = _customFieldValues[cf.id];
        final empty = v == null ||
            (v is String && v.trim().isEmpty) ||
            (v is List && v.isEmpty);
        if (empty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Il campo "${cf.name}" è obbligatorio'),
              backgroundColor: AppColors.error,
            ),
          );
          return;
        }
      }
    }

    final locations = ref.read(locationsProvider);
    final libraries = ref.read(inventoryProvider).libraries;
    final gs1Config = ref.read(gs1ConfigProvider);

    final locationToSave = _selectedLocation ??
        (locations.isNotEmpty ? locations.first.name : product.location);
    final libraryToSave = _selectedLibraryId ??
        (libraries.isNotEmpty ? libraries.first.id : null);

    // Serializza i campi custom con snapshot (come RN customData)
    final customData = <ProductCustomData>[];
    for (final entry in _customFieldValues.entries) {
      if (entry.value == null) continue;
      if (entry.value is String && (entry.value as String).trim().isEmpty) {
        continue;
      }
      if (entry.value is List && (entry.value as List).isEmpty) continue;
      final cf =
          customFields.where((f) => f.id == entry.key).firstOrNull ??
          product.customData
              .where((cd) => cd.fieldSnapshot.id == entry.key)
              .map((cd) => cd.fieldSnapshot)
              .firstOrNull;
      if (cf != null) {
        customData.add(ProductCustomData(value: entry.value, fieldSnapshot: cf));
      }
    }

    // Rigenera GS1 Digital Link — solo se abilitato
    String? gs1DigitalLink = product.gs1DigitalLink;
    if (gs1Config.isEnabled) {
      final lottoValue =
          gs1Config.enableLotto && gs1Config.lottoFieldId.isNotEmpty
              ? _customFieldValues[gs1Config.lottoFieldId]?.toString()
              : null;
      gs1DigitalLink = GS1Service.generateGS1DigitalLink(
        config: gs1Config,
        gtin: _skuController.text.trim(),
        existingProductCount: ref.read(inventoryProvider).products.length,
        lottoValue: lottoValue,
      );
    }

    final updated = product.copyWith(
      sku: _skuController.text.trim(),
      furType: _furTypeController.text.trim(),
      location: locationToSave,
      libraryId: libraryToSave,
      purchasePrice: _parseNum(_purchasePriceController.text),
      sellPrice: _parseNum(_sellPriceController.text),
      length: _parseNum(_lengthController.text),
      width: _parseNum(_widthController.text),
      weight: _parseNum(_weightController.text),
      technicalNotes: _notesController.text.trim().isEmpty
          ? null
          : _notesController.text.trim(),
      images: _productImages,
      customData: customData,
      gs1DigitalLink: gs1DigitalLink,
      updatedAt: DateTime.now(),
    );

    await ref.read(inventoryProvider.notifier).updateProduct(updated);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Prodotto ${updated.sku} aggiornato con successo!'),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pop();
    }
  }

  Widget _buildImageThumb(String path) {
    return AppImage(
      path: path,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) =>
          const Icon(Icons.broken_image_rounded, color: AppColors.textMuted, size: 32),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_product == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Errore')),
        body: const Center(
          child: Text('Prodotto non trovato',
              style: TextStyle(color: AppColors.textPrimary)),
        ),
      );
    }

    final layoutConfig = ref.watch(layoutProvider);
    final locations = ref.watch(locationsProvider);
    final libraries = ref.watch(inventoryProvider).libraries;
    final customFields = ref.watch(customFieldsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Modifica Prodotto',
                style: AppTypography.titleMedium
                    .copyWith(color: AppColors.textPrimary)),
            Text(_product!.sku,
                style:
                    AppTypography.caption.copyWith(color: AppColors.textMuted)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textMuted),
            tooltip: 'Rigenera SKU',
            onPressed: _regenerateSKU,
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final layoutField
                  in layoutConfig.fields.where((f) => f.visible)) ...[
                _buildDynamicFieldWidget(
                  field: layoutField,
                  locations: locations.map((l) => l.name).toList(),
                  libraries: libraries,
                  customFields: customFields,
                ),
                const SizedBox(height: 16),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _saveProduct,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.background,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 4,
                  ),
                  icon: const Icon(Icons.save_rounded, size: 22),
                  label: const Text(
                    'SALVA MODIFICHE',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDynamicFieldWidget({
    required LayoutField field,
    required List<String> locations,
    required List<dynamic> libraries,
    required List<CustomField> customFields,
  }) {
    if (field.type == 'section') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: const BoxDecoration(
          border:
              Border(bottom: BorderSide(color: AppColors.primary, width: 1.5)),
        ),
        child: Text(
          field.label ?? 'SEZIONE',
          style: AppTypography.caption.copyWith(
            color: AppColors.primary,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
      );
    }

    switch (field.id) {
      case 'images':
        return _buildImagesPickerSection();

      case 'sku':
        return TextFormField(
          controller: _skuController,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Codice SKU',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon:
                const Icon(Icons.qr_code_rounded, color: AppColors.primary),
            suffixIcon: IconButton(
              icon: const Icon(Icons.autorenew_rounded, color: AppColors.primary),
              tooltip: 'Rigenera SKU',
              onPressed: _regenerateSKU,
            ),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          validator: (val) =>
              val == null || val.isEmpty ? 'Inserisci lo SKU' : null,
          onChanged: (_) => setState(() {}),
        );

      case 'furType':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: _furTypeController,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: InputDecoration(
                labelText: 'Tipologia Capo / Pelliccia *',
                labelStyle: const TextStyle(color: AppColors.textMuted),
                prefixIcon:
                    const Icon(Icons.checkroom_rounded, color: AppColors.primary),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              validator: (val) => val == null || val.trim().isEmpty
                  ? 'Specifica la tipologia del capo'
                  : null,
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _furTypeSuggestions.map((sug) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ActionChip(
                      label: Text(sug),
                      labelStyle: AppTypography.caption
                          .copyWith(color: AppColors.textSecondary),
                      backgroundColor: AppColors.surface,
                      side: const BorderSide(color: AppColors.border),
                      onPressed: () {
                        setState(() => _furTypeController.text = sug);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        );

      case 'location':
        final locList = locations.isNotEmpty
            ? locations
            : ['Magazzino Principale', 'Vetrina', 'Sartoria'];
        final safeValue =
            locList.contains(_selectedLocation) ? _selectedLocation : null;
        return DropdownButtonFormField<String>(
          initialValue: safeValue,
          dropdownColor: AppColors.surface,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Posizione Fisica *',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon:
                const Icon(Icons.location_on_rounded, color: AppColors.primary),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          items: locList
              .map((loc) => DropdownMenuItem(value: loc, child: Text(loc)))
              .toList(),
          onChanged: (val) => setState(() => _selectedLocation = val),
        );

      case 'folder':
        return DropdownButtonFormField<String>(
          initialValue: libraries.any((l) => l.id == _selectedLibraryId)
              ? _selectedLibraryId
              : (libraries.isNotEmpty ? libraries.first.id as String? : null),
          dropdownColor: AppColors.surface,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Cartella / Settore',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon:
                const Icon(Icons.folder_outlined, color: AppColors.primary),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          items: libraries
              .map<DropdownMenuItem<String>>((lib) => DropdownMenuItem<String>(
                    value: lib.id as String,
                    child: Text(lib.name as String),
                  ))
              .toList(),
          onChanged: (val) => setState(() => _selectedLibraryId = val),
        );

      case 'purchasePrice':
        return _numField(_purchasePriceController, "Prezzo d'Acquisto (€)",
            Icons.euro_symbol_rounded);
      case 'sellPrice':
        return _numField(
            _sellPriceController, 'Prezzo di Vendita (€)', Icons.sell_rounded);
      case 'length':
        return _numField(
            _lengthController, 'Lunghezza (cm)', Icons.straighten_rounded);
      case 'width':
        return _numField(_widthController, 'Spalla / Larghezza (cm)',
            Icons.aspect_ratio_rounded);
      case 'weight':
        return _numField(_weightController, 'Peso (kg)', Icons.scale_rounded);

      case 'technicalNotes':
        return TextFormField(
          controller: _notesController,
          maxLines: 3,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Note Tecniche / Manifattura',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon:
                const Icon(Icons.notes_rounded, color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );

      default:
        final cf = customFields
            .where((c) => c.id == field.id && c.deletedAt == null)
            .firstOrNull;
        if (cf == null) return const SizedBox.shrink();
        return DynamicFieldEditor(
          field: cf,
          value: _customFieldValues[cf.id],
          onChanged: (v) => setState(() => _customFieldValues[cf.id] = v),
        );
    }
  }

  Widget _numField(TextEditingController c, String label, IconData icon) {
    return TextFormField(
      controller: c,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      style: const TextStyle(color: AppColors.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.textMuted),
        prefixIcon: Icon(icon, color: AppColors.textMuted),
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Widget _buildImagesPickerSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'FOTO DEL PRODOTTO',
                style: AppTypography.caption.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                '${_productImages.length}/10 caricate',
                style: AppTypography.caption.copyWith(color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              InkWell(
                onTap:
                    _productImages.length >= 10 ? null : _showImageSourcePicker,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primary, width: 1.5),
                  ),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_a_photo_rounded,
                          color: AppColors.primary, size: 28),
                      SizedBox(height: 4),
                      Text('Aggiungi',
                          style:
                              TextStyle(color: AppColors.primary, fontSize: 11)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SizedBox(
                  height: 80,
                  child: _productImages.isEmpty
                      ? Center(
                          child: Text(
                            'Nessuna foto allegata',
                            style: AppTypography.caption
                                .copyWith(color: AppColors.textMuted),
                          ),
                        )
                      : ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: _productImages.length,
                          itemBuilder: (context, index) {
                            return Stack(
                              children: [
                                Container(
                                  width: 80,
                                  height: 80,
                                  margin: const EdgeInsets.only(right: 8),
                                  clipBehavior: Clip.antiAlias,
                                  decoration: BoxDecoration(
                                    color: AppColors.backgroundSecondary,
                                    borderRadius: BorderRadius.circular(12),
                                    border:
                                        Border.all(color: AppColors.border),
                                  ),
                                  child:
                                      _buildImageThumb(_productImages[index]),
                                ),
                                Positioned(
                                  top: 2,
                                  right: 10,
                                  child: GestureDetector(
                                    onTap: () {
                                      setState(() =>
                                          _productImages.removeAt(index));
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: const BoxDecoration(
                                        color: Colors.red,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.close,
                                          size: 12, color: Colors.white),
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
