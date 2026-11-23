# Mappa Wayfinder 2 — categorie, scaffali, NFC, foto nel CSV, login

Seconda mappa di `funzioni/magazzino`, dopo `map.md` (fase B, ticket 01-10). Tracker locale: questa mappa e un file per ticket in `issues/` (11-20). Scritta dall'orchestratore il 22 novembre 2026 sera con le risposte dell'utente; spostata qui dalla cartella delle note il 22 sera.

## Destination

Un elenco di fette pronte da eseguire, una per task, che porta nell'app React Native:

- **categorie = cartelle**, con sottocategorie; «Tipo di pelle» torna un campo facoltativo;
- **scaffali** dentro le posizioni, con capacità in pezzi, peso e volume, riempimento a colori e proposta di un altro scaffale;
- **NFC solo su richiesta**: una lettura per pressione, serie di letture avviata a mano, pause e ritardi regolabili;
- **foto in WebP sul cloud** con link pubblici e permanenti nel CSV dei prodotti (Supabase Storage o Google Drive, a scelta);
- **login Google funzionante** su web e Android, senza perdere i dati locali.

## Notes

- Regola dell'utente: «il modo più giusto e corretto e semplificato».
- In ogni ticket è scritto chi ha deciso: **risposta dell'utente** oppure **proposta dell'orchestratore, da confermare**. Le proposte si chiedono all'utente quando la loro fetta è la prossima, una per volta.
- Vincoli come la fase B (`grafo-lavori.md`, regole 1-7): dati locali per spazio, campi nuovi facoltativi, nessuna perdita, logica in `utils/` con test jest, ruoli del tema nei 5 stili, `controllo.sh` verde, voce in `CRONOLOGIA.md`, push su `funzioni/magazzino`, mai su `main`, `syncro_flow_flutter/` e `app/` intoccabili.
- `LOGIN_ENABLED = false` sul branch condiviso finché L1 e L2 non sono pronti: le prove (`lib.cjs`) caricano lo spazio `local`.
- Le fette si eseguono **una alla volta nel worktree `inventory-stili`**: le prove usano `:8082`, che serve quella cartella. In un altro worktree si proverebbe il codice di un'altra sessione.
- **NFC, scoperta del 22 sera.** I difetti descritti dall'utente (ascolto continuo, rilettura dopo la scrittura, vendita automatica) non esistono nel codice React Native, in nessun commit: sono comportamenti dell'app Flutter, oggi in pausa. Il codice React Native:
  - legge e scrive solo su richiesta (`utils/nfcService.ts`, `requestTechnology`), dalla Scheda (pulisci + scrivi il link GS1) e dalla prova in Impostazioni › Hardware;
  - non ha NFC nelle automazioni, né ascolto globale, né «Leggi tag NFC»;
  - nel manifest accetta solo `syncroflow://` in VIEW, senza `NDEF_DISCOVERED`.

  Quindi per React Native l'NFC è lavoro nuovo, non una correzione. D19 (le preferenze Scanner & NFC si salvano ma nessuno le legge) entra nella fetta N1.
- Già presenti e da riusare:
  - `Location` ha `capacity` (pezzi, usata dallo Spostamento rapido), `barcode` e `nfcTag`;
  - i prodotti hanno `length`, `width` e `weight`;
  - dipendenze: `expo-image-manipulator` (salva in WebP), `expo-file-system`, `expo-sharing`, `react-native-nfc-manager`;
  - bucket privato `organization-media` e `backend-auth/google/driveApi.ts`, tutti e due dietro il login.
- Telefono: l'utente ha tolto l'app, non ci sono dati a rischio. Build di debug firmata con `android/app/debug.keystore`, `applicationId` `com.redako35.syncroflow`, `adb install -r`, mai disinstallare.

## Decisions so far

- [Foto nel CSV](issues/11-immagini-nel-csv.md) (utente): sul cloud, Supabase Storage o Google Drive a scelta; copia WebP «di catalogo» con link pubblici e permanenti; le foto dentro l'app restano private dello spazio.
- [Formato WebP](issues/12-immagini-webp.md) (ricerca, si chiude nella fetta I1): larghezza massima, qualità e peso su web e Android.
- [Scaffale: cos'è e dove sta](issues/13-scaffale.md) (utente): entità a sé dentro una posizione, generico o di una categoria, con codice e tag NFC; nel prodotto è facoltativo.
- [Scaffale: capacità](issues/14-scaffale-capacita.md) (utente): pezzi, peso e volume, ognuno facoltativo; il riempimento è il più alto dei tre.
- [Scaffale: riempimento e avvisi](issues/15-scaffale-riempimento.md) (utente; soglie da confermare): colore e percentuale, avviso dall'80% con la proposta di un altro scaffale, mai un blocco.
- [NFC: quando si ascolta](issues/16-nfc-quando-si-ascolta.md) (utente): solo su richiesta, mai ascolto continuo; Scanner & NFC sceglie davvero tra QR, NFC o entrambi.
- [NFC: pause e ritardi](issues/17-nfc-pause-e-ritardi.md) (proposta, da confermare; contiene la ricerca N0): una pressione = una lettura; «Leggi più tag» con ritardo e pausa regolabili.
- [NFC: cosa succede alla lettura](issues/18-nfc-alla-lettura.md) (proposta, da confermare): una lettura non vende mai da sola.
- [Cartelle e categorie](issues/19-cartelle-categorie.md) (utente): le cartelle sono le categorie, con sottocategorie; «Tipo di pelle» è un campo. **Supera il ticket 04.**
- [Login Google](issues/20-login-google.md) (utente: sì «a patto che funzioni»; contiene le ricerche L0 e L2): prima la prova che funziona su web e Android, poi il passaggio dei dati locali.

## Fette da eseguire

Ordine: M10 (**fatta** il 22 sera, `df4f3e5`), C1 (**fatta** il 22 sera, vedi `git log`), S1a (**fatta** il 23 novembre, vedi `git log`), poi S1b → S2 → S3 → N1 → N2 → I1 → L1 → L2 → I2 → I3. L0 e N0 sono ricerche in sola lettura, **chiuse** il 22 sera: resoconti in `ricerche/`, sintesi nei ticket 20 e 17. I difetti rimasti della fase B (elenco in `PASSAGGIO.md`) non sono in nessuna fetta: da proporre all'utente come fetta a sé.

| Fetta | Ticket | Cosa | Dipende da | File principali |
| --- | --- | --- | --- | --- |
| M10 | 07 | Fornitori e clienti: indicazioni in `PASSAGGIO.md`, punto 1 | M04 | `ContactsContext`, schermata nuova, `MovementSheet` |
| C1 | 19 | **Fatta.** Categorie = cartelle con sottocategorie; «Tipo di pelle» campo facoltativo; CSV con le due colonne | M10 | `FurTypesContext` (ex `CategoriesContext`), `utils/categories.ts` (albero), `utils/furTypes.ts`, Cartelle, Aggiungi, Modifica, Scheda, Home, CSV, PDF, Audit, Conta, Azione rapida |
| S1a | 13 | **Fatta.** Scaffali: anagrafica (posizione, categoria o generico, codice e tag), Impostazioni › Scaffali, `shelfId` facoltativo **solo nei pezzi unici** (nessuna chiave di `stock` è uno scaffale) | C1 | contesto nuovo `ShelvesContext`, `utils/shelves.ts` + test, schermata nuova, Aggiungi, Modifica, Scheda, Scanner, CSV |
| S1b | 13 | Giacenza degli articoli a quantità sugli scaffali: tutte le letture e scritture di `stock` in un commit; prima la scelta della forma delle chiavi, con test e resoconto, poi le schermate | S1a | `utils/stock.ts`, `utils/inventoryOps.ts`, `InventoryContext`, `MovementSheet`, Conta, Audit |
| S2 | 14, 15 | Capacità in pezzi, peso e volume; altezza e profondità facoltative nel prodotto; riempimento in % con i colori | S1b | `utils/shelves.ts` + test, Scaffali, Scheda |
| S3 | 15 | Avviso dall'80% e proposta dello scaffale migliore in Aggiungi, Movimenta e nelle automazioni di carico | S2 | Aggiungi, `MovementSheet`, Azione rapida, Spostamento rapido |
| N0 | 17 | Ricerca: zittire Android sui tag con l'app aperta senza un ascolto continuo | – | nessuno (sola lettura) |
| N1 | 16, 18 | NFC su richiesta: «Leggi tag NFC» in Scanner e automazioni; Scanner & NFC rispettato (D19) | N0 | `utils/nfcService.ts`, `HardwareConfigContext`, Scanner, automazioni |
| N2 | 17 | «Leggi più tag» con ritardo e pausa regolabili; pausa dopo la scrittura | N1 | come N1, `HardwareScreen` |
| I1 | 12 | Foto in WebP (conversione su web e Android, larghezza massima, qualità) | – | `utils/webp.ts` nuovo + test |
| L0 | 20 | Ricerca: perché il login è stato spento in `cfcdecb`, quale configurazione OAuth e Supabase esiste | – | nessuno (sola lettura) |
| L1 | 20 | Login Google funzionante su web e Android, su un branch proprio; prova reale (l'accesso lo fa l'utente) | L0 | `contexts/AuthContext.tsx`, `backend-auth/`, `app.json` |
| L2 | 20 | Dati dello spazio `local` portati nello spazio dell'account al primo accesso | L1 | `contexts/InventoryContext.tsx` e gli altri contesti con chiavi `…:{org}` |
| I2 | 11 | Caricamento della copia WebP su Supabase Storage (bucket pubblico di catalogo) e link pubblici e permanenti nel CSV | L1, L2, I1 | `InventoryContext` (backup foto), `utils/productCsv.ts`, export |
| I3 | 11 | Google Drive come seconda destinazione e scelta in Impostazioni | I2 | `backend-auth/google/driveApi.ts`, Impostazioni |

Prova sul telefono, quando l'utente lo collega: L1 su Android, N1 e N2 (l'NFC si prova solo lì), il tasto Indietro durante una Conta (M07).

## Da confermare con l'utente (una domanda quando la fetta è la prossima)

- S2: soglie del riempimento (verde sotto il 50%, blu dal 50 all'80%, rosso dall'80%).
- N1 e N2: le proposte dei ticket 17 e 18 e le quattro decisioni uscite dalla ricerca N0 (ticket 17): il «silenziatore» tiene il lettore NFC all'app mentre è aperta, e in quel tempo il telefono non paga con Wallet.
- L1: accesso facoltativo da Impostazioni, con lo spazio `local` usabile senza account (ticket 20). Prima di L1 l'utente deve accendere il provider Google in Supabase.
- L2: come passano i dati locali allo spazio dell'account.
- I3: con Drive le foto stanno nel Drive dell'amministratore e gli operatori ricevono la condivisione per email.

## Not yet specified

- Import delle foto dal CSV (riportare prodotti e immagini da un file esportato).
- Passi NFC nel costruttore di automazioni (CustomRunner, AutomationFlow); scrittura di più tag di seguito.
- Scaffali in Conta e Audit.
- Restano dalla prima mappa: lotti e scadenze, ordini e documenti di trasporto, valore di magazzino, sincronizzazione delle giacenze tra telefoni.

## Out of scope

- Porting delle funzioni su Flutter: l'utente lo farà più avanti, come lavoro a sé.
- Fatturazione, contabilità, IVA, pagamenti.
