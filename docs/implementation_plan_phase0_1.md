# Completamento Setup (Fase 0) e Fondamenta Core (Fase 1)

Questo piano definisce i passi per completare il setup iniziale del progetto Flutter (aggiungendo i permessi hardware NFC e Fotocamera) e per implementare la Fase 1 (Core), ovvero il tema luxury dark + oro e i modelli dati in Dart.

## User Review Required

> [!IMPORTANT]
> **Permessi iOS & NFC**: Su iOS, l'uso dell'NFC richiede che il profilo di provisioning nel tuo account sviluppatore Apple abbia l'NFC enabled. Lato codice, configuriamo i permessi in `Info.plist` e creiamo il file `Runner.entitlements`. Se riscontri problemi di compilazione su iOS legati alla firma, potrebbe essere necessario configurare il profilo su Xcode.

> [!NOTE]
> **Struttura dei Modelli Dati**: I modelli dati Dart verranno mappati 1:1 rispetto ai tipi TypeScript presenti in `types/index.ts`. Utilizzeremo metodi standard di serializzazione JSON (`fromJson`, `toJson`) per supportare la persistenza locale.

---

## Proposed Changes

### 📱 Configurazione Permessi Hardware (Fase 0)

#### [MODIFY] [AndroidManifest.xml](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/android/app/src/main/AndroidManifest.xml)
- Aggiunta del permesso per la fotocamera (`android.permission.CAMERA`) necessario per `mobile_scanner`.
- Aggiunta del permesso NFC (`android.permission.NFC`) e del feature hardware non bloccante.

#### [MODIFY] [Info.plist](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/ios/Runner/Info.plist)
- Aggiunta di `NFCReaderUsageDescription` per spiegare l'uso dell'NFC.
- Aggiunta di `NSCameraUsageDescription` per spiegare l'uso della fotocamera per la scansione barcode.

#### [NEW] [Runner.entitlements](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/ios/Runner/Runner.entitlements)
- Definizione dei formati NFC supportati (`NDEF` e `TAG`) richiesti per iOS.

---

### 🎨 Design System e Costanti (Fase 1)

#### [NEW] [app_colors.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/core/theme/app_colors.dart)
- Definizione della palette Luxury Dark: sfondo principale scuro (`#0A0A0A`), colore primario oro (`#D4AF37`), grigi scuri per superfici, e colori semantici per stati (successo, errore, avviso, info, e posizioni fisiche).

#### [NEW] [app_typography.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/core/theme/app_typography.dart)
- Configurazione degli stili di testo coordinati con il font Inter (via `google_fonts`) per un look premium.

#### [NEW] [app_theme.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/core/theme/app_theme.dart)
- Assemblaggio di `ThemeData` (Material 3) scuro con schema di colori oro/nero, personalizzazione di pulsanti, input fields, e card.

#### [NEW] [config.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/core/constants/config.dart)
- Porting delle costanti dell'app (stati prodotto, tipi di pellicce, limiti temporali per prodotti dormienti o in promozione).

#### [NEW] [sector_templates.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/core/constants/sector_templates.dart)
- Porting dei template per configurazioni veloci di settori di inventario (es. pellicceria, gioielleria, ecc.).

---

### 📦 Modelli Dati Dart (Fase 1)

#### [NEW] [product.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/models/product.dart)
#### [NEW] [timeline_event.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/models/timeline_event.dart)
#### [NEW] [custom_field.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/models/custom_field.dart)
#### [NEW] [alert_model.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/models/alert_model.dart)
#### [NEW] [library.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/models/library.dart)
#### [NEW] [location.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/models/location.dart)
#### [NEW] [automation.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/models/automation.dart)
#### [NEW] [layout_config.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/models/layout_config.dart)
#### [NEW] [gs1_config.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/models/gs1_config.dart)
#### [NEW] [hardware_config.dart](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/lib/models/hardware_config.dart)

---

## Verification Plan

### Automated Tests
```bash
# Eseguito all'interno della cartella syncro_flow_flutter
flutter analyze
flutter test
```

### Manual Verification
- Verifica visiva dei file generati per assicurarsi che i tipi TypeScript corrispondano esattamente ai tipi Dart.
- Controllo sintattico con l'analizzatore Flutter.
