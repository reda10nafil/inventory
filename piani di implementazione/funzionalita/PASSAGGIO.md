# Passaggio di consegne — fase B, funzionalità di magazzino (Syncro Flow)

Aggiornato il 22 novembre 2026 (mattina) dalla sessione delle fette M, dopo M01 e M02. Le regole della notte sono in `../NOTTE_22_23.md` e nella nota della coordinatrice (`side-session-notes/local_5c439c03…/notte-22-23-novembre.md`): carta bianca, un task per volta, tutto verde dopo ogni task, decisioni semplici e reversibili annotate in `../DECISIONI_DA_RIVEDERE.md`, mai su `main`.

## Dove siamo

- Worktree `D:\FurInventory Pro\inventory-stili`, branch **`funzioni/magazzino`**, pubblicato con `git push origin HEAD:funzioni/magazzino`. Il checkout `D:\FurInventory Pro\inventory` resta su `main`: non toccarlo.
- Fatto e pubblicato prima (dettagli e prove in `../CRONOLOGIA.md`): F00 conferme web, prova di tutte le funzioni (`prova-funzioni.md`), correzioni C01-C14, rilettura del revisore, mappa Wayfinder (`map.md`, `issues/01-10`, `grafo-lavori.md`).
- **M01 Categorie** (94d4760): `contexts/CategoriesContext.tsx` (chiave `furinventory_categories:{org}`), `utils/categories.ts`, Impostazioni › Categorie (`settings/categories`), etichetta «Categoria» ovunque, nome della categoria al posto dell'id in tutte le schermate, PDF e CSV. Prova `prova/m01-categorie.cjs`, foglio `prova/stili-m01.jpg`.
- **M02 Logica della giacenza** (vedi `git log`): campi facoltativi `unit`, `stock`, `minStock` in `Product`; evento `stock` in `TimelineEvent`; `utils/stock.ts` con `applyMovement`, `stockOf`, `isAt`, `positionsOf`, `replayStock`… e 26 test. Nessuna schermata usa ancora `stock`.
- Jest: 166 test verdi. Bundle Android 5,11 MB, 62 asset. `controllo.sh` fa 32 schermate (Categorie compresa).

## Cosa fare adesso, in ordine

1. **M03** (ticket 01 e 03), **in un solo commit** per la regola 7 del grafo: nessun commit in cui un prodotto può avere `stock` mentre una scrittura o lettura della posizione lo ignora. Contenuto:
   - Instradamenti nel contesto (`contexts/InventoryContext.tsx`): `moveProduct(id, verso)` per un articolo a quantità = `applyMovement` trasferimento di tutta la giacenza della posizione principale; `sellProduct(id, prezzo, qty = 1)` = scarico con causale `vendita` e `finalPrice` nell'evento, stato che resta disponibile, `sellPrice` non sovrascritto. Per gli articoli a quantità si scrivono **eventi `stock`, non `moved`/`sold`**, altrimenti `replayStock` non torna. I pezzi unici restano come oggi.
   - **Attenzione (parere del revisore)**: un evento calcolato dentro `setProducts(prev => …)` non si può restituire né scrivere in modo affidabile (l'aggiornamento può girare dopo, e due volte in StrictMode). `moveProduct` e `sellProduct` devono continuare a restituire un booleano. Strada consigliata: un `productsRef` aggiornato subito (come `listRef` in `CategoriesContext`), si calcola `applyMovement` sul valore del ref, si aggiornano ref e stato con il prodotto nuovo e si scrivono gli eventi con `addTimelineEvent`. Il salvataggio di `InventoryContext` è un `useEffect` sullo stato (riga ~131): verificare che basti.
   - Letture della posizione con `isAt` al posto di `p.location === x`: Audit, Spostamento rapido, filtri e conteggi per posizione, `usage` delle posizioni con `positionsOf` (una posizione con giacenza, anche nel cestino, non si elimina). Cercare con grep `\.location ===` e `location ==` in `src/`, `contexts/`, `utils/`.
   - Modifica: per un articolo a quantità posizione e giacenza in sola lettura («usa Movimenta»).
   - Aggiungi: sezione Magazzino con quantità facoltativa (vuota = pezzo unico) e unità (`UNITS`); con una quantità si scrive `stock` con `applyMovement` carico causale `iniziale` partendo da `stock: {}` (vedi il test «la quantità iniziale di un articolo nuovo è un evento»).
   - Card dell'Inventario e Scheda: quantità con `formatQty` ed «Esaurito» (`isOutOfStock`), giacenza per posizione nella Scheda.
   - Prova sul web (`prova/m03-…cjs`): giacenza salvata e `replayStock(eventi)` uguali dopo Aggiungi con quantità, spostamento, vendita; pezzi unici come prima (rilanciare `a3-audit`, `a3-batchmove`, `a3-scansell`, `a3-scanner`, `a1-inventario`, `a4-posizioni`). Foglio nei 5 stili con `FETTA=m03` in `prova/stili-fette.cjs` (aggiungere la voce `m03`) e `prova/foglio.py`.
2. Poi M04 (Movimenta dalla Scheda e filtro «Movimenti» in Cronologia, che oggi mostra gli eventi `stock` col testo predefinito), M06, M07, M08, M09, M10 secondo `grafo-lavori.md`.
3. Dopo le fette, i difetti rimasti (riga «dopo» della tabella delle correzioni in `prova-funzioni.md`): D16, D19, P16-P17, P20, P23, P26-P30, il messaggio di LokiJS al primo avvio web.

Cose pronte da riusare: `canSell` / `canMove` / `usage` (`utils/productRules.ts`, `usage` conta anche le categorie); `describeChanges` (`utils/productChanges.ts`); `productCsvRows` (`utils/productCsv.ts`); `appendToLayout` e `useInstallFields`; `formatNumber` / `formatNumberInput` / `parseNumber` / `parseStoredNumber` (l'import CSV delle quantità in M08 deve usare `parseStoredNumber`); `PhotoPlaceholder`; `useCategories().labelOf`.

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
- Shell: in Bash `cd … && A & B` esegue `cd` solo nel ramo in background; i blocchi Python lunghi vanno in un file nello scratchpad.
- Login Google spento (`LOGIN_ENABLED = false`); non toccare `syncro_flow_flutter/` né `app/`; niente chiavi API, generazioni a pagamento o cloud; nessun comando git distruttivo; niente merge né pull request.
- Resoconti all'utente brevi e in italiano; dettagli nei file.

## Domande aperte per l'utente (domattina)

- Le decisioni prese al suo posto: `DECISIONI_DA_RIVEDERE.md`, righe del 22/11 su `funzioni/magazzino` (le 10 della mappa più quelle delle correzioni: export senza cestino, posizioni con prodotti non eliminabili, modelli che aggiungono invece di sostituire, campi nuovi subito nel modulo, foto facoltativa in Modifica, link GS1 che non cambia col dominio).
- P30: «Alert Prodotti Dormienti», «Suggerimenti AI» e Condivisione dicono «Prossimamente»: tenerli, nasconderli o completarli?
- Chat (P28) e Team: fanno parte del gestionale o restano esperimenti?
