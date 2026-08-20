import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/product.dart';
import '../models/layout_config.dart';
import '../providers/inventory_provider.dart';
import '../providers/locations_provider.dart';
import '../providers/custom_fields_provider.dart';
import '../providers/layout_provider.dart';
import '../services/sound_service.dart';

class AddProductScreen extends ConsumerStatefulWidget {
  const AddProductScreen({super.key});

  @override
  ConsumerState<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends ConsumerState<AddProductScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _skuController;
  late TextEditingController _furTypeController;
  late TextEditingController _purchasePriceController;
  late TextEditingController _sellPriceController;
  late TextEditingController _lengthController;
  late TextEditingController _widthController;
  late TextEditingController _weightController;
  late TextEditingController _notesController;

  String? _selectedLocation;
  String? _selectedLibraryId;
  final List<String> _productImages = [];

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
    _skuController = TextEditingController();
    _furTypeController = TextEditingController();
    _purchasePriceController = TextEditingController();
    _sellPriceController = TextEditingController();
    _lengthController = TextEditingController();
    _widthController = TextEditingController();
    _weightController = TextEditingController();
    _notesController = TextEditingController();

    // Auto generate default SKU after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final generatedSKU = ref.read(inventoryProvider.notifier).generateSKU();
      setState(() {
        _skuController.text = generatedSKU;
      });
    });
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

  void _regenerateSKU() {
    final generated = ref.read(inventoryProvider.notifier).generateSKU();
    setState(() {
      _skuController.text = generated;
    });
    SoundService.playBeep();
  }

  Future<void> _saveProduct() async {
    if (!_formKey.currentState!.validate()) {
      SoundService.playError();
      return;
    }

    final locations = ref.read(locationsProvider);
    final libraries = ref.read(inventoryProvider).libraries;

    final locationToSave = _selectedLocation ??
        (locations.isNotEmpty ? locations.first.name : 'Magazzino Principale');
    final libraryToSave = _selectedLibraryId ??
        (libraries.isNotEmpty ? libraries.first.id : 'pellicce');

    final double? purchasePrice = double.tryParse(_purchasePriceController.text.replaceAll(',', '.'));
    final double? sellPrice = double.tryParse(_sellPriceController.text.replaceAll(',', '.'));
    final double? length = double.tryParse(_lengthController.text.replaceAll(',', '.'));
    final double? width = double.tryParse(_widthController.text.replaceAll(',', '.'));
    final double? weight = double.tryParse(_weightController.text.replaceAll(',', '.'));

    final newProduct = Product(
      id: 'prod_${DateTime.now().millisecondsSinceEpoch}',
      sku: _skuController.text.trim(),
      furType: _furTypeController.text.trim(),
      location: locationToSave,
      libraryId: libraryToSave,
      purchasePrice: purchasePrice,
      sellPrice: sellPrice,
      status: ProductStatusType.available,
      images: _productImages,
      length: length,
      width: width,
      weight: weight,
      technicalNotes: _notesController.text.trim(),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await ref.read(inventoryProvider.notifier).addProduct(newProduct);
    await SoundService.playSuccess();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Prodotto ${newProduct.sku} aggiunto con successo!'),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
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
            Text(
              'Nuovo Capo Inventario',
              style: AppTypography.titleMedium.copyWith(color: AppColors.textPrimary),
            ),
            Text(
              'Inserimento basato su Layout Configurator',
              style: AppTypography.caption.copyWith(color: AppColors.textMuted),
            ),
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
              // Dynamic Layout Renderer based on layoutConfig.fields
              for (final layoutField in layoutConfig.fields.where((f) => f.visible)) ...[
                _buildDynamicFieldWidget(
                  field: layoutField,
                  locations: locations.map((l) => l.name).toList(),
                  libraries: libraries,
                  customFields: customFields,
                ),
                const SizedBox(height: 16),
              ],

              const SizedBox(height: 24),

              // Save Action Button
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
                  icon: const Icon(Icons.check_circle_rounded, size: 22),
                  label: const Text(
                    'SALVA PRODOTTO IN CATALOGO',
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
    required List<dynamic> customFields,
  }) {
    if (field.type == 'section') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: AppColors.primary, width: 1.5)),
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
            labelText: 'Codice SKU (Auto-generato)',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon: const Icon(Icons.qr_code_rounded, color: AppColors.primary),
            suffixIcon: IconButton(
              icon: const Icon(Icons.autorenew_rounded, color: AppColors.primary),
              onPressed: _regenerateSKU,
            ),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          validator: (val) => val == null || val.isEmpty ? 'Inserisci lo SKU' : null,
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
                prefixIcon: const Icon(Icons.checkroom_rounded, color: AppColors.primary),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (val) =>
                  val == null || val.trim().isEmpty ? 'Specifica la tipologia del capo' : null,
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
                      labelStyle: AppTypography.caption.copyWith(color: AppColors.textSecondary),
                      backgroundColor: AppColors.surface,
                      side: const BorderSide(color: AppColors.border),
                      onPressed: () {
                        setState(() {
                          _furTypeController.text = sug;
                        });
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        );

      case 'location':
        final locList = locations.isNotEmpty ? locations : ['Magazzino Principale', 'Vetrina', 'Sartoria'];
        return DropdownButtonFormField<String>(
          initialValue: _selectedLocation ?? locList.first,
          dropdownColor: AppColors.surface,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Posizione Fisica *',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon: const Icon(Icons.location_on_rounded, color: AppColors.primary),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          items: locList.map((loc) {
            return DropdownMenuItem(
              value: loc,
              child: Text(loc),
            );
          }).toList(),
          onChanged: (val) {
            setState(() => _selectedLocation = val);
          },
        );

      case 'folder':
        return DropdownButtonFormField<String>(
          initialValue: _selectedLibraryId ?? (libraries.isNotEmpty ? libraries.first.id : 'pellicce'),
          dropdownColor: AppColors.surface,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Cartella / Settore',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon: const Icon(Icons.folder_outlined, color: AppColors.primary),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          items: libraries.map((lib) {
            return DropdownMenuItem<String>(
              value: lib.id as String,
              child: Text(lib.name as String),
            );
          }).toList(),
          onChanged: (val) {
            setState(() => _selectedLibraryId = val);
          },
        );

      case 'purchasePrice':
        return TextFormField(
          controller: _purchasePriceController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Prezzo d\'Acquisto (€)',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon: const Icon(Icons.euro_symbol_rounded, color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );

      case 'sellPrice':
        return TextFormField(
          controller: _sellPriceController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Prezzo di Vendita (€)',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon: const Icon(Icons.sell_rounded, color: AppColors.primary),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );

      case 'length':
        return TextFormField(
          controller: _lengthController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Lunghezza (cm)',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon: const Icon(Icons.straighten_rounded, color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );

      case 'width':
        return TextFormField(
          controller: _widthController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Spalla / Larghezza (cm)',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon: const Icon(Icons.aspect_ratio_rounded, color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );

      case 'weight':
        return TextFormField(
          controller: _weightController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Peso (kg)',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon: const Icon(Icons.scale_rounded, color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );

      case 'technicalNotes':
        return TextFormField(
          controller: _notesController,
          maxLines: 3,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Note Tecniche / Manifattura',
            labelStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon: const Icon(Icons.notes_rounded, color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );

      default:
        return const SizedBox.shrink();
    }
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
                '${_productImages.length} caricate',
                style: AppTypography.caption.copyWith(color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              InkWell(
                onTap: () {
                  setState(() {
                    _productImages.add('assets/images/sample_fur_${_productImages.length + 1}.jpg');
                  });
                  SoundService.playBeep();
                },
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
                      Icon(Icons.add_a_photo_rounded, color: AppColors.primary, size: 28),
                      SizedBox(height: 4),
                      Text('Aggiungi', style: TextStyle(color: AppColors.primary, fontSize: 11)),
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
                            style: AppTypography.caption.copyWith(color: AppColors.textMuted),
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
                                  decoration: BoxDecoration(
                                    color: AppColors.backgroundSecondary,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: const Icon(Icons.image_rounded, color: AppColors.textMuted, size: 36),
                                ),
                                Positioned(
                                  top: 2,
                                  right: 10,
                                  child: GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _productImages.removeAt(index);
                                      });
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: const BoxDecoration(
                                        color: Colors.red,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.close, size: 12, color: Colors.white),
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
