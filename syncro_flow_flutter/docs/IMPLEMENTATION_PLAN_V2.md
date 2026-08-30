# Implementation Plan V2 — SyncroFlow Flutter (2026-08-29)

## Contesto
- App inventario pellicce, Riverpod 3, GoRouter, nfc_manager 3.3.0 patchato, MobileScanner, Mifare Classic 1K blu (716B NDEF)
- APK ultimo: build/app/outputs/flutter-apk/app-release.apk 72.6MB (non rifare fino a richiesta)
- Graph: syncro_flow_flutter 1371 nodi/2018 archi, inventory 2302/3545

## Problemi segnalati device
1. Tag associato non richiama app da fuori (sensore NFC attivo ma no launch)
2. Fotocamera/flash scanner non funzionanti
3. Ascolto NFC continuo sovrapposto a popup Lettura/Scrittura/Cancellazione e NFC Tools → manda su scheda prodotto invece di azione locale
4. Lettura/Scrittura/Cancellazione senza suoni distinti
5. Tag letto → schermata nera con link
6. QR in Aggiungi prodotto troppo grande/SVG inutile; bottone NFC deve essere compatto come in scheda prodotto

## Piano strutturato 5 fasi
### Fase A — NFC Coordinator a priorità (fix 3,5, cooldown)
- Nuovo `lib/services/nfc_coordinator.dart` enum NfcMode {global, explicitRead, explicitWrite, explicitClean, tools}
- API acquire(mode, token)/release(token) — una sola NfcManager.startSession attiva
- GlobalNfcListener low-priority, auto-sospeso su explicit/tools
- Cooldown 1800ms + inhibit fino a rimozione tag (Ndef==null) dopo ogni onDiscovered/write
- Whitelist ON: home/, timeline, automations, scanner (paused quando camera), product_detail view
- OFF: add, product edit, settings/*, popup NFC

### Fase B — Lancio esterno (fix 1)
- AndroidManifest.xml: pathPrefix, TECH_DISCOVERED fallback, verifica createUri per syncroflow://
- main.dart getInitialLink: attesa idratazione StorageService prima di match inventory

### Fase C — Fotocamera/flash (fix 2)
- MobileScannerController lifecycle + permissionDenied handling + TorchState ValueListenableBuilder

### Fase D — Suoni multifrequenza (fix 4)
- SoundService: playNfcRead 1200Hz, playNfcWrite 1800Hz, playNfcClean 800Hz

### Fase E — UI + black screen guard (fix 5,6)
- Rimuovi QrImageView da add_product_screen, bottone NFC compatto con popup
- Guard su global_nfc_listener e scanner_screen: mai push se match.isEmpty → snackbar

## Verifiche per fase
flutter analyze --no-pub (0 errori), flutter test, graphify update ., APK solo finale
