# Verifica: CSV dei prodotti e immagini (23 novembre 2026)

> **Nota dell'orchestratore 3 (23 novembre 2026, dopo le risposte dell'utente).**
> - Le tre domande in fondo sono aperte: si chiedono quando le fette IMP ed EXP sono le prossime (ticket 26).
> - Sigle nei ticket: E1-E6 → `CSV-E…`, I1-I10 → `CSV-I…` (non sono le fette I1-I3 delle foto WebP), G1-G6 → `CSV-G…`. Le fette proposte qui come «G», «F1», «X1», «X2» si chiamano GAL, FOTO, IMP, EXP.
> - «Crea campo»: i ticket seguono la strada B (andata e ritorno, come l'ha descritto l'utente); la strada A resta un'alternativa da proporre.
> - Sigle con il prefisso dell'area nei ticket (regola in `../../map-3.md`, Notes). Numeri di riga a `4b94e4c`; i difetti si riproducono su `HEAD` prima di correggerli.

Sola lettura. Codice letto a `4b94e4c` (`funzioni/magazzino`). Prove sul web su `http://localhost:8082`, che serve la copia di lavoro con la fetta S1a (scaffali) non ancora committata, e campionario `seed.json` (VIS-0142 ha 3 foto `data:` di lunghezza diversa, quindi si sa sempre quale foto si vede).

**Aggiornamento a fine verifica**: S1a è stata committata durante il lavoro (`7bfcd72`). Per quest'area quel commit contiene esattamente le modifiche già viste nella copia di lavoro: colonna e lettura di «Scaffale» in `productCsv`, scaffale in Impostazioni, Scheda, Aggiungi e Modifica; nessuna riga della galleria o delle foto. Le prove sul web valgono quindi per `7bfcd72`. I numeri di riga qui sotto sono di `4b94e4c`: in quei cinque file, a `7bfcd72`, possono spostarsi di qualche riga. I segni [dopo S1a] ora vogliono dire solo «file condiviso con S1a: ricontrollare le righe».

Etichette: **[web]** = provato sul web; **[codice]** = letto nel codice; **[dedotto]** = ragionamento o documentazione, da provare. **[dopo S1a]** = dipende da file che S1a sta cambiando (`productCsv`, Impostazioni, Scheda, Aggiungi, Modifica, navigazione): da riconfermare quando S1a è committata.

Script e file di prova (temporanei, da copiare in `prova/` quando servono): cartella `script/csv-immagini/`
- `ci-csv.cjs` (scenari `ci-export`, `ci-import-pv`, `ci-import-virgola`, `ci-import-righe-errate`, `ci-import-immagini`, `ci-import-pulsante`), `ci-zero.cjs` (`ci-prezzo-zero`);
- `ci-galleria.cjs` (`gal-scheda`, `gal-visore`, `gal-modifica`, `gal-aggiungi`), `ci-dito.cjs` (`gal-dito`, tocco emulato);
- CSV: `altro-gestionale-pv.csv`, `altro-gestionale-virgola.csv`, `righe-errate.csv`, `immagini-link.csv`; schermate `*.png` nella stessa cartella.

Rilanciati senza differenze rispetto ai resoconti precedenti, tranne quanto detto sotto: `a2-csv.cjs` (4 scenari), `m08-csv.cjs` (4), `c1-categorie.cjs c1-csv`. Nessun timeout.

## In breve

- **Export**: funziona, ma le foto del prodotto non escono mai se sono sul dispositivo (`data:`, `blob:`, `file:`): la colonna «Immagini URL» resta `[]`. È quello che l'utente vede come «mancano i link delle immagini». I campi personalizzati escono solo in un JSON illeggibile per un altro programma (49 mila caratteri per VIS-0142, foto dei dettagli comprese in base64).
- **Import**: riconosce le colonne solo per nome esatto, con pochi sinonimi, e non c'è un passo per abbinarle. Un CSV col punto e virgola (Excel italiano) viene rifiutato tutto. In un CSV di un altro gestionale «Categoria» finisce nel **Tipo di pelle**, mentre «Prezzo», «Quantità», «Taglia» e «Colore» si perdono senza avviso. Non c'è anteprima, le righe rifiutate non hanno il motivo e i prodotti già presenti si saltano.
- **«Crea campo»**: non esiste. I pezzi per farlo ci sono già: `addField` restituisce il campo creato e la pila delle schermate tiene aperta la schermata di sotto.
- **Galleria**: il «non funziona» ha tre cause, tutte provate. (1) In Aggiungi e Modifica il tocco su una miniatura sposta il contatore ma non la foto grande, e il cestino cancella la foto che si vede, non quella scelta: **si cancella la foto sbagliata**. (2) Nella Scheda non ci sono miniature né frecce; con il mouse la galleria non scorre, si muove solo col dito o col touchpad. (3) P20 confermato: sul web le foto aggiunte diventano `blob:` e dopo una ricarica sono vuote.

---

## 1. Export CSV dei prodotti

### 1.1 Stato attuale
- **Dove si avvia**: Impostazioni › Dati e backup › «Esporta Inventario» (`SettingsScreen.tsx:563-579`, `exportToCSV` a `:127`). Sul web scarica `inventario_<ora>.csv`; sul telefono scrive in `documentDirectory` e apre la condivisione (`:97-126`). [codice] [web: `ci-export`]
- **Colonne** (`productCsv.ts:16`): SKU, Tipo di pelle, Posizione (id), Status, Prezzo Acquisto, Prezzo Vendita, Lunghezza, Larghezza, Peso, Note, Data Produzione, Immagini URL, Dati Personalizzati JSON, GS1 Digital Link, Link allegati Drive JSON, Categoria (nome completo, «Pellicce › Visone»), Unità, Giacenza (`posizione:quantità; …`), Scorta minima. A `4b94e4c` sono 19; sul web sono 20, perché S1a aggiunge «Scaffale» in fondo. [web] [dopo S1a]
- Prodotti nel cestino esclusi (`productCsv.ts:56`). Separatore virgola, **nessun BOM** (`csv.ts:2-13`). [web: `bom:false`, `separatore:","`]
- **Categoria e sottocategoria**: una sola colonna col nome completo (`productCsv.ts:72`). Il giro esporta-reimporta ora la conserva (`a2-csv-esporta-reimporta` e `c1-csv`: «uguale»). [web]
- **Giacenze**: colonne Unità, Giacenza e Scorta minima; il giro le conserva (`m08-giro-esporta-reimporta`: «coincide» per tutti). [web]
- **Campi personalizzati**: nessuna colonna per campo («Taglia», «Colore», «Fornitore» non ci sono). Tutto va nella colonna «Dati Personalizzati JSON», con lo «snapshot» completo di ogni campo (`productCsv.ts:69`). Per VIS-0142 sono 48.978 caratteri, perché il campo immagini «Foto dettagli» ci entra in base64. [web]
- **Immagini**: `backupImageLinks` se esistono, altrimenti solo le foto `http(s)` (`productCsv.ts:68`).
  - Sul web: VIS-0142 ha 3 foto `data:` → `"[]"`. Il giro esporta-reimporta perde tutte le foto (3→0, 1→0 su tutti e 6 i prodotti). [web: `ci-export`, `a2-csv-esporta-reimporta`]
  - Sul web, foto aggiunte da Aggiungi: `blob:` → escluse. [codice]
  - Android: `expo-image-picker` restituisce `file:///…/cache/ImagePicker/…` (`src/lib/imagePicker.ts:9-19`; `react-native-image-picker` non è installato, quindi si usa Expo) → escluse. [codice + documentazione Expo]
  - Le foto importate come link `http(s)` invece escono (`ci-import-immagini`: IMG-JSON, IMG-PV). [web]
- **Backup Google Drive** (dietro il login, oggi spento) usa un elenco di colonne suo, quello di prima (15 colonne, senza Categoria, Unità e Giacenza), e include il cestino (`SettingsScreen.tsx:139-147`: `products.map` senza filtro). [codice]

### 1.2 Difetti (con passi)
1. **E1 – Foto del dispositivo mai nel CSV.** Impostazioni › Esporta Inventario › aprire il file: per VIS-0142 «Immagini URL» = `[]` anche se ha 3 foto. Nessun avviso. [web]
2. **E2 – Campi personalizzati illeggibili fuori dall'app.** Stesso file: nessuna colonna «Taglia» o «Colore», solo un JSON di decine di migliaia di caratteri. Un e-commerce o un altro gestionale non lo usa. [web]
3. **E3 – Asimmetria delle foto.** Le foto dei campi «immagini» (es. «Foto dettagli») escono in base64 dentro il JSON, quelle del prodotto no (`productCsv.ts:68-69`). [web] Su Android escono come `file://`, inutili su un altro dispositivo. [codice]
4. **E4 – Excel in italiano.** Senza BOM e con la virgola, Excel con le impostazioni italiane (separatore «;») apre tutto in una colonna e scrive male gli accenti («Unità»). Eppure la voce promette «apribile anche in Excel» (`SettingsScreen.tsx:574`). [dedotto, Excel non provato]
5. **E5 – Backup Drive non allineato** all'export: colonne vecchie e cestino incluso (`SettingsScreen.tsx:139-147`). [codice; non provabile senza login]
6. **E6 (futuro, con il login)**: il caricamento delle foto sul cloud sostituisce `images` con link firmati di 7 giorni (`InventoryContext.tsx:238`, `:269`), che finirebbero nel CSV e scadrebbero. [codice]

### 1.3 Che cosa manca
- Le foto del dispositivo nel CSV. È il vero «mancano i link»: oggi non esiste un link pubblico per una foto locale.
- Una colonna leggibile per ogni campo personalizzato.
- Un avviso «N foto non esportate».

### 1.4 Proposta semplice
- **Subito, senza login (fetta X2, piccola):**
  - un'unica funzione per le righe (`productCsvRows`) usata anche dal backup Drive (E5);
  - BOM all'inizio del file (`SettingsScreen.tsx` › `exportCsv`). La virgola resta, perché è lo standard che leggono gli e-commerce; l'import accetterà anche il «;» (§2);
  - **una colonna per ogni campo personalizzato attivo**, col nome del campo e il valore leggibile: scelta multipla «Cappuccio; Tasche»; immagini e documenti solo come link `http(s)`. Il JSON resta, per compatibilità con i file di oggi;
  - dopo l'export, un avviso: «N foto non esportate: sono solo su questo dispositivo. I link arriveranno col caricamento sul cloud».
  - File: `utils/productCsv.ts` (+ `__tests__/productCsv.test.ts`), `SettingsScreen.tsx` [dopo S1a].
- **Dopo I1-I3**: «Immagini URL» con i link pubblici WebP della copia di catalogo (ticket 11). Attenzione a E6: si esportano i link pubblici del catalogo, mai quelli firmati.
- **Rischi per i dati**: nessuno (l'export non scrive). Le colonne nuove vanno in fondo, così i file di oggi restano leggibili. Il riconoscimento del formato C1 (`productCsvFormat`, `productCsv.ts:106-110`) non deve scambiare una colonna di campo chiamata «Categoria» per la cartella: i nomi dei campi che coincidono con colonne di sistema vanno resi univoci (es. «Categoria (campo)»).

### 1.5 Come si proverebbe
- `prova/x2-export.cjs`:
  - `x2-colonne-campi`: le colonne Taglia, Colore e Fornitore esistono con i valori di VIS-0142;
  - `x2-bom`: il primo carattere è U+FEFF;
  - `x2-avviso-foto`: compare «3… foto non esportate»;
  - `x2-giro`: reimportando, i campi tornano uguali.
- Jest: `productCsv.test.ts` (colonne dei campi, valori multipli, link).
- Regressioni: `a2-csv.cjs`, `m08-csv.cjs`, `c1-categorie.cjs c1-csv`, `s1-scaffali.cjs` (colonna Scaffale).
- Telefono: export e condivisione, apertura in Excel o Fogli.

---

## 2. Import CSV dei prodotti

### 2.1 Stato attuale
- **Dove si avvia**: Impostazioni › «Importa prodotti CSV» (`SettingsScreen.tsx:611-624`, `importFromCSV` a `:194-208`). Sul web c'è anche un riquadro dove trascinare il file (`:626-644`, `handleCsvDrop` a `:210-223`). Il pulsante ora funziona anche sul web (P18 chiuso da C06, `src/lib/fileSystem.ts:20-33`). [web: `ci-import-pulsante`, `a2-csv-importa-pulsante`]
- L'import parte **subito**: niente anteprima e niente abbinamento delle colonne. [web]
- **Lettura del file**: `parseCsv` divide **solo con la virgola** (`csv.ts:34`). Toglie il BOM (`SettingsScreen.tsx:168`).
- **Colonne**: per nome, senza badare a maiuscole e accenti, con pochi sinonimi fissi (`productCsv.ts:113-142`). Esempi: SKU = «sku» o «codice sku»; immagini = «immagini url», «immagini», «foto url» o «images»; prezzo vendita = «prezzo vendita» o «sell price».
  - I tre formati di C1 sono riconosciuti dall'intestazione (`productCsvFormat`, `:106-110`). [web: `c1-csv` importa i 3 file d'esempio]
- **Colonne sconosciute**: ignorate in silenzio. [web]
- **SKU**: colonna mancante → tutto il file rifiutato («Manca la colonna SKU…», `:172`). SKU vuoto → riga saltata (`productCsv.ts:162-163`).
- **Prodotti già presenti** (stesso SKU, maiuscole indifferenti, anche doppioni nello stesso file) → **saltati, mai aggiornati** (`SettingsScreen.tsx:176-184`). [web: VIS-0142 resta a 4200 €]
- **Messaggio finale**: solo «N importati, M saltati (SKU vuoto o già presente, o giacenza non valida)» (`:204`, `:219`), senza dire quali righe né perché. [web]
- **Campi personalizzati**: solo dalla colonna JSON, copiata così com'è senza confrontarla con i campi di questo dispositivo (`productCsv.ts:199`). [codice]
- **Immagini**: JSON o elenco separato da «;» (`productCsv.ts:178-190`). I link `http(s)` finiscono in `images` e in `backupImageLinks`. I link `drive.google.com` restano solo in `backupImageLinks` (non si vedono, ma si riesportano). `data:` e `file:` vengono tenuti così come sono. [web: `ci-import-immagini`]

### 2.2 Difetti (con passi)
1. **I1 – CSV col punto e virgola rifiutato tutto.** Trascinare `altro-gestionale-pv.csv` (Excel in italiano: `Codice articolo;Descrizione;…`): «Importazione non riuscita | Manca la colonna SKU», 0 prodotti. Rifiutato anche con l'intestazione «SKU», perché il «;» non viene diviso (`csv.ts:34`). [web: `ci-import-pv`; il secondo caso è letto nel codice]
2. **I2 – «Categoria» di un altro gestionale diventa Tipo di pelle.** Trascinare `altro-gestionale-virgola.csv` (SKU, Nome, Categoria, Prezzo, Quantità, Taglia, Colore, Materiale, Immagine, Immagini): ALT-001 ha `furType: "Pellicce"`, nessuna categoria, `location: ""`. La Scheda mostra «Tipo di pelle: Pellicce». [web: `ci-import-virgola`]
   - Causa: senza la colonna «Tipo di pelle» il file viene preso per uno del vecchio formato e «Categoria» vuol dire tipo di pelle (`productCsv.ts:108`, `:122-123`).
3. **I3 – Colonne perse in silenzio.** Stesso file:
   - Nome, Prezzo, Quantità e Materiale ignorati;
   - **Taglia e Colore ignorati anche se sono campi personalizzati esistenti** (`customData: []`);
   - «Immagine» al singolare ignorata, «Immagini» letta (2 link).
   - Messaggio: «2 prodotti importati. 0 saltati». [web]
4. **I4 – Righe sbagliate senza motivo.** `righe-errate.csv`: «5 prodotti importati. 5 saltati». Non dice quali righe né perché: SKU già presente, stesso SKU in minuscolo, SKU vuoto, giacenza «abc», doppione nello stesso file. [web: `ci-import-righe-errate`]
5. **I5 – Righe accettate ma sbagliate, senza avviso** [web, stesso scenario]:
   - ERR-PREZZO: prezzo «abc» → importato senza prezzo;
   - ERR-NOPOS: **senza posizione** (Aggiungi la pretende);
   - ERR-POSX: posizione «Magazzino Centrale» salvata come id inesistente (la Scheda mostra il testo grezzo; posizione orfana, fuori da Gestisci Posizioni) e categoria «Borse» persa;
   - ERR-STATO: stato «boh» → disponibile;
   - ERR-OK: **senza Taglia**, che è obbligatoria (gli obbligatori non sono controllati).
   - In più: nessun link GS1 generato (la Scheda dice «non ha un Digital Link GS1»).
6. **I6 – Prezzo 0.** Con `Prezzo Acquisto = 0` la Scheda mostra uno «0» isolato («Prezzi 0 Vendita 100 €»). [web: `ci-prezzo-zero`]
   - Causa: `{product.purchasePrice && (…)}` con 0 (`DetailScreen.tsx:957`, `:961`, `:967`).
   - **Su Android** quel numero fuori da un `<Text>` di solito fa fallire la schermata («Text strings must be rendered within a <Text>»). [dedotto, da provare sul telefono] Lo stesso 0 può arrivare da Aggiungi.
7. **I7 – Note vuote come stringa vuota.** L'import salva `technicalNotes: ''` (`productCsv.ts:197`); Aggiungi e Modifica salvano `undefined`. Sul web resta solo un avviso innocuo in console («Unexpected text node»), causato da `DetailScreen.tsx:1010`. [web]
8. **I8 – Link d'immagine rotto.** IMG-ROTTO: la galleria della Scheda è un riquadro nero, senza riquadro «nessuna foto» e senza avviso (schermata `ci-import-immagini-scheda-img-rotto.png`). [web]
9. **I9 – Numeri «1.250»** di un altro gestionale (= 1250) vengono letti come 1,25, perché nei file vale la regola dell'export: punto = decimale (`number.ts:28-31`, decisione registrata). «1.250,00» invece è letto bene. [codice]
10. **I10 – Prodotti già presenti mai aggiornati.** Per correggere 100 prezzi da un file bisogna eliminare e reimportare. [web]

### 2.3 Che cosa manca
- Una schermata di import con: **anteprima**, **abbinamento colonna → campo** (con «Ignora» e «+ Crea campo»), **righe rifiutate con il motivo**, avvisi sui valori sconosciuti.
- Separatore «;» riconosciuto da solo.
- Sinonimi più ampi: «Codice articolo», «Codice», «Prezzo», «Quantità», «Immagine», «Image URL»…
- Una colonna abbinata a un campo personalizzato per nome.
- Regole di Aggiungi applicate all'import (posizione e obbligatori).
- Una scelta per gli SKU già presenti (vedi domande).

### 2.4 Proposta semplice (fetta X1)
**Schermata nuova «Importa prodotti»** (`src/screens/settings/ImportScreen.tsx`, rotta `SettingsImport` = `/settings/import`). La voce di Impostazioni porta lì; anche il riquadro per trascinare il file si sposta lì. Quattro passi in una sola schermata che scorre:

1. **File**: pulsante (e trascinamento sul web). Il separatore («,» o «;») si riconosce contando nella prima riga, fuori dalle virgolette.
2. **Colonne**: una riga per ogni intestazione del file, con 2-3 valori d'esempio e un selettore con:
   - «Ignora»;
   - i campi di sistema (SKU, Tipo di pelle, Posizione, Categoria, Stato, Prezzi, misure, Note, Data, Immagini, Unità, Giacenza, Scorta minima, Scaffale, GS1);
   - i campi personalizzati attivi;
   - «**+ Crea campo**» (§3).
   - Proposta automatica: prima i nomi di oggi e i sinonimi (che diventano una tabella sola), poi i nomi dei campi personalizzati.
   - Nel formato C1 nessuna colonna resta da scegliere, quindi i file esportati dall'app si importano con un tocco come oggi.
   - Per Posizione e Categoria si può scegliere un «valore per le righe vuote».
   - L'ultimo abbinamento usato si ricorda per la stessa intestazione (`AsyncStorage`, chiave `furinventory_csv_mapping:{org}`).
3. **Anteprima** (niente viene scritto):
   - «N nuovi, M rifiutati, K avvisi»;
   - l'elenco delle righe rifiutate con **numero di riga, SKU e motivo** (SKU vuoto, già presente, doppione nel file, giacenza non valida, manca la Posizione, manca un obbligatorio, scaffale come posizione…);
   - gli avvisi per colonna: «Prezzo: 2 valori illeggibili», «Posizione sconosciuta: Magazzino Centrale (3 righe) → Crea / Usa…», «Categoria sconosciuta: Borse → Crea / Ignora», «Colore: valori nuovi Nero, Rosso → aggiunti alle opzioni».
4. **Importa** e riepilogo, con «Scarica righe rifiutate (CSV)» per correggerle e reimportarle.

**Logica pura con test** in `utils/csvImport.ts`:
- `detectDelimiter`;
- `guessMapping(header, campi)`;
- `previewImport(righe, abbinamento, elenchi)` → `{ daAggiungere, rifiutate: [{riga, sku, motivo}], avvisi }`.
- `productFromCsvRow` (`productCsv.ts:151-207`) diventa la conversione di una riga già abbinata. Riusa `parseStockCell`, `libraryIdFromCsv`, `furTypeFromCsv` e i controlli di `utils/formValidation.ts`.
- `csv.ts`: `parseCsv(input, separatore)`.

**Correzioni comprese**:
- I2 risolto, perché l'abbinamento è visibile e modificabile;
- note vuote → `undefined` (I7);
- link GS1 generato come in Aggiungi;
- `{x != null && …}` al posto di `{x && …}` per i prezzi della Scheda (I6, una riga, [dopo S1a]).

**File**:
- nuovi: `utils/csvImport.ts` + `__tests__/csvImport.test.ts`, `ImportScreen.tsx`;
- da toccare: `utils/csv.ts`, `utils/productCsv.ts`, `SettingsScreen.tsx`, `src/navigation/RootNavigator.tsx`, `compat.ts`, `linking.ts`, `types.ts`. Tutti questi tranne `csv.ts` sono toccati da S1a → **dopo S1a**.

**Rischi per i dati**:
- prima di «Importa» non si scrive nulla;
- l'import aggiunge e basta, a meno che l'utente scelga «aggiorna» (domanda 1). Se aggiorna, tocca solo le colonne abbinate e scrive un evento «modificato» nella Cronologia;
- le posizioni e categorie create dall'anteprima sono scritture permanenti, quindi solo su tocco esplicito;
- I9: l'anteprima mostra i numeri già convertiti («1,25 €»), così l'errore si vede prima.

### 2.5 Come si proverebbe
- `prova/x1-import.cjs`:
  - `x1-punto-e-virgola`: `altro-gestionale-pv.csv` arriva all'anteprima, «Codice articolo» → SKU;
  - `x1-abbina-auto`: Prezzo → Prezzo vendita, Taglia e Colore → campi, Categoria → Categoria (non Tipo di pelle);
  - `x1-ignora`: Materiale su Ignora → non importato, nessun errore;
  - `x1-anteprima-non-scrive`: localStorage identico prima di «Importa»;
  - `x1-rifiutate`: `righe-errate.csv` → 5 rifiutate, ognuna col motivo giusto, più gli avvisi su prezzo, posizione e categoria;
  - `x1-obbligatori`: manca la Taglia → rifiutata o completata col valore per le righe vuote;
  - `x1-formati-c1`: i tre file di `prova/c1-csv/` passano senza toccare l'abbinamento;
  - `x1-immagini`: vedi §2.6.
- Jest: `csvImport.test.ts` (separatore, sinonimi, abbinamento per nome di campo, motivi di scarto, numeri).
- Regressioni: `a2-csv.cjs`, `m08-csv.cjs`, `c1-categorie.cjs c1-csv`, `s1-scaffali.cjs`, `ci-prezzo-zero`.
- Telefono: scelta del file con `expo-document-picker` e lettura (`fileSystem.ts:32-40`), un CSV salvato da Excel sul telefono.

### 2.6 Link delle immagini all'import (senza login e senza cloud)
- **Oggi** [web]: i link `http(s)` si tengono **come link** e si vedono nella Scheda se il sito è raggiungibile (IMG-JSON: 2 foto caricate, contatore «1/2»). Si riesportano uguali. I link Drive privati non si vedono (`productCsv.ts:189`). Un link rotto dà un riquadro nero (I8).
- **Tenerli come link**: possibile subito, ovunque.
  - Limiti: senza internet non si vedono; se il sito li toglie, si perdono.
  - Proposta: riconoscere la colonna anche da «Immagine», «Foto», «Image», «Image URL», «Immagine principale» e da più colonne («Immagine 1», «Immagine 2»… unite in ordine: la prima è la principale). Separatori «;», «|» o a capo. Nell'anteprima, conteggio dei link e un «Verifica link» che li carica come immagini (non servono permessi del sito). Nella Scheda, il riquadro «foto non disponibile» al posto del nero.
- **Scaricarli dentro l'app**:
  - su Android `fetch` e scrittura in `documentDirectory` funzionano [dedotto];
  - sul web solo dai siti che permettono la lettura da un'altra origine (CORS); molti negozi e CDN non lo permettono [dedotto];
  - in ogni caso serve prima un posto stabile per le foto locali (§4, P20), altrimenti sul web finiscono nel localStorage (~5 MB in tutto) e lo riempiono.
  - Quindi: **ora link, download dopo** il deposito delle foto (fetta F1 qui sotto o I1).

---

## 3. «Crea campo» dall'import

### 3.1 Stato attuale
- L'import non è una schermata: è una funzione di Impostazioni (una scheda delle schede in basso) senza stato. Il file si legge e si importa nello stesso istante (`SettingsScreen.tsx:167-223`). Quindi oggi non c'è nulla da «non perdere». [codice]
- Campi Personalizzati è la schermata `SettingsFields` della pila (`RootNavigator.tsx:99`), aperta da Impostazioni con `router.push('/settings/fields')` (`SettingsScreen.tsx:325`). [codice]
- La creazione avviene in una finestra dentro quella schermata, con lo stato del modulo locale (`FieldsScreen.tsx:31-45`).
  - Al salvataggio: `addField` → `appendToLayout`, così il campo compare subito in Aggiungi (`FieldsScreen.tsx:141-143`).
  - `addField` **restituisce il campo creato** con il suo id (`CustomFieldsContext.tsx:119-132`).
  - Per «scelta singola o multipla» servono le opzioni (`FieldsScreen.tsx:104-113`).
- Navigazione: pila nativa (`RootNavigator.tsx:68`). `router.push` è un `navigate` (`compat.ts:71-77`) e accetta parametri con `{ pathname, params }` (`compat.ts:64-68`). La schermata di sotto resta montata, col suo stato, finché non si torna indietro. [codice]

### 3.2 Difetti
Nessuno: la funzione non esiste.

### 3.3 Che cosa manca
Il pulsante, il ritorno all'import con il campo già selezionato e un posto dove tenere il file caricato.

### 3.4 Proposta semplice
- **Lo stato dell'import vive in `ImportScreen`** (testo del file già letto, righe, abbinamento). Nella pila resta montata sotto Campi Personalizzati, quindi il file non si perde.
  - Sul web una ricarica lo perderebbe: si salva una bozza (testo + abbinamento) in `AsyncStorage` `furinventory_import_draft:{org}`, che si cancella dopo «Importa» o «Annulla».
- **«+ Crea campo»** nel selettore della colonna. Due modi, stesso risultato per l'utente:
  - **A (consigliato, più semplice)**: si estrae la finestra di creazione di `FieldsScreen` in `components/FieldEditorModal.tsx` e la si apre dentro l'import, già compilata con il nome della colonna («Materiale»), il tipo proposto dai valori (numeri → Numero; pochi valori ripetuti → Scelta singola con quei valori come opzioni; link → Immagini) e la proprietà `onCreated(campo)`. Al salvataggio la colonna punta al campo nuovo. È lo stesso modulo dei Campi Personalizzati, senza cambiare schermata.
  - **B (come descritto dall'utente)**: `router.push({ pathname: '/settings/fields', params: { nuovoCampo: 'Materiale', valori: [...] } })`. `FieldsScreen` apre la finestra già compilata e dopo il salvataggio fa `router.back()`. L'import confronta gli id dei campi prima e dopo e seleziona quello nuovo.
- **File**: `FieldsScreen.tsx` (estrazione della finestra), `components/FieldEditorModal.tsx` (nuovo), `ImportScreen.tsx`. Per B anche `compat.ts` e `linking.ts` [dopo S1a].
- **Rischi**: il campo creato è permanente (registro e layout), anche se poi l'import si annulla; lo si dice nell'anteprima. Con B il rischio è una ricarica sul web, coperto dalla bozza.

### 3.5 Come si proverebbe
- `x1-crea-campo`: file con «Materiale» → «+ Crea campo» → salva → la colonna punta a «Materiale» → «Importa» → `customData` di ALT-001 contiene Materiale = «Montone»; il campo è nel registro e nel layout (compare in Aggiungi); le righe del file sono ancora quelle (nessun nuovo caricamento).
- `x1-crea-campo-scelta`: «Colore» con le opzioni proposte dai valori.
- `x1-bozza` (web): ricarica a metà → file e abbinamento ritrovati.
- Regressioni: `a2-campi.cjs`, `c07-campi-modelli.cjs`.

---

## 4. Galleria delle immagini (Scheda, Aggiungi, Modifica) e P20

### 4.1 Stato attuale
- **Scheda** (`DetailScreen.tsx:816-863`): `ScrollView` orizzontale a pagine, contatore «1/3» e puntini. Il tocco sulla foto apre il visore (`:829`). **Nessuna miniatura, nessuna freccia**; i puntini sono solo disegnati (`:850-862`). [web: `gal-scheda`]
  - Rotella verticale del mouse → scorre la pagina (300 px), non la galleria.
  - Rotella orizzontale o touchpad → passa a 2/3.
  - Trascinamento col mouse → niente.
  - Tocco sui puntini → niente.
  - Freccia → della tastiera → niente.
  - Col dito (tocco emulato) → scorre (`gal-dito`: 2/3). In quella prova la galleria si è fermata a metà strada (265 px su 375); dato non concludente, perché il tocco è emulato.
- **Visore** (`DetailScreen.tsx:1359-1413`): dopo C13 parte dalla foto giusta (aperto dalla 3 → «3 / 3», foto 3). [web: `gal-visore`]
  - Ha solo il pulsante di chiusura (`:1370-1375`).
  - Rotella verticale: niente; orizzontale: sì; frecce della tastiera: no; dito emulato: sì.
  - **Zoom**: nessuno; il doppio clic non cambia nulla.
- Le foto dei campi «immagini» nella Scheda (`DetailScreen.tsx:1093-1110`) sono una fila di riquadri che non si possono toccare: niente visore. [codice]
- **Aggiungi** (`AddScreen.tsx:752-802`): «Importa» → Galleria Foto / Scatta Foto / Sfoglia File (`:98-126`). Si scelgono **più foto insieme** (scelta multipla, fino a 10). Foto grande a pagine, cestino su ogni pagina, puntini, miniature. [web: `gal-aggiungi`, «Foto prodotto 3/10»]
- **Modifica** (`EditScreen.tsx:265-350`): uguale, con contatore «1 / 3» e i pulsanti Galleria e Fotocamera. [web: `gal-modifica`]
- **Riordinare e scegliere la principale**: non esiste in nessuna delle tre schermate. La principale è sempre la prima (`images[0]`, usata da card, condivisione e PDF). [web: nessun testo «Principale», «Copertina» o «Sposta»] [codice]

### 4.2 Difetti (con passi)
1. **G1 – La miniatura non porta alla foto e il cestino cancella quella sbagliata (dati persi).** [web: `gal-modifica`]
   - Passi: Inventario › VIS-0142 › Modifica › toccare la 3ª miniatura → contatore «3 / 3» e miniatura evidenziata, ma **la foto grande resta la 1**. Toccare il cestino sulla foto grande → contatore «3 / 2» e **cancellata la foto 1**. Salva Modifiche → restano le foto 2 e 3.
   - Causa: la miniatura cambia solo l'indice (`EditScreen.tsx:326`, `AddScreen.tsx:790`) e non fa scorrere la foto grande (nessun `ref`/`scrollTo`). Il cestino sta su ogni pagina e cancella quella pagina, non la foto scelta (`EditScreen.tsx:287-292`, `AddScreen.tsx:773`). `removeImage` non corregge l'indice (`EditScreen.tsx:144-146`, `AddScreen.tsx:182-184`).
   - In Aggiungi stesso comportamento per la miniatura [web: `gal-aggiungi`, la foto grande resta a 0 px]; il cestino in Aggiungi è letto nel codice.
2. **G2 – Nella Scheda non si sceglie e, col mouse, non si scorre.** Vedi 4.1: niente miniature, puntini inerti, nessuna freccia, rotella e trascinamento inutili. È il «non posso selezionarli e scrollare» sul computer. [web] Sul telefono lo scorrimento col dito dovrebbe andare [dedotto: va col tocco emulato, non provato su Android].
3. **G3 – Visore senza frecce, tastiera e zoom.** [web] Si chiude con la X; sul telefono anche col tasto Indietro (`onRequestClose`) [codice]. Esc sul web non provato.
4. **G4 – P20 confermato.** Aggiungi › Importa › Galleria Foto › 3 foto › salva → `images` = 3 indirizzi `blob:http://localhost:8082/…`. Dopo la ricarica `fetch` fallisce per tutte e 3 e la console dà `ERR_FILE_NOT_FOUND` 3 volte. La galleria di quel prodotto resta vuota. [web: `gal-aggiungi`] Vale anche per «Galleria» in Modifica (`EditScreen.tsx:108-126`, stessa libreria) [codice].
5. **G5 – Android: foto nella cache.** `expo-image-picker` copia la foto in `cache/ImagePicker/` e l'app salva quell'indirizzo, senza copiarla altrove (`AddScreen.tsx:143`, `:178`; `EditScreen.tsx:123-124`). Se il sistema o l'utente svuota la cache, le foto spariscono. [dedotto da codice + sorgente Expo `MediaHandler.kt`; da provare sul telefono]
6. **G6 – Ordine delle foto legato al cloud.** `storageImagePaths` è «allineato a `images`» per posizione (`types/index.ts:12`, `InventoryContext.tsx:270`). Un riordino che non sposta anche quello scambierebbe le foto sul cloud. Oggi non succede (non c'è riordino), ma è un vincolo per la proposta. [codice]

### 4.3 Che cosa manca
- Miniature e frecce nella Scheda.
- Miniatura → foto grande.
- Cestino sulla foto scelta.
- «Principale» e riordino.
- Frecce, tastiera e zoom nel visore.
- Un deposito stabile delle foto locali (web e Android).

### 4.4 Proposta semplice
- **Fetta G (galleria, nessuna dipendenza): un componente unico `components/PhotoGallery.tsx`** usato da Scheda, Aggiungi e Modifica:
  - indice controllato con `ref.scrollTo` al tocco di miniatura, puntino o freccia (corregge G1 e G2);
  - indice corretto dopo un'eliminazione;
  - frecce ‹ › sopra la foto quando le foto sono più di una (sul web sempre, sul telefono anche: aiutano); ←/→ sul web;
  - **fila di miniature anche nella Scheda**;
  - in Aggiungi e Modifica, sotto la foto grande: **un solo cestino per la foto scelta** (con conferma «Eliminare la foto 3?»), «**Metti come principale**» (la porta in testa), «‹ Sposta / Sposta ›». Niente trascinamento: è più semplice e funziona col mouse;
  - stessa galleria nel visore, con Esc. Lo zoom (doppio tocco 2×, pizzico sul telefono con `react-native-gesture-handler`, già installato) va in un secondo passo;
  - le foto dei campi «immagini» nella Scheda si aprono nello stesso visore.
  - File: `DetailScreen.tsx` (`:816-863`, `:1093-1110`, `:1359-1413`), `AddScreen.tsx` (`:752-802`), `EditScreen.tsx` (`:265-350`), tutti [dopo S1a]; logica pura dell'ordine in `utils/photos.ts` (sposta, principale, elimina) + test, **che sposta insieme `images` e `storageImagePaths`** (G6).
  - Rischi: G1 oggi cancella la foto sbagliata, quindi la correzione riduce il rischio. Il riordino tocca solo l'array del prodotto, al salvataggio.
- **Fetta F1 (foto che restano, nessuna dipendenza; da unire a I1 o da fare subito prima)**:
  - **web**: le foto scelte si salvano in IndexedDB (`src/lib/photoStore.web.ts`). In `images` resta un riferimento (`local-photo:<id>`), che un piccolo hook trasforma in indirizzo da mostrare. Non i `data:` nel localStorage: VIS-0142 con 3 foto pesa già circa 280 KB e il localStorage tiene circa 5 MB in tutto [dedotto];
  - **Android**: al salvataggio si copia da `cache/` a `documentDirectory/foto/<idProdotto>/<n>` (`expo-file-system`, già presente);
  - con I1 la copia diventa WebP ridotta;
  - le foto `blob:` già salvate non si possono recuperare: la Scheda mostra «foto non più disponibile» al posto del vuoto (lo stesso riquadro di I8).
  - Rischi: è il formato con cui si salvano le foto; le foto `http`/`data:` esistenti restano valide; l'export (§1) continua a escludere i riferimenti locali.

### 4.5 Come si proverebbe
- `prova/g-galleria.cjs`:
  - `g-scheda-miniature`: tocco sulla 3ª → contatore 3/3 e foto 3 visibile (lunghezza della data-URI, come in `ci-galleria.cjs`);
  - `g-scheda-frecce`: ›, ‹ e ←/→;
  - `g-visore-frecce`: frecce ed Esc;
  - `g-modifica-elimina-giusta`: sceglie 3 → elimina → salvate 1 e 2;
  - `g-principale`: la 3 diventa `images[0]`;
  - `g-ordine`: «Sposta ›».
- Jest: `photos.test.ts` (ordine, principale, eliminazione con `storageImagePaths` allineati).
- `prova/f1-foto.cjs`:
  - `f1-ricarica`: 3 foto da Aggiungi → ricarica → caricate tutte;
  - `f1-modifica`: Galleria in Modifica → ricarica;
  - `f1-molte`: 20 foto su 5 prodotti senza errori di spazio.
- Regressioni: `a1-scheda.cjs` (`a1-scheda-visore`), `c12-senza-foto.cjs`, `a2-aggiungi.cjs` (foto), `ci-galleria.cjs`.
- **Telefono** (serve): scorrimento col dito e pizzico; foto da galleria e fotocamera; la foto c'è ancora dopo Impostazioni Android › App › Svuota cache (G5).

---

## 5. Ordine suggerito (proposta, da decidere con l'orchestratore)
1. **G** (galleria): piccola, toglie un difetto che cancella dati (G1). Dopo S1a, perché tocca Scheda, Aggiungi e Modifica.
2. **F1** (foto che restano, P20 e G5): prima di qualsiasi import con download e prima di I2.
3. **X1** (schermata di import con abbinamento, anteprima, rifiutate, «Crea campo», link immagini). Dopo S1a (`productCsv`, navigazione).
4. **X2** (export leggibile, BOM, avviso foto, backup Drive allineato).
5. **I1 → I2/I3** come da `map-2.md`: link pubblici nel CSV. Così la voce «Not yet specified: import delle foto dal CSV» si chiude con X1 (link) + F1 (download).

## Domande per l'utente (solo lui può decidere)
1. **SKU già presenti nel file**: si saltano come oggi, oppure si aggiornano i prodotti con i valori del file (solo le colonne abbinate)?
2. **Link delle immagini nel CSV importato**: si tengono come link (subito; si vedono solo con internet e finché il sito li tiene) o l'app ne scarica una copia (dopo F1; sul web non da tutti i siti)?
3. **Prima del cloud (I1-I3)**: all'export basta l'avviso «N foto non esportate», o vuoi anche un file di backup a parte con le foto dentro (completo, ma molto pesante)?
