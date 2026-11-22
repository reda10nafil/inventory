# Passaggio di consegne — fase B, funzionalità di magazzino (Syncro Flow)

Aggiornato il 22 novembre 2026, notte, dalla prima sessione della fase B. Le regole della notte sono in `../NOTTE_22_23.md` e nella nota della coordinatrice (`side-session-notes/local_5c439c03…/notte-22-23-novembre.md`): carta bianca, un task per volta, tutto verde dopo ogni task, decisioni semplici e reversibili annotate in `../DECISIONI_DA_RIVEDERE.md`, mai su `main`.

## Dove siamo

- Worktree `D:\FurInventory Pro\inventory-stili`, branch **`funzioni/magazzino`** (tagliato da `ui-ux/stili` c2734a0, che resta fermo). Pubblicato su GitHub con `git push origin HEAD:funzioni/magazzino`. Il checkout `D:\FurInventory Pro\inventory` resta su `main`: non toccarlo.
- Fatto e pubblicato:
  - **F00** (499a313): `Alert.alert` sul web diventa `window.alert` / `confirm` / `prompt` (`utils/webAlert.ts`, installato in `index.js`). Senza, sul web nessuna conferma funzionava.
  - **Prova di tutte le funzioni** (7dd83ac): `prova-funzioni.md` (riepilogo, difetti P01-P30, ordine C01-C14), esiti per area in `prova/esito-a1.md` … `a4`, script Playwright in `prova/`.
  - **Mappa Wayfinder in bozza**: `map.md`, `issues/01-10` (decise dall'agente, regola 4), `grafo-lavori.md` (fette M01-M10). Si conferma dopo le correzioni.

## Stato delle correzioni (aggiornato a ogni task)

- C01 fatto (d3128a6 + 908c316 per i fine riga), C02 fatto (7baa3f8 + 50c60d4), C03 fatto (bdf04fa), C04 fatto (913e7cd), C05 fatto (cb7e9c7), C06 fatto (e1fbbd1), C07 fatto (6a56c73), C08 fatto (ee53296), C09 fatto. Prossimo: **C10**.
- Fine riga: alcuni file sono CRLF nell'indice (`EditScreen.tsx`, `InventoryContext.tsx`…), gli altri LF. Mettere in stage con `bash "piani di implementazione/funzionalita/prova/stage.sh" <file>…` (conserva lo stile del repository) e controllare con `git diff --cached --numstat` che il numero di righe cambiate sia piccolo. Per modificare i file usare lo strumento Edit (conserva i fine riga), non script Python che riscrivono il file.
- Chiusura di un task: `bash "piani di implementazione/funzionalita/prova/controllo.sh" <cartella scratch>` (tsc, eslint, jest, bundle, 30 schermate).

## Cosa fare adesso, in ordine

1. Correzioni **C01 → C14** della tabella in fondo a `prova-funzioni.md`, una per task (difetti con la stessa causa nello stesso task). Prima di correggere un difetto rileggi la riga in `prova/esito-aN.md` (file:riga) e rilancia lo scenario che lo mostra: dopo la correzione lo stesso scenario deve dare l'esito giusto.
2. Rileggere la mappa alla luce delle correzioni, togliere «bozza» da `map.md` e `CRONOLOGIA` se nulla cambia.
3. Fette **M01 → M10** di `grafo-lavori.md`, dalla più piccola, rispettando le dipendenze. Regole del revisore già scritte nei ticket 01, 03, 06 e nella regola 7 del grafo: nessun commit in cui un prodotto può avere `stock` mentre una scrittura o lettura della posizione lo ignora; calcoli dentro `setProducts(prev => …)`; la Conta scrive tutte le rettifiche in una chiamata; decimali a 3 cifre e «2,5»; categorie e contatti in contesti propri, fuori dalle chiavi di `InventoryContext`. Prima di cambiare la forma di `Product` (M02) chiedere un parere al revisore (advisor).

## Come si verifica un task (tutto verde prima del commit)

- `npx tsc --noEmit` → 0; `npx eslint .` → 0; `npx jest@29.7.0 --config jest.config.js` → tutti verdi (dopo F00: 9 suite, 82 test).
- Bundle Android: `npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output <scratch>/index.android.bundle --assets-dest <scratch>/assets` (dopo F00: 5,08 MB, 62 asset).
- Console web senza errori su 30 schermate: `APP=http://localhost:8082 EXTRA=1 node "piani di implementazione/ui-ux/campionario/schermate.cjs" C:/Users/reda_/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright "" <cartella scratch>` (la cartella scratch evita di sporcare `schermate-attuali/`). Per i 5 stili: secondo argomento `attuale|babilonia|ishtar|ardesia|minimal`.
- Prova della funzione: script in `prova/` con `lib.cjs` (browser pulito, campionario, finestre del browser gestite con `dialogs`, lettura dello stato salvato). Esempi: `t-alert.cjs`, `a1-*.cjs`. Lanciare con `SHOTS="$TEMP/prova-funzioni" node <file>.cjs` dalla cartella `prova/`.
- Dopo il commit: voce in `../CRONOLOGIA.md` (in cima), `graphify update .`, push.

## Cose da sapere

- **Server**: l'app web su `:8082` e il campionario su `:8765` girano già, avviati da un'altra chat (processi `inventory-stili/node_modules/expo/bin/cli … --port 8082` e `serve-seed.mjs`). Il pannello Browser ha già 5 server di altre chat: `preview_start` per nome rifiuta; si apre `http://localhost:8082` con `preview_start {url}` oppure si usa Playwright. Non riavviare né uccidere Metro; evitare modifiche che richiedono un riavvio (dipendenze native, babel, metro).
- **Mai modificare codice dell'app mentre gira una prova** su `:8082`: il ricaricamento cambia il codice sotto la prova.
- Messaggio noto da ignorare nella console: «Deleting database failed because it's blocked» (LokiJS al primo avvio; eccezione in `DECISIONI`, da correggere più avanti in `src/db/adapter.web.ts`).
- Il profilo del pannello Browser ha il campionario caricato (ha sostituito la lista di campi che c'era): non usarlo per le prove, usare contesti Playwright puliti.
- Shell: in Bash `cd … && A & B` esegue `cd` solo nel ramo in background; i blocchi Python lunghi con apici vanno scritti in un file nello scratchpad e lanciati, non passati con heredoc.
- Login Google spento (`LOGIN_ENABLED = false`); non toccare `syncro_flow_flutter/` né `app/`; niente chiavi API, generazioni a pagamento o cloud; nessun comando git distruttivo; niente merge né pull request.
- Resoconti all'utente brevi e in italiano; dettagli nei file.

## Domande aperte per l'utente (domattina)

- Le 10 decisioni della mappa (`DECISIONI_DA_RIVEDERE.md`, righe del 22/11 su `funzioni/magazzino`).
- P30: «Alert Prodotti Dormienti», «Suggerimenti AI» e Condivisione dicono «Prossimamente»: tenerli, nasconderli o completarli?
- Chat (P28) e Team: fanno parte del gestionale o restano esperimenti?
