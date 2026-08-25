import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/product.dart';
import '../models/location.dart';
import '../models/timeline_event.dart';
import '../providers/inventory_provider.dart';
import '../providers/locations_provider.dart';
import '../providers/custom_fields_provider.dart';
import '../providers/gs1_config_provider.dart';
import '../services/nfc_service.dart';
import '../services/sound_service.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  final String productId;

  const ProductDetailScreen({
    super.key,
    required this.productId,
  });

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int _currentImageIndex = 0;
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _shareProduct(Product product, Location? location) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Condividi Scheda Prodotto', style: AppTypography.titleLarge),
            const SizedBox(height: 8),
            Text('Scegli il formato del testo da inviare', style: AppTypography.bodyMedium),
            const SizedBox(height: 20),
            ListTile(
              leading: const Icon(Icons.person_outline, color: AppColors.accentGold),
              title: Text('Formato Cliente', style: AppTypography.titleMedium),
              subtitle: Text('Include descrizione, misure e prezzo vendita', style: AppTypography.bodySmall),
              onTap: () {
                Navigator.pop(context);
                final text = _generateClientText(product, location);
                Share.share(text);
              },
            ),
            const Divider(color: AppColors.border),
            ListTile(
              leading: const Icon(Icons.business_center_outlined, color: AppColors.accentGold),
              title: Text('Formato Tecnico / Pro', style: AppTypography.titleMedium),
              subtitle: Text('Include prezzi di costo, SKU, e dettagli inventario', style: AppTypography.bodySmall),
              onTap: () {
                Navigator.pop(context);
                final text = _generateProfessionalText(product, location);
                Share.share(text);
              },
            ),
          ],
        ),
      ),
    );
  }

  String _generateClientText(Product product, Location? location) {
    StringBuffer sb = StringBuffer();
    sb.writeln('✨ ${product.furType.toUpperCase()} - SKU: ${product.sku}');
    sb.writeln();
    if (product.length != null || product.width != null || product.weight != null) {
      sb.writeln('📐 MISURE:');
      if (product.length != null) sb.writeln('   • Lunghezza: ${product.length} cm');
      if (product.width != null) sb.writeln('   • Larghezza: ${product.width} cm');
      if (product.weight != null) sb.writeln('   • Peso: ${product.weight} kg');
      sb.writeln();
    }
    if (product.sellPrice != null) {
      sb.writeln('💰 PREZZO: €${product.sellPrice!.toStringAsFixed(2)}');
    }
    if (product.technicalNotes != null && product.technicalNotes!.isNotEmpty) {
      sb.writeln('📝 ${product.technicalNotes}');
    } else {
      sb.writeln('📝 Pelliccia di alta sartoria');
    }
    sb.writeln();
    sb.writeln('📍 Posizione: ${location?.label ?? product.location}');
    return sb.toString();
  }

  String _generateProfessionalText(Product product, Location? location) {
    StringBuffer sb = StringBuffer();
    sb.writeln('╔════════════════════════════════════════╗');
    sb.writeln('║   SCHEDA TECNICA PRODOTTO PELLICCIA   ║');
    sb.writeln('╚════════════════════════════════════════╝');
    sb.writeln();
    sb.writeln('SKU: ${product.sku}');
    sb.writeln('ID: ${product.id}');
    sb.writeln('TIPO: ${product.furType}');
    sb.writeln('STATO: ${product.status == ProductStatusType.available ? 'Disponibile' : 'Venduto'}');
    sb.writeln('POSIZIONE: ${location?.label ?? product.location}');
    sb.writeln('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    sb.writeln('📐 MISURE:');
    sb.writeln('   • Lunghezza: ${product.length ?? 'N/D'} cm');
    sb.writeln('   • Larghezza: ${product.width ?? 'N/D'} cm');
    sb.writeln('   • Peso: ${product.weight ?? 'N/D'} kg');
    sb.writeln();
    sb.writeln('💰 ANALISI PREZZI:');
    sb.writeln('   • Prezzo Acquisto: €${product.purchasePrice?.toStringAsFixed(2) ?? 'N/D'}');
    sb.writeln('   • Prezzo Vendita: €${product.sellPrice?.toStringAsFixed(2) ?? 'N/D'}');
    if (product.purchasePrice != null && product.sellPrice != null) {
      final margin = product.sellPrice! - product.purchasePrice!;
      final marginPct = (margin / product.purchasePrice!) * 100;
      sb.writeln('   • Margine: €${margin.toStringAsFixed(2)} (${marginPct.toStringAsFixed(1)}%)');
    }
    sb.writeln();
    sb.writeln('🏷 TAG & CODICI:');
    sb.writeln('   • Barcode/QR: ${product.barcode ?? product.sku}');
    sb.writeln('   • NFC Tag: ${product.nfcTag ?? 'Non associato'}');
    sb.writeln('   • GS1 Digital Link: ${product.gs1DigitalLink ?? 'N/D'}');
    return sb.toString();
  }

  void _showMoveDialog(Product product, List<Location> locations) {
    String selectedLocId = product.location;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Sposta Prodotto', style: AppTypography.titleLarge),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Seleziona la nuova posizione fisica per SKU ${product.sku}:', style: AppTypography.bodySmall),
            const SizedBox(height: 16),
            StatefulBuilder(
              builder: (context, setDialogState) {
                return DropdownButtonFormField<String>(
                  value: selectedLocId,
                  dropdownColor: AppColors.surfaceElevated,
                  decoration: const InputDecoration(
                    labelText: 'Posizione Target',
                    border: OutlineInputBorder(),
                  ),
                  items: locations.map((loc) {
                    return DropdownMenuItem<String>(
                      value: loc.id,
                      child: Row(
                        children: [
                          Icon(Icons.location_on, color: loc.color, size: 18),
                          const SizedBox(width: 8),
                          Text(loc.label, style: AppTypography.bodyMedium),
                        ],
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setDialogState(() => selectedLocId = val);
                  },
                );
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annulla'),
          ),
          ElevatedButton(
            onPressed: () {
              ref.read(inventoryProvider.notifier).moveProduct(product.id, selectedLocId);
              Navigator.pop(context);
              SoundService.playBeep();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Prodotto spostato con successo!')),
              );
            },
            child: const Text('Conferma Spostamento'),
          ),
        ],
      ),
    );
  }

  void _toggleSellStatus(Product product) {
    final isAvailable = product.status == ProductStatusType.available;
    final actionName = isAvailable ? 'Vendi' : 'Ripristina';
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('$actionName Prodotto', style: AppTypography.titleLarge),
        content: Text(
          isAvailable
              ? 'Confermi di voler contrassegnare questo capo come VENDUTO?'
              : 'Ripristinare questo capo nello stato DISPONIBILE?',
          style: AppTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annulla'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: isAvailable ? AppColors.success : AppColors.accentGold,
            ),
            onPressed: () {
              if (isAvailable) {
                ref.read(inventoryProvider.notifier).sellProduct(product.id);
              } else {
                ref.read(inventoryProvider.notifier).updateProduct(
                  product.copyWith(status: ProductStatusType.available),
                );
              }
              Navigator.pop(context);
              SoundService.playBeep();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Stato prodotto aggiornato a: ${isAvailable ? 'Venduto' : 'Disponibile'}')),
              );
            },
            child: Text(actionName),
          ),
        ],
      ),
    );
  }

  void _showNfcWriterModal(Product product) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Icon(Icons.nfc, size: 64, color: AppColors.accentGold),
            const SizedBox(height: 16),
            Text('Scrivi Tag NFC', style: AppTypography.titleLarge),
            const SizedBox(height: 8),
            Text(
              'Avvicina il tag NFC al retro dello smartphone per associare lo SKU ${product.sku}.',
              textAlign: TextAlign.center,
              style: AppTypography.bodySmall,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              icon: const Icon(Icons.sensors),
              label: const Text('Avvia Scrittura NFC'),
              onPressed: () async {
                final success = await NfcService().writeNfcTag(product.id);
                if (mounted) {
                  Navigator.pop(context);
                  if (success) {
                    ref.read(inventoryProvider.notifier).associateNfcTag(product.id, product.id);
                    SoundService.playSuccessBeep();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Tag NFC scritto e associato con successo!')),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Errore o operazione NFC annullata')),
                    );
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showQRModal(Product product) {
    final gs1Config = ref.read(gs1ConfigProvider);
    final link = product.gs1DigitalLink ?? '${gs1Config.domain}/${product.sku}';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Codice QR & GS1 Digital Link', style: AppTypography.titleLarge),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: QrImageView(
                data: link,
                version: QrVersions.auto,
                size: 200.0,
              ),
            ),
            const SizedBox(height: 16),
            Text('SKU: ${product.sku}', style: AppTypography.titleMedium),
            const SizedBox(height: 4),
            SelectableText(
              link,
              style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.copy),
                  label: const Text('Copia Link'),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: link));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Link GS1 copiato negli appunti!')),
                    );
                  },
                ),
                ElevatedButton.icon(
                  icon: const Icon(Icons.share),
                  label: const Text('Condividi'),
                  onPressed: () {
                    Share.share('GS1 Digital Link: $link');
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _deleteProduct(Product product) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Elimina Prodotto', style: AppTypography.titleLarge.copyWith(color: AppColors.error)),
        content: Text(
          'Sei sicuro di voler eliminare lo SKU ${product.sku}? L\'elemento verrà spostato nel cestino.',
          style: AppTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annulla'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              ref.read(inventoryProvider.notifier).deleteProduct(product.id);
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Go back to product list
              SoundService.playBeep();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Prodotto spostato nel cestino')),
              );
            },
            child: const Text('Elimina'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final inventory = ref.watch(inventoryProvider);
    final locations = ref.watch(locationsProvider);
    final customFields = ref.watch(customFieldsProvider);

    final product = inventory.products.firstWhere(
      (p) => p.id == widget.productId,
      orElse: () => Product(
        id: '',
        sku: 'N/A',
        furType: 'N/A',
        location: '',
        createdAt: DateTime.now(),
      ),
    );

    if (product.id.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Prodotto Non Trovato')),
        body: const Center(
          child: Text('Il prodotto cercato non esiste o è stato eliminato.'),
        ),
      );
    }

    final location = locations.firstWhere(
      (l) => l.id == product.location,
      orElse: () => Location(id: product.location, label: product.location),
    );

    final timelineEvents = inventory.timeline
        .where((e) => e.productId == product.id)
        .toList()
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

    final images = product.images.isNotEmpty ? product.images : ['assets/images/logo.png'];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Custom App Bar with Hero Image Slider
          SliverAppBar(
            expandedHeight: 340.0,
            floating: false,
            pinned: true,
            backgroundColor: AppColors.surface,
            actions: [
              IconButton(
                icon: const Icon(Icons.share, color: AppColors.accentGold),
                onPressed: () => _shareProduct(product, location),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: AppColors.error),
                onPressed: () => _deleteProduct(product),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  PageView.builder(
                    controller: _pageController,
                    itemCount: images.length,
                    onPageChanged: (index) {
                      setState(() => _currentImageIndex = index);
                    },
                    itemBuilder: (context, index) {
                      final imgPath = images[index];
                      if (imgPath.startsWith('assets/')) {
                        return Image.asset(imgPath, fit: BoxFit.cover);
                      }
                      return Image.network(
                        imgPath,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: AppColors.surfaceElevated,
                          child: const Icon(Icons.image_not_supported, size: 64, color: AppColors.textMuted),
                        ),
                      );
                    },
                  ),
                  // Gradient Overlay
                  Positioned.fill(
                    child: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black38,
                            Colors.transparent,
                            AppColors.background,
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Image Counter Indicator
                  if (images.length > 1)
                    Positioned(
                      bottom: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xB3000000),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          '${_currentImageIndex + 1} / ${images.length}',
                          style: AppTypography.labelMedium.copyWith(color: AppColors.textPrimary),
                        ),
                      ),
                    ),
                  // Fragile & Status Badges
                  Positioned(
                    bottom: 16,
                    left: 16,
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: product.status == ProductStatusType.available ? AppColors.success : AppColors.error,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            product.status == ProductStatusType.available ? 'DISPONIBILE' : 'VENDUTO',
                            style: AppTypography.labelSmall.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                        if (product.isFragile == true) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.warning,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.warning_amber_rounded, size: 14, color: Colors.black),
                                SizedBox(width: 4),
                                Text('DELICATO', style: TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Content Body
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title & SKU Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product.furType.toUpperCase(),
                              style: AppTypography.headlineMedium.copyWith(color: AppColors.accentGold),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'SKU: ${product.sku}',
                              style: AppTypography.titleMedium.copyWith(color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      if (product.sellPrice != null)
                        Text(
                          '€${product.sellPrice!.toStringAsFixed(2)}',
                          style: AppTypography.headlineSmall.copyWith(color: AppColors.accentGoldLight),
                        ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Action Buttons Row
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.swap_horiz),
                          label: const Text('Sposta'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.surfaceElevated,
                            foregroundColor: AppColors.accentGold,
                          ),
                          onPressed: () => _showMoveDialog(product, locations),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          icon: Icon(product.status == ProductStatusType.available ? Icons.shopping_bag_outlined : Icons.undo),
                          label: Text(product.status == ProductStatusType.available ? 'Vendi' : 'Ripristina'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: product.status == ProductStatusType.available ? AppColors.success : AppColors.surfaceElevated,
                            foregroundColor: Colors.white,
                          ),
                          onPressed: () => _toggleSellStatus(product),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.qr_code, color: AppColors.accentGold),
                        style: IconButton.styleFrom(backgroundColor: AppColors.surfaceElevated),
                        onPressed: () => _showQRModal(product),
                      ),
                      IconButton(
                        icon: const Icon(Icons.nfc, color: AppColors.accentGold),
                        style: IconButton.styleFrom(backgroundColor: AppColors.surfaceElevated),
                        onPressed: () => _showNfcWriterModal(product),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),
                  const Divider(color: AppColors.border),
                  const SizedBox(height: 16),

                  // Section 1: Specifiche Tecniche & Misure
                  _buildSectionHeader('SPECIFICHE & MISURE', Icons.straighten),
                  const SizedBox(height: 12),
                  _buildInfoGrid([
                    _InfoItem('Lunghezza', product.length != null ? '${product.length} cm' : 'N/D'),
                    _InfoItem('Larghezza', product.width != null ? '${product.width} cm' : 'N/D'),
                    _InfoItem('Peso', product.weight != null ? '${product.weight} kg' : 'N/D'),
                    _InfoItem('Prezzo Acquisto', product.purchasePrice != null ? '€${product.purchasePrice!.toStringAsFixed(2)}' : 'N/D'),
                    _InfoItem('Prezzo Vendita', product.sellPrice != null ? '€${product.sellPrice!.toStringAsFixed(2)}' : 'N/D'),
                    _InfoItem('Posizione', location.label),
                  ]),

                  if (product.technicalNotes != null && product.technicalNotes!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text('Note Tecniche:', style: AppTypography.labelMedium.copyWith(color: AppColors.textSecondary)),
                    const SizedBox(height: 4),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(product.technicalNotes!, style: AppTypography.bodySmall),
                    ),
                  ],

                  const SizedBox(height: 24),
                  const Divider(color: AppColors.border),
                  const SizedBox(height: 16),

                  // Section 2: Campi Personalizzati
                  if (customFields.isNotEmpty && product.customData.isNotEmpty) ...[
                    _buildSectionHeader('CAMPI PERSONALIZZATI', Icons.tune),
                    const SizedBox(height: 12),
                    ...customFields.map((field) {
                      final value = product.customFields[field.id];
                      if (value == null || value.toString().isEmpty) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(field.name, style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary)),
                            Text(value.toString(), style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 24),
                    const Divider(color: AppColors.border),
                    const SizedBox(height: 16),
                  ],

                  // Section 3: Cronologia Timeline
                  _buildSectionHeader('CRONOLOGIA ATTIVITÀ', Icons.history),
                  const SizedBox(height: 12),
                  if (timelineEvents.isEmpty)
                    Text('Nessun evento registrato per questo capo.', style: AppTypography.bodySmall)
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: timelineEvents.length,
                      itemBuilder: (context, index) {
                        final event = timelineEvents[index];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                            backgroundColor: AppColors.surfaceElevated,
                            child: Icon(_getEventIcon(event.type), size: 18, color: AppColors.accentGold),
                          ),
                          title: Text(_getEventTitle(event), style: AppTypography.bodyMedium),
                          subtitle: Text(
                            '${event.timestamp.day}/${event.timestamp.month}/${event.timestamp.year} ${event.timestamp.hour.toString().padLeft(2, '0')}:${event.timestamp.minute.toString().padLeft(2, '0')}',
                            style: AppTypography.bodySmall,
                          ),
                        );
                      },
                    ),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.accentGold),
        const SizedBox(width: 8),
        Text(
          title,
          style: AppTypography.titleMedium.copyWith(
            color: AppColors.accentGold,
            letterSpacing: 1.2,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoGrid(List<_InfoItem> items) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: items.map((item) {
        return Container(
          width: 160,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.label, style: AppTypography.labelSmall.copyWith(color: AppColors.textSecondary)),
              const SizedBox(height: 4),
              Text(
                item.value,
                style: AppTypography.titleMedium.copyWith(color: AppColors.textPrimary),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  String _getEventTitle(TimelineEvent event) {
    switch (event.type) {
      case TimelineEventType.created:
        return 'Prodotto inserito a inventario';
      case TimelineEventType.moved:
        return 'Spostato: ${event.details.from ?? "N/D"} → ${event.details.to ?? "N/D"}';
      case TimelineEventType.sold:
        return 'Venduto ${event.details.finalPrice != null ? "(€${event.details.finalPrice!.toStringAsFixed(2)})" : ""}';
      case TimelineEventType.modified:
        return event.details.changes?.join(', ') ?? 'Modifica dati';
      case TimelineEventType.deleted:
        return 'Spostato nel cestino';
      case TimelineEventType.restored:
        return 'Ripristinato dal cestino';
      case TimelineEventType.scanned:
        return 'Scansione effettuata';
      case TimelineEventType.photoAdded:
        return 'Foto aggiornate';
    }
  }

  IconData _getEventIcon(TimelineEventType type) {
    switch (type) {
      case TimelineEventType.created:
        return Icons.add_circle_outline;
      case TimelineEventType.moved:
        return Icons.swap_horiz;
      case TimelineEventType.sold:
        return Icons.shopping_bag_outlined;
      case TimelineEventType.modified:
        return Icons.edit_note;
      case TimelineEventType.deleted:
        return Icons.delete_outline;
      case TimelineEventType.restored:
        return Icons.restore;
      case TimelineEventType.scanned:
        return Icons.qr_code_scanner;
      case TimelineEventType.photoAdded:
        return Icons.camera_alt_outlined;
    }
  }
}

class _InfoItem {
  final String label;
  final String value;
  _InfoItem(this.label, this.value);
}
