import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/theme.dart';
import '../models/models.dart';
import '../providers/inventory_provider.dart';

class AutomationsScreen extends StatelessWidget {
  const AutomationsScreen({super.key});

  static const List<_BuiltinAutomation> _builtins = [
    _BuiltinAutomation(id: 'batch_move', title: 'Spostamento Rapido', description: 'Sposta velocemente una serie di prodotti in una nuova posizione.', icon: Icons.move_to_inbox, color: Color(0xFF3B82F6)),
    _BuiltinAutomation(id: 'scan_sell', title: 'Vendita Flash', description: 'Segna come venduti i prodotti scansionati in sequenza.', icon: Icons.shopping_cart_checkout, color: Color(0xFF10B981)),
    _BuiltinAutomation(id: 'audit', title: 'Audit Posizione', description: 'Verifica la corrispondenza tra fisico e digitale di uno scaffale.', icon: Icons.fact_check, color: Color(0xFFF59E0B)),
    _BuiltinAutomation(id: 'tagging', title: 'Tagging di Massa', description: 'Applica note o etichette a un gruppo di prodotti.', icon: Icons.label, color: Color(0xFF8B5CF6)),
  ];

  @override
  Widget build(BuildContext context) {
    final inventory = context.watch<InventoryProvider>();
    return SafeArea(
      top: true,
      child: Container(
        color: AppTheme.background,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 20),
          child: Column(children: [
            _buildHeader(context),
            _buildCustomAutomations(context, inventory.automations),
            _buildBuiltinTemplates(context),
            _buildProTip(),
          ]),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding, vertical: 16),
    decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppTheme.border))),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      const Text('Centro Automazioni', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
      Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.15), borderRadius: BorderRadius.circular(AppTheme.radiusMedium)), child: const Icon(Icons.qr_code_scanner, size: 24, color: AppTheme.primary)),
    ]),
  );

  Widget _buildCustomAutomations(BuildContext context, List<Automation> automations) => Padding(
    padding: const EdgeInsets.all(AppTheme.screenPadding),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        const Text('LE MIE AUTOMAZIONI', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1)),
        GestureDetector(onTap: () => _showComingSoon(context, 'Creazione automazione'), child: Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8), decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(AppTheme.radiusFull)), child: Row(mainAxisSize: MainAxisSize.min, children: const [Icon(Icons.add, size: 20, color: Colors.white), SizedBox(width: 4), Text('Crea Nuova', style: TextStyle(color: Colors.black, fontWeight: FontWeight.w700, fontSize: 13))]))),
      ]),
      const SizedBox(height: 16),
      if (automations.isEmpty)
        GestureDetector(onTap: () => _showComingSoon(context, 'Creazione automazione'), child: Container(width: double.infinity, padding: const EdgeInsets.all(32), decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border.all(color: AppTheme.border, width: 2)), child: Column(children: const [Icon(Icons.auto_awesome, size: 40, color: AppTheme.textSecondary), SizedBox(height: 12), Text('Nessuna automazione personalizzata', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)), SizedBox(height: 6), Text('Crea la tua prima automazione per velocizzare il lavoro.', style: TextStyle(fontSize: 13, color: AppTheme.textSecondary), textAlign: TextAlign.center)])))
      else
        ...automations.map((auto) => _automationCard(auto)),
    ]),
  );

  Widget _buildBuiltinTemplates(BuildContext context) => Padding(
    padding: const EdgeInsets.all(AppTheme.screenPadding),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('TEMPLATE PREDEFINITI', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1)),
      const SizedBox(height: 4),
      const Text('Automazioni pronte all\'uso per le operazioni più comuni.', style: TextStyle(fontSize: 15, color: AppTheme.textSecondary)),
      const SizedBox(height: 16),
      ..._builtins.map((auto) => _builtinCard(context, auto)),
    ]),
  );

  Widget _automationCard(Automation auto) => Container(
    margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border.all(color: AppTheme.border), boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2))]),
    child: Row(children: [
      Container(width: 56, height: 56, decoration: BoxDecoration(color: _parseColor(auto.color).withOpacity(0.2), shape: BoxShape.circle), child: Icon(Icons.auto_awesome, size: 32, color: _parseColor(auto.color))),
      const SizedBox(width: 16),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(auto.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)), Text('${auto.steps.length} step · ${auto.usageCount} utilizzi', style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary))])),
      const Icon(Icons.chevron_right, size: 24, color: AppTheme.textSecondary),
    ]),
  );

  Widget _builtinCard(BuildContext context, _BuiltinAutomation auto) => GestureDetector(
    onTap: () => _showComingSoon(context, auto.title),
    child: Container(margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusLarge), border: Border.all(color: AppTheme.border), boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2))]),
      child: Row(children: [
        Container(width: 56, height: 56, decoration: BoxDecoration(color: auto.color.withOpacity(0.2), shape: BoxShape.circle), child: Icon(auto.icon, size: 32, color: auto.color)),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(auto.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)), Text(auto.description, style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary))])),
        const Icon(Icons.chevron_right, size: 24, color: AppTheme.textSecondary),
      ]),
    ),
  );

  Widget _buildProTip() => Container(
    margin: const EdgeInsets.symmetric(horizontal: AppTheme.screenPadding), padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(AppTheme.radiusMedium), border: Border.all(color: const Color(0xFFFCD34D))),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: const [
      Icon(Icons.lightbulb, size: 24, color: Color(0xFFF59E0B)),
      SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Lo sapevi?', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFFB45309))),
        SizedBox(height: 4),
        Text('Ogni automazione ha un QR code unico. Stampalo e scansionalo per avviarla istantaneamente!', style: TextStyle(fontSize: 13, color: Color(0xFF92400E), height: 1.4)),
      ])),
    ]),
  );

  void _showComingSoon(BuildContext context, String feature) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$feature sarà disponibile nella prossima versione')));
  Color _parseColor(String hex) => Color(int.parse('FF${hex.replaceAll('#', '')}'));
}

class _BuiltinAutomation {
  final String id; final String title; final String description; final IconData icon; final Color color;
  const _BuiltinAutomation({required this.id, required this.title, required this.description, required this.icon, required this.color});
}
