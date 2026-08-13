import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/theme.dart';
import '../constants/config.dart';
import '../models/models.dart';
import '../providers/inventory_provider.dart';

class AddProductScreen extends StatefulWidget {
  const AddProductScreen({super.key});
  @override
  State<AddProductScreen> createState() => _AddProductScreenState();
}

class _AddProductScreenState extends State<AddProductScreen> {
  final _skuController = TextEditingController();
  final _purchasePriceController = TextEditingController();
  final _sellPriceController = TextEditingController();
  final _lengthController = TextEditingController();
  final _widthController = TextEditingController();
  final _weightController = TextEditingController();
  final _notesController = TextEditingController();
  String? _furType;
  String? _location;
  String? _libraryId;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _skuController.dispose(); _purchasePriceController.dispose(); _sellPriceController.dispose();
    _lengthController.dispose(); _widthController.dispose(); _weightController.dispose(); _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inventory = context.watch<InventoryProvider>();
    return SafeArea(
      top: true,
      child: Container(
        color: AppTheme.background,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _buildHeader(),
            _buildSkuField(inventory),
            const SizedBox(height: 16),
            _buildFurTypeChips(),
            const SizedBox(height: 16),
            _buildLocationChips(),
            const SizedBox(height: 16),
            _buildFolderChips(inventory.libraries),
            const SizedBox(height: 16),
            _buildPriceRow(),
            const SizedBox(height: 16),
            _buildDimensionsRow(),
            const SizedBox(height: 16),
            _buildNotesField(),
            const SizedBox(height: 24),
            _buildSubmitButton(inventory),
            const SizedBox(height: 16),
            const Text('* Campi obbligatori: Tipo di Pelle, Posizione (SKU auto-generato se vuoto)', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppTheme.textSecondary), textAlign: TextAlign.center),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _buildHeader() => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: const [
      Text('Aggiungi Prodotto', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      Icon(Icons.add_photo_alternate, size: 32, color: AppTheme.primary),
    ]),
  );

  Widget _buildSkuField(InventoryProvider inventory) {
    final autoSku = inventory.generateSKU();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('SKU', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: TextFormField(controller: _skuController, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16), decoration: InputDecoration(hintText: 'Auto: $autoSku'))),
        const SizedBox(width: 8),
        GestureDetector(onTap: () => _skuController.text = autoSku, child: Container(width: 50, height: 50, decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium), border: Border.all(color: AppTheme.border)), child: const Icon(Icons.qr_code_2, size: 24, color: AppTheme.primary))),
      ]),
      const SizedBox(height: 4),
      const Text('Generato automaticamente se vuoto', style: TextStyle(fontSize: 12, color: AppTheme.primary)),
    ]);
  }

  Widget _buildFurTypeChips() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Row(children: const [Text('Tipo di Pelle', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)), Text(' *', style: TextStyle(color: AppTheme.error))]),
    const SizedBox(height: 8),
    SizedBox(height: 48, child: ListView(scrollDirection: Axis.horizontal, children: FurTypes.all.map((type) {
      final isActive = _furType == type.id;
      return GestureDetector(onTap: () => setState(() => _furType = type.id), child: Container(margin: const EdgeInsets.only(right: 8), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), decoration: BoxDecoration(color: isActive ? AppTheme.primary : AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusFull), border: Border.all(color: isActive ? AppTheme.primary : AppTheme.border)), child: Text(type.label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: isActive ? Colors.black : AppTheme.textSecondary))));
    }).toList())),
  ]);

  Widget _buildLocationChips() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Row(children: const [Text('Posizione', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)), Text(' *', style: TextStyle(color: AppTheme.error))]),
    const SizedBox(height: 8),
    SizedBox(height: 48, child: ListView(scrollDirection: Axis.horizontal, children: Locations.all.map((loc) {
      final isActive = _location == loc.id;
      return GestureDetector(onTap: () => setState(() => _location = loc.id), child: Container(margin: const EdgeInsets.only(right: 8), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), decoration: BoxDecoration(color: isActive ? AppTheme.primary : AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusFull), border: Border.all(color: isActive ? AppTheme.primary : AppTheme.border)), child: Row(children: [Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: loc.color)), const SizedBox(width: 6), Text(loc.label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: isActive ? Colors.black : AppTheme.textSecondary))])));
    }).toList())),
  ]);

  Widget _buildFolderChips(List<Library> libraries) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('Cartella', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
    const SizedBox(height: 8),
    SizedBox(height: 48, child: libraries.isEmpty ? const Center(child: Text('Nessuna cartella', style: TextStyle(fontStyle: FontStyle.italic, color: AppTheme.textSecondary))) : ListView(scrollDirection: Axis.horizontal, children: libraries.map((lib) {
      final isActive = _libraryId == lib.id;
      return GestureDetector(onTap: () => setState(() => _libraryId = isActive ? null : lib.id), child: Container(margin: const EdgeInsets.only(right: 8), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), decoration: BoxDecoration(color: isActive ? AppTheme.primary : AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusFull), border: Border.all(color: isActive ? AppTheme.primary : AppTheme.border)), child: Row(children: [Icon(Icons.folder, size: 16, color: isActive ? Colors.black : AppTheme.textSecondary), const SizedBox(width: 6), Text(lib.name, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: isActive ? Colors.black : AppTheme.textSecondary))])));
    }).toList())),
  ]);

  Widget _buildPriceRow() => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Expanded(child: _inputField('Prezzo Acquisto', _purchasePriceController, '€ 2500', isNumeric: true, icon: Icons.euro)),
    const SizedBox(width: 16),
    Expanded(child: _inputField('Prezzo Vendita', _sellPriceController, '€ 4200', isNumeric: true, icon: Icons.euro)),
  ]);

  Widget _buildDimensionsRow() => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Expanded(child: _inputField('Lunghezza', _lengthController, '85 cm', isNumeric: true, icon: Icons.straighten)),
    const SizedBox(width: 16),
    Expanded(child: _inputField('Larghezza', _widthController, '120 cm', isNumeric: true, icon: Icons.straighten)),
    const SizedBox(width: 16),
    Expanded(child: _inputField('Peso', _weightController, '1.2 kg', isNumeric: true, icon: Icons.scale)),
  ]);

  Widget _inputField(String label, TextEditingController controller, String hint, {bool isNumeric = false, IconData? icon}) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
    const SizedBox(height: 8),
    TextFormField(controller: controller, keyboardType: isNumeric ? TextInputType.number : TextInputType.text, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16), decoration: InputDecoration(hintText: hint, prefixIcon: icon != null ? Icon(icon, size: 20, color: AppTheme.textSecondary) : null)),
  ]);

  Widget _buildNotesField() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('Note Tecniche', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
    const SizedBox(height: 8),
    TextFormField(controller: _notesController, maxLines: 4, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16), decoration: const InputDecoration(hintText: 'Inserisci dettagli tecnici...', prefixIcon: Padding(padding: EdgeInsets.only(top: 14), child: Icon(Icons.notes, size: 20, color: AppTheme.textSecondary)))),
  ]);

  Widget _buildSubmitButton(InventoryProvider inventory) => SizedBox(
    width: double.infinity,
    child: ElevatedButton(
      style: ElevatedButton.styleFrom(backgroundColor: _isSubmitting ? AppTheme.border : AppTheme.primary, padding: const EdgeInsets.all(16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMedium))),
      onPressed: _isSubmitting ? null : () => _handleSubmit(inventory),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.check_circle, size: 24, color: _isSubmitting ? AppTheme.textSecondary : Colors.black),
        const SizedBox(width: 8),
        Text(_isSubmitting ? 'Salvataggio...' : 'Aggiungi all\'Inventario', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: _isSubmitting ? AppTheme.textSecondary : Colors.black)),
      ]),
    ),
  );

  void _handleSubmit(InventoryProvider inventory) {
    if (_furType == null || _location == null) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Compila almeno Tipo di Pelle e Posizione'))); return; }
    setState(() => _isSubmitting = true);
    final sku = _skuController.text.trim().isEmpty ? inventory.generateSKU() : _skuController.text.trim();
    inventory.addProduct(Product(
      id: 'p_${DateTime.now().millisecondsSinceEpoch}', sku: sku, furType: _furType!, location: _location!, status: ProductStatus.available,
      images: ['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=800&fit=crop'],
      purchasePrice: double.tryParse(_purchasePriceController.text), sellPrice: double.tryParse(_sellPriceController.text),
      length: double.tryParse(_lengthController.text), width: double.tryParse(_widthController.text), weight: double.tryParse(_weightController.text),
      technicalNotes: _notesController.text.isEmpty ? null : _notesController.text, libraryId: _libraryId,
      createdAt: DateTime.now(), updatedAt: DateTime.now(),
    ));
    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      _resetForm();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$sku aggiunto all\'inventario')));
    });
  }

  void _resetForm() {
    _skuController.clear(); _purchasePriceController.clear(); _sellPriceController.clear();
    _lengthController.clear(); _widthController.clear(); _weightController.clear(); _notesController.clear();
    setState(() { _furType = null; _location = null; _libraryId = null; });
  }
}
