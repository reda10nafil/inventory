import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/theme.dart';
import '../constants/config.dart';
import '../models/models.dart';
import '../providers/inventory_provider.dart';

class ScannerActionScreen extends StatefulWidget {
  final String type;
  final String id;
  const ScannerActionScreen({super.key, required this.type, required this.id});

  @override
  State<ScannerActionScreen> createState() => _ScannerActionScreenState();
}

class _ScannerActionScreenState extends State<ScannerActionScreen> {
  String? _selectedAction;
  String? _selectedLocation;
  final _priceController = TextEditingController();

  @override
  void dispose() {
    _priceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inventory = context.read<InventoryProvider>();

    if (widget.type == 'product') {
      final product = inventory.getProductById(widget.id);
      if (product == null) return _notFound('Prodotto non trovato');
      return _buildProductView(product, inventory);
    }

    if (widget.type == 'location') {
      final location = Locations.byId(widget.id);
      if (location == null) return _notFound('Posizione non trovata');
      return _buildLocationView(location);
    }

    if (widget.type == 'library') {
      final library = inventory.libraries.where((l) => l.id == widget.id).firstOrNull;
      if (library == null) return _notFound('Cartella non trovata');
      return _buildLibraryView(library);
    }

    return _notFound('Elemento non riconosciuto');
  }

  Widget _buildProductView(Product product, InventoryProvider inventory) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundSecondary,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _buildProductPreview(product),
            const SizedBox(height: 24),
            const Text('AZIONE RAPIDA', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1)),
            const SizedBox(height: 12),
            _actionButton('moved', 'SPOSTATO', 'Registra cambio di posizione', Icons.swap_horiz, const Color(0xFF3B82F6)),
            if (_selectedAction == 'moved') _buildLocationSelector(),
            _actionButton('sold', 'VENDUTO', 'Segna come venduto e archivia', Icons.sell, const Color(0xFF10B981)),
            if (_selectedAction == 'sold') _buildPriceInput(product),
            _actionButton('details', 'DETTAGLI/MODIFICA', 'Visualizza e modifica tutti i campi', Icons.edit, AppTheme.primary),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _selectedAction != null ? AppTheme.primary : AppTheme.surface,
                  padding: const EdgeInsets.all(16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
                ),
                onPressed: _selectedAction == null ? null : () => _handleAction(product, inventory),
                child: Text(_getExecuteLabel(), style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: _selectedAction != null ? Colors.black : AppTheme.textSecondary)),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _buildProductPreview(Product product) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
    child: Row(children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        child: Image.network(product.images.isNotEmpty ? product.images.first : '', width: 100, height: 100, fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(width: 100, height: 100, color: AppTheme.backgroundSecondary, child: const Icon(Icons.image, color: AppTheme.textMuted))),
      ),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(product.sku, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
        const SizedBox(height: 4),
        Text(_capitalize(FurTypes.labelFor(product.furType)), style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
        const SizedBox(height: 8),
        Row(children: [Icon(Icons.location_on, size: 14, color: AppTheme.primary), const SizedBox(width: 4), Text(Locations.labelFor(product.location).toUpperCase(), style: const TextStyle(fontSize: 12, color: AppTheme.primary))]),
      ])),
    ]),
  );

  Widget _actionButton(String action, String title, String desc, IconData icon, Color color) {
    final isActive = _selectedAction == action;
    return GestureDetector(
      onTap: () => setState(() => _selectedAction = action),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
          border: Border.all(color: isActive ? AppTheme.primary : Colors.transparent, width: 2),
        ),
        child: Row(children: [
          Container(width: 48, height: 48, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)), child: Icon(icon, size: 24, color: Colors.white)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            Text(desc, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
          ])),
          Icon(isActive ? Icons.radio_button_checked : Icons.radio_button_unchecked, size: 24, color: isActive ? AppTheme.primary : AppTheme.textSecondary),
        ]),
      ),
    );
  }

  Widget _buildLocationSelector() => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppTheme.backgroundSecondary, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Seleziona nuova posizione:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
      const SizedBox(height: 12),
      ...Locations.all.map((loc) {
        final isSelected = _selectedLocation == loc.id;
        return GestureDetector(
          onTap: () => setState(() => _selectedLocation = loc.id),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
              border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.border),
            ),
            child: Row(children: [
              Container(width: 12, height: 12, decoration: BoxDecoration(shape: BoxShape.circle, color: loc.color)),
              const SizedBox(width: 12),
              Text(loc.label, style: TextStyle(fontSize: 15, color: isSelected ? AppTheme.primary : AppTheme.textPrimary, fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400)),
            ]),
          ),
        );
      }),
    ]),
  );

  Widget _buildPriceInput(Product product) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppTheme.backgroundSecondary, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Prezzo di vendita finale (opzionale):', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
      const SizedBox(height: 12),
      TextField(
        controller: _priceController,
        keyboardType: TextInputType.number,
        style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16),
        decoration: InputDecoration(hintText: '€${product.sellPrice ?? 0}', hintStyle: const TextStyle(color: AppTheme.textSecondary)),
      ),
    ]),
  );

  String _getExecuteLabel() {
    switch (_selectedAction) {
      case 'moved': return 'Conferma Spostamento';
      case 'sold': return 'Conferma Vendita';
      case 'details': return 'Vai ai Dettagli';
      default: return 'Seleziona un\'azione';
    }
  }

  void _handleAction(Product product, InventoryProvider inventory) {
    if (_selectedAction == 'moved') {
      if (_selectedLocation == null) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Seleziona una posizione'))); return; }
      inventory.moveProduct(product.id, _selectedLocation!);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${product.sku} spostato in ${Locations.labelFor(_selectedLocation!)}')));
      Navigator.pop(context);
    } else if (_selectedAction == 'sold') {
      final price = double.tryParse(_priceController.text);
      inventory.sellProduct(product.id, price);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${product.sku} venduto')));
      Navigator.pop(context);
    } else if (_selectedAction == 'details') {
      Navigator.pushReplacementNamed(context, '/product/${product.id}');
    }
  }

  Widget _buildLocationView(LocationItem location) => Scaffold(
    backgroundColor: AppTheme.backgroundSecondary,
    body: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border(left: BorderSide(color: location.color, width: 6))),
            child: Row(children: [
              Icon(Icons.location_on, size: 40, color: location.color),
              const SizedBox(width: 16),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('POSIZIONE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
                Text(location.label, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
              ]),
            ]),
          ),
          const SizedBox(height: 32),
          const Text('AZIONI DISPONIBILI', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1)),
          const SizedBox(height: 12),
          _simpleAction('SPOSTAMENTO DI MASSA', 'Sposta prodotti QUI o da QUI', Icons.move_to_inbox, AppTheme.primary),
          _simpleAction('INVENTARIO / AUDIT', 'Verifica contenuto posizione', Icons.fact_check, AppTheme.warning),
          const SizedBox(height: 16),
          Center(child: TextButton(onPressed: () => Navigator.pop(context), child: const Text('Chiudi', style: TextStyle(color: AppTheme.primary, fontSize: 16)))),
        ]),
      ),
    ),
  );

  Widget _buildLibraryView(Library library) => Scaffold(
    backgroundColor: AppTheme.backgroundSecondary,
    body: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: const Border(left: BorderSide(color: AppTheme.primary, width: 6))),
            child: Row(children: [
              const Icon(Icons.folder, size: 40, color: AppTheme.primary),
              const SizedBox(width: 16),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('CARTELLA', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
                Text(library.name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
              ]),
            ]),
          ),
          const SizedBox(height: 32),
          const Text('AZIONI', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1)),
          const SizedBox(height: 12),
          _simpleAction('VEDI PRODOTTI', 'Vai all\'inventario filtrato', Icons.list, AppTheme.primary),
          const SizedBox(height: 16),
          Center(child: TextButton(onPressed: () => Navigator.pop(context), child: const Text('Chiudi', style: TextStyle(color: AppTheme.primary, fontSize: 16)))),
        ]),
      ),
    ),
  );

  Widget _simpleAction(String title, String desc, IconData icon, Color color) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
    child: Row(children: [
      Container(width: 48, height: 48, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)), child: Icon(icon, size: 24, color: Colors.white)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
        Text(desc, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
      ])),
      const Icon(Icons.chevron_right, size: 24, color: AppTheme.textSecondary),
    ]),
  );

  Widget _notFound(String message) => Scaffold(
    backgroundColor: AppTheme.background,
    body: SafeArea(
      child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.error_outline, size: 64, color: AppTheme.error),
        const SizedBox(height: 16),
        Text(message, style: const TextStyle(fontSize: 20, color: AppTheme.textPrimary)),
        const SizedBox(height: 24),
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Chiudi', style: TextStyle(color: AppTheme.primary, fontSize: 16))),
      ])),
    ),
  );

  String _capitalize(String s) => s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';
}
