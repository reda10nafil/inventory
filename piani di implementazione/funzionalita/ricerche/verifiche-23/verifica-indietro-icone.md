# Verifica: tasto Indietro e icone (23 novembre 2026)

> **Nota dell'orchestratore 3 (23 novembre 2026, dopo le risposte dell'utente).**
> - Domande in fondo: l'orchestratore propone la scheda madre per la freccia e il passo precedente per la Conta (ticket 28), da confermare se l'utente ne parla.
> - Sigle nei ticket: difetti del §1.3 → `IND-1…IND-9`, proposte P1-P9 → `IND-P1…P9` (non sono i difetti P01-P31 della prova del 22).
> - Sigle con il prefisso dell'area nei ticket (regola in `../../map-3.md`, Notes). Numeri di riga a `4b94e4c`; i difetti si riproducono su `HEAD` prima di correggerli.

Solo verifica: nessun file del worktree toccato, nessun comando git che cambia stato.

- **Codice**: citato a `4b94e4c` (branch `funzioni/magazzino`).
- **Prove sul web**: http://localhost:8082, che serve la **copia di lavoro, S1a compresa** (per esempio la voce Scaffali). Browser Playwright pulito, telefono 375×812, campionario da :8765.
- **Script**: in `script/indietro/`, con lanciatore proprio `base.cjs` (console e `page.route` attivi prima del primo caricamento, nessun filtro).
  - `a-diretto` (38 indirizzi) e `b-menu`: freccia dall'indirizzo e dai menu.
  - `c-azioni` e `c2-pila`: freccia dopo azioni (replace, navigate, salvataggio, Conta).
  - `d-icone D|E1|E2|F`: icone.
  - `g-loki` e `g2-loki`: messaggio di LokiJS.
  - `h-correzione con|senza`: correzione C2 simulata.
  - `stato-da-indirizzo.mjs` (Node) e `icone-nomi.cjs` (nomi delle icone).
- **Etichette**:
  - «provato sul web»;
  - «provato in Node» (funzioni vere di React Navigation su `linking.ts` a 4b94e4c);
  - «letto nel codice»;
  - «dedotto».
- «Da riconfermare dopo S1a» segna quello che dipende da file che S1a ha modificato.

## In breve

1. **La freccia non è stata tolta da nessuna schermata.** La storia del codice non lo mostra (`git log -S` su `router.back()`, `arrow-back`, `headerShown`): letto nel codice. Manca in quattro casi:
   - si apre o si ricarica un indirizzo interno: lo stack ha una sola schermata (provato sul web);
   - è lo Scanner, che non l'ha mai avuta (provato sul web);
   - si apre Team, Chat o Crea automazione ricaricando: compare NotFound (provato sul web);
   - il server :8082 è spento con la pagina aperta: la freccia è un'immagine PNG servita da Metro (provato sul web).
2. **Correzione più giusta e semplice: nel solo `src/navigation/linking.ts`.**
   - `initialRouteName: '(tabs)'`.
   - Tre indirizzi mancanti, per P29.
   - Facoltativo: un `getStateFromPath` di 10 righe, perché la freccia riporti alla scheda madre.

   Simulata sul web con `initialRouteName` iniettato nel bundle: frecce presenti, nessun errore GO_BACK. Una freccia disegnata in ogni schermata non basterebbe: non sistema il tasto di sistema di Android su un link a freddo.
3. **Icone**:
   - nessun nome sbagliato nel codice né nel campionario;
   - sul web con il server acceso tutte le icone si caricano.

   La segnalazione del 23 **non è riprodotta**. I sintomi «icone sparite» si ottengono solo se, durante il caricamento della pagina, i caratteri delle icone falliscono o tardano più di 6 s. In quel caso l'app non si riprende da sola: serve ricaricare (provato sul web). Con la pagina già aperta e il server spento, le icone restano.
4. **LokiJS**: il messaggio è innocuo e non compare a ogni primo avvio. Tra i casi provati compare solo se la pagina si ricarica mentre il database si sta preparando; subito dopo il database è pronto (provato sul web).

**Avvertenza S1a.** Il §1 e il §2 poggiano su file di navigazione che S1a ha modificato e non ancora committato: `RootNavigator`, `linking`, `compat`, `ScannerActionScreen`, `ScannerScreen`, Scheda, Modifica e Impostazioni. Le prove sul web vanno **riconfermate dopo S1a**. Differenze della copia di lavoro nella mia area:
- `SettingsShelves` (`settings/shelves`, intestazione nativa);
- nell'Azione rapida un ramo «scaffale», con `router.replace` verso la Scheda per ogni prodotto, «Chiudi» che chiama `router.back()` e «Scaffale non trovato».

Sono gli stessi meccanismi descritti sotto: «Chiudi» aperto dall'indirizzo dà GO_BACK, mentre il replace segue la riga «Dettagli».

---

## 1. Freccia Indietro schermata per schermata

### 1.1 Stato attuale: dove sta l'intestazione e quando mostra la freccia

Ci sono due tipi di intestazione.

- **Intestazione nativa** (`headerShown: true`, `RootNavigator.tsx:85-104`).
  - Riguarda Azione rapida, Posizioni, Tipi di pelle, Fornitori e clienti, Campi, Categorie, Layout, GS1, Scanner & NFC e Aspetto. Nella copia di lavoro anche Scaffali.
  - La disegna React Navigation. Sul web: `@react-navigation/native-stack/src/views/NativeStackView.tsx:57-78` e `:120-131`. La freccia compare solo se `headerLeft` non è impostato e lo stack contiene una schermata precedente (`canGoBack = headerBack != null`). Su Android la regola dell'intestazione nativa è la stessa.
  - Colore: `headerTintColor: accentInk` (`RootNavigator.tsx:79`), ben contrastato in tutti e 5 gli stili (letto nel codice).
  - Etichetta accessibile: **«(tabs), back»**, perché la schermata sotto si chiama `(tabs)` e non ha titolo (provato sul web).
  - Sul web la freccia è un'immagine, `back-icon.png`, chiesta a Metro la prima volta che serve (provato sul web, `d-icone D`).
- **Intestazione disegnata dalla schermata** (`headerShown: false`).
  - È un `Pressable` con `AppIcon` `arrow-back` o `close` che chiama `router.back()`, cioè `navigation.goBack()` (`compat.ts:84`). È sempre visibile.
  - Se sotto non c'è niente, il tocco non fa nulla e in console compare «The action 'GO_BACK' was not handled by any navigator».
- **Navigazione**: `compat.ts:74-77` traduce `router.push` in `navigation.navigate`. Con React Navigation 7, `navigate` verso una schermata già nello stack ma non in cima ne **aggiunge una copia**; senza `pop: true` non torna indietro (`@react-navigation/routers/src/StackRouter.tsx:345-445`, letto nel codice).
- **`linking.ts` (righe 1-40)**: nessun `initialRouteName`. Mancano `SettingsTeam`, `Chat` e `SettingsAutomationBuilder`, che pure sono in `compat.ts:29,43,45`.
- **Copia di lavoro (S1a)**: aggiunge `SettingsShelves` (`settings/shelves`, intestazione nativa). Si comporta come le altre (provato sul web).

### 1.2 Tabella

Legenda delle colonne:

- **(a)**: si entra dai menu (`b-menu`, `c-azioni`).
- **(b)**: si apre o si ricarica l'indirizzo (`a-diretto`).
- **(c)**: dopo un'azione che sostituisce o rimette una schermata.

Tutto è provato sul web, salvo dove è indicato.

| Schermata | Indirizzo | Intestazione (file:riga a 4b94e4c) | (a) dai menu | (b) indirizzo o ricarica | (c) dopo azioni |
| --- | --- | --- | --- | --- | --- |
| 5 schede (Home, Cronologia, Automazioni, Aggiungi, Impostazioni) | `/`, `timeline`, `automations`, `add`, `settings` | barra in basso (`TabsNavigator.tsx:17-23`) | non serve | non serve | `router.push('/(tabs)')` dopo il salvataggio in Aggiungi (`AddScreen.tsx:307`) resta sulla stessa barra (letto nel codice) |
| Scanner | `scanner` | sua, **senza freccia né chiusura** (`ScannerScreen.tsx:273-285`) | **nessuna freccia** (C1); sul web si esce solo con il tasto del browser | nessuna freccia | — |
| Azione rapida | `scanner-action` | nativa, modale (`RootNavigator.tsx:85-93`) e pulsanti «Chiudi» (`ScannerActionScreen.tsx:141`, `:175`, `:420`) | freccia «Scanner, back» (C1) | **nessuna freccia**; «Chiudi» non fa nulla (GO_BACK, C6) | «Dettagli» usa `router.replace` (`:80`): Scheda, poi «Indietro» torna allo Scanner (C1). «OK» dopo Sposta o Vendi aperti dall'indirizzo: GO_BACK (`:71`, `:78`, `:203`; esito-a3). «Vedi prodotti» (`:97`, `:164`): **seconda barra delle schede sopra**, con Scanner e Azione rapida ancora montati sotto (C2) |
| Scheda | `product/:id` | nessuna in alto; «Indietro» in basso (`DetailScreen.tsx:1282-1285`) | «Indietro» porta alla Home (B) | «Indietro» non fa nulla (GO_BACK, `h-correzione senza`). Con id inesistente compare solo «Prodotto non trovato», **senza pulsanti** (`:64-72`) | dopo il replace dall'Azione rapida, «Indietro» porta allo Scanner (C1) |
| Modifica | `product/edit/:id` | nessuna in alto; «Annulla» in basso (`EditScreen.tsx:799`) | «Annulla» porta alla Scheda (B) | «Salva» e poi «OK» (`:211`): **GO_BACK, resta in Modifica** (C3). «Annulla» farebbe lo stesso (dedotto). Id inesistente: nessun pulsante (`:42-49`) | Salva e «OK» chiama `router.back()` (`EditScreen.tsx:211`), che dalla Scheda torna alla Scheda (letto nel codice) |
| Posizioni, Tipi di pelle, Fornitori e clienti, Campi, Categorie, Layout, GS1, Scanner & NFC, Scaffali (copia di lavoro) | `settings/…` | nativa (`RootNavigator.tsx:96-103`) | freccia «(tabs), back» che porta a `/settings` (B, tutte e 9) | **nessuna freccia** (A; B: Posizioni dal menu, poi F5, la freccia sparisce) | — |
| Aspetto | `settings/appearance` | nativa (`:104`) | stessa regola (dedotto; l'arrivo è provato in esito-a4) | **nessuna freccia** (A) | — |
| Cestino, Condivisione, Modelli di settore | `settings/trash`, `settings/share`, `settings/sector-templates` | sua (`TrashScreen.tsx:103`, `ShareScreen.tsx:23`, `SectorTemplatesScreen.tsx:156`) | freccia che porta a `/settings` (B) | freccia visibile ma **non fa nulla** (GO_BACK, A) | — |
| Team | `/SettingsTeam` (assente da linking) | sua (`TeamScreen.tsx:240`) | freccia che porta a `/settings` (B) | **NotFound** (A, P29) | «Return Home» porta alla Home ma **lascia NotFound sotto** (C4) |
| Chat | `/Chat` | sua (`ChatScreen.tsx:136`) | freccia che porta a Team (B) | **NotFound** (A, P29) | — |
| Crea automazione | `/SettingsAutomationBuilder` (assente) | sua, X (`AutomationBuilderScreen.tsx:168`) | X porta a `/automations` (B) | **NotFound** (A), non segnalato in P29 | «OK» dopo il salvataggio chiama `router.back()` (`:154`, `:158`, letto nel codice) |
| Audit, Spostamento rapido, Vendita flash, Tagging | `automations/…` | sua, X (`AuditScreen.tsx:229`, `BatchMoveScreen.tsx:188`, `ScanSellScreen.tsx:116`, `QuickTagScreen.tsx:101`) | X porta a `/automations` (B) | X visibile ma **non fa nulla** (GO_BACK, A) | — |
| Conta (M07) | `automations/count` | sua: X al primo e all'ultimo passo, freccia nei passi intermedi (`CountScreen.tsx:62-66`, `:101-103`) | X porta a `/automations` (B) | X non fa nulla (GO_BACK, A) | Tasto Indietro del browser a metà conta: **esce senza conferma**, la quantità scritta si perde (C5) |
| Flusso automazione, Esecuzione | `automations/automation-flow/:id`, `…/custom-runner/:id` | sua (`AutomationFlowScreen.tsx:72`, `CustomRunnerScreen.tsx:323`); se non trovata, «Torna Indietro» (`:39`, `:308`) | non provato: il campionario non ha automazioni personali (letto nel codice: `router.back()`) | «Automazione non trovata» e «Torna Indietro»: GO_BACK (dedotto) | — |
| NotFound | `*` | nessuna; «Return Home» (`NotFoundScreen.tsx:30-36`) | — | «Return Home» porta alla Home, ma spinge le schede **sopra** NotFound (C4; `h-correzione`) | — |

### 1.3 Difetti e passi per riprodurli

1. **La freccia sparisce ricaricando o aprendo l'indirizzo** (11 schermate con intestazione nativa, compresa l'Azione rapida). Provato sul web.
   - Passi: Impostazioni › Categorie (la freccia c'è), poi F5: la freccia non c'è più.
   - Stesso risultato aprendo direttamente http://localhost:8082/settings/folders.
   - È la segnalazione dell'utente del 23.
2. **Frecce, X e pulsanti che non fanno nulla** sulle stesse aperture dirette. Provato sul web, GO_BACK in console.
   - Dove: Cestino, Condivisione, Modelli, Audit, Spostamento, Vendita flash, Tagging, Conta; «Indietro» della Scheda; «Salva» e «OK» della Modifica; «Chiudi» e «OK» dell'Azione rapida.
   - Passi: aprire http://localhost:8082/settings/share e toccare la freccia: non succede nulla.
3. **Lo Scanner non ha freccia né chiusura**, nemmeno arrivando dal menu. Provato sul web.
   - Passi: Automazioni › icona scanner. Sul web si esce solo con il tasto del browser; su Android con il tasto di sistema (dedotto).
   - Da riconfermare dopo S1a: `ScannerScreen.tsx` è modificato, ma il diff non tocca l'intestazione.
4. **Team, Chat e Crea automazione danno NotFound ricaricando.** Provato sul web.
   - P29 confermato, e c'è in più Crea automazione.
   - Passi: Impostazioni › Accesso Multi-Utente, poi F5. Anche `/settings/team`, `/chat` e `/settings/automation-builder` danno NotFound.
5. **«Vedi prodotti» e «Return Home» aggiungono una seconda barra delle schede** invece di tornare a quella esistente. Provato sul web (`c2-pila`: dopo «Vedi prodotti» Scanner e Azione rapida restano montati).
   - Effetto: Indietro (browser o telefono) riporta all'Azione rapida o a NotFound.
   - Causa: `compat.ts:12` e `:21-23` (`navigate('(tabs)')`) con lo `StackRouter` di React Navigation 7.
6. **Conta: il tasto Indietro di sistema a metà conta esce** senza conferma, senza tornare al passo precedente e perdendo le quantità scritte.
   - Provato sul web con il tasto del browser.
   - Su Android è letto nel codice: nessun `BackHandler`, `usePreventRemove` o `beforeRemove` in tutto `src/`.
7. **Scheda e Modifica con id inesistente**: solo il testo «Prodotto non trovato», nessun pulsante (provato sul web, `product/inesistente`).
8. **Etichetta accessibile «(tabs), back»** sulla freccia nativa: il lettore di schermo la legge così (provato sul web). Nell'immagine c'è solo la freccia, senza testo.
9. **Con il server spento e la pagina aperta**, la prima volta che si apre una schermata con intestazione nativa la freccia non si vede. Il pulsante c'è, ma `back-icon.png` non arriva. Provato sul web (`d-icone F`, schermata `F-categorie-server-spento.png`).
   - Le schermate aperte dopo la riaccensione la mostrano.
   - Vale solo per l'intestazione disegnata da JavaScript sul web. Su Android la freccia la disegna la barra nativa del sistema, senza quell'immagine (dedotto).

### 1.4 Che cosa manca

- Una schermata sotto quando si arriva da un indirizzo.
- Tre indirizzi in `linking.ts`.
- Una chiusura nello Scanner.
- Il ritorno alla barra esistente, invece di una copia, per `/(tabs)`.
- Una gestione del tasto di sistema nella Conta.
- Un pulsante nelle pagine «Prodotto non trovato».

---

## 2. Correzione per C2: quale delle due

### 2.1 Le due strade a confronto

**A. `initialRouteName: '(tabs)'` alla radice della `config` di `linking.ts`.** È una riga, più facoltativamente la scheda madre.

- Provato in Node con `getStateFromPath` e `getActionFromState` di `@react-navigation/core` 7.8.5 (`stato-da-indirizzo.mjs`): ogni indirizzo interno diventa `(tabs) > Schermata`.
- Provato sul web iniettando la riga nel bundle (`h-correzione con`, una sola sostituzione):
  - `/settings/folders`: freccia presente, il tocco porta a `/`;
  - Condivisione, Conta, «Indietro» della Scheda, «Chiudi» dell'Azione rapida, «Salva» e «OK» della Modifica: tutti portano a `/` con **0 GO_BACK**. Senza la riga: 5 GO_BACK e nessuna freccia (`h-correzione senza`);
  - l'Azione rapida aperta dall'indirizzo ha di nuovo la freccia.
- Limite: **la freccia porta alla Home**, non a Impostazioni o Automazioni (provato sul web). La `(tabs)` aggiunta non ha uno stato interno, quindi si apre sulla prima scheda.

**B. Una freccia che torna sempre alla schermata madre**, cioè `headerLeft` o un aiuto `goBackOr(madre)` in ogni schermata.

- Bisognerebbe toccare circa 25 punti: 11 intestazioni native, 13 disegnate, Scheda, Modifica e Azione rapida.
- Su Android, aperto un link `syncroflow://…` ad app chiusa, lo stack ha una sola schermata e il tasto di sistema **chiude l'app**: B non lo sistema, A sì (dedotto dalla stessa regola dello stack).

**Scelta: A.** Per avere anche la scheda madre basta, sempre nel solo `linking.ts`, un `getStateFromPath` che chiama quello di React Navigation e, sotto `settings/*` e `automations/*`, dà alla `(tabs)` aggiunta lo stato `{ routes: [{ name: 'settings' }] }` oppure `'automations'`. Sono circa 10 righe.
- A favore: oggi `/settings` produce proprio `(tabs){settings}` (provato in Node) e si apre su Impostazioni (provato sul web, `a-diretto`).
- Il resto è dedotto: React Navigation completa le altre schede da sé. Da provare nella fetta.

### 2.2 Effetti della scelta A

- **Link `syncroflow://` su Android.** Il manifest registra lo schema (`android/app/src/main/AndroidManifest.xml:22-27`).
  - Ad app chiusa: sotto la schermata c'è la Home (o la scheda madre), quindi il tasto di sistema torna lì invece di chiudere l'app.
  - Ad app aperta l'azione resta NAVIGATE come oggi (provato in Node), quindi lo stack corrente non si azzera.
- **Callback del login `syncroflow://auth/callback`.**
  - Oggi il login è spento (`AuthContext.tsx:17`). Sul web il ritorno è `window.location.origin` (`:36-40`), cioè la Home, e non cambia.
  - Su Android, `auth/callback?code=…` corrisponde a `NotFound: '*'` **con e senza** la correzione (provato in Node e sul web): un difetto latente che la correzione non tocca.
  - Il codice lo legge comunque `AuthContext` (`:97-100`, `:123-125`).
  - Rimedio semplice, quando si riaccende il login: `filter: (url) => !url.includes('auth/callback')` nel `linking`. È supportato dalla versione installata (`@react-navigation/native/src/useLinking.native.tsx:125`, `types.tsx:91-95`).
- **Prove esistenti che usano `h.go`** (38 script).
  - Sotto ogni indirizzo diretto ci sarà la Home montata ma nascosta (`display: none`, `NativeStackView.tsx:160-167`).
  - `innerText`, `h.has` e `h.vis` filtrano il visibile e non cambiano.
  - La Home nascosta viene **prima** nel DOM. Cambia chi conta o sceglie per posizione senza filtro, dopo un `h.go` verso una pagina interna:
    - **`a4-impostazioni.cjs:36-38`** (a4-imp-condivisione) passa da 1 a **22** elementi premibili (provato sul web);
    - **`a4-posizioni.cjs:6`, `:13`, `:14`, `:31`** e **`a4-cartelle.cjs:15`, `:75`** cliccano `[tabindex="0"]` per posizione (`nth(i)`) dopo `h.go('settings/locations')` o `h.go('settings/folders')`: prenderebbero elementi nascosti della Home (dedotto).
  - Per tutte va aggiunto `:visible` oppure `locator('visible=true')`.
  - Non cambiano (dedotto): i `.filter({ hasText: 'ID: …' })` e i `getByPlaceholder` delle pagine interne, perché la Home non ha quei testi; e chi apre `h.go('')`, cioè la radice, dove non si aggiunge nulla.
  - `a3-scanner` non avrà più GO_BACK: il suo esito atteso va aggiornato.
- **P29.** La correzione non lo risolve: Team ricaricato resta NotFound, ma con la Home sotto (provato sul web).
  - Servono 3 righe in `linking.ts`: `SettingsTeam: 'settings/team'`, `Chat: 'chat'`, `SettingsAutomationBuilder: 'settings/automation-builder'`. Sono gli indirizzi che `compat.ts` usa già; `editId` passa come `?editId=`.
  - Lo stato falso «Host pronto» di P29 resta un'altra questione.
- **GO_BACK dell'Azione rapida.** Risolto: «Chiudi» e «OK» tornano alla Home (provato sul web con la correzione simulata).
- **NotFound e «Vedi prodotti».** Con la correzione «Return Home» monta **due** Home (provato sul web).
  - Rimedio: in `compat.ts`, quando la destinazione è `(tabs)`, usare `navigation.popTo('(tabs)', params)`, che esiste nella versione 7 (`StackRouter.tsx:110`). Sistema anche il difetto 5 (dedotto, da provare).

### 2.3 Tasto Indietro di sistema durante la Conta e nelle finestre (dal codice)

- **Conta.**
  - Il tasto di sistema chiude la schermata a qualunque passo; la freccia a video invece torna indietro di un passo (`CountScreen.tsx:62-66`).
  - Rimedio: `usePreventRemove(step === 'count' || step === 'summary', () => back())` (esportato da `@react-navigation/native`, `core/src/index.tsx:36`). Il tasto di sistema diventa uguale alla freccia: torna di un passo.
  - In alternativa una conferma «Uscire dalla conta?».
- **Finestre e fogli.** Tutte le `Modal` hanno `onRequestClose`, quindi il tasto di sistema le chiude: MovementSheet, QR e foto della Scheda, finestre di Modifica, Aggiungi, Campi, Categorie, Posizioni, Contatti, Layout, Modelli, Builder e Home, e «Inserisci codice» dello Scanner (21 trovate).
  - Unica eccezione: «Analisi immagine» dello Scanner (`ScannerScreen.tsx:338`), di proposito: è un'attesa.
  - Non ci sono fogli fatti con altre librerie. Letto nel codice.
- **Manifest.** `android:enableOnBackInvokedCallback="false"` (`AndroidManifest.xml:16`): gestione classica del tasto, nessuna animazione predittiva.

---

## 3. Icone

### 3.1 Stato attuale

- **Componente.** Tutte le icone passano da `AppIcon` (`components/ui/AppIcon.tsx`): 9 nomi sostituiti con MaterialCommunityIcons (`:17-30`), gli altri con MaterialIcons. Un nome sconosciuto disegna `label-outline` (`:32-41`) invece del «?».
- **Nomi.** Confronto con le mappe dei glifi di `@expo/vector-icons` 15.1.1 (`icone-nomi.cjs`): 165 file, 709 usi e 257 nomi distinti, **nessun nome inesistente** (letto nel codice).
  - Anche le 9 sostituzioni esistono in MaterialCommunityIcons.
  - Le 56 icone del campionario esistono tutte.
  - Nella copia di lavoro `shelves` esiste.
  - `DynamicFieldRenderer.tsx` usa MaterialIcons senza riserva, ma nessuno lo importa: è codice morto.
- **Sul web con il server acceso** (`d-icone D`, provato sul web). Icone presenti su Home, Cronologia, Automazioni, Aggiungi, Impostazioni, Categorie, Campi, Scheda, Modifica, Conta, Azione rapida e Scanner:
  - 0 icone di riserva (`label-outline`) e 0 codici sconosciuti;
  - FontFace `material` e `material-community` in stato `loaded`, `document.fonts.check` vero;
  - richieste `MaterialIcons.ttf`, `MaterialCommunityIcons.ttf` e `back-icon.png` tutte 200.
- **Caricamento dei caratteri.** `@expo/vector-icons` li carica alla prima icona di ogni famiglia (`node_modules/@expo/vector-icons/build/createIconSet.js:55-77`). Finché il carattere non è caricato disegna un `<Text />` vuoto.
- **Sul web,** `Font.isLoaded` dice vero appena esiste la regola `@font-face`, anche se il file non è arrivato (`expo-font/build/ExpoFontLoader.web.js:102-108`). L'attesa dura al massimo 6 s (`:139-142`).

### 3.2 Difetti e passi per riprodurli (solo web in sviluppo)

1. **Caratteri non raggiungibili all'avvio** (server spento o in riavvio mentre la pagina si ricarica). Provato sul web, `d-icone E1`, che blocca le due richieste `.ttf`.
   - Le icone diventano **rettangoli vuoti**. La lente in Home non si vede.
   - Riacceso il server, senza ricaricare, le icone restano rotte anche nelle schermate aperte dopo, perché i FontFace restano in `error`.
   - **L'app non si riprende da sola.** Solo ricaricando tornano.
   - Schermate: `E1-home-dopo-attesa.png`, `E1-categorie-dopo-sblocco.png`.
2. **Caratteri lenti, oltre 6 s** (`d-icone E2`, risposta ritardata di 8 s). Provato sul web.
   - Arrivato il carattere, quasi tutte le icone compaiono. **La prima icona di ogni famiglia resta vuota** finché la schermata non si rimonta: 10 icone invece di 12 in Home, la lente manca.
   - In console: «6000ms timeout exceeded».
3. **Server spento con la pagina già aperta** (`d-icone F`, provato sul web).
   - Le icone restano, perché i caratteri erano già caricati.
   - Sparisce solo la freccia delle intestazioni native mai aperte prima (difetto 1.3.9).

**Causa della segnalazione del 23: non riprodotta.**
- Con il server spento una ricarica non carica nemmeno l'app: il bundle ha `Cache-Control: no-store`.
- Con la pagina già aperta le icone restano (F).
- Lo stato di E1 o E2 (app caricata, caratteri falliti o lenti) richiede che Metro risponda al bundle ma non, o tardi, ai caratteri: per esempio durante un riavvio o con il server sotto carico (dedotto).
- Ricaricando a server acceso tutto torna, come è successo all'utente.

**Su Android:**
- negli asset committati ci sono solo i caratteri del testo (`android/app/src/main/assets/fonts`), non quelli delle icone;
- in una build di release Metro mette i `.ttf` delle icone nel pacchetto al momento della compilazione, quindi non dipendono dal server (dedotto);
- in una build di sviluppo collegata a Metro li scarica dal server come sul web (dedotto).

### 3.3 Che cosa manca

Nulla per i nomi. Manca solo un recupero automatico quando i caratteri arrivano dal server (web, build di sviluppo). In un APK di release non serve (dedotto).

---

## 4. Messaggio di LokiJS al primo avvio

- **Ancora presente?** Non a ogni primo avvio. In 3 browser puliti nessun messaggio (`g-loki`): il database si azzera e si prepara normalmente; nelle ricariche successive non si azzera più.
- **Quando compare.** Compare se la pagina si ricarica **mentre** il primo avvio prepara il database (`g2-loki`, ricarica dopo 300 ms). Subito dopo arriva «[Loki] Database is now reset», quindi il database è pronto. Provato sul web.
  - Con la ricarica dopo 1200 ms, o con due schede aperte insieme, non compare.
  - `lib.cjs:51` lo filtra già come noto.
- **Causa nel codice.**
  1. `RootNavigator.tsx:27` importa `ChatScreen`.
  2. `ChatScreen` importa `ChatMessageItem` (`ChatScreen.tsx:13`), che importa `HydratedProductCard`.
  3. `HydratedProductCard.tsx:36-46` fa `require('../../db')` al caricamento del modulo.
  4. `src/db/index.ts:15` crea il database **all'avvio dell'app**, anche se sul web l'inventario usa localStorage e il database serve solo a Chat e Team.
  5. Con IndexedDB vuoto, WatermelonDB chiama `unsafeResetDatabase` (`@nozbe/watermelondb/adapters/lokijs/worker/DatabaseDriver.js:303-316`), che chiama LokiJS `deleteDatabase`.
  6. Se la connessione della pagina precedente non è ancora chiusa, scatta `onblocked` e scrive l'errore (`lokijs/src/incremental-indexeddb-adapter.js:788-793`). Secondo il commento della libreria, l'eliminazione riesce un attimo dopo.
- **Rimedio facoltativo.** Spostare il `require` di `src/db` dentro `useObservedProducts` di `HydratedProductCard.tsx`, così il database nasce solo aprendo la Chat. È un file, senza effetti sui dati: la Chat sul web non ha messaggi salvati nel database. Va bene anche lasciarlo com'è.

---

## Proposte (il modo più giusto, corretto e semplice)

| # | Che cosa | File | Rischi |
| --- | --- | --- | --- |
| P1 | `initialRouteName: '(tabs)'` nella `config`; facoltativo `getStateFromPath` per la scheda madre | `src/navigation/linking.ts` (S1a lo modifica: **dopo S1a**) | Home montata e nascosta sotto ogni indirizzo diretto. A 4b94e4c ha un solo effetto, che imposta uno stato locale dal parametro `library` (`HomeScreen.tsx:43-47`, letto nel codice): non scrive nulla. 3 prove da aggiornare (`a4-impostazioni`, `a4-posizioni`, `a4-cartelle`) |
| P2 | Tre indirizzi: `settings/team`, `chat`, `settings/automation-builder` (P29) | stesso file | Team sul web avvia l'host LAN anche alla ricarica (oggi solo dal menu) |
| P3 | `(tabs)` con `popTo` invece di `navigate` | `src/navigation/compat.ts` (**dopo S1a**) | Da provare con «Vedi prodotti» filtrato: il parametro `library` deve arrivare alla Home |
| P4 | X o freccia in alto nello Scanner | `src/screens/ScannerScreen.tsx` (**dopo S1a**) | Nessuno |
| P5 | Conta: il tasto di sistema torna di un passo (`usePreventRemove`) | `src/screens/automations/CountScreen.tsx` | Sul web il tasto del browser cambia l'indirizzo prima del blocco: da provare |
| P6 | «Prodotto non trovato» con il pulsante «Torna all'inventario» | `DetailScreen.tsx:64-72`, `EditScreen.tsx:42-49` (**dopo S1a**) | Nessuno |
| P7 | Etichetta della freccia: `headerBackTitle: 'Indietro'` nelle `screenOptions` | `RootNavigator.tsx:74-81` (**dopo S1a**) | Sul web il testo non si vede: cambia solo l'etichetta accessibile (dedotto) |
| P8 | Login futuro: `filter` per `auth/callback` | `linking.ts` | Solo quando si riaccende `LOGIN_ENABLED` |
| P9 | LokiJS: `require` di `src/db` rimandato | `src/components/chat/HydratedProductCard.tsx` | Basso; facoltativo |
| — | Icone: nessuna modifica. Se spariscono sul web, ricaricare la pagina a server acceso | — | — |

P1 e P2 vanno insieme nella fetta C2 (punto 5 della bozza). P3-P7 sono piccoli e possono stare nella stessa fetta o nella successiva.

## Come si proverebbe

**Nuova prova `prova/c2-indietro.cjs`** (o dentro `c2-tipo-pelle.cjs`). Tutti gli scenari partono da `h.go`, cioè dalla ricarica:

1. `c2-ind-diretto`: per ogni indirizzo interno di `linking.ts`, compreso `settings/shelves`:
   - freccia presente: `[aria-label$=", back"]` per le native, glifo `arrow-back` o `close` in alto per le disegnate;
   - il tocco porta alla scheda madre (o a `/`, secondo la decisione);
   - 0 errori GO_BACK.
2. `c2-ind-ricarica`: Impostazioni › Categorie, poi `page.reload()`: freccia presente, il tocco porta a `/settings`.
3. `c2-ind-p29`: ricaricare `/settings/team`, `/chat` e `/settings/automation-builder` non dà «Page Not Found».
4. `c2-ind-azione-rapida`: `scanner-action?type=product&id=cmp-1`, «SPOSTATO», «Conferma», «OK»: 0 GO_BACK. Da `?type=library`, «Chiudi»: 0 GO_BACK.
5. `c2-ind-modifica`: `product/edit/cmp-1`, «Salva Modifiche», «OK»: si lascia la Modifica, 0 GO_BACK.
6. `c2-ind-vedi-prodotti`: Scanner, lettura `pellicce`, «VEDI PRODOTTI»: «Scanner QR/Barcode» non è più montato (P3) e la Home è filtrata su Pellicce.
7. `c2-ind-notfound`: `/inesistente`, «Return Home»: una sola Home montata.
8. `c2-ind-scanner` (P4): X presente; il tocco porta ad Automazioni.
9. `c2-ind-conta` (P5): Conta › Magazzino, scrivere 3, `page.goBack()`: si resta in Conta, al passo precedente.

**Regressioni da rilanciare:**

- `a4-impostazioni.cjs`, `a4-posizioni.cjs` e `a4-cartelle.cjs` (prima va aggiunto `:visible` alle righe indicate al §2.2), poi `a4-esplora.cjs`;
- `a3-scanner.cjs` (GO_BACK atteso sparisce) e `a1-modifica.cjs`;
- `c1-categorie.cjs`, `m01-categorie.cjs`, `a2-campi.cjs`, `m07-conta.cjs`, `m09-azione.cjs`, `s1-scaffali.cjs`;
- i miei `a-diretto.cjs` e `h-correzione.cjs senza`. Dopo la correzione devono dare frecce dappertutto e nessun GO_BACK.

**Prova sul telefono** (Android, pacchetto `com.redako35.syncroflow`):

1. Impostazioni › Categorie: la freccia in alto e il tasto di sistema tornano a Impostazioni. Ripetere con Cestino e Condivisione.
2. App chiusa: `adb shell am start -W -a android.intent.action.VIEW -d "syncroflow://settings/folders" com.redako35.syncroflow`.
   - Si apre Categorie **con la freccia**.
   - Il tasto di sistema porta a Impostazioni (o alla Home). Un secondo tocco esce.
   - Prima della correzione il primo tocco chiude l'app.
3. Stesso link con l'app aperta su un'altra schermata: Categorie si apre sopra, e Indietro torna dove si era.
4. `syncroflow://settings/team` apre Team (dopo P2).
5. Automazioni › Conta › Magazzino, scrivere 3, tasto di sistema.
   - Oggi: esce e perde la quantità.
   - Con P5: torna alla scelta della posizione.
6. Scheda › Movimenta; poi QR; poi foto a tutto schermo; Scanner › Inserisci codice. In ogni finestra il tasto di sistema chiude la finestra e lascia la schermata sotto.
7. Scanner dal pulsante in Automazioni: il tasto di sistema torna ad Automazioni. A video la X c'è solo dopo P4.
8. Icone, su un APK di release: aprire le schermate principali in modalità aereo. Le icone e la freccia devono vedersi. Su una build di sviluppo collegata a Metro le icone dipendono dal server.
9. Quando il login sarà acceso: il ritorno da Google non deve aprire «Page Not Found» (P8).

## Domande per l'utente

1. Dopo una ricarica o un link, la freccia deve riportare alla **scheda madre** (Impostazioni, Automazioni) o basta la **Home**?
2. Nella Conta, il tasto Indietro del telefono a metà conta deve **tornare al passo precedente** (come la freccia a video) o **chiedere conferma** prima di uscire?
