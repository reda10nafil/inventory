# Passaggio di consegne — fase B, funzionalità di magazzino (Syncro Flow)

Aggiornato il 22 novembre 2026, notte (circa 9:00), dalla prima sessione della fase B, a correzioni chiuse. Le regole della notte sono in `../NOTTE_22_23.md` e nella nota della coordinatrice (`side-session-notes/local_5c439c03…/notte-22-23-novembre.md`): carta bianca, un task per volta, tutto verde dopo ogni task, decisioni semplici e reversibili annotate in `../DECISIONI_DA_RIVEDERE.md`, mai su `main`.

## Dove siamo

- Worktree `D:\FurInventory Pro\inventory-stili`, branch **`funzioni/magazzino`** (tagliato da `ui-ux/stili` c2734a0, che resta fermo), pubblicato con `git push origin HEAD:funzioni/magazzino`. Il checkout `D:\FurInventory Pro\inventory` resta su `main`: non toccarlo.
- Fatto e pubblicato (dettagli e prove in `../CRONOLOGIA.md`):
  - **F00** (499a313): conferme e avvisi sul web (`Alert.alert` → finestre del browser, `utils/webAlert.ts`).
  - **Prova di tutte le funzioni** (7dd83ac): `prova-funzioni.md`, esiti per area in `prova/esito-a1.md` … `a4`, script Playwright in `prova/`.
  - **Correzioni C01-C14** tutte chiuse: C01 numeri italiani (d3128a6), C02 Modifica (7baa3f8), C03 vendite (bdf04fa), C04 D15 spostamenti (913e7cd), C05 posizioni e cartelle eliminate (cb7e9c7), C06 CSV (e1fbbd1), C07 modelli e campi nel layout (6a56c73), C08 D03 Modifica (ee53296), C09 ricerca e filtri (e2b30fd), C10 Cronologia completa (ffc17bc), C11 lettore QR (844e986), C12 senza foto (77c0549), C13 GS1, numeri, Svuota, visore (a71ef0a), C14 D21 (42301ae).
  - **Rilettura del revisore** (12bd952): numeri del CSV a 3 decimali (`parseStoredNumber`), note vuote senza eventi spuri, rilancio completo delle 85 prove sul codice finale, parti nuove nei 5 stili (`prova/stili-fase-b.jpg`).
  - **Mappa Wayfinder confermata** (25b514a): `map.md`, `issues/01-10` (decise dall'agente, regola 4), `grafo-lavori.md` (fette M01-M10).
- Jest: 126 test verdi. Bundle Android 5,09 MB, 62 asset.

## Cosa fare adesso, in ordine

1. Fette **M01 → M10** di `grafo-lavori.md`, dalla più piccola (M01 Categorie, M02 logica della giacenza), rispettando le dipendenze. Regole del revisore già scritte nei ticket 01, 03, 06 e nella regola 7 del grafo: nessun commit in cui un prodotto può avere `stock` mentre una scrittura o lettura della posizione lo ignora; calcoli dentro `setProducts(prev => …)`; la Conta scrive tutte le rettifiche in una chiamata; decimali a 3 cifre e «2,5» (`parseNumber` c'è già in `utils/number.ts`); categorie e contatti in contesti propri, fuori dalle chiavi di `InventoryContext`. **Prima di cambiare la forma di `Product` (M02) chiedere un parere al revisore (advisor).**
2. Cose già pronte da riusare: `canSell` / `canMove` / `usage` (`utils/productRules.ts`); `moveProduct` e `sellProduct` restituiscono `false` se non fanno nulla e tutti gli spostamenti passano già da `moveProduct` (anche Audit e Spostamento rapido); `describeChanges` per la Cronologia (`utils/productChanges.ts`); `productCsvRows` per l'export (`utils/productCsv.ts`); `appendToLayout` e `useInstallFields` per i campi nuovi; `formatNumber` / `formatNumberInput` / `parseNumber`; `PhotoPlaceholder`.
3. Dopo le fette, i difetti rimasti (riga «dopo» della tabella delle correzioni in `prova-funzioni.md`): D16 (PDF senza campi personalizzati e codici da servizi esterni), D19 (preferenze Scanner & NFC non lette), P16-P17 (esecuzione delle automazioni), P20 (foto `blob:` sul web), P23 (esito dell'Audit), P26-P30, e il messaggio di LokiJS al primo avvio web (`src/db/adapter.web.ts`).

## Come si verifica un task (tutto verde prima del commit)

- Un comando, dalla radice del worktree: `bash "piani di implementazione/funzionalita/prova/controllo.sh" <cartella scratch>` → tsc, eslint, jest, bundle Android, console web su 30 schermate (il messaggio noto di LokiJS al primo avvio è contato a parte e non blocca; è intermittente).
- Prova della funzione: script in `prova/` con `lib.cjs` (browser pulito, campionario, finestre del browser gestite con `dialogs`, lettura dello stato salvato). Esempi recenti: `c01-numeri.cjs` … `c12-senza-foto.cjs`. Lettura simulata del lettore: `scan()` di `a3-util.cjs`. Lanciare con `SHOTS="$TEMP/prova-funzioni" node <file>.cjs` dalla cartella `prova/`.
- Nei 5 stili: `STILE=babilonia` (o `ishtar`, `ardesia`, `minimal`) davanti a `controllo.sh`, oppure `schermate.cjs` con il secondo argomento.
- Dopo il commit: voce in `../CRONOLOGIA.md` (in cima), `graphify update .`, push. Ogni decisione presa al posto dell'utente: una riga in `../DECISIONI_DA_RIVEDERE.md`.

## Cose da sapere

- **Fine riga**: alcuni file sono CRLF nell'indice (`EditScreen.tsx`, `InventoryContext.tsx`, `CustomFieldsContext.tsx`, `LayoutContext.tsx`…), gli altri LF; `core.autocrlf=true`. Modificare con lo strumento Edit (o Python con `newline=''`), mettere in stage con `bash "piani di implementazione/funzionalita/prova/stage.sh" <file>…` e controllare con `git diff --cached --numstat` che le righe cambiate siano poche. L'errore è già successo due volte (corretto con 908c316 e 50c60d4).
- **Server**: app web su `:8082` e campionario su `:8765` girano già, avviati da un'altra chat. Il pannello Browser ha già 5 server di altre chat: `preview_start` per nome rifiuta; usare Playwright (`lib.cjs`) o `preview_start {url}`. Non riavviare né uccidere Metro; evitare modifiche che richiedono un riavvio (dipendenze native, babel, metro).
- **Mai modificare codice dell'app mentre gira una prova** su `:8082` (Fast Refresh cambia il codice sotto la prova).
- Il profilo del pannello Browser ha il campionario caricato: non usarlo per le prove.
- Shell: in Bash `cd … && A & B` esegue `cd` solo nel ramo in background; i blocchi Python lunghi vanno in un file nello scratchpad.
- Login Google spento (`LOGIN_ENABLED = false`); non toccare `syncro_flow_flutter/` né `app/`; niente chiavi API, generazioni a pagamento o cloud; nessun comando git distruttivo; niente merge né pull request.
- Resoconti all'utente brevi e in italiano; dettagli nei file.

## Domande aperte per l'utente (domattina)

- Le decisioni prese al suo posto: `DECISIONI_DA_RIVEDERE.md`, righe del 22/11 su `funzioni/magazzino` (le 10 della mappa più quelle delle correzioni: export senza cestino, posizioni con prodotti non eliminabili, modelli che aggiungono invece di sostituire, campi nuovi subito nel modulo, foto facoltativa in Modifica, link GS1 che non cambia col dominio).
- P30: «Alert Prodotti Dormienti», «Suggerimenti AI» e Condivisione dicono «Prossimamente»: tenerli, nasconderli o completarli?
- Chat (P28) e Team: fanno parte del gestionale o restano esperimenti?
