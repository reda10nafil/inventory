import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../services/sound_service.dart';

class SectorTemplatesScreen extends ConsumerWidget {
  const SectorTemplatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final templates = [
      {
        'title': 'Pellicceria Alta Moda & Luxury',
        'desc': 'Predefinito con campi: Tipo Pelle, Lunghezza (cm), Larghezza (cm), Peso (kg), Certificato CITES, Anno Collezione',
        'icon': Icons.check_circle_outline,
        'active': true,
      },
      {
        'title': 'Pelletteria & Borse Artigianali',
        'desc': 'Campi: Tipo Cuoio, Dimensioni, Hardware/Cerniere, Colore Tintura, Codice Articolo',
        'icon': Icons.business_center_outlined,
        'active': false,
      },
      {
        'title': 'Calzature & Scarpe di Lusso',
        'desc': 'Campi: Taglia/Numerazione, Materiale Tomaia, Suola, Paese Origine',
        'icon': Icons.category_outlined,
        'active': false,
      },
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Template di Settore', style: AppTypography.titleMedium),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: templates.length,
        itemBuilder: (context, index) {
          final t = templates[index];
          final isActive = t['active'] as bool;

          return Card(
            color: AppColors.surface,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: isActive ? AppColors.accentGold : AppColors.border,
                width: isActive ? 2 : 1,
              ),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: Icon(
                t['icon'] as IconData,
                size: 32,
                color: isActive ? AppColors.accentGold : AppColors.textMuted,
              ),
              title: Text(
                t['title'] as String,
                style: AppTypography.titleMedium.copyWith(
                  color: isActive ? AppColors.accentGold : AppColors.textPrimary,
                ),
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 6.0),
                child: Text(t['desc'] as String, style: AppTypography.bodySmall),
              ),
              trailing: isActive
                  ? Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.accentGold,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text('ATTIVO', style: AppTypography.labelSmall.copyWith(color: Colors.black, fontWeight: FontWeight.bold)),
                    )
                  : ElevatedButton(
                      onPressed: () {
                        SoundService.playBeep();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Template "${t['title']}" applicato con successo!')),
                        );
                      },
                      child: const Text('Applica'),
                    ),
            ),
          );
        },
      ),
    );
  }
}
