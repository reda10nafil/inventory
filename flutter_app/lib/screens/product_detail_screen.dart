import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/theme.dart';
import '../constants/config.dart';
import '../models/models.dart';
import '../providers/inventory_provider.dart';
import '../widgets/qr_code_display.dart';
import '../widgets/barcode128.dart';
import '../utils/gs1.dart';
import '../utils/nfc_service.dart';

class ProductDetailScreen extends StatefulWidget {
  final String productId;
  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isEditing = false;

  // Edit controllers
  final _skuController = TextEditingController();
  final _purchasePriceController = TextEditingController();
  final _sellPriceController = TextEditingController();
  final _lengthController = TextEditingController();
  final _widthController = TextEditingController();
  final _weightController = TextEditingController();
  final _notesController = TextEditingController();
  String? _editFurType;
  String? _editLocation;
  bool _editIsFragile = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _skuController.dispose();
    _purchasePriceController.dispose();
    _sellPriceController.dispose();
    _lengthController.dispose();
    _widthController.dispose();
    _weightController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _initEditControllers(Product product) {
    _skuController.text = product.sku;
    _purchasePriceController.text = product.purchasePrice?.toString() ?? '';
    _sellPriceController.text = product.sellPrice?.toString() ?? '';
    _lengthController.text = product.length?.toString() ?? '';
    _widthController.text = product.width?.toString() ?? '';
    _weightController.text = product.weight?.toString() ?? '';
    _notesController.text = product.technicalNotes ?? '';
    _editFurType = product.furType;
    _editLocation = product.location;
    _editIsFragile = product.isFragile;
  }

  @override
  Widget build(BuildContext context) {
    final inventory = context.watch<InventoryProvider>();
    final product = inventory.getProductById(widget.productId);

    if (product == null) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: SafeArea(child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(Icons.error_outline, size: 64, color: AppTheme.error),
          const SizedBox(height: 16),
          const Text('Prodotto non trovato', style: TextStyle(fontSize: 20, color: AppTheme.textPrimary)),
          const SizedBox(height: 24),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Indietro')),
        ]))),
      );
    }

    if (_isEditing && _skuController.text.isEmpty) {
      _initEditControllers(product);
    }

    final gs1Link = GS1Util.generateGS1DigitalLink(
      inventory.gs1Config, product.sku, inventory.products.length,
      lottoValue: product.lotto,
    );

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(children: [
          _buildHeader(product),
          TabBar(
            controller: _tabController,
            indicatorColor: AppTheme.primary,
            labelColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.textSecondary,
            tabs: const [
              Tab(text: 'Dettagli'),
              Tab(text: 'QR / Barcode'),
              Tab(text: 'NFC'),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildDetailsTab(product, inventory),
                _buildCodeTab(product, gs1Link),
                _buildNfcTab(product, gs1Link),
              ],
            ),
          ),
        ]),
      ),
    );
  }

  Widget _buildHeader(Product product) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(children: [
          IconButton(icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary), onPressed: () => Navigator.pop(context)),
          Text(product.sku, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
        ]),
        IconButton(
          icon: Icon(_isEditing ? Icons.check : Icons.edit, color: AppTheme.primary),
          onPressed: () {
            if (_isEditing) { _saveChanges(); }
            setState(() { _isEditing = !_isEditing; if (_isEditing) _initEditControllers(product); });
          },
        ),
      ],
    ),
  );

  Widget _buildDetailsTab(Product product, InventoryProvider inventory) {
    if (_isEditing) return _buildEditView(product, inventory);
    return _buildReadView(product);
  }

  Widget _buildReadView(Product product) => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        child: Image.network(product.images.isNotEmpty ? product.images.first : '', height: 250, width: double.infinity, fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(height: 250, color: AppTheme.surface, child: const Icon(Icons.image, size: 64, color: AppTheme.textMuted))),
      ),
      const SizedBox(height: 16),
      _infoRow('SKU', product.sku),
      _infoRow('Tipo Pelle', FurTypes.labelFor(product.furType)),
      _infoRow('Posizione', Locations.labelFor(product.location)),
      if (product.purchasePrice != null) _infoRow('Prezzo Acquisto', '€${product.purchasePrice!.toStringAsFixed(0)}'),
      if (product.sellPrice != null) _infoRow('Prezzo Vendita', '€${product.sellPrice!.toStringAsFixed(0)}'),
      if (product.length != null) _infoRow('Lunghezza', '${product.length} cm'),
      if (product.width != null) _infoRow('Larghezza', '${product.width} cm'),
      if (product.weight != null) _infoRow('Peso', '${product.weight} kg'),
      if (product.lotto != null) _infoRow('Lotto', product.lotto!),
      _infoRow('Fragile', product.isFragile ? 'Sì' : 'No'),
      if (product.technicalNotes != null) ...[const SizedBox(height: 16), const Text('Note Tecniche', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)), const SizedBox(height: 8), Text(product.technicalNotes!, style: const TextStyle(fontSize: 15, color: AppTheme.textPrimary))],
      const SizedBox(height: 16),
      _statusBadge(product.status),
    ]),
  );

  Widget _infoRow(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 120, child: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary))),
      Expanded(child: Text(value, style: const TextStyle(fontSize: 15, color: AppTheme.textPrimary))),
    ]),
  );

  Widget _statusBadge(ProductStatus status) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    decoration: BoxDecoration(
      color: status == ProductStatus.available ? AppTheme.available : (status == ProductStatus.sold ? AppTheme.sold : AppTheme.textMuted),
      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
    ),
    child: Text(status == ProductStatus.available ? 'DISPONIBILE' : (status == ProductStatus.sold ? 'VENDUTO' : 'ARCHIVIATO'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
  );

  Widget _buildEditView(Product product, InventoryProvider inventory) => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _editField('SKU', _skuController),
      const SizedBox(height: 12),
      const Text('Tipo Pelle', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: FurTypes.all.map((type) {
        final isSelected = _editFurType == type.id;
        return GestureDetector(onTap: () => setState(() => _editFurType = type.id), child: Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), decoration: BoxDecoration(color: isSelected ? AppTheme.primary : AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusFull), border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.border)), child: Text(type.label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: isSelected ? Colors.black : AppTheme.textSecondary))));
      }).toList()),
      const SizedBox(height: 12),
      const Text('Posizione', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: Locations.all.map((loc) {
        final isSelected = _editLocation == loc.id;
        return GestureDetector(onTap: () => setState(() => _editLocation = loc.id), child: Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), decoration: BoxDecoration(color: isSelected ? AppTheme.primary : AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusFull), border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.border)), child: Text(loc.label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: isSelected ? Colors.black : AppTheme.textSecondary))));
      }).toList()),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: _editField('Prezzo Acquisto', _purchasePriceController, isNumeric: true)),
        const SizedBox(width: 12),
        Expanded(child: _editField('Prezzo Vendita', _sellPriceController, isNumeric: true)),
      ]),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: _editField('Lunghezza', _lengthController, isNumeric: true)),
        const SizedBox(width: 12),
        Expanded(child: _editField('Larghezza', _widthController, isNumeric: true)),
        const SizedBox(width: 12),
        Expanded(child: _editField('Peso', _weightController, isNumeric: true)),
      ]),
      const SizedBox(height: 12),
      _editField('Note Tecniche', _notesController, maxLines: 4),
      const SizedBox(height: 12),
      SwitchListTile(
        title: const Text('Fragile', style: TextStyle(color: AppTheme.textPrimary)),
        value: _editIsFragile, activeColor: AppTheme.primary,
        onChanged: (v) => setState(() => _editIsFragile = v),
      ),
    ]),
  );

  Widget _editField(String label, TextEditingController controller, {bool isNumeric = false, int maxLines = 1}) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
    const SizedBox(height: 8),
    TextField(controller: controller, keyboardType: isNumeric ? TextInputType.number : TextInputType.text, maxLines: maxLines, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16)),
  ]);

  void _saveChanges() {
    final inventory = context.read<InventoryProvider>();
    inventory.updateProduct(widget.productId, {
      'sku': _skuController.text.trim(),
      'furType': _editFurType,
      'location': _editLocation,
      'purchasePrice': double.tryParse(_purchasePriceController.text),
      'sellPrice': double.tryParse(_sellPriceController.text),
      'length': double.tryParse(_lengthController.text),
      'width': double.tryParse(_widthController.text),
      'weight': double.tryParse(_weightController.text),
      'technicalNotes': _notesController.text.isEmpty ? null : _notesController.text,
      'isFragile': _editIsFragile,
    });
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Modifiche salvate')));
  }

  Widget _buildCodeTab(Product product, String gs1Link) => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      const Text('QR Code - GS1 Digital Link', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      const SizedBox(height: 8),
      const Text('Scansiona per accedere alla scheda digitale del prodotto', style: TextStyle(fontSize: 14, color: AppTheme.textSecondary), textAlign: TextAlign.center),
      const SizedBox(height: 24),
      QrCodeDisplay(data: gs1Link, size: 240),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
        child: SelectableText(gs1Link, style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: AppTheme.primary), textAlign: TextAlign.center),
      ),
      const SizedBox(height: 32),
      const Text('Barcode (Code 128)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      const SizedBox(height: 16),
      Barcode128(value: product.sku, width: 300, height: 80, backgroundColor: Colors.white),
      const SizedBox(height: 8),
      Text(product.sku, style: const TextStyle(fontSize: 14, fontFamily: 'monospace', color: AppTheme.textSecondary)),
    ]),
  );

  Widget _buildNfcTab(Product product, String gs1Link) => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      const Text('Gestione Tag NFC', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      const SizedBox(height: 8),
      const Text('Scrivi o leggi un tag NFC per il prodotto', style: TextStyle(fontSize: 14, color: AppTheme.textSecondary), textAlign: TextAlign.center),
      const SizedBox(height: 24),
      Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
        child: const Icon(Icons.nfc, size: 80, color: AppTheme.primary),
      ),
      const SizedBox(height: 24),
      _nfcButton('SCRIVI TAG NFC', Icons.nfc, AppTheme.primary, () async {
        final success = await NfcService.writeGS1Uri(gs1Link);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(success ? 'Tag NFC scritto con successo!' : 'Scrittura NFC fallita')));
      }),
      const SizedBox(height: 12),
      _nfcButton('LEGGI TAG NFC', Icons.qr_code_scanner, const Color(0xFF3B82F6), () async {
        final value = await NfcService.readTag();
        if (!mounted) return;
        if (value != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Tag letto: $value')));
        } else {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lettura NFC fallita o tag vuoto')));
        }
      }),
      const SizedBox(height: 12),
      _nfcButton('PULISCI TAG NFC', Icons.delete_outline, AppTheme.error, () async {
        final success = await NfcService.cleanTag();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(success ? 'Tag pulito!' : 'Pulizia fallita')));
      }),
      const SizedBox(height: 24),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(AppTheme.radiusMedium), border: Border.all(color: const Color(0xFFFCD34D))),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: const [
          Icon(Icons.info_outline, size: 20, color: Color(0xFFF59E0B)),
          SizedBox(width: 12),
          Expanded(child: Text('L\'NFC scrive il GS1 Digital Link sul tag. Avvicina il telefono al tag per scriverlo o leggerlo.', style: TextStyle(fontSize: 13, color: Color(0xFF92400E), height: 1.4))),
        ]),
      ),
    ]),
  );

  Widget _nfcButton(String label, IconData icon, Color color, VoidCallback onTap) => SizedBox(
    width: double.infinity,
    child: ElevatedButton(
      style: ElevatedButton.styleFrom(backgroundColor: color, padding: const EdgeInsets.all(16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMedium))),
      onPressed: onTap,
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, size: 20, color: Colors.white),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
      ]),
    ),
  );
}
