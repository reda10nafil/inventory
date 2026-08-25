import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../constants/theme.dart';
import '../models/models.dart';
import '../providers/inventory_provider.dart';
import 'package:provider/provider.dart';

class ScannerScreen extends StatefulWidget {
  final Function(String type, String id)? onScanResult;
  const ScannerScreen({super.key, this.onScanResult});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  MobileScannerController cameraController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: [BarcodeFormat.qrCode, BarcodeFormat.ean13, BarcodeFormat.ean8, BarcodeFormat.code128, BarcodeFormat.code39],
  );
  bool _scanned = false;
  bool _flashOn = false;
  bool _showManualInput = false;
  final _manualController = TextEditingController();

  @override
  void dispose() {
    cameraController.dispose();
    _manualController.dispose();
    super.dispose();
  }

  void _handleBarcode(BarcodeCapture capture) {
    if (_scanned) return;
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final data = barcodes.first.rawValue;
    if (data == null) return;

    setState(() => _scanned = true);
    _processScannedCode(data);
  }

  void _processScannedCode(String data) {
    final inventory = context.read<InventoryProvider>();

    // 1. Try Product
    final product = inventory.products.where((p) => p.sku == data || p.id == data).firstOrNull;
    if (product != null) {
      _navigateToAction('product', product.id);
      _resetScan();
      return;
    }

    // 2. Try Location
    final location = Locations.byBarcode(data);
    if (location != null) {
      _navigateToAction('location', location.id);
      _resetScan();
      return;
    }

    // 3. Try Library
    final library = inventory.libraries.where((l) => l.barcode == data || l.id == data).firstOrNull;
    if (library != null) {
      _navigateToAction('library', library.id);
      _resetScan();
      return;
    }

    // 4. Not found
    Future.delayed(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppTheme.surface,
          title: const Text('Codice Non Riconosciuto', style: TextStyle(color: AppTheme.textPrimary, fontSize: 18)),
          content: Text('Codice scansionato: $data\n\nNessun prodotto, posizione o cartella corrisponde a questo codice.', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
          actions: [
            TextButton(onPressed: () { Navigator.pop(ctx); _resetScan(); }, child: const Text('OK')),
            TextButton(onPressed: () { Navigator.pop(ctx); _manualController.text = data; setState(() => _showManualInput = true); _resetScan(); }, child: const Text('Inserisci Manualmente')),
          ],
        ),
      );
    });
  }

  void _navigateToAction(String type, String id) {
    if (widget.onScanResult != null) {
      widget.onScanResult!(type, id);
    } else {
      Navigator.pushNamed(context, '/scanner-action', arguments: {'type': type, 'id': id});
    }
  }

  void _resetScan() {
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _scanned = false);
    });
  }

  void _handleManualSearch() {
    final code = _manualController.text.trim();
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Inserisci un codice valido')));
      return;
    }
    final inventory = context.read<InventoryProvider>();
    final product = inventory.products.where((p) =>
      p.sku.toLowerCase() == code.toLowerCase() || p.id == code).firstOrNull;

    setState(() { _showManualInput = false; });
    _manualController.clear();

    if (product != null) {
      _navigateToAction('product', product.id);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Nessun prodotto trovato per: $code')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(child: _buildCameraView()),
            _buildInstructions(),
            _buildActionButtons(),
            if (_showManualInput) _buildManualModal(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text('Scanner QR/Barcode', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
        Row(children: [
          IconButton(
            icon: Icon(_flashOn ? Icons.flash_on : Icons.flash_off, color: AppTheme.primary),
            onPressed: () { cameraController.toggleTorch(); setState(() => _flashOn = !_flashOn); },
          ),
          IconButton(
            icon: const Icon(Icons.close, color: AppTheme.textSecondary),
            onPressed: () => Navigator.pop(context),
          ),
        ]),
      ],
    ),
  );

  Widget _buildCameraView() => Padding(
    padding: const EdgeInsets.all(16),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
      child: Stack(
        children: [
          MobileScanner(
            controller: cameraController,
            onDetect: _handleBarcode,
          ),
          _buildScanOverlay(),
        ],
      ),
    ),
  );

  Widget _buildScanOverlay() => Positioned.fill(
    child: Center(
      child: Container(
        width: 250, height: 250,
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(width: 4, color: AppTheme.primary),
            bottom: BorderSide(width: 4, color: AppTheme.primary),
            left: BorderSide(width: 4, color: AppTheme.primary),
            right: BorderSide(width: 4, color: AppTheme.primary),
          ),
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    ),
  );

  Widget _buildInstructions() => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
    child: Column(children: [
      Icon(Icons.center_focus_strong, size: 48, color: AppTheme.primary),
      const SizedBox(height: 12),
      const Text('Inquadra il codice QR o barcode', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      const SizedBox(height: 8),
      const Text('Posiziona il codice all\'interno del riquadro\nLa scansione avviene automaticamente', textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
    ]),
  );

  Widget _buildActionButtons() => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    child: Row(children: [
      Expanded(child: _actionButton(Icons.nfc, 'Scansiona NFC', () => _scanNFC())),
      const SizedBox(width: 12),
      Expanded(child: _actionButton(Icons.keyboard, 'Inserisci Manualmente', () => setState(() => _showManualInput = true))),
    ]),
  );

  Widget _actionButton(IconData icon, String label, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium), border: Border.all(color: AppTheme.border)),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, size: 20, color: AppTheme.primary),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.primary)),
      ]),
    ),
  );

  Widget _buildManualModal() => Positioned.fill(
    child: Container(
      color: Colors.black75,
      child: Center(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 20),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Inserisci Codice', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            const SizedBox(height: 8),
            const Text('Digita il codice SKU o barcode del prodotto', style: TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
            const SizedBox(height: 20),
            TextField(
              controller: _manualController,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16),
              decoration: InputDecoration(hintText: 'Es: FUR-2024-001', hintStyle: const TextStyle(color: AppTheme.textSecondary)),
              autofocus: true,
              textCapitalization: TextCapitalization.characters,
              onSubmitted: (_) => _handleManualSearch(),
            ),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(child: TextButton(onPressed: () { setState(() { _showManualInput = false; }); _manualController.clear(); }, child: const Text('Annulla'))),
              const SizedBox(width: 12),
              Expanded(child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                onPressed: _handleManualSearch,
                child: const Text('Cerca', style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600)),
              )),
            ]),
          ]),
        ),
      ),
    ),
  );

  void _scanNFC() async {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Avvicina il tag NFC...'), duration: Duration(seconds: 10)));
    // NFC reading would be implemented here with nfc_manager
    ScaffoldMessenger.of(context).clearSnackBars();
  }
}
