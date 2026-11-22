# Cronologia aggiornabile

Registro progressivo. Aggiungere nuove voci in cima senza cancellare quelle vecchie. Specificare data, branch/SHA, file e servizi, prove con esito e ciò che resta aperto. Non segnare una funzione come verificata finché la prova non è stata svolta.

## 22 novembre 2026 — Fase B, C05: posizioni e cartelle eliminate senza prodotti orfani (P08, P09)

- Branch `funzioni/magazzino`.
- **P08**: eliminare una posizione lasciava i suoi prodotti con l'id di una posizione che non c'è più (mostrato grezzo in Inventario e Scheda, Modifica senza posizione). Ora una posizione usata da prodotti, anche nel cestino, non si elimina: l'avviso dice quanti sono e chiede di spostarli (per quelli nel cestino: eliminarli per sempre dal Cestino). Ogni prodotto ha sempre una posizione che esiste.
- **P09**: una cartella con prodotti solo nel cestino si eliminava e, ripristinati, puntavano a una cartella che non c'era più. Ora la cartella si elimina come prima se non ha prodotti attivi, e i prodotti nel cestino perdono la cartella (ripristinati, sono senza cartella).
- Logica: `usage` in `utils/productRules.ts` (prodotti attivi e nel cestino per posizione o cartella), 2 test nuovi.
- Prova sul web: `a4-pos-elimina` → avviso «La posizione "Vetrina" contiene 1 prodotti…», nessun id grezzo in Inventario e Scheda (prima la posizione spariva e restava l'id); `a4-cart-cestino` → dopo l'eliminazione il prodotto ripristinato non ha più `libraryId` (prima puntava a «usato-e-permute»); crea, modifica, nome doppio, cartella piena e vuota come prima.
- Verifiche (`controllo.sh`): tsc 0, eslint 0, jest 103 verdi, bundle Android 5,08 MB con 62 asset, 30 schermate senza errori in console.

## 22 novembre 2026 — Fase B, C04: Spostamento rapido e Audit registrano «spostato» (D15, P22)

- Branch `funzioni/magazzino`.
- **D15**: Spostamento rapido e «Sposta qui» dell'Audit cambiavano la posizione con `updateProduct`, quindi in cronologia risultava «modificato». Ora usano `moveProduct` (evento `moved` con da/a, `lastScannedAt` aggiornato); Spostamento rapido dice «… è nel cestino» se il capo letto è nel cestino. Serve anche alle fette del magazzino: tutti gli spostamenti passano da un solo punto.
- **P22**: la percentuale dell'Audit scendeva a 50% con un intruso anche con tutti gli attesi trovati; ora conta solo i capi attesi.
- Prova sul web: `a3-batch-sposta` evento `moved` stand_c → vetrina (prima `modified`); `a3-audit-intruso-sposta` evento `moved` vetrina → stand_b e 100% con un intruso (prima 50%); cambio di destinazione e posizione piena come prima.
- Verifiche (`controllo.sh`): tsc 0, eslint 0, jest 101 verdi, bundle Android 5,08 MB con 62 asset, 30 schermate senza errori in console.

## 22 novembre 2026 — Fase B, C03: niente vendite doppie né dal cestino (P05, P06, P25)

- Branch `funzioni/magazzino`.
- **P05**: l'Azione rapida rivendeva un capo già venduto (nuovo `soldAt`, secondo evento). **P06**: Vendita flash vendeva un capo nel cestino e lo Scanner lo apriva in Azione rapida.
- Fatto: regole `canSell` e `canMove` (`utils/productRules.ts`, test `__tests__/productRules.test.ts`, 7). `sellProduct` e `moveProduct` del contesto le applicano e restituiscono `false` se non fanno nulla: valgono per tutti i chiamanti (Vendita flash, Azione rapida, Esecuzione, Chat). `moveProduct` non scrive più un evento «vetrina → vetrina» se il capo è già lì. Azione rapida e Vendita flash mostrano «Non venduto» / «Non spostato» con il motivo; lo Scanner (fotocamera e codice scritto) dice «nel cestino» e non apre l'Azione rapida. Prezzi scritti letti con `parseNumber` anche in Azione rapida e Vendita flash.
- **P25**: Vendita flash senza prezzo scriveva «0 €» a schermo e nel totale; ora vale il prezzo di listino (il dato salvato era già giusto).
- Prova sul web: `a3-azione-vendi-gia-venduto` → «Non venduto», `soldAt` invariato, 0 eventi; `a3-cestino-vendita-flash` → avviso, stato resta disponibile; `a3-cestino-scanner-manuale` → avviso, Azione rapida non aperta; `a3-vendita-flash-senza-prezzo` → «PUZ-0012 - 1.900 €»; `a3-azione-vendi` e `a3-vendita-flash` vendono come prima.
- Verifiche (`controllo.sh`): tsc 0, eslint 0, jest 101 verdi, bundle Android 5,08 MB con 62 asset, 30 schermate senza errori in console. Nuovo `funzionalita/prova/stage.sh`: mette in stage conservando CRLF o LF come nel repository.

## 22 novembre 2026 — Fase B, C02: Modifica salva i dati giusti (P01, P02, P04)

- Branch `funzioni/magazzino`.
- **P01**: ogni salvataggio in Modifica rigenerava il link GS1 con un seriale nuovo (QR, etichette e tag NFC già fatti non corrispondevano più). Ora `keepGS1DigitalLink` (`utils/gs1.ts`, con `parseGS1DigitalLink`): il link resta com'è finché SKU e lotto non cambiano; se cambiano, link nuovo con lo stesso seriale. Test `__tests__/gs1Keep.test.ts` (6).
- **P02**: salvare un prodotto cancellava il valore dei campi personalizzati nel cestino (il cestino promette che i dati restano). Ora il valore resta con la scheda del campo salvata nel prodotto.
- **P04**: Modifica aperta dall'indirizzo o ricaricata mostrava il modulo vuoto (i prodotti si leggono dopo) e salvando si sovrascriveva il prodotto. Ora la schermata crea il modulo solo quando il prodotto c'è (`EditProductForm` con `key` = id).
- Prova sul web: `a1-mod-base` e `a4-gs1-modifica` link uguale prima e dopo (prima cambiava); `a1-mod-campo-nel-cestino` valore conservato (prima «perso»); `a1-mod-d03` aperta da `product/edit/cmp-1` mostra lo SKU VIS-0142 (prima vuoto). Restano D03 (C08) e il codice finto del QR (D02, C11).
- Verifiche (`controllo.sh`): tsc 0, eslint 0, jest 94 verdi, bundle Android 5,08 MB con 62 asset, 30 schermate senza errori in console. Fine riga CRLF di `EditScreen.tsx` e `utils/gs1.ts` conservati.

## 22 novembre 2026 — Fase B, C01: numeri in formato italiano (P03)

- Branch `funzioni/magazzino`.
- Difetto (prova A1, A2): Aggiungi e Modifica leggevano i numeri con `parseFloat`, quindi «2,5» diventava 2 e «4.500» diventava 4,5; l'import CSV non capiva «4.500,50».
- Fatto: `utils/number.ts` con `parseNumber` (virgola decimale, punto delle migliaia solo nella forma «4.500» / «4.500,50», punto decimale dei valori vecchi e dei CSV come «2.1» o «1234.5», forme ambigue rifiutate) e `formatNumberInput` (Modifica mostra «2,1», non «2.1»). Usati per prezzi, misure e peso in Aggiungi e Modifica e nell'import CSV. Segnaposto del peso «1,2».
- Prova sul web (`funzionalita/prova/c01-numeri.cjs`): in Aggiungi «1.800», «4.500,50», «2,5» salvati come 1800, 4500,5 e 2,5; Modifica mostra il peso «2,1»; `a1-mod-base` ora salva il peso «2,5» come 2,5 (prima 2).
- Verifiche (`funzionalita/prova/controllo.sh`, nuovo): tsc 0, eslint 0, jest 88 verdi (10 suite, 6 test nuovi), bundle Android 5,08 MB con 62 asset, 30 schermate senza errori in console.

## 22 novembre 2026 — Fase B, punto 1: prova di tutte le funzioni sul web, mappa del gestionale (bozza)

- Branch `funzioni/magazzino`, commit di soli documenti e script di prova (nessun file dell'app).
- Prova: `funzionalita/prova-funzioni.md` (riepilogo con le righe della lista B.1, 30 difetti nuovi P01-P30, ordine delle correzioni C01-C14); dettagli per area in `funzionalita/prova/esito-a1.md` … `esito-a4.md`; script Playwright `a1-…` `a4-…` con `lib.cjs`. 4 aree provate da 4 subagenti in parallelo, poi 95 scenari rilanciati dalla sessione principale con gli stessi esiti. «Funziona» = lo stato salvato cambia come deve.
- Esiti: A1 Inventario, Scheda, Modifica, Cronologia, Cestino 24 funzionano / 16 no / 4 non verificabili; A2 Aggiungi, Campi, Layout, Modelli, CSV 15 / 12 / 4; A3 Automazioni, Scanner, Azione rapida, Chat 37 / 8 / 5; A4 Impostazioni 29 / 10 / 5. Più gravi: Modifica cambia il link GS1, cancella i valori dei campi nel cestino e tronca «2,5»; si rivende un capo venduto e si vende dal cestino; posizioni e cartelle eliminate lasciano prodotti orfani; i modelli del Layout builder salvano un solo campo; il giro CSV perde cartella e foto.
- Difetti noti: confermati D02, D03, D12-D16, D18, D19, D21; già corretti D01, D04-D07 (D07 resta nel PDF), D11, D17, D22-D24.
- Mappa Wayfinder (bozza, si chiude dopo le correzioni): `funzionalita/map.md`, ticket `issues/01-10` decisi dall'agente (regola 4), `grafo-lavori.md` con le fette M01-M10. Rivista dopo il parere del revisore (venduto solo per i pezzi unici; scritture e letture della posizione da `stockOf`/`isAt` nello stesso commit; decimali; categorie e contatti in contesti propri).
- Verifiche: nessun file dell'app cambiato; tsc, eslint, jest come dopo F00.

## 22 novembre 2026 — Fase B, F00: conferme e avvisi funzionanti sul web

- Branch / SHA: `funzioni/magazzino` (tagliato da `ui-ux/stili` c2734a0), primo commit della fase B.
- Trovato preparando la prova delle funzioni: su react-native-web `Alert.alert` è vuoto (`static alert() {}`), quindi sul web nessun avviso compariva e nessun pulsante di conferma funzionava (138 chiamate: elimina, svuota cestino, ripristina, condividi, messaggi d'errore…).
- Fatto: `utils/webAlert.ts` (solo web, installato in `index.js`): senza pulsanti o con un solo OK → `window.alert`; una scelta più Annulla → `window.confirm`; più scelte → `window.prompt` col numero. Test `__tests__/webAlert.test.ts` (6). Su Android e iOS resta l'Alert nativo.
- Prova sul web (`funzionalita/prova/t-alert.cjs`, Playwright, campionario in un browser pulito): selezione multipla › cestino › conferma sì → prodotto con `deletedAt` ed evento «deleted» in cronologia; conferma no → nulla cambia.
- Aiuti per le prove della fase B: `funzionalita/prova/lib.cjs` (un browser pulito per scenario, campionario caricato, finestre del browser gestite, lettura dello stato salvato).
- Verifiche: base prima del task tsc 0, eslint 0, jest 76, bundle Android 5,08 MB; dopo tsc 0, eslint 0, jest 82 verdi (9 suite), bundle Android 5,08 MB con 62 asset, 30 schermate del campionario (`schermate.cjs`, `EXTRA=1`, porta 8082) senza errori in console.

## 22 novembre 2026 — UI/UX: bagliori con la trasparenza giusta sul telefono (dopo L9)

- Branch / SHA: `ui-ux/stili`, commit dopo L9.
- Trovato rileggendo `react-native-svg` (`extractGradient.ts`): sul telefono lo `Stop` di un gradiente prende il colore senza alfa e usa solo `stopOpacity`. I bagliori di Babilonia e Ishtar, scritti come `rgba(…, 0.36)` in `stopColor`, sarebbero usciti **pieni**; il web rispetta l'alfa, quindi le schermate non lo mostravano. Ora `Backdrop` separa colore e trasparenza (`splitAlpha` in `utils/color.ts`, con test). Sul web le schermate di Babilonia e Ishtar differiscono al massimo di 1-2 livelli di colore (arrotondamenti).
- D24 provato anche sui dati del campionario: con il modulo vuoto chiede la «Taglia», unico campo personalizzato obbligatorio; con la taglia scelta non chiede nulla.
- Messaggio di WatermelonDB al primo avvio web: misurato su 10 browser vuoti per versione, **1 su 10 sulla versione di partenza (8081) e 2 su 10 su quella nuova (8082)**: c'era già prima del tema.
- Verifiche: tsc 0, eslint 0, jest 76 verdi, bundle Android riuscito.

## 22 novembre 2026 — UI/UX L9: verifica finale nei 5 stili (tema chiuso)

- Branch / SHA: `ui-ux/stili`, commit di L9 dopo L7.
- Verifiche: tsc 0; eslint 0; jest 73 verdi; regole degli hook senza violazioni; bundle Android `--dev false` riuscito (5,1 MB, 62 asset); **31 schermate × 5 stili** (in sequenza) senza errori, carattere dello stile su ogni testo; in console solo il messaggio già noto di WatermelonDB al primo avvio in un browser vuoto (una volta su cinque giri, vedi L7); cambio di stile dal selettore con riavvio: 6 prove su 6 (`cambio-stile.cjs`, attuale → babilonia e attuale → minimal); ogni tipo di campo a 1/3, 1/2 e intera guardato nei 5 stili in L6c; tutte le icone dei cataloghi e dei dati con una resa (L4); colori delle posizioni su card, pillole e Scheda. `graphify update .`: 3533 nodi, 6872 archi.
- Schermate «dopo»: `ui-ux/schermate-dopo/` con un foglio JPEG per ognuna delle 9 schermate del campionario (prima a sinistra, poi Attuale rifinito, Babilonia Vetro, Ishtar Lab, Ardesia e rame, Minimal), 2,2 MB in tutto; fatte con `campionario/affianca.py`. Le 31 × 5 schermate intere restano fuori dal repository (pubblico, troppo pesanti).
- Non verificabile da qui: prova su un telefono Android (caratteri, vetro sfocato, ombre, barra di stato e di navigazione, cambio di stile e riavvio): da chiedere all'utente.
- Il tema è chiuso: L0-L7 e L9 fatti (L8 non si fa).

## 22 novembre 2026 — UI/UX L7: difetti del ticket 09

- Branch / SHA: `ui-ux/stili`, commit di L7 dopo L6f.
- Fatto:
  - **D04** campi strutturati della Scheda nell'ordine del layout (`utils/layoutOrder.ts`, test); i campi tolti dal layout vanno in fondo;
  - **D17** gli hook della Scheda prima del ritorno «Prodotto non trovato»;
  - **D06** messaggio nell'Inventario vuoto («Inventario vuoto») e quando cartella, filtro o ricerca non trovano nulla («Nessun prodotto qui»);
  - **D07** «Syncro Flow» nel titolo dell'Inventario, in Impostazioni › Info e nel testo di Scanner & Hardware (il PDF resta com'è, ticket 10);
  - **D11** «è» nei due messaggi di Aggiungi (gli altri file del codice sono già UTF-8 puliti: controllati tutti);
  - **D22** dopo il salvataggio si svuotano anche i campi personalizzati;
  - **D23** SKU vuoto accettato: si genera da solo (il generatore c'era già, lo bloccava il controllo);
  - **D24** i campi personalizzati obbligatori mostrati dal modulo vengono controllati al salvataggio (`utils/formValidation.ts`, test);
  - in più, stessi difetti di D17 fuori dal ticket: `CustomRunnerScreen` (andava in errore aperta da indirizzo o ricaricata) e `ScannerActionScreen` (hook chiamato solo a volte).
- Verifiche: tsc 0, eslint 0, jest 73 verdi (nuovi: ordine del layout, obbligatori); regole degli hook con `eslint-plugin-react-hooks` su `src`, `components`, `App.tsx`: **nessuna violazione**; schermate di Inventario, Scheda, Aggiungi, Impostazioni, Hardware e Azione rapida in attuale e ishtar senza errori; prova del filtro vuoto in babilonia: messaggio e titolo presenti, nessun errore in console.
- Messaggio in console già esistente, non del tema: al **primo avvio sul web in un browser vuoto** WatermelonDB trova il database vuoto e chiama `unsafeResetDatabase`; a volte LokiJS scrive «Deleting database failed because it's blocked by another connection» (la sua connessione è ancora aperta). Capita una volta per browser; l'app funziona. Da guardare nella fase B.
- Ancora da fare: L9.

## 22 novembre 2026 — UI/UX L6c-f: Aggiungi, Modifica, Impostazioni, Cronologia, Automazioni, scanner, chat

- Branch / SHA: `ui-ux/stili`, quattro commit (L6c, L6d, L6e, L6f) dopo L6b; ogni corsia fatta da un subagente su file separati, con le regole comuni del brief L6.
- L6c Aggiungi (`AddScreen.tsx`, nuovo `components/ui/formStyles.ts`, test `__tests__/formChoice.test.ts`): titolo «Aggiungi prodotto», titoli di sezione da `sectionLabel`, etichette su due righe al massimo, controlli della riga allineati in basso, campi con altezza e raggi dello stile (1/3 con `inputSmall`, segnaposto corti e unità a destra), scelte a riquadri con `tileSurface`, **D01** (la scelta multipla a riquadri ora è multipla, con logica pura testata), **D09** (pillole di Posizione e Cartella che vanno a capo), finestra dal basso opaca, pulsante principale con sfumatura.
- L6d Modifica (`EditScreen.tsx`): stessi controlli di Aggiungi tramite `formStyles`, struttura invariata (D03 fuori), barra Annulla/Salva con `Glass`.
- L6e Impostazioni (`SettingsScreen.tsx` e 11 schermate di `settings/`, Aspetto esclusa): card e righe con `cardSurface`, campi, pulsanti, pillole, riquadri, controlli a segmenti e interruttori sui ruoli, Layout builder con sezioni da `sectionLabel` e barra di salvataggio come la Scheda, finestre opache; il riquadro del Cestino è il rosso di dati `#EF4444` (il rosso d'errore di alcuni stili è troppo chiaro sotto il bianco).
- L6f (18 file: Cronologia, scheda Automazioni, `automations/*`, Scanner, Azione rapida, Chat e card del prodotto, lettore e disegno dei codici, pagina non trovata, Accesso, intestazioni native in `RootNavigator`): **D10** (pillole della Cronologia alte 36, non più gonfie), card e pulsanti sui ruoli, «Lo sapevi?» sulle superfici d'avviso, fotocamera su `cameraBackground` con bianchi fissi, codici su `qrPaper`/`qrInk`, intestazioni native con fondo dello stile e frecce `accentInk`.
- Verifiche: tsc 0, eslint 0, jest 68 verdi; **31 schermate × 5 stili** senza errori; carattere dello stile su ogni testo (in Aspetto solo i campioni degli altri stili, voluti); in console un solo messaggio del database web («Deleting database failed… blocked») in uno dei 5 giri lanciati insieme, non ripetuto rifacendo lo stesso stile due volte: corsa tra browser, non dell'app. `cambio-stile.cjs` attuale → minimal: 6 prove su 6. Schermate guardate stile per stile.
- Non verificato a schermo (servono scansioni vere o dati che il campionario non ha): righe Audit trovato/intruso, finestre del prezzo di Vendita flash e del Runner, card della chat venduta, Modelli di settore (nessuna voce li apre, D13).
- Ruoli che mancano (per dopo): testo sopra `error` e sopra i riempimenti di stato, pulsanti disattivati, raggio delle finestre dal basso, controlli a segmenti e interruttori.
- Note per dopo: `CustomRunnerScreen` va in errore se aperto da indirizzo o ricaricato (hook dopo il ritorno anticipato, difetto di prima); interruttore acceso sul web con il pallino predefinito di react-native-web; frecce interne `textPrimary`, native `accentInk`.

## 22 novembre 2026 — UI/UX L6a e L6b: Inventario e Scheda capo sulla tela

- Branch / SHA: `ui-ux/stili`, due commit (L6a, L6b) dopo la base comune di L6 (`Backdrop`, `GradientFill`, `Glass`, `surfaces`, `formatPrice`, `sectionLabel`, barra in basso nuova) e la correzione degli id dei bagliori.
- L6a Inventario (`HomeScreen.tsx`, subagente): intestazione con `t.title`, ricerca tonda, pillole delle cartelle e dei filtri «Tutti 6» con sfumatura sull'attiva, **3 statistiche in una riga** (la terza d'avviso solo se ci sono avvisi), card con `cardSurface`, foto 160 con margine e raggio dello stile, «Venduto»/«Attenzione», **posizione con nome e pallino del suo colore** (D05), prezzi «4.200 €»; selezione multipla e finestra «Gestisci» su fondi opachi.
- L6b Scheda (`DetailScreen.tsx`, subagente; HTML della stampa e testo da condividere invariati): titoli di sezione con l'iniziale maiuscola, riquadri con `tileSurface`, posizione col suo colore, prezzi in formato italiano, GS1 su card, pulsanti secondari sui ruoli, **barra fissa Indietro/Modifica con `Glass`** (modello per le altre barre fisse), finestra del QR opaca, visore su `cameraBackground`; pillole dei valori su `accentSoft` come nella tela (in Ishtar sui ruoli `chip` sparivano).
- Correzione della base: sul web più `Backdrop` montati insieme avevano lo stesso id SVG e la Scheda puntava alla definizione di uno sfondo nascosto (niente bagliori); ora ogni sfondo ha id unici.
- Verifiche: tsc 0, eslint 0 sui file; Inventario, Scheda e Scheda venduta nei 5 stili: nessun errore, nessun errore in console, carattere dello stile su ogni testo. Schermate guardate.
- Da rivedere più avanti (note degli agenti): nessun ruolo per il testo sopra `error`; la ricerca confronta l'id della posizione, non il nome; pesi e numeri non in formato italiano («2.1 kg», «3900 → 4200»); nel visore la foto mostrata può non essere quella del contatore (da indagare, D-nuovo); «Posizione di consegna» mostra il valore salvato (id se scelto da Modifica).
- Ancora da fare: L6c-f, controllo 31 × 5, L7, L9.

## 22 novembre 2026 — UI/UX L5e: Minimal (i 5 stili ci sono tutti)

- Branch / SHA: `ui-ux/stili`, commit di L5e dopo il commit di L5d.
- Fatto: `constants/themes/minimal.ts` generato e registrato. Ordine del selettore: Attuale rifinito (predefinito), Babilonia Vetro, Ishtar Lab, Ardesia e rame, Minimal.
- Verifiche: tsc 0, eslint 0, jest 63 verdi; 31 schermate in Minimal senza errori, `FONT=Inter` pulito (campioni degli altri stili in Aspetto, voluti). Contrasti ≥ 4,58 (segnaposto sul campo) tranne il bianco sui colori di dati delle posizioni (2,1).
- Per L6: in Minimal superficie e fondo sono tutti e due bianchi; le card di oggi non hanno bordo, quindi statistiche, righe dei Campi e card dei prodotti si distinguono solo per lo spazio. La tela le disegna con `surface-border` (in Minimal `#E7E6E3`): il bordo delle card va aggiunto nei ritocchi, in tutti gli stili.
- Ancora da fare: L6, L7, L9.

## 22 novembre 2026 — UI/UX L5d: Ishtar Lab

- Branch / SHA: `ui-ux/stili`, commit di L5d dopo il commit di L5c.
- Fatto: `constants/themes/ishtar.ts` generato e registrato (terzo nel selettore, dopo Babilonia); primo stile chiaro: barra di stato scura. Pagina «non trovata» portata sui ruoli (icona `accentInk`, testo `textSecondary`, pulsante `button`/`onButton`/raggio del pulsante): il grigio `#CCCCCC` scritto a mano non si leggeva sul chiaro.
- Verifiche: tsc 0, eslint 0, jest 61 verdi; 31 schermate in Ishtar senza errori, `FONT=Urbanist` pulito (campioni degli altri stili in Aspetto, voluti). Contrasti ≥ 5,0 tranne il bianco sui colori di dati delle posizioni (2,1). Guardate le 9 schermate, le 4 lunghe e le 13 in più: tutto leggibile; i bagliori della tela non ci sono ancora (L6f).
- Ancora da fare: L5e, L6, L7, L9.

## 22 novembre 2026 — UI/UX L5c: Ardesia e rame

- Branch / SHA: `ui-ux/stili`, commit di L5c dopo il commit di L5b.
- Fatto: `constants/themes/ardesia.ts` generato e registrato.
- Verifiche: tsc 0, eslint 0, jest 59 verdi; 31 schermate in Ardesia senza errori, `FONT=Manrope` pulito (in Aspetto i campioni degli altri stili, voluti). Contrasti ≥ 5,5 tranne il bianco sui colori di dati delle posizioni (2,1). Le 9 schermate si leggono; i titoli di sezione in maiuscolo color rame vengono dal token (`section-transform`), le pillole a raggio 10 dal token `chip-radius`.
- Ancora da fare: L5d-e, L6, L7, L9.

## 22 novembre 2026 — UI/UX L5b: Babilonia Vetro

- Branch / SHA: `ui-ux/stili`, commit di L5b dopo il commit di L3.
- Fatto: `constants/themes/babilonia.ts` generato e registrato (secondo nel selettore). Nuovo `campionario/cambio-stile.cjs`: sceglie uno stile da Aspetto e controlla scelta salvata, stile applicato subito restando sulla schermata, testo scritto in Aggiungi non perso, stile e prodotti presenti dopo il riavvio.
- Verifiche: tsc 0, eslint 0, jest 57 verdi; `cambio-stile.cjs` attuale → babilonia: 6 prove su 6 riuscite (chiude anche la prova di L3); 31 schermate in Babilonia senza errori, `FONT=Outfit` pulito (l'unico testo in Inter è il campione di Attuale nella schermata Aspetto, voluto). Contrasti ≥ 5,3 tranne bianco su accento `#0A84FF` 3,65 (solo icone e testo grande, come da tela) e bianco sui colori di dati delle posizioni (2,1). Le 9 schermate del campionario si leggono; bagliori, vetro e barra sospesa non ci sono ancora (L6f).
- Ancora da fare: L5c-e, L6, L7, L9.

## 22 novembre 2026 — UI/UX L3: Impostazioni › Aspetto

- Branch / SHA: `ui-ux/stili`, commit di L3 dopo il commit di L5a.
- Fatto: sezione «ASPETTO» in cima a Impostazioni con una riga uguale alle altre (riquadro icona `palette`, «Stile: <nome>»); nuova schermata `src/screens/settings/AppearanceScreen.tsx` (rotta `SettingsAppearance`, indirizzo `settings/appearance`) con gli stili pronti di `THEMES`: striscia con fondo, superficie e accento, campione nel carattere dello stile (sul web i file di tutti gli stili si caricano aprendo la schermata), «Predefinito», scelta a pallino; toccare uno stile lo applica (appena il carattere è pronto) e lo salva in `@syncro/stile`. Schermata 22 aggiunta a `schermate.cjs` (`EXTRA=1`).
- Verifiche: tsc 0, eslint 0; 31 schermate senza errori, controllo `FONT=Inter` pulito. La prova del cambio di stile e del riavvio si fa con il secondo stile (L5b).
- Ancora da fare: L5b-e, L6, L7, L9.

## 22 novembre 2026 — UI/UX L5a: caratteri e Attuale rifinito predefinito

- Branch / SHA: `ui-ux/stili`, commit di L5a dopo il commit di L4.
- Fatto: installati `@expo-google-fonts/outfit`, `/urbanist` e `/manrope` (OFL, `npm install --legacy-peer-deps`); 14 TTF in `android/app/src/main/assets/fonts/` (Inter e Outfit 400-600, Urbanist e Manrope 400-700, 1,8 MB) con le licenze; `constants/themes/fonts.web.ts` carica con `expo-font` solo i file dello stile attivo, `fonts.ts` (telefono) non fa nulla. `ThemeProvider`: al primo avvio aspetta scelta e carattere; cambiando stile carica il carattere e solo dopo applica lo stile, senza smontare l'app (vince l'ultima scelta). `fontStyle(t, peso)` in `Text.tsx` per i testi di React Navigation (caratteri del tema di navigazione, etichette della barra). Barra di stato chiara o scura secondo lo stile (`expo-status-bar`), pulsanti della barra di navigazione Android con `expo-navigation-bar` (edge-to-edge attivo: si cambia solo il colore dei pulsanti), fondo e carattere della pagina web. Generato `constants/themes/attuale.ts` e registrato in `THEMES`: **è il predefinito**.
- Verifiche: tsc 0, eslint 0, jest 55 verdi (nuovi: predefinito, file del carattere presenti per Android e nel registro web, chiavi tipografiche). Web: 30 schermate nello stile `attuale`, nessun errore; nuovo controllo `FONT=Inter` in `schermate.cjs`: tutti i testi su `Inter_*` con peso normale, tranne la zona di trascinamento del CSV (un `div` HTML in Times New Roman, corretta col carattere della pagina). Contrasti di `attuale`: tutti ≥ 5,2 tranne il bianco sui colori di dati delle posizioni (2,1 sull'oro, come oggi). Bundle Android `--dev false` riuscito: 5,0 MB, 62 asset come in L0 (i TTF dei caratteri non passano da Metro). `newArchEnabled=true`: le `boxShadow` dei temi valgono anche su Android.
- Non verificabile da qui: caratteri, barra di stato e barra di navigazione su un telefono Android; iOS non ha i caratteri (servirebbero in `Info.plist`, fuori dal lavoro).
- Per L6e: il catalogo icone del Layout builder ha `timeline` (ora `history` della famiglia community) e `history` (MaterialIcons): due icone quasi uguali.
- Ancora da fare: L3, L5b-e, L6, L7, L9.

## 22 novembre 2026 — UI/UX L4: icone nuove

- Branch / SHA: `ui-ux/stili`, commit di L4 dopo 0f227c9.
- Fatto: `ICON_REPLACEMENTS` in `components/ui/AppIcon.tsx` con la tabella del ticket 07 (barra in basso con la versione piena per la voce attiva, `active={focused}` in `TabsNavigator`; Peso `weight`, misure `tape-measure`, «Tutti» `folder-multiple`). In più, come nella tavola Scheda della tela: Larghezza delle misure (`width-wide`) → `arrow-expand-horizontal`, e il Peso delle misure della Scheda usa il nome dell'icona del campo Peso (`fitness-center` → `weight`) invece di `scale`. La tabella vale ovunque: i nomi salvati nei dati non cambiano. Nel modulo Aggiungi la Larghezza resta `tape-measure`, perché l'icona viene dal campo salvato (`straighten`).
- Verifiche: tsc 0, eslint 0, jest 52 verdi. Controllo dei cataloghi (10, 8, 39, 106 icone), delle 76 icone dei dati (modelli, campi di sistema) e dei 104 nomi scritti nel codice: tutte hanno una resa, nessun doppione nei cataloghi dopo le sostituzioni. Schermate (30, contro la 8081 a L0): cambiano solo le icone sostituite e la riga sotto le intestazioni (già nota dal G1); la Scheda intera è 1 px più alta per l'altezza dei glifi nuovi.
- Ancora da fare: L5a, L3, L5b-e, L6, L7, L9.

## 22 novembre 2026 — UI/UX L2 e controllo G1: schermate sul tema attivo

- Branch / SHA: `ui-ux/stili`, un commit per corsia (L2a-L2e) e uno per G1, dopo a9e479e.
- Fatto: uno script (in scratchpad, non nel repository) ha fatto la parte meccanica su 34 file (import, `StyleSheet.create` → `makeStyles`, `theme.*` → `t.colors.*` ecc., `MaterialIcons` → `AppIcon`, `Text`/`TextInput` dell'app); sette subagenti con file separati hanno messo gli hook nei componenti, portato i colori scritti a mano sui ruoli e scelto il ruolo giusto dove il valore di `oggi` era identico; L2e (App, navigazione, tema di React Navigation dallo stile attivo, barra in basso su `t.bar`/`t.tab`) fatta dalla sessione principale. Nessun `StyleSheet.create` resta nel codice vivo; i colori di dati restano scritti a mano.
- Regola ESLint del G1: blocco TypeScript in `eslint.config.js` con `no-restricted-imports` su `constants/theme` (esclusi i temi, `app/`, `DynamicFieldRenderer` e il test del tema); il plugin `@typescript-eslint` è registrato solo per riconoscere i commenti già presenti.
- Verifiche: tsc 0; eslint 0; jest 52 verdi. Schermate: alle 18 del campionario si aggiungono 12 schermate raggiunte per indirizzo (`EXTRA=1`: posizioni, cartelle, GS1, hardware, cestino, condivisione, quattro automazioni, azione rapida, pagina non trovata); «prima» prese dal checkout principale (porta 8081, stesso codice di L0, verificato identico). A soglia zero: **21 su 30 identiche**; le altre 9 differiscono solo per la riga di 1 px sotto le intestazioni native, che passa dal grigio chiaro `#D8D8D8` del tema predefinito di React Navigation al bordo del tema (`#374151`): effetto atteso del tema di navigazione (L2e). Il titolo della finestra di scelta (D08) non compare nelle schermate.
- Regole degli hook (controllo a parte con `eslint-plugin-react-hooks`): nessuna violazione nuova; restano quelle di prima in `DetailScreen` (D17, L7), `CustomRunnerScreen` (`useCallback` e `useState` dopo il ritorno anticipato) e `ScannerActionScreen` (`useLocalSearchParams` condizionale), queste due fuori dal ticket 09.
- Per L6: `ui-ux/note-l2-per-l6.md` elenca i colori rimasti scritti a mano e i punti dove il ruolo giusto ha oggi un valore diverso.
- Ancora da fare: L4, L5a (caratteri), L3, L5b-e, L6, L7, L9.

## 22 novembre 2026 — UI/UX L1: fornitore del tema e aiuti

- Branch / SHA: `ui-ux/stili`, commit di L1 dopo faf0f3a.
- Fatto: `constants/themes/` (tipo `AppTheme` con ruoli per ciò su cui stanno, tema `oggi` che importa i valori di `constants/theme.ts`, lasciato com'era; registro `THEMES` vuoto, predefinito `attuale` appena c'è; `README.md` con la regola dei ruoli e la tabella oggi → ruolo → token); `contexts/ThemeContext.tsx` (fornitore montato in `App.tsx`, chiave del dispositivo `@syncro/stile` letta come id semplice, nulla disegnato finché non è letta; `useTheme`, `useStyleChoice`, `makeStyles` con un foglio per tema); `utils/color.ts` (`withAlpha`, uscita `rgba()`); `components/ui/AppIcon.tsx` (tabella vuota, icona di riserva `label-outline` per i nomi sconosciuti); `components/ui/Text.tsx` (`Text` e `TextInput` che per ora passano lo stile); `h2`, `h3`, `overline` definiti nel tema (D08).
- Scelte: il piano chiamava `onPrimary` il nero sopra l'oro e `onAccent` il bianco sui riquadri colorati; ora sono `onAccent` (come `on-accent` della tela) e `onData`. Un ruolo si usa in L2 solo se nel tema `oggi` ha esattamente il valore di quel punto; altrimenti resta il nome generico fino a L6.
- Verifiche: tsc 0 errori; eslint 0; jest 5 suite, 52 test (6 nuovi in `__tests__/theme.test.ts`); 18 schermate identiche a L0 a soglia zero (confronto sul canale più diverso).
- Scoperto: `eslint.config.js` non ha configurazione per `.ts`/`.tsx`, quindi `npx eslint .` controlla solo i `.js`; il «verde» di eslint non dice nulla sulle schermate. La regola `no-restricted-imports` del controllo G1 avrà un blocco TypeScript proprio (`@typescript-eslint/parser` 8.67 è già installato).
- Ancora da fare: L2 (cinque corsie).

## 22 novembre 2026 — UI/UX L0: punto di partenza

- Branch / SHA: `ui-ux/stili` da 81d78aa, worktree `D:\FurInventory Pro\inventory-stili` (copia di `node_modules` del checkout principale). Versione web del worktree sulla porta 8082 (configurazione `syncro-flow-stili-web` in `D:\FurInventory Pro\.claude\launch.json`; la 8081 è occupata dal checkout principale), seed su 8765 (`campionario-seed`).
- Verifiche: `npx tsc --noEmit` 0 errori; `npx eslint .` 0 problemi; jest 4 suite, 46 test verdi; bundle Android `--dev false` riuscito (5,0 MB, 62 asset); avvio web riuscito.
- Schermate «prima»: le 18 del campionario rifatte nel worktree sono **identiche pixel per pixel** a quelle del ticket 03 (`schermate-attuali/`): il campionario è deterministico, quindi il controllo G1 può confrontare pixel per pixel.
- `campionario/schermate.cjs`: nuovi parametri facoltativi `[stile] [cartella]` e variabile `APP` per la porta; lo stile viene scritto in `@syncro/stile` prima di caricare.
- Ancora da fare: L1.

## 22 novembre 2026 — UI/UX: mappa chiusa, branch `ui-ux/stili`

- Branch / SHA: nuovo branch `ui-ux/stili` da main a cfcdecb, con un commit dei soli documenti del piano; pubblicato su GitHub (repository pubblico) con il sì dell'utente. Il checkout principale resta su main.
- Risposte dell'utente: sì al branch locale e alla pubblicazione su GitHub; sì ai ritocchi comuni, con la regola «il modo più giusto e corretto e semplificato».
- Fatto: ticket 07 (8 icone da sostituire, 13 nomi controllati nel glyphmap), 08 (ritocchi), 09 (difetti: entrano D01, D04-D11, D17, D22-D24, divisione dell'agente su delega dell'utente) e 10 (stampa invariata, L8 tolto) risolti; mappa chiusa; `grafo-lavori.md` aggiornato.
- Nota per il merge futuro: nel checkout principale (main) i documenti del piano restano come modifiche non committate, identiche a quelle del branch; prima di unire `ui-ux/stili` in main vanno scartate lì (con il sì dell'utente).
- Ancora da fare: esecuzione da L0 nel branch `ui-ux/stili`.

## 22 novembre 2026 — UI/UX: tutti e 5 gli stili, scelti in Impostazioni

- Branch / SHA: main a cfcdecb. Nessuna modifica al codice dell'app, nessun commit.
- Decisione dell'utente: vuole tutti e 5 gli stili della tela nell'app, con la scelta in Impostazioni. Il cambio tema dall'app, prima fuori ambito, entra nel lavoro.
- Fatto:
  - ticket 08 risolto per la parte sullo stile; predefinito proposto Attuale rifinito; scelta salvata sul dispositivo, fuori dallo spazio di lavoro;
  - estratti dalla tela i 93 token di ogni stile in `ui-ux/temi/token-stili.json` (dalle tavole Inventario; stessi nomi nei 5 stili; per Babilonia controllato che Scheda e Aggiungi abbiano gli stessi valori, per gli altri 4 non controllato);
  - `map.md` aggiornata (destinazione, tema scelto dall'app al posto del tema statico, ambito); `grafo-lavori.md` riscritto: fornitore del tema e `makeStyles` in L1-L2, nuovo L3 selettore «Aspetto», L5 diviso in 5 temi (prima gli scuri), ritocchi L6 una volta per tutti gli stili, verifica L9 nei 5 stili; ticket 10 riformulato (proposta: stampa indipendente dallo stile).
- Misure: 40 file con `StyleSheet.create` (31 importano il tema), circa 250 righe che leggono il tema fuori dagli stili.
- Ancora da fare: risposta dell'utente sui ritocchi comuni (ticket 08) e sui difetti (09); permesso per un branch locale; poi l'esecuzione da L0.

## 22 novembre 2026 — UI/UX: campionario, ricerche e 5 prototipi (ticket 03-06)

- Branch / SHA: main a cfcdecb. Nessuna modifica al codice dell'app, nessun commit.
- Fatto:
  - ticket 03: campionario di prova come seed solo per sviluppo in `piani di implementazione/ui-ux/campionario/` (16 campi personalizzati di ogni tipo, layout con 1/3, 1/2 e intera, 6 capi con foto di pubblico dominio da Wikimedia Commons); 18 schermate a 375 px in `ui-ux/schermate-attuali/`, fatte in un Chromium isolato (lo spazio locale dell'utente non è stato toccato);
  - ticket 04 (subagente): MaterialCommunityIcons per le sole sostituzioni, MaterialIcons per il resto;
  - ticket 05 (subagente): vetro solo su barra, intestazioni e finestre; carattere globale con un `Text` dell'app; `Text.defaultProps` non funziona con React 19;
  - ticket 06: tela Claude Design nuova https://claude.ai/artifact/GSuFD111jGM9FSNt5W5fHK con le schermate di oggi e 5 stili (Babilonia Vetro, Ishtar Lab, Attuale rifinito con `unslop`, Ardesia e rame, Minimal) su una struttura comune, barra in basso nuova e schede dei token.
- Verifiche: le schermate del campionario mostrano tutti i 16 campi nella Scheda; nomi delle icone proposte controllati nel glyphmap; affermazioni chiave del ticket 05 controllate nei sorgenti (`Text` è un componente funzione, `experimentalBlurMethod` esiste). La tela non è stata aperta a vista.
- Problemi: il server Playwright MCP si è bloccato due volte per 30 minuti; sostituito da `campionario/schermate.cjs` con Playwright da shell.
- Ancora da fare: ticket 08 (scelta dello stile, con l'utente), 07 (icone da sostituire), 09 e 10; poi l'esecuzione secondo `grafo-lavori.md`.

## 22 novembre 2026 — UI/UX: app capita e lavoro pianificato (fasi 1 e 2)

- Branch / SHA: main a cfcdecb. Nessuna modifica al codice dell'app, nessun commit.
- Fatto:
  - letto il codice di tipi, campi personalizzati, layout builder, modelli, Aggiungi, Scheda, Modifica, Inventario, tema; tre agenti in sola lettura hanno letto le altre schermate, i servizi e misurato colori e icone;
  - viste sul web (porta 8081, già avviata) Inventario vuoto, Aggiungi, Automazioni, Impostazioni, Cronologia;
  - scritti `docs/design/mappa-funzionale.md` (sostituisce `regole-temi.md`, ora solo un rimando), `piani di implementazione/ui-ux/` con `map.md` (Wayfinder, tracker locale), 10 ticket in `issues/`, `grafo-lavori.md`, `audit-tema.md`, `difetti-trovati.md`.
- Correzioni alla bozza del 21 novembre: il layout governa solo Aggiungi (Scheda e Modifica hanno struttura fissa); `segmented` = `grid` e `picker` = finestra dal basso; il tema è importato da 31 file, non 58; i colori scritti a mano sono 423 in 39 file (esclusa `app/`, codice morto).
- Verifiche: nessuna prova di build (nessun codice cambiato). Sul web: pillole di Cronologia gonfie, pillole di Posizione tagliate a ½, inventario vuoto senza messaggio.
- Risposte dell'utente: «Redex» = pannello Ishtar Lab (`C:\Users\reda_\Desktop\redx`, token nel ticket 01); tela Claude Design nuova; uno stile è l'attuale nero e oro rifinito con `unslop`; barra in basso da ridisegnare in tutti gli stili.
- Ancora da fare: campionario di prova, ricerche su icone ed effetti, 5 prototipi sulla tela nuova, scelta dello stile, esecuzione secondo il grafo.

## 21 novembre 2026 — Proposte di stile fermate, passaggio a nuova sessione

- Branch / SHA: main a cfcdecb (pubblicato). Nessuna modifica al codice dell'app.
- Fatto: aperta in Claude Design la tela «Syncro Flow · 5 stili» e disegnate alcune schermate in 4 stili. L'utente ha fermato il lavoro: le proposte erano state fatte senza leggere come funzionano Campi personalizzati e Layout builder e si allontanavano dalla versione attuale.
- Decisione dell'utente: l'interfaccia va aggiornata, non cambiata. Ordine: capire l'app, piani di implementazione, proposte UI/UX, agenti esecutori.
- File: `PASSAGGIO_UI_UX.md` (consegne complete), `docs/design/regole-temi.md` (prima mappa, da verificare).
- Ancora da fare: tutto il lavoro UI/UX, nella nuova sessione.

## 21 novembre 2026 — Allineamento locale, verifica RN e avvio web

- Branch / SHA: main a 42dc07e (fast-forward di 46 commit da b3fc44d). Anche la copia `onspace-9b4wtn-11197` portata a 42dc07e. Modifiche locali non committate.
- Fatto:
  - Da `feature/auth-and-sync` (commit 60e8068 e 35a5ada, non presenti su main) recuperati solo i fix TypeScript di `backend-auth/` e la configurazione Metro (`@expo/metro-config` + controllo di tailwindcss). Log, script `fix_*` e screenshot del branch non presi.
  - Web: `index.js` monta l'app con `registerRootComponent` solo sul web (Android/iOS invariati con `AppRegistry.registerComponent('main')`); `app.json` web output `single`.
  - WatermelonDB: nuovo `src/db/adapter.ts` (SQLite, nativo) e `adapter.web.ts` (LokiJS + IndexedDB), perché l'adapter SQLite rompeva il bundle web.
  - `backend-auth/supabase/client.ts`: se `expo-constants` non ha il manifest (web) legge URL e chiave publishable da `app.json`.
  - Expo ha riscritto `tsconfig.json` all'avvio (`extends: expo/tsconfig.base`), come già sul branch feature.
- Verifiche e risultato: `tsc --noEmit` 0 errori (prima 12, tutti in `backend-auth/`); eslint ok; jest 46/46 superati (jest non è nei devDependencies: eseguito con `npx jest@29.7.0`); bundle Android `react-native bundle` compilato; web su http://localhost:8081 mostra la schermata di accesso senza errori in console.
- Problemi/rischi: login Google, dati Supabase, NFC, mesh LAN e build APK non provati. Su web l'NFC non esiste (solo avviso). Il redirect OAuth web (`http://localhost:8081`) deve essere tra gli URL consentiti in Supabase: non verificato.
- Login Google disattivato su richiesta dell'utente (non funzionante): `LOGIN_ENABLED = false` in `contexts/AuthContext.tsx`. L'app parte senza schermata di accesso, con lo spazio di lavoro locale `local`; `InventoryContext` salta Supabase (snapshot, realtime, Storage, Drive) quando non c'è sessione; in Impostazioni team/inviti e "Esci" sono nascosti. Verificato sul web: Home, Aggiungi e Impostazioni si aprono; tsc, eslint e jest ok.
  - Nota per la riattivazione: al primo avvio i vecchi dati locali pre-tenant migrano nello spazio `local`, non nel futuro workspace cloud.
- Restano solo sul branch feature: schermate `app/(auth)`, `app/(tabs)/export.tsx`, `hooks/useAuth.ts`, `utils/exportImport.ts` (commit 3411a65, non usate dall'`App.tsx` attuale) e i fix Flutter di 60e8068 (`product.dart`, `inventory_provider.dart`, `home_screen.dart`).
- Ancora da fare: aggiungere `jest` ai devDependencies; valutare `babel-preset-expo` (usato sul branch feature) per il web; provare l'app su telefono.

## 20 ottobre 2026 — Pubblicazione richiesta su main

- Su richiesta dell'utente, pubblicati i tre documenti anche su GitHub main.
- Nuovo commit main: 3c4ac042b3cd20bdc011c44237231c08ded1a85d, basato sul precedente head 7386308a012806df9e28955d6cd1f995178499a4.
- Rifiniti branch e cronologia nel commit main finale 49e83daea42419ffd129d180b190aa247856890c.
- La prima pubblicazione era avvenuta sul branch feature/auth-and-sync; main ora contiene la copia richiesta.
- Rimossi i documenti dalla punta del branch feature per mantenerli soltanto su main; head feature risultante b1b36d6ddff1daa73df718387506c1a9d608f474.
- Il checkout locale resta sul branch feature e non è stato riallineato perché Git non riconosce il workspace come worktree.

## 20 ottobre 2026 — Documenti creati e pubblicati

- Creati README, piano di implementazione e cronologia nella cartella piani di implementazione.
- Pubblicati su GitHub nel branch feature/auth-and-sync con commit 859f387722a7014dda08928b3438d1b494c266ac.
- Aggiornata la cronologia e pubblicata la verifica finale con commit 8f40e4568ce98b15733c91d1d253948615adf95f.
- La cronologia descrive lo stato iniziale verificato; le funzioni applicative e le prove restano aperte come indicato nel piano.

## 20 ottobre 2026 — Analisi e decisioni SaaS/backup

### Attività documentali completate

- Letti AGENTS.md, struttura del repository e documenti locali auth/cloud/offline-first.
- Interrogato Graphify; la query non ha restituito risultati e ha segnalato discrepanza di versione. JSON usato come fallback; grafo datato al commit bac43a2.
- Verificato GitHub: main a 7386308, feature a 73f6d3b, divergenza 27 commit di main e 4 esclusivi del feature; base comune 741f2b1.
- Tentato git status; errore “not a work tree”, quindi lo stato locale non è confermato.
- Verificato Supabase ID esatto ymsnlixracwjgajldryb: attivo/sano; migrazioni fino a 20261020084229_fix_inventory_snapshot_rls_helpers; 12 tabelle public con RLS attiva e zero righe; bucket organization-media privato; nessuna Edge Function o branch di sviluppo.
- Verificato Google Cloud syncro-flow-app-20261020 attivo, con Drive e Sheets API abilitate.
- Non trovati file .env.local reali; esempio Supabase combacia, variabili Google sono placeholder. OAuth, account e link Drive reale non verificati.
- Ricerca web via agent-reach/Exa: consultati Infor WMS, Oracle WMS, Itemra Docs. Ricerca aggiuntiva fermata al limite gratuito Exa.
- Nessun test, login, upload, modifica DB o scrittura cloud eseguiti.

### Decisioni dell'utente registrate

- RN v1 e Flutter v2 sono SaaS distinti con Google Cloud, Supabase, OAuth, archivi e backup separati.
- Backup selezionabile: giornaliero, settimanale, mensile o manuale, con prodotti, foto/documenti, CSV, PDF e cronologia.
- Accesso e recupero da telefono/computer con sincronizzazione verso gli altri telefoni autorizzati.
- Import mobile via file/condivisione e drag-drop dove supportato; esperienza browser con drag-and-drop.
- Prova Drive: autenticazione, prodotto sintetico con foto, export con link e controllo dal secondo dispositivo.

### Ancora da fare

- Ripristinare la verifica Git del workspace e scegliere la baseline corretta.
- Stabilire se il Supabase esistente è produzione o staging; predisporre ambiente test isolato.
- Configurare manualmente OAuth e fornire account/link Drive autorizzato per prova.
- Implementare le fasi elencate in PIANO_IMPLEMENTAZIONE.md solo dopo approvazione.
- Eseguire test A/B, backup/restore, Drive, import/export, offline/LAN e prove multi-dispositivo dopo l'approvazione.
- Chiarire destinazione/retention dei backup, uso rete mobile e processi WMS richiesti.

## Modello per le prossime voci

Per la prossima voce aggiungere in cima:

### AAAA-MM-GG — Attività

- Branch / SHA:
- Fatto:
- File e servizi:
- Verifiche e risultato:
- Problemi/rischi:
- Ancora da fare:

