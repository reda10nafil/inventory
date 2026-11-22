# Esito a4: Impostazioni, Posizioni, Cartelle, GS1, Hardware, Condivisione, Team, Aspetto, Dati

Prove del 22 novembre 2026 sul web (http://localhost:8082, 375×812, campionario di 6 prodotti, spazio `local`).
Script in questa cartella, prefisso `a4-`. Comando: `SHOTS="$TEMP/prova-funzioni" node a4-<area>.cjs [scenario]`.
«Funziona» significa che lo stato salvato in localStorage cambia come deve. Tra parentesi c'è lo scenario che lo prova.

## Risultati

| Funzione | Esito | Prova | Note (file:riga) |
| --- | --- | --- | --- |
| Impostazioni › Aspetto (voce) | funziona | `a4-impostazioni` (a4-imp-voci): porta a `/settings/appearance` | |
| Impostazioni › GS1 Digital Link (voce) | funziona | a4-imp-voci: porta a `/settings/gs1-config` | |
| Impostazioni › Scanner & NFC (voce) | funziona | a4-imp-voci: porta a `/settings/hardware` | |
| Impostazioni › Gestisci Cartelle (voce) | funziona | a4-imp-voci: porta a `/settings/folders` | |
| Impostazioni › Campi Personalizzati (voce) | funziona | a4-imp-voci: porta a `/settings/fields` | Provato solo l'arrivo; la schermata è di a2. |
| Impostazioni › Configura Layout Aggiungi (voce) | funziona | a4-imp-voci: porta a `/settings/layout-builder` | Provato solo l'arrivo (a2). |
| Impostazioni › Cestino (voce) | funziona | a4-imp-voci: porta a `/settings/trash` | Provato solo l'arrivo (a1/a3). |
| Impostazioni › Gestisci Posizioni (voce) | funziona | a4-imp-voci: porta a `/settings/locations` | |
| Impostazioni › Configurazione Condivisione (voce) | funziona | a4-imp-voci: porta a `/settings/share` | La pagina però non configura nulla: vedi la riga Condivisione. |
| Impostazioni › Alert Prodotti Dormienti | non funziona | a4-imp-voci: mostra solo «Prossimamente» | `SettingsScreen.tsx:478`. La descrizione «Soglia: 6 mesi» è fissa. Gli avvisi esistono (`InventoryContext.tsx:326`), ma non si possono configurare. |
| Impostazioni › Suggerimenti AI | non funziona | a4-imp-voci: mostra solo «Prossimamente» | `SettingsScreen.tsx:496` |
| Impostazioni › Organizzazione attiva («Spazio locale») | funziona | a4-imp-voci: il tocco non apre finestre e non cambia nulla | Esiste un solo spazio: `switchOrganization` non fa nulla con `local` (`AuthContext.tsx:166-169`). |
| Impostazioni › Inviti team / Esci dall'account | non verificabile da qui | a4-imp-voci: «Esci da questo profilo» non compare | Sono nascosti con `LOGIN_ENABLED = false` e richiedono Supabase (`SettingsScreen.tsx:527`, `:636`). |
| Impostazioni › Backup Google Drive | non verificabile da qui | a4-imp-voci: finestra «Google Drive non collegato», nessun errore | Richiede l'accesso Google e il token di Drive (`SettingsScreen.tsx:131-136`). |
| Impostazioni › Accesso Multi-Utente (voce) | funziona | a4-imp-voci: apre Team, indirizzo `/SettingsTeam` | Ricaricando quell'indirizzo compare NotFound: Team non è in `linking.ts:18-26` (vedi difetti). |
| Modelli di settore (D13) | non funziona | a4-imp-voci: nessuna voce «Modelli» in Impostazioni | D13 è ancora presente. Nel codice nessuno naviga a `/settings/sector-templates`: la rotta esiste solo in `compat.ts:36` e in `RootNavigator.tsx:99`. |
| Posizioni › crea | funziona | `a4-posizioni` (a4-pos-crea): `furinventory_locations:local` contiene `deposito_nord`, «Deposito Nord», `#10B981`, `LOC-DEPOSITO_NORD`; ora sono 7 | Resta dopo la ricarica e compare in Aggiungi. Prima della prima modifica la chiave è `null` (si usano i valori predefiniti). |
| Posizioni › modifica nome e colore | funziona | a4-pos-modifica: `vetrina` diventa «Vetrina Centrale», `#8B5CF6`, con lo stesso id | La Home mostra il nuovo nome sulla card di VIS-0142. |
| Posizioni › elimina | funziona | a4-pos-elimina: conferma, poi `vetrina` sparisce dallo stato; a4-pos-elimina-annulla: con Annulla non si scrive nulla | Toccare il cestino non apre la modifica della riga. |
| Posizioni › prodotti di una posizione eliminata | non funziona | a4-pos-elimina: VIS-0142 resta con `location: "vetrina"`; Home e Scheda mostrano l'id grezzo «vetrina». a4-pos-orfano-modifica (`node a4-posizioni.cjs modifica-orfano`): in Modifica, aperta dalla Scheda, nessuna posizione è selezionata e il salvataggio lascia `vetrina` | Non c'è avviso né spostamento (`LocationsScreen.tsx:94-111`, `LocationsContext.tsx:96-100`). |
| Posizioni › nome già usato | funziona | a4-pos-doppia: «Esiste già una posizione…», nessuna scrittura | |
| Posizioni › scansione del codice con la fotocamera | non verificabile da qui | | Serve la fotocamera (`LocationsScreen.tsx:184`). |
| Posizioni › D21 (valori predefiniti scritti tre volte) | confermato | Le tre liste sono identiche (6 voci, stessi id, etichette e colori) | Usato solo `contexts/LocationsContext.tsx:18` (11 schermate lo importano). `hooks/useLocations.ts` e `LOCATIONS` di `constants/config.ts:14` non hanno importatori: sono codice morto. |
| Cartelle › crea | funziona | `a4-cartelle` (a4-cart-crea): `inventory:v1:local:libraries` contiene `giacche`, «Giacche», icona `warehouse`; c'è la pillola in Home | Il barcode scritto alla creazione non si salva. La schermata lo avvisa (`FoldersScreen.tsx:77`, `:243-247`). |
| Cartelle › rinomina (e barcode in modifica) | funziona | a4-cart-rinomina: `pellicce` diventa «Pellicce Lusso» con barcode `LIB-PELLICCE`, stesso id; i 3 prodotti restano | |
| Cartelle › elimina una cartella con prodotti | funziona (bloccata) | a4-cart-elimina-piena: «contiene 3 prodotti…», la cartella resta | |
| Cartelle › elimina una cartella vuota | funziona | a4-cart-elimina-vuota: `temporanea` creata e poi tolta dallo stato | |
| Cartelle › elimina una cartella con prodotti nel cestino | non funziona | a4-cart-cestino: AST-0033 va nel cestino, la cartella mostra «0 prodotti» e si elimina; il prodotto ripristinato ha `libraryId: "usato-e-permute"`, una cartella che non esiste più | Il conteggio ignora il cestino (`InventoryContext.tsx:655`, `FoldersScreen.tsx:43`). |
| GS1 › salva la configurazione | funziona | `a4-gs1` (a4-gs1-salva): `furinventory_gs1_config:local` = `{baseUrl: "https://id.prova.it", serialMode: "progressive", enableLotto: true}`; l'anteprima si aggiorna | Il dominio si salva solo all'uscita dal campo (blur). Non provati: la scelta del campo Lotto (`lottoFieldId`) e il seriale spento. |
| GS1 › riapertura della pagina con la ricarica | non funziona | a4-gs1-salva: dopo la ricarica il campo mostra `https://syncroflow.app/id`; uscendo dal campo il dominio salvato viene sovrascritto con quello predefinito | `Gs1ConfigScreen.tsx:26` legge la configurazione quando la schermata si apre, prima che sia caricata; poi `:28-30` la salva. Arrivando da Impostazioni il campo è giusto (a4-gs1-da-impostazioni). |
| GS1 › ripristina i valori predefiniti | funziona | a4-gs1-ripristina: dopo la conferma lo stato torna ai valori predefiniti e anche il campo | |
| GS1 › link generato al salvataggio (Aggiungi) | funziona | a4-gs1-aggiungi: nuovo prodotto `LOG-2026-001` con `gs1DigitalLink` = `https://id.prova.it/01/LOG-2026-001/21/000007` | Usa dominio e seriale progressivo appena configurati. |
| GS1 › link al salvataggio in Modifica | non funziona | a4-gs1-modifica: VIS-0142 salvato senza cambiare nulla; il link passa da `…/21/000142` a `…/21/MWRFD6L9-3YWKVL` | Il seriale si rigenera a ogni salvataggio (`EditScreen.tsx:129-143`): QR ed etichette NFC già scritti non corrispondono più. |
| Scanner & NFC › salva le preferenze | funziona | `a4-hardware` (a4-hw-salva): `furinventory_hardware_config:local` = `{scanMode: "nfc_only", autoWriteNfcOnSave: true}`; resta dopo la ricarica | Nessun pulsante di ripristino: `resetHwConfig` non è usato (`HardwareScreen.tsx:18`). |
| Scanner & NFC › le preferenze vengono lette (D19) | non funziona | Ricerca nel codice: `hwConfig`, `scanMode` e `autoWriteNfcOnSave` compaiono solo in `HardwareScreen.tsx` e nel residuo `app/settings/hardware.tsx` | D19 è ancora presente. Nessuno scanner né salvataggio li legge. Nessuno chiama `nfcService.readTag` (`utils/nfcService.ts:97`). |
| Scanner & NFC › test del sensore NFC | non verificabile da qui | a4-hw-test-nfc: finestra «Errore durante la verifica dello stato NFC.» | Sul web non c'è NFC: serve un telefono. Il messaggio dice «errore» invece di «non supportato» (`HardwareScreen.tsx:33-34`). |
| Condivisione › configurazione | non funziona | a4-imp-condivisione: 1 solo elemento premibile (Indietro), 0 interruttori, 0 campi | Pagina statica: «verrà completata nella prossima versione» (`ShareScreen.tsx:40`). |
| Team › raggiungibile | funziona | a4-imp-team: si apre solo da Impostazioni › «Accesso Multi-Utente» | È l'unico ingresso (`SettingsScreen.tsx:660`). Non si apre dall'indirizzo: ricaricando `/SettingsTeam` compare NotFound. |
| Team › Host, Client, pairing e sincronizzazione LAN (mesh) | non verificabile da qui | a4-imp-team: «Genera QR Host» apre «Impossibile creare stanza Host (LAN non raggiungibile)»; nessun QR | Servono due dispositivi sulla stessa LAN. Sul web lo stato mostrato è falso: vedi difetti. |
| Team › Chat Team | funziona (segnaposto) | a4-imp-team: apre `/Chat` | Il testo del pulsante dice «placeholder router.push». |
| Team › inventario dopo l'apertura | funziona | a4-imp-team: 6 prodotti, Home normale, nessun errore in console | |
| Aspetto › cambio stile | funziona | `a4-aspetto`: `@syncro/stile` passa da `null` a `"minimal"`; lo sfondo passa subito da `rgb(11,11,12)` a `rgb(255,255,255)` e resta così dopo la ricarica; la voce in Impostazioni dice «Stile: Minimal» | |
| Dati › Esporta inventario (CSV) | funziona, con difetti | `a4-dati` (a4-dati-esporta): si scarica `inventario_….csv` con 6 righe | Contiene anche AST-0033, che è nel cestino, senza una colonna che lo indichi. Non c'è la colonna cartella (`SettingsScreen.tsx:84-101`). |
| Dati › Importa trascinando un CSV | funziona | a4-dati-importa-trascina: «2 prodotti importati. 1 saltati»; NEW-001 (magazzino, available, 2500) e NEW-002 (sartoria, sold); VIS-0142 non duplicato | La cartella non si importa (`libraryId` assente): l'esportazione non la contiene. |
| Dati › Importa con il pulsante | non funziona (web) | a4-dati-importa-pulsante: dopo la scelta del file compare «Importazione non riuscita… expo-file-system.readAsStringAsync is not available on web»; 0 importati | `SettingsScreen.tsx:258`. Su Android non provato. |

Conteggio: 29 funzionano (una, l'esportazione CSV, con difetti), 10 non funzionano, 5 non verificabili da qui. In più c'è D21, confermato dalla lettura del codice.

## Difetti precedenti ricontrollati

- **D05**: corretto. La card in Home mostra il nome e il colore della posizione («Vetrina Centrale» in a4-pos-modifica). L'id grezzo compare solo se la posizione è stata eliminata.
- **D07**: corretto in Home e in Impostazioni › Info (titolo «Syncro Flow»). Il PDF non è stato controllato.
- **D13**: ancora presente.
- **D19**: ancora presente.
- **D21**: ancora presente; due delle tre copie sono codice morto.

## Difetti nuovi

1. **GS1, la Modifica cambia il link**: ogni salvataggio in Modifica rigenera il seriale, anche senza cambiare nulla. QR ed etichette NFC già stampati o scritti non corrispondono più. `EditScreen.tsx:129-143` (a4-gs1-modifica).
2. **GS1, la ricarica sovrascrive il dominio**: se la pagina GS1 si apre ricaricando o dall'indirizzo, il campo mostra il dominio predefinito. All'uscita dal campo, quello salvato viene sostituito. `Gs1ConfigScreen.tsx:26` e `:28-30` (a4-gs1-salva).
3. **Posizione eliminata, prodotti orfani**: l'eliminazione non controlla i prodotti e non li sposta. Restano con l'id della posizione, che si vede grezzo in Home e nella Scheda. In Modifica nessuna posizione è selezionata e il salvataggio conserva l'id orfano. `LocationsScreen.tsx:94-111` e `LocationsContext.tsx:96-100` (a4-pos-elimina, a4-pos-orfano-modifica).
4. **Cartella eliminata con prodotti nel cestino**: i prodotti nel cestino non contano, quindi la cartella si elimina. Il prodotto ripristinato punta a una cartella che non esiste più. `InventoryContext.tsx:655` e `FoldersScreen.tsx:43` (a4-cart-cestino).
5. **Importa CSV con il pulsante non va sul web**: `FileSystem.readAsStringAsync` non esiste sul web. Funziona solo il trascinamento. `SettingsScreen.tsx:258` (a4-dati-importa-pulsante).
6. **Esportazione CSV incompleta**: include i prodotti nel cestino senza segnarli. Non contiene la cartella, che quindi si perde nel giro esporta e importa. `SettingsScreen.tsx:84-101` (a4-dati-esporta, a4-dati-importa-trascina). Dedotto dal codice, non provato: importati in un inventario vuoto o in un altro spazio, i prodotti del cestino tornerebbero attivi. Nello stesso inventario invece vengono saltati, perché lo SKU c'è già (`SettingsScreen.tsx:205`).
7. **Team, stato falso sul web**: all'apertura la creazione dell'Host fallisce senza avviso (`TeamScreen.tsx:72-86`). Il riquadro dice comunque «Host pronto — in attesa client» (`:299`) e l'elenco mostra «Questo dispositivo (Host) Online» (`:114`). «Sincronizza ora» non dà alcun riscontro (a4-imp-team).
8. **Team e Chat non si riaprono dall'indirizzo**: hanno indirizzi `/SettingsTeam` e `/Chat`, che mancano in `linking.ts:18-26`; ricaricando compare NotFound (a4-imp-team).
9. **Modifica aperta dall'indirizzo o dopo una ricarica**: il modulo è vuoto (SKU, foto, cartella), perché lo stato iniziale viene letto quando i prodotti non sono ancora caricati. Lo si è visto per caso, fuori area: `EditScreen.tsx:41-62` (schermata `a4-pos-elimina-modifica-dopo-elimina.png`). Dalla Scheda invece si apre giusto (a4-gs1-modifica).
10. **Seriale GS1 progressivo** (solo lettura del codice, non provato): vale numero dei prodotti + 1 e conta anche quelli nel cestino. Dopo un'eliminazione definitiva un numero può ripetersi. `AddScreen.tsx:217` e `utils/gs1.ts:40`.
11. **Anteprima GS1 con un Lotto che il link non avrà**: con Lotto acceso e nessun campo scelto, l'anteprima mostra `?10=LOTTO-2026A` (a4-gs1-salva, `lottoFieldId: ""`). Il link vero invece non avrà il lotto, perché manca il campo da cui leggerlo. `utils/gs1.ts:87` contro `AddScreen.tsx:210-212`.
12. **Scanner & NFC**: non c'è un modo per tornare ai valori predefiniti (`resetHwConfig` non è usato). Sul web la diagnostica dice «Errore» invece di «non supportato». `HardwareScreen.tsx:18` e `:33-34`.
