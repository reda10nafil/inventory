import 'package:flutter/material.dart';
import '../constants/theme.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: true,
      child: Container(
        color: AppTheme.background,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('Impostazioni', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: AppTheme.textPrimary))),
            _sectionTitle('CONFIGURAZIONE HARDWARE'),
            GestureDetector(onTap: () => Navigator.pushNamed(context, '/gs1-config'), child: _settingRow('GS1 Digital Link', 'Configura lo standard URL per i prodotti', Icons.link, const Color(0xFFF59E0B))),
            _settingRow('Scanner & NFC', 'Preferenze lettura/scrittura hardware', Icons.settings_cell, const Color(0xFF3B82F6)),
            _sectionTitle('GESTIONE INVENTARIO'),
            _settingRow('Gestisci Cartelle', 'Crea e organizza librerie personalizzate', Icons.folder, const Color(0xFF3B82F6)),
            _settingRow('Campi Personalizzati', 'Aggiungi e riordina campi prodotto', Icons.tune, const Color(0xFF10B981)),
            _settingRow('Configura Layout Aggiungi', 'Personalizza ordine e dimensione campi', Icons.dashboard_customize, const Color(0xFF8B5CF6)),
            _settingRow('Cestino', 'Recupera o elimina prodotti cancellati', Icons.delete, AppTheme.error),
            _settingRow('Gestisci Posizioni', 'Modifica locazioni disponibili', Icons.location_on, AppTheme.primary, iconColor: Colors.black),
            _sectionTitle('CONDIVISIONE'),
            _settingRow('Configurazione Condivisione', 'Personalizza info condivise Cliente/Professionista', Icons.share, const Color(0xFF06B6D4)),
            _sectionTitle('ALERT E NOTIFICHE'),
            _settingRow('Alert Prodotti Dormienti', 'Soglia: 6 mesi senza movimenti', Icons.notifications, const Color(0xFFF59E0B)),
            _settingRow('Suggerimenti AI', 'Consigli automatici per prodotti in magazzino', Icons.auto_awesome, const Color(0xFF8B5CF6)),
            _sectionTitle('DATI E BACKUP'),
            _settingRow('Esporta Inventario', 'Scarica CSV o Excel completo', Icons.file_download, const Color(0xFF10B981)),
            _settingRow('Backup Cloud', 'Sincronizzazione automatica (richiede Supabase)', Icons.cloud_upload, const Color(0xFF3B82F6)),
            _sectionTitle('TEAM E ACCESSO'),
            _settingRow('Accesso Multi-Utente', 'Gestisci permessi team (Pro)', Icons.people, const Color(0xFF8B5CF6)),
            _sectionTitle('INFO'),
            _buildInfoCard(),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) => Padding(
    padding: const EdgeInsets.only(top: 24, bottom: 12),
    child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: AppTheme.textSecondary)),
  );

  Widget _settingRow(String title, String description, IconData icon, Color bgColor, {Color? iconColor}) => Container(
    margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
    child: Row(children: [
      Container(width: 48, height: 48, decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)), child: Icon(icon, size: 24, color: iconColor ?? Colors.white)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)), Text(description, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary))])),
      const Icon(Icons.chevron_right, size: 24, color: AppTheme.textSecondary),
    ]),
  );

  Widget _settingRow2(String title, String description, IconData icon, Color bgColor, {Color? iconColor}) => Container(
    margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)),
    child: Row(children: [
      Container(width: 48, height: 48, decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(AppTheme.radiusMedium)), child: Icon(icon, size: 24, color: iconColor ?? Colors.white)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)), Text(description, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary))])),
    ]),
  );

  Widget _buildInfoCard() => Container(
    width: double.infinity, padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('FurInventory Pro', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      const Text('Versione 1.0.0', style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
      const SizedBox(height: 12),
      const Text('Sistema di gestione inventario professionale per pellicce di lusso', style: TextStyle(fontSize: 14, color: AppTheme.textPrimary, height: 1.4)),
      const Divider(color: AppTheme.border, height: 32),
      const Text('DATABASE LOCALE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: AppTheme.textSecondary)),
      const SizedBox(height: 8),
      const Text('I dati sono salvati localmente sul dispositivo. Abilita il backup cloud per sincronizzare tra dispositivi.', style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4)),
    ]),
  );
}
