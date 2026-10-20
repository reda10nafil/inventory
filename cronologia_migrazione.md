# Cronologia e Stato della Migrazione: Syncro Flow (Expo → Flutter)

Questo documento riassume lo stato attuale del processo di migrazione dell'applicazione **Syncro Flow** (FurInventory Pro) da React Native a Flutter/Dart.

---

## 📅 Cronologia delle Attività Svolte

1. **Analisi del Progetto React Native**:
   - Analizzata l'architettura dei dati, i modelli TypeScript (`Product`, `TimelineEvent`, `CustomField`, `Alert`), lo stato globale (`InventoryContext`, `LocationsContext`, `CustomFieldsContext`, etc.) e i servizi (NFC, GS1 Digital Link, barcode scanner, sound).

2. **Setup Ambiente Flutter**:
   - Flutter SDK installato e configurato (Flutter 3.44.2, Dart 3.12.2).
   - Generato il progetto nella sottocartella `syncro_flow_flutter`.
   - Configurate le dipendenze in `pubspec.yaml` (Riverpod, GoRouter, sqflite, shared_preferences, mobile_scanner, nfc_manager, audioplayers, etc.).
   - Asset audio e immagini copiati e registrati.

3. **Implementazione Modelli Dati (Completata)**:
   - `lib/models/product.dart`: Modello `Product` e `ProductCustomData` con serializzazione JSON, `copyWith` (con supporto `clearLibraryId`).
   - `lib/models/custom_field.dart`: Modello `CustomField` e `FieldUIType`.
   - `lib/models/timeline_event.dart`: Modello eventi storico prodotto.
   - `lib/models/library.dart`: Modello cartelle/librerie.
   - `lib/models/alert.dart`: Modello alert di magazzino (dormienti, promozione).

4. **Implementazione Stato e Provider Riverpod (Completata)**:
   - `lib/providers/inventory_provider.dart`: Gestione completa catalogo prodotti, filtraggio, ricerca, archiviazione, vendita, soft delete/restore, gestione librerie e spostamento batch (`batchMoveToLibrary`).
   - `lib/providers/storage_provider.dart`: Astrazione persistenza su `shared_preferences` / SQLite.
   - `lib/providers/automations_provider.dart`: Gestione flussi e trigger di automazione.

5. **Implementazione Schermate e UI (Completata)**:
   - Schermata Principale (`lib/screens/home_screen.dart`): Elenco prodotti, filtri, ricerca, selezione multipla e azioni batch (spostamento in cartella, eliminazione).
   - Dettaglio e Modifica (`lib/screens/product_detail_screen.dart`, `lib/screens/product_edit_screen.dart`).
   - Aggiunta Prodotto (`lib/screens/add_product_screen.dart`).
   - Scanner e Azioni Scanner (`lib/screens/scanner_screen.dart`, `lib/screens/scanner_action_screen.dart`).
   - Schermate Automazioni: Scan & Sell, Audit magazzino, Batch Move, Custom Runner.
   - Schermate Impostazioni: Gestione Campi Dinamici, Posizioni, Builder Layout, Configurazione GS1, Hardware, Cestino, Condivisione.
   - Widget dinamici: `DynamicFieldRenderer`, `BarcodeWidget`, `NfcWriterModal`.
   - Routing GoRouter configurato in `lib/main.dart`.

6. **Risoluzione Problemi e Refactoring**:
   - Configurato `analysis_options.yaml` con esclusione di `build/**` e `graphify-out/**`.
   - Risolto lo spostamento batch prodotti in `home_screen.dart` tramite `batchMoveToLibrary`.

---

## 🚀 Esecuzione

- **Flutter**: Supporta build Web, Windows Desktop e Mobile.
  - Avvio Web: `flutter run -d chrome` o `flutter run -d edge` nella cartella `syncro_flow_flutter`.
  - Avvio Windows: `flutter run -d windows`.
