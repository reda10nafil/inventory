# Diagnosi Gap: React Native (funzionante) vs Flutter — 25/08/2026

Test su telefono della versione Flutter: l'app si apre ma è solo "l'involucro": le schermate si vedono, ma non si possono creare prodotti, le automazioni non funzionano e compaiono messaggi di servizio tipo "filigrana" ("...sarà disponibile nella prossima versione").

---

## 1. Causa radice: ESISTONO DUE PROGETTI FLUTTER

| Progetto | Ultima modifica | Natura |
|---|---|---|
| `flutter_app/` | **25/08/2026 (oggi)** | ⚠️ Shell dimostrativa basata su `MockData`, senza persistenza. **È questa che è stata compilata e testata sul telefono.** |
| `syncro_flow_flutter/` | 23/08/2026 | Migrazione reale (Riverpod, `shared_preferences`, tutti i provider e i servizi). Architettura corretta, funzionalità incomplete. |

### 1.1 Diagnosi `flutter_app/` (quella testata sul telefono) — "involucro" confermato

- **Dati**: `providers/inventory_provider.dart` inizializza tutto da `services/mock_data.dart` in memoria. **Nessuna persistenza**: ogni modifica si perde al riavvio.
- **State management**: 1 solo `ChangeNotifierProvider` (RN ne ha 7 context).
- **Schermate presenti**: home, timeline, automazioni, add, settings, product detail, scanner, scanner-action, gs1-config.
- **Schermate totalmente assenti** (rispetto a RN):
  - Modifica prodotto (RN: `app/product/edit/[id].tsx`, ~1500 righe)
  - 9 schermate impostazioni su 10: locations, fields, folders, layout-builder, hardware, automation-builder, sector-templates, share, trash
  - Tutte e 6 le schermate di esecuzione automazioni: audit, automation-flow, batch-move, custom-runner, quick-tag, scan-sell
- **"Filigrana"/messaggi finti rilevati**:
  - `screens/automations_screen.dart:110` → `_showComingSoon()`: **"X sarà disponibile nella prossima versione"** per le automazioni integrata.
  - `screens/timeline_screen.dart:91` → tap evento mostra solo SnackBar "Apri prodotto: ..." senza navigare.
  - Campo barcode in add: valori generati `SCAN-xxxx` (scanner simulato, presente anche in RN ma lì come fallback).
- **Automazioni**: zero esecuzione reale, zero builder.
- **Servizi assenti**: nessun decoder barcode da galleria, NFC parziale, niente persistenza.

➡️ **Conclusione**: `flutter_app/` va abbandonata/eliminata. Il lavoro va completato su `syncro_flow_flutter/`.

---

## 2. Gap di `syncro_flow_flutter/` (migrazione reale)

Il documento `docs/cronologia_migrazione.md` dichiarava "MIGRAZIONE COMPLETA AL 100%" — **non vero**: le fasi 5-8 sono parziali. Diagnosi reale:

### 2.1 Bloccanti (l'app appare "vuota")

1. **Routing placeholder in `lib/main.dart:92-131`**: le rotte `/product/:id` e `/scanner` puntano a pagine segnaposto con testo **"(Fase 5)"**. La Home chiama `context.push('/product/${id}')` → l'utente vede una pagina finta invece del dettaglio reale (`ProductDetailScreen` esiste ed è completo ma **non è raggiungibile da lì**).
2. **Nessuna schermata Modifica Prodotto**: RN ha `app/product/edit/[id].tsx` (~1500 righe, form dinamico completo con campi custom, immagini, GS1). In Flutter non esiste equivalente.

### 2.2 Renderer campi dinamici (causa "campi non modificabili")

`widgets/dynamic_field_renderer.dart` supporta solo 4 casi (`textShort`, `textLong`, `number/currency`, `dropdown`). RN (`components/DynamicFieldRenderer.tsx`, ~1100 righe) supporta anche:
- `date` (date picker), `images` (foto multiple), `document` (file picker)
- `stepper` (min/max/step da dataset), `grid`/`segmented` single-choice, `multi_choice`
- `picker`/`modal_list` con opzioni da **dataset** e `linkTo`
- campo barcode con bottone scansione, `gps-link`, suffix/unità, `fieldSnapshot`

### 2.3 Aggiungi prodotto (`add_product_screen.dart`)

- Salva nel provider (persistito), ma:
  - **non renderizza i campi personalizzati** presenti in `customFieldsProvider` (RN li renderizza tutti via layoutVisibility);
  - **non genera il GS1 Digital Link** al salvataggio (RN: `generateGS1DigitalLink` con lotto/seriale);
  - **non salva `customData` con `fieldSnapshot`**;
  - sezione immagini da verificare/completare con `image_picker` vera (camera + galleria multipla, max 10).

### 2.4 Home (`home_screen.dart`)

- Riga 913: `// TODO: Implement batch move when updateProduct supports libraryId update` → spostamento multiplo tra cartelle non funziona perché `updateProduct` non accetta `libraryId`.

### 2.5 Automazioni — esecuzione non reale

- **`screens/automations/custom_runner_screen.dart`**: è un pager "Avanti/Concludi": **non esegue nessuno step** (niente scanner prodotto/posizione, niente `move_to`, `mark_sold`, `add_tag`, `set_field`, niente suoni di feedback). RN (`custom-runner.tsx`, ~740 righe) esegue davvero ogni step con scansione e modifica dell'inventario.
- `audit_screen.dart`, `batch_move_screen.dart`, `scan_sell_screen.dart`, `quick_tag_screen.dart`: versioni ridotte rispetto a RN (loop di scansione con suoni, contatori sessione, report finale, export).
- `automation_flow_screen.dart`: solo mappa visiva (2.4KB vs RN 12.8KB).
- `settings/automation_builder_screen.dart`: 8.5KB vs RN 27KB → builder step semplificato (verificare tipi step, parametri, QR di attivazione).

### 2.6 Impostazioni ridotte (vs RN)

| Schermata | RN (righe) | Flutter (KB) | Gap principale |
|---|---|---|---|
| `sector-templates` | ~550 | SnackBar finto | **Non importa i campi** del template: mostra solo "applicato con successo" (riga 84-85) |
| `layout-builder` | ~1100 | 3.9KB | Manca: sezioni (add/rename/remove), dimensione `small`, icon picker, modale "aggiungi campo", modale modelli settore |
| `fields` | ~850 | 9.8KB | Editor campi semplificato (dataset, options, linkTo, isBarcode, uiType avanzati) |
| `gs1-config` | ~530 | 5.1KB | Preview link + validazione GTIN ridotte |
| `share` | ~280 | 3.1KB | Export/import catalogo JSON, stampa PDF (`printing`) parziali/assenti |
| `folders` | ~500 | 8.2KB | OK parziale |
| `trash` | ~400 | 4.8KB | OK parziale |
| `locations` | ~380 | 9.4KB | OK parziale |

### 2.7 Servizi mancanti/incompleti

- **Nessun `barcode_decoder_service.dart`**: RN può decodificare barcode da foto della galleria (ZXing + QRServer API con preprocessing). Manca in Flutter.
- `nfc_service.dart`: verificare completezza vs `nfcService.ts` (cleanTag, writeGS1Uri, sessioni).
- `pubspec.yaml`: manca `file_picker` (campi documento) — da aggiungere.

---

## 3. Sintesi sintomi riscontrati → causa

| Sintomo sul telefono | Causa |
|---|---|
| "Non si possono creare nuovi prodotti" | Testato su `flutter_app` (dati mock, nessuna persistenza) |
| "Le automazioni non funzionano" | `flutter_app`: "sarà disponibile nella prossima versione"; `syncro_flow_flutter`: runner che non esegue gli step |
| "Filigrana su alcuni campi" | Messaggi placeholder/Coming Soon + route segnaposto "(Fase 5)" |
| "Non si può modificare nulla" | Nessuna schermata edit prodotto; renderer campi incompleto; persistenza assente in `flutter_app` |
