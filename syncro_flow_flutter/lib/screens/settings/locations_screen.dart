import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/location.dart';
import '../../providers/locations_provider.dart';
import '../../providers/inventory_provider.dart';
import '../../services/sound_service.dart';

class LocationsScreen extends ConsumerStatefulWidget {
  const LocationsScreen({super.key});

  @override
  ConsumerState<LocationsScreen> createState() => _LocationsScreenState();
}

class _LocationsScreenState extends ConsumerState<LocationsScreen> {
  void _showAddEditDialog([Location? existingLocation]) {
    final isEditing = existingLocation != null;
    final labelController = TextEditingController(text: existingLocation?.label ?? '');
    final capacityController = TextEditingController(text: existingLocation?.capacity?.toString() ?? '');
    final barcodeController = TextEditingController(text: existingLocation?.barcode ?? '');
    Color selectedColor = existingLocation?.color ?? AppColors.primary;

    final availableColors = [
      AppColors.primary,
      const Color(0xFF3B82F6),
      const Color(0xFF10B981),
      const Color(0xFF8B5CF6),
      const Color(0xFFEF4444),
      const Color(0xFFF59E0B),
      const Color(0xFFEC4899),
    ];

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: AppColors.surface,
            title: Text(
              isEditing ? 'Modifica Posizione' : 'Nuova Posizione',
              style: AppTypography.titleLarge,
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: labelController,
                    autofocus: true,
                    decoration: const InputDecoration(
                      labelText: 'Nome Posizione (es. Vetrina Principale)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: capacityController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Capacità Massima (opzionale)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: barcodeController,
                    decoration: const InputDecoration(
                      labelText: 'Codice a Barre / QR (opzionale)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Colore Identificativo:', style: AppTypography.labelMedium),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: availableColors.map((color) {
                      final isSelected = color.value == selectedColor.value;
                      return GestureDetector(
                        onTap: () => setDialogState(() => selectedColor = color),
                        child: CircleAvatar(
                          backgroundColor: color,
                          radius: 16,
                          child: isSelected ? const Icon(Icons.check, color: Colors.white, size: 16) : null,
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Annulla'),
              ),
              ElevatedButton(
                onPressed: () {
                  final label = labelController.text.trim();
                  if (label.isEmpty) return;

                  final capacity = int.tryParse(capacityController.text.trim());
                  final barcode = barcodeController.text.trim().isNotEmpty ? barcodeController.text.trim() : null;

                  if (isEditing) {
                    ref.read(locationsProvider.notifier).updateLocation(
                      existingLocation.id,
                      existingLocation.copyWith(
                        label: label,
                        color: selectedColor,
                        capacity: capacity,
                        barcode: barcode,
                      ),
                    );
                  } else {
                    ref.read(locationsProvider.notifier).addLocation(
                      Location(
                        id: const Uuid().v4(),
                        label: label,
                        color: selectedColor,
                        capacity: capacity,
                        barcode: barcode,
                      ),
                    );
                  }

                  SoundService.playBeep();
                  Navigator.pop(context);
                },
                child: Text(isEditing ? 'Salva' : 'Crea'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _deleteLocation(Location location) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Elimina Posizione', style: AppTypography.titleLarge.copyWith(color: AppColors.error)),
        content: Text(
          'Sei sicuro di voler eliminare la posizione "${location.label}"?',
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
              ref.read(locationsProvider.notifier).deleteLocation(location.id);
              SoundService.playBeep();
              Navigator.pop(context);
            },
            child: const Text('Elimina'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locations = ref.watch(locationsProvider);
    final inventory = ref.watch(inventoryProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Gestione Posizioni', style: AppTypography.titleMedium),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.accentGold),
            tooltip: 'Ripristina Posizioni Default',
            onPressed: () {
              ref.read(locationsProvider.notifier).resetToDefaults();
              SoundService.playBeep();
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.black),
        label: Text('Nuova Posizione', style: AppTypography.buttonPrimary.copyWith(color: Colors.black)),
        onPressed: () => _showAddEditDialog(),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: locations.length,
        itemBuilder: (context, index) {
          final location = locations[index];
          final productCount = inventory.products
              .where((p) => p.location == location.id && p.deletedAt == null)
              .length;

          return Card(
            color: AppColors.surface,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: location.color.withAlpha(100), width: 1.5),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: CircleAvatar(
                backgroundColor: location.color.withAlpha(40),
                child: Icon(Icons.location_on, color: location.color),
              ),
              title: Text(location.label, style: AppTypography.titleMedium),
              subtitle: Text(
                'Capi presenti: $productCount ${location.capacity != null ? "/ Cap. max ${location.capacity}" : ""}',
                style: AppTypography.bodySmall,
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, color: AppColors.textSecondary),
                    onPressed: () => _showAddEditDialog(location),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: AppColors.error),
                    onPressed: () => _deleteLocation(location),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
