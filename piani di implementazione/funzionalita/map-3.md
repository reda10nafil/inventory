# Mappa Wayfinder 3 — richieste dell'utente del 23 novembre

Terza mappa di `funzioni/magazzino`, dopo [`map.md`](map.md) (fase B, ticket 01-10) e [`map-2.md`](map-2.md) (ticket 11-20). Tracker locale: questa mappa e un file per ticket in `issues/` (21-30), più gli aggiornamenti dei ticket 14, 15, 16 e 18. Scritta dall'orchestratore 3 il 23 novembre 2026 mattina, dopo sei verifiche in sola lettura (resoconti in [`ricerche/verifiche-23/`](ricerche/verifiche-23/)) e le risposte dell'utente.

## Destination

Un elenco di fette pronte da eseguire, ognuna con il **piano di implementazione** e il **piano di verifica** nel suo ticket, che copre **tutte** le richieste dell'utente del 23 ([`richieste-utente-23-novembre.md`](richieste-utente-23-novembre.md), punti 1-11), più un **piano di collaudo finale** ([`collaudo-finale.md`](collaudo-finale.md)) che percorre l'app come l'utente e controlla che tutto sia collegato. Nessun pezzo perso: tabella di copertura in fondo.

## Notes

- Regole dell'utente: «il modo più giusto e corretto e semplificato»; «non puoi perdere pezzi in giro».
- **Differenza da Wayfinder puro**, come in `map-2.md`: i ticket portano anche il piano di implementazione e di verifica, e la mappa ha la tabella «Fette da eseguire». Le decisioni aperte si chiedono all'utente **una alla volta, quando la loro fetta è la prossima**; ogni ticket dice chi ha deciso (utente / proposta dell'orchestratore).
- Restano i vincoli della fase B (`grafo-lavori.md`, regole 1-7) e di `map-2.md`: dati per spazio, campi nuovi facoltativi, nessuna perdita, logica in `utils/` con test, ruoli del tema nei 5 stili, `controllo.sh` verde, voce in `../CRONOLOGIA.md`, decisioni in `../DECISIONI_DA_RIVEDERE.md`, push su `funzioni/magazzino`, mai su `main`, `LOGIN_ENABLED = false`, `syncro_flow_flutter/` e `app/` intoccabili, una fetta alla volta nel worktree `inventory-stili`.
- **Sigle**. Le sigle nude dei resoconti si scontrano con le fette (L1 login, I1 foto WebP, F…) e con la prova del 22 (P01-P31, gruppi A1-A4): nei ticket e nei brief si usano **con il prefisso dell'area**:
  - `NG01-NG27` NFC e GS1 (già unici);
  - `AU-V01…V16`, `AU-N13`, `AU-N17`, proposte `AU-A0…A9` (automazioni);
  - `CAM-F1…F11` campi, `CAM-L1…L12` layout;
  - `CSV-E1…E6` export, `CSV-I1…I10` import, `CSV-G1…G6` galleria e foto;
  - `IND-1…IND-9` difetti del tasto Indietro, `IND-P1…P9` proposte;
  - `CT01…` Chat e Team.
  Restano come sono D.. e P.. (prova del 22), C01-C15 (correzioni), M01-M10, C1, C2, S1a, S1b, S2, S3, N0-N2, I1-I3, L0-L2.
- **Nomi delle fette nuove** (nessuna collisione): GAL, FOTO, COD, ESE, VAL, IND, EDC, MOD, MCAT, EXP, IMP, ETI, GS1, FLU1, CON, FLU2, RIO, RES, VOCI, CHAT1, RIC1, RIC2, RETE1, RETE2, RIC3.
- **Vincoli tra le fette** (dai resoconti):
  1. **non alzare `version` del layout**: `LayoutContext.tsx:122-127` sostituirebbe il modulo dell'utente con il predefinito; correggere quel caricamento (fetta MOD) prima di qualunque cambio di forma;
  2. **mai rinumerare gli id delle opzioni né cambiare gli id dei campi** (valori, allegati, lotto GS1, cronologia ci puntano);
  3. **i moduli per categoria stanno nella chiave del layout** (`byCategory`), non in `Library`: a cloud acceso le categorie si sincronizzano, campi e layout no;
  4. **il riordino delle foto sposta insieme `images` e `storageImagePaths`**;
  5. **il lettore unico (`utils/codes.ts`) riconosce anche i link GS1 già stampati** e scritti sui tag; i `gs1DigitalLink` salvati non si riscrivono mai;
  6. **i difetti che rovinano dati non aspettano i ridisegni**: hanno fette proprie in testa all'ordine (GAL, COD, ESE, VAL).
- **Base delle verifiche**: `4b94e4c` più la copia di lavoro di S1a, uguale a `7bfcd72` salvo `LocationsScreen`, `FoldersScreen` e `utils/shelves.ts`, toccati da S1a dopo l'inizio delle verifiche. Ogni esecutore **riproduce su `HEAD` i difetti della sua fetta prima di correggerli** (NG24 e NG25 soprattutto). I numeri di riga dei resoconti sono di `4b94e4c`.
- Script e CSV delle verifiche in `ricerche/verifiche-23/script/<area>/`: usano `prova/lib.cjs` per percorso relativo; si copiano in `prova/` quando una fetta li adotta.
- Prove sul telefono: elenco a parte in `collaudo-finale.md`, gruppo T; restano «non provato» finché non si fanno.

## Decisions so far

- [Scaffale: capacità](issues/14-scaffale-capacita.md) (utente, 22 e 23): ripiano con misure e barra appendiabiti; controllo del singolo prodotto (`fitsShelf`); altezza nel prodotto.
- [Scaffale: riempimento e blocco](issues/15-scaffale-riempimento.md) (utente, 23): soglie 50/80 confermate; avviso dall'80%; **blocco quando il prodotto non entra**, con la proposta di uno scaffale adatto; nessun «Metti comunque». Supera «mai un blocco» del 22.
- [«Tipo di pelle» solo nei campi, freccia Indietro](issues/21-tipo-di-pelle-nei-campi.md) (utente, 23): voce tolta, valori da Campi Personalizzati con un editor a id stabili; freccia che torna alla scheda madre.
- [Codici, QR, etichette e NFC](issues/22-codici-qr-etichette-nfc.md) (utente, 23): QR e tag **solo per l'app**, portano il codice; un lettore unico; una finestra «Codice ed etichetta»; GS1 conforme solo da «Avanzate» (**COD fatta il 23**: lettore unico e codici che non si rovinano).
- [Campi personalizzati](issues/23-campi-personalizzati.md) (proposta, forma generale approvata): editor in tre domande, valori pronti, aspetti nuovi, icone e colori, opzioni a id stabili (**VAL fatta il 23**: valori corretti e disegnatore unico; resta EDC).
- [Modulo](issues/24-modulo.md) (utente, 23): il layout builder diventa la scheda «Modulo» di Impostazioni › Campi, con bozza Salva/Annulla.
- [Campi per categoria](issues/25-campi-per-categoria.md) (utente, 23): «selettori» = Modelli di settore; ogni categoria il suo modulo, le sottocategorie ereditano; categoria in testa ad Aggiungi.
- [CSV](issues/26-csv-import-export.md) (proposta): schermata d'import con abbinamento, anteprima, rifiutate, «crea campo» con andata e ritorno; export con una colonna per campo.
- [Foto](issues/27-foto.md) (proposta): galleria unica (**GAL fatta il 23**); foto che restano sul web e su Android (FOTO).
- [Indietro e icone](issues/28-indietro-e-icone.md) (proposta): resto del tasto Indietro (**IND fatta il 23**: X nello Scanner, Conta col tasto di sistema, «Prodotto non trovato» con il pulsante); icone non riprodotte, solo collaudo.
- [Automazioni](issues/29-automazioni.md) (proposta): prima l'esecuzione corretta, poi ricevimento, uscita, trasferimento, conta, passi nuovi, riordino, reso.
- [Chat e Team](issues/30-chat-e-team.md) (utente, 23, quattro risposte): restano, con le icone in Home vicino alla ricerca; inventario comune; si manda merce con una **Richiesta «Trasferisci»** eseguita una volta sola da chi la accetta; **rete locale del negozio (modem, nodi in magazzino e negozio) come canale principale anche senza internet, internet quando c'è, con un interruttore**; prima le automazioni che inviano e ricevono merce, poi quelle condivise.

## Fette da eseguire

**Ordine confermato dall'utente il 23 mattina** («Sì, prima i difetti»): dopo C2 le correzioni dei difetti che rovinano dati (GAL, COD, ESE, VAL, IND), poi gli scaffali, poi il resto. Le fette di `map-2.md` (S1b, S2, S3, N1, N2, I1, L1, L2, I2, I3) restano con i loro ticket; qui sono rimesse in fila con le nuove.

| # | Fetta | Ticket | Cosa | Dipende da | Prova nuova |
| --- | --- | --- | --- | --- | --- |
| 1 | **C2** (fatta, 23/11) | 21, 28 | Tipo di pelle da Campi Personalizzati (`OptionsEditor` a id stabili); `linking.ts` con `initialRouteName` e scheda madre; indirizzi `settings/team`, `chat`, `settings/automation-builder` (P29, AU-V11); in più IND-P3 (`popTo` in `compat.ts`) | S1a | `c2-tipo-pelle.cjs`, `c2-indietro.cjs` + **tutta `prova/`** (`tutte.cjs`) |
| 2 | **GAL** (fatta, 23/11) | 27 | Galleria unica `PhotoGallery` (Scheda, visore, Aggiungi, Modifica): miniatura → foto, cestino sulla foto scelta con conferma (CSV-G1), miniature, frecce, puntini e ←/→ nella Scheda (CSV-G2), visore con frecce ed Esc e foto dei campi «immagini» (CSV-G3), «Metti come principale» e «‹ Sposta / Sposta ›» con `storageImagePaths` allineati (`utils/photos.ts`, CSV-G6); prezzo 0, note vuote, «Foto non disponibile» nella Scheda (CSV-I6-I8). Fuori: zoom, FOTO, trascinamento | C2 | `gal-galleria.cjs` (11) + **tutta `prova/`**; collaudo CF-C1 (parte GAL), CF-C3, CF-C4 (prezzo 0) |
| 3 | **COD** (fatta, 23/11) | 22, 29 | Lettore unico `utils/codes.ts` (`resolveCode`; `hooks/useCodeReader.ts`) per Scanner (fotocamera, a mano, immagine) e 5 automazioni (NG01, AU-V07, AU-V14: lo scaffale vale la sua posizione, P26), «Scrivi il codice» in `BarcodeScanner`, cestino rifiutato alla lettura; codici doppi (NG24: QR con uno stato suo; NG25: `codeCheck`, avviso sotto il campo) in Posizioni, Categorie, Scaffali; Modifica che non crea né riscrive link, **nemmeno con lo SKU cambiato** (NG02, NG27, vincolo 5); resti di S1a e C1 (Scanner a mano, `#666`). Fuori: ETI, GS1, ESE, N1/N2 | C2 | `cod-lettore.cjs` (11) + **tutta `prova/`**; collaudo CF-E1, CF-E2, CF-E3 (parte COD), CF-C4 (parte COD) |
| 4 | **ESE** (fatta, 23/11) | 29 | Esecuzione corretta (`utils/automationRun.ts`: `runStep` sulla copia più recente, `flowErrors`): prezzo con la virgola (AU-V01), note in fila (AU-V02), rifiuti detti senza contare l'azione e catena ferma (AU-V03), cestino anche alla scrittura e nel Tagging (AU-V04), posizione eliminata rifiutata e avviso in Posizioni (AU-V05), flusso controllato al salvataggio e «Usa l'ultima posizione» solo dopo «Scansiona Posizione» (P16, AU-V06), frecce e modifica dei passi (AU-V12), «Imposta Campo» in `customData` (P17), uso contato a dati caricati (AU-N13), passo sconosciuto senza cadute; Audit: intruso riletto (AU-V08), tutte le posizioni con la ricerca (AU-V09), posizione dall'Azione rapida anche nello Spostamento rapido (AU-N17). Fuori: FLU1, FLU2, CON, P23, AU-V10, S3 | COD | `ese-automazioni.cjs` (13) + **tutta `prova/`**; collaudo CF-F7, CF-E3 (parte ESE) |
| 5 | **VAL** (fatta, 23/11) | 23 | Valori dei campi (`utils/fieldValues.ts`): opzioni a id stabili con `OptionsEditor` a bozza, etichette di prima lette per abbinamento (id → etichetta di adesso → copia del prodotto), nessun prodotto riscritto (CAM-F1); numeri e valuta come numero, «12,50 €» nella Scheda (CAM-F2); contatore che salva il valore mostrato, il minimo in Aggiungi (CAM-F3); Modifica con gli obbligatori di Aggiungi e il contatore, campi non toccati invariati (CAM-F4, F5); scritture del registro dall'elenco più recente (CAM-F11); `FieldInput` unico per Aggiungi e Modifica; Tipi di pelle collegati con l'id (punto 7); «Imposta Campo» allineato. Fuori: CAM-F6…F10, `DynamicFieldRenderer` (EDC), MOD, EXP | C2 | `val-campi.cjs` (8) + **tutta `prova/`**; collaudo CF-C4 e CF-B3 (parti VAL) |
| 6 | **IND** (fatta, 23/11) | 28 | Resto del tasto Indietro (una sola barra delle schede, IND-5, già fatta in C2): X nello Scanner che torna da dove si era (IND-P4); Conta col tasto di sistema e del browser che torna di un passo e, dalla scelta della posizione con quantità scritte, chiede «Uscire dalla conta?» (IND-P5, `utils/countBack.ts`, indirizzo rimesso avanti sul web); «Prodotto non trovato» con «Torna all'inventario» in Scheda e Modifica (IND-P6, `ProductNotFound`); `headerBackTitle: 'Indietro'` (IND-P7); filtro di `auth/callback` (IND-P8, ticket 20); database della Chat solo alla prima card di prodotti (IND-P9). Fuori: icone (solo collaudo), tasto di sistema sulle finestre (CF-T1) | C2 | `ind-indietro.cjs` (10) + **tutta `prova/`**; collaudo CF-A2 (parte IND), CF-A3 |
| 7 | **S1b** | 13 | Giacenza sugli scaffali (`map-2.md`) | S1a | (dal ticket 13) |
| 8 | **S2** | 14 | Misure e tipo dello scaffale, altezza del prodotto, `fitsShelf`, riempimento a colori | S1b | `s2-capacita.cjs` |
| 9 | **S3** | 15 | Avviso dall'80% e **blocco** quando non entra, con la proposta, in tutti i punti di carico (elenco nel ticket 15); capienza delle posizioni in pezzi (AU-V13) | S2, COD | `s3-avvisi.cjs` |
| 10 | **FOTO** | 27 | Foto che restano: IndexedDB sul web (P20 = CSV-G4), copia fuori dalla cache su Android (CSV-G5) | GAL | `foto-restano.cjs` |
| 11 | **EDC** | 23 | Editor del campo in tre domande, valori pronti, aspetti nuovi, Sì/No, colori e icone, lettura in Scheda, card, ricerca; via `DynamicFieldRenderer` (CAM-F6-F10) | VAL | `edc-editor.cjs` |
| 12 | **MOD** | 24 | Scheda «Modulo» con bozza (P12 = CAM-L1, L2), migrazione senza sovrascrivere (CAM-L11), Posizione non nascondibile (CAM-L3), Modifica e Scheda che seguono il modulo (CAM-L4-L8, L12) | EDC | `mod-modulo.cjs` |
| 13 | **MCAT** | 25 | Moduli per categoria (`byCategory`), categoria in testa ad Aggiungi, Modelli di settore per categoria, un elenco solo, «Salva come modello» (CAM-L9, L10) | MOD | `mcat-moduli.cjs` |
| 14 | **EXP** | 26 | Export leggibile: colonna per campo, BOM, avviso foto, backup Drive allineato (CSV-E1-E5) | VAL | `exp-export.cjs` |
| 15 | **IMP** | 26 | Schermata d'import: separatore, abbinamento, anteprima, rifiutate col motivo, «+ Crea campo», link delle immagini (CSV-I1-I5, I9, I10) | EDC, EXP (MCAT se fatta) | `imp-import.cjs` |
| 16 | **ETI** | 22, 29 | Etichette locali e finestra «Codice ed etichetta» per prodotti, posizioni, categorie, scaffali; etichette in serie (AU-A8); P27, D16, D07, NG21-NG23, NG26, AU-V16 | COD | `eti-etichette.cjs` |
| 17 | **GS1** | 22 | Impostazioni «Codici ed etichette»: modo «codice» predefinito, link conforme solo da «Avanzate» (NG03-NG09) | ETI | `gs1-codici.cjs` |
| 18 | **N1** | 16, 18, 22 | NFC su richiesta (`map-2.md`) + schermata «Scanner e NFC» semplice (NG11-NG13, D19), tag col codice e UID in un tocco (NG14-NG18), «Non disponibile sul web» (NG19) | COD, ETI | sul telefono |
| 19 | **N2** | 17 | «Leggi più tag» (`map-2.md`) | N1 | sul telefono |
| 20 | **FLU1** | 29 | Ricevimento da fornitore, uscita a cliente, trasferimento con quantità (AU-A1-A3, AU-V10; resto di M10) | S3, ESE | `flu1-flussi.cjs` |
| 21 | **CON** | 29 | Conta col lettore, Audit salvato (P23), posizioni da verificare (AU-A5), scaffali in Conta e Audit | FLU1, S1b | `con-conte.cjs` |
| 22 | **FLU2** | 29 | Passi nuovi del costruttore: carico, scarico, trasferimento, chiedi conferma (AU-A4) | FLU1 | `flu2-passi.cjs` |
| 23 | **RIO** | 29 | Riordino sotto scorta (AU-A6) | FLU1 | `rio-riordino.cjs` |
| 24 | **RES** | 29 | Reso (AU-A7) | FLU1 | `res-reso.cjs` |
| 25 | **CHAT1** | 30 | Icone Team e Chat in Home; Chat e Team onesti (CT01, CT06, CT08, CT09, CT11, CT13, CT14, P28) | C2 | `chat1-chat-team.cjs` |
| 26 | **RIC1** | 30 | Richiesta «Trasferisci» dalla selezione e dalla Scheda, eseguita una volta sola (prima sullo stesso telefono) | CHAT1, FLU1 | `ric1-richieste.cjs` |
| 27 | **RIC2** | 30 | Automazioni che inviano e ricevono merce: «Invia a collega», «Ricevi» con il confronto | RIC1 | `ric2-automazioni.cjs` |
| 28 | **VOCI** | 29 | Voci «Prossimamente» (P30), secondo la risposta | – | da definire |
| 29 | **RETE1** | 30 | La rete del negozio si collega sul telefono (CT12), messaggi tra telefoni (CT02-CT04) | CHAT1 | due telefoni |
| 30-34 | I1, L1, L2, I2, I3 | 11, 12, 20 | Foto WebP, login, dati locali nell'account, link pubblici nel CSV, Drive (`map-2.md`) | come in `map-2.md` (I2 anche FOTO) | come in `map-2.md` |
| 35 | **RETE2** | 30, 10 | Un solo spazio di lavoro su rete locale e internet, con l'interruttore; `utils/merge.ts`, giacenze dagli eventi (CT18, CT19); identità dell'operatore (CT07) | RETE1, L1, L2 | `merge.test.ts` + due telefoni |
| 36 | **RIC3** | 30 | Automazioni condivise tra operatori | RETE2 | `ric3-condivise.cjs` |

Ogni fetta chiude come in `map-2.md`: `controllo.sh` verde, la sua prova, le regressioni del ticket, il foglio dei 5 stili, commit, `CRONOLOGIA.md`, push. Alla chiusura **aggiunge i suoi passi a `prova/collaudo.cjs`** (vedi `collaudo-finale.md`).

## Da confermare con l'utente (una domanda quando la fetta è la prossima)

- ~~Ordine delle fette~~: **confermato** il 23 («Sì, prima i difetti»).
- S2: barra appendiabiti in grucce (proposta) o in centimetri di barra.
- S3: niente blocco in Conta, Audit «Sposta qui» e import (la merce è già lì); posizioni con capienza con la stessa regola degli scaffali.
- EDC: icone e colori nella card dell'Inventario (1-2 campi) o solo nella Scheda.
- EXP: basta l'avviso «N foto non esportate» o serve un backup con le foto prima del cloud.
- IMP: SKU già presenti saltati o aggiornati; link delle immagini tenuti come link o scaricati; «crea campo» con andata e ritorno (come l'ha descritto l'utente) o in una finestra dentro l'import.
- ETI: stampante (A4 o etichettatrice) e misura delle etichette.
- GS1: codici EAN/GTIN ufficiali sì o no.
- N1, N2: proposte dei ticket 17 e 18 e le quattro decisioni di N0.
- FLU1: ordine delle automazioni nuove; quantità chiesta sempre o «tutto» proposto nel trasferimento (AU-V10).
- VOCI: P30.
- ~~CHAT: «lo stesso vale per le automazioni»~~: **risposto** il 23 («Tutte e due, prima la prima»), con internet (rete locale e interruttore) e merce (stessa merce).
- RETE1: se l'aggancio non regge su Android, come ripiegare (si chiede con l'esito della prova).
- Da `map-2.md`: L1 (accesso facoltativo, provider Google da accendere), L2 (dati locali al primo accesso), I3 (Drive).

## Not yet specified

- **Identità degli operatori senza login** (ticket 30, RETE2): chi ha fatto che cosa negli eventi e nei messaggi quando si lavora solo sulla rete locale; legame con i ruoli del cloud.
- **Rete del negozio con più modem o nodi** (magazzino e negozio): come si trovano i telefoni tra reti diverse e quale telefono fa da Host; dopo l'esito di RETE1.
- **Download delle immagini dai link del CSV** dentro l'app: dopo FOTO, se l'utente lo sceglie (fetta IMP, domanda 2).
- **Zoom nel visore delle foto** (doppio tocco, pizzico): secondo passo di GAL.
- **Passi condizionali** nelle automazioni (AU-A9): rifiuti detti e «Chiedi conferma» (FLU2) coprono i casi pratici; da riprendere se servono.
- Restano da `map-2.md` e `map.md`: lotti e scadenze, ordini e documenti di trasporto, valore di magazzino, sincronizzazione delle giacenze tra telefoni (ticket 10).

## Out of scope

- Resolver GS1 e App Links (NG10): QR e tag servono «solo all'app» (risposta dell'utente del 23).
- Da `map-2.md`: porting su Flutter; fatturazione, contabilità, IVA, pagamenti.

## Copertura: ogni richiesta ha ticket, fetta, prova e passo del collaudo

Le richieste sono quelle di [`richieste-utente-23-novembre.md`](richieste-utente-23-novembre.md) (numeri dei punti), più i resti della fase B e della mappa 2. I passi del collaudo (`CF-…`) sono in [`collaudo-finale.md`](collaudo-finale.md).

| Richiesta | Ticket | Fetta | Prova | Collaudo |
| --- | --- | --- | --- | --- |
| 1 · volume dello scaffale (larghezza, profondità, altezza) | 14 | S2 | `s2-capacita.cjs` | CF-D1 |
| 1 · carrello delle grucce | 14 | S2 | `s2-capacita.cjs` | CF-D5 |
| 1 · controllo del singolo prodotto (un lato troppo grande) | 14, 15 | S2, S3 | `s2-capacita.cjs`, `s3-avvisi.cjs` | CF-D3 |
| 1 · peso massimo configurabile | 14 | S2, S3 | `s2-capacita.cjs`, `s3-avvisi.cjs` | CF-D1, CF-D3 |
| 1 · configurare ogni scaffale e registrarlo con QR o NFC | 13, 22 | S1a (fatta), ETI, N1 | `s1-scaffali.cjs`, `eti-etichette.cjs` | CF-D1, CF-E2, CF-T3 |
| 1 · blocco al pieno con la proposta di un altro scaffale della categoria | 15 | S3 | `s3-avvisi.cjs` | CF-D3, CF-D4 |
| 1 · soglie e colori del riempimento | 15 | S2 | `s2-capacita.cjs` | CF-D2 |
| 2 · capire se NFC e GS1 funzionano | 22 | verifica fatta; COD, N1 | `cod-lettore.cjs` | CF-E1, CF-E3, CF-T2 |
| 2 · interfaccia GS1 semplice e moderna | 22 | GS1 | `gs1-codici.cjs` | CF-E5 |
| 2 · interfaccia Scanner & NFC semplice | 16, 22 | N1 | sul telefono (+ web: nessuna scelta NFC) | CF-E6, CF-T2 |
| 2 · tutte le funzioni necessarie (lettura, scrittura, etichette) | 22 | COD, ETI, N1, N2 | `cod-lettore.cjs`, `eti-etichette.cjs` | CF-E1-E4, CF-T2, CF-T4 |
| 3 · campo scritto al momento o con valori già pronti | 23 | EDC | `edc-editor.cjs` | CF-B3 |
| 3 · tenda, menu a scomparsa, campi scorrevoli, picker per le misure | 23 | EDC | `edc-editor.cjs` | CF-B3 |
| 3 · icone per la lettura veloce | 23 | EDC | `edc-editor.cjs` | CF-B3, CF-C1 |
| 3 · uno o più valori, colori | 23 | EDC | `edc-editor.cjs` | CF-B3 |
| 3 · capire come funzionano e migliorarli (CAM-F1-F11) | 23 | VAL, EDC | `val-campi.cjs`, `edc-editor.cjs` | CF-B3, CF-C4 |
| 4 · layout builder che non funziona bene (P12, CAM-L1-L12) | 24 | MOD | `mod-modulo.cjs` | CF-B4 |
| 5 · selettori = campi per categoria, preprogrammati | 25 | MCAT | `mcat-moduli.cjs` | CF-B2, CF-B4 |
| 6 · export con i link delle immagini | 26, 11 | EXP (avviso), I2 (link pubblici) | `exp-export.cjs` | CF-G1 |
| 6 · import con la corrispondenza delle colonne | 26 | IMP | `imp-import.cjs` | CF-G2 |
| 6 · «crea campo» dall'import e ritorno | 26 | IMP | `imp-import.cjs` | CF-G2 |
| 6 · link delle immagini all'import | 26 | IMP (link), FOTO (download, se scelto) | `imp-import.cjs` | CF-G2 |
| 6 · righe rifiutate con il motivo, anteprima | 26 | IMP | `imp-import.cjs` | CF-G2 |
| 7 · più immagini da scegliere e scorrere nella Scheda | 27 | GAL | `gal-galleria.cjs` | CF-C1, CF-C3 |
| 7 · foto che non si perdono (P20) | 27 | FOTO | `foto-restano.cjs` | CF-C2, CF-T5 |
| 8 · tasto Indietro sparito | 21, 28 | C2, IND | `c2-indietro.cjs`, `ind-indietro.cjs` | CF-A2, CF-T1 |
| 9 · automazioni che funzionano bene | 29 | ESE | `ese-automazioni.cjs` | CF-F7 |
| 9 · automazioni che mancano | 29 | FLU1, CON, FLU2, RIO, RES, ETI | `flu1-flussi.cjs` e seguenti | CF-F1-F6 |
| 9 · passi che mancano | 29 | ESE, FLU2 | `ese-automazioni.cjs`, `flu2-passi.cjs` | CF-F7, CF-F8 |
| 10 · icone sparite | 28 | nessuna (non riprodotta) | `d-icone.cjs` (verifica) | CF-A1, CF-T1 |
| 11 · Chat e Team in Home vicino alla ricerca | 30 | CHAT1 | `chat1-chat-team.cjs` | CF-H1 |
| 11 · inviare, ricevere, gestire prodotti tra operatori | 30 | RIC1 | `ric1-richieste.cjs` | CF-H2, CF-T6 |
| 11 · automazioni per mandare e ricevere merce, poi condivise | 30 | RIC2, RIC3 | `ric2-automazioni.cjs`, `ric3-condivise.cjs` | CF-H3, CF-T6 |
| 11 · rete locale col modem anche senza internet, internet quando c'è, interruttore | 30, 10 | RETE1, RETE2 | due telefoni, `merge.test.ts` | CF-T6 |
| C2 · «Tipo di pelle» solo nei campi | 21 | C2 | `c2-tipo-pelle.cjs` | CF-B5 |
| Fase B · D16 (PDF senza campi, codici esterni) | 22, 23 | ETI, EDC | `eti-etichette.cjs` | CF-E4, CF-T4 |
| Fase B · D19 (Scanner & NFC non letto) | 16, 22 | N1 | sul telefono | CF-E6 |
| Fase B · P12 (layout non salvato ma applicato) | 24 | MOD | `mod-modulo.cjs` | CF-B4 |
| Fase B · P16, P17 (esecuzione delle automazioni) | 29 | ESE | `ese-automazioni.cjs` | CF-F7 |
| Fase B · P20 (foto `blob:` sul web) | 27 | FOTO | `foto-restano.cjs` | CF-C2 |
| Fase B · P23 (esito dell'Audit) | 29 | CON | `con-conte.cjs` | CF-F4 |
| Fase B · P26 (fotocamera senza «scansionato») | 22, 29 | COD | `cod-lettore.cjs` + telefono | CF-E1, CF-T2 |
| Fase B · P27 (etichetta per i capi con link) | 22 | ETI | `eti-etichette.cjs` | CF-E4 |
| Fase B · P28 (Chat) | 30 | CHAT1 | `chat1-chat-team.cjs` | CF-H1 |
| Fase B · P29 (Team e Chat NotFound, Host da solo) | 21, 30 | C2, CHAT1 | `c2-indietro.cjs`, `chat1-chat-team.cjs` | CF-A2, CF-H1 |
| Fase B · P30 (voci «Prossimamente») | 29 | VOCI | da definire | CF-A3 |
| Fase B · messaggio di LokiJS | 28 | IND (facoltativo) | `controllo.sh` | CF-A3 |
| Mappa 2 · import delle foto dal CSV | 26, 27 | IMP, FOTO | `imp-import.cjs` | CF-G2 |
| Mappa 2 · passi NFC nel costruttore | 22, 29 | N1 (lettore nei passi «Scansiona») | sul telefono | CF-T2 |
| Mappa 2 · scaffali in Conta e Audit | 29 | CON | `con-conte.cjs` | CF-F4 |
| S1a · codici doppi tra posizioni e categorie, Scanner a mano solo prodotti, `#666` | 22 | COD | `cod-lettore.cjs` | CF-E2 |
| C1 · Modifica aggiunge un link GS1 | 22 | COD | `cod-lettore.cjs` | CF-C4 |
| C1 · card della Chat con `furType` grezzo | 30 | CHAT1 | `chat1-chat-team.cjs` | CF-H1 |
| C1 · `DynamicFieldRenderer` morto | 23 | EDC | `controllo.sh` | – |
| M10 · vendita rapida senza contatto | 29 | FLU1 | `flu1-flussi.cjs` | CF-F2 |
| M10 · contatti solo locali | 10, 20 | L2 | come in `map-2.md` | – |

**Già chiusi e riconfermati nelle verifiche del 23** (nessuna fetta): D03, D12, D13, D14, D15, D24, P01 (in parte: il resto è NG27 → COD), P02, P05, P06, P10, P11, P18, P22, P25. P08 è citato solo come esempio (posizione orfana, simile ad AU-V05 → ESE).

Controllo a macchina fatto il 23: ogni sigla dei cinque resoconti (NG, AU-V, AU-N, AU-A, CAM-F, CAM-L, CSV-E, CSV-I, CSV-G, P.., D..) compare in questa mappa o nei ticket; le `IND-…` sono tutte nel ticket 28. Le `CT01-CT19` sono nel ticket 30.
