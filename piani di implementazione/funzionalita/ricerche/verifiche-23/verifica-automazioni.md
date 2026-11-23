# Verifica delle automazioni — 23 novembre 2026

> **Nota dell'orchestratore 3 (23 novembre 2026, dopo le risposte dell'utente).**
> - **Superato**: dove qui si legge «avviso, mai blocco» per gli scaffali (§3), vale la risposta dell'utente del 23 (ticket 15): avviso dall'80% e **blocco** quando il prodotto non entra; la prova S3 si aspetta il blocco.
> - **Domanda 2 risolta in modo diverso dalla proposta**: Chat e Team restano e vanno resi utili, in Home vicino alla ricerca (ticket 30). Domande 1 (P30) e 3 (ordine) aperte.
> - Sigle nei ticket: V01-V16 → `AU-V…`, N13/N17 → `AU-N13`/`AU-N17`, A0-A9 → `AU-A…` (non sono i gruppi A1-A4 della prova del 22). A0 è la fetta COD.
> - Sigle con il prefisso dell'area nei ticket (regola in `../../map-3.md`, Notes). Numeri di riga a `4b94e4c`; i difetti si riproducono su `HEAD` prima di correggerli.

Area: automazioni (Centro Automazioni, costruttore, esecuzione, Scanner come porta d'ingresso, Chat). Sola verifica: nessun file toccato nel worktree, nessun comando git che cambia stato.

**Nota di fine verifica.** Durante il lavoro S1a è stata committata (`7bfcd72`, sopra `4b94e4c`) e la copia di lavoro è tornata pulita. Le prove sul web sono state fatte prima di quel commit, sulla copia di lavoro di S1a. Le righe citate restano quelle di `4b94e4c`. Le voci «da riconfermare dopo S1a» si possono ora riconfermare su `7bfcd72`.

**Base.** Codice letto a `4b94e4c` (branch `funzioni/magazzino`). L'app su `:8082` serve la copia di lavoro, che ha le modifiche non committate di S1a. Le schermate delle automazioni, il costruttore e `AutomationsContext` sono **identici** a `4b94e4c` (`git diff --stat` vuoto), quindi le prove su di loro valgono per il commit. Girano però sul `InventoryContext`/`inventoryOps` della copia di lavoro. Il diff letto aggiunge solo la regola dello scaffale (`shelfPatch` nel contesto, `noShelf` in `stockPatch`, `moveOf`, `withStartingStock`, `editableUpdates`) e tocca solo prodotti con `shelfId`: nessuno nel campionario, tranne lo scenario degli scaffali. Quindi non cambia gli altri esiti. Le prove passate da Scanner, Azione rapida o Impostazioni sono **«da riconfermare dopo S1a»**, perché quelle schermate le sta cambiando S1a.

**Che cosa cambia la copia di lavoro di S1a per quest'area** (non committato):
- lo Scanner riconosce il codice di uno scaffale, ma **solo dalla fotocamera**, non con l'inserimento a mano (`ScannerScreen.tsx`, diff);
- l'Azione rapida ha una schermata «Scaffale», con l'elenco dei pezzi unici che ci stanno;
- ogni spostamento, vendita o movimento toglie `shelfId` (`noShelf`), quindi anche quelli fatti dalle automazioni.

Le schermate delle automazioni non sanno nulla degli scaffali (V14).

**Etichette.** «provato sul web»: lo stato salvato (localStorage) cambia come scritto. «(sim.)»: lettura simulata, cioè si chiama il gestore del lettore come farebbe la fotocamera (`a3-util.cjs › scan`). «letto nel codice», «dedotto», «non provato, serve il telefono».

**Prove lanciate** (una alla volta, browser pulito, campionario di `seed.json`). Script e registri sono in `script/automazioni/` (`*.log`), una cartella temporanea:
- Rilanciati senza modifiche: `a3-builder`, `a3-audit`, `a3-batchmove`, `a3-quicktag`, `a3-scansell`, `a3-scanner`, `a3-cestino`, `a3-chat`, `m07-conta`, `m09-azione` (33 scenari, nessun errore di script, nessun errore di console nuovo; solo il noto «GO_BACK» di `a3-azione-vendi`).
- Nuovi: `v-automazioni.cjs` (12 scenari) e `v-scaffali.cjs` (1 scenario). Gli esiti sono copiati in fondo (appendice), perché la cartella temporanea può sparire.

## In breve

- Le cinque automazioni pronte e i sei passi del costruttore funzionano nel caso semplice. Sono però fatti per i **pezzi unici**: nessun passo chiede la quantità, il fornitore o il cliente, la causale, lo scaffale o una conferma.
- **Difetti nuovi che rovinano dati, tutti nell'esecuzione delle automazioni personali:**
  - il prezzo si legge con `parseFloat`: «1300,50» diventa 1300 e «5.900» diventa 5,9 (V01);
  - due passi di fila che scrivono nelle note si cancellano a vicenda (V02);
  - «Sposta in» manda il prodotto in una posizione che non esiste più (V05);
  - si scrivono tag su prodotti nel cestino (V04).
- **Difetti nuovi di comportamento:**
  - l'esecuzione dice «fatto» anche quando l'operazione è stata rifiutata (V03, V06);
  - il link GS1, cioè il QR della Scheda e il contenuto del tag NFC, non è riconosciuto da nessun lettore (V07). Questo va risolto prima di N1;
  - un intruso dell'Audit, letto una seconda volta, diventa «trovato» (V08);
  - l'Audit mostra solo 6 posizioni (V09).
- Difetti aperti: **P22 chiuso**. Restano **P16, P17, P23, P26, P28 e P30**.
- Mancano le automazioni d'ingresso e d'uscita di un magazzino: ricevimento da fornitore, uscita a cliente con quantità, trasferimento con quantità, conta col lettore, riordino, reso, etichette in serie (punto 2).
- S3 e N1 hanno un punto d'aggancio quasi unico:
  - `components/BarcodeScanner.tsx`, che serve 5 automazioni su 6, più `ScannerScreen`;
  - una sola funzione che riconosce i codici, oggi copiata in 7 modi diversi (punto 3).

---

## 0. Difetti aperti, riconfermati uno per uno

| N | Stato | Prova | Causa nel codice (`4b94e4c`) |
| --- | --- | --- | --- |
| P16 | **ancora presente** | provato sul web: `a3-runner-senza-lettura` mostra «Sposta in: Vetrina · Step 1 di 1» e nessun pulsante | I pulsanti ci sono solo per i passi di lettura (`CustomRunnerScreen.tsx:373`). `executeAutoStep` (`:69-147`) non è chiamato da nessuno. Il costruttore salva il flusso senza controllarlo (`AutomationBuilderScreen.tsx:148-161`) |
| P17 | **ancora presente** | provato sul web (sim.): `a3-runner-campo-vendi`. Note «[Stato=Controllato]», `customData` vuoto | `CustomRunnerScreen.tsx:241-250` (e il codice morto `:108-125`) scrive «[campo=valore]» in `technicalNotes`. Il costruttore chiede il nome del campo a testo libero (`AutomationBuilderScreen.tsx:333-351`) e non lo collega ai campi personalizzati |
| P22 | **chiuso** | provato sul web (sim.): `a3-audit-intruso-sposta`. Tutti gli attesi trovati più un intruso danno 100% | `AuditScreen.tsx:52-54` divide per i soli attesi. Resta però un'altra strada per una percentuale sbagliata: V08 |
| P23 | **ancora presente** | provato sul web (sim.): `a3-audit-intruso-aggiungi`. Uscendo e rientrando si torna a «Inizia Inventario», nessun evento, nessuna chiave salvata | Lo stato vive solo nella schermata (`AuditScreen.tsx:39-42`). Letto nel codice: i capi trovati non aggiornano nemmeno `lastScannedAt` (l'Audit non chiama `scanProduct`), quindi un capo appena controllato resta «dormiente» |
| P26 | **ancora presente** | provato sul web (sim.): `a3-scanner-lettura`, nessun evento dopo la lettura. Con l'inserimento a mano c'è l'evento `scanned` (`a3-scanner-manuale-sposta`). Da riconfermare dopo S1a | `ScannerScreen.tsx:38-73`: il ramo della fotocamera apre l'Azione rapida senza `scanProduct`. Quello manuale la chiama (`:154`). La fotocamera vera non è provata: serve il telefono |
| P28 | **ancora presente**, con una parte migliorata | provato sul web: `a3-chat` | Vedi la riga sotto la tabella |
| P30 | **ancora presente** | provato sul web: `v-p30`. Due finestre «Prossimamente» e la pagina «Questa funzionalità verrà completata nella prossima versione.» Da riconfermare dopo S1a (SettingsScreen) | Vedi la riga sotto la tabella |

**P28, Chat: i quattro difetti riconfermati.**
- (a) Ogni messaggio compare due volte («copieMessaggio» 2). Causa: l'eco `notifyLocalChat` (`ChatScreen.tsx:81`, `:103`) torna al proprio ascoltatore (`:54-64`).
- (b) «Approva» sposta sempre in `vetrina` (`ChatScreen.tsx:120`).
- (c) «Vendi» vende al primo tocco, senza conferma e senza prezzo: l'evento `sold` ha i dettagli vuoti (`HydratedProductCard.tsx:214-218`).
- (d) Lo storico ha la chiave `chat_messages`, senza lo spazio di lavoro (`ChatScreen.tsx:47`, `:70`).
- Migliorato: niente più evento «vetrina → vetrina», perché `moveOf` ora rifiuta la stessa posizione (`inventoryOps.ts:27`).
- Nuovo (V15): il messaggio dice «applicata su 3/3 articoli» anche se uno è stato rifiutato. Nella prova gli eventi sono 2, perché VIS-0142 era già in vetrina. Il valore di ritorno di `moveProduct` è ignorato (`ChatScreen.tsx:116-123`).

**P30, le tre voci «Prossimamente».**
- `SettingsScreen.tsx:475-491`: «Alert Prodotti Dormienti» apre «Configurazione alert manutenzione…», un titolo diverso dalla voce (`:477`).
- `:493-509`: «Suggerimenti AI».
- `:454-470` e `ShareScreen.tsx:40`: Condivisione.
- L'avviso «dormiente» intanto funziona con soglia fissa a 180 giorni (`services/mockData.ts:451-457`).
- Il «suggerimento promozione» guarda solo la posizione `magazzino`, scritta nel codice (`mockData.ts:461`): una regola da pellicce.

Chiusi e notati di passaggio, fuori dalla lista:
- P25: la Vendita flash senza prezzo mostra «1.900 €».
- P05 e P06 (in `esito-a3` erano N1 e N2): rivendita e vendita dal cestino rifiutate.
- D14: «Vedi prodotti» della categoria ora filtra (`a3-azione-cartella-D14`: 3 SKU, `?library=pellicce`). Da riconfermare dopo S1a.

Ancora presenti:
- N13: l'esecuzione aperta dall'indirizzo non conta l'uso (`usageAppenaAperto` 0). Causa: `CustomRunnerScreen.tsx:57-59` gira prima che le automazioni siano caricate.
- N17: dall'Azione rapida di una posizione, Audit e Spostamento rapido chiedono di nuovo la posizione (`a3-azione-posizione`; `ScannerActionScreen.tsx:119`, `:130`). Da riconfermare dopo S1a.

---

## 1. Automazioni pronte e passi del costruttore

### 1.1 Stato attuale

Il Centro Automazioni (`AutomationsScreen.tsx:15-56`) ha due parti:
- **Template predefiniti**: Spostamento Rapido, Vendita Flash, Audit Posizione, Conta Magazzino, Tagging di Massa;
- **Le mie automazioni**: create con il costruttore, salvate in `@furinventory_custom_automations:{org}` (`AutomationsContext.tsx:77`). Ognuna ha un QR `AUTO:<id>` che lo Scanner riconosce.

| Automazione | Che cosa fa | Che cosa scrive (dati, Cronologia) | Sul web |
| --- | --- | --- | --- |
| Spostamento Rapido (`BatchMoveScreen`) | Si sceglie la destinazione: chip o lettura di codice, id o etichetta. Poi si leggono i prodotti in fila. Leggendo una posizione chiede se cambiare destinazione. Se la destinazione è piena, propone quella che segue nell'elenco | Pezzo unico: `location`, `updatedAt`, `lastScannedAt` ed evento `moved` {from, to}. Articolo a quantità: trasferimento di **tutta** la giacenza della posizione principale ed evento `stock` (`inventoryOps.ts:35-39`) | provato (sim.): `a3-batch-*` 3/3 e `m03` |
| Vendita Flash (`ScanSellScreen`) | Lettura, poi finestra col prezzo proposto dal listino, poi conferma. Rifiuta i capi venduti, nel cestino o esauriti (`:52-63`) | Pezzo unico: `status: sold`, `soldAt`, `sellPrice` (se è scritto un prezzo) ed evento `sold` {finalPrice}. Articolo a quantità: scarico di **1** con causale vendita e prezzo per unità. **Nessun cliente** | provato (sim.): `a3-vendita-flash*`, `a3-cestino-vendita-flash` |
| Audit Posizione (`AuditScreen`) | Scelta della posizione (solo 6 chip, V09). Attesi = ciò che ha giacenza lì (`qtyAt > 0`). La lettura marca «trovato». Un prodotto di un'altra posizione è un intruso: «Aggiungi all'Audit» oppure «Sposta qui» | Solo con «Sposta qui»: evento `moved` (D15 chiuso). Niente altro (P23) | provato (sim.): `a3-audit-*` 2/2 |
| Conta Magazzino (`CountScreen`) | Posizione, quantità scritte a mano per ogni articolo a quantità, riepilogo, conferma. I pezzi unici sono rimandati all'Audit | Una rettifica `stock` con causale «conta» per ogni differenza, tutte nello stesso istante (`countStock`). Se tutto è uguale: **nessuna traccia** che la conta sia avvenuta (`m07-tutto-uguale`: 0 eventi) | provato: `m07-conta` 4/4 |
| Tagging di Massa (`QuickTagScreen`) | Si sceglie un tag comune o personale, poi si leggono i prodotti. Niente doppioni | Aggiunge «[tag]» in `technicalNotes`. L'evento `modified` dice solo «Note aggiornate», senza il tag | provato (sim.): `a3-tag-*` 2/2 |
| Costruttore (`AutomationBuilderScreen`) | Nome, descrizione, icona, colore e passi. Si aggiunge in fondo, si elimina, si salva | Elenco delle automazioni (vedi sopra) | provato: `a3-builder-crea-esegui`, `a3-builder-modifica-elimina` |
| Scheda dell'automazione (`AutomationFlowScreen`) | Mappa dei passi, QR `AUTO:`, Condividi (testo), Modifica, Elimina, Avvia | Elimina o aggiorna l'elenco | provato. Condividi non provato (condivisione del sistema) |
| Esecuzione (`CustomRunnerScreen`) | Esegue i passi. Dopo una lettura esegue da sé i passi d'azione fino alla lettura successiva (`:205-265`). A fine flusso torna all'ultimo «Scansiona prodotto» (`:269-277`) | Vedi i passi | provato (sim.): `a3-runner-*` e `v-runner-*` |
| Ingresso: Scanner, poi Azione rapida | Codice → prodotto, posizione, categoria, scaffale (S1a, solo dalla fotocamera) o `AUTO:`. Azione rapida su un prodotto: Spostato, Venduto, Carico, Scarico, Dettagli | `moved`, `sold`, `stock`. `scanned` solo col codice scritto a mano (P26) | provato: `a3-scanner`, `m09-azione`. Da riconfermare dopo S1a |

**Passi del costruttore** (`AutomationsContext.tsx:8-14`, `AutomationBuilderScreen.tsx:30-37`):

| Passo | Configurazione | Che cosa fa nell'esecuzione | Esito sul web |
| --- | --- | --- | --- |
| Scansiona Prodotto | nessuna | Cerca per id o SKU **esatto**, senza distinguere il cestino (`CustomRunnerScreen.tsx:162-163`). Poi esegue i passi seguenti | funziona. Non riconosce il link GS1 né lo SKU in minuscolo (V07) |
| Scansiona Posizione | nessuna | Cerca per `barcode` o id (`:183`), non per etichetta né scaffale | funziona. Lo scaffale non è riconosciuto (V14) |
| Sposta Prodotto | «Usa l'ultima posizione scansionata» (scelta già spuntata, `:78`, `:101`) oppure una posizione fissa | `moveProduct` (`:227`). Il valore di ritorno è ignorato | funziona con la posizione fissa e con quella letta. Difetti V03, V05, V06, V10 |
| Segna Venduto | «Chiedi conferma prezzo» sì o no | `sellProduct` (`:260`, `:283`). Il prezzo si legge con `parseFloat` (`:282`) | funziona. Difetti V01, V03 |
| Aggiungi Tag | testo | «[tag]» nelle note (`:231-240`) | funziona da solo. V02 se ce n'è un altro dopo; V04 |
| Imposta Campo | nome e valore a testo libero | «[nome=valore]» nelle note (`:241-250`) | P17, V02 |

### 1.2 Difetti nuovi, con i passi per riprodurli

Numerazione `V` = verifica automazioni.

| N | Dove | Che cosa | Passi | Causa | Gravità |
| --- | --- | --- | --- | --- | --- |
| V01 | Esecuzione, «Vendi (con conferma prezzo)» | Prezzo letto con `parseFloat`: «1300,50» → **1300**, «5.900» → **5,9** (anche nell'evento `sold`) | Automazione [Scansiona Prodotto, Vendi con conferma]. Leggi AST-0033 e scrivi «1300,50». Leggi LIN-0021 e scrivi «5.900». Guarda `sellPrice`. **provato sul web (sim.)** `v-runner-prezzo` | `CustomRunnerScreen.tsx:282`. Vendita flash e Azione rapida usano `parseNumber` (C01). Campo con `keyboardType="numeric"` e segnaposto «0.00» (`:435-438`) | dati |
| V02 | Esecuzione, passi di nota in fila | Tag, Tag, Imposta campo: resta solo «[Stato=OK]», con 3 eventi «Note aggiornate» e «3 azioni completate» | Automazione [Scansiona, Tag «Controllato», Tag «Da Pulire», Imposta Stato=OK]. Leggi LIN-0021. **provato sul web (sim.)** `v-runner-note-in-fila` | `advanceToNextScanStep` legge `products` dalla chiusura presa alla lettura (`:232`, `:242`). Ogni passo riparte dalle note vecchie e `updateProduct` scrive tutto il campo (`InventoryContext.tsx:465`) | dati |
| V03 | Esecuzione, rifiuti | Vendita di un capo già venduto: la finestra del prezzo si apre, «1 azione completata», nessun evento. «Sposta» di un capo nel cestino conta l'azione anche se è rifiutato | Automazione [Scansiona, Vendi con conferma]. Leggi VOL-0087 (venduto). **provato sul web (sim.)** il contatore che cresce: `v-runner-gia-venduto`, `v-cestino-tag` (azioni completate: 2, posizione invariata). Il messaggio «💰 Venduto! …» dopo il rifiuto è **letto nel codice** (`:285`): nella prova era già sparito | Il ritorno di `moveProduct`/`sellProduct` è ignorato (`:84`, `:140`, `:227`, `:260`, `:283`). Le altre schermate lo usano con `refusalText` | comportamento |
| V04 | Esecuzione e Tagging di Massa | Scrivono note su un prodotto **nel cestino** | VIS-0098 nel cestino. L'esecuzione con un tag scrive «[Controllato]». Tagging «Da Pulire» scrive «[Da Pulire]». **provato sul web (sim.)** `v-cestino-tag` | Nessun controllo di `deletedAt`: `CustomRunnerScreen.tsx:162`, `QuickTagScreen.tsx:59-62`. Nemmeno `updateProduct` rifiuta (`InventoryContext.tsx:444-476`) | dati (lieve) |
| V05 | Esecuzione, «Sposta in: X» | Se X non esiste più, il prodotto finisce su un id orfano, come P08 | Automazione con passo verso `deposito_eliminato`. Leggi PUZ-0012: `location` diventa `deposito_eliminato`, evento `moved`. **provato sul web (sim.)** `v-runner-posizione-sparita` (posizione eliminata simulata nel dato salvato) | Il passo tiene l'id (`AutomationBuilderScreen.tsx:125`). Eliminare una posizione non guarda le automazioni (letto nel codice, `LocationsContext`). `canMove` non controlla che la posizione esista (`productRules.ts:30`) | dati |
| V06 | Esecuzione, «Sposta» con la scelta predefinita | Senza un «Scansiona Posizione» prima, non sposta nulla e dice «Fatto! Scansiona il prossimo» | Costruttore: Scansiona Prodotto, poi Sposta Prodotto lasciando la spunta. Leggi PUZ-0012: resta in `stand_c`, 0 azioni. **provato sul web (sim.)** `v-runner-sposta-senza-posizione` | `:224-229` salta in silenzio. `:274` dice sempre «Fatto!». Il costruttore spunta di suo «Usa l'ultima posizione scansionata» (`:78`, `:101`) | comportamento |
| V07 | Tutti i lettori | Il **link GS1** (il QR della Scheda `DetailScreen.tsx:1233-1234`, e ciò che la Scheda scrive nel tag NFC `:794`) non è riconosciuto da nessuno. Lo SKU in minuscolo non è riconosciuto nelle automazioni. Lo Scanner a mano trova solo prodotti: «stand_a» e «AUTO:…» danno «Prodotto Non Trovato» | Con VIS-0142 (link `https://syncroflow.app/id/01/VIS-0142/21/000142`): Esecuzione «Non trovato», Scanner (sim.) «Codice Non Riconosciuto», Scanner a mano «Prodotto Non Trovato». **provato sul web** `v-codici`; per lo Scanner da riconfermare dopo S1a | Sette ricerche diverse, tutte su id e SKU esatti: `CustomRunnerScreen.tsx:162-163`, `AuditScreen.tsx:110-120` e `:139`, `BatchMoveScreen.tsx:138-141`, `QuickTagScreen.tsx:59-62`, `ScanSellScreen.tsx:45-48`, `ScannerScreen.tsx:48`. `getProductBySku` distingue maiuscole e minuscole (`InventoryContext.tsx:580-582`). Lo Scanner a mano usa `toLowerCase` ma solo sui prodotti (`ScannerScreen.tsx:141-143`) | comportamento. **Blocca N1**: un tag NFC di prodotto non verrebbe riconosciuto |
| V08 | Audit | Un intruso tenuto con «Aggiungi all'Audit» e poi riletto diventa «trovato»: Trovati 1, Mancanti 1, Intrusi 0, **50%** | Audit Stand B. Leggi PUZ-0012, scegli 1 (Aggiungi), rileggi PUZ-0012. **provato sul web (sim.)** `v-audit-intruso-riletto` | `AuditScreen.tsx:108-131`: la ricerca trova anche gli intrusi in `auditItems` e li segna `found`, perché solo `found` è già escluso | comportamento |
| V09 | Audit | Si scelgono solo le prime 6 posizioni. Le altre si raggiungono solo leggendo il loro codice, quindi sul web sono irraggiungibili | Con 8 posizioni: Deposito e Ricevimento non compaiono nell'Audit, ma compaiono in Spostamento rapido e Conta. **provato sul web** `v-audit-otto-posizioni` | `locations.slice(0, 6)` (`AuditScreen.tsx:251`), sotto il titolo «Posizioni recenti» che non sono «recenti» | comportamento |
| V10 | Esecuzione, Spostamento rapido, Audit «Sposta qui» | Un articolo a quantità sposta **tutta** la giacenza della posizione principale, senza chiedere quantità né partenza. Nella prova: VIS-0098 con magazzino 5 e stand_a 2. Vendi (scarico 1 a 3800) poi Sposta in Vetrina dà vetrina 4 e stand_a 2. La posizione principale diventa vetrina | **provato sul web (sim.)** `v-runner-quantita`. Spostamento rapido già in `m03` | `moveOf`, `inventoryOps.ts:35-39`, scelta di M03 | da decidere: non è un errore di codice, ma è sbagliato per un magazzino (vedi punto 2, A3) |
| V11 | Costruttore | Aperto dall'indirizzo o ricaricando la pagina mentre lo si usa: «Page Not Found». Si perde il lavoro | `/settings/automation-builder`. **provato sul web** `v-builder-indirizzo` | Manca in `linking.ts` (lo conosce solo `compat.ts:45`) | comportamento (web) |
| V12 | Costruttore | I passi non si riordinano e non si modificano: si elimina e si rifà. Il passo nuovo va sempre in fondo | letto nel codice: `AutomationBuilderScreen.tsx:81-106` (solo in coda), `:143-145` (solo elimina). La vecchia documentazione (`docs/audit/AUTOMAZIONI.md` §3) prometteva il riordino | comportamento |
| V13 | Spostamento rapido | La capienza si controlla solo alla scelta della destinazione e conta i **prodotti**, non i pezzi: un articolo da 50 pz vale 1. Dopo «Usa comunque» non avvisa più | letto nel codice: `BatchMoveScreen.tsx:67-97` (conteggio `:70`). `handleProductScan` (`:107-175`) non controlla | comportamento (base per S3) |
| V14 | Esecuzione, Spostamento rapido | Il codice di uno **scaffale** non è riconosciuto: «Posizione non trovata» in «Scansiona Posizione», «Prodotto non trovato: SCAF-MAG-A1» nello Spostamento rapido. Un prodotto spostato perde lo scaffale, come vuole S1a | **provato sul web (sim.), copia di lavoro S1a** `v-scaffale-nelle-automazioni` | Le automazioni non usano `shelfByCode`. Solo lo Scanner, dalla fotocamera, lo usa nella copia di lavoro | mancanza (S3) |
| V15 | Chat | «Approva» dice 3/3 anche con un rifiuto | vedi P28 | `ChatScreen.tsx:116-123` | comportamento |
| V16 | Etichetta (Scheda) | Il QR dell'etichetta si disegna con uno script da CDN (`cdn.rawgit.com…`, oggi 301 verso jsdelivr). Senza internet l'etichetta esce probabilmente senza QR | dedotto da `DetailScreen.tsx:278`. Il codice a barre usa `jsdelivr` (`:332`), il PDF usa `api.qrserver.com` e `barcodeapi.org` (`:734`, `:739`). **non provato, serve il telefono**: stampa l'etichetta in modalità aereo | comportamento (conta per le etichette in serie) |

Letti nel codice, da tenere presenti:
- `executeAutoStep` (`CustomRunnerScreen.tsx:69-147`) è un doppione morto della logica di `:222-263`.
- Un tipo di passo sconosciuto (automazione salvata da una versione più nuova) farebbe cadere l'esecuzione su `meta!.color` (`:316`, `:365`): dedotto.
- La mesh sincronizza la tabella WatermelonDB `automations` (`src/services/meshServer.ts:346`), ma il costruttore salva solo in AsyncStorage: le automazioni non passano tra telefoni (dedotto).
- Nessuna automazione ha un inserimento del codice a mano, che c'è solo nello Scanner: con un'etichetta rovinata, una fotocamera negata o un lettore a pistola che scrive come una tastiera non si può andare avanti (letto nel codice, `BarcodeScanner.tsx:10-14`).

### 1.3 Che cosa manca nelle automazioni esistenti

- **Spostamento rapido**:
  - quantità e posizione di partenza per gli articoli a quantità (V10);
  - scaffale come destinazione (V14);
  - controllo della capienza a ogni articolo (V13; il ticket 15 chiede «si aggiorna a ogni articolo»);
  - riepilogo di fine sessione.
- **Vendita flash**: cliente facoltativo (resto di M10 in `PASSAGGIO.md` punto 1), quantità per gli articoli a quantità (oggi 1 per lettura).
- **Audit**:
  - esito salvato (P23);
  - `lastScannedAt` dei trovati;
  - tutte le posizioni (V09);
  - posizione già scelta quando arriva dall'Azione rapida (N17);
  - scaffali («Not yet specified» in `map-2.md`).
- **Conta**: lettore (oggi solo numeri scritti a mano), traccia della conta anche senza differenze, conta salvata se si esce a metà (da provare: tasto Indietro su Android, M07).
- **Tagging**: niente di grave. Il tag è testo nelle note e non un campo: va bene finché nessuno deve filtrare per tag.
- **Costruttore ed esecuzione**:
  - controllo del flusso al salvataggio (P16, V06);
  - riordino e modifica dei passi (V12);
  - campo personalizzato vero (P17);
  - indirizzo in `linking.ts` (V11);
  - rifiuti detti (V03);
  - inserimento a mano del codice.

### 1.4 Proposta semplice, con i file e i rischi

Una fetta di correzioni, «AU1 — esecuzione corretta», prima di aggiungere automazioni nuove. Tutto in `utils/` con i test, le schermate solo per chiamare.

1. **Esecuzione** (`src/screens/automations/CustomRunnerScreen.tsx`):
   - prezzo con `parseSalePrice` (`utils/stock.ts:151`) o `parseNumber`, come Vendita flash (V01);
   - un solo esecutore puro `runStep(product, step, ctx)` in `utils/automationRun.ts`, che restituisce `{ ok, patch | refusal }`;
   - le note lette ogni volta dal prodotto più recente (`productsRef`, tramite una funzione del contesto `appendNote(id, testo)` che rilegge la copia) (V02);
   - il ritorno di `moveProduct`/`sellProduct` usato: il contatore cresce solo con `ok`, altrimenti `refusalText` (V03);
   - si eliminano il doppione `executeAutoStep` e l'aggiornamento d'uso fatto prima del caricamento (N13: `recordUsage` dopo che l'automazione è trovata).
2. **Cestino**: la lettura nelle automazioni rifiuta i prodotti con `deletedAt` (V04). Lo fa già la funzione unica dei codici del punto 3.
3. **Posizione sparita** (V05):
   - l'esecuzione rifiuta un passo verso una posizione che non c'è («La posizione di questo passo non esiste più: modifica l'automazione»);
   - eliminando una posizione si avvisa se un'automazione la usa (`LocationsScreen`, toccata da S1a: da riconfermare dopo S1a).
4. **Costruttore** (`src/screens/settings/AutomationBuilderScreen.tsx`):
   - controllo `flowErrors(steps)` in `utils/automationRun.ts` al salvataggio: il primo passo è una lettura; «Sposta nella posizione letta» vuole un «Scansiona Posizione» prima; i passi d'azione vogliono un prodotto letto prima. Chiude P16 e V06 alla fonte;
   - la spunta «Usa l'ultima posizione» parte spenta se nel flusso non c'è una lettura di posizione;
   - frecce su e giù sui passi, tocco per modificare la configurazione (V12);
   - «Imposta Campo» con la scelta tra i campi personalizzati, scritto in `customData` come fa Modifica (P17);
   - indirizzo `settings/automation-builder` in `src/navigation/linking.ts` (toccato da S1a) (V11);
   - per le automazioni già salvate e non valide, l'esecuzione mostra «Questa automazione non inizia con una lettura» e il pulsante «Modifica», invece di bloccarsi.
5. **Audit** (`AuditScreen.tsx`):
   - una lettura di un intruso già in elenco dice «già segnato come intruso» (V08);
   - tutte le posizioni, con la ricerca se sono tante (V09);
   - parametro `locationId` dall'Azione rapida (N17).
   - P23 è nel punto 2 (A5).
6. **Inserimento a mano** in `components/BarcodeScanner.tsx`: un campo «Scrivi il codice» che chiama lo stesso `onScan`. Vale per 5 automazioni in un colpo e rende inutile la lettura simulata nelle prove.

Rischi per i dati:
- (1) cambia solo il modo di scrivere le note, non il formato;
- (4) il formato salvato delle automazioni resta uguale; «Imposta Campo» in `customData` vuole il campo con `fieldSnapshot`, come Aggiungi e Modifica: le vecchie automazioni con un nome a testo libero vanno ricollegate al campo con lo stesso nome, o rifiutate con un messaggio;
- nessuna riscrittura dei prodotti esistenti.

### 1.5 Come si proverebbe

- **Prova nuova `prova/au1-esecuzione.cjs`.** Gli scenari di `v-automazioni.cjs` diventano verdi al contrario:
  - «1300,50» → 1300,5 e «5.900» → 5900;
  - tre note restano tutte;
  - capo venduto → messaggio di rifiuto e contatore fermo;
  - cestino → rifiuto e nessuna nota;
  - posizione sparita → rifiuto e posizione invariata;
  - flusso senza lettura di posizione → il costruttore non salva;
  - P16: un flusso che non inizia con una lettura non si salva, e uno vecchio mostra «Modifica»;
  - P17: `customData` col campo giusto;
  - V08: l'intruso riletto resta intruso;
  - V09: 8 posizioni tutte sceglibili;
  - V11: il costruttore si apre dall'indirizzo;
  - inserimento a mano in un'automazione.
- **Regressioni**: `a3-builder`, `a3-audit`, `a3-batchmove`, `a3-quicktag`, `a3-scansell`, `a3-cestino`, `m03-giacenza`, `m07-conta`, `c01-numeri`. Test jest per `utils/automationRun.ts` (`runStep`, `flowErrors`).
- **Telefono**: una lettura con la fotocamera in ogni automazione; tastiera del prezzo con la virgola su Android; Indietro del telefono durante l'esecuzione e durante l'Audit.

---

## 2. Automazioni e passi che mancano per un magazzino di qualsiasi prodotto

### 2.1 Stato attuale

L'app ha già:
- giacenze per posizione e movimenti con causale (`movementOf`/`moveStock`);
- conta (`countOf`/`countStock`);
- fornitori e clienti (`contactsForMovement`, `contactEvents`);
- scorta minima (`isLowStock`, avviso `low_stock`);
- carico e scarico dall'Azione rapida, **uno per volta** (M09).

Il vocabolario delle automazioni, sei passi più cinque schermate, sa però solo spostare, vendere e annotare un pezzo unico. Fatti controllati prima di proporre:
- Nessuna strada riporta un **pezzo unico venduto** a disponibile:
  - `saleOf` va in un verso solo (`inventoryOps.ts:51-72`) e `canMoveStock` vuole `available` (`productRules.ts:12`);
  - Modifica non tocca `status` (cercato in `EditScreen.tsx`), e l'import CSV lo scrive solo nei prodotti **nuovi** che crea (`productCsv.ts:169-188`, `SettingsScreen.tsx:186` chiama `addProduct`);
  - la vendita sovrascrive `sellPrice` col prezzo finale (`inventoryOps.ts:60`), quindi un reso perderebbe il listino.
- Un prodotto non ha un fornitore suo: il fornitore sta solo negli eventi di carico, e `contactEvents` legge solo gli eventi `stock` (`utils/contacts.ts:121-122`). Una vendita di un pezzo unico con cliente non comparirebbe nella scheda del contatto.
- L'etichetta stampabile è una per prodotto, dalla Scheda. Ha il QR dello SKU, che non si raggiunge per i capi col link GS1 (P27), e dipende da un CDN (V16).
- `nfcService.readTag()` esiste e nessuno la chiama (`utils/nfcService.ts:97-128`). `scanMode` non è letto (D19).

### 2.2 Difetti

Quelli del punto 1 (V01-V16). Qui conta soprattutto V10: lo Spostamento rapido sposta tutta la giacenza.

### 2.3 e 2.4 Che cosa manca e proposta

«Il modo più giusto e corretto e semplificato»: ogni automazione nuova è una schermata come Vendita flash, cioè lettura in fila più una finestra che riusa `MovementSheet`. Non serve un motore nuovo.

| Id | Automazione o passo | Priorità | Perché | Riusa | File da toccare | Rischi per i dati |
| --- | --- | --- | --- | --- | --- | --- |
| A0 | **Lettura unica dei codici** e inserimento a mano | alta | Senza di essa N1 non riconosce i tag (V07) e S3 non riconosce gli scaffali (V14). Oggi ci sono 7 ricerche diverse | `getProductBySku`, `parseGS1DigitalLink` (`utils/gs1.ts:49`), `shelfByCode` (S1a), `Location.barcode`, `getAutomationByQR` | `utils/codes.ts` nuovo, `resolveCode(data, fonti)` con i test; `BarcodeScanner.tsx`; `ScannerScreen.tsx` (S1a); le 5 schermate delle automazioni | Nessuno: sola lettura. Fissare l'ordine (prodotto, posizione, scaffale, categoria, automazione, come oggi) e il caso del cestino |
| A1 | **Ricevimento merce** (carico in serie da fornitore) | alta | È il flusso d'ingresso di ogni magazzino. Oggi si fa un prodotto alla volta dall'Azione rapida, scegliendo ogni volta fornitore e posizione | `moveStock` carico con causale `acquisto`, `contactsForMovement` (fornitore scelto una volta all'inizio), `parseQty`, posizione come in Spostamento rapido; codice sconosciuto → «Crea prodotto» (Aggiungi con lo SKU letto) | `src/screens/automations/ReceiveScreen.tsx` nuovo, `AutomationsScreen.tsx:15` (voce), `RootNavigator`/`linking.ts`/`compat.ts` (toccati da S1a), `AddScreen` per lo SKU proposto (toccata da S1a) | Un pezzo unico al primo carico diventa articolo a quantità (`movementOf`, M04). Proposta: nel Ricevimento i pezzi unici già presenti si rifiutano («già in magazzino»), quelli nuovi passano da Aggiungi |
| A2 | **Uscita a cliente** (prelievo e spedizione) | alta | Vendita flash scarica 1 per lettura e senza cliente. Per i pezzi unici `sellProduct` non riceve il contatto | `moveStock` scarico causale `vendita` con `contactId` e `salePrice`; `saleOf` più `contactId` (resto di M10); Vendita flash come base | `ScanSellScreen.tsx` (cliente facoltativo all'inizio, quantità per gli articoli a quantità, riepilogo), `utils/inventoryOps.ts` `saleOf`, `InventoryContext.sellProduct`, `utils/contacts.ts` `contactEvents` (leggere anche `sold`) | Cambiare la firma di `sellProduct` tocca Azione rapida, esecuzione e Chat. Gli eventi `sold` vecchi restano senza contatto. Documenti di trasporto e ordini sono fuori, come in `map.md` |
| A3 | **Trasferimento con quantità** (posizione → posizione, poi scaffale) | alta | Oggi Spostamento rapido, esecuzione e Audit spostano tutto dalla posizione principale (V10) | `moveStock` trasferimento `{ from, to, qty }`, `qtyAt`, `positionsOf` | `BatchMoveScreen.tsx` (per un articolo a quantità: finestrella con «tutto» proposto e partenza = posizione con giacenza), passo «Sposta» dell'esecuzione (quantità «tutto» oppure «chiedi») | Nessun formato nuovo. Tenere «tutto» come proposta per non cambiare il comportamento di oggi senza chiederlo |
| A4 | **Passi nuovi nel costruttore**: Carico, Scarico, Trasferimento (quantità fissa o chiesta, contatto facoltativo, causale), Chiedi conferma | media | Le automazioni personali oggi sanno solo spostare, vendere e annotare | `MovementSheet` con `initialKind` e `onDone` (M09) come finestra del passo, `movementOf` | `contexts/AutomationsContext.tsx` (`StepType`, `STEP_TYPE_META`), `AutomationBuilderScreen.tsx` (`AVAILABLE_STEPS`, configurazione), `utils/automationRun.ts` | Tipi di passo nuovi. Dedotto: un'app più vecchia cadrebbe su un passo sconosciuto (`CustomRunnerScreen.tsx:316`, `:365`). Oggi non succede, perché le automazioni non passano tra telefoni. Diventerebbe possibile con una sincronizzazione futura (L1/L2 o la mesh) o tornando a una build vecchia con gli stessi dati. Basta un'esecuzione tollerante (passo sconosciuto = messaggio e fermo) |
| A5 | **Conta col lettore e inventario ciclico**, con l'esito dell'Audit salvato (P23) | media | La Conta è solo a mano. Né la Conta senza differenze né l'Audit lasciano traccia, quindi non si sa quali posizioni sono state controllate e quando | `countRows`, `countDiffs`, `countStock` (lettura = +1 sulla riga), `BarcodeScanner`, `scanProduct` (`lastScannedAt` dei trovati) | `CountScreen.tsx` (pulsante lettore), `AuditScreen.tsx` («Termina»: riepilogo con mancanti e intrusi), chiave nuova `furinventory_checks:{org}` (ultima conta e ultimo audit per posizione) con `utils/checks.ts` e test, elenco «Posizioni da verificare» nel Centro Automazioni | Chiave nuova solo locale, come i contatti: non entra nella copia cloud. Non segnare `lastScannedAt` di massa senza evento, altrimenti si nascondono gli avvisi «dormiente» |
| A6 | **Riordino sotto scorta** | media | Gli avvisi `low_stock` e la colonna «sotto scorta» del CSV ci sono, ma manca l'elenco per fornitore da cui partire col Ricevimento | `isLowStock`, `lowStockAlert`, `contactEvents` (ultimo fornitore dai carichi), `stockCsvRows`, l'export di `SettingsScreen` | Filtro o schermata «Da riordinare» (il ticket 05 lo nomina), pulsante «Ricevi» che apre A1 già pronto | Nessuno: sola lettura. Gli ordini a fornitore restano «Not yet specified» |
| A7 | **Reso** | media | Per gli articoli a quantità esiste solo a mano (carico, causale `reso`) e senza legame alla vendita. Un pezzo unico venduto non torna mai disponibile | `moveStock` carico causale `reso` con cliente; per il pezzo unico una funzione nuova `returnOf` | `utils/inventoryOps.ts` più test, `InventoryContext`, Azione rapida (voce «Reso» sui venduti, toccata da S1a), `types/index.ts` (evento) | Il pezzo unico ha perso il listino (`inventoryOps.ts:60`): tenere il prezzo di prima nell'evento di vendita o chiederlo nel reso. Se nasce un tipo di evento nuovo vanno aggiornati Cronologia, filtri e CSV dei movimenti. Non usare il carico (`movementOf`) per il pezzo unico, perché lo trasformerebbe in articolo a quantità |
| A8 | **Etichette in serie** (prodotti, posizioni, scaffali) | media | Senza etichette non si legge niente. Oggi c'è un'etichetta per volta, dipendente da internet (V16), irraggiungibile coi capi GS1 (P27) | Selezione multipla dell'Inventario (`HomeScreen`, toccata da S1a), HTML di `handlePrintLabel` (`DetailScreen.tsx:239-350`), `react-native-qrcode-svg` (già nelle dipendenze) per un QR senza internet, `expo-print` | `utils/labels.ts` (HTML puro e test), barra della selezione in Home, `LocationsScreen`/`ShelvesScreen` (S1a) | Nessuno sui dati. Stampa solo sul telefono. Scegliere che cosa c'è nel QR: SKU, oppure link GS1 una volta che A0 lo riconosce |
| A9 | **Passi condizionali** (se… allora) | bassa | Un motore di condizioni è il pezzo più complesso e meno usato | I rifiuti delle operazioni (`refusalText`) più «Chiedi conferma» (A4) coprono i casi pratici: già venduto, esaurito, nel cestino | Nessuno per ora. Più avanti un campo `onlyIf` (categoria, sotto scorta) nel passo | Nessuno |

I passi NFC non sono passi a sé: con N1 il lettore di ogni passo «Scansiona» accetta QR, NFC o entrambi secondo Scanner & NFC (punto 3).

### 2.5 Come si proverebbe

Una prova per fetta, sullo stampo di `m10-contatti.cjs` (`prepara` con contatti ed eventi) e `m03-giacenza.cjs` (`rendiAQuantita`, `check` tra stato ed eventi).

- **`prova/au0-codici.cjs`**:
  - link GS1 di VIS-0142 riconosciuto in Scanner e automazioni;
  - SKU in minuscolo riconosciuto;
  - codice di scaffale come destinazione;
  - cestino rifiutato;
  - inserimento a mano.
- **`prova/au2-ricevimento.cjs`**:
  - fornitore scelto una volta, 3 letture con quantità;
  - eventi `stock` carico/acquisto con `contactId`;
  - giacenza = somma degli eventi (`replayStock`);
  - codice sconosciuto → Aggiungi con lo SKU;
  - pezzo unico rifiutato.
- **`prova/au3-uscita.cjs`**:
  - cliente, quantità 2 su un articolo a quantità;
  - pezzo unico venduto col contatto, visibile nella scheda del contatto.
- **`prova/au4-trasferimento.cjs`**: 2 pz da stand_a a vetrina mentre il magazzino resta uguale; «tutto» proposto.
- **`prova/au5-conta-audit.cjs`**:
  - conta col lettore (+1 per lettura);
  - Audit terminato salvato e rivisto dopo l'uscita;
  - «Posizioni da verificare».
- **Regressioni sempre**: `a3-*`, `m03-giacenza`, `m04-movimenta`, `m07-conta`, `m09-azione`, `m10-contatti`, `s1-scaffali` (invariante: nessuna chiave di `stock` è uno scaffale), `c01-numeri`.
- **Telefono**: letture con la fotocamera in serie (doppie letture con `delay` 500 ms nell'esecuzione contro 2000 ms negli altri, `BarcodeScanner.tsx:16`); stampa di più etichette; etichetta senza internet (V16).

---

## 3. Dove agganciare S3 (avvisi degli scaffali) e N1 (NFC)

### 3.1 Stato attuale, punti di carico

Sono i punti dove merce o pezzi entrano in una posizione, cioè chi chiama `moveProduct`, `moveStock`, `addProduct` o `countStock` a `4b94e4c`. Il ticket 15 (risposta dell'utente) dice **avviso, mai blocco**: oggi l'unico «blocco» sono i rifiuti delle operazioni, più la domanda di capienza dello Spostamento rapido.

| Punto | File:riga | Controllo di capienza oggi | S3 da aggiungere | `map-2.md` lo nomina? |
| --- | --- | --- | --- | --- |
| Aggiungi | `src/screens/tabs/AddScreen.tsx:249` (S1a) | nessuno | avviso e proposta dello scaffale nel blocco Magazzino | sì |
| Movimenta (Scheda e Azione rapida) | `components/MovementSheet.tsx:115` | nessuno | avviso su carico e trasferimento verso la posizione o lo scaffale | sì |
| Azione rapida «Spostato» | `src/screens/ScannerActionScreen.tsx:66` (S1a) | nessuno | avviso | sì |
| Spostamento rapido | `src/screens/automations/BatchMoveScreen.tsx:151`; capienza a `:67-97` | sì, solo alla scelta della destinazione, contando i prodotti (V13) | conto aggiornato a ogni articolo (ticket 15), in pezzi, peso e volume (S2), proposta di un altro scaffale | sì |
| Esecuzione, passo «Sposta» | `src/screens/automations/CustomRunnerScreen.tsx:84`, `:227` | nessuno | avviso nel messaggio sovrapposto | **no**: va aggiunto a S3 |
| Audit «Sposta qui» | `src/screens/automations/AuditScreen.tsx:159` | nessuno | avviso nella conferma | **no** |
| Conta (rettifica in aumento) | `src/screens/automations/CountScreen.tsx:81` | nessuno | solo informazione nel riepilogo: la merce c'è già | **no** |
| Import CSV | `src/screens/tabs/SettingsScreen.tsx:186` (S1a) | nessuno | riga nel riepilogo dell'import, non un avviso per riga | **no** |
| Chat «Approva» e «Sposta» | `src/screens/ChatScreen.tsx:120`, `src/components/chat/HydratedProductCard.tsx:208` | nessuno | dipende dalla decisione sulla Chat (domande) | **no** |
| Ricevimento, Uscita, Trasferimento (A1-A3) | da fare | – | da progettare insieme a S3 | – |

Fatto strutturale:
- Le automazioni spostano verso una **posizione** (`moveProduct(id, to)`), e da S1a `moveOf`/`stockPatch` tolgono lo scaffale.
- Perché S3 valga nelle automazioni, la destinazione deve poter essere uno scaffale: lettura del codice dello scaffale → `{ locationId, shelfId }` (A0), più un'operazione che posa sullo scaffale.
- Per gli articoli a quantità questo dipende dalla forma delle chiavi di `stock` decisa in S1b.

### 3.2 Stato attuale, punti di lettura (N1)

| Lettore | File:riga | Ricerca oggi | Maiuscole | Riconosce | Gancio N1 |
| --- | --- | --- | --- | --- | --- |
| `BarcodeScanner` (componente comune) | `components/BarcodeScanner.tsx:31-38`, `CameraView` a `:64-71` | passa la stringa a `onScan` | – | – | **Un solo gancio per 5 automazioni** (Audit `:308`, Spostamento rapido `:264`, Esecuzione `:408`, Tagging `:186`, Vendita flash `:201`), più Aggiungi, Modifica, Categorie e Posizioni. Pulsante «Leggi tag NFC» che chiama `nfcService.readTag()` e passa il testo allo stesso `onScan({ type: 'nfc', data })`. QR, NFC o entrambi secondo `scanMode` (`HardwareConfigContext.tsx:8-13`, D19). Nascosto sul web |
| Scanner | `src/screens/ScannerScreen.tsx:38-132` (S1a), `CameraView` diretta a `:292`, a mano `:134-166` | `sku === data \|\| id === data`, poi posizione, categoria, scaffale (copia di lavoro), `AUTO:` | esatta (a mano: minuscole, ma solo prodotti) | prodotto, posizione, categoria, scaffale, automazione | Secondo gancio, perché non usa `BarcodeScanner`. Qui si sistema anche P26 (`scanProduct` nel ramo della fotocamera) e l'inserimento a mano passa da `resolveCode` |
| Esecuzione | `CustomRunnerScreen.tsx:152-202` | prodotto per id o SKU; posizione per `barcode` o id | esatta | prodotto, posizione | via `BarcodeScanner`. Serve A0 per GS1 e scaffale |
| Audit | `AuditScreen.tsx:56-180` | posizione per id, etichetta o `barcode`; prodotto per id, poi SKU | esatta | posizione, prodotto | via `BarcodeScanner` |
| Spostamento rapido | `BatchMoveScreen.tsx:45-175` | posizione per id, etichetta o `barcode`; prodotto per id, poi SKU | esatta | posizione, prodotto | via `BarcodeScanner` |
| Tagging | `QuickTagScreen.tsx:50-95` | id, poi SKU (anche nel cestino) | esatta | prodotto | via `BarcodeScanner` |
| Vendita flash | `ScanSellScreen.tsx:37-82` | id, poi SKU | esatta | prodotto | via `BarcodeScanner`. Il ticket 18 chiede una conferma dopo la lettura NFC, e la finestra del prezzo la dà già |

Fatti per N1:
- Il tag di un prodotto contiene il **link GS1**: lo scrive la Scheda, `DetailScreen.tsx:786-794`. Senza A0 nessun lettore lo riconosce (V07).
- `readTag()` restituisce il contenuto NDEF (URI o testo), non l'identificativo del tag.
- I campi `nfcTag` di `Location`, `Library` e `Shelf` (S1a: «solo memorizzato», nella prova `04:AA:BB:CC`, cioè un identificativo) non hanno una schermata che li scriva a `4b94e4c`. N1 deve decidere se il tag di posizione o di scaffale porta il **codice** (ticket 18, va da sé con `readTag`) o l'**identificativo**, che richiede `getTag().id`: in quel caso `nfcTag` servirebbe davvero.
- «Leggi più tag» (N2) nelle automazioni c'è già per costruzione: l'esecuzione torna da sola a «Scansiona Prodotto» (`CustomRunnerScreen.tsx:269-277`) e Spostamento rapido e Tagging leggono in fila.

### 3.3 Difetti che toccano i punti di aggancio

Tutti già descritti sopra, con i passi:
- **V07**: link GS1 e SKU minuscolo non riconosciuti. Un tag NFC di prodotto oggi non sarebbe letto;
- **V14**: codice di scaffale non riconosciuto nelle automazioni;
- **V13**: capienza controllata una volta e in prodotti, non in pezzi;
- **P26**: la lettura con la fotocamera non registra «scansionato»;
- **D19**: `scanMode` salvato e mai letto, quindi oggi «solo QR» o «solo NFC» non cambia niente (letto nel codice: `useHardwareConfig` lo usa solo `HardwareScreen`).

### 3.4 Che cosa manca

- Una funzione unica dei codici (A0).
- Il pulsante NFC in `BarcodeScanner` e in `ScannerScreen`.
- La lettura di `scanMode`.
- Lo scaffale come destinazione nelle automazioni.
- Il controllo di riempimento in 4 punti in più di quelli di `map-2.md`: esecuzione, Audit, Conta, import, più la Chat se resta.

### 3.5 Proposta semplice

1. **Prima A0** (`utils/codes.ts` con i test). Poi N1 e S3 lo usano entrambi.
2. **S3**:
   - una funzione pura `loadCheck(scaffale o posizione, prodotti, in arrivo)` in `utils/shelves.ts` (S2/S3), che dà `{ livello, testo, proposta }`;
   - un piccolo hook `useLoadWarning()` usato da tutti i punti della tabella 3.1, senza 8 copie del calcolo;
   - nelle automazioni l'avviso va nel messaggio sovrapposto (Spostamento rapido, Esecuzione) o nella conferma (Audit), mai come blocco;
   - il controllo di `BatchMoveScreen.tsx:67-97` diventa la prima chiamata di `loadCheck`.
3. **N1**:
   - `BarcodeScanner` con `useHardwareConfig()`;
   - pulsante «Leggi tag NFC» con `nfcService.readTag()`;
   - lo stesso `onScan`;
   - `ScannerScreen` uguale.
   - Le automazioni non cambiano, perché ricevono una stringa come oggi.

Rischi per i dati:
- A0 e N1 leggono soltanto.
- S3 nelle automazioni richiede di posare sullo scaffale: tocca `moveOf`/`stockPatch` (S1a, S1b), quindi va fatto dopo S1b e con l'invariante di `s1-scaffali.cjs`.

### 3.6 Come si proverebbe

- **S3, `prova/s3-avvisi.cjs`**:
  - scaffale con capienza 2 e Spostamento rapido di 3 prodotti: avviso dal secondo (80%), proposta di un altro scaffale, nessun blocco;
  - la stessa cosa nell'esecuzione col passo «Sposta» e nell'Audit con «Sposta qui»;
  - lettura del codice di uno scaffale come destinazione.
  - Regressioni: `a3-batchmove` (capienza di posizione), `s1-scaffali`, `m04-movimenta`.
- **N1, sul web**: con l'inserimento a mano il link GS1 apre il prodotto in tutte le automazioni; il pulsante NFC non compare.
- **N1, non provato, serve il telefono**:
  1. Scheda di VIS-0142 › scrivi il tag;
  2. Automazioni › Spostamento rapido › Vetrina › «Leggi tag NFC» › avvicina il tag: VIS-0142 spostato, evento `moved`;
  3. lo stesso in Vendita flash: si apre la finestra del prezzo e non vende da sola (ticket 18);
  4. Impostazioni › Scanner & NFC = «solo QR»: il pulsante NFC sparisce;
  5. tag sconosciuto: messaggio e nessuna scrittura;
  6. tag di posizione col suo codice letto in «Scansiona Posizione».

---

## Domande per l'utente (solo lui può decidere)

1. **P30**: «Alert Prodotti Dormienti» (soglia fissa a 6 mesi), «Suggerimenti AI» e Condivisione oggi dicono solo «Prossimamente». Tenerli, nasconderli o completarli? Proposta: soglia regolabile per i dormienti, nascondere gli altri due.
2. **Chat (P28)**: fa parte del gestionale o resta un esperimento da nascondere? Da questo dipende se correggerla e se la toccano gli avvisi degli scaffali.
3. **Automazioni nuove, ordine**: proposta A0 (codici), poi Ricevimento, Uscita a cliente, Trasferimento con quantità, poi Conta col lettore, Riordino, Reso, Etichette in serie. Va bene, o una di queste serve prima?

---

## Appendice: esiti degli scenari nuovi

Righe copiate da `v-automazioni.log` e `v-scaffali.log` (23 novembre, 03:14-03:17), senza le finestre del browser. Le finestre rilevanti sono già citate sopra.

```
[v-runner-prezzo] {"scritto1":"1300,50","salvatoAST":1300,"scritto2":"5.900","salvatoLIN":5.9,"eventiSold":["cmp-3:5.9","cmp-4:1300","cmp-2:2550"]}
[v-runner-gia-venduto] {"modalePrezzoAperta":true,"messaggio":null,"azioniCompletate":"1","soldAt":"2026-11-18T23:47:38.551667Z","eventiNuovi":[]}
[v-runner-note-in-fila] {"atteso":"[Controllato] [Da Pulire] [Stato=OK]","noteSalvate":"[Stato=OK]","azioniCompletate":"3","eventi":["modified:[\"Note aggiornate\"]","modified:[\"Note aggiornate\"]","modified:[\"Note aggiornate\"]"]}
[v-cestino-tag] {"deletedAt":"2026-11-21T10:00:00Z","noteDopoRunner":"[Controllato]","posizioneDopoRunner":"magazzino","azioniCompletate":"2","noteDopoTagging":"[Controllato]\n[Da Pulire]","eventi":["modified","modified"]}
[v-runner-posizione-sparita] {"posizionePUZ":"deposito_eliminato","posizioneEsiste":false,"eventi":["moved:stand_c>deposito_eliminato"]}
[v-runner-sposta-senza-posizione] {"messaggio":"Fatto! Scansiona il prossimo","posizionePUZ":"stand_c","eventi":0,"azioniCompletate":"0"}
[v-codici] {"gs1":"https://syncroflow.app/id/01/VIS-0142/21/000142","runnerGs1":"Non trovato: https://syncroflow","runnerMinuscolo":"Non trovato: vis-0142","noteVIS0142":"Fodera in seta rifatta. …","scannerLettura":"non riconosciuto?","manuale":{"https://syncroflow.app/id/01/VIS-0142/21/000142":"non trovato","stand_a":"non trovato","AUTO:auto_tag":"non trovato"}}
[v-audit-intruso-riletto] {"dopoAggiunta":{"trovati":"0","mancanti":"1","intrusi":"1","pct":"0"},"dopoRilettura":{"trovati":"1","mancanti":"1","intrusi":"0","pct":"50"},"etichettaIntrusoAncora":false,"posizionePUZ":"stand_c"}
[v-audit-otto-posizioni] {"audit":{"Deposito":false,"Ricevimento":false,"Sartoria":true},"spostamentoRapido":{"Deposito":true,"Ricevimento":true},"conta":{"Deposito":true,"Ricevimento":true}}
[v-runner-quantita] {"stockDopo":{"stand_a":2,"vetrina":4},"location":"vetrina","status":"available","eventi":["trasferimento/-/4/magazzino>vetrina/","scarico/vendita/1/magazzino>/3800"]}
[v-builder-indirizzo] {"daIndirizzo":" Page Not Found The moment you're looking for seems to have been lost in the shadows. Return Home"}
[v-p30] {"Alert Prodotti Dormienti":"cliccato","Suggerimenti AI":"cliccato","condivisione":"Questa funzionalità verrà completata nella prossima versione."}
[v-scaffale-nelle-automazioni] {"runnerScanLocation":"Posizione non trovata","spostamentoRapido":"Prodotto non trovato: SCAF-MAG-A1","VIS0098":{"location":"vetrina","shelfId":null},"eventi":["moved:magazzino>vetrina"]}
```

Finestre di `v-codici`:
- «Codice Non Riconosciuto | …000142» (Scanner, sim.);
- tre volte «Prodotto Non Trovato» (Scanner a mano: link GS1, `stand_a`, `AUTO:auto_tag`).

Finestre di `v-p30`:
- «Prossimamente | Configurazione alert manutenzione sarà disponibile…»;
- «Prossimamente | Configurazione suggerimenti AI sarà disponibile…».
