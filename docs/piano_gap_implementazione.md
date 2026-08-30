# Piano di Implementazione — Colmare il gap Flutter ↔ React Native

Data: 25/08/2026. Diagnosi di riferimento: `docs/diagnosi_gap_flutter.md`.
Target di sviluppo: **solo `syncro_flow_flutter/`**. `flutter_app/` è una shell con dati mock → da eliminare (conferma utente).

Ogni fase produce un'app compilabile e testabile. Dopo ogni fase: `flutter analyze` + `flutter test` e aggiornamento `graphify update .` + voce in `docs/cronologia_migrazione.md`.

---

## Fase G0 — Sblocco immediato (quick wins) [~0.5 gg]

1. **Fix routing `lib/main.dart`**:
   - Sostituire la rotta placeholder `/product/:id` con `ProductDetailScreen(productId: id)`.
   - Sostituire la rotta placeholder `/scanner` con `ScannerScreen()`.
   - Aggiungere route `/product/:id/edit` → nuova `ProductEditScreen` (vedi G1).
   - Rimuovere ogni testo "(Fase 5)" / placeholder.
2. **Eliminare la cartella `flutter_app/`** (shell mock, fonte di confusione) — dopo conferma utente.
3. Verifica: dalla Home, tap su prodotto → dettaglio reale con azioni Sposta/Vendi/NFC/QR/Elimina.

## Fase G1 — Modifica prodotto + renderer campi completi [~2-3 gg]

1. **Nuovo** `lib/screens/product_edit_screen.dart`: porting di `app/product/edit/[id].tsx` — form dinamico basato su `layoutProvider` + `customFieldsProvider`, precompilato dal prodotto, salva via `inventoryProvider.updateProduct`.
2. **Estendere `inventory_provider.dart`**: `updateProduct` deve accettare `libraryId` e map completo dei campi (sblocca anche il TODO della Home riga 913).
3. **Completare `widgets/dynamic_field_renderer.dart`** a parità con RN:
   - `date` (DatePicker), `images` (image_picker multiplo), `document` (file_picker)
   - `stepper` (min/max/step), `grid`/`segmented`, `single_choice`/`multi_choice`
   - `picker`/`modal_list` con dataset e `linkTo`, campo barcode + bottone scan, unità/suffix
4. Aggiungere dipendenza `file_picker` a `pubspec.yaml`.

## Fase G2 — Aggiungi prodotto completo [~1-2 gg]

1. Rendere **tutti i campi personalizzati** (non solo quelli di sistema) nel form Add.
2. **Image picker reale** (galleria multipla + camera, max 10 foto) nella sezione immagini.
3. **GS1 Digital Link al salvataggio** (`GS1Service.generateDigitalLink` con seriale/lotto) e salvataggio `customData` con `fieldSnapshot` (come RN).
4. Validazione campi `required` + suoni success/error.

## Fase G3 — Impostazioni a parità [~2-3 gg]

1. `sector_templates_screen.dart`: **importare davvero i campi** nel `customFieldsProvider` (con deduplica e conteggio, come RN `sector-templates.tsx:59-66`); salvataggio modello personalizzato.
2. `layout_builder_screen.dart`: sezioni (crea/rinomina/elimina header), terza dimensione `small`, icon picker, modale aggiungi campo, modale modelli settore.
3. `fields_screen.dart`: editor completo (type, uiType, dataset, options, required, isBarcode, linkTo, icon) + soft-delete/ripristino + riordino.
4. `share_screen.dart`: export/import catalogo JSON reale (`share_plus` + file), stampa PDF scheda (`printing`), QR condivisione.
5. `gs1_config`, `folders`, `locations`, `hardware`, `trash`: colmare differenze residue da confronto puntuale con i rispettivi `.tsx`.

## Fase G4 — Automazioni davvero eseguibili [~3-4 gg] (priorità alta: "le automazioni non funzionano")

1. **`custom_runner_screen.dart` riscritto** come RN `custom-runner.tsx`:
   - Step `scan_product`/`scan_location`: apre scanner reale (camera `mobile_scanner` + NFC) e valida il codice.
   - Step `move_to`/`mark_sold`/`add_tag`/`set_field`: esegue l'azione vera su `inventoryProvider`.
   - Feedback sonoro (`SoundService`: success/error/anomaly) + riepilogo finale sessione.
2. `audit_screen.dart`: loop scansione con lista attesi/trovati/mancanti, storico, report (porting da `audit.tsx` 16KB).
3. `batch_move_screen.dart`: scansione multipla → spostamento massivo con conferma e riepilogo.
4. `scan_sell_screen.dart`: vendita a raffica con totale incasso sessione.
5. `quick_tag_screen.dart`: scrittura NFC seriale reale con contatori.
6. `automation_flow_screen.dart`: mappa flusso completa (dati reali degli step).
7. `automation_builder_screen.dart`: builder completo (tutti gli step type, parametri, QR attivazione, anteprima).

## Fase G5 — Servizi mancanti [~1 gg]

1. **Nuovo** `lib/services/barcode_decoder_service.dart`: porting di `utils/barcodeDecoder.ts` (decode barcode da immagine galleria, fallback multipli).
2. Verifica/completezza `nfc_service.dart` vs `utils/nfcService.ts` (cleanTag, writeGS1Uri, gestione sessioni).
3. Verifica `sound_service.dart` vs `services/SoundService.ts` (tutti i pattern: success, anomaly, error, blocking-error, fragile).

## Fase G6 — QA finale e consegna [~1 gg]

1. `flutter analyze` pulito, `flutter test` verdi, `flutter build apk --debug` e test su telefono con checklist:
   - CRUD prodotti completo (crea, **modifica**, sposta cartella, elimina, ripristina)
   - Persistenza dopo chiusura/riapertura
   - Scanner camera + NFC reali
   - Creazione ed **esecuzione** automazione multi-step
   - Layout builder e template settore applicati
2. `graphify update .` + aggiornamento `docs/cronologia_migrazione.md`.

---

## Note operative

- Non migrare dati: la persistenza è `shared_preferences` (JSON); i dati mock di `flutter_app` vanno semplicemente buttati con la cartella.
- Design: mantenere tema Luxury Dark (#0A0A0A / oro #D4AF37) già implementato in `syncro_flow_flutter`.
- Effort totale stimato: **~10-14 giorni di lavoro** equivalenti (molto parallelizzabile).
