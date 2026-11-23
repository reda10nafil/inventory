# Automazioni: funzionano? passi e automazioni che mancano

Tipo: grilling + research (verifica). Stato: **verificato** il 23 novembre 2026 mattina; piano proposto; due domande aperte. **Le parti di COD sono fatte il 23** (AU-V07, AU-V14, P26, inserimento a mano nelle automazioni; ticket 22, fetta COD). Fette: **ESE** (esecuzione corretta, presto: rovina dati), **FLU1** (ricevimento, uscita a cliente, trasferimento con quantità), **CON** (conta col lettore e audit salvato), **FLU2** (passi nuovi del costruttore), **RIO** (riordino), **RES** (reso), **VOCI** (voci «Prossimamente»); le etichette in serie stanno nella fetta ETI (ticket 22). Mappa: [`../map-3.md`](../map-3.md). Verifica completa: [`../ricerche/verifiche-23/verifica-automazioni.md`](../ricerche/verifiche-23/verifica-automazioni.md) (difetti `AU-V01…V16`, `AU-N13`, `AU-N17`, proposte `AU-A0…A9`), script in `../ricerche/verifiche-23/script/automazioni/`.

**Nota del 23 mattina**: il resoconto dice per gli scaffali «avviso, mai blocco». È superato dalla risposta dell'utente (ticket 15): avviso dall'80% e **blocco** quando il prodotto non entra.

## Question

Le automazioni funzionano bene? Quali passi e quali automazioni mancano per un magazzino di qualsiasi prodotto?

## Richiesta dell'utente (23 novembre mattina)

> «Ci sono tantissime automazioni che mancano, oppure step che mancano. Per di più bisogna vedere se funzionano bene.»

## Stato verificato (sintesi)

- Le cinque automazioni pronte (Audit, Spostamento rapido, Vendita flash, Tagging, Conta) e i sei passi del costruttore funzionano nel caso semplice, ma sono fatte per i **pezzi unici**: nessun passo chiede quantità, fornitore o cliente, causale, scaffale o conferma.
- **Difetti che rovinano dati** (esecuzione delle automazioni personali, provati sul web):
  - prezzo letto con `parseFloat`: «1300,50» → 1300, «5.900» → 5,9 (**AU-V01**);
  - due passi di nota in fila si cancellano a vicenda (**AU-V02**);
  - «Sposta in» manda il prodotto in una posizione che non esiste più (**AU-V05**);
  - tag scritti su prodotti nel cestino (**AU-V04**, anche dal Tagging).
- **Comportamento**: «fatto» anche quando l'operazione è rifiutata (AU-V03, AU-V06); un intruso dell'Audit riletto diventa «trovato» (AU-V08); l'Audit mostra solo 6 posizioni (AU-V09); i passi non si riordinano né si modificano (AU-V12); il costruttore dà NotFound ricaricando (AU-V11 → C2); la capienza dello Spostamento rapido conta i prodotti e non i pezzi (AU-V13 → S3); il codice di uno scaffale non è riconosciuto (AU-V14 → COD); **nessun lettore riconosce il link GS1** (AU-V07 = NG01 → COD); l'esecuzione aperta dall'indirizzo non conta l'uso (AU-N13); dall'Azione rapida di una posizione Audit e Spostamento chiedono di nuovo la posizione (AU-N17); un articolo a quantità sposta tutta la giacenza della posizione principale senza chiedere (AU-V10, da decidere in FLU1).
- Difetti aperti della prova del 22: **P16** (un'automazione che non inizia con una lettura resta bloccata) e **P17** («Imposta campo» scrive nelle note) ancora presenti; **P23** (esito dell'Audit non salvato) presente, e i capi trovati non aggiornano `lastScannedAt`; **P26** (lettura da fotocamera senza «scansionato») presente → COD; **P22 chiuso**; P28 (Chat) e P30 (voci «Prossimamente») presenti.
- Non esiste l'inserimento a mano del codice nelle automazioni (solo nello Scanner) → COD.
- **Fatto in COD (23/11)**: le 5 automazioni leggono con il lettore unico (link GS1, SKU in minuscolo, codici di posizioni e scaffali: AU-V07, AU-V14) e hanno «Scrivi il codice»; lo scaffale vale la sua posizione, con l'avviso (sullo scaffale in FLU1); un prodotto nel cestino si rifiuta già alla lettura in tutte e 5 (AU-V04 dal lato della lettura: Tagging ed Esecuzione non scrivono più le note; ESE resta per i controlli dell'esecuzione); la fotocamera dello Scanner registra «scansionato» (P26; nelle automazioni no). Prova `prova/cod-lettore.cjs`.

## Decisioni

- **Proposte dell'orchestratore** (dal resoconto §1.4 e §2.3):
  - prima una fetta di correzioni (**ESE**), poi le automazioni nuove;
  - ogni automazione nuova è una schermata come Vendita flash: lettura in fila più una finestra che riusa `MovementSheet`; nessun motore nuovo;
  - i passi NFC non sono passi a sé: con N1 ogni passo «Scansiona» accetta QR, NFC o entrambi;
  - i passi condizionali (AU-A9) restano nella nebbia della mappa.
- **Da chiedere** (una per volta):
  - quando VOCI è la prossima, **P30**: «Alert Prodotti Dormienti» (soglia fissa a 6 mesi), «Suggerimenti AI» e Condivisione oggi dicono solo «Prossimamente». Proposta: soglia regolabile per i dormienti, nascondere gli altri due;
  - quando FLU1 è la prossima, **l'ordine delle automazioni nuove**: proposta Ricevimento, Uscita a cliente, Trasferimento con quantità, poi Conta col lettore, Riordino, Reso. E per AU-V10: nel trasferimento di un articolo a quantità, «tutto» resta la proposta o si chiede sempre la quantità?
- Chat (P28, AU-V15): **ticket 30** (l'utente la vuole tenere e rendere utile).

## Piano di implementazione

### Fetta ESE — esecuzione corretta (dopo COD)

1. `utils/automationRun.ts` nuovo con test: `runStep(prodotto, passo, contesto)` → `{ ok, patch | refusal }`; `flowErrors(passi)` per il costruttore (il primo passo è una lettura; «Sposta nella posizione letta» vuole un «Scansiona Posizione» prima; i passi d'azione vogliono un prodotto letto prima).
2. `CustomRunnerScreen.tsx`: prezzo con `parseSalePrice`/`parseNumber` (AU-V01); note lette dal prodotto più recente con una funzione del contesto `appendNote(id, testo)` (AU-V02); il ritorno di `moveProduct`/`sellProduct` usato, contatore solo con `ok`, altrimenti `refusalText` (AU-V03); prodotti nel cestino rifiutati (AU-V04, anche in `QuickTagScreen`); passo verso una posizione sparita rifiutato con «La posizione di questo passo non esiste più: modifica l'automazione» (AU-V05); via il doppione morto `executeAutoStep` e `recordUsage` dopo il caricamento (AU-N13); un tipo di passo sconosciuto dà un messaggio e si ferma, non cade.
3. Eliminando una posizione si avvisa se un'automazione la usa (`LocationsScreen`).
4. `AutomationBuilderScreen.tsx`: `flowErrors` al salvataggio (P16, AU-V06); «Usa l'ultima posizione» spenta se nel flusso non c'è una lettura di posizione; frecce su e giù e tocco per modificare un passo (AU-V12); **«Imposta Campo» con la scelta tra i campi personalizzati**, scritto in `customData` con `fieldSnapshot` come Modifica (P17); le automazioni salvate non valide mostrano «Questa automazione non inizia con una lettura» con «Modifica».
5. `AuditScreen.tsx`: intruso già in elenco → «già segnato come intruso» (AU-V08); tutte le posizioni, con la ricerca se sono tante (AU-V09); `locationId` dall'Azione rapida (AU-N17, anche in `BatchMoveScreen`).

### Fetta FLU1 — ingresso e uscita (dopo S3 ed ESE)

- **Ricevimento merce** (AU-A1): schermata nuova `ReceiveScreen.tsx`; fornitore e posizione (o scaffale) scelti una volta; lettura in fila con la quantità (`moveStock` carico, causale `acquisto`); codice sconosciuto → «Crea prodotto» (Aggiungi con lo SKU letto); pezzi unici già presenti rifiutati («già in magazzino»); avviso e blocco degli scaffali (S3).
- **Uscita a cliente** (AU-A2): Vendita flash con cliente facoltativo all'inizio (resto di M10), quantità per gli articoli a quantità, riepilogo; `sellProduct` e `saleOf` con `contactId`; `contactEvents` legge anche `sold`.
- **Trasferimento con quantità** (AU-A3, AU-V10): Spostamento rapido, passo «Sposta» e Audit chiedono quantità e partenza per gli articoli a quantità («tutto» proposto); destinazione anche uno scaffale (dopo S1b).

### Fetta CON — conta e audit che lasciano traccia (dopo FLU1)

- Conta col lettore (una lettura = +1 sulla riga), esito dell'Audit salvato con riepilogo di mancanti e intrusi (P23), `lastScannedAt` dei trovati con il loro evento, chiave nuova `furinventory_checks:{org}` (ultima conta e ultimo audit per posizione) con `utils/checks.ts`, elenco «Posizioni da verificare» nel Centro Automazioni (AU-A5). **Scaffali in Conta e Audit** (nebbia di `map-2.md`): qui, dopo S1b.

### Fette FLU2, RIO, RES, VOCI (dopo FLU1)

- **FLU2** (AU-A4): passi nuovi Carico, Scarico, Trasferimento (quantità fissa o chiesta, contatto facoltativo, causale) e «Chiedi conferma», con `MovementSheet` come finestra del passo; `StepType` e `STEP_TYPE_META` in `AutomationsContext`.
- **RIO** (AU-A6): «Da riordinare» (sotto scorta, per fornitore dall'ultimo carico) con «Ricevi» che apre il Ricevimento già pronto.
- **RES** (AU-A7): reso di un articolo a quantità (carico con causale `reso` e cliente) e di un pezzo unico venduto (funzione nuova `returnOf`, che non lo trasforma in articolo a quantità; prezzo di prima nell'evento di vendita o chiesto nel reso); Cronologia, filtri e CSV dei movimenti aggiornati.
- **VOCI** (P30): secondo la risposta dell'utente.

## Piano di verifica

- **ESE**: jest `automationRun.test.ts` (prezzi «1300,50» e «5.900», note in fila, rifiuti, cestino, posizione sparita, `flowErrors`). Prova nuova `prova/ese-automazioni.cjs` con gli scenari `v-runner-*`, `v-cestino-tag`, `v-audit-*` del resoconto (in `ricerche/verifiche-23/script/automazioni/v-automazioni.cjs`) che passano da «difetto» ad «atteso»: prezzo giusto nell'evento `sold`, tre note in fila tutte presenti, rifiuto detto senza contare l'azione, nessuna nota su un prodotto nel cestino, passo verso una posizione sparita rifiutato, automazione senza lettura che non si salva, «Imposta campo» in `customData`, intruso riletto «già segnato», 8 posizioni nell'Audit. Regressioni: `a3-*.cjs`, `m07-conta.cjs`, `m09-azione.cjs`, `cod-lettore.cjs`, `controllo.sh`.
- **FLU1**: prova nuova `prova/flu1-flussi.cjs`: ricevimento di 3 articoli da un fornitore in una posizione (eventi di carico con il contatto, giacenze giuste), codice sconosciuto → Aggiungi con lo SKU; uscita a un cliente con quantità e prezzo (evento `sold`/scarico con `contactId`); trasferimento di 2 pezzi su 5 tra due posizioni; blocco di uno scaffale pieno durante il ricevimento (S3). Regressioni: `m04-movimenta.cjs`, `m10-contatti.cjs`, `a3-scansell.cjs`, `a3-batchmove.cjs`, `s3-avvisi.cjs`.
- **CON**: prova nuova `prova/con-conte.cjs`: conta col lettore (codice scritto a mano), esito dell'Audit ritrovato uscendo e rientrando, «Posizioni da verificare».
- **FLU2, RIO, RES**: una prova ciascuna (`flu2-passi.cjs`, `rio-riordino.cjs`, `res-reso.cjs`) con lo stesso schema: azione, eventi in Cronologia, giacenze, CSV dei movimenti.
- 5 stili per ogni fetta con schermate nuove.
- **Telefono**: fotocamera nelle automazioni («scansionato» registrato, P26); lettore a pistola come tastiera nell'inserimento a mano; NFC nei passi «Scansiona» (dopo N1).

## Come si torna indietro

ESE non cambia il formato delle automazioni salvate; le automazioni nuove sono schermate a sé e i passi nuovi sono tipi in più che un'esecuzione tollerante sa saltare.
