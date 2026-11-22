# L0 — Login Google: perché è spento e che cosa serve per riaccenderlo

Ricerca in sola lettura del 22 novembre 2026 (ticket 20). Worktree `D:\FurInventory Pro\inventory-stili`, branch `funzioni/magazzino` (HEAD `518fa6c` a fine ricerca). Nessun file del repository modificato, nessun comando git che cambia stato, nessuna scrittura su Supabase o Google.

> **Aggiornamento dell'orchestratore, 22 novembre sera, dopo la ricerca.** Il progetto Supabase è stato riattivato con il sì dell'utente (`ACTIVE_HEALTHY`: 13 tabelle con RLS e zero righe, 19 migrazioni). `GET /auth/v1/settings` dice che il **provider Google è spento** (acceso solo `email`): è la causa più probabile del «non funziona». Il dubbio in fondo, sui link delle foto, è chiuso: vale la decisione più recente dell'utente, link pubblici e permanenti (ticket 11).

Sigle usate:

- **[V]** verificato oggi: letto nel file indicato o ottenuto da un comando eseguito oggi.
- **[Doc]** scritto nei documenti del progetto in passato, oggi non riverificabile.
- **[D]** dedotto: ragionamento sul codice o conoscenza generale, non provato.

I numeri di riga di `CRONOLOGIA.md` cambiano (il file cresce in cima): cercare per titolo della voce. Durante la ricerca il branch è passato da `fd051a9` a `518fa6c`: sono cambiati solo documenti (`git diff --stat` sui percorsi del codice è vuoto), quindi i numeri di riga del codice valgono.

## In breve

1. **Motivo dello spegnimento**: nessun errore è stato scritto da nessuna parte. L'utente il 21 novembre ha detto solo «non funziona». Non esiste una prova che il login abbia mai funzionato, su nessuna piattaforma.
2. **Blocco di oggi**: il progetto Supabase `ymsnlixracwjgajldryb` è **in pausa** (`INACTIVE`, piano free) e il suo indirizzo non esiste più in rete. Finché l'utente non lo riattiva, il login non può funzionare.
3. **Configurazione Google**: stato ignoto. Nel repository non c'è traccia di un client OAuth creato, ma con il flusso attuale il client ID sta solo in Supabase, quindi i file non lo mostrerebbero comunque. Lo stato del provider Google in Supabase non è leggibile da qui.
4. **Codice**: il flusso c'è ed è coerente. È un accesso via browser attraverso Supabase, uguale su web e Android. Con questo flusso **non serve** un client OAuth Android con SHA-1: basta un client «Web application».
5. **Dati**: riaccendendo l'interruttore così com'è, i dati `…:local` restano sul dispositivo ma spariscono dalla vista, e la schermata di accesso diventa obbligatoria.

---

## 1. Perché è stato spento

### Che cosa dicono le fonti

- **[V]** Commit `cfcdecb` (21 novembre 2026, 22:58, `main`), titolo «fix(web): avvio web funzionante e login Google disattivato». Sul login il messaggio dice solo: «`LOGIN_ENABLED = false` in AuthContext. L'app usa lo spazio locale "local", l'inventario salta snapshot, realtime, Storage e Drive senza sessione; in Impostazioni team/inviti e logout sono nascosti». Nessun errore citato.
- **[V]** `piani di implementazione/CRONOLOGIA.md`, voce «21 novembre 2026 — Allineamento locale, verifica RN e avvio web» (oggi righe 440-454):
  - «Login Google disattivato su richiesta dell'utente (non funzionante)».
  - Nella stessa voce: «login Google, dati Supabase, NFC, mesh LAN e build APK non provati».
  - «Il redirect OAuth web (`http://localhost:8081`) deve essere tra gli URL consentiti in Supabase: non verificato».
  - «web su http://localhost:8081 mostra la schermata di accesso senza errori in console».
- **[V]** Memoria delle sessioni (claude-mem), richiesta dell'utente del 21 novembre alle 22:42: «Per il momento disattiva la pagina di accesso con Google, anche perché non funziona.» Nessun messaggio d'errore registrato. Quel giorno girava solo il web su `localhost:8081`; Android non era stato provato su un dispositivo.
- **[V]** Commento nel codice, `contexts/AuthContext.tsx:11-16`: «Rimettere a true quando OAuth Google e Supabase saranno configurati e provati».
- **[V]** `git log --all -- contexts/AuthContext.tsx backend-auth`: il login di oggi nasce in un solo commit, `c38140c` (20 ottobre 2026, «feat: add Supabase Google auth and workspace context»). `contexts/AuthContext.tsx` non viene più toccato fino a `cfcdecb`. In mezzo, in `backend-auth/`, c'è solo `7386308` (20 ottobre, regole RLS in SQL): non riguarda il flusso di accesso.
- **[V]** `piani di implementazione/PIANO_IMPLEMENTAZIONE.md:38`: «Consent screen, OAuth client, account autorizzato e link Drive reale non sono verificati». Riga 123: «OAuth/configurazione e link reale non provati».
- **[V]** `backend-auth/.env.local.example:11-13`: progetto, client ID e secret di Google sono segnaposto. Quel file appartiene al flusso vecchio (variabili d'ambiente): non prova nulla sul client del flusso attuale, che starebbe solo in Supabase.
- **[V]** `backend-auth/docs/google-cloud-setup.md:14-22`: la creazione del client OAuth è descritta come passo manuale ancora da fare da una persona.
- **[V]** `docs/audit/BRANCH_COMPARISON_2026-10-20.md:15` e `:30`: «nessun login reale verificato».

### Conclusione

- **[V]** L'errore preciso e la piattaforma **non sono documentati**.
- **[D]** Il login è stato scritto il 20 ottobre. Della configurazione manuale (Google Console, provider in Supabase, URL di ritorno) non c'è nessuna traccia scritta: non si sa se sia stata fatta, e i documenti la danno per non verificata. L'unica piattaforma su cui può essere stato provato il 21 novembre è il web su `:8081`.
- **[D]** Cause possibili, dalla più probabile. Nessuna è dimostrabile da qui.
  1. Progetto Supabase già in pausa. Il 20 ottobre era attivo con zero righe; il piano free mette in pausa dopo circa 7 giorni di poca attività. In pausa, il pulsante porta a `https://ymsnlixracwjgajldryb.supabase.co/auth/v1/authorize`, che non risponde.
  2. Provider Google non abilitato in Supabase, o client OAuth mai creato: Supabase risponde «provider is not enabled».
  3. URL di ritorno non ammesso in Supabase: dopo Google si torna al «Site URL» predefinito invece che a `localhost:8081`.
  4. Schermata di consenso Google in modalità prova senza l'account dell'utente tra i tester: «access_denied».

### Branch `feature/auth-and-sync`

- **[V]** Base comune con `main`: `741f2b1`. Ha 10 commit che `main` non ha:
  `3411a65` (16 settembre, auth vecchia), `b46c3da`, `183ee10`, `73f6d3b`, `859f387`, `8f40e45`, `45a4767`, `b1b36d6` (solo documenti), `60e8068` (correzioni TypeScript e Flutter), `35a5ada` (pagina bianca sul web).
- **[V]** Il suo `contexts/AuthContext.tsx` è la versione **vecchia**: usa `backend-auth/google/auth.ts` (expo-auth-session, flusso implicito), poi `supabase.auth.signInWithIdToken`, e salva in `localStorage`, che su Android non esiste. È lo schema a operatori di settembre, non quello a spazi di lavoro.
- **[V]** `60e8068` tocca `backend-auth/google/auth.ts`, `drive.ts`, `google-api.d.ts`, `services/*`, `supabase/types.ts`: sono solo correzioni di tipi. `cfcdecb` le ha già portate su `main` (lo dice il messaggio e la lista dei file coincide). `35a5ada` (web) è stato portato anche lui.
- **[V]** Conclusione: **sul branch non c'è nessuna correzione al login che manchi su main**. La versione di `main` (`c38140c`) è più recente e la sostituisce. Non c'è nulla da recuperare per il login.
- **[V]** Restano solo lì, e non servono al login: `.npmrc`, `babel-preset-expo` in `babel.config.js`, le schermate `app/(auth)` (cartella morta), `hooks/useAuth.ts`.

---

## 2. Come funziona il flusso di accesso nel codice

### Libreria e tipo di flusso

- **[V]** `@supabase/supabase-js` 2.112.3, metodo `supabase.auth.signInWithOAuth` con provider `google`.
- **[V]** Flusso PKCE: `backend-auth/supabase/client.ts:24` (`flowType: 'pkce'`), `:23` (`detectSessionInUrl: false`, il codice di ritorno si legge a mano), `:20-22` (sessione salvata in AsyncStorage e rinnovata da sola).
- **[V]** Su Android si aggiungono `expo-web-browser` 15.0.11 e `expo-linking` 8.0.12.
- **[V]** Non c'è Google Sign-In nativo: `@react-native-google-signin/google-signin` non è installato. Non c'è `signInWithIdToken`. `expo-auth-session` è installato ma il codice vivo non lo usa.

### Passi (tutti in `contexts/AuthContext.tsx`)

1. `signInWithGoogle` (righe 134-155) chiama `signInWithOAuth` con `redirectTo`, `skipBrowserRedirect: true`, gli scope (riga 143) e `access_type: 'offline'`, `prompt: 'consent'` (riga 144).
2. `redirectTo` viene da `callbackUrl()` (righe 36-40):
   - web: `window.location.origin`, cioè oggi `http://localhost:8082`;
   - Android e iOS: `syncroflow://auth/callback`.
3. **Web** (righe 149-152): tutta la pagina va su Supabase, poi su Google, poi sul callback di Supabase, poi torna a `http://localhost:8082/?code=…`. All'avvio `initialize` (righe 94-112) chiama `consumeCallback` (righe 42-55), che scambia il codice con la sessione (`exchangeCodeForSession`) e ripulisce l'indirizzo.
4. **Android** (righe 153-154): `WebBrowser.openAuthSessionAsync` apre una scheda del browser. Il ritorno arriva come link `syncroflow://auth/callback?code=…`, raccolto dal risultato della chiamata oppure da `Linking.addEventListener('url')` (righe 123-125). `handledAuthCodes` (righe 34, 45-46) evita di usare due volte lo stesso codice.
5. Con la sessione parte `resolveOrganization` (righe 64-88): funzione del database `ensure_personal_organization`, lettura di `organization_members` e `organizations`, spazio attivo ricordato in AsyncStorage con la chiave `auth:active-organization:{userId}`.
6. `App.tsx:107-114` decide che cosa mostrare: caricamento, schermata di accesso (`src/screens/AuthScreen.tsx`), errore dello spazio, oppure l'app.

### Web e Android a confronto

| | Web (`localhost:8082`) | Android (`com.redako35.syncroflow`) |
| --- | --- | --- |
| Apertura | la pagina stessa naviga | scheda del browser (`expo-web-browser`) |
| Ritorno | `http://localhost:8082/?code=…` | `syncroflow://auth/callback?code=…` |
| Chi legge il codice | `initialize` all'avvio | risultato di `openAuthSessionAsync` o evento `url` |
| Client Google coinvolto | il client Web messo in Supabase | lo stesso client Web |
| Da ammettere in Supabase | `http://localhost:8082` e `http://localhost:8082/**` | `syncroflow://auth/callback` |

### Dove sta la configurazione

- **[V]** URL di Supabase e chiave publishable: `app.json:64-65` (`expo.extra.supabaseUrl`, `expo.extra.supabasePublishableKey`). Li legge `backend-auth/supabase/client.ts:10-12`, con ripiego sulle variabili `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **[V]** Client ID e secret di Google: **non sono nel repository e non devono esserci**. Stanno nella dashboard di Supabase, provider Google (`backend-auth/docs/google-cloud-setup.md:26`). Nell'app viva non c'è nessun client ID Google.
- **[V]** `scheme`: `app.json:8` (`syncroflow`).
- **[V]** Manifest Android, `android/app/src/main/AndroidManifest.xml:22-27`: intent filter `VIEW` + `DEFAULT` + `BROWSABLE` con `android:scheme="syncroflow"`. Riga 17: `launchMode="singleTask"`. iOS ha lo stesso schema in `Info.plist`.
- **[V]** Android: `applicationId` e `namespace` `com.redako35.syncroflow` (`android/app/build.gradle:24`, `:26`). Firma di debug con `debug.keystore` (righe 33-40). **Anche la build release è firmata con la chiave di debug** (riga 46).
- **[V]** `google-services.json`: non esiste (cercato in `android/` e nei file tracciati). Con questo flusso non serve.
- **[V]** File `.env`: nessuno reale, in nessuno dei due checkout. Esistono solo `backend-auth/.env.example` e `backend-auth/.env.local.example`. Il secondo contiene l'URL del progetto e una vecchia chiave anon in formato JWT (pubblica per natura, qui non riportata); la service role e i valori Google sono segnaposto.
- **[V]** Moduli Expo su Android: `android/settings.gradle:22` e `:32` (`expo-autolinking-settings`, `useExpoModules()`). `MainApplication.kt` usa l'host standard di React Native, senza l'involucro Expo. Un vecchio log sul branch feature (`build_apk_new.log`, commit `60e8068`) elenca `expo-web-browser (15.0.11)` tra i moduli e finisce con «BUILD SUCCESSFUL». In questo spazio di lavoro non c'è nessuna build Android (`android/app/build` assente nei due checkout).

### Codice morto in `backend-auth/`

- **[V]** Il codice vivo importa solo `backend-auth/supabase/client` e `backend-auth/google/driveApi` (`contexts/AuthContext.tsx:7`, `contexts/InventoryContext.tsx:7-8`, `src/screens/tabs/SettingsScreen.tsx:16-17`).
- **[V]** Non importati da nessuna schermata, solo tra loro: `google/auth.ts` (expo-auth-session, schema sbagliato `com.synchroflow` alla riga 8, `process.env.GOOGLE_CLIENT_ID` alla riga 6), `google/drive.ts` e `google/sheets.ts` (libreria `googleapis` per Node con il client secret: non possono girare in un'app), `services/*`, `supabase/realtime.ts`.
- **[V]** `backend-auth/SETUP_COMPLETE.md:53` indica ancora `com.synchroflow://oauth/callback`: è superato.

### Punti deboli visti nel codice (per L1)

- **[D]** `consumeCallback` guarda solo `code` (righe 44-45). Se Supabase torna con `?error=…&error_description=…`, l'utente rivede la schermata di accesso senza nessun messaggio.
- **[V]** I documenti parlano della porta 8081 (`google-cloud-setup.md:10`, `:20`); l'app oggi gira su 8082 (`D:\FurInventory Pro\.claude\launch.json`, configurazione `syncro-flow-stili-web`).
- **[D]** Su Android, dopo l'accesso, `NavigationContainer` usa il prefisso `syncroflow://` (`src/navigation/linking.ts:2`) e ha la rotta `NotFound: '*'` (riga 36): il link `syncroflow://auth/callback` potrebbe essere letto come pagina inesistente. Da provare.
- **[V]** L'app non salva `provider_token` né `provider_refresh_token` (vedi punto 5).

---

## 3. Che cosa spegne `LOGIN_ENABLED = false`

### Chi lo legge (**[V]**, tre file in tutto)

| File e riga | Effetto con `false` |
| --- | --- |
| `contexts/AuthContext.tsx:17` | definizione |
| `contexts/AuthContext.tsx:59-61` | stato iniziale: spazio `local`, elenco con «Spazio locale» (ruolo owner), nessun caricamento |
| `contexts/AuthContext.tsx:92` | salta tutto l'avvio: niente `getSession`, niente ascolto di Supabase, niente ascolto dei link di ritorno |
| `contexts/AuthContext.tsx:135` | `signInWithGoogle` lancia «momentaneamente disattivato» |
| `contexts/AuthContext.tsx:158` | `signOut` non fa nulla |
| `contexts/AuthContext.tsx:167-170` | `switchOrganization` accetta solo `local` |
| `App.tsx:110` | la schermata di accesso non compare mai |
| `src/screens/tabs/SettingsScreen.tsx:569` | inviti del team (crea e accetta) sostituiti da un avviso |
| `src/screens/tabs/SettingsScreen.tsx:708` | riga «Esci da questo profilo» nascosta |

### Che cosa salta di conseguenza

Senza sessione `cloudEnabled` è falso (`contexts/InventoryContext.tsx:113`). **[V]**

- Lettura della copia nel cloud (`organization_inventory_snapshots`): righe 306-308.
- Scrittura nel cloud (`merge_inventory_snapshot`): riga 153, poi 155-174.
- Aggiornamenti in tempo reale: riga 180.
- Foto e allegati su Supabase Storage (`organization-media`) e copia su Drive: riga 204.
- «Backup Google Drive» in Impostazioni: il pulsante resta (`SettingsScreen.tsx:691-699`) ma risponde «Google Drive non collegato» (`:123-128`).
- Il team via rete locale (`src/screens/settings/TeamScreen.tsx`) non dipende dal login.

### Chiavi per spazio in AsyncStorage (**[V]**)

| Contesto | Chiave |
| --- | --- |
| Inventario | `inventory:v1:{spazio}:products`, `:timeline`, `:alerts`, `:libraries`, `:deleted_product_ids` (`InventoryContext.tsx:148-152`, `:288-290`); segno `inventory:migrated:{spazio}` (`:293`) |
| Posizioni | `furinventory_locations:{spazio}` |
| Categorie | `furinventory_categories:{spazio}` |
| Campi personalizzati | `furinventory_custom_fields:{spazio}` |
| Layout | `furinventory_layout_config:{spazio}` |
| Automazioni | `@furinventory_custom_automations:{spazio}` |
| GS1 | `furinventory_gs1_config:{spazio}` |
| Hardware | `furinventory_hardware_config:{spazio}` |

Non sono per spazio: stile (`@syncro/stile`), chat, modelli di settore.

### Che cosa succede riaccendendolo senza altre modifiche (**[D]** dal codice, non provato)

1. **Accesso obbligatorio.** All'avvio lo spazio è vuoto e compare la schermata di accesso (`App.tsx:110`). Non c'è modo di usare l'app senza account. Se il login non va, l'app è inutilizzabile: è la situazione del 21 novembre.
2. **I dati `local` spariscono dalla vista.** Dopo l'accesso lo spazio è l'identificativo dell'organizzazione personale. Tutti e otto i contesti leggono `…:{quello}` e trovano vuoto. Le chiavi `…:local` restano sul dispositivo, ma nessuno le legge più. Non vengono cancellate.
3. **La migrazione esistente non li porta.** `InventoryContext.tsx:292-304` sposta solo le vecchie chiavi senza prefisso (`products`, `timeline`, `alerts`, `libraries`) e solo se lo spazio è vuoto. In modalità locale quelle chiavi sono già finite in `local`.
4. **La copia nel cloud vince su quella locale.** Se per lo spazio esiste una riga nel cloud, sostituisce per intero lo stato e riscrive la copia sul dispositivo (`:311-319`). Lo stesso fa il tempo reale (`:186-196`). Dopo ogni salvataggio, la risposta del server sostituisce lo stato dove è diversa (`:163-172`). La fusione vera la fa la funzione del database `merge_inventory_snapshot`, il cui codice non è nel repository: comportamento ignoto.
5. **Trappola per L2.** Al primo accesso la riga nel cloud non c'è; dopo 900 ms l'app salva nel cloud lo stato vuoto (`:155-174`). Se L2 copia i dati locali nelle chiavi dell'account dopo quel momento, al caricamento successivo la riga vuota del cloud li sovrascrive (`:311-319`). La copia va fatta **prima** del primo caricamento dello spazio dell'account.
6. **Nel cloud va solo l'inventario.** Prodotti, cronologia, avvisi, cartelle e prodotti eliminati. Posizioni, categorie, campi personalizzati, layout, automazioni, GS1 e hardware sono per spazio ma non vengono mai sincronizzati (**[V]**: in quei contesti non c'è nessun riferimento a Supabase). Un secondo dispositivo riceverebbe prodotti con posizioni e categorie che non ha.
7. **Le prove si rompono.** `piani di implementazione/funzionalita/prova/lib.cjs:35-38` e `:77-78` caricano e leggono `…:local` (**[V]**). Per questo il ticket 20 chiede un branch a parte.
8. **Le foto partono da sole.** Con una sessione, l'effetto alle righe 202-279 carica su `organization-media/{spazio}/{prodotto}/…` ogni foto o allegato che non è già un indirizzo `http`, e sostituisce l'indirizzo con un link firmato valido 7 giorni. Il percorso resta in `storageImagePaths` e il link viene rifatto a ogni caricamento (righe 30-55). Quindi il caricamento su Supabase Storage **è già scritto**; non è mai stato provato.

---

## 4. Supabase (progetto `ymsnlixracwjgajldryb`)

Gli strumenti MCP `supabase` hanno risposto (autenticati).

### Stato di oggi

- **[V]** `get_project`: nome `syncro-flow`, regione `eu-west-1`, Postgres 17.6.1.166, creato il 13 settembre 2026, **stato `INACTIVE` (in pausa)**.
- **[V]** Organizzazione «reda10nafil's Org»: piano **free**. Tutti e tre i progetti dell'organizzazione sono `INACTIVE`.
- **[V]** L'indirizzo `ymsnlixracwjgajldryb.supabase.co` non esiste in rete («Non-existent domain»). Controllo: `supabase.com` e `www.google.com` rispondono.
- **[V]** `list_tables`: «Database is possibly not accessible». `list_migrations`: tempo scaduto. `execute_sql`: non tentato, il database è spento.
- **[V]** `list_edge_functions`: nessuna funzione.
- Non ho chiamato `restore_project`: cambia lo stato e spetta all'utente.

### Stato documentato il 20 ottobre 2026, oggi non riverificabile

**[Doc]** `PIANO_IMPLEMENTAZIONE.md:33-36` e `CRONOLOGIA.md`, voce «20 ottobre 2026 — Analisi e decisioni SaaS/backup»:

- progetto attivo e sano;
- migrazioni fino a `20261020084229_fix_inventory_snapshot_rls_helpers`;
- 12 tabelle pubbliche, tutte con RLS attiva, zero righe;
- bucket `organization-media` presente e **privato**; nessun file caricato o letto;
- nessuna funzione edge, nessun branch di sviluppo;
- la correttezza delle regole RLS tra due aziende non è mai stata provata.

### Lo schema vero non è nel repository

- **[V]** `backend-auth/supabase/schema.sql` è lo schema vecchio: quattro tabelle (`users`, `operators`, `products`, `sync_logs`). `backend-auth/supabase/types.ts` descrive le stesse quattro. Per questo il codice usa `(supabase as any)`.
- **[V]** L'unico file che nomina lo schema nuovo è `backend-auth/supabase/20261020_fix_inventory_snapshot_rls_helpers.sql` (tre regole RLS su `organization_inventory_snapshots`, con `auth_internal.is_organization_member` e `auth_internal.has_organization_role`).
- **[V]** Cose che l'app chiama e che esistono solo nel database:
  - tabelle `organizations`, `organization_members`, `organization_inventory_snapshots`;
  - funzioni `ensure_personal_organization`, `merge_inventory_snapshot`, `create_organization_invitation`, `accept_organization_invitation`;
  - bucket `organization-media` e le sue regole.
- **[D]** Se il progetto andasse perso, il backend andrebbe riscritto leggendo il codice dell'app.

### La pausa

- **[V]** Documentazione Supabase («Project Pausing»): il piano free mette in pausa i progetti con poca attività in 7 giorni; un progetto in pausa si riattiva dalla dashboard («Resume project») **entro 90 giorni dalla pausa**. Dopo si può solo scaricare il backup.
- **[D]** La data della pausa è ignota. Non può essere prima del 27 ottobre 2026, quindi i 90 giorni non scadono prima del 25 gennaio 2027 circa. La dashboard mostra i giorni rimasti.
- **[D]** Sul piano free il progetto torna in pausa dopo una settimana senza uso.

### Che cosa deve controllare l'utente nella dashboard (non leggibile da MCP)

1. Authentication › Providers (o «Sign In / Providers») › Google: è abilitato? Ci sono client ID e secret?
2. Authentication › URL Configuration:
   - «Redirect URLs» deve contenere `http://localhost:8082`, `http://localhost:8082/**` e `syncroflow://auth/callback` (e le due forme con `8081` se si usa anche il checkout `main`). Il codice manda l'indirizzo senza barra finale (`window.location.origin`): mettere tutte e due le forme toglie il dubbio;
   - «Site URL»: per ora `http://localhost:8082`.

**[D]** A progetto riattivato, da qui si può leggere senza segreti se Google è abilitato: `GET /auth/v1/settings` con la chiave publishable. Si possono anche rifare in sola lettura `list_tables`, `list_migrations`, `storage.buckets`, `pg_policies`, i conteggi e `get_advisors`.

---

## 5. Google

### Scope

- **[V]** `openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets` (`contexts/AuthContext.tsx:143`; stessa lista in `backend-auth/docs/google-cloud-setup.md:19`).
- **[V]** `backend-auth/google/auth.ts:28-33` dichiara gli stessi quattro scope (`profile`, `email`, `drive.file`, `spreadsheets`), ma è codice morto. `google/drive.ts` e `google/sheets.ts` non ne dichiarano.
- **[V]** `backend-auth/google/driveApi.ts` non dichiara scope: riceve un token. Fa quattro cose:
  - cerca per nome o crea la cartella «Syncro Flow {spazio}» (righe 16-28);
  - carica un file nella cartella (righe 30-44) o un file locale (righe 46-51);
  - crea un foglio Google e ci scrive le righe (righe 53-68).
- **[D]** Tutto questo lavora solo su file creati dall'app, quindi basta `drive.file`. Anche l'API dei fogli accetta `drive.file` per i fogli creati dall'app: lo scope `spreadsheets` (classificato «sensibile» da Google) si potrebbe togliere. Da verificare sulla documentazione Google prima di farlo.
- **[V]** I file finiscono nel Drive dell'account che ha fatto l'accesso e restano privati (`google-cloud-setup.md:24`).

### Durata del permesso Drive

- **[V]** L'app usa solo `session.provider_token` (`InventoryContext.tsx:203`, `SettingsScreen.tsx:124`).
- **[V]** Documentazione Supabase («Provider tokens»): Supabase non conserva e non rinnova il token del provider; l'app deve salvarlo da sé al momento dell'accesso.
- **[D]** Il token di Google dura circa un'ora. Dopo il rinnovo della sessione Supabase o un riavvio dell'app è probabile che manchi: Drive funzionerebbe solo subito dopo l'accesso. Per rinnovarlo serve il client secret, che non può stare nell'app: funzione edge oppure nuovo accesso. È un problema della fetta I3, non di L1. Supabase Storage non ha questo limite.

### Che cosa serve nella Google Cloud Console

Progetto `syncro-flow-app-20261020`. **[Doc]** Il 20 ottobre risultava attivo con le API Drive e Sheets abilitate (`PIANO_IMPLEMENTAZIONE.md:37`). Oggi non riverificato: `gcloud` non è installato e il connettore `google_cloud_cli` non è autorizzato.

1. **Schermata di consenso** (Google Auth Platform): nome dell'app, email di supporto, pubblico «Esterno» in modalità prova, **account dell'utente tra i tester**, scope `drive.file` (e `spreadsheets` se resta).
2. **Client OAuth di tipo «Web application»** (controllare prima se esiste già):
   - «Authorized redirect URIs»: `https://ymsnlixracwjgajldryb.supabase.co/auth/v1/callback`. È l'unica voce indispensabile.
   - «Authorized JavaScript origins»: `http://localhost:8082`. La guida di Supabase la chiede; con il flusso usato dal codice Google non la controlla (**[D]**), ma non fa danni.
3. Client ID e secret vanno copiati **solo** in Supabase (provider Google). Mai nel repository.

### Client Android e SHA-1

- **[V]** Con il codice di oggi **il client Android non serve**. Su Android l'accesso passa dal browser e da Supabase (`AuthContext.tsx:153`): Google vede solo il client Web e il callback di Supabase.
- **[D]** Servirebbe solo se L1 passasse all'accesso nativo (`@react-native-google-signin/google-signin` più `signInWithIdToken`), oggi non installato. In quel caso: package `com.redako35.syncroflow`, la SHA-1 qui sotto, e il client ID Web anche tra i «Client IDs» di Supabase. Il token per Drive verrebbe dalla libreria nativa, non da Supabase.
- **[V]** Impronte di `android/app/debug.keystore` (keytool, alias `androiddebugkey`, sola lettura):
  - SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
  - SHA-256: `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`
  - Il file è identico nei due checkout.
- **[D]** È la chiave di debug pubblica del modello React Native, uguale in tutti i progetti: va bene per lo sviluppo, non per una pubblicazione.
- **[V]** La chiave di debug nella cartella `.android` dell'utente di Windows è un altro file e la build non lo usa.

---

## 6. Conclusione operativa

### Ordine consigliato

**(b) Solo l'utente — prima di tutto, il resto ne dipende**

1. Dashboard Supabase: riattivare il progetto `syncro-flow` («Resume project») e guardare quanti giorni restano.
2. Google Cloud Console, progetto `syncro-flow-app-20261020`: schermata di consenso con il proprio account tra i tester; controllare se un client «Web application» esiste già, altrimenti crearlo, con il redirect URI del punto 5.
3. Supabase › Authentication › Providers › Google: abilitare, incollare client ID e secret.
4. Supabase › Authentication › URL Configuration: aggiungere `http://localhost:8082`, `http://localhost:8082/**` e `syncroflow://auth/callback`.
5. Fare lui l'accesso reale, prima sul web poi sul telefono. L'agente non inserisce credenziali.
6. Decidere:
   - come passano i dati locali all'account (L2);
   - se questo progetto Supabase è quello definitivo o di prova (domanda aperta in `PIANO_IMPLEMENTAZIONE.md:179`);
   - se restare sul piano free, che rimette in pausa dopo una settimana senza uso.

**(a) Nel codice — fetta L1, su un branch proprio**

1. A progetto riattivato: ricontrollo in sola lettura (tabelle, migrazioni, bucket, regole, avvisi di sicurezza, provider Google abilitato).
2. Portare nel repository lo schema vero (migrazioni esportate) e rigenerare `types.ts`. Oggi esiste solo nel database.
3. Rendere l'accesso **facoltativo**: lo spazio `local` resta usabile senza account e l'accesso si fa da Impostazioni. Così un login rotto non blocca più l'app. È una proposta, da confermare.
4. Mostrare gli errori di ritorno (`error_description`) e gestire l'accesso annullato.
5. Android: tenere `syncroflow://auth/callback` fuori dalla navigazione; costruire l'APK di debug; provare.
6. Aggiornare `backend-auth/docs/google-cloud-setup.md` (porta 8082) e segnare come morto il codice vecchio di `backend-auth/`.

Poi L2 (copia di `…:local` nelle chiavi dell'account per tutti gli otto contesti, con copia di sicurezza, **prima** del primo caricamento dal cloud) e I2/I3 (foto; per Drive va risolta la durata del token).

**(c) Ignoto finché non si prova davvero**

- Se il progetto si riattiva senza problemi e se lo schema è quello documentato il 20 ottobre.
- Se il provider Google è mai stato configurato in Supabase.
- Quale fosse l'errore del 21 novembre.
- Web: il giro completo su `:8082` (codice di verifica PKCE salvato nel browser, ritorno, pulizia dell'indirizzo).
- Android: ritorno dal browser all'app con `syncroflow://`, moduli Expo in esecuzione senza l'involucro Expo, navigazione dopo l'accesso. Qui non esiste una build Android.
- Le funzioni `ensure_personal_organization` e `merge_inventory_snapshot` con un utente vero: il 20 ottobre le tabelle avevano zero righe.
- Regole RLS e regole del bucket con un utente vero; caricamento delle foto dal web e da Android.
- Quanto dura davvero il permesso Drive dopo l'accesso.

### Rischi

1. **Dati `local` fuori dalla vista** al primo accesso (restano sul dispositivo, non si vedono).
2. **Il cloud sovrascrive il locale** (`InventoryContext.tsx:311-319`), compresa la trappola della riga vuota creata al primo accesso.
3. **Schermata di accesso obbligatoria**: con il login rotto o il progetto in pausa l'app non si apre.
4. **Scadenza dei 90 giorni** per riattivare il progetto, con lo schema che non è nel repository.
5. **Solo l'inventario va nel cloud**: posizioni, categorie, campi, layout, automazioni, GS1 e hardware no.
6. **Prove su `:8082`**: si rompono se l'interruttore cambia sul branch condiviso.
7. **Build release firmata con la chiave di debug pubblica** (`android/app/build.gradle:46`).
8. **Un solo ambiente Supabase**: le prove di accesso scrivono dati veri in quel progetto.

---

## Note per l'orchestratore

- Il ticket `piani di implementazione/funzionalita/issues/20-login-google.md` chiede di riportare lì l'esito di L0. Non l'ho modificato (sola lettura): va copiato da qui.
- Il ticket e la mappa (`map-2.md`, riga L0) danno per necessario il client Android con la SHA-1: con il codice attuale non lo è (punto 5).
- `map-2.md` (fetta I2) parla di «bucket pubblico di catalogo»; il bucket esistente è privato con link firmati di 7 giorni. La memoria delle sessioni del 22 novembre (ore 18 circa) registra invece una decisione dell'utente diversa: nessun bucket pubblico, link firmati di circa 30 giorni. Le due versioni vanno riconciliate prima di I2; è fuori da L0.
- Il checkout `D:\FurInventory Pro\inventory` (`main`) ha modifiche non committate (`CRONOLOGIA.md`, due file in `syncro_flow_flutter/`, file non tracciati). Non sono di questa ricerca: lì ho fatto solo letture.
- Comandi eseguiti: solo letture (`git log`, `git show`, `git diff --stat`, `git ls-tree`, `git status`, `keytool -list`, richieste `GET` all'indirizzo del progetto, che non esiste in rete, e a due siti di controllo, strumenti MCP `supabase` di sola lettura, ricerca nella documentazione Supabase, ricerca nella memoria delle sessioni). `git status` a fine ricerca: nessuna modifica nel worktree.
