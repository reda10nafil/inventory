import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/library.dart';
import '../../providers/inventory_provider.dart';

class FoldersScreen extends ConsumerStatefulWidget {
  const FoldersScreen({super.key});

  @override
  ConsumerState<FoldersScreen> createState() => _FoldersScreenState();
}

class _FoldersScreenState extends ConsumerState<FoldersScreen> {
  void _showAddEditFolderDialog([LibraryModel? existingFolder]) {
    final isEditing = existingFolder != null;
    final nameController = TextEditingController(text: existingFolder?.name ?? '');
    String selectedIcon = existingFolder?.icon ?? 'folder';

    final availableIcons = [
      'folder',
      'inventory_2',
      'star',
      'favorite',
      'label',
      'category',
      'style',
      'shopping_bag',
    ];

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: AppColors.surface,
            title: Text(
              isEditing ? 'Modifica Cartella' : 'Nuova Cartella / Colezione',
              style: AppTypography.titleLarge,
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: nameController,
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'Nome Cartella (es. Collezione Inverno 2026)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Icona Identificativa:', style: AppTypography.labelMedium),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: availableIcons.map((iconName) {
                    final isSelected = selectedIcon == iconName;
                    return GestureDetector(
                      onTap: () => setDialogState(() => selectedIcon = iconName),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary : AppColors.surfaceElevated,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _getFolderIconData(iconName),
                          color: isSelected ? Colors.black : AppColors.textPrimary,
                          size: 24,
                        ),
                      ),
                    );
                  }).toList(),
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
                  final name = nameController.text.trim();
                  if (name.isEmpty) return;

                  if (isEditing) {
                    ref.read(inventoryProvider.notifier).updateLibrary(
                      existingFolder.copyWith(
                        name: name,
                        icon: selectedIcon,
                      ),
                    );
                  } else {
                    ref.read(inventoryProvider.notifier).addLibrary(
                      LibraryModel(
                        id: const Uuid().v4(),
                        name: name,
                        icon: selectedIcon,
                        fields: [],
                        createdAt: DateTime.now(),
                      ),
                    );
                  }

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

  void _deleteFolder(LibraryModel folder) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Elimina Cartella', style: AppTypography.titleLarge.copyWith(color: AppColors.error)),
        content: Text(
          'Eliminare la cartella "${folder.name}"? I prodotti in essa contenuti non verranno cancellati.',
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
              ref.read(inventoryProvider.notifier).deleteLibrary(folder.id);
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
    final inventory = ref.watch(inventoryProvider);
    final libraries = inventory.libraries;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Gestione Cartelle & Collezioni', style: AppTypography.titleMedium),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.black),
        label: Text('Nuova Cartella', style: AppTypography.buttonPrimary.copyWith(color: Colors.black)),
        onPressed: () => _showAddEditFolderDialog(),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: libraries.length,
        itemBuilder: (context, index) {
          final folder = libraries[index];
          final productCount = inventory.products
              .where((p) => p.libraryId == folder.id && p.deletedAt == null)
              .length;

          return Card(
            color: AppColors.surface,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppColors.border),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: CircleAvatar(
                backgroundColor: AppColors.primary.withAlpha(40),
                child: Icon(_getFolderIconData(folder.icon), color: AppColors.accentGold),
              ),
              title: Text(folder.name, style: AppTypography.titleMedium),
              subtitle: Text('Prodotti catalogati: $productCount', style: AppTypography.bodySmall),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, color: AppColors.textSecondary),
                    onPressed: () => _showAddEditFolderDialog(folder),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: AppColors.error),
                    onPressed: () => _deleteFolder(folder),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  IconData _getFolderIconData(String iconName) {
    switch (iconName) {
      case 'inventory':
      case 'inventory_2':
        return Icons.inventory_2;
      case 'folder':
        return Icons.folder;
      case 'star':
        return Icons.star;
      case 'favorite':
        return Icons.favorite;
      case 'label':
        return Icons.label;
      case 'category':
        return Icons.category;
      case 'style':
        return Icons.style;
      case 'shopping_bag':
        return Icons.shopping_bag;
      default:
        return Icons.folder;
    }
  }
}
