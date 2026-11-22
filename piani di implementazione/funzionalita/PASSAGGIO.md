# Passaggio di consegne — fase B, funzionalità di magazzino (Syncro Flow)

Aggiornato il 22 novembre 2026 (mattina) dalla sessione delle fette M, dopo M01, M02 e M03. Le regole della notte sono in `../NOTTE_22_23.md` e nella nota della coordinatrice (`side-session-notes/local_5c439c03…/notte-22-23-novembre.md`): carta bianca, un task per volta, tutto verde dopo ogni task, decisioni semplici e reversibili annotate in `../DECISIONI_DA_RIVEDERE.md`, mai su `main`.

## Dove siamo

- Worktree `D:\FurInventory Pro\inventory-stili`, branch **`funzioni/magazzino`**, pubblicato con `git push origin HEAD:funzioni/magazzino`. Il checkout `D:\FurInventory Pro\inventory` resta su `main`: non toccarlo.
- Fatto e pubblicato prima (dettagli e prove in `../CRONOLOGIA.md`): F00 conferme web, prova di tutte le funzioni (`prova-funzioni.md`), correzioni C01-C14, rilettura del revisore, mappa Wayfinder (`map.md`, `issues/01-10`, `grafo-lavori.md`).
- **M01 Categorie** (94d4760): `contexts/CategoriesContext.tsx` (chiave `furinventory_categories:{org}`), `utils/categories.ts`, Impostazioni › Categorie (`settings/categories`), etichetta «Categoria» ovunque, nome della categoria al posto dell'id in tutte le schermate, PDF e CSV. Prova `prova/m01-categorie.cjs`, foglio `prova/stili-m01.jpg`.
- **M02 Logica della giacenza** (vedi `git log`): campi facoltativi `unit`, `stock`, `minStock` in `Product`; evento `stock` in `TimelineEvent`; `utils/stock.ts` con `applyMovement`, `stockOf`, `isAt`, `positionsOf`, `replayStock`… e 26 test. Nessuna schermata usa ancora `stock`.
- **M03 Articoli a quantità** (vedi `git log`): `utils/inventoryOps.ts` (`moveOf`, `saleOf`, `withInitialStock`, `editableUpdates`, `refusalText`, più `stockPatch` interno), `qtyAt` e `describeStockEvent` in `utils/stock.ts`; nel contesto `productsRef` + `patchProduct` (ogni scrittura dei prodotti aggiorna subito la copia e scrive nello stato solo i campi toccati), `addProduct(dati, { qty })`, `sellProduct(id, prezzo, qty = 1)`; Aggiungi con la sezione Magazzino (blocco fisso sotto il layout), Modifica in sola lettura per gli articoli a quantità, card e Scheda con quantità ed «Esaurito», testo degli eventi `stock` in Cronologia e Scheda. Prova `prova/m03-giacenza.cjs` (8 scenari), foglio `prova/stili-m03.jpg`.
- Jest: 187 test verdi. `controllo.sh` fa 32 schermate (Categorie compresa).

## Cosa fare adesso, in ordine

1. **M04** (ticket 02): «Movimenta» nella Scheda.
   - Contesto: una funzione nuova (es. `moveStock(id, movimento: Movement)`) che chiama `applyMovement` sul prodotto di `productsRef.current`, scrive con `patchProduct(id, stockPatch(r.product))` e gli eventi con `addTimelineEvent`; restituisce `{ ok } | { ok: false, error, available }` per `movementErrorText`. `stockPatch` è in `utils/inventoryOps.ts` (oggi non esportata). Vale anche per un pezzo unico: `applyMovement` registra prima il carico «iniziale» di 1 e lo rende articolo a quantità (decisione M02).
   - Scheda: pulsante «Movimenta» (prodotto disponibile e non nel cestino) che apre una finestra: tipo (Carico, Scarico, Trasferimento, Rettifica), quantità (`parseQty`, unità del prodotto), posizioni (da/a con le pillole delle posizioni; la rettifica chiede posizione e quantità contata), causale (`REASON_LABELS` senza `iniziale`), nota. Errori con `movementErrorText`.
   - Cronologia: filtro «Movimenti» (tipo `stock`) in `TYPE_FILTERS` di `TimelineScreen`; il testo degli eventi c'è già (`describeStockEvent`).
   - Modifica: la nota della sola lettura diventa «usa Movimenta nella Scheda» (oggi dice «spostamento, vendita»).
   - Prova `prova/m04-…cjs`: i 4 movimenti dalla Scheda con giacenza salvata = `replay` degli eventi (copiare `replay`/`check` da `m03-giacenza.cjs`), il primo movimento di un pezzo unico, i rifiuti (scarico oltre la giacenza, stesse posizioni, cestino), il filtro «Movimenti»; foglio `FETTA=m04`.
2. Poi **M08** (export/import CSV con Unità, Giacenza `posizione:quantità; …`, Scorta minima, più i CSV giacenze e movimenti; l'import delle quantità con `parseStoredNumber`), che il grafo permette subito dopo M04 e che chiude la perdita del giro esporta-importa, poi M06, M07, M09, M10 secondo `grafo-lavori.md`.
3. Dopo le fette, i difetti rimasti (riga «dopo» della tabella delle correzioni in `prova-funzioni.md`): D16, D19, P16-P17, P20, P23, P26-P30, il messaggio di LokiJS al primo avvio web.

Cose pronte da riusare: per M04+ `applyMovement`, `movementErrorText`, `MOVEMENT_LABELS`, `REASON_LABELS`, `UNITS`, `qtyAt`, `describeStockEvent`, `refusalText`; la prova `m03-giacenza.cjs` (`rendiAQuantita`, `replay`, `check`); `canSell` / `canMove` / `usage` (`utils/productRules.ts`, `usage` conta anche le categorie); `describeChanges` (`utils/productChanges.ts`); `productCsvRows` (`utils/productCsv.ts`); `appendToLayout` e `useInstallFields`; `formatNumber` / `formatNumberInput` / `parseNumber` / `parseStoredNumber` (l'import CSV delle quantità in M08 deve usare `parseStoredNumber`); `PhotoPlaceholder`; `useCategories().labelOf`.

## Come si verifica un task (tutto verde prima del commit)

- Un comando, dalla radice del worktree: `bash "piani di implementazione/funzionalita/prova/controllo.sh" <cartella scratch>` → tsc, eslint, jest, bundle Android, console web su 32 schermate (il messaggio noto di LokiJS al primo avvio è contato a parte e non blocca; è intermittente).
- Prova della funzione: script in `prova/` con `lib.cjs` (browser pulito, campionario, finestre del browser gestite con `dialogs`, lettura dello stato salvato). Esempi recenti: `c01-numeri.cjs` … `c12-senza-foto.cjs`. Lettura simulata del lettore: `scan()` di `a3-util.cjs`. Lanciare con `SHOTS="$TEMP/prova-funzioni" node <file>.cjs` dalla cartella `prova/`.
- Nei 5 stili: `FETTA=<fetta> OUT=<cartella> node stili-fette.cjs` poi `python -I foglio.py <cartella> stili-<fetta>.jpg` (dalla cartella `prova/`); oppure `STILE=babilonia` (o `ishtar`, `ardesia`, `minimal`) davanti a `controllo.sh`.
- Dopo il commit: voce in `../CRONOLOGIA.md` (in cima), `graphify update .`, push. Ogni decisione presa al posto dell'utente: una riga in `../DECISIONI_DA_RIVEDERE.md`.

## Cose da sapere

- **Fine riga**: alcuni file sono CRLF nell'indice (`EditScreen.tsx`, `InventoryContext.tsx`, `CustomFieldsContext.tsx`, `LayoutContext.tsx`…), gli altri LF; `core.autocrlf=true`. Modificare con lo strumento Edit (o Python con `newline=''`), mettere in stage con `bash "piani di implementazione/funzionalita/prova/stage.sh" <file>…` e controllare con `git diff --cached --numstat` che le righe cambiate siano poche. L'errore è già successo due volte (corretto con 908c316 e 50c60d4).
- **Server**: app web su `:8082` e campionario su `:8765` girano già, avviati da un'altra chat. Il pannello Browser ha già 5 server di altre chat: `preview_start` per nome rifiuta; usare Playwright (`lib.cjs`) o `preview_start {url}`. Non riavviare né uccidere Metro; evitare modifiche che richiedono un riavvio (dipendenze native, babel, metro).
- **Mai modificare codice dell'app mentre gira una prova** su `:8082` (Fast Refresh cambia il codice sotto la prova).
- Il profilo del pannello Browser ha il campionario caricato: non usarlo per le prove.
- Sostituzioni nei file con accenti o emoji: scrivere lo script Python in un file nello scratchpad (da `python - <<'EOF'` alcune sostituzioni non trovavano il testo).
- Script Python lanciati con un heredoc nella shell Bash: `\\n` arriva a Python come a capo vero (successo in M03). Scrivere lo script con lo strumento Write in un file dello scratchpad e usare stringhe `r"""…"""` quando contengono `\n` del codice.
- Shell: in Bash `cd … && A & B` esegue `cd` solo nel ramo in background; i blocchi Python lunghi vanno in un file nello scratchpad.
- Login Google spento (`LOGIN_ENABLED = false`); non toccare `syncro_flow_flutter/` né `app/`; niente chiavi API, generazioni a pagamento o cloud; nessun comando git distruttivo; niente merge né pull request.
- Resoconti all'utente brevi e in italiano; dettagli nei file.

## Domande aperte per l'utente (domattina)

- Le decisioni prese al suo posto: `DECISIONI_DA_RIVEDERE.md`, righe del 22/11 su `funzioni/magazzino` (le 10 della mappa più quelle delle correzioni: export senza cestino, posizioni con prodotti non eliminabili, modelli che aggiungono invece di sostituire, campi nuovi subito nel modulo, foto facoltativa in Modifica, link GS1 che non cambia col dominio).
- P30: «Alert Prodotti Dormienti», «Suggerimenti AI» e Condivisione dicono «Prossimamente»: tenerli, nasconderli o completarli?
- Chat (P28) e Team: fanno parte del gestionale o restano esperimenti?
