# Cronologia aggiornabile

Registro progressivo. Aggiungere nuove voci in cima senza cancellare quelle vecchie. Specificare data, branch/SHA, file e servizi, prove con esito e ciò che resta aperto. Non segnare una funzione come verificata finché la prova non è stata svolta.

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

