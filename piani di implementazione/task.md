# Migrazione Syncro Flow → Flutter - Task Tracker

## Fase 0: Setup Progetto Flutter
- [x] Installare Flutter SDK
- [x] Aggiungere Flutter al PATH
- [x] Eseguire `flutter create`
- [x] Configurare `pubspec.yaml` con dipendenze
- [x] Copiare assets (logo, audio)
- [ ] Configurare permessi Android (NFC)
- [ ] Configurare permessi iOS (NFC)

## Fase 1: Core (Tema + Modelli + Costanti)
- [ ] `lib/core/theme/app_colors.dart`
- [ ] `lib/core/theme/app_typography.dart`
- [ ] `lib/core/theme/app_theme.dart`
- [ ] `lib/core/constants/config.dart`
- [ ] `lib/models/product.dart`
- [ ] `lib/models/timeline_event.dart`
- [ ] `lib/models/custom_field.dart`
- [ ] `lib/models/alert_model.dart`
- [ ] `lib/models/library.dart`
- [ ] `lib/models/location.dart`
- [ ] `lib/models/automation.dart`
- [ ] `lib/models/layout_config.dart`
- [ ] `lib/models/gs1_config.dart`
- [ ] `lib/models/hardware_config.dart`

## Fase 2: State Management (Riverpod Providers)
- [ ] `lib/providers/inventory_provider.dart`
- [ ] `lib/providers/custom_fields_provider.dart`
- [ ] `lib/providers/locations_provider.dart`
- [ ] `lib/providers/layout_provider.dart`
- [ ] `lib/providers/automations_provider.dart`
- [ ] `lib/providers/gs1_config_provider.dart`
- [ ] `lib/providers/hardware_config_provider.dart`

## Fase 3: Servizi
- [ ] `lib/services/storage_service.dart`
- [ ] `lib/services/nfc_service.dart`
- [ ] `lib/services/sound_service.dart`
- [ ] `lib/services/barcode_decoder_service.dart`
- [ ] `lib/services/gs1_service.dart`

## Fase 4: Schermate Tab
- [ ] `lib/app.dart` (MaterialApp + Router)
- [ ] `lib/core/router/app_router.dart`
- [ ] `lib/screens/tabs/home_screen.dart`
- [ ] `lib/screens/tabs/timeline_screen.dart`
- [ ] `lib/screens/tabs/automations_screen.dart`
- [ ] `lib/screens/tabs/add_product_screen.dart`
- [ ] `lib/screens/tabs/settings_screen.dart`

## Fase 5: Dettaglio + Scanner
- [ ] `lib/screens/product/product_detail_screen.dart`
- [ ] `lib/screens/product/product_edit_screen.dart`
- [ ] `lib/screens/scanner/scanner_screen.dart`
- [ ] `lib/screens/scanner/scanner_action_screen.dart`

## Fase 6: Schermate Impostazioni
- [ ] `lib/screens/settings/locations_screen.dart`
- [ ] `lib/screens/settings/fields_screen.dart`
- [ ] `lib/screens/settings/folders_screen.dart`
- [ ] `lib/screens/settings/layout_builder_screen.dart`
- [ ] `lib/screens/settings/gs1_config_screen.dart`
- [ ] `lib/screens/settings/hardware_screen.dart`
- [ ] `lib/screens/settings/automation_builder_screen.dart`
- [ ] `lib/screens/settings/sector_templates_screen.dart`
- [ ] `lib/screens/settings/share_screen.dart`
- [ ] `lib/screens/settings/trash_screen.dart`

## Fase 7: Schermate Automazioni
- [ ] `lib/screens/automations/audit_screen.dart`
- [ ] `lib/screens/automations/automation_flow_screen.dart`
- [ ] `lib/screens/automations/batch_move_screen.dart`
- [ ] `lib/screens/automations/custom_runner_screen.dart`
- [ ] `lib/screens/automations/quick_tag_screen.dart`
- [ ] `lib/screens/automations/scan_sell_screen.dart`

## Fase 8: Widget Riutilizzabili
- [ ] `lib/widgets/dynamic_field_renderer.dart`
- [ ] `lib/widgets/barcode_widget.dart`
- [ ] `lib/widgets/barcode_scanner_widget.dart`
- [ ] `lib/widgets/product_card.dart`
- [ ] `lib/widgets/stat_card.dart`
- [ ] `lib/widgets/section_header.dart`
- [ ] `lib/widgets/luxury_bottom_sheet.dart`
