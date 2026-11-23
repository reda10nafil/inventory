# Verifica di Chat e Team — 23 novembre 2026

> **Nota dell'orchestratore 3 (23 novembre 2026, dopo le risposte dell'utente).**
> - **Domande risolte**: 1) internet raro → rete locale del negozio col modem come canale principale, internet quando c'è, con un interruttore (resta valida la mesh, da rifare: non «Solo cloud»); 2) stessa merce → Richiesta «Trasferisci»; 3) prima le automazioni che inviano e ricevono merce, poi quelle condivise.
> - Le fette proposte qui («CT-B» e simili) si chiamano CHAT1, RETE1, RETE2, RIC1, RIC2, RIC3 nel ticket 30.
> - Prove non lanciate (server spenti): `script/chat-team/ct-chat-team.cjs` va lanciato all'inizio di CHAT1. Numeri di riga a `7bfcd72`.

Area: Chat operativa, Team / Accesso Multi-Utente (mesh LAN), Home, scambio di prodotti tra operatori, automazioni tra operatori, rapporto col cloud. Sola verifica: nessun file toccato nel worktree, nessun comando git che cambia stato.

**Base.** Codice letto a `7bfcd72` (branch `funzioni/magazzino`). Durante la verifica è arrivato il commit `a3c9514`, che cambia solo `piani di implementazione/` (`git diff --stat 7bfcd72 HEAD` fuori da quella cartella è vuoto): le righe citate valgono anche lì. Da `4b94e4c` a `7bfcd72` **non cambiano** `ChatScreen.tsx`, `TeamScreen.tsx`, `src/services/mesh*`, `src/db/*`, `src/hooks/*`, `src/components/chat/*` (`git diff --stat` vuoto). Cambiano per S1a solo `HomeScreen.tsx` (righe dello scaffale, non l'intestazione), la navigazione e `InventoryContext.tsx`.

**Prove sul web: nessuna lanciata oggi.** L'app su `:8082` e il campionario su `:8765` erano spenti a ogni controllo (connessione rifiutata, tre tentativi). Le regole vietano di avviarli. Quindi:
- «provato sul web (22/23 nov.)» = esito di una prova già fatta (`a3-chat` del 22 e del 23 mattina nella verifica delle automazioni, `a4-imp-team` del 22) su file che da allora non sono cambiati;
- le prove nuove sono scritte e pronte, **non lanciate**: `script/chat-team/ct-chat-team.cjs` (6 scenari, sintassi controllata con `node --check`, scrive solo schermate in `SHOTS`). Elenco al punto 7.

**Etichette.** «provato sul web (data)», «letto nel codice», «dedotto», «non provato, servono due telefoni».

## In breve

- **La Chat oggi non parla con nessuno.** Con il login spento e senza mesh funzionante, i messaggi restano sul telefono che li scrive. Si apre solo da Impostazioni › Accesso Multi-Utente › «Apri Chat Team (placeholder router.push)».
- **La mesh LAN non trasporta l'inventario.** Sincronizza le tabelle WatermelonDB (`products`, `automations`, `timeline`, `chat_messages`, `team_members`), che l'app non scrive mai: l'inventario vero sta in AsyncStorage (`inventory:v1:{spazio}:…`). Tra telefoni passerebbe solo il testo dei messaggi con gli SKU (CT10).
- **Il pairing LAN probabilmente non riesce mai su telefono.** La risposta di handshake WebSocket si calcola con `crypto` di Node, che in React Native non c'è: il server rimanda la chiave così com'è e un client standard rifiuta la connessione (CT12, dedotto). Anche se riuscisse, il QR «effimero» riavvia il server ogni 120 s e butta fuori tutti i client (CT11).
- **I messaggi da client a client si perdono**, il mittente ne vede 3 copie, e quelli che arrivano con la Chat chiusa spariscono (CT02-CT04).
- **Le card in chat agiscono sulla copia locale del destinatario**, trovata per SKU. Se lui non ha il prodotto, la card resta su «In sincronizzazione…» per sempre (CT05). «Sposta» della card va sempre tra vetrina e magazzino (CT01).
- **Due «Team» diversi**: quello LAN (Team & Accesso, ruoli finti) e quello cloud (inviti Supabase con ruoli veri, nascosto col login spento). Nessuno dei due ha un'identità dell'operatore nei dati: gli eventi della Cronologia non dicono chi ha fatto cosa.
- **Home**: in alto c'è solo la ricerca. L'icona della chat «accanto» non esiste ancora (punto 3).
- **Mandare prodotti a un collega** non esiste. Proposta: un solo oggetto, la **Richiesta** (per ora «Trasferisci»), salvata nello spazio condiviso ed eseguita una sola volta da chi la accetta, come un unico evento di trasferimento con l'id della richiesta. Mai scarico su un telefono più carico sull'altro (punto 4).
- **Le automazioni non passano tra telefoni** in nessun modo. Le due letture della frase dell'utente portano a lavori diversi (punto 5).
- **Il cloud (L1/L2) è oggi l'unica strada concreta per più operatori**, ma va bene solo se c'è internet. Il server fonde i prodotti per `updatedAt` e unisce gli eventi per id: due movimenti di quantità contemporanei conservano entrambi gli eventi e perdono una giacenza (punto 6). Serve **un solo canale**, non mesh e cloud con regole diverse.

---

## 0. Difetti aperti, riconfermati

| N | Stato | Prova | Causa (`7bfcd72`) |
| --- | --- | --- | --- |
| P28 (a) messaggi doppi | ancora presente | provato sul web (22 e 23 nov.): `a3-chat`, «copieMessaggio» 2 | Il messaggio si aggiunge a mano (`ChatScreen.tsx:78`) e poi torna dall'eco `notifyLocalChat` (`:81`, `:103`) all'ascoltatore della stessa schermata (`:54-64`). Su un telefono collegato le copie diventano 3 (CT02) |
| P28 (b) «Approva» sempre in Vetrina | ancora presente | provato sul web (22 e 23 nov.) | `moveProduct(id, 'vetrina')` scritto nel codice (`ChatScreen.tsx:120`). L'automazione del messaggio non viene eseguita (CT17) |
| P28 (c) «Vendi» senza conferma né prezzo | ancora presente | provato sul web (22 e 23 nov.): evento `sold` con dettagli vuoti | `inventory.sellProduct(product.id)` senza prezzo, al primo tocco (`HydratedProductCard.tsx:214-218`). Per un articolo a quantità scarica 1 senza prezzo (letto nel codice: `InventoryContext.tsx:532-538`, `qty = 1`) |
| P28 (d) storico non per spazio | ancora presente | provato sul web (22 e 23 nov.): chiave `chat_messages` | `ChatScreen.tsx:47`, `:70`. Gli ultimi 100 messaggi, senza spazio né mittente (CT07) |
| V15 «n/n» anche con rifiuti | ancora presente | provato sul web (23 nov.): 3/3 con 2 eventi | Ritorno di `moveProduct` ignorato (`ChatScreen.tsx:116-123`). Uno SKU che il telefono non ha viene saltato in silenzio e contato lo stesso (letto nel codice: `:117-118`) |
| P29 (a) «Host pronto» anche se fallisce | ancora presente | provato sul web (22 nov.): `a4-imp-team`, finestra «Impossibile creare stanza Host (LAN non raggiungibile)» e intanto «Host pronto — in attesa client» | Il riquadro dipende solo dal selettore (`TeamScreen.tsx:299`: `mode === 'host'`), non dall'esito di `createHost` (`:72-86`). L'elenco mette sempre «Questo dispositivo (Host) Online» (`:114`) |
| P29 (b) Team e Chat danno NotFound ricaricando | ancora presente | provato sul web (22 nov.) | `linking.ts:1-40` non ha `Chat` né `SettingsTeam` (né `SettingsAutomationBuilder`, V11). Li conosce solo `compat.ts:29`, `:44`, `:45` |

---

## 1. Chat

### 1.1 Stato attuale

**Dove si apre.** Solo da Impostazioni › «Accesso Multi-Utente» (`SettingsScreen.tsx:707-724`) › Team › «Apri Chat Team (placeholder router.push)» (`TeamScreen.tsx:259-266`). Nessun'altra voce porta alla Chat (provato sul web, 22 nov.). Entrando in Team, il telefono prova subito a diventare Host (CT09).

**Che cosa fa** (letto nel codice, salvo dove detto):

| Elemento | Che cosa fa | Dove scrive | Sul web |
| --- | --- | --- | --- |
| Messaggio di benvenuto | Testo fisso «Ciao team — chat operativa su LAN isolata…» (`ChatScreen.tsx:37-39`) | – | visto (22 nov.) |
| Invio testo | Aggiunge il messaggio, lo manda alla mesh, lo rimanda a sé stesso (`:73-83`) | `chat_messages` in AsyncStorage, ultimi 100 (`:68-71`) | provato (22/23 nov.): 2 copie |
| Pulsante «card» (icona scatola) | Manda **i primi 3 prodotti disponibili** dell'inventario, non una scelta dell'utente (`:87`), con l'automazione fissa `auto-audit-vetrina` (`:93`), che non esiste (`AutomationsContext` usa id `auto_<ora>_<caso>`, `:111-121`) | come sopra; la copia dei prodotti (`hydratedCache`) resta solo nel proprio messaggio (`:95-100`) | provato (22/23 nov.) |
| Card di più prodotti | Spunta per prodotto, «Seleziona tutti», barra «Automazione: auto-audit-vetrina» con «Approva Spostamento» (`HydratedProductCard.tsx:385-420`) | – | provato |
| «Approva Spostamento» | Sposta i selezionati in `vetrina` (P28 b), poi «Automazione … applicata su n/n articoli — timeline sincronizzata su mesh» (V15) | prodotti e Cronologia del telefono | provato: 3 eventi `moved` (22 nov.), 2 dopo la correzione di `moveOf` (23 nov.) |
| «Sposta» della card | Se il prodotto è in `vetrina` va in `magazzino`, altrimenti in `vetrina` (`HydratedProductCard.tsx:203-212`). Poi la Chat dice sempre «SPOSTA su X — eseguito su DB locale + timeline» (`ChatScreen.tsx:106-108`) | prodotti e Cronologia | non provato (scenario `ct-chat-sposta-card` pronto): CT01 |
| «Vendi» della card | P28 (c) | idem | provato (22/23 nov.) |
| Icona «i» | «Chat sincronizzata su LAN isolata. Payload ultraleggero SKU[].» (`ChatScreen.tsx:140`) | – | – |
| Nota sotto la tastiera | «Card demo usa payload leggero {skus:[...]} → hydration locale WebP» (`:174`) | – | visto |

**Con chi parla** (letto nel codice; nessuna prova possibile sul web, perché il browser non può fare da Host: vedi 2.1):

| Strada | Che cosa succede | Etichetta |
| --- | --- | --- |
| Stesso telefono | Il messaggio torna a sé stesso con `notifyLocalChat` (`meshSync.ts:228-231`): è l'«eco di prova» scritta nel commento `ChatScreen.tsx:80` | provato sul web (22/23 nov.) |
| Host → Client | L'Host manda `{type:'light_payload', skus, automationIds, text, ts}` a tutti i client (`meshSync.ts:382-395`). Il client lo accetta (`:200`, `skus` è un elenco anche vuoto) | letto nel codice, non provato, servono due telefoni |
| Client → Host | Il client manda `light_payload` sul WebSocket (`meshSync.ts:397-404`). L'Host lo salva in WatermelonDB (`meshServer.ts:509`, `appendChatMessage :436-458`) e lo mostra con `notifyLocalChat` (`:514`) | letto nel codice, non provato, servono due telefoni |
| Client → altro Client | L'Host lo rimanda a tutti come `{type:'chat', skus, automationIds, text, ts}` (`meshServer.ts:511-512`). Il client accetta un `chat` solo se ha il campo `payload` (`meshSync.ts:203`): **scartato** | letto nel codice: CT03 |
| Cloud | Nessuna. La chat non è nello snapshot Supabase, che porta solo prodotti, cronologia, avvisi, cartelle ed eliminati (`InventoryContext.tsx:165-172`) | letto nel codice |

**Dove salva.**
- Tutti i telefoni: AsyncStorage `chat_messages`, senza spazio (P28 d). Sul web è `localStorage`.
- Solo l'Host, in più: la tabella WatermelonDB `chat_messages` (LokiJS sul web, SQLite sul telefono), per i messaggi che riceve dai client. **Nessuna schermata la legge**: la Chat legge solo AsyncStorage (`ChatScreen.tsx:47`). Il modello `ChatMessage` (`src/db/models/ChatMessage.ts:20-33`) si aspetta `sku`, mentre il server scrive `skus` (`meshServer.ts:446`): letta col modello, la riga diventerebbe vuota (letto nel codice).
- Le card leggono i prodotti prima da WatermelonDB (`HydratedProductCard.tsx:50-70`, sempre vuota, CT10), poi dall'inventario del telefono per SKU (`:318-327`).

### 1.2 Difetti nuovi (CT = verifica Chat e Team)

| N | Che cosa | Passi | Causa | Gravità |
| --- | --- | --- | --- | --- |
| CT01 | «Sposta» della card sposta sempre tra Vetrina e Magazzino, anche un capo che sta in Stand A. Un articolo a quantità sposta tutta la giacenza della posizione principale (`moveOf`, V10). Il messaggio dice «eseguito» anche se l'operazione è rifiutata (capo nel cestino) | Chat › card › «Sposta» su VIS-0142 (in vetrina): finisce in magazzino; su LIN-0021 (stand_b): finisce in vetrina. **Non provato**, scenario `ct-chat-sposta-card` | `HydratedProductCard.tsx:207`; ritorno di `moveProduct` ignorato (`:208`); `ChatScreen.tsx:106-108` | dati |
| CT02 | Su un telefono collegato alla mesh ogni messaggio inviato compare **3 volte** (Host e Client) | dedotto: aggiunta a mano (`ChatScreen.tsx:78`), ascoltatori chiamati da `sendLightPayload` (`meshSync.ts:390` Host, `:402` Client, `:417` HTTP), eco `notifyLocalChat` (`ChatScreen.tsx:81`). Non provato, servono due telefoni | come a sinistra | comportamento |
| CT03 | I messaggi da un Client non arrivano agli altri Client | dedotto dal codice: tre telefoni, B e C Client di A; B scrive; A lo vede, C no. Non provato, servono tre telefoni | forma diversa tra `meshServer.ts:511` e `meshSync.ts:203` | comportamento |
| CT04 | Un messaggio che arriva con la Chat chiusa si perde (sui Client del tutto; sull'Host resta in una tabella che nessuno legge). Non c'è un contatore dei non letti | dedotto: l'ascolto esiste solo mentre la Chat è aperta (`ChatScreen.tsx:43-66`). Non provato, servono due telefoni | come a sinistra | comportamento. Blocca un'icona con il numero dei non letti in Home |
| CT05 | Le card di un altro telefono agiscono sulla copia **locale** del destinatario, trovata per SKU. Se il destinatario non ha quello SKU, la card resta per sempre su «Sync SKU… In sincronizzazione…» e «Approva» dice «1/1» senza fare nulla. Se ce l'ha (es. stesso campionario), lo sposta o lo vende solo sul suo telefono: i due inventari si separano e il mittente non sa nulla | **Non provato**, scenario `ct-chat-sku-sconosciuto` (messaggio «ricevuto» simulato nello storico). Con due telefoni: A manda la card, B la vede | Il messaggio porta solo SKU (`meshSync.ts:371-378`); l'inventario non viaggia (CT10); `HydratedProductCard.tsx:228-241`, `ChatScreen.tsx:116-123` | dati (inventari divergenti) |
| CT06 | Le card mostrano dati sbagliati per un magazzino: «Giacenza» dice solo «Disponibile» o «Venduto», non la quantità; la posizione è l'id in maiuscolo («STAND_A»), senza nome né scaffale; la «categoria» è il tipo di pelle (`furType`); i prodotti nel cestino compaiono con i pulsanti attivi | letto nel codice | `HydratedProductCard.tsx:220-226`, `:252-253`; `getProductBySku` non esclude il cestino (`InventoryContext.tsx:593-595`) | comportamento |
| CT07 | I messaggi non hanno mittente: con tre operatori non si sa chi ha scritto. Gli eventi della Cronologia non hanno autore | letto nel codice: `senderId` mai impostato (`ChatScreen.tsx:77`, `:100`); il server scrive `'mesh'` (`meshServer.ts:448`); `TimelineEvent` senza campo autore (`types/index.ts:61-86`) | come a sinistra | mancanza |
| CT08 | Testi di prova nell'app: messaggio di benvenuto, «placeholder router.push», «Card demo…», icona «i», automazione inesistente mostrata col suo id | letto nel codice e visto sul web (22 nov.) | `ChatScreen.tsx:38`, `:140`, `:174`, `:93`; `TeamScreen.tsx:264`; `HydratedProductCard.tsx:409` | comportamento |

Letto nel codice, da tenere presente: `ProductCard` chiama `useInventory()` dentro un `try` dopo un `require` (`HydratedProductCard.tsx:197-201`, `:299-306`). Funziona, ma va contro le regole degli hook: da togliere quando si rifà la card.

### 1.3 Che cosa manca

- Un destinatario vero: chi riceve, in quale spazio di lavoro.
- Mittente e ora su ogni messaggio, uno storico per spazio, i non letti.
- Card che leggono i dati dello **stesso** inventario del mittente (serve l'inventario condiviso, punto 6) e azioni che passano dalle schermate giuste: `MovementSheet` per quantità, posizione e scaffale, Vendita con prezzo e cliente.
- Una scelta dei prodotti da mandare, invece dei «primi 3».

### 1.4 Proposta semplice

Due tempi.

**CT-A, subito (anche col login spento), correzioni che proteggono i dati:**
1. Card: togliere «Sposta» e «Vendi» diretti. Il tocco apre la Scheda del prodotto e da lì si usano Movimenta e Vendi, che hanno già quantità, prezzo, cliente e scaffale. Nessun doppione di logica.
2. «Approva» sparisce finché non esiste la Richiesta (punto 4).
3. Una sola copia: togliere l'aggiunta a mano o l'eco (`ChatScreen.tsx:78`, `:81`, `:103`, e gli ascoltatori di `meshSync.ts:390`, `:402`, `:417`), con un id per messaggio per scartare i ripetuti.
4. Storico per spazio: `chat_messages:{spazio}`; quello vecchio senza spazio va in `local` una volta.
5. Testi veri: «Nessun collega collegato» al posto del benvenuto finto; via «placeholder», «demo» e l'icona «i».
6. `linking.ts`: `chat` e `settings/team`.

File: `src/screens/ChatScreen.tsx`, `src/components/chat/HydratedProductCard.tsx`, `src/services/meshSync.ts`, `src/navigation/linking.ts`. Rischi per i dati: solo la chiave dello storico (spostata, mai cancellata).

**CT-B, dopo l'inventario condiviso:** mittente e destinatario dal login (L1), la Richiesta (punto 4) come card con lo stato, i non letti.

### 1.5 Come si proverebbe

- `prova/ct-a-chat.cjs`: un invio = una copia sullo schermo e una nello storico; chiave `chat_messages:local`; nessun pulsante «Vendi» o «Sposta» sulla card; tocco sulla card → Scheda; card di uno SKU sconosciuto → «Prodotto non presente su questo telefono», non lo spinner; `/chat` si riapre dall'indirizzo.
- Regressioni: `a3-chat` (va adattata: oggi verifica il difetto), `a4-impostazioni`, `m04-movimenta`, `a3-scansell`.
- Due telefoni: vedi 2.5.

---

## 2. Team / Accesso Multi-Utente

### 2.1 Stato attuale

Ci sono **due Team diversi**, da tenere separati:

| | Team LAN (mesh) | Team cloud (Supabase) |
| --- | --- | --- |
| Dove | Impostazioni › «Accesso Multi-Utente» › `TeamScreen` | Impostazioni › «Team e spazi di lavoro» (`SettingsScreen.tsx:534-580`) |
| Come ci si unisce | Host mostra un QR `ws://IP:8080?token=…`; il Client lo inquadra o lo incolla (`TeamScreen.tsx:309-475`) | Invito per email Google (`create_organization_invitation`, `:53-73`) e codice da incollare (`accept_organization_invitation`, `:75-93`), scade in 7 giorni |
| Ruoli | Scritti a mano nelle etichette: Host «admin», gli altri «client» o «editor» (`TeamScreen.tsx:82`, `:114-116`, `:129`). `useTeamPermissions` (`src/hooks/useTeamPermissions.ts:17-23`) e `canWrite`/`assertCanWrite` (`src/db/sync.ts:170-176`) non sono chiamati da nessuno | Veri, nel database: `owner`, `admin`, `operator`, `viewer` (enum `organization_role`, migrazione `20260916043654`, riga 3). Gli inviti li crea solo `owner` o `admin` (`SettingsScreen.tsx:549`) |
| Con il login spento | Visibile, prova a funzionare | Nascosto: «Accesso con Google disattivato…» (`:578`) |
| Che cosa condivide | Vedi tabella sotto | L'inventario dello spazio (snapshot + tempo reale, punto 6) |

**Che cosa viaggia sulla mesh** (letto nel codice):
- **Chat**: `light_payload` sul WebSocket (testo, SKU, id di automazioni) e `/chat/push` via HTTP (`meshServer.ts:240-255`).
- **Sincronizza**: `GET /pull` e `POST /push` (`meshServer.ts:212-238`) con il motore `synchronize` di WatermelonDB (`src/db/sync.ts:130-155`), sulle tabelle `products`, `automations`, `timeline`, `chat_messages`, `team_members` (`meshServer.ts:346`, `:401`).

| Dato dell'app | Dove sta davvero | Passa sulla mesh? |
| --- | --- | --- |
| Prodotti (inventario) | AsyncStorage `inventory:v1:{spazio}:products` (`InventoryContext.tsx:155-162`) | **no**: nessun contesto scrive la tabella WatermelonDB `products` (cercato: l'unico che scrive in WatermelonDB è `meshServer.ts`) |
| Giacenze per posizione, unità, scorta minima, scaffale, campi personalizzati | dentro i prodotti | **no**: lo schema WatermelonDB non ha nemmeno le colonne (`src/db/schema.ts:67-91`) |
| Movimenti e Cronologia | `inventory:v1:{spazio}:timeline` | **no** (tabella `timeline` vuota) |
| Automazioni | `@furinventory_custom_automations:{spazio}` (`AutomationsContext.tsx:77`, `:105-107`) | **no** (tabella `automations` vuota) |
| Posizioni, scaffali, contatti, categorie, campi, layout | chiavi `…:{spazio}` (`LocationsContext.tsx:56`, `ShelvesContext.tsx:40`, `ContactsContext.tsx:40`…) | **no** |
| Membri del team | tabella `team_members` | **no**: nessuno la scrive |
| Messaggi della chat | AsyncStorage `chat_messages` | solo il messaggio in diretta, con i difetti CT02-CT04 |

**Web e telefono.**

| Funzione | Sul web | Sul telefono |
| --- | --- | --- |
| Host | **impossibile**: un browser non può aprire un server. `startMeshServer` prova `react-native-tcp-socket`, poi `http` di Node (`meshServer.ts:613-683`); entrambi mancano. Provato sul web (22 nov.): «Impossibile creare stanza Host» | TCP con `react-native-tcp-socket` (`package.json:130`). Non provato |
| Client | possibile in teoria verso un Host su telefono (WebSocket del browser, risposte con CORS `*`, `meshServer.ts:279`, `:572`): dedotto | `WebSocket` di React Native. Non provato |
| Due operatori sul web (due contesti del browser) | **non si può**: nessuno dei due può fare l'Host, e i due contesti non condividono nulla. Lo scenario `ct-due-contesti` (pronto, non lanciato) lo mostra: il messaggio di A non arriva a B, e B come Client riceve «Connessione fallita» | – |

### 2.2 Difetti nuovi

| N | Che cosa | Passi | Causa | Gravità |
| --- | --- | --- | --- | --- |
| CT09 | P29 (a) allargato: chi apre Team **diventa Host da solo**, anche chi vuole fare il Client, e il server resta acceso dopo l'uscita. «Sincronizza ora» dell'Host sincronizza l'Host con sé stesso | letto nel codice: selettore predefinito `host` (`TeamScreen.tsx:59`), creazione automatica (`:72-86`), nessuna chiusura all'uscita; «Sincronizza ora» dell'Host (`:369-372`) usa il suo stesso indirizzo (`useMeshRole.ts:133-142`) | come a sinistra | comportamento |
| CT10 | **La mesh non sincronizza l'inventario.** «Sincronizza ora» scambia tabelle WatermelonDB che l'app non scrive. I testi promettono il contrario: «Sync 100%» (`SettingsScreen.tsx:720`), «(prodotti, automazioni, timeline, chat e membri)» (`TeamScreen.tsx:474`) | letto nel codice (tabella 2.1). Sul web, scenario `ct-indexeddb` (pronto): cerca «VIS-0142» nell'IndexedDB di LokiJS mentre l'inventario ha 6 prodotti. Con due telefoni: B si unisce ad A, «Sincronizza ora», l'inventario di B non cambia | inventario in AsyncStorage, mesh su WatermelonDB (`schema.ts:61-157`, `meshServer.ts:336-391`) | dati: nessun dato rovinato, ma l'utente crede che i telefoni siano allineati |
| CT11 | Il QR «effimero» si rigenera ogni 120 s **riavviando il server con un token nuovo**: tutti i Client collegati cadono e devono rileggere il QR. Succede finché l'Host resta sulla schermata Team | dedotto: `TeamScreen.tsx:88-102` → `createHostRoom` (`meshSync.ts:236-269`) → `startMeshServer` «already running — restarting» (`meshServer.ts:614-617`) → `stopMeshServer` chiude tutti i socket (`:835-839`). Non provato, servono due telefoni | come a sinistra | comportamento |
| CT12 | **Il pairing probabilmente non riesce mai su telefono.** L'accettazione WebSocket (`Sec-WebSocket-Accept`) si calcola con `require('crypto')`. In React Native non c'è (nessun polyfill in `package.json`; Metro tratta il `require` come facoltativo). Il server rimanda la chiave stessa («fallback insecure accept»). Un client standard (OkHttp su Android, i browser) la rifiuta | dedotto: `meshServer.ts:79-94`, `:590-591`; `node_modules/crypto` assente; `allowOptionalDependencies: true` (`@expo/metro-config`). **Prima cosa da provare con due telefoni** (2.5, passo 1) | come a sinistra | blocca tutta la mesh |
| CT13 | «Invia payload test» dice sempre «Payload inviato», anche senza nessun collegamento. Manda `SKU-DEMO-001`, che non esiste | letto nel codice: `useMeshRole.ts:143-149` ingoia l'errore, quindi il `catch` di `TeamScreen.tsx:218-225` non scatta mai | come a sinistra | comportamento |
| CT14 | Testi che promettono cose che non ci sono: «Heartbeat ogni 5s • offline dopo 15s» (`TeamScreen.tsx:500`: c'è solo un controllo ogni 2 s e nessuno diventa «offline»); «uso singolo» del QR (`:336`: il token vale per più client finché non scade) | letto nel codice | come a sinistra | comportamento |
| CT15 | Il motore di sincronizzazione ha probabilmente difetti suoi, oggi nascosti perché le tabelle sono vuote. (1) `/push` crea righe copiando l'id ricevuto anche se esiste già, e cerca con `find`, che lancia un errore se la riga manca: il blocco intero fallirebbe (`meshServer.ts:417-423`). (2) `automations` e `timeline` non hanno `updated_at` (`schema.ts:96-123`): dopo la prima sincronizzazione passano solo le righe nuove, filtrate per data di creazione (`meshServer.ts:357-362`). Per `timeline`, che ha `timestamp` e non `created_at`, probabilmente nemmeno quelle. Le modifiche alle righe esistenti non passano mai. (3) L'ultima sincronizzazione è una sola chiave per tutti gli Host e gli spazi (`sync.ts:36`) | dedotto dal codice, non provato | come a sinistra | da sapere prima di riusarlo |

Sicurezza (letto nel codice): il token è nel QR e passa in chiaro, come dice già la schermata (`TeamScreen.tsx:503-507`). Il server ascolta su `0.0.0.0:8080` finché l'app è aperta (CT09).

### 2.3 Che cosa manca

- Un canale che porti davvero inventario, giacenze, movimenti, posizioni, scaffali e contatti.
- Identità degli operatori: nome sul telefono, autore negli eventi e nei messaggi.
- Ruoli applicati: oggi un operatore può fare tutto ovunque.
- Uno stato vero del collegamento: presenza, ultima sincronizzazione riuscita, errori detti.

### 2.4 Proposta semplice

1. **Subito**:
   - Team LAN marcato «sperimentale», senza promesse (via «Sync 100%», «Heartbeat», «uso singolo», «Host pronto» quando non lo è);
   - il selettore parte da nessuno dei due: l'Host si crea solo col pulsante;
   - il QR non riavvia il server: si rigenera solo il QR, oppure il token dura quanto la sessione;
   - gli errori sono detti;
   - `linking.ts`: `settings/team`.

   File: `TeamScreen.tsx`, `useMeshRole.ts`, `meshSync.ts`, `SettingsScreen.tsx:720`, `linking.ts`. Nessun rischio per i dati.
2. **Il canale dei dati è uno solo**, deciso dall'utente (domanda 1):
   - **con internet**: il cloud di L1/L2, con gli inviti e i ruoli che esistono già nel database. La mesh resta ferma o si toglie;
   - **senza internet**: la mesh va riscritta per portare **lo stesso contenuto e con le stesse regole di fusione del cloud** (snapshot dello spazio o registro delle operazioni, punto 6). Non le tabelle WatermelonDB. Prima va chiuso CT12.
3. **Ruoli**: un solo elenco, quello di Supabase (`owner`, `admin`, `operator`, `viewer`). `useTeamPermissions` va usato davvero, con quei nomi, oppure tolto. Un `viewer` non vede i pulsanti che scrivono.

Rischi per i dati: nessuno al punto 1. Al punto 2, vedi punto 6.

### 2.5 Come si proverebbe

- **Web**: `a4-imp-team` aggiornata (niente «Host pronto» se fallisce, nessun Host automatico, `/settings/team` si riapre); `ct-due-contesti` e `ct-indexeddb` come documentazione dello stato.
- **Due telefoni, non provato** (stessa rete Wi-Fi, app di sviluppo, `adb logcat | grep mesh` aperto):
  1. A: Impostazioni › Accesso Multi-Utente (Host): QR visibile? B: Client › Avvia scanner › inquadra › «Connetti». Atteso oggi: «Connessione fallita» e nel registro di A `crypto.createHash non disponibile` (CT12). Se si collega, CT12 è sbagliato: annotarlo.
  2. Se collegati: lasciare A su Team per più di 2 minuti; B cade quando il QR si rigenera (CT11).
  3. A scrive in Chat: A vede 3 copie (CT02), B 1. B scrive: A la vede. Con un terzo telefono C: C non vede quella di B (CT03).
  4. B chiude la Chat, A scrive, B riapre: il messaggio manca (CT04).
  5. A manda la card: su B «In sincronizzazione…» (CT05), salvo stesso campionario; in quel caso «Approva» su B sposta solo su B.
  6. B «Sincronizza ora»: l'inventario di B non cambia (CT10).
  7. «Invia payload test» con Wi-Fi spento: dice «Payload inviato» (CT13).

---

## 3. Home

### 3.1 Stato attuale (letto nel codice, `HomeScreen.tsx` a `7bfcd72`)

- **Intestazione** (`:263-293`): titolo «Syncro Flow» e «N prodotti» a sinistra. A destra (`headerActions`, `:269-291`) **un solo pulsante, la ricerca** (`:281-289`), che diventa «X» quando la barra di ricerca è aperta. In selezione, al suo posto c'è «Seleziona Tutto / Deseleziona» (`:270-279`).
- **Non c'è un'icona della chat**: la frase dell'utente «accanto all'icona di chat» si riferisce a qualcosa che oggi non esiste. Lo Scanner si apre dalla scheda Automazioni (`AutomationsScreen.tsx:93`). Le schede in basso sono Home, Cronologia, Automazioni, Aggiungi, Impostazioni (`TabsNavigator.tsx:18-22`).
- **Selezione multipla** (pressione lunga): barra in basso con il conteggio, «categoria» (cartella), elimina, chiudi (`:469-486`). La finestra «Gestisci N Prodotti» offre solo «Sposta in categoria» (`:495-545`).
- Sul web: scenario `ct-home-icone` pronto (elenca i pulsanti in alto; atteso solo la ricerca).

### 3.2 Difetti

Chat e Team si raggiungono solo passando da Impostazioni (CT08, P29 b). Nessun difetto nuovo in Home.

### 3.3 Che cosa manca

Un ingresso alla Chat e al Team dalla Home, e un modo di mandare a un collega i prodotti selezionati.

### 3.4 Proposta semplice

- **Come chiede l'utente, alla lettera**: due icone a sinistra della ricerca in `headerActions`, nell'ordine **Team** (persone), **Chat** (fumetto), ricerca. Team apre Team & Accesso, che resta anche in Impostazioni. Chat apre la Chat.
- **Alternativa (proposta dell'agente, da confermare)**: un'icona sola, Chat. Nella Chat, in alto, un'icona «Operatori» apre Team & Accesso. Motivo: il Team si usa una volta per collegarsi, la Chat ogni giorno, e l'intestazione su un telefono stretto ha poco spazio accanto a titolo e conteggio.
- Il numero dei non letti (e delle Richieste da fare, punto 4) sull'icona arriva solo con CT-B, perché oggi i messaggi con la Chat chiusa si perdono (CT04).
- In selezione l'icona sparisce come la ricerca.
- Barra della selezione: un pulsante **«Invia»** (aeroplanino) accanto a «categoria», che apre la Richiesta (punto 4) con i prodotti scelti. Lo stesso «Invia a un collega» nella Scheda.
- Con il login spento la Chat dice «Nessun collega collegato» e come collegarne uno, invece del benvenuto finto.

File: `src/screens/tabs/HomeScreen.tsx` (`:269-291`, `:469-486`), `src/screens/ChatScreen.tsx` (intestazione `:135-143`), `src/navigation/linking.ts`. Gli indirizzi `chat` e `settings/team` sono già nella fetta C2 di `map-3.md` (riga 55): basta non rifarli. Rischi per i dati: nessuno.

### 3.5 Come si proverebbe

`prova/ct-a-home.cjs`:
- in alto ci sono le icone scelte (Team, Chat e ricerca; oppure Chat e ricerca);
- Team apre la Chat;
- in selezione restano solo i pulsanti della selezione;
- «Invia» compare con almeno un prodotto selezionato;
- la Chat si riapre dall'indirizzo.

Regressioni: `a1-inventario` (ricerca e selezione), `stili-fette` per l'aspetto (lo lancia l'orchestratore). Telefono: tocco sull'icona con una mano, spazio dell'intestazione su uno schermo stretto.

---

## 4. Inviare, ricevere e gestire prodotti tra operatori

### 4.1 Che cosa esiste già

- Card in chat con SKU (punto 1). Non c'è un «invia questi prodotti scelti»: la card manda i primi 3 (`ChatScreen.tsx:87`).
- «Approva spostamento», «Sposta» e «Vendi» sulla card, che agiscono sul telefono che tocca (CT01, CT05).
- Movimenti con quantità (M04): `moveStock` con `trasferimento` da → a (`InventoryContext.tsx:541-547`). Ogni movimento è un evento `stock` con `qty`, `from`, `to`, `before`, `after`, causale e contatto (`types/index.ts:75-84`).
- Contatti (M10): fornitori e clienti, non operatori.
- Scaffali (S1a): solo per i pezzi unici; uno spostamento toglie lo scaffale (`inventoryOps.ts:18`, `:36`).
- Nessun concetto di operatore nei dati: nessun autore negli eventi (CT07), nessun «assegnato a», nessuna richiesta con uno stato.

### 4.2 Difetti

Quelli dei punti 1 e 2: soprattutto CT05, cioè inventari che divergono.

### 4.3 Che cosa manca

1. **Un inventario condiviso** tra gli operatori (punto 6). Senza, «mandare un prodotto» a un collega non ha senso: ognuno ha la sua copia, e uno spostamento sul telefono B non cambia il telefono A.
2. L'identità di chi manda, di chi riceve e di chi esegue.
3. Un oggetto con uno stato, che dica che cosa è stato chiesto, a chi, se è stato fatto e da chi.

### 4.4 Proposta: la Richiesta

**Il principio.** Un prodotto non «appartiene» a un operatore: sta in una posizione, eventualmente su uno scaffale, nello spazio di lavoro di tutti. Quindi «mandare un prodotto o una quantità a un collega» vuol dire **chiedergli di fare un'operazione** sull'inventario comune. La più frequente è spostare una quantità da una posizione a un'altra, per esempio dal Magazzino al Negozio, dove lavora lui.

**Un solo oggetto, la Richiesta**:

```
{ id, tipo: 'trasferisci',            // per ora solo questo; poi 'controlla' (conta/audit)
  righe: [{ productId, qty?, from, to, shelfId? }],   // qty solo per gli articoli a quantità
  da: operatore, a: operatore | 'team', nota,
  stato: 'aperta' | 'eseguita' | 'parziale' | 'rifiutata' | 'annullata',
  esiti: [{ productId, ok, motivo? }], creataIl, eseguitaIl?, eseguitaDa? }
```

**Il flusso** (il più semplice che non perde dati):
1. Il mittente sceglie i prodotti: selezione in Home, oppure la Scheda. Tocca «Invia» e indica il collega (o tutto il team), poi per ogni riga da dove, quanto (proposto «tutto» o 1) e verso dove (posizione, e scaffale per un pezzo unico). Le regole sono quelle di `MovementSheet`.
2. Nasce la Richiesta «aperta», salvata **nello spazio condiviso** come dato, non come comando dentro un messaggio. In chat compare una card che la mostra con lo stato aggiornato.
3. Il destinatario tocca «Ricevuto, sposta» oppure «Rifiuta» (con motivo).
4. Solo in quel momento il telefono del destinatario esegue, con le operazioni che ci sono già (`moveStock` trasferimento, `moveProduct` per il pezzo unico):
   - ogni riga si ricontrolla (giacenza, cestino, venduto, posizione che esiste);
   - ogni riga eseguita produce **un solo** evento `trasferimento` con `details.requestId` e id fisso `req:<idRichiesta>:<idProdotto>`;
   - le righe rifiutate hanno il loro motivo;
   - lo stato diventa «eseguita» o «parziale», con chi e quando.
5. Il mittente vede lo stato sulla card. Annullare si può solo finché la Richiesta è «aperta».

**Se invece ogni operatore ha la propria merce** (domanda 2: per esempio due negozi con spazi separati), la Richiesta non basta. Serve una **cessione**: uno scarico verso un contatto sul lato di chi manda (M10, causale nuova «cessione») e un carico da quel contatto sul lato di chi riceve, confermato alla ricezione. Sono due spazi, due inventari e due eventi. Il legame (id della cessione) serve a non caricare due volte. È più complesso e va deciso prima di scrivere codice.

**Perché niente «in transito».** È il modo più semplice: la merce resta dov'è finché chi la riceve non conferma. Se servono davvero merci in viaggio tra due sedi, basta una posizione «In transito» (due Richieste, una per tratto), senza un modello nuovo.

**Come non fare doppioni tra telefoni:**
- un solo canale porta i dati (punto 6);
- la Richiesta viaggia come dato con il suo stato, quindi la esegue una volta sola il telefono che la accetta, e la prima accettazione vince. Un telefono che la riceve già «eseguita» non fa nulla;
- l'id fisso dell'evento rende innocua una seconda esecuzione (evento già presente = salta);
- **mai** uno scarico sul telefono del mittente più un carico su quello del destinatario: con l'inventario comune conterebbe la merce due volte.

**Che cosa serve nei dati:**
- `details.requestId` e `details.by` (operatore) negli eventi: campi facoltativi, come vuole la regola B del ticket 10;
- la chiave `furinventory_requests:{spazio}`, che poi entra nello spazio condiviso.

**File da toccare:**
- `utils/requests.ts` nuovo, funzioni pure con i test: `requestOf`, `executeRequest` (dà gli eventi e le modifiche, oppure i motivi di rifiuto), `requestStatus`;
- `contexts/RequestsContext.tsx` nuovo;
- `src/components/chat/RequestCard.tsx`, che prende il posto delle azioni di `HydratedProductCard`;
- `src/screens/ChatScreen.tsx`;
- `src/screens/tabs/HomeScreen.tsx` (pulsante «Invia»);
- `src/screens/product/DetailScreen.tsx` (pulsante);
- `contexts/InventoryContext.tsx`: `moveStock` e `moveProduct` accettano un id di evento e il `requestId`;
- `types/index.ts`;
- più avanti la parte Supabase (una migrazione, con il sì dell'utente).

**Rischi per i dati:**
- Il rischio vero è la fusione del cloud (punto 6): due operatori che muovono quantità dello stesso articolo nello stesso momento.
- Un pezzo unico spostato perde lo scaffale (S1a). La Richiesta può indicare quello di arrivo.
- Una Richiesta verso una posizione che non c'è più va rifiutata, come V05.

### 4.5 Come si proverebbe

- **`prova/ct-b-richieste.cjs`**, su un solo telefono, perché esecuzione e stato non dipendono dalla rete:
  - Richiesta di 2 pz da Stand A a Vetrina: un solo evento `trasferimento` con `requestId`, giacenze giuste, stato «eseguita»;
  - accettarla una seconda volta (stato rimesso a mano nello storage, come in `v-runner-posizione-sparita`): nessun evento nuovo;
  - quantità che non c'è più: riga rifiutata, stato «parziale»;
  - pezzo unico verso uno scaffale: `shelfId` giusto;
  - posizione eliminata: rifiuto;
  - annullata: niente si muove.
- **Test jest** per `utils/requests.ts`.
- **Regressioni**: `m03-giacenza`, `m04-movimenta`, `s1-scaffali` (nessuna chiave di `stock` è uno scaffale), `m10-contatti`.
- **Due telefoni o due account (dopo L1/L2)**:
  - A invia, B riceve e accetta: su A lo stato cambia e la giacenza è quella di B;
  - A e B accettano nello stesso momento, offline, poi si ricollegano: un solo evento;
  - A sposta 1 pz mentre B ne sposta 2 dello stesso articolo: giacenza finale = somma degli eventi (punto 6).

---

## 5. «Lo stesso vale per le automazioni»

### 5.1 Stato attuale

- Le automazioni personali stanno in `@furinventory_custom_automations:{spazio}` (`AutomationsContext.tsx:77`).
- Non passano tra telefoni in nessun modo:
  - mesh: tabella WatermelonDB `automations`, vuota (CT10);
  - cloud: lo snapshot non le porta (L0 §6, `InventoryContext.tsx:165-172`).
- **Chat**: il messaggio porta `automationIds`, ma «Approva» non esegue nessuna automazione, sposta in vetrina (P28 b). L'id mandato è fisso e inesistente (CT08).
- **Condividi** (`AutomationFlowScreen.tsx:56-62`): un testo con il nome, il QR `AUTO:<id>` e i nomi dei passi. Non si può importare.
- **Il QR `AUTO:<id>`** vale solo sul telefono che ha creato l'automazione. Su un altro, lo Scanner non lo trova (`ScannerScreen.tsx:117-126`, `getAutomationByQR` cerca nell'elenco locale, `AutomationsContext.tsx:132-134`) e dice «Codice non riconosciuto». Dedotto: lo Scanner non è provato su un altro telefono.
- I passi «Sposta in X» tengono l'id della posizione (V05). Le posizioni non passano tra telefoni: su un altro telefono X può non esistere.

### 5.2 Difetti

| N | Che cosa | Causa | Gravità |
| --- | --- | --- | --- |
| CT16 | Il QR stampato di un'automazione non funziona sul telefono di un collega | letto nel codice: vedi 5.1 | comportamento |
| CT17 | Il messaggio con un'automazione non la esegue: «Approva» sposta sempre in Vetrina (P28 b) | `ChatScreen.tsx:110-124` | comportamento |

### 5.3 Le due letture della frase, e che cosa comporta ciascuna

**(A) Condividere le automazioni tra operatori.** Il responsabile crea un'automazione e tutti la trovano, oppure la manda in chat a un collega con «Aggiungi alle mie» o «Avvia».
- Serve che le automazioni entrino nello spazio condiviso (snapshot o tabella del cloud, oppure ciò che porterà la mesh).
- **Insieme a posizioni, scaffali, categorie e campi personalizzati**, perché i passi li richiamano per id. Senza, ricompare V05 su ogni telefono.
- Serve dire chi può modificare ed eliminare (ruoli, punto 2).
- Un'app più vecchia deve tollerare un tipo di passo che non conosce (`CustomRunnerScreen.tsx:316`, `:365`, rischio già scritto in A4 della verifica delle automazioni).
- Rischi: pochi. Gli id sono già unici (`auto_<ora>_<caso>`). Le modifiche contemporanee della stessa automazione: vince l'ultima, accettabile. Il conteggio d'uso può perdere qualche unità.

**(B) Usare le automazioni per mandare e ricevere prodotti.**
- In uscita: una lettura in fila (come Spostamento rapido) che alla fine **crea una Richiesta** verso un collega invece di spostare subito. È un passo «Invia a collega» nel costruttore.
- In arrivo: un'automazione «Ricevi» che, leggendo i pezzi arrivati, li confronta con la Richiesta (trovati, mancanti, in più, come l'Audit) e poi la esegue.
- Si appoggia al punto 4 e alle automazioni A1 (Ricevimento) e A3 (Trasferimento con quantità) della verifica delle automazioni. Vale V10: la quantità va chiesta.
- Rischi: quelli del punto 4, più le doppie letture (`BarcodeScanner.tsx:16`).

**File da toccare.**
- (A):
  - `contexts/AutomationsContext.tsx` (salvataggio nello spazio condiviso; importazione di un'automazione ricevuta con controllo dei passi);
  - `src/screens/automations/AutomationFlowScreen.tsx` («Invia in chat» al posto del testo di `:56-62`);
  - `src/screens/automations/CustomRunnerScreen.tsx` (passo sconosciuto o posizione assente: messaggio e fermo);
  - `src/screens/ChatScreen.tsx` e una card dell'automazione in `src/components/chat/`;
  - lato cloud: lo snapshot o una tabella (migrazione, con il sì dell'utente), insieme a `contexts/LocationsContext.tsx` e `contexts/ShelvesContext.tsx`.
- (B):
  - `utils/requests.ts` e `contexts/RequestsContext.tsx` del punto 4;
  - passo «Invia a collega» in `contexts/AutomationsContext.tsx` (`StepType`, `STEP_TYPE_META`) e `src/screens/settings/AutomationBuilderScreen.tsx`;
  - in `src/screens/automations/BatchMoveScreen.tsx`, la scelta «Invia come richiesta» a fine lettura;
  - una schermata nuova `src/screens/automations/ReceiveRequestScreen.tsx` sul modello di `AuditScreen.tsx`;
  - voce in `src/screens/tabs/AutomationsScreen.tsx` e indirizzi in `src/navigation/linking.ts`.

**Proposta.** Prima (B), se lo scopo è muovere merce tra operatori: è ciò che l'utente descrive con «inviare, ricevere o gestire». (A) costa poco dopo, una volta che nello spazio condiviso ci sono automazioni e posizioni. Tutte e due vogliono prima l'inventario condiviso.

### 5.4 Come si proverebbe

- (A): `prova/ct-c-automazioni.cjs`. Automazione inviata in chat → «Aggiungi alle mie» → compare nell'elenco con gli stessi passi; il suo QR è riconosciuto; un passo verso una posizione che non c'è → rifiuto (V05). Due telefoni: crea su A, usa su B.
- (B): dentro `ct-b-richieste.cjs`. Lettura di 3 prodotti → Richiesta con 3 righe; «Ricevi» con 2 letture → 1 mancante, stato «parziale».

---

## 6. Rapporto con il cloud

### 6.1 Stato attuale

- **Login spento** (`AuthContext.tsx:17`): spazio `local`, nessuna sincronizzazione (`cloudEnabled = !!session`, `InventoryContext.tsx:119`).
- La mesh LAN è l'unico codice che collega due telefoni. In pratica oggi **non collega nulla di utile**: non porta l'inventario (CT10) e probabilmente non si accoppia (CT12). Quindi oggi gli operatori non condividono niente.
- **L1** (login) accende la sessione, lo spazio dell'account e il Team cloud (inviti e ruoli, `SettingsScreen.tsx:53-93`, `:548-577`).
- **L2** porta i dati locali nello spazio dell'account. Lo snapshot condiviso contiene solo prodotti, cronologia, avvisi, cartelle ed eliminati. Il secondo operatore riceverebbe prodotti con posizioni, scaffali e contatti che non ha (L0 §6).
- **Ticket 10** è chiuso con la scelta B («nessun cambio a cloud e mesh») ed è giusto per un solo telefono. **Per più operatori va riaperto**: posizioni, scaffali, contatti, categorie, campi e automazioni nello spazio condiviso, più le regole sulle quantità.

**Come fonde il server** (letto nella copia delle migrazioni, `side-session-notes/local_12e15b39…/supabase-schema/functions/public.merge_inventory_snapshot.sql`):
- prodotti: per ogni id vince quello con `updatedAt` più recente, **il prodotto intero**;
- eventi: unione per id;
- eliminati: unione.

Esiste già, mai usata dall'app, una tabella **`operation_logs`** (migrazione `20260916054825`, righe 136-158). Ha `idempotency_key` unica, `actor_id`, `device_id`, `before_data`/`after_data` e `sync_status` con i valori `local`, `lan_sent`, `cloud_synced`, `conflict`, `failed`. È stata pensata proprio per operazioni registrate da più telefoni, anche via LAN.

### 6.2 Rischi di conflitto (dedotti, nessuno provato)

| N | Rischio | Perché | Quando conta |
| --- | --- | --- | --- |
| CT18 | **Giacenza persa con due operatori.** A scarica 1 da 5 (giacenza 4), B nello stesso momento ne scarica 2 (giacenza 3). Il server tiene il prodotto più recente (3) e **tutti e due gli eventi**: la Cronologia dice 2, la giacenza dice 3 invece di 2 | fusione per prodotto intero e unione degli eventi | da L2 in poi, con due operatori |
| CT19 | **Modifica locale cancellata dal tempo reale.** Una modifica fatta nei 900 ms prima del salvataggio nel cloud viene sostituita dallo stato di un altro operatore che arriva in quel momento: `setProducts(incoming.products)` sostituisce tutto (`InventoryContext.tsx:188-209`), poi il salvataggio manda lo stato già sostituito (`:155-186`) | il tempo reale sostituisce invece di fondere | da L2 in poi |
| CT20 | **Due motori con regole diverse.** Se un giorno la mesh portasse l'inventario (record per record con WatermelonDB) e anche il cloud (prodotto intero per `updatedAt`), le due fusioni darebbero risultati diversi e si rimanderebbero i dati a vicenda. Gli eventi non si doppiano (gli id restano), le giacenze sì | `sync.ts:130-155` contro la funzione del server | solo se si fanno entrambi |

Oggi nessuno di questi rischi è attivo, perché la mesh non tocca l'inventario e il cloud è spento.

### 6.3 Proposta semplice

1. **Un solo canale.**
   - Con internet: il cloud. La mesh resta ferma, marcata «sperimentale» (2.4), o si toglie.
   - Senza internet: la mesh porta lo stesso contenuto del cloud, con la stessa funzione di fusione scritta una volta in `utils/merge.ts` e usata dall'Host. Il cloud, se arriva, si allinea dall'Host.
2. **Giacenze dagli eventi** (contro CT18): dopo ogni fusione, `stock` degli articoli a quantità si ricalcola dalla somma dei movimenti (`replayStock`, `utils/stock.ts:257`). La giacenza iniziale è già un evento `carico/iniziale` (`inventoryOps.ts:86-97`). Rischio: articoli con `stock` senza la storia completa (import CSV, campionario) darebbero numeri sbagliati. Al primo passaggio nello spazio condiviso serve un evento «apertura» che pareggia. In alternativa, più avanti, il registro `operation_logs`.
3. **Il tempo reale fonde invece di sostituire** (contro CT19): stessa funzione di fusione anche sul telefono, con lo stato in arrivo più quello locale.
4. **Prima di accendere più operatori**, nello spazio condiviso vanno anche posizioni, scaffali, contatti, categorie, campi e automazioni (ticket 10 riaperto, dopo L2).

File: `contexts/InventoryContext.tsx` (`:155-209`), `utils/merge.ts` nuovo con i test, la funzione del server (migrazione, con il sì dell'utente), i contesti delle posizioni, degli scaffali e dei contatti per la sincronizzazione.

### 6.4 Come si proverebbe

- **Test jest** per `utils/merge.ts`: i casi CT18 (due scarichi contemporanei → giacenza = somma degli eventi) e CT19 (modifica locale più stato in arrivo → nessuna delle due persa).
- **Con L1/L2**, due account sullo stesso spazio, web più telefono:
  - lo scenario CT18 dal vivo;
  - lo stesso con un telefono offline che si ricollega;
  - la Richiesta del punto 4 accettata su tutti e due.

---

## 7. Prove pronte e non lanciate (server spenti)

Script `script/chat-team/ct-chat-team.cjs`. Usa `lib.cjs` e `a3-util.cjs` per percorso assoluto e scrive solo schermate in `SHOTS`. Si lancia da quella cartella con `SHOTS=<cartella> node ct-chat-team.cjs [scenario]`, uno scenario alla volta.

| Scenario | Che cosa mostra | Atteso oggi |
| --- | --- | --- |
| `ct-chat-sposta-card` | CT01 | VIS-0142 da vetrina a magazzino; finestra «SPOSTA su VIS-0142 — eseguito…» |
| `ct-chat-sku-sconosciuto` | CT05 (messaggio «ricevuto» simulato nello storico) | «In sincronizzazione…»; «Approva» → «1/1», 0 eventi |
| `ct-chat-ricarica` | P28 (a), (d), P29 (b) | 2 copie sullo schermo e 2 nello storico; chiave `chat_messages`; ricaricando, «Page Not Found» |
| `ct-home-icone` | punto 3 | un solo pulsante in alto (ricerca) |
| `ct-indexeddb` | CT10 sul web | nell'IndexedDB di LokiJS né «VIS-0142» né il messaggio, con 6 prodotti nell'inventario |
| `ct-due-contesti` | due operatori sul web | B non vede il messaggio di A; B come Client: «Confermi associazione?» poi «Connessione fallita» (porta 59999 di `127.0.0.1`, presumibilmente chiusa: nessun server avviato; controllarla prima) |

Da rilanciare insieme, senza modifiche: `prova/a3-chat.cjs` (P28, V15) e `prova/a4-impostazioni.cjs a4-imp-team` (P29). Nessuno dei due scrive file fuori da `SHOTS` (controllato con grep).

---

## Domande per l'utente

1. Dove lavorano gli operatori **c'è internet** (Wi-Fi o dati)? Se sì, un solo canale, il cloud, e la rete locale si ferma. Se no, la rete locale va rifatta prima di tutto il resto.
2. «Mandare un prodotto a un collega»: lavorate **tutti sulla stessa merce** (stesso magazzino o negozio, posizioni diverse) e il collega deve spostarlo e confermarlo? Oppure **ognuno ha la propria merce separata** (per esempio due negozi con inventari distinti)?
3. «Lo stesso vale per le automazioni»: vuol dire **condividere le automazioni** tra operatori, oppure **usarle per mandare e ricevere merce** (leggo i pezzi, li invio; il collega li legge all'arrivo e conferma)? Proposta: prima la seconda.
