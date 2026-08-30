import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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
import '../services/nfc_coordinator.dart';
import '../services/gs1_service.dart';
import '../services/nfc_service.dart';
import '../services/sound_service.dart';
import '../widgets/dynamic_field_renderer.dart';
import '../widgets/app_image.dart';

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
  final Map<String, dynamic> _customFieldValues = {};
  String? _pendingNfcTag;
  bool _nfcBusy = false;

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

    // OFF continuo su add: solo esplicito via popup
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await NfcCoordinator.acquire(NfcMode.tools, 'add_product_screen');
    });

    // Auto generate default SKU after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final generatedSKU = ref.read(inventoryProvider.notifier).generateSKU();
      if (mounted) setState(() => _skuController.text = generatedSKU);
    });
  }

  @override
  void dispose() {
    NfcCoordinator.release('add_product_screen');
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
    final year = DateTime.now().year;
    final prefix = 'SKU-$year-';
    final products = ref.read(inventoryProvider).products;
    final cur = _skuController.text.trim();

    // Max in DB
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

    // Ensure uniqueness even under rapid consecutive presses
    final existingSet = products.map((p) => p.sku).toSet();
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

  void _showNfcRegisterPopup() {
    final sku = _skuController.text.trim();
    final gs1Config = ref.read(gs1ConfigProvider);
    final isGS1 = gs1Config.isEnabled;
    final gs1Link = isGS1
        ? GS1Service.generateGS1DigitalLink(config: gs1Config, gtin: sku.isNotEmpty ? sku : 'SKU-TEMP', existingProductCount: ref.read(inventoryProvider).products.length)
        : (sku.isNotEmpty ? 'syncroflow://product/$sku' : 'syncroflow://product/SKU-TEMP');
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.nfc, size: 48, color: AppColors.accentGold),
          const SizedBox(height: 8),
          Text('Registra Tag NFC', style: AppTypography.titleLarge),
          Text(sku.isEmpty ? 'Inserisci prima lo SKU' : 'SKU: $sku', style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
          if (_pendingNfcTag != null) ...[
            const SizedBox(height: 8),
            Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppColors.backgroundSecondary, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.success)), child: Row(children: [const Icon(Icons.check_circle, color: AppColors.success, size: 18), const SizedBox(width: 6), Expanded(child: Text('Tag: $_pendingNfcTag', style: AppTypography.caption.copyWith(color: AppColors.success)))])),
          ],
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, child: OutlinedButton.icon(icon: const Icon(Icons.contactless, color: AppColors.accentGold), label: const Text('Leggi Tag NFC'), style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: AppColors.border), padding: const EdgeInsets.symmetric(vertical: 14)), onPressed: () async { Navigator.pop(ctx); await _readNfcForNew(); })),
          const SizedBox(height: 8),
          SizedBox(width: double.infinity, child: ElevatedButton.icon(icon: const Icon(Icons.edit_note), label: Text(sku.isEmpty ? 'Scrivi SKU su Tag' : 'Scrivi $sku su Tag'), style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentGold, foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(vertical: 14)), onPressed: sku.isEmpty ? null : () async { Navigator.pop(ctx); await _writeNfcForNew(gs1Link.isNotEmpty ? gs1Link : sku); })),
          const SizedBox(height: 8),
          SizedBox(width: double.infinity, child: OutlinedButton.icon(icon: const Icon(Icons.delete_sweep, color: AppColors.error), label: const Text('Cancella / Formatta Tag'), style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, side: const BorderSide(color: AppColors.error), padding: const EdgeInsets.symmetric(vertical: 14)), onPressed: () async { Navigator.pop(ctx); await _cleanNfcForNew(); })),
        ]),
      ),
    );
  }

  Future<void> _readNfcForNew() async {
    if (_nfcBusy) return;
    setState(() => _nfcBusy = true);
    const token = 'add_product_read';
    // Solo Lettura - esclude Scrittura/Pulizia grazie a NfcCoordinator priority
    await NfcCoordinator.acquire(NfcMode.explicitRead, token);
    _showNfcProgress('Avvicina il tag NFC per leggere — solo Lettura attiva...');
    final data = await NfcService().readTag();
    NfcCoordinator.inhibitAfterExplicit(); // 2.5s stop per evitare loop, ma scanner resta utilizzabile
    if (data != null) await SoundService.playNfcRead();
    await Future.delayed(const Duration(milliseconds: 600));
    await NfcCoordinator.release(token);
    // ri-blocca per tutta la permanenza su /add
    await NfcCoordinator.acquire(NfcMode.tools, 'add_product_screen');
    if (!mounted) return;
    Navigator.pop(context);
    setState(() => _nfcBusy = false);
    if (data == null || data.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nessun dato o lettura annullata')));
      return;
    }
    // Verifica compatibilità senza navigare a Home — resta su /add
    final inv = ref.read(inventoryProvider);
    final already = inv.products.where((p) => p.deletedAt == null && (p.nfcTag == data || p.gs1DigitalLink == data || p.sku == data || p.barcode == data)).toList();
    if (already.isNotEmpty) {
      final prod = already.first;
      if (mounted) {
        showDialog(context: context, builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Tag già associato', style: TextStyle(color: AppColors.warning)),
          content: Text('Questo tag contiene già: ${prod.sku} (${prod.furType})\nVuoi comunque associarlo a questo nuovo prodotto? Sovrascriverai il payload con il nuovo SKU al salvataggio.', style: const TextStyle(color: Colors.white70)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annulla')),
            ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: AppColors.warning), onPressed: () { Navigator.pop(ctx); setState(() => _pendingNfcTag = data); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Tag $data pronto da sovrascrivere al salvataggio'), backgroundColor: AppColors.warning)); }, child: const Text('Usa comunque', style: TextStyle(color: Colors.black))),
          ],
        ));
      }
      return;
    }
    setState(() => _pendingNfcTag = data);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Tag letto: $data — compatibile, verrà associato al salvataggio'), backgroundColor: AppColors.success));
  }

  Future<void> _writeNfcForNew(String payload) async {
    if (_nfcBusy) return;
    setState(() => _nfcBusy = true);
    const token = 'add_product_write';
    // Solo Scrittura — Lettura e Pulizia restano disattivate
    await NfcCoordinator.acquire(NfcMode.explicitWrite, token);
    _showNfcProgress('Avvicina il tag NFC per scrivere: $payload — solo Scrittura attiva...');
    final isUri = payload.startsWith('http://') || payload.startsWith('https://') || payload.startsWith('syncroflow://');
    final ok = isUri ? await NfcService().writeGS1Uri(payload) : await NfcService().writeNfcTag(payload);
    NfcCoordinator.inhibitAfterExplicit(); // 2.5s cooldown, scanner resta vivo
    if (ok) await SoundService.playNfcWrite();
    await Future.delayed(const Duration(milliseconds: 600));
    await NfcCoordinator.release(token);
    await NfcCoordinator.acquire(NfcMode.tools, 'add_product_screen');
    await NfcCoordinator.forceStop();
    if (!mounted) return;
    Navigator.pop(context);
    setState(() => _nfcBusy = false);
    if (ok) {
      setState(() => _pendingNfcTag = payload);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tag NFC scritto e associato!'), backgroundColor: AppColors.success));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Scrittura fallita — prova prima Cancella/Formatta'), backgroundColor: AppColors.error));
    }
  }

  Future<void> _cleanNfcForNew() async {
    if (_nfcBusy) return;
    setState(() => _nfcBusy = true);
    const token = 'add_product_clean';
    // Solo Pulizia — Lettura/Scrittura disattivate
    await NfcCoordinator.acquire(NfcMode.explicitClean, token);
    _showNfcProgress('Avvicina il tag NFC per cancellare/formattare — solo Cancellazione attiva...');
    final ok = await NfcService().cleanTag();
    NfcCoordinator.inhibitAfterExplicit(); // 2.5s cooldown
    if (ok) await SoundService.playNfcClean();
    await Future.delayed(const Duration(milliseconds: 600));
    await NfcCoordinator.release(token);
    await NfcCoordinator.acquire(NfcMode.tools, 'add_product_screen');
    await NfcCoordinator.forceStop();
    if (!mounted) return;
    Navigator.pop(context);
    setState(() => _nfcBusy = false);
    if (ok) {
      setState(() => _pendingNfcTag = null);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tag cancellato e formattato NDEF!'), backgroundColor: AppColors.success));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cancellazione fallita'), backgroundColor: AppColors.error));
    }
  }

  void _showNfcProgress(String msg) {
    showDialog(context: context, barrierDismissible: false, builder: (ctx) => AlertDialog(backgroundColor: AppColors.surface, content: Column(mainAxisSize: MainAxisSize.min, children: [const SizedBox(width: 60, height: 60, child: CircularProgressIndicator(color: AppColors.accentGold, strokeWidth: 3)), const SizedBox(height: 16), Text(msg, style: AppTypography.bodyMedium, textAlign: TextAlign.center), const SizedBox(height: 12), TextButton(onPressed: () async { await NfcService().stopSession(); if (ctx.mounted) Navigator.pop(ctx); }, child: const Text('Annulla', style: TextStyle(color: AppColors.error)))])));
  }

  Future<void> _saveProduct() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final locations = ref.read(locationsProvider);
    final libraries = ref.read(inventoryProvider).libraries;
    final customFields = ref.read(customFieldsProvider);
    final gs1Config = ref.read(gs1ConfigProvider);

    // Validazione campi custom obbligatori (escludendo i campi di sistema gestiti dal form principale)
    for (final cf in customFields) {
      if (cf.required && cf.deletedAt == null && cf.isSystem != true) {
        final v = _customFieldValues[cf.id];
        final empty = v == null ||
            (v is String && v.trim().isEmpty) ||
            (v is List && v.isEmpty);
        if (empty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Il campo "${cf.name}" è obbligatorio'), backgroundColor: AppColors.error),
          );
          return;
        }
      }
    }

    final locationToSave = _selectedLocation ??
        (locations.isNotEmpty ? locations.first.name : 'Magazzino Principale');
    final libraryToSave = _selectedLibraryId ??
        (libraries.isNotEmpty ? libraries.first.id : 'pellicce');

    // Serializza i valori dei campi custom con snapshot del campo (come RN)
    final customData = <ProductCustomData>[];
    for (final entry in _customFieldValues.entries) {
      if (entry.value == null) continue;
      if (entry.value is String && (entry.value as String).trim().isEmpty) continue;
      if (entry.value is List && (entry.value as List).isEmpty) continue;
      final cf = customFields.where((f) => f.id == entry.key).firstOrNull;
      if (cf != null) {
        customData.add(ProductCustomData(value: entry.value, fieldSnapshot: cf));
      }
    }

    // Generazione GS1 Digital Link — solo se abilitato, altrimenti resta SKU (non apre Chrome)
    String? gs1DigitalLink;
    if (gs1Config.isEnabled) {
      final lottoValue = gs1Config.enableLotto && gs1Config.lottoFieldId.isNotEmpty
          ? _customFieldValues[gs1Config.lottoFieldId]?.toString()
          : null;
      gs1DigitalLink = GS1Service.generateGS1DigitalLink(
        config: gs1Config,
        gtin: _skuController.text.trim(),
        existingProductCount: ref.read(inventoryProvider).products.length,
        lottoValue: lottoValue,
      );
    }

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
      customData: customData,
      gs1DigitalLink: gs1DigitalLink,
      nfcTag: _pendingNfcTag,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await ref.read(inventoryProvider.notifier).addProduct(newProduct);

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
        final gs1Config = ref.read(gs1ConfigProvider);
        final isGS1 = gs1Config.isEnabled;
        final gs1Link = isGS1
            ? GS1Service.generateGS1DigitalLink(
                config: gs1Config,
                gtin: _skuController.text.isNotEmpty ? _skuController.text : 'SKU-TEMP',
                existingProductCount: ref.read(inventoryProvider).products.length,
              )
            : (_skuController.text.isNotEmpty ? _skuController.text : 'SKU-TEMP');

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
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
              onChanged: (_) => setState(() {}),
            ),
            // QR rimosso da add_product: accessibile solo da product_detail/share
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(children: [
                    const Icon(Icons.nfc, color: AppColors.accentGold, size: 20),
                    const SizedBox(width: 8),
                    Text('TAG NFC', style: AppTypography.caption.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)),
                    const Spacer(),
                    if (_pendingNfcTag != null) const Icon(Icons.check_circle, color: AppColors.success, size: 18),
                  ]),
                  const SizedBox(height: 4),
                  Text(_pendingNfcTag == null ? 'Nessun tag associato — leggi/scrivi/cancella come in NFC Tools.' : 'Associato: $_pendingNfcTag', style: AppTypography.caption.copyWith(color: _pendingNfcTag == null ? AppColors.textSecondary : AppColors.success)),
                  const SizedBox(height: 10),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.nfc, size: 20),
                    label: Text(_pendingNfcTag == null ? 'Registra NFC' : 'Gestisci NFC'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.surfaceElevated, foregroundColor: AppColors.accentGold, side: const BorderSide(color: AppColors.accentGold), padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    onPressed: _showNfcRegisterPopup,
                  ),
                ],
              ),
            ),
          ],
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
        // Campo personalizzato: rendering completo con tutti i tipi supportati
        final cf = customFields.whereType<CustomField>().where((c) => c.id == field.id && c.deletedAt == null).firstOrNull;
        if (cf == null) return const SizedBox.shrink();
        return DynamicFieldEditor(
          field: cf,
          value: _customFieldValues[cf.id],
          onChanged: (v) => setState(() => _customFieldValues[cf.id] = v),
        );
    }
  }

  Future<void> _pickImagesFromGallery() async {
    if (_productImages.length >= 10) return;
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(imageQuality: 80);
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
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.camera, imageQuality: 80);
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
              onTap: () {
                Navigator.pop(ctx);
                _pickImagesFromGallery();
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_rounded, color: AppColors.primary),
              title: const Text('Fotocamera', style: TextStyle(color: AppColors.textPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _takePhoto();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageThumb(String path) {
    return AppImage(
      path: path,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => const Icon(Icons.broken_image_rounded, color: AppColors.textMuted, size: 32),
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
                onTap: _productImages.length >= 10 ? null : _showImageSourcePicker,
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
                                  clipBehavior: Clip.antiAlias,
                                  decoration: BoxDecoration(
                                    color: AppColors.backgroundSecondary,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: _buildImageThumb(_productImages[index]),
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
