# Chat e Team: prodotti e automazioni tra operatori, rete del negozio

Tipo: grilling + research (verifica). Stato: **verificato** il 23 novembre 2026 mattina (solo lettura del codice: i server erano spenti, le prove sono pronte e non lanciate) e **deciso dall'utente** in quattro risposte. Fette: **CHAT1**, **RETE1**, **RETE2**, **RIC1**, **RIC2**, **RIC3**. Riapre il ticket 10 (sincronizzazione). Mappa: [`../map-3.md`](../map-3.md). Verifica completa: [`../ricerche/verifiche-23/verifica-chat-team.md`](../ricerche/verifiche-23/verifica-chat-team.md) (difetti `CT01…CT19`), prove pronte in `../ricerche/verifiche-23/script/chat-team/ct-chat-team.cjs`.

## Question

Come devono funzionare Chat e Team perché gli operatori possano inviare, ricevere e gestire uno o più prodotti tra loro (e le automazioni), dove si aprono, e su quale rete viaggiano i dati?

## Richiesta e risposte dell'utente (23 novembre mattina)

- Alla proposta di nascondere Chat e Team: **«Deve essere inserito nella pagina home, vicino all'icona di ricerca, magari accanto all'icona di chat. Devi capire come funzionano, perché così dovrà poter inviare, ricevere o gestire uno o più prodotti tra gli operatori. Lo stesso vale per le automazioni.»**
- Internet dove lavorano gli operatori? **«Non è frequente, quindi è necessario avere lo switch, utilizzare una rete locale tramite il modem e collegarsi tramite il modem anche senza Internet, oppure con Internet quando è possibile. Dovrebbe gestire tutto come una rete mesh, usando i nodi o i modem nel magazzino e nel negozio.»**
- Stessa merce o merce separata? **«Stessa merce»**: un inventario comune.
- Le automazioni? **«Tutte e due, prima la prima»**: prima le automazioni che inviano e ricevono merce, poi la condivisione delle automazioni.

## Stato verificato (sintesi; letto nel codice a `7bfcd72`)

- **La Chat oggi non parla con nessuno**: si apre solo da Impostazioni › Accesso Multi-Utente; i messaggi restano sul telefono che li scrive. Le card agiscono sulla copia **locale** di chi le riceve, trovata per SKU (CT05: inventari che si separano); «Sposta» va sempre tra vetrina e magazzino e dice «eseguito» anche se rifiutato (CT01 = P28 b, AU-V15); dati sbagliati nella card (CT06: niente quantità, id della posizione, tipo di pelle al posto della categoria, cestino con i pulsanti attivi); nessun mittente (CT07); testi di prova (CT08). P28 a, c, d riconfermati.
- **Su un telefono collegato** ogni messaggio comparirebbe 3 volte (CT02), quelli tra due Client si perdono (CT03), quelli con la Chat chiusa spariscono (CT04): dedotti, servono due telefoni.
- **Team (rete locale)**: chi apre Team diventa Host da solo (CT09 = P29 a); **la rete sincronizza tabelle WatermelonDB che l'app non scrive mai**, quindi inventario, giacenze, movimenti e automazioni non passano (CT10) mentre i testi dicono «Sync 100%»; il QR rigenerato ogni 120 s riavvia il server e scollega tutti (CT11); **l'aggancio probabilmente non riesce mai su telefono**: l'handshake WebSocket usa `crypto` di Node, che in React Native non c'è (CT12, la prima cosa da provare con due telefoni); «Invia payload test» dice sempre «inviato» (CT13); testi che promettono cose che non ci sono (CT14); difetti del motore di sincronizzazione oggi nascosti (CT15).
- **Home**: in alto c'è solo la ricerca; l'icona della Chat non esiste ancora.
- **Cloud** (L1/L2): fonde i prodotti per `updatedAt` e unisce gli eventi per id; due movimenti di quantità contemporanei tengono entrambi gli eventi ma perdono una giacenza (CT18); il tempo reale sostituisce invece di fondere (CT19).
- Due «Team» diversi (rete locale con ruoli finti, cloud con inviti e ruoli veri nascosti dal login spento); nessuna identità dell'operatore negli eventi.
- Automazioni tra telefoni: il QR stampato di un'automazione non funziona sul telefono di un collega (CT16 → RIC3); il messaggio con un'automazione non la esegue, «Approva» sposta sempre in Vetrina (CT17 → CHAT1 per «Approva», RIC2 per l'esecuzione vera); due motori di fusione con regole diverse se rete locale e cloud portassero entrambi l'inventario (CT20 → RETE2: una sola funzione `utils/merge.ts`).

## Decisioni

- **Utente**: Chat e Team restano e diventano utili; icone in Home vicino alla ricerca; inventario comune; **rete locale del negozio come canale principale anche senza internet, internet quando c'è, con un interruttore**; prima le automazioni che inviano e ricevono merce, poi la condivisione.
- **Proposte dell'orchestratore** (dal resoconto):
  - in Home, come chiesto alla lettera, due icone a sinistra della ricerca: **Team** (persone) e **Chat** (fumetto); nella selezione dei prodotti e nella Scheda un pulsante **«Invia»**;
  - **un solo oggetto per mandare merce: la Richiesta «Trasferisci»**, salvata nell'inventario comune ed **eseguita una sola volta** da chi la accetta, con un solo evento di trasferimento (id fisso `req:<idRichiesta>:<idProdotto>`); mai uno scarico su un telefono più un carico sull'altro (conterebbe la merce due volte); niente «in transito» (se serve, una posizione «In transito»);
  - **un solo contenuto e una sola funzione di fusione** per i due canali (`utils/merge.ts`): la rete locale porta lo stesso spazio di lavoro del cloud, non le tabelle WatermelonDB; **le giacenze si ricalcolano dagli eventi** dopo ogni fusione (contro CT18), con un evento «apertura» al primo passaggio;
  - l'interruttore in Impostazioni: **Automatico** (rete locale sempre, internet quando c'è; l'Host allinea il cloud) / **Solo rete locale** / **Solo internet**.

## Piano di implementazione

### Fetta CHAT1 — Chat e Team onesti e raggiungibili (dopo C2; nessun rischio per i dati)

1. Home (`HomeScreen.tsx`): icone Team e Chat a sinistra della ricerca (spariscono in selezione come la ricerca).
2. Chat: senza colleghi collegati dice «Nessun collega collegato» e come collegarne uno; via i testi di prova (CT08); messaggi non doppi (P28 a); storico per spazio (P28 d, chiave `chat_messages:{org}` letta anche dalla vecchia); card con quantità, nome della posizione e dello scaffale, categoria vera, cestino senza pulsanti (CT06); «Sposta» con la scelta della destinazione e il rifiuto detto (CT01, P28 b, AU-V15); «Vendi» con conferma e prezzo (P28 c); niente `useInventory()` dentro un `try` (regole degli hook).
3. Team: marcato «sperimentale» finché RETE1 non è provata; il ruolo si sceglie, l'Host nasce solo col pulsante e si chiude uscendo (CT09); il QR non riavvia il server (CT11); errori detti (CT13); via le promesse false (CT10, CT14: «Sync 100%», «Heartbeat», «uso singolo»).
4. File: `HomeScreen.tsx`, `ChatScreen.tsx`, `src/components/chat/HydratedProductCard.tsx`, `TeamScreen.tsx`, `useMeshRole.ts`, `meshSync.ts`, `SettingsScreen.tsx`. Gli indirizzi `chat` e `settings/team` arrivano con C2.

### Fetta RETE1 — la rete del negozio si collega davvero (prova con due telefoni)

1. Chiudere CT12: accettazione WebSocket calcolata senza `crypto` di Node (SHA-1 e Base64 puri, con test contro il vettore della RFC 6455).
2. Prova con due telefoni sullo stesso modem, senza internet: aggancio, messaggio in tutte e due le direzioni, tre telefoni (CT02, CT03), Chat chiusa (CT04, con una coda dei messaggi e il numero dei non letti sull'icona).
3. Esito scritto nel ticket: se l'aggancio non regge su Android (permessi, risparmio energetico, libreria TCP), si decide con l'utente come ripiegare prima di RETE2.

### Fetta RETE2 — un solo spazio di lavoro su due canali, con l'interruttore (dopo RETE1 e L1/L2)

1. `utils/merge.ts` con test: fonde due copie dello spazio (prodotti per `updatedAt`, eventi per id, giacenze **ricalcolate dagli eventi** con `replayStock`), scritta una volta e usata dall'Host della rete locale, dal telefono che riceve il tempo reale (CT19) e dalla funzione del server (migrazione Supabase, **con il sì dell'utente**).
2. La rete locale porta lo stesso contenuto del cloud: inventario, eventi, e prima di accendere più operatori anche posizioni, scaffali, categorie, contatti, campi, modulo e automazioni (ticket 10 riaperto). I difetti CT15 del motore vecchio non si ereditano: il motore WatermelonDB si toglie o resta solo per la Chat.
3. Interruttore in Impostazioni (Automatico / Solo rete locale / Solo internet) con lo stato in una riga («Collegato al Magazzino via rete locale», «Internet: allineato alle 10:42»).
4. Identità dell'operatore negli eventi (`details.by`) e nei messaggi (CT07): forma da decidere (nebbia della mappa).

### Fetta RIC1 — la Richiesta «Trasferisci» (dopo CHAT1 e FLU1; tra telefoni dopo RETE2)

1. `utils/requests.ts` con test (`requestOf`, `executeRequest`, `requestStatus`), `contexts/RequestsContext.tsx` (chiave `furinventory_requests:{org}`, che entra nello spazio comune), `src/components/chat/RequestCard.tsx` al posto delle azioni della card di oggi.
2. «Invia» dalla selezione in Home e dalla Scheda: collega (o tutto il team), per ogni riga da dove, quanto e verso dove (regole di `MovementSheet`, scaffale per i pezzi unici).
3. Il destinatario tocca «Ricevuto, sposta» o «Rifiuta» (con motivo); solo allora il suo telefono esegue con `moveStock`/`moveProduct` (che accettano l'id dell'evento e `requestId`), ricontrollando ogni riga; stato «eseguita», «parziale», «rifiutata»; annullabile solo se «aperta»; una Richiesta già «eseguita» non si riesegue.
4. Prima di RETE2 la Richiesta funziona sullo stesso telefono (operatore che la crea e la accetta): così si prova sul web.

### Fetta RIC2 — automazioni che inviano e ricevono merce (dopo RIC1)

- Passo «Invia a collega» nel costruttore e scelta «Invia come richiesta» a fine lettura nello Spostamento rapido; automazione «Ricevi» (`ReceiveRequestScreen.tsx`, sul modello dell'Audit) che legge i pezzi arrivati, li confronta con la Richiesta (trovati, mancanti, in più) e poi la esegue; quantità chiesta per gli articoli a quantità (AU-V10).

### Fetta RIC3 — automazioni condivise (dopo RETE2)

- Le automazioni entrano nello spazio comune insieme a posizioni, scaffali, categorie e campi (i passi li richiamano per id); «Invia in chat» con «Aggiungi alle mie» o «Avvia»; chi può modificare ed eliminare secondo i ruoli; un'app più vecchia tollera un passo sconosciuto (fetta ESE).

## Piano di verifica

- **CHAT1**: prova `prova/chat1-chat-team.cjs` (dagli scenari pronti `ct-chat-*` di `ct-chat-team.cjs`): icone in Home; Chat senza colleghi; messaggio non doppio; «Sposta» della card verso la destinazione scelta e rifiuto detto per un capo nel cestino; «Vendi» con conferma e prezzo; Team senza Host creato da solo; ricarica di `chat` e `settings/team` senza NotFound. Regressioni: `a3-chat.cjs`, `a4-impostazioni.cjs`, `c2-indietro.cjs`. 5 stili: `stili-chat1.jpg`.
- **RETE1**: jest dell'accettazione WebSocket; **due telefoni** (resoconto §2.5): aggancio sullo stesso modem senza internet, messaggi nei due versi, tre telefoni, Chat chiusa.
- **RETE2**: jest `merge.test.ts` (due movimenti contemporanei dello stesso articolo → giacenza giusta; prodotti per `updatedAt`; eventi per id; evento «apertura»). Due telefoni: modifica offline su entrambi, riconnessione, stesso inventario e stesse giacenze; poi internet acceso, cloud allineato; interruttore nei tre modi.
- **RIC1**: jest `requests.test.ts` (esecuzione una sola volta, righe rifiutate col motivo, Richiesta già eseguita ignorata, posizione sparita rifiutata). Prova `prova/ric1-richieste.cjs` sullo stesso telefono: Invia dalla selezione → card «aperta» → «Ricevuto, sposta» → un solo evento con `requestId`, giacenze giuste → seconda accettazione senza effetto. Due telefoni dopo RETE2.
- **RIC2, RIC3**: prove `ric2-automazioni.cjs`, `ric3-condivise.cjs` con lo stesso schema; due telefoni dopo RETE2.

## Come si torna indietro

CHAT1 cambia solo schermate e testi. La Richiesta è un dato nuovo facoltativo che usa le operazioni di sempre. RETE2 tocca la fusione dei dati: va dietro all'interruttore, con «Solo internet» che resta il comportamento del cloud di L1/L2.
