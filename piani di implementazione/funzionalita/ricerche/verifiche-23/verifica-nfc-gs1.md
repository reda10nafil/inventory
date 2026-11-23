# Verifica NFC e GS1 Digital Link (23 novembre 2026)

> **Nota dell'orchestratore 3 (23 novembre 2026, dopo le risposte dell'utente).**
> - **Domanda 1 risolta**: QR e tag servono «solo all'app» e portano il codice (ticket 22); il resolver GS1 e gli App Links (NG10) sono fuori.
> - Domande 2 (EAN/GTIN) e 3 (stampante) aperte: si chiedono quando le fette GS1 ed ETI sono le prossime.
> - Il file `utils/codeResolver.ts` proposto qui si chiama `utils/codes.ts` nei ticket (unico con la proposta AU-A0 delle automazioni).
> - Sigle con il prefisso dell'area nei ticket (regola in `../../map-3.md`, Notes). Numeri di riga a `4b94e4c`; i difetti si riproducono su `HEAD` prima di correggerli.

Verifica in sola lettura per i piani di implementazione e di verifica. Nessun file del worktree è stato modificato e non è stato lanciato nessun comando git che cambia lo stato.

**Codice di riferimento.**
- Commit `4b94e4c` di `funzioni/magazzino`; i numeri di riga valgono per quel commit, salvo dove è scritto «copia di lavoro».
- I file toccati da S1a e non committati sono citati con `git show 4b94e4c:<percorso>`.
- Le righe di `esito-a1`, `esito-a4` e N0 sono state ricontrollate: dove erano cambiate, qui sono citate di nuovo.
- **Durante la verifica S1a è stato committato come `7bfcd72`**: alla fine il worktree era pulito.
  - Tra `4b94e4c` e `7bfcd72` non cambiano `utils/gs1.ts`, `utils/nfcService.ts`, `Gs1ConfigScreen.tsx` e `HardwareScreen.tsx`.
  - Le righe di `utils/shelves.ts` sono citate a `7bfcd72`.
  - Le altre righe della «copia di lavoro» (`LocationsScreen.tsx:71`, `FoldersScreen.tsx:76`, `ShelvesScreen.tsx:212`, `:289`) coincidono con `7bfcd72`.
  - Le prove sul web sono state fatte sulla copia di lavoro prima del commit: dove c'è scritto «da riconfermare dopo S1a» basta rilanciare gli scenari su `7bfcd72`.

**Prove sul web.**
- App su `http://localhost:8082`, che serve la **copia di lavoro** (con S1a dentro), campionario di 6 prodotti, finestra 375×812, un browser pulito per ogni scenario, uno scenario alla volta.
- Script miei: `script/nfc-gs1/ng.cjs`. Si lancia così: `SHOTS=<quella cartella> node ng.cjs <scenario>`.
- Rilanciati da fuori del worktree, con `SHOTS` impostato: `prova/a4-gs1.cjs` e `prova/a4-hardware.cjs`.
- Nessun timeout, nessun errore di script.

**Etichette.**
- «provato sul web»: risultato di uno scenario.
- «letto nel codice»: file:riga.
- «dedotto»: ragionamento sul codice o sullo standard, non provato.
- «non provato, serve il telefono»: vale per tutto ciò che riguarda l'NFC e la stampa vera.
- «da riconfermare dopo S1a»: quello che passa da Scanner, Azione rapida, Aggiungi, Modifica, Scheda, Posizioni, Cartelle o Impostazioni. S1a **non** ha toccato i blocchi GS1, NFC ed etichette di quelle schermate (controllato con `git diff 4b94e4c`): cambiano solo gli scaffali e i controlli dei codici.

---

## 0. In breve

1. **La catena QR/NFC → app non funziona.** La Scheda mostra un QR con il link GS1, e la Scheda scrive lo stesso link sul tag NFC. Ma lo Scanner, l'inserimento a mano e tutte le automazioni cercano solo lo SKU o l'id. Il link dà «Codice Non Riconosciuto» (provato sul web). Quindi l'app non sa leggere i codici che crea lei stessa. È la risposta più importante al «non so se funzionano».
2. **Il link GS1 non è conforme allo standard.**
   - Nel posto del GTIN c'è lo SKU («VIS-0142», anche «ABC 12/ü»), mai controllato.
   - Il lotto è in `?10=` invece che nel percorso, e può contenere spazi e virgole («Pellicceria Bianchi, Milano»).
   - Il seriale progressivo si ripete.
   - Il GS1 non si può spegnere.

   Tutto provato sul web, salvo il posto del lotto, che è letto nel codice.
3. **P10 è chiuso** (la ricarica non sovrascrive il dominio) e **P01 è chiuso solo in parte** (provato, `a4-gs1` rilanciato).
   - Una Modifica senza cambiamenti non tocca più il link.
   - Ma se si accende il Lotto, si sceglie il campo o si cambia lo SKU, il link di un prodotto che ha già etichette e tag si riscrive al primo salvataggio (NG27, provato).
   - Difetto nuovo: **la Modifica aggiunge in silenzio un link ai prodotti che non l'avevano**. Dopo, sparisce il pulsante dell'etichetta (P27), come si è visto con PUZ-0012.
4. **Scanner & NFC: 4 controlli su 5 non hanno effetto** (D19, provato). L'unico che fa qualcosa è il test, e sul web dice «Errore».
5. **NFC**:
   - si scrive solo dalla Scheda, solo per i prodotti con il link, in due passi;
   - c'è la gara 500/1000 ms descritta da N0, riconfermata nel codice;
   - la lettura NFC non esiste;
   - i tag delle posizioni e delle categorie sono campi dichiarati e mai usati;
   - il tag dello scaffale (S1a) è testo scritto a mano, che lo Scanner non riconosce (provato).
6. **Etichette e stampa**:
   - solo i prodotti senza link hanno l'etichetta (P27, provato);
   - PDF ed etichetta sul web vanno in errore (provato);
   - i codici del PDF e dell'etichetta arrivano da servizi esterni (D16, letto nel codice);
   - posizioni, categorie e scaffali hanno il QR solo sullo schermo, senza stampa.
7. **Difetto nuovo che rovina dati (Posizioni).** Si tocca l'icona QR di un'altra riga mentre si modifica una posizione, poi si salva: due posizioni finiscono con lo stesso codice (provato). Nelle Cartelle il codice è uguale, ma lì il difetto è solo letto nel codice.
8. **Perché le due schermate sembrano vecchie**: 14 controlli su due pagine, tre quarti senza effetto o da specialisti, e 20 parole tecniche («AI 01», «Endpoint», «UUID», «Legacy»…).
9. **Proposta**:
   - un solo «codice» per ogni cosa (prodotto, posizione, scaffale, categoria), che QR, barcode e tag NFC portano uguale;
   - un solo lettore che riconosce tutti i formati, vecchi compresi;
   - una sola finestra «Codice ed etichetta», con Stampa e Scrivi tag;
   - due schermate di impostazioni con 2-3 scelte ciascuna, il resto sotto «Avanzate».

---

## 1. Impostazioni › GS1 Digital Link (`Gs1ConfigScreen`)

### 1.1 Stato attuale, controllo per controllo

La configurazione sta in `contexts/GS1ConfigContext.tsx` (chiave `furinventory_gs1_config:{org}`, `:7`, `:32`, `:47`; alla lettura si unisce ai valori predefiniti, `:36`). I valori predefiniti sono in `utils/gs1.ts:11-17`.

| Controllo | Che cosa fa | Chi lo legge | Etichetta |
| --- | --- | --- | --- |
| Riquadro informativo | Solo testo: «Genera automaticamente un URL… QR Code e tag NFC» (`Gs1ConfigScreen.tsx:68-78`) | — | letto nel codice |
| **Dominio Base** (campo) | Si salva all'uscita dal campo; un campo vuoto diventa il predefinito `https://syncroflow.app/id` (`:31-33`). La ricarica non lo sovrascrive più (`:29`, P10 chiuso) | Aggiungi (`AddScreen.tsx:235`) e Modifica (`EditScreen.tsx:177`) solo come «c'è un dominio?»; poi `generateGS1DigitalLink`/`keepGS1DigitalLink` (`utils/gs1.ts:75`, `:94`) | provato (`a4-gs1-salva`, `a4-gs1-da-impostazioni`) |
| **AI 01 GTIN / EAN** («Obbligatorio», lucchetto) | Nessuna azione. Dice «Mappato sul campo SKU» (`:106-123`) | Il GTIN del link è sempre lo SKU (`AddScreen.tsx:241`, `EditScreen.tsx:181`) | letto nel codice |
| **AI 21 Numero Seriale** (interruttore) | `enableSerial` (`:137-142`) | `generateGS1DigitalLink` (`utils/gs1.ts:100-103`), `keepGS1DigitalLink` (`:77`) | provato (`ng-gs1-spegni`: senza seriale il link è `…/01/ABC%2012%2F%C3%BC`) |
| **UUID / Progressivo** (segmenti) | `serialMode` (`:146-174`) | `generateSerial` (`utils/gs1.ts:35-46`): progressivo = numero dei prodotti + 1; UUID = tempo + caso | provato (`a4-gs1-aggiungi`, `ng-progressivo-doppio`) |
| **AI 10 Lotto** (interruttore) | `enableLotto` (`:189-194`) | Aggiungi e Modifica leggono il valore del campo scelto (`AddScreen.tsx:236-238`, `EditScreen.tsx:178-180`); il link diventa `?10=` (`utils/gs1.ts:106-108`, `:79`) | provato in Modifica (`ng-lotto-modifica`: `…/21/000142?10=Pellicceria%20Bianchi%2C%20Milano`); in Aggiungi è letto nel codice |
| **Campo Mappato** (chip) | `lottoFieldId` (`:198-227`). Propone i campi personalizzati di testo corto **e lungo** (`:38-40`): nel campionario Fornitore, Codice CITES e «Storia, provenienza e lavorazioni…» | come sopra | provato (`ng-gs1-lotto`) |
| **Anteprima stringa** | Link d'esempio con GTIN `8001234567890` (`utils/gs1.ts:116-126`) | — | provato |
| **Ripristina Predefiniti** | Conferma, poi i valori predefiniti (`:42-58`, `:271-274`) | — | provato (`a4-gs1-ripristina`) |

### 1.2 Dove finisce il link nel resto dell'app

| Punto | Che cosa succede | Etichetta |
| --- | --- | --- |
| Aggiungi | Crea **sempre** il link, perché il dominio non è mai vuoto: GTIN = SKU, più seriale, più l'eventuale lotto (`AddScreen.tsx:233-245`, `:264`). Lo fa anche per gli articoli a quantità, a cui un seriale di unità non serve | provato (`a4-gs1-aggiungi`); il caso «quantità» è letto nel codice |
| Modifica | Tiene il link se SKU e lotto non cambiano (`EditScreen.tsx:175-182`, `utils/gs1.ts:73-74`, test `__tests__/gs1Keep.test.ts`). Altrimenti lo ricostruisce con il dominio di oggi e lo stesso seriale (`:75-80`). **Se il link non c'è, lo crea** (`:71`) | provato (`ng-modifica-link`, `a4-gs1-modifica` `uguale: true`, `ng-lotto-modifica`); da riconfermare dopo S1a |
| Scheda | Il QR contiene il link (`DetailScreen.tsx:1233-1240`), più «Copia link» (`:771-776`) e «Programma tag» (`:1254-1257`). Senza link compare «Mostra SKU QR (Legacy)» (`:1260-1267`) | provato (`ng-etichetta`) |
| Etichetta e PDF | QR e barcode contengono lo **SKU**, non il link (`:281`, `:334`, `:734`, `:739`) | letto nel codice |
| Tag NFC | Contiene il link (`DetailScreen.tsx:794`, `utils/nfcService.ts:74-76`) | letto nel codice |
| CSV | Colonna «GS1 Digital Link», esportata e reimportata così com'è (`utils/productCsv.ts:16`, `:70`, `:135`, `:200`) | letto nel codice |
| **Scanner, inserimento a mano, galleria** | Cercano `sku === data` o `id === data` (`ScannerScreen.tsx:48`, `:141-144`, `:206-209`). **Il link non è riconosciuto** | **provato** (`ng-scanner-gs1`: «Codice Non Riconosciuto»; `ng-scanner-manuale-gs1`: «Prodotto Non Trovato»; il controllo con lo SKU apre l'Azione rapida); da riconfermare dopo S1a |
| Automazioni | `getProductBySku` cerca lo SKU esatto (`InventoryContext.tsx:580-582`). Lo usano Audit (`AuditScreen.tsx:116`, `:139`), Spostamento rapido (`BatchMoveScreen.tsx:140`), Esecuzione (`CustomRunnerScreen.tsx:162-163`), QuickTag (`QuickTagScreen.tsx:61`) e Vendita flash (`ScanSellScreen.tsx:46-48`) | **provato** per Vendita flash (`ng-vendita-gs1`: «Prodotto non trovato», nessuna vendita); per le altre è letto nel codice |
| Fuori dall'app | Con la fotocamera del telefono si apre `https://syncroflow.app/id/01/…` nel browser. Nel progetto niente risponde a quell'indirizzo, e il manifest accetta solo `syncroflow://` (`android/app/src/main/AndroidManifest.xml:22-27`) | dedotto (il dominio non è stato interrogato) |

### 1.3 Il link è conforme al GS1 Digital Link?

Fonte: GS1 Digital Link URI Syntax (`ref.gs1.org/standards/digital-link/uri-syntax/`), letta oggi **tramite sintesi automatica** dei primi 100 000 caratteri della pagina. Citazioni e numeri di paragrafo vanno quindi ricontrollati sul testo prima di scriverli nel codice, come in N0 per AOSP. La grammatica è `gtin-path = gtin-comp [cpv-comp] [lot-comp] [ser-comp]`. L'esempio dello standard è `https://id.gs1.org/01/09520123456788/10/ABC1/21/12345?17=180426`.

| Regola dello standard | App oggi | Etichetta |
| --- | --- | --- |
| Il GTIN è di 14 cifre; GTIN-8, -12 e -13 si completano con zeri a sinistra («`gtin-value` = 14DIGIT», §4.5 e §4.12) | Mette lo SKU così com'è: `VIS-0142`, `LOG-2026-001`, anche `ABC%2012%2F%C3%BC`. `validateGTIN` controlla solo che non sia vuoto (`utils/gs1.ts:23-28`) e **nessuno lo chiama** | provato (`ng-gs1-spegni`), letto nel codice |
| Cifra di controllo valida (rimanda alle General Specifications, §4.13) | Mai controllata. Anche il GTIN dell'anteprima, `8001234567890`, è sbagliato: la cifra giusta è 7 | dedotto (calcolo) |
| Lotto (AI 10) e seriale (AI 21) sono qualificatori **nel percorso**, in quest'ordine: 22, poi 10, poi 21 («the sequence… must be preserved», §4.9). Il lotto nella query è previsto solo con un SSCC | Lotto in `?10=` (`utils/gs1.ts:106-108`, `:79`, `:122-124`) | letto nel codice e nello standard |
| Seriale e lotto: da 1 a 20 caratteri di un insieme di 82 (§4.6) | Seriale UUID di 15 caratteri: va bene. Il lotto non ha limiti: in `ng-lotto-modifica` è «Pellicceria Bianchi, Milano», 27 caratteri con spazi e virgola, e può venire anche da un campo di testo lungo («Storia, provenienza…») | provato (`ng-lotto-modifica`, `ng-gs1-lotto`) |
| Dominio qualunque, ma senza promessa di un resolver («Applications SHALL NOT assume… a resolver», §2) | Il predefinito `syncroflow.app/id` non ha un resolver nel progetto | dedotto |
| Prodotti senza GTIN | Lo standard vale per le chiavi GS1: senza GTIN non c'è un GS1 Digital Link vero. GS1 prevede anche numeri «a circolazione ristretta» per l'uso interno; quali prefissi e con che regole va confermato con GS1 Italy (non verificato oggi) | dedotto |

**Conclusione**: oggi il link ha la forma di un GS1 Digital Link, ma non lo è per nessun prodotto del campionario, perché nessuno ha un GTIN vero. Funziona come «link interno», che però l'app non sa rileggere.

### 1.4 Difetti, con i passi

| N | Difetto | Passi | Etichetta |
| --- | --- | --- | --- |
| NG01 | L'app non legge i suoi link: Scanner, inserimento a mano, galleria e automazioni rifiutano il link GS1 | Scanner › leggere (o scrivere a mano) `https://syncroflow.app/id/01/VIS-0142/21/000142` → «Codice Non Riconosciuto» / «Prodotto Non Trovato». Vendita flash › Scansiona › stesso link → «Prodotto non trovato» | provato (`ng-scanner-gs1`, `ng-scanner-manuale-gs1`, `ng-vendita-gs1`); da riconfermare dopo S1a |
| NG02 | La Modifica aggiunge in silenzio un link ai prodotti che non l'avevano, a ogni salvataggio, anche senza cambiare nulla. Dopo sparisce «Mostra SKU QR» e quindi l'etichetta (P27). La Scheda lo dice, «Modifica e salva il prodotto per generarlo» (`DetailScreen.tsx:1262`), ma non è una scelta dell'utente | PUZ-0012 › Modifica › Salva Modifiche → `gs1DigitalLink` passa da `null` a `…/01/PUZ-0012/21/MWSOQIGJ-24QGXO`; nella Scheda «Mostra SKU QR» non c'è più | provato (`ng-modifica-link`); da riconfermare dopo S1a |
| NG03 | Seriale progressivo doppio: vale numero dei prodotti + 1, conta anche il cestino e non tiene conto dei seriali già usati | GS1 › Progressivo; Modifica e salva PUZ-0012 → `…/21/000007`; poi Aggiungi un prodotto → `LOG-2026-001/21/000007`. Due prodotti con lo stesso seriale (VIS-0142 ha già `000142`) | provato (`ng-progressivo-doppio`); `utils/gs1.ts:39-41`, `AddScreen.tsx:242`, `EditScreen.tsx:181` |
| NG04 | Il GS1 non si spegne, e il campo mente: vuoto sullo schermo mentre resta salvato il dominio predefinito | GS1 › svuotare Dominio Base, uscire dal campo → il campo resta vuoto, ma `baseUrl` = `https://syncroflow.app/id`; Aggiungi crea comunque il link | provato (`ng-gs1-spegni`); `Gs1ConfigScreen.tsx:29`, `:31-33`, `AddScreen.tsx:235` |
| NG05 | GTIN non controllato: qualunque SKU va in `/01/`, con caratteri codificati | Aggiungi con SKU «ABC 12/ü» → `…/01/ABC%2012%2F%C3%BC` | provato (`ng-gs1-spegni`) |
| NG06 | Lotto nella query (`?10=`) invece che nel percorso `/10/{lotto}` prima di `/21/` | lettura di `utils/gs1.ts:106-108` | letto nel codice e nello standard |
| NG07 | L'anteprima mostra un lotto che il link vero non avrà (Lotto acceso, nessun campo scelto) e un GTIN d'esempio con la cifra di controllo sbagliata | GS1 › Lotto acceso → anteprima `…/21/M5X2K-A3B7?10=LOTTO-2026A` con `lottoFieldId: ""` | provato (`ng-gs1-lotto`, `a4-gs1-salva`), già annotato in `esito-a4` n. 11 |
| NG08 | Si può scegliere come lotto un campo di testo lungo; nessun limite di 20 caratteri | GS1 › Lotto › compaiono «Storia, provenienza…» | provato (`ng-gs1-lotto`); `Gs1ConfigScreen.tsx:38-40` |
| NG09 | Articoli a quantità con un seriale di unità nel link | Aggiungi con quantità: il link ha comunque `/21/` | letto nel codice (`AddScreen.tsx:233-245`, nessun controllo su `qty`) |
| NG10 | Link verso un dominio senza resolver e senza App Links: un cliente che inquadra il QR, o un telefono che legge il tag, apre una pagina che nel progetto non esiste | — | dedotto |
| NG27 | **Un'impostazione globale riscrive i link già fatti.** Si accende il Lotto e si sceglie un campo (o si cambia lo SKU): al primo salvataggio in Modifica il link salvato cambia (stesso seriale, lotto nuovo nella query), mentre etichette e tag già fatti portano ancora il link vecchio. Si spegne il Lotto e il link cambia di nuovo | GS1 › Lotto acceso › Fornitore; VIS-0142 › Modifica › Salva → `…/21/000142?10=Pellicceria%20Bianchi%2C%20Milano`; Lotto spento › Salva → `…/21/000142` | provato (`ng-lotto-modifica`); `utils/gs1.ts:73-80`; da riconfermare dopo S1a |

### 1.5 Che cosa manca

- Un **lettore unico** che riconosca il link (qualunque dominio, con o senza `?10=`), lo SKU, il GTIN letto da un EAN-13 o un UPC-A (12 cifre: oggi non coincide con uno SKU di 13), e le stringhe GS1 di GS1-128 e DataMatrix. Oggi lo Scanner non legge DataMatrix né ITF-14, che si trovano sui cartoni dei fornitori (`ScannerScreen.tsx:294`, `components/BarcodeScanner.tsx:69`).
- Un posto per il **GTIN vero**, separato dallo SKU, con il controllo della cifra.
- La scelta **«nessun link»**.
- La creazione del link su richiesta, non a ogni salvataggio.
- Una pagina che risponda al link: fuori dall'app, da decidere con l'utente.

### 1.6 Proposta («il modo più giusto e corretto e semplificato»)

1. **`utils/codeResolver.ts` (nuovo, funzione pura con test jest).** Prende un testo (QR, barcode, testo NFC, UID di un tag) e gli elenchi di prodotti, posizioni, categorie, scaffali e automazioni. Restituisce `{tipo, id}`, «nel cestino» oppure «sconosciuto». Riconosce, in quest'ordine:
   1. il link salvato identico, anche nelle versioni precedenti dello stesso prodotto (NG27);
   2. il link GS1 scomposto con qualunque dominio (`/01/…`, poi `/10/` o `?10=`, poi `/21/`), confrontando **GTIN (o SKU) e seriale insieme**. Il seriale da solo vale solo se un solo prodotto lo ha, il GTIN da solo solo se è di un solo prodotto: con NG03 due prodotti hanno già `/21/000007`;
   3. SKU e id, senza maiuscole;
   4. GTIN normalizzato a 14 cifre, se è di un solo prodotto;
   5. le stringhe GS1 (`]C1`, `]d2`, `(01)…(21)…`, separatore FNC1);
   6. i codici e i tag di posizioni, categorie e scaffali;
   7. `AUTO:`;
   8. `syncroflow://`.

   Più risultati possibili danno «ambiguo», con la scelta tra i prodotti, mai il primo a caso. Lo usano lo Scanner, le 5 automazioni e la lettura NFC (N1). È l'«unica strada del codice a barre» già scritta nel ticket 18.
2. **`utils/gs1.ts`**:
   - aggiungere `isValidGTIN` e `toGTIN14`;
   - il lotto nel percorso (`/01/{gtin}/10/{lotto}/21/{seriale}`);
   - il seriale di un pezzo unico è lo SKU, se rispetta i 20 caratteri: stabile, mai doppio, leggibile, e il contatore non serve più;
   - nessun seriale per gli articoli a quantità.

   `keepGS1DigitalLink` resta com'è per i link già fatti.
3. **GTIN separato dallo SKU.** Campo facoltativo «EAN / GTIN» nel prodotto, che si può anche leggere dal barcode del fornitore. Se manca e lo SKU è un GTIN valido, si usa lo SKU. Un prodotto **senza GTIN non riceve un link GS1**: il suo QR e il suo tag portano il codice. Se l'utente vuole lo stesso una pagina per i clienti, la proposta da confermare è `{dominio}/p/{SKU}`.
4. **Link solo su richiesta, e mai riscritti da un'impostazione.**
   - Modifica non crea più link da sola. Si toglie il ramo «nessun link» di `keepGS1DigitalLink` dalla Modifica; vanno cambiati con lui il test che oggi lo fissa (`__tests__/gs1Keep.test.ts:33-35`) e il testo della Scheda «Modifica e salva il prodotto per generarlo» (`DetailScreen.tsx:1262`).
   - Un cambio di lotto o di impostazioni non riscrive un link già fatto (NG27). Lo riscrive solo un cambio dello SKU, con un avviso «etichette e tag già fatti restano leggibili dall'app».
   - Aggiungi crea il link solo in modalità «Link».
   - Nella Scheda c'è «Crea link» per un prodotto che non l'ha.
5. **Schermata nuova**: vedi il punto 5.2.
6. **File da toccare**:
   - `utils/gs1.ts` e `__tests__/gs1Keep.test.ts` (più casi nuovi);
   - `utils/codeResolver.ts` e il suo test (nuovi);
   - `contexts/GS1ConfigContext.tsx` (campo `mode`, unito ai valori predefiniti come oggi, `:36`);
   - `src/screens/settings/Gs1ConfigScreen.tsx`;
   - `src/screens/tabs/AddScreen.tsx`, `src/screens/product/EditScreen.tsx`, `src/screens/product/DetailScreen.tsx`;
   - `src/screens/ScannerScreen.tsx` e le 5 automazioni;
   - `contexts/InventoryContext.tsx` (`getProductBySku` lascia il posto al lettore);
   - `types/index.ts` (`gtin?`).

   AddScreen, EditScreen, DetailScreen, Scanner, `InventoryContext` e `types/index.ts` sono file di S1a: da fare dopo il suo commit.
7. **Rischi per i dati**:
   - **mai riscrivere un `gs1DigitalLink` salvato**: etichette e tag già fatti devono restare validi, e li legge il lettore;
   - nessuna migrazione di massa;
   - i link vecchi con `?10=` e con lo SKU al posto del GTIN restano leggibili;
   - la scelta del modo predefinito cambia che cosa ricevono i prodotti **nuovi**: è la domanda 1.

### 1.7 Come si proverebbe

Scenari per una prova `prova/<fetta>.cjs` (per esempio `g1-codici.cjs`):
- `g1-scanner-link`: lettura simulata del link di VIS-0142 → Azione rapida di VIS-0142. Stesso link con un dominio diverso, e con `?10=`, → stesso prodotto.
- `g1-scanner-ean`: un prodotto con GTIN `8001234567897`; letture di `8001234567897`, `08001234567897` e `(01)08001234567897` → stesso prodotto.
- `g1-automazioni-link`: Vendita flash, Spostamento rapido, Audit, QuickTag ed Esecuzione con il link → riconosciuto; un prodotto nel cestino → rifiutato come oggi.
- `g1-modifica-senza-link`: PUZ-0012 › Modifica › Salva → nessun link nuovo, l'etichetta resta.
- `g1-modifica-con-link`: VIS-0142 › Salva → link identico (oggi `a4-gs1-modifica`).
- `g1-aggiungi-gtin`: GTIN valido → link `/01/{14 cifre}/21/{SKU}`; GTIN con la cifra sbagliata → avviso, nessun salvataggio del GTIN; senza GTIN → nessun link.
- `g1-lotto`: lotto nel percorso; campo di testo lungo non proposto; oltre 20 caratteri o fuori dall'insieme di 82 → avviso.
- `g1-lotto-non-riscrive` (oggi `ng-lotto-modifica`): Lotto acceso con un campo, poi Modifica di VIS-0142 → il link salvato resta identico.
- `g1-seriali-doppi`: due prodotti con `/21/000007` (dati preparati in localStorage) → la lettura del link di uno apre quello giusto, oppure chiede quale.
- `g1-quantita`: un articolo a quantità non ha `/21/`.
- `g1-spegni`: modo «Codice» → Aggiungi senza link; il campo mostra ciò che è salvato.

Regressioni da rilanciare: `a4-gs1.cjs`, `a3-scanner.cjs`, `a3-scansell.cjs`, `a3-batchmove.cjs`, `a3-audit.cjs`, `a3-quicktag.cjs`, `a3-chat.cjs` (usa `getProductBySku`), `a1-modifica.cjs`, `a2-aggiungi.cjs`, `a2-csv.cjs`, `m08-csv.cjs`, `s1-scaffali.cjs`, più jest `gs1Keep.test.ts`.

Sul telefono: inquadrare con lo Scanner il QR della Scheda (oggi «Codice Non Riconosciuto», come sul web), un EAN-13 vero e un DataMatrix GS1.

---

## 2. Impostazioni › Scanner & NFC (`HardwareScreen`)

### 2.1 Stato attuale, controllo per controllo

Preferenze in `contexts/HardwareConfigContext.tsx` (chiave `furinventory_hardware_config:{org}`, `:6`; valori predefiniti `scanMode: 'both'` e `autoWriteNfcOnSave: false`, `:15-18`).

| Controllo | Che cosa promette | Chi lo legge | Etichetta |
| --- | --- | --- | --- |
| Riquadro «Scanner & Hardware» | Testo (`HardwareScreen.tsx:63-73`) | — | letto nel codice |
| **Solo QR / Solo NFC / Entrambi** (`:75-87`) | «quale hardware attivare quando apri la fotocamera» | **Nessuno.** `scanMode` compare solo qui e nel residuo `app/`. Con «Solo NFC» lo Scanner resta identico | **provato** (`ng-hw-solo-nfc`, `a4-hw-salva`); letto nel codice (`git grep`) |
| **Scrittura Automatica NFC** (`:89-110`) | «dopo aver salvato un nuovo prodotto ti verrà chiesto… (Pulizia + Scrittura)» | **Nessuno.** Aggiungi non lo legge | provato (si salva e resta dopo la ricarica, `a4-hw-salva`); letto nel codice |
| **Test Stato Sensore NFC** (`:112-121`, `:20-36`) | Diagnostica | `nfcService.isSupported` e `isEnabled`: dice se c'è e se è acceso, ma **non legge un tag** | provato sul web: «Errore durante la verifica dello stato NFC.» (`a4-hw-test-nfc`); sul telefono non provato |
| Ripristino | — | `resetHwConfig` esiste (`HardwareConfigContext.tsx:69-72`), ma la schermata non lo usa (`HardwareScreen.tsx:18`) | letto nel codice |

### 2.2 Difetti, con i passi

| N | Difetto | Passi | Etichetta |
| --- | --- | --- | --- |
| NG11 (= D19) | `scanMode` e `autoWriteNfcOnSave` si salvano, ma nessuno li legge | Scanner & NFC › Solo NFC → Scanner: stessa fotocamera, stessi pulsanti, nessun NFC | provato (`ng-hw-solo-nfc`) |
| NG12 | Sul web la diagnostica dice «Errore» invece di «non disponibile sul web»; sul telefono non prova una lettura vera | Scanner & NFC › Test | provato sul web; sul telefono non provato |
| NG13 | I testi promettono funzioni che non esistono: la scrittura automatica e «Pulizia + Scrittura» | — | letto nel codice |

### 2.3 Che cosa manca

- Il comando «Leggi tag NFC» nello Scanner e nelle automazioni (ticket 16).
- I tempi della lettura in serie (ticket 17).
- Una diagnostica che legge un tag e ne mostra contenuto e UID.
- Lo stato della funzione «zittisci Android» (N0).
- Il ripristino dei valori predefiniti.

### 2.4 Proposta

Vedi il punto 5.3 per la schermata. Per il codice valgono le fette N1 e N2 già disegnate in N0 (`ricerche/N0-nfc.md` §4), con due aggiunte:

1. «Solo fotocamera» nasconde il pulsante NFC. «Solo NFC» apre lo Scanner con «Avvicina il tag» e la fotocamera spenta. «Tutti e due», il predefinito, mostra la fotocamera e il pulsante «Leggi tag NFC».
2. «Dopo un prodotto nuovo, proponi di scrivere il tag»: dopo il salvataggio compare una finestra con un solo tocco di scrittura.

File: `contexts/HardwareConfigContext.tsx`, `src/screens/settings/HardwareScreen.tsx`, `src/screens/ScannerScreen.tsx`, `src/screens/tabs/AddScreen.tsx`, `utils/nfcService.ts`, `utils/nfcService.web.ts` (nuovo), `utils/nfcGate.ts` (nuovo).

Rischi per i dati: nessuno. Le preferenze nuove si uniscono ai valori predefiniti (`HardwareConfigContext.tsx:46`).

### 2.5 Come si proverebbe

- Sul web, scenario `n1-preferenze`:
  - lo Scanner non ha comandi NFC, qualunque sia la preferenza salvata;
  - la diagnostica dice «Non disponibile sul web»;
  - «Ripristina» riporta i valori predefiniti.

  Sul web seguo il ticket 16 («i comandi NFC non compaiono»). N0 §5 proponeva invece pulsanti visibili ma disattivati: è un contrasto da chiudere in N1.
- Regressioni: `a4-hardware.cjs`, `a3-scanner.cjs`.
- Sul telefono: la tabella di N0 §6 (P1-P12), più la prova del punto 3.5.

---

## 3. Scheda › Programma NFC e la prova NFC

### 3.1 Stato attuale

`utils/nfcService.ts`:
- crea un unico oggetto quando il file viene caricato (`:131`) e avvia `NfcManager.start()` (`:4-15`);
- `cleanTag` (`:33-61`): richiede la tecnologia `Ndef`, scrive un record vuoto e chiude **senza `await`** (`:58`);
- `writeGS1Uri` (`:67-92`): richiede `Ndef`, scrive un record URI e chiude senza `await` (`:89`);
- `readTag` (`:97-128`) e `cancel` (`:25-27`) non hanno chiamanti;
- su Android `alertMessage` non viene mostrato (N0 §1.1).

Scheda › «Programma tag» (`DetailScreen.tsx:778-805`):
1. pulisce (`:786`);
2. se la pulizia è riuscita, **dopo 500 ms** scrive il link (`:793-800`).

Il pulsante c'è solo se il prodotto ha il link (`:1230`, `:1254-1257`).

Libreria `react-native-nfc-manager` 3.17.2 (`node_modules/.../src/NfcManagerAndroid.js`):
- `requestTechnology` registra l'ascolto se non c'è e segna la pulizia (`:32-38`);
- `cancelTechnologyRequest` **aspetta 1000 ms** (`delayMsAndroid = 1000`, `:47`, `:53`) e poi toglie la registrazione.

Prova in Impostazioni: solo «supportato» e «acceso» (punto 2.1).

### 3.2 Difetti, con i passi

| N | Difetto | Passi | Etichetta |
| --- | --- | --- | --- |
| NG14 | **Gara 500/1000 ms** (N0 §1.4), riconfermata nel codice di `4b94e4c`. La scrittura parte a t0+500 ms e riusa la registrazione ancora viva; a t0+1000 ms la pulizia del primo passo la toglie; la scrittura resta appesa, senza messaggio, e il tentativo dopo dà «You can only issue one request at a time» | Telefono: Scheda VIS-0142 › Programma tag › avvicinare il tag; dopo la pulizia sollevarlo e riavvicinarlo | letto nel codice; **non provato, serve il telefono** (N0 P11) |
| NG15 | Programma tag solo per i prodotti con il link: 5 prodotti su 6 del campionario non possono avere un tag. Dopo NG02 lo diventano, ma solo modificandoli | Scheda PUZ-0012: nessun «Programma tag» | provato (`ng-etichetta`) |
| NG16 | **La lettura NFC non esiste**: nessun «Leggi tag», `readTag` senza chiamanti. Anche se scritto bene, un tag non serve a nulla dentro l'app | — | letto nel codice; conferma N0 |
| NG17 | **Posizioni e categorie**: `nfcTag` è dichiarato (`LocationsContext.tsx:14`, `InventoryContext.tsx:26`) ma mai letto né scritto; le schermate dicono «Barcode / NFC (Opzionale)» (`LocationsScreen.tsx:187`, `FoldersScreen.tsx:198`), ma il campo è solo il barcode | — | letto nel codice; da riconfermare dopo S1a |
| NG18 | **Scaffali (copia di lavoro S1a)**: il tag NFC è un testo scritto a mano («Es. 04:A2:3B:1C»), che l'utente non ha modo di conoscere; `shelfByCode` non lo cerca (`utils/shelves.ts:295-297` a `7bfcd72`) | Impostazioni › Scaffali › Nuovo «A1» in Magazzino › Genera codice (`SCAF-MAGAZZINO-A1`) › Tag `04:A2:3B:1C` › Crea; Scanner: il codice apre SCAFFALE, il tag dà «Codice Non Riconosciuto» | provato (`ng-scaffale-qr`); scelta annotata in `DECISIONI_DA_RIVEDERE.md:102`; da riconfermare dopo S1a |
| NG19 | Sul web «Programma tag» dice «Operazione Annullata — Pulizia del tag non completata» invece di «non disponibile» | Scheda VIS-0142 › Programma tag | provato (`ng-nfc-scheda`) |
| NG20 | Rischi della libreria: la 3.x è dichiarata solo per la vecchia architettura («`v3` only supports legacy architecture», `node_modules/react-native-nfc-manager/README.md`), mentre il progetto ha `newArchEnabled=true` (`android/gradle.properties:38`) | Telefono: Scanner & NFC › Test | **non provato, serve il telefono** (N0 P1) |

### 3.3 Che cosa manca

- Lettura su richiesta.
- Scrittura in un tocco.
- Scrittura e lettura per posizioni, categorie e scaffali.
- Registrazione dell'UID di un tag già scritto o bloccato.
- Una finestra dell'app «Avvicina il tag», con tempo limite e Annulla.
- La funzione «zittisci Android» (N0 §2.a).
- Un comportamento chiaro sul web.

### 3.4 Proposta

È il disegno di N0, §4, da non rifare. Le aggiunte per questa area:

1. **Che cosa si scrive sul tag**:
   - per un prodotto in modo «Link», il link (record URI);
   - in tutti gli altri casi (posizioni, scaffali, categorie, prodotti in modo «Codice»), **il codice come record di testo** (`SCAF-MAGAZZINO-A1`).

   Insieme si salva l'**UID** del tag in `nfcTag`, così funziona anche un tag già scritto o bloccato. Il lettore (punto 1.6) cerca prima il testo, poi l'UID.
2. **Un tocco solo**: `writeNdefMessage` sostituisce l'intero messaggio, quindi la pulizia prima non serve (N0 §4.7). «Pulisci tag» resta in Avanzate.
3. **«Collega un tag»**, per i tag che non si possono scrivere: legge solo l'UID e lo salva. Sostituisce il campo da scrivere a mano degli scaffali.
4. Controllo dei doppioni anche sugli UID, con la funzione `codeOwner` di S1a allargata (`utils/shelves.ts:270-292` a `7bfcd72`).

File:
- `utils/nfcService.ts`, `utils/nfcCore.ts`, `utils/nfcGate.ts`, `utils/nfcDecode.ts`, `utils/nfcService.web.ts` (da N0);
- `components/CodeSheet.tsx` (nuovo, punto 4.4);
- `src/screens/product/DetailScreen.tsx`;
- `src/screens/settings/LocationsScreen.tsx`, `FoldersScreen.tsx`, `ShelvesScreen.tsx`;
- `contexts/LocationsContext.tsx`, `contexts/InventoryContext.tsx` (`Library.nfcTag`), `utils/shelves.ts`.

Rischi per i dati:
- scrivere su un tag che contiene già qualcosa: si mostra il contenuto letto e si chiede conferma prima di sovrascriverlo;
- un `nfcTag` già scritto a mano negli scaffali resta com'è: se è un UID vero, il lettore lo trova.

### 3.5 Come si proverebbe

- **jest**: le 12 prove di N0 §4.6, più queste:
  - il lettore trova uno scaffale dal testo del tag e dall'UID;
  - un UID già usato da un'altra cosa viene rifiutato.
- **Web** (`n1-web.cjs`):
  - nessun comando NFC (Scheda, Scaffali, Scanner), come dice il ticket 16;
  - nessun «Errore» o «Annullata»;
  - la lettura simulata (`scan()` di `a3-util.cjs`) di `SCAF-…` apre lo scaffale.
- **Telefono, prima di N1** (sul codice di oggi):
  1. Impostazioni › Scanner & NFC › Test → atteso «Sensore NFC supportato e attivo». Conferma che la libreria carica con la nuova architettura (N0 P1).
  2. Scheda VIS-0142 › Programma tag: tag appoggiato, poi sollevato e riappoggiato → atteso: il secondo passo non parte e Android prende il tag (N0 P11).
  3. Se una scrittura riesce, avvicinare il tag con l'app aperta e con l'app chiusa → atteso: il browser apre `syncroflow.app/id/…`.
  4. Scanner dell'app sul QR della Scheda → atteso «Codice Non Riconosciuto», come sul web.
  5. Comandi utili: `adb install -r` della build di debug (`map-2.md`), `adb logcat -s ReactNativeNfcManager`.
- **Telefono, dopo N1**:
  - N0 P2-P12;
  - Scaffali › A1 › Scrivi tag → Scanner › Leggi tag NFC → scheda dello scaffale;
  - un tag bloccato › Collega un tag → riconosciuto dall'UID;
  - un tag già scritto con un altro codice → conferma prima della sovrascrittura.

---

## 4. QR ed etichette: dove nascono e dove si stampano

### 4.1 Stato attuale

| Cosa | Contenuto del QR / barcode | Dove nasce | Stampa / condivisione | Etichetta |
| --- | --- | --- | --- | --- |
| Prodotto con link | **link GS1** (QR sullo schermo) | Aggiungi o Modifica (punto 1.2) | Nessuna etichetta: «Mostra SKU QR» non c'è (`DetailScreen.tsx:1230-1259`). Solo il PDF della Scheda | provato (`ng-etichetta`: `pulsanteEtichetta: false`) |
| Prodotto senza link | **SKU** (QR o Code128, `:1329-1344`) | lo SKU | «Mostra SKU QR (Legacy)» › Stampa Etichetta (`:1350-1354`, `:239-351`): HTML con script presi da `cdn.rawgit.com` (`:278`) e `cdn.jsdelivr.net` (`:332`), poi `Print.printToFileAsync` e condivisione | provato sul web: «Impossibile stampare l'etichetta»; sul telefono non provato |
| PDF della Scheda | **SKU** in QR e Code128 da `api.qrserver.com` (`:734`) e `barcodeapi.org` (`:739`) | — | `:353-769`; titolo «FurInventory Pro» (`:648`, D07); nessun campo personalizzato (0 occorrenze di `customData` in `:353-760`) | provato sul web: «Impossibile generare il PDF» (`TypeError … 'uri'`); D16 letto nel codice |
| Posizione | `barcode` (`LOC-{ID}`, `LocationsScreen.tsx:125-133`) o un codice letto con la fotocamera (`:135-139`) | Impostazioni › Posizioni | Solo una finestra con il QR (`:262-272`), niente stampa né condivisione | letto nel codice; da riconfermare dopo S1a |
| Categoria (cartella) | `barcode` (`LIB-{NOME}-{4 cifre dell'ora}`, `FoldersScreen.tsx:93-100`). Alla creazione non si salva (`:86-87`, avviso `:237-241`) | Impostazioni › Cartelle | Solo una finestra con il QR (`:302-312`) | letto nel codice (`esito-a4`); da riconfermare dopo S1a |
| Scaffale (copia di lavoro) | `barcode` (`SCAF-{POSIZIONE}-{NOME}`, `utils/shelves.ts:303-311` a `7bfcd72`) con il controllo dei doppioni (`:270-292`) | Impostazioni › Scaffali | Solo una finestra con il QR (`ShelvesScreen.tsx:289-297`), niente stampa | provato (`ng-scaffale-qr`: `stampaNellaFinestra: false`, lo Scanner lo riconosce) |
| Automazione | `AUTO:…` (`AutomationFlowScreen.tsx:163`) | Automazioni | Condividi (non verificabile da qui) | `esito-a3` |

Sul telefono `src/lib/print.ts` userebbe `react-native-html-to-pdf`, che **non è installato** (non c'è in `node_modules`, `print.ts:4`). Quindi passa sempre a `expo-print`. Se `expo-print` esegua gli script esterni dell'etichetta, e senza internet che cosa stampi: **non provato, serve il telefono**.

### 4.2 Difetti, con i passi

| N | Difetto | Passi | Etichetta |
| --- | --- | --- | --- |
| NG21 (= P27) | L'etichetta non si raggiunge per i prodotti con link; sul web PDF ed etichetta vanno in errore | Scheda VIS-0142: nessun «Mostra SKU QR» o «Stampa Etichetta»; Stampa scheda PDF → «Impossibile generare il PDF». Scheda PUZ-0012 › Mostra SKU QR › Stampa Etichetta → «Impossibile stampare l'etichetta» | provato (`ng-etichetta`); da riconfermare dopo S1a |
| NG22 (= D16) | Il PDF non ha i campi personalizzati; PDF ed etichetta scaricano codici e librerie da 4 servizi esterni (senza internet niente codici); titolo «FurInventory Pro» | lettura di `DetailScreen.tsx:278`, `:332`, `:648`, `:734`, `:739` | letto nel codice; sul telefono non provato |
| NG23 | Tre QR diversi per lo stesso prodotto: il link nella Scheda, lo SKU nell'etichetta e nel PDF. Con NG01, il QR della Scheda è proprio quello che l'app non legge | — | letto nel codice |
| **NG24** | **Posizioni (e Cartelle): l'icona QR di un'altra riga riscrive il codice nel modulo aperto.** Salvando, due posizioni hanno lo stesso codice, e lo Scanner apre sempre la prima (`ScannerScreen.tsx:76`) | Posizioni › creare «Banco Uno» (`LOC-UNO`) e «Banco Due» (`LOC-DUE`) › toccare Banco Uno (modifica) › toccare l'icona QR di Banco Due › chiudere › Salva Modifiche → tutte e due `barcode: "LOC-DUE"` | **provato per le Posizioni** (`ng-posizioni-qr`, `LocationsScreen.tsx:241-244`); **letto nel codice per le Cartelle** (`FoldersScreen.tsx:273-276`, stesso stato `barcode` del modulo); da riconfermare dopo S1a |
| NG25 | Nessun controllo dei doppioni tra posizioni, né tra categorie: la copia di lavoro di S1a controlla solo contro gli scaffali (`LocationsScreen.tsx:71`, `FoldersScreen.tsx:76`, copia di lavoro). La regola di S1a (ticket 13: «un codice già usato da una posizione, una categoria, uno scaffale o un prodotto si rifiuta») vale solo per gli scaffali | come NG24: il secondo `LOC-DUE` viene accettato | provato (`ng-posizioni-qr`); da riconfermare dopo S1a |
| NG26 | QR di posizioni, categorie e scaffali solo sullo schermo: non si stampano, non si salvano, non si condividono | — | provato per gli scaffali, letto nel codice per gli altri |

### 4.3 Che cosa manca

- Un'etichetta per **ogni** cosa, fatta **senza internet**. Le dipendenze ci sono già:
  - `qrcode` (`package.json:114`), da cui `react-native-qrcode-svg` prende la matrice (`QRCode.create`, `react-native-qrcode-svg/src/genMatrix.js:1`). La sua versione per il browser e per Metro espone `toString` in SVG (`node_modules/qrcode/lib/browser.js:74-77`). Letto nel codice della libreria, non provato nell'app; in alternativa si compone l'SVG dalla matrice;
  - lo schema del Code128 è già scritto in `components/Barcode.tsx`.
- La stampa di più etichette insieme: tutti gli scaffali di una posizione, i prodotti selezionati.
- Il formato dell'etichetta (misura).
- I campi personalizzati nel PDF.
- La condivisione dell'immagine del QR.

### 4.4 Proposta

1. **`utils/labelHtml.ts`** (nuovo, puro, con test). Prende `{titolo, riga2, codice, contenutoQR, formato}` e restituisce un HTML con l'SVG del QR (dalla matrice di `qrcode`) e del Code128, **senza script e senza indirizzi esterni**. Si toglie la tabella del Code128 da `components/Barcode.tsx` e la si mette in `utils/code128.ts`, usata dal componente e dall'etichetta. Formati: un'etichetta per pagina, oppure un foglio A4 di etichette (vedi la domanda 3).
2. **`components/CodeSheet.tsx`** (nuovo): una sola finestra «Codice ed etichetta» per prodotti, posizioni, categorie e scaffali. Contiene:
   - il QR grande;
   - il codice scritto;
   - **Stampa etichetta**, **Condividi**, **Scrivi tag NFC**;
   - sotto «Avanzate», **Cambia codice** (fotocamera o generato) e **Collega un tag**.

   Sostituisce le 4 finestre di oggi (`DetailScreen.tsx:1297-1357`, `LocationsScreen.tsx:262-272`, `FoldersScreen.tsx:302-312`, `ShelvesScreen.tsx:289-297`) e usa uno stato **proprio**, non quello del modulo (corregge NG24).
3. **Un contenuto solo per il QR di un prodotto**: quello scelto in Impostazioni (codice o link), uguale nella Scheda, nell'etichetta, nel PDF e sul tag. Il lettore accetta tutti i formati vecchi, quindi le etichette già stampate continuano a funzionare.
4. **PDF**:
   - codici fatti in locale;
   - campi personalizzati nell'ordine del layout (`orderByLayout`, già usato nella Scheda);
   - titolo «Syncro Flow».
5. **Controllo dei doppioni per tutti**: `codeOwner` (`utils/shelves.ts:270-292` a `7bfcd72`) spostato in `utils/codes.ts`, usato da Posizioni, Cartelle, Scaffali e dal GTIN.
6. **Web**: `Print.printToFileAsync` sul web non restituisce un file. Si apre l'HTML dell'etichetta in una finestra nuova e si chiama `window.print()` lì, oppure si scarica il PDF. Si toglie il ramo che stampa la pagina dell'app.

File da toccare:
- `src/screens/product/DetailScreen.tsx`, `src/screens/settings/LocationsScreen.tsx`, `FoldersScreen.tsx`, `ShelvesScreen.tsx`;
- `components/Barcode.tsx`, `src/lib/print.ts`;
- nuovi: `utils/labelHtml.ts`, `utils/code128.ts`, `utils/codes.ts`, `components/CodeSheet.tsx`.

Quasi tutti sono file di S1a, quindi dopo il suo commit.

Rischi per i dati:
- nessun dato salvato cambia;
- i doppioni già presenti (come quelli di NG24) vanno segnalati alla modifica, senza bloccare il salvataggio di un altro campo;
- l'utente sceglie quale dei due tenere.

### 4.5 Come si proverebbe

Scenari per `prova/e1-etichette.cjs`:
- `e1-etichetta-prodotto-link`: VIS-0142 › Codice ed etichetta › Stampa. Con la stampa finta (`window.print` sostituita, come `stubs` di `a1-scheda.cjs`), l'HTML contiene un `<svg>` e **nessun** `http` esterno.
- `e1-etichetta-posizione`, `e1-etichetta-scaffale`, `e1-etichetta-categoria`: c'è Stampa e il QR contiene il codice.
- `e1-pdf`: il PDF contiene «Fornitore» e il valore; nessun `api.qrserver.com` né `barcodeapi.org`; titolo «Syncro Flow».
- `e1-posizioni-qr` (regressione di NG24): aprire il QR di un'altra riga non cambia il modulo; un codice doppio viene rifiutato con il nome del proprietario.
- `e1-un-solo-qr`: QR della Scheda, etichetta e PDF hanno lo stesso contenuto.
- Con l'intercettazione di rete di Playwright (`page.route`): zero richieste fuori da `localhost` durante stampa e PDF.

Regressioni: `a1-scheda.cjs`, `a4-posizioni.cjs`, `a4-cartelle.cjs`, `s1-scaffali.cjs`, `c1-categorie.cjs`, `a3-scanner.cjs`.

Sul telefono:
- in modalità aereo: Stampa etichetta e PDF con QR e barcode visibili;
- la stampante dell'utente, alla misura giusta;
- inquadrare l'etichetta stampata con lo Scanner → la scheda giusta.

---

## 5. Perché le due schermate sembrano complesse e vecchie, e un disegno semplice

### 5.1 Che cosa le rende pesanti (conteggi letti nel codice; l'effetto nullo dei controlli è provato, punti 1.4 e 2.2)

| | GS1 Digital Link | Scanner & NFC |
| --- | --- | --- |
| Controlli | 9 (1 campo, 2 interruttori, 2 segmenti, 3 chip di campo, 1 ripristino), più 1 riquadro bloccato che sembra un controllo | 5 (3 segmenti, 1 interruttore, 1 test) |
| Controlli senza effetto o fuorvianti | Il riquadro «AI 01 Obbligatorio» non si tocca; il dominio vuoto non spegne nulla (NG04); l'anteprima mostra un lotto falso (NG07) | 4 su 5 (NG11) |
| Gergo | Endpoint di risoluzione, Dominio Base, Mappatura GS1, Application Identifiers, AI 01/21/10, GTIN, EAN, UUID, Campo Mappato, Field Builder, Anteprima stringa, URL Risultante, Digital Link | Hardware, Metodo di Scansione Azione Rapida, Pulizia + Scrittura, Diagnostica, Sensore, «Legacy» (nella Scheda) |
| Lingua | Italiano e inglese mescolati | Idem; emoji nei messaggi (✅, 🏷️ nelle liste) |
| Passaggi per l'uso vero | Per avere un'etichetta di un prodotto con link: impossibile. Per un tag: Scheda › in fondo «Identità digitale GS1» › Programma tag › due appoggi del tag con una pausa in mezzo (che con NG14 probabilmente fallisce) | Le scelte non cambiano nulla, quindi l'utente non può capire che cosa facciano |
| Impostazione | Spiega come è fatto il link (struttura per specialisti), non che cosa ottiene l'utente | Spiega l'hardware, non il compito («leggere un codice») |

In più:
- le due voci di Impostazioni stanno sotto «Configurazione hardware» (`SettingsScreen.tsx:263-300`), anche se il GS1 non è hardware;
- nessuna delle due schermate collega a ciò che produce (etichette, tag).

### 5.2 Schermata nuova «Codici ed etichette» (al posto di GS1 Digital Link)

In alto, una scheda con l'**anteprima vera**: un'etichetta d'esempio del primo prodotto, con QR e codice, e il pulsante «Stampa una prova».

1. **Che cosa portano QR e tag dei prodotti** (2 scelte grandi):
   - **«Il codice del prodotto»** (proposta come predefinita finché non c'è un sito): corto, si legge senza internet, nessuna pagina morta.
   - **«Un link al tuo sito»**: compare un solo campo, «Indirizzo del sito», con il controllo `https://` e l'anteprima. I prodotti con EAN/GTIN ricevono un GS1 Digital Link conforme (14 cifre, lotto nel percorso, seriale = SKU per i pezzi unici, nessun seriale per gli articoli a quantità). Gli altri ricevono il link semplice o il codice (domanda 1).
2. **Formato delle etichette**: un'etichetta per pagina / foglio A4 / misura dell'etichettatrice (domanda 3). Si sceglie che cosa scrivere sotto il QR: nome, posizione e scaffale, prezzo.
3. **Avanzate** (chiuso):
   - «Lotto dal campo…», solo campi di testo corto, avviso oltre 20 caratteri;
   - «Usa un numero di serie diverso dallo SKU»;
   - «Crea il link per i prodotti che non l'hanno» (azione esplicita, con il numero dei prodotti e la conferma);
   - «Ripristina».

Valori predefiniti sensati: modo «Codice» (o «Link» per chi ha già una configurazione salvata, così per lui non cambia nulla), etichetta con nome e posizione, lotto spento.

Che cosa sparisce:
- AI 01/21/10;
- UUID e Progressivo (sostituiti dallo SKU come seriale);
- il riquadro bloccato;
- la scomposizione dell'URL.

### 5.3 Schermata nuova «Scanner e NFC» (al posto di Scanner & NFC)

1. **Stato in una riga**, aggiornato da solo: «NFC attivo» / «NFC spento: aprilo nelle impostazioni del telefono» (con il pulsante) / «Questo telefono non ha l'NFC» / «Sul web l'NFC non c'è». Accanto, **«Prova un tag»**: legge un tag e mostra contenuto, UID e a che cosa corrisponde nell'app.
2. **Come leggere i codici**: Fotocamera / NFC / Tutti e due (predefinito «Tutti e due» se il telefono ha l'NFC). Sul web la scelta non compare: lì c'è solo la fotocamera, come nel ticket 16.
3. **Dopo un prodotto nuovo**: «Proponi di scrivere il tag» (spento).
4. **Avanzate** (chiuso), solo per «Leggi più tag» (N2):
   - attesa tra due tag (1,5 s);
   - pausa per lo stesso tag (3 s);
   - fine dopo un minuto senza tag;
   - «Zittisci Android con l'app aperta» (N0; il compromesso con Wallet è la decisione 1 del ticket 17);
   - «Pulisci un tag»;
   - «Ripristina».

### 5.4 Registrare uno scaffale (o una posizione, o una categoria) con QR o NFC, nel modo più semplice

Regola: **un codice per ogni cosa, creato da solo**.

1. **Crea scaffale**: nome e posizione (categoria facoltativa) › Crea. Il codice nasce da solo (`SCAF-MAGAZZINO-A1`, come la funzione di S1a `suggestShelfCode`), senza premere «Genera». Si cambia solo da Avanzate.
2. Subito dopo la creazione si apre **Codice ed etichetta** con tre azioni grandi:
   - **Stampa etichetta**: QR, barcode, «Magazzino › A1»;
   - **Scrivi tag NFC**: un tocco; il tag riceve il codice e l'app salva anche l'UID;
   - **Usa un codice già attaccato**: inquadra un'etichetta esistente, oppure «Collega un tag» per un tag bloccato.
3. Dall'elenco: «Stampa tutte le etichette di questa posizione» e «Scrivi i tag in serie» (uno dopo l'altro, con la lettura in serie di N2).
4. **Uso**: lo Scanner (fotocamera, o «Leggi tag NFC» con una pressione) apre la scheda dello scaffale con i prodotti. In Spostamento rapido e Audit lo stesso codice vale come destinazione.
5. Lo stesso per le posizioni e le categorie (Cartelle). Il codice della categoria si salva anche alla creazione, togliendo il limite di `FoldersScreen.tsx:86-87`.

Rischi per i dati: i codici già salvati non si rigenerano mai; quelli doppi si segnalano (NG24, NG25).

### 5.5 File, rischi e prove delle schermate nuove

**File.**
- Le due schermate: `src/screens/settings/Gs1ConfigScreen.tsx` e `HardwareScreen.tsx`, con i loro contesti (punti 1.6 e 2.4).
- Le voci e la sezione in `src/screens/tabs/SettingsScreen.tsx` (`:263-300`): da «Configurazione hardware» a «Codici, etichette e NFC». È un file di S1a.
- Gli scaffali e le posizioni: punti 3.4 e 4.4.
- I 5 stili: vanno usati i ruoli del tema già esistenti (regola della fase B), senza colori fissi come `#F59E0B` e `#3B82F6` di `SettingsScreen.tsx:271`, `:289`.

**Rischi per i dati.**
- Una configurazione salvata con il formato di oggi deve aprirsi uguale: i campi nuovi si uniscono ai valori predefiniti.
- Chi ha già una configurazione salvata resta in modo «Link», così per lui non cambia nulla.
- «Crea il link per i prodotti che non l'hanno» scrive su molti prodotti: va confermata con il numero dei prodotti e va registrata in cronologia.

**Prove** (`prova/u1-impostazioni-codici.cjs`).
- `u1-predefiniti`: con lo storage vuoto le Avanzate sono chiuse, il modo è «Codice», il Lotto è spento.
- `u1-config-vecchia`: si carica in localStorage la configurazione di oggi (`{baseUrl:'https://id.prova.it', serialMode:'progressive', …}`) → modo «Link» con quel dominio, e Aggiungi dà un link con quel dominio.
- `u1-avanzate`: aprendo le Avanzate compaiono Lotto e Ripristina; il Lotto propone solo campi di testo corto.
- `u1-scanner-nfc`: sul web nessuna scelta NFC; la diagnostica dice «Non disponibile sul web».
- `u1-scaffale-flusso`: Crea scaffale → si apre «Codice ed etichetta» con il codice già fatto, Stampa e (solo sul telefono) Scrivi tag.
- Il controllo degli stili dopo la fetta, con lo script degli stili, lo lancia la sessione che esegue: qui non è stato lanciato.

---

## Riepilogo dei difetti

Numerati `NG` per non confonderli con D e P. Tra parentesi i codici già esistenti.

| N | Dove | In breve | Etichetta | Gravità |
| --- | --- | --- | --- | --- |
| NG01 | Scanner, automazioni | Il link GS1 (QR della Scheda, tag NFC) non è riconosciuto | provato | funzione rotta |
| NG02 | Modifica | Aggiunge in silenzio un link; poi sparisce l'etichetta | provato | comportamento |
| NG03 | GS1 | Seriale progressivo doppio | provato | dati (link uguali) |
| NG04 | GS1 | Non si spegne; il campo vuoto mente | provato | comportamento |
| NG05 | GS1 | GTIN = SKU, non controllato | provato | conformità |
| NG06 | GS1 | Lotto in `?10=` | letto nel codice | conformità |
| NG07 | GS1 | Anteprima con un lotto falso e un GTIN d'esempio sbagliato | provato | comportamento |
| NG08 | GS1 | Lotto da un testo lungo, senza limite | provato | conformità |
| NG09 | Aggiungi | Seriale anche per gli articoli a quantità | letto nel codice | conformità |
| NG10 | Fuori dall'app | Link senza resolver né App Links | dedotto | da decidere |
| **NG27** | Modifica | Un cambio del Lotto (o dello SKU) riscrive i link già fatti | **provato** | **dati** (etichette e tag non tornano) |
| NG11 (D19) | Scanner & NFC | Preferenze non lette | provato | funzione assente |
| NG12 | Scanner & NFC | Diagnostica «Errore» sul web, nessuna prova di lettura | provato sul web | comportamento |
| NG13 | Scanner & NFC | Testi che promettono funzioni inesistenti | letto nel codice | comportamento |
| NG14 (N0 §1.4) | Programma tag | Gara 500/1000 ms | letto; serve il telefono | funzione rotta (attesa) |
| NG15 | Scheda | Tag solo per i prodotti con link | provato | funzione assente |
| NG16 | NFC | Nessuna lettura | letto nel codice | funzione assente |
| NG17 | Posizioni, Cartelle | `nfcTag` dichiarato e mai usato; «Barcode / NFC» falso | letto nel codice | funzione assente |
| NG18 | Scaffali (copia di lavoro) | Tag scritto a mano, non riconosciuto | provato | funzione assente (scelta S1a) |
| NG19 | Scheda (web) | «Operazione Annullata» invece di «non disponibile» | provato | comportamento (web) |
| NG20 | Libreria NFC | 3.x con la nuova architettura | serve il telefono | rischio |
| NG21 (P27) | Scheda | Etichetta non raggiungibile; errori sul web | provato | comportamento |
| NG22 (D16, D07) | PDF, etichetta | Servizi esterni, nessun campo personalizzato, titolo vecchio | letto nel codice | comportamento |
| NG23 | Scheda, PDF, etichetta | Tre QR diversi per lo stesso prodotto | letto nel codice | comportamento |
| **NG24** | Posizioni, Cartelle | L'icona QR di un'altra riga riscrive il codice: due posizioni con lo stesso codice | **provato** (Posizioni), letto nel codice (Cartelle) | **dati** |
| NG25 | Posizioni, Cartelle | Nessun controllo dei doppioni tra di loro | provato | dati |
| NG26 | Posizioni, Cartelle, Scaffali | QR solo sullo schermo, nessuna stampa | provato / letto | funzione assente |

Riconfermati:
- **P01, chiuso in parte**: una Modifica senza cambiamenti tiene il link (`a4-gs1-modifica`, `ng-modifica-link`: `uguale: true`). Un cambio del lotto o dello SKU lo riscrive ancora (NG27).
- **P10, chiuso**: la ricarica tiene il dominio (`a4-gs1-salva`: `campoDopoRicarica` e `baseUrlDopoBlur` = `https://id.prova.it`).

Fuori area, notato e già noto (`esito-a3`): l'import dalla galleria nello Scanner manda la foto a servizi esterni (`utils/barcodeDecoder.ts:65-100`, `:101-…`).

## Ordine suggerito (non è un piano)

1. **Lettore unico (NG01), fix di NG24/NG25 e blocco delle riscritture di NG27.** Riguardano dati e funzioni rotte. Toccano file di S1a, quindi vanno dopo il suo commit.
2. **Etichette locali e finestra «Codice ed etichetta»** (NG21-NG23, NG26).
3. **GS1 conforme e schermata «Codici ed etichette»** (NG02-NG10), dopo la risposta alle domande 1 e 2.
4. **N1 e N2 di N0**, con la scrittura del codice e dell'UID per gli scaffali (NG14-NG20) e la schermata «Scanner e NFC» (NG11-NG13), sul telefono.

## Domande per l'utente

1. I QR e i tag dei prodotti devono aprire una pagina per i clienti (serve un sito che risponda a quel link), oppure servono solo all'app?
2. I tuoi prodotti hanno codici EAN/GTIN ufficiali (iscrizione a GS1 Italy), oppure solo codici interni?
3. Con che cosa stampi le etichette: stampante normale su fogli A4 oppure un'etichettatrice? E di che misura sono le etichette?
