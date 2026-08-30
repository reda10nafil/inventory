import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../providers/inventory_provider.dart';
import '../../widgets/web_download_helper.dart' if (dart.library.html) '../../widgets/web_download_helper_web.dart';

class ShareScreen extends ConsumerWidget {
  const ShareScreen({super.key});

  void _shareSummaryText(BuildContext context, dynamic availableProducts) {
    final StringBuffer sb = StringBuffer();
    sb.writeln('📦 CATALOGO INVENTARIO SYNCRO FLOW');
    sb.writeln('Totale capi disponibili: ${availableProducts.length}');
    sb.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (final p in availableProducts) {
      sb.writeln('• ${p.furType.toUpperCase()} (SKU: ${p.sku}) - Posizione: ${p.location} - €${p.sellPrice?.toStringAsFixed(2) ?? "N/D"}');
    }
    SharePlus.instance.share(ShareParams(text: sb.toString(), subject: 'Catalogo Syncro Flow'));
  }

  void _shareJsonBackup(BuildContext context, WidgetRef ref) async {
    final inventory = ref.read(inventoryProvider);
    final backupData = {
      'version': '1.0',
      'exportedAt': DateTime.now().toIso8601String(),
      'products': inventory.products.map((p) => p.toJson()).toList(),
      'timeline': inventory.timeline.map((t) => t.toJson()).toList(),
      'libraries': inventory.libraries.map((l) => l.toJson()).toList(),
    };

    final jsonString = const JsonEncoder.withIndent('  ').convert(backupData);
    final filename = 'SyncroFlow_Backup_${DateTime.now().millisecondsSinceEpoch}.json';
    if (kIsWeb) {
      await downloadJsonWeb(jsonString, filename);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Backup scaricato: $filename'), backgroundColor: AppColors.success),
        );
      }
    } else {
      SharePlus.instance.share(ShareParams(text: jsonString, subject: filename));
    }
  }

  void _importJsonBackup(BuildContext context, WidgetRef ref) async {
    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['json'],
      );
      if (files == null || files.isEmpty) return;
      final file = files.first;
      final bytes = await file.readAsBytes();
      if (bytes == null || bytes.isEmpty) {
        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Impossibile leggere il file'), backgroundColor: AppColors.error));
        return;
      }
      final jsonString = utf8.decode(bytes);
      final Map<String, dynamic> data = jsonDecode(jsonString) as Map<String, dynamic>;
      await ref.read(inventoryProvider.notifier).importBackup(data);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Backup importato: ${(data['products'] as List?)?.length ?? 0} prodotti'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Errore import: $e'), backgroundColor: AppColors.error));
    }
  }

  void _printPdfReport(BuildContext context, dynamic availableProducts) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context pwContext) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Header(
                level: 0,
                child: pw.Text('SYNCRO FLOW - Report Catalogo Inventario', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
              ),
              pw.SizedBox(height: 12),
              pw.Text('Totale capi censiti: ${availableProducts.length}'),
              pw.SizedBox(height: 16),
              pw.TableHelper.fromTextArray(
                headers: ['SKU', 'Tipo Pelliccia', 'Posizione', 'Stato', 'Prezzo'],
                data: availableProducts.map<List<String>>((p) {
                  return [
                    p.sku,
                    p.furType.toUpperCase(),
                    p.location,
                    p.status.name,
                    p.sellPrice != null ? '€ ${p.sellPrice!.toStringAsFixed(2)}' : '-',
                  ];
                }).toList(),
              ),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inventory = ref.watch(inventoryProvider);
    final availableProducts = inventory.products.where((p) => p.deletedAt == null).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Esporta & Condividi Catalogo', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Card(
            color: AppColors.surface,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(
                backgroundColor: AppColors.primary,
                child: Icon(Icons.share, color: Colors.black),
              ),
              title: Text('Condividi Report Testuale', style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold)),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text(
                  'Genera un testo di riepilogo per ${availableProducts.length} capi disponibili da inviare via WhatsApp / Email',
                  style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                ),
              ),
              onTap: () => _shareSummaryText(context, availableProducts),
            ),
          ),

          Card(
            color: AppColors.surface,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(
                backgroundColor: AppColors.surfaceElevated,
                child: Icon(Icons.print, color: AppColors.accentGold),
              ),
              title: Text('Stampa PDF / Report Catalogo', style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold)),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text('Genera documento PDF o invia a stampante di rete', style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
              ),
              onTap: () => _printPdfReport(context, availableProducts),
            ),
          ),

          Card(
            color: AppColors.surface,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(
                backgroundColor: AppColors.surfaceElevated,
                child: Icon(Icons.file_download_outlined, color: AppColors.accentGold),
              ),
              title: Text('Esporta Backup JSON', style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold)),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text(kIsWeb ? 'Scarica file JSON (download browser)' : 'Scarica file di backup strutturato JSON di prodotti e timeline', style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
              ),
              onTap: () => _shareJsonBackup(context, ref),
            ),
          ),
          Card(
            color: AppColors.surface,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(
                backgroundColor: AppColors.success,
                child: Icon(Icons.file_upload_outlined, color: Colors.white),
              ),
              title: Text('Importa Backup JSON', style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold)),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text('Ripristina catalogo da file JSON precedentemente esportato', style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
              ),
              onTap: () => _importJsonBackup(context, ref),
            ),
          ),
        ],
      ),
    );
  }
}
