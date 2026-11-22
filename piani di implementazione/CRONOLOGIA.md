# Cronologia aggiornabile

Registro progressivo. Aggiungere nuove voci in cima senza cancellare quelle vecchie. Specificare data, branch/SHA, file e servizi, prove con esito e ciò che resta aperto. Non segnare una funzione come verificata finché la prova non è stata svolta.

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

