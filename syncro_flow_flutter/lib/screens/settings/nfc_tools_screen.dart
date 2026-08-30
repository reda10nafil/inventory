import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../services/global_nfc_service.dart';
import '../../services/nfc_coordinator.dart';
import '../../services/nfc_service.dart';
import '../../services/sound_service.dart';

class NfcToolsScreen extends ConsumerStatefulWidget {
  const NfcToolsScreen({super.key});

  @override
  ConsumerState<NfcToolsScreen> createState() => _NfcToolsScreenState();
}

class _NfcToolsScreenState extends ConsumerState<NfcToolsScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  Map<String, dynamic>? _lastInfo;
  bool _isScanning = false;
  final TextEditingController _writeCtrl = TextEditingController();
  String _writeType = 'text'; // text / uri / sku
  String? _statusMsg;
  bool _isError = false;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await NfcCoordinator.acquire(NfcMode.tools, 'nfc_tools');
      await GlobalNfcService.pause();
      await NfcCoordinator.forceStop();
    });
  }

  @override
  void dispose() {
    _tab.dispose();
    _writeCtrl.dispose();
    // Rilascia senza riattivare globale se parent settings lo tiene bloccato
    NfcCoordinator.release('nfc_tools');
    super.dispose();
  }

  void _showStatus(String msg, {bool error = false}) {
    setState(() {
      _statusMsg = msg;
      _isError = error;
    });
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted && _statusMsg == msg) setState(() => _statusMsg = null);
    });
  }

  Future<void> _doRead() async {
    if (_isScanning) return;
    setState(() => _isScanning = true);
    _showStatus('Avvicina il tag NFC — solo Lettura attiva...');
    const token = 'nfc_tools_read';
    await NfcCoordinator.acquire(NfcMode.explicitRead, token);
    final svc = NfcService();
    final sup = await svc.isSupported();
    if (!sup) {
      setState(() => _isScanning = false);
      await NfcCoordinator.release(token);
      await NfcCoordinator.acquire(NfcMode.tools, 'nfc_tools');
      await NfcCoordinator.forceStop();
      _showStatus('NFC non disponibile su questo dispositivo', error: true);
      return;
    }
    final info = await svc.readTagDetailed();
    NfcCoordinator.inhibitAfterExplicit();
    await SoundService.playNfcRead();
    await Future.delayed(const Duration(milliseconds: 1000));
    await NfcCoordinator.release(token);
    await NfcCoordinator.acquire(NfcMode.tools, 'nfc_tools');
    await NfcCoordinator.forceStop();
    setState(() => _isScanning = false);
    if (info == null) {
      _showStatus('Lettura fallita o tag rimosso', error: true);
      return;
    }
    setState(() => _lastInfo = info);
    _showStatus('Tag letto: solo Lettura completata!');
  }

  Future<void> _doWrite() async {
    final payload = _writeCtrl.text.trim();
    if (payload.isEmpty) {
      _showStatus('Inserisci un payload da scrivere', error: true);
      return;
    }
    if (_isScanning) return;
    setState(() => _isScanning = true);
    _showStatus('Avvicina il tag per scrivere: $payload — solo Scrittura attiva...');
    const token = 'nfc_tools_write';
    await NfcCoordinator.acquire(NfcMode.explicitWrite, token);
    final svc = NfcService();
    bool ok = false;
    if (_writeType == 'uri' || payload.startsWith('http')) {
      ok = await svc.writeGS1Uri(payload);
    } else {
      ok = await svc.writeNfcTag(payload);
    }
    NfcCoordinator.inhibitAfterExplicit();
    if (ok) await SoundService.playNfcWrite();
    await Future.delayed(const Duration(milliseconds: 1000));
    await NfcCoordinator.release(token);
    await NfcCoordinator.acquire(NfcMode.tools, 'nfc_tools');
    await NfcCoordinator.forceStop();
    setState(() => _isScanning = false);
    _showStatus(ok ? 'Scrittura: solo Scrittura completata!' : 'Scrittura fallita — tag protetto o non NDEF', error: !ok);
  }

  Future<void> _doClean() async {
    if (_isScanning) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Cancellare / Formattare Tag?'),
        content: const Text('Verrà scritto un NDEF vuoto. Se il tag è Mifare Classic grezzo, verrà formattato come NDEF. Continuare?', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annulla')),
          ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: AppColors.error), onPressed: () => Navigator.pop(ctx, true), child: const Text('Formatta')),
        ],
      ),
    );
    if (confirm != true) return;
    setState(() => _isScanning = true);
    _showStatus('Avvicina il tag da cancellare/formattare — solo Cancellazione attiva...');
    const token = 'nfc_tools_clean';
    await NfcCoordinator.acquire(NfcMode.explicitClean, token);
    final ok = await NfcService().cleanTag();
    NfcCoordinator.inhibitAfterExplicit();
    if (ok) await SoundService.playNfcClean();
    await Future.delayed(const Duration(milliseconds: 1000));
    await NfcCoordinator.release(token);
    await NfcCoordinator.acquire(NfcMode.tools, 'nfc_tools');
    await NfcCoordinator.forceStop();
    setState(() => _isScanning = false);
    _showStatus(ok ? 'Tag: solo Cancellazione completata!' : 'Cancellazione fallita', error: !ok);
    if (ok) setState(() => _lastInfo = null);
  }

  Widget _infoRow(IconData icon, String title, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Row(children: [
        Icon(icon, color: AppColors.textSecondary, size: 22),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        ])),
        IconButton(icon: const Icon(Icons.copy, size: 16, color: AppColors.textMuted), onPressed: () { Clipboard.setData(ClipboardData(text: value)); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copiato'))); }),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        title: const Text('NFC Tools Avanzati', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(controller: _tab, indicatorColor: AppColors.primary, labelColor: AppColors.primary, unselectedLabelColor: AppColors.textSecondary, tabs: const [
          Tab(text: 'LETTURA'),
          Tab(text: 'SCRITTURA'),
          Tab(text: 'ALTRO'),
          Tab(text: 'TASKS'),
        ]),
      ),
      body: Stack(children: [
        TabBarView(controller: _tab, children: [
          // LETTURA
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              ElevatedButton.icon(icon: Icon(_isScanning ? Icons.hourglass_top : Icons.nfc, color: Colors.white), label: Text(_isScanning ? 'In attesa tag...' : 'Avvicina Tag per Lettura', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), onPressed: _doRead),
              const SizedBox(height: 16),
              if (_lastInfo == null)
                Container(padding: const EdgeInsets.all(24), decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)), child: Column(children: [const Icon(Icons.nfc, size: 48, color: AppColors.textMuted), const SizedBox(height: 12), Text('Nessun tag letto', style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)), Text('Tocca il bottone e avvicina il tag Mifare/NTAG', style: AppTypography.caption.copyWith(color: AppColors.textMuted), textAlign: TextAlign.center)]))
              else ...[
                _infoRow(Icons.waves, 'Tipo di tag : ${_lastInfo!['tagType']}', _lastInfo!['tagType'] ?? 'N/D'),
                _infoRow(Icons.info_outline, 'Tecnologia disponibile', (_lastInfo!['techList'] as List).join(', ')),
                _infoRow(Icons.key, 'Numero seriale', _lastInfo!['identifier'] ?? 'N/D'),
                _infoRow(Icons.abc, 'ATQA', _lastInfo!['atqa'] ?? 'N/D'),
                _infoRow(Icons.label, 'SAK', _lastInfo!['sak'] ?? 'N/D'),
                _infoRow(Icons.memory, 'Informazioni della memoria', '${_lastInfo!['totalBytes']} Bytes totali • ${_lastInfo!['usedBytes']} usati'),
                _infoRow(Icons.data_array, 'Formato dati', (_lastInfo!['techList'] as List).contains('Ndef') ? 'NDEF Formattato' : 'Non NDEF'),
                _infoRow(Icons.storage, 'Dimensione', '${_lastInfo!['usedBytes']} / ${_lastInfo!['totalBytes']} Bytes'),
                _infoRow(Icons.sync, 'Scrivibile', (_lastInfo!['isWritable'] == true) ? 'Sì' : 'No'),
                _infoRow(Icons.lock, 'Può essere di Sola-Lettura', (_lastInfo!['canMakeReadOnly'] == true) ? 'Sì' : 'No'),
                const SizedBox(height: 12),
                Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: AppColors.backgroundSecondary, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.primary)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Payload NDEF', style: AppTypography.caption.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)), const SizedBox(height: 6), SelectableText(_lastInfo!['payload']?.toString() ?? '', style: const TextStyle(color: Colors.white, fontSize: 14)) ])),
              ],
            ]),
          ),
          // SCRITTURA
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('Payload da scrivere', style: AppTypography.titleSmall.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextField(controller: _writeCtrl, maxLines: 3, style: const TextStyle(color: Colors.white), decoration: InputDecoration(hintText: 'Es. SKU-2026-001 o https://example.com/01/...', hintStyle: const TextStyle(color: AppColors.textMuted), filled: true, fillColor: AppColors.surface, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
              const SizedBox(height: 12),
              Row(children: [
                ChoiceChip(label: const Text('Testo'), selected: _writeType=='text', onSelected: (_) => setState(() => _writeType='text')),
                const SizedBox(width: 8),
                ChoiceChip(label: const Text('URI'), selected: _writeType=='uri', onSelected: (_) => setState(() => _writeType='uri')),
              ]),
              const SizedBox(height: 16),
              ElevatedButton.icon(icon: const Icon(Icons.save, color: Colors.white), label: Text(_isScanning ? 'Avvicina tag...' : 'Scrivi su Tag', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), style: ElevatedButton.styleFrom(backgroundColor: AppColors.success, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), onPressed: _isScanning ? null : _doWrite),
              const SizedBox(height: 8),
              Text('Su Mifare Classic 1K vuoto verrà formattato automaticamente come NDEF.', style: AppTypography.caption.copyWith(color: AppColors.textMuted)),
            ]),
          ),
          // ALTRO
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Card(color: AppColors.surface, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), child: ListTile(leading: const Icon(Icons.delete_forever, color: AppColors.error), title: const Text('Cancella / Formatta Tag', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), subtitle: const Text('Scrive NDEF vuoto — su Mifare grezzo formatta come NDEF (compatibile)', style: TextStyle(color: Colors.white70, fontSize: 11)), onTap: _doClean)),
              const SizedBox(height: 8),
              Card(color: AppColors.surface, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), child: ListTile(leading: const Icon(Icons.enhanced_encryption, color: AppColors.warning), title: const Text('Rendi Sola Lettura (Lock)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), subtitle: const Text('Non implementato — richiede tag vergine', style: TextStyle(color: Colors.white70, fontSize: 11)), onTap: () => _showStatus('Funzione non disponibile su Mifare Classic', error: true))),
              const SizedBox(height: 8),
              Card(color: AppColors.surface, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), child: ListTile(leading: const Icon(Icons.bug_report, color: AppColors.info), title: const Text('Test Ciclo Completo', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), subtitle: const Text('Scrive "TEST-..." poi rilegge per verifica', style: TextStyle(color: Colors.white70, fontSize: 11)), onTap: () async { _writeCtrl.text = 'TEST-${DateTime.now().millisecondsSinceEpoch}'; await _doWrite(); await Future.delayed(const Duration(seconds: 1)); await _doRead(); })),
            ]),
          ),
          // TASKS
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              Card(color: AppColors.surface, child: ListTile(leading: const Icon(Icons.assignment, color: AppColors.primary), title: const Text('Associa a Prodotto'), subtitle: const Text('Leggi tag e associa il suo UID a un prodotto esistente'), onTap: () => _showStatus('Usa Scanner → tag → Associa in Scheda Prodotto'))),
            ]),
          ),
        ]),
        if (_statusMsg != null)
          Positioned(bottom: 24, left: 16, right: 16, child: Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12), decoration: BoxDecoration(color: _isError ? AppColors.error : Colors.black87, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)), child: Text(_statusMsg!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold), textAlign: TextAlign.center))),
      ]),
    );
  }
}
