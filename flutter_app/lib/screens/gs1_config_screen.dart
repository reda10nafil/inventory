import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/theme.dart';
import '../constants/config.dart';
import '../providers/inventory_provider.dart';
import '../utils/gs1.dart';

class GS1ConfigScreen extends StatefulWidget {
  const GS1ConfigScreen({super.key});
  @override
  State<GS1ConfigScreen> createState() => _GS1ConfigScreenState();
}

class _GS1ConfigScreenState extends State<GS1ConfigScreen> {
  late TextEditingController _baseUrlController;

  @override
  void initState() {
    super.initState();
    final config = context.read<InventoryProvider>().gs1Config;
    _baseUrlController = TextEditingController(text: config.baseUrl);
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inventory = context.watch<InventoryProvider>();
    final config = inventory.gs1Config;
    final previewLink = GS1Util.buildPreviewLink(GS1Config(
      baseUrl: _baseUrlController.text.trim().isEmpty ? config.baseUrl : _baseUrlController.text.trim(),
      enableSerial: config.enableSerial,
      serialMode: config.serialMode,
      enableLotto: config.enableLotto,
    ));

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(children: [
          _buildHeader(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _buildInfoCard(),
                const SizedBox(height: 24),
                const Text('ENDPOINT DI RISOLUZIONE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1)),
                const SizedBox(height: 12),
                _buildBaseUrlCard(config),
                const SizedBox(height: 24),
                const Text('MAPPATURA GS1 (APPLICATION IDENTIFIERS)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1)),
                const SizedBox(height: 12),
                _buildGTINCard(),
                const SizedBox(height: 12),
                _buildSerialCard(config),
                const SizedBox(height: 12),
                _buildLottoCard(config),
                const SizedBox(height: 24),
                const Text('ANTEPRIMA STRINGA', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1)),
                const SizedBox(height: 12),
                _buildPreviewCard(previewLink, config),
                const SizedBox(height: 16),
                _buildResetButton(),
                const SizedBox(height: 24),
              ]),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _buildHeader() => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    child: Row(children: [
      IconButton(icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary), onPressed: () => Navigator.pop(context)),
      const Text('Configurazione GS1', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
    ]),
  );

  Widget _buildInfoCard() => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border.all(color: AppTheme.primary.withOpacity(0.3))),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(width: 44, height: 44, decoration: BoxDecoration(shape: BoxShape.circle, color: AppTheme.primary.withOpacity(0.2)), child: const Icon(Icons.link, size: 24, color: AppTheme.primary)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('GS1 Digital Link', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.primary)),
        const SizedBox(height: 4),
        const Text('Genera automaticamente un URL standard GS1 per ogni prodotto. Collegalo a QR Code e tag NFC per un\'identità digitale univoca.', style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4)),
      ])),
    ]),
  );

  Widget _buildBaseUrlCard(GS1Config config) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border.all(color: AppTheme.borderLight)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Dominio Base', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      const SizedBox(height: 10),
      TextField(
        controller: _baseUrlController,
        style: const TextStyle(fontSize: 15, color: AppTheme.textPrimary),
        decoration: InputDecoration(hintText: 'https://syncroflow.app/id', prefixIcon: const Icon(Icons.language, size: 20, color: AppTheme.textSecondary)),
        keyboardType: TextInputType.url,
        autocorrect: false,
        onChanged: (value) => setState(() {}),
        onSubmitted: (value) => context.read<InventoryProvider>().updateGS1Config(baseUrl: value.trim().isEmpty ? GS1Config.defaults.baseUrl : value.trim()),
      ),
      const SizedBox(height: 8),
      const Text('URL base per la risoluzione dei Digital Link. Es: https://id.tuodominio.it', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
    ]),
  );

  Widget _buildGTINCard() => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border.all(color: AppTheme.borderLight)),
    child: Row(children: [
      Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.3), borderRadius: BorderRadius.circular(6)), child: const Text('AI 01', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.primary))),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('GTIN / EAN', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
        Text('Mappato sul campo SKU del prodotto', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
      ])),
      Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.15), borderRadius: BorderRadius.circular(AppTheme.radiusFull)), child: Row(children: const [Icon(Icons.lock, size: 14, color: AppTheme.primary), SizedBox(width: 4), Text('Obbligatorio', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary))])),
    ]),
  );

  Widget _buildSerialCard(GS1Config config) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border.all(color: AppTheme.borderLight)),
    child: Column(children: [
      Row(children: [
        Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: config.enableSerial ? AppTheme.success.withOpacity(0.3) : AppTheme.textMuted.withOpacity(0.2), borderRadius: BorderRadius.circular(6)), child: Text('AI 21', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: config.enableSerial ? AppTheme.success : AppTheme.textMuted))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Numero Seriale', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
          Text('Genera un identificativo univoco per ogni prodotto', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        ])),
        Switch(value: config.enableSerial, activeColor: AppTheme.success, onChanged: (v) => context.read<InventoryProvider>().updateGS1Config(enableSerial: v)),
      ]),
      if (config.enableSerial) ...[
        const SizedBox(height: 16),
        const Divider(color: AppTheme.borderLight, height: 1),
        const SizedBox(height: 16),
        const Text('MODALITÀ GENERAZIONE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 0.5)),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _segmentButton('UUID', Icons.fingerprint, config.serialMode == 'uuid', () => context.read<InventoryProvider>().updateGS1Config(serialMode: 'uuid'))),
          const SizedBox(width: 4),
          Expanded(child: _segmentButton('Progressivo', Icons.format_list_numbered, config.serialMode == 'progressive', () => context.read<InventoryProvider>().updateGS1Config(serialMode: 'progressive'))),
        ]),
      ],
    ]),
  );

  Widget _segmentButton(String label, IconData icon, bool isActive, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(padding: const EdgeInsets.symmetric(vertical: 10), decoration: BoxDecoration(color: isActive ? AppTheme.primary : Colors.transparent, borderRadius: BorderRadius.circular(AppTheme.radiusSmall)), child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(icon, size: 16, color: isActive ? Colors.black : AppTheme.textSecondary), const SizedBox(width: 6), Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isActive ? Colors.black : AppTheme.textSecondary))])),
  );

  Widget _buildLottoCard(GS1Config config) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border.all(color: AppTheme.borderLight)),
    child: Row(children: [
      Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: config.enableLotto ? AppTheme.info.withOpacity(0.3) : AppTheme.textMuted.withOpacity(0.2), borderRadius: BorderRadius.circular(6)), child: Text('AI 10', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: config.enableLotto ? AppTheme.info : AppTheme.textMuted))),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Lotto', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
        Text('Includi il numero di lotto nell\'URL', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
      ])),
      Switch(value: config.enableLotto, activeColor: AppTheme.info, onChanged: (v) => context.read<InventoryProvider>().updateGS1Config(enableLotto: v)),
    ]),
  );

  Widget _buildPreviewCard(String previewLink, GS1Config config) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border.all(color: AppTheme.primary)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: const [Icon(Icons.qr_code, size: 20, color: AppTheme.primary), SizedBox(width: 8), Text('URL Risultante', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.primary))]),
      const SizedBox(height: 12),
      Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: AppTheme.backgroundSecondary, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)), child: SelectableText(previewLink, style: const TextStyle(fontSize: 13, fontFamily: 'monospace', color: AppTheme.primary, height: 1.5))),
      const SizedBox(height: 12),
      _previewSegment(AppTheme.primary, 'Base: ${_baseUrlController.text.trim().isEmpty ? config.baseUrl : _baseUrlController.text.trim()}'),
      _previewSegment(AppTheme.warning, 'AI 01 (GTIN): dal campo SKU'),
      if (config.enableSerial) _previewSegment(AppTheme.success, 'AI 21 (Seriale): ${config.serialMode == 'uuid' ? 'UUID automatico' : 'Progressivo'}'),
      if (config.enableLotto) _previewSegment(AppTheme.info, 'AI 10 (Lotto): ${config.lottoFieldId.isEmpty ? 'nessun campo selezionato' : 'campo selezionato'}'),
    ]),
  );

  Widget _previewSegment(Color color, String text) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(children: [Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: color)), const SizedBox(width: 8), Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)))]),
  );

  Widget _buildResetButton() => SizedBox(
    width: double.infinity,
    child: OutlinedButton(
      style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16), side: const BorderSide(color: AppTheme.error), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMedium))),
      onPressed: () {
        showDialog(context: context, builder: (ctx) => AlertDialog(
          backgroundColor: AppTheme.surface,
          title: const Text('Reset Configurazione', style: TextStyle(color: AppTheme.textPrimary)),
          content: const Text('Vuoi ripristinare le impostazioni GS1 ai valori predefiniti?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annulla')),
            TextButton(onPressed: () { context.read<InventoryProvider>().resetGS1Config(); _baseUrlController.text = GS1Config.defaults.baseUrl; Navigator.pop(ctx); }, child: const Text('Ripristina', style: TextStyle(color: AppTheme.error))),
          ],
        ));
      },
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: const [Icon(Icons.restore, size: 20, color: AppTheme.error), SizedBox(width: 8), Text('Ripristina Predefiniti', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.error))]),
    ),
  );
}
