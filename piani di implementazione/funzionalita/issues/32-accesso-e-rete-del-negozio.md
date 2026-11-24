# «Accesso» e «Rete del negozio»: due funzioni separate, rifatte da zero

Tipo: research (A0, fatta il 24 novembre 2026) + task. Stato: **piano pronto, separazione da confermare con l'utente**. Fette: **ACC1**, **RETE0**, **ACC3** (nuove); **RETE2a / RETE2b** (RETE2 divisa); cambiano CHAT1 e L1 (ticket 20, 30). Difetti: `AR01…AR23` e i `CT..` della verifica del 23. Mappa: [`../map-3.md`](../map-3.md). Richieste del giorno: [`../richieste-utente-24-novembre.md`](../richieste-utente-24-novembre.md). Esiti, script e piano completo di A0: `side-session-notes/local_e2f2734a…/a0/` (`difetti.md`, `piano.md`, `serve-dall-utente.md`).

## Richiesta dell'utente (24 novembre)

«Accesso Multi-Utente» va **rifatto da zero**: non funziona, è pieno di difetti e contiene **due funzionalità diverse**, da separare.

## Che cosa ha trovato A0

- La voce «Accesso Multi-Utente» apre `TeamScreen`, che è **solo rete locale**: Host e Client, QR, una «sincronizzazione» che non porta l'inventario (CT10), un collegamento alla Chat e ruoli finti.
- Account, spazi e inviti stanno in un'altra sezione, «Team e spazi di lavoro», spenta col login: due «Team» nelle stesse Impostazioni.
- **Provati sul web**: Host creato da solo, con «Host pronto» e un dispositivo «Online» anche quando fallisce, ritentato a ogni rientro (CT09, AR02); «Payload inviato» senza collegamenti (CT13); «Sincronizza ora» muto (AR04); segno verde su un collegamento fallito (AR05); errori con `adb` e il nome del router (AR06); chiamata ad `api.ipify.org` dal web (AR11); testi del cloud falsi con il login spento (AR12).
- **Solo sul telefono** (dedotti): aggancio probabilmente impossibile (CT12); server riavviato dal QR e da ogni rientro (CT11, AR10).
- **Accesso, letto nel codice**: login obbligatorio quando acceso (AR15); errori di Google non mostrati (AR16); Drive chiesto al primo accesso (AR17); inviti senza ruolo, elenco e revoca (AR18); ruoli mai applicati (AR19).

## Decisioni proposte (da confermare: `a0/serve-dall-utente.md`, domande 1-4)

1. **Due voci** in Impostazioni › «Persone e telefoni»: **«Accesso»** (nome di questo telefono, account Google facoltativo, spazio, operatori, ruoli, inviti) e **«Rete del negozio»** (centro e telefoni collegati, rete locale anche senza internet, internet quando c'è, interruttore). Vanno via «Team e spazi di lavoro» e «Accesso Multi-Utente».
2. Il **centro (Host) non parte mai da solo** e sul web non si sceglie; il codice dura quanto la sessione e «Nuovo codice» non scollega nessuno; la connessione vive in un contesto sopra la navigazione.
3. **Testi onesti**: finché l'inventario non passa (RETE2a), la Rete dice «per ora passano solo i messaggi della Chat».
4. **Un solo elenco di ruoli** in italiano (Titolare, Responsabile, Operatore, Solo lettura), `utils/roles.ts`; senza account ogni telefono è Titolare.
5. **Nome del telefono** (`device:v1:profile`) come identità senza login: mittente in Chat e autore negli eventi (CT07).
6. **RETE2 divisa**: RETE2a inventario comune sulla sola rete locale, senza login; RETE2b internet e interruttore, dopo L1, L2, ACC3.
7. **L1 diventa il blocco «Account» di Accesso**: login facoltativo, errori mostrati, solo `openid email profile`.
8. Icona **Team** in Home → «Rete del negozio».

## Fette

| Fetta | Cosa | Dipende da | Prova |
| --- | --- | --- | --- |
| **ACC1** | Impostazioni con le due voci; `AccessScreen` (questo telefono, account onesto, spazio, ruoli spiegati); `utils/roles.ts`; testi veri (AR09, AR12, AR13) | – | `acc1-accesso.cjs`, jest `roles.test.ts` |
| **RETE0** | `StoreNetworkScreen` e `StoreNetworkContext` al posto di `TeamScreen` e `useMeshRole`; scelta esplicita, niente Host sul web né ipify, esiti ed errori veri (AR01-AR08, AR11, CT13, CT14); QR senza riavvio e server che non parte da solo (CT11, AR10, CT09), scritti qui e provati in RETE1; `settings/team` resta come indirizzo vecchio | ACC1 | `rete0-rete.cjs` con un centro finto in Node |
| CHAT1 (cambia) | senza il punto 3 (passa a RETE0); icona Team → Rete | RETE0 | `chat1-chat-team.cjs` |
| RETE1 (uguale) | CT12, due telefoni, riconnessione, Chat a schermata chiusa | RETE0, CHAT1 | due telefoni |
| **RETE2a** | `utils/merge.ts`, giacenze dagli eventi, inventario comune sulla rete locale | RETE1 | `merge.test.ts` + due telefoni |
| L1 = ACC2 (cambia) | Account in Accesso: facoltativo, errori, ambiti ridotti (AR15-AR17, AR22) | ACC1; provider Google acceso | prova reale (accede l'utente) |
| L2 (uguale) | Dati locali nello spazio dell'account | L1 | ticket 20 |
| **ACC3** | Operatori, ruoli e inviti veri, con migrazioni (AR18, AR19, AR21) | L1, L2 | due account Google |
| **RETE2b** | Internet e interruttore; il centro allinea il cloud (CT19) | RETE2a, ACC3 | due telefoni + internet |

**Ordine proposto dall'orchestratore 5** (le richieste nominate dall'utente prima): … IMP → ETI → GS1 → N1 → N2 → **ACC1 → RETE0** → S2 → S3 → FLU1 → CON → FLU2 → RIO → RES → CHAT1 → RIC1 → RIC2 → VOCI → RETE1 → **RETE2a** → I1 → (branch di L1: L1 → L2 → I2 → I3 → **ACC3** → **RETE2b**) → RIC3. ACC1 e RETE0 partono solo dopo la conferma della separazione.

## ACC1: confine e decisioni (24 novembre, corsia B)

Fatta su `funzioni/scaffali` (worktree `inventory-scaffali`), dopo S3. Le parole dell'utente del secondo messaggio del 24: profilo con foto, nome e dati dell'operatore; un amministratore che gestisce i permessi; nella Cronologia chi ha fatto che cosa e quando.

**Dentro (fatto):**
1. **Impostazioni › «Persone e telefoni»** con due voci e lo stato nel sottotitolo: «Accesso» («Mario Rossi · Titolare», oppure «Titolare · nome da scrivere») e «Rete del negozio» («Non collegato», «Collegato a un centro», «Fa da centro»; riletto a ogni ritorno su Impostazioni, e sul web mai «Fa da centro», perché lì un centro non può esistere). Vanno via «Team e spazi di lavoro», «owner · attiva», «Accesso Multi-Utente» e «Mesh LAN • QR Host/Client • Sync 100%» (AR09, AR13). «Rete del negozio» apre la schermata di oggi (`settings/team`), che prende il titolo «Rete del negozio»: il resto lo rifà RETE0.
2. **`AccessScreen`** (`settings/access`, freccia verso Impostazioni, `linking.ts`, `PARENT_TAB`, `compat.ts`):
   - il profilo dell'operatore: foto in un cerchio da 56, nome, telefono e ruolo;
   - il nome di questo telefono («Banco 1»);
   - l'account detto com'è: «Spazio locale», «Accesso con Google» spento, «Backup Google Drive» spento col motivo;
   - il ruolo di questo telefono, con i quattro ruoli spiegati;
   - la tabella dei permessi.
   Tutto si salva da solo e si rilegge dopo una ricarica.
3. **`utils/roles.ts`** (jest `roles.test.ts`):
   - ruoli Titolare, Responsabile, Operatore, Solo lettura;
   - azioni: aggiungere, modificare e movimentare, vendere, eliminare, cambiare le impostazioni, gestire i ruoli;
   - `can(ruolo, azione, tabella)`, `deniedReason`, `normalizePermissions`.
   **`utils/profile.ts`** (jest `profile.test.ts`) ha profilo, autore e riga «chi». Le chiavi sono per telefono: `device:v1:profile` e `device:v1:permissions` (`contexts/ProfileContext.tsx`).
4. **Testi veri** (AR12):
   - «Backup Google Drive» spento col motivo anche in Impostazioni › Dati e backup, senza la finestra «Accedi di nuovo con Google…»;
   - in Info «Dove stanno i dati» al posto di «la sincronizzazione avviene con Supabase».
5. **Autore nella Cronologia**: ogni evento nuovo porta `author: { id, name?, device? }`. La Cronologia lo mostra come «Mario · Banco 1 · 24 nov 2026, 10:42»; gli eventi di prima mostrano «—».

**Permessi applicati oggi** (azione spenta col motivo, mai nascosta). La riga del motivo, col lucchetto, sta sopra il blocco: per esempio «Il ruolo Operatore non può eliminare. Lo decide il Titolare in Accesso.».
- Aggiungere: «Aggiungi all'Inventario» in Aggiungi; «Importa prodotti CSV» e il riquadro di trascinamento in Impostazioni.
- Modificare: «Modifica» e «Movimenta» della Scheda.
- Vendere: «Venduto» dell'Azione rapida; causale «Vendita» di Movimenta (Scheda e Azione rapida).
- Eliminare: Elimina della selezione in Home; «Elimina per sempre», «Svuota» e l'eliminazione dei campi nel Cestino.
- Impostazioni: le voci di Configurazione hardware, Gestione inventario (Cestino compreso) e Condivisione.
- Gestire i ruoli: la tabella dei permessi in Accesso.

**Fuori** (con chi le prende):
- Permessi non applicati: automazioni (Audit, Spostamento rapido, Vendita col lettore, Nota a più prodotti, Conta, esecuzione delle automazioni personali); «Spostato», «Carico» e «Scarico» dell'Azione rapida; «Sposta in categoria» della selezione in Home; Chat (Vendi, Approva spostamento); «Ripristina» del Cestino. Restano fuori anche le schermate aperte scrivendo l'indirizzo (`product/edit/…`, `settings/fields`…), perché la porta d'ingresso è spenta ma la schermata no.
  Arrivano con gli account (ACC3), quando i ruoli saranno veri; la schermata lo dice («Nel resto dell'app i permessi arriveranno con gli account»).
- La Rete del negozio rifatta, chi è online, da quanto e l'ultima volta: RETE0.
- La Chat in Home: CHAT1.
- Account, inviti e ruoli veri col cloud: L1 e ACC3.
- Gli eventi arrivati da un altro telefono: RETE2a.
- L'autore nella «Cronologia dettagliata» della Scheda: `DetailScreen`, file della corsia A, toccato solo per Modifica e Movimenta.
- Il resto delle Impostazioni in 6 gruppi: UX1-1.

**Decisioni** (decise dall'orchestratore al posto dell'utente, 24/11):
1. **Il ruolo del telefono si cambia sempre da Accesso.** Senza login non c'è un'altra via d'uscita: un telefono messo «Operatore» non tornerebbe più Titolare. La tabella dei permessi la cambia solo chi può «gestire i ruoli», cioè il Titolare: la sua riga e la colonna «gestire i ruoli» sono fisse. La schermata lo dice: «I ruoli diventano sicuri con gli account: oggi valgono su questo telefono e si cambiano da qui.». I ruoli locali proteggono dagli errori, non da chi vuole aggirarli (anche lo storage del browser si cambia a mano).
2. **Autore senza migrazione.** La Cronologia è un elenco JSON in `inventory:v1:local:timeline` e ogni evento nuovo passa da `addTimelineEvent`. Il campo facoltativo `author` sta in cima all'evento, non dentro `details`. È un'istantanea: id, nome e nome del telefono di quel momento. Nessun evento si riscrive. La tabella `timeline` di WatermelonDB (che ha già `created_by`) non è su questo percorso.
3. **Nessuna scrittura all'apertura.** L'id del profilo nasce alla prima modifica in Accesso o al primo evento. Senza nomi scritti l'autore è «Questo telefono».
4. **Foto locale piccola**: `data:image/jpeg`, sul web un quadrato centrale 160×160 (circa 5 KB), sul telefono larga 160 con le proporzioni (non provato), con un limite di 150.000 caratteri. Un `blob:` non sopravvive a una ricarica, e lo storage del browser ha la stessa quota dell'inventario.
5. **Azioni spente toccabili e inerti.** Restano attenuate e il tocco non fa nulla; il motivo sta nella riga sopra. Niente `disabled`, che sul web diventa `aria-disabled`.
6. **Inviti e cambio di spazio tolti da Impostazioni.** Con `LOGIN_ENABLED = false` erano codice morto. ACC3 li rifà in Accesso con i ruoli; il codice di prima è a `1db2c12`, `SettingsScreen.tsx:59-99` e `:543-589`.
7. **L'autore è dichiarato, non verificato** (parere del revisore): senza account chiunque scrive «Mario», e anche la Cronologia si cambia dallo storage. Dice chi ha fatto che cosa, non lo prova; diventa affidabile con gli account (ACC3) e gli eventi firmati dal telefono che li manda (RETE2a).

## RETE0: confine e decisioni (24 novembre, corsia B)

Fatta su `funzioni/scaffali` (worktree `inventory-scaffali`), dopo ACC1. Le parole dell'utente del secondo messaggio del 24: l'interfaccia per collegare gli operatori non funziona e non si capisce come collegarsi; non si vede se qualcuno è davvero collegato, se la connessione va, quanti sono online, da quanto e l'ultima volta online. La vuole semplice e moderna.

**Dentro (fatto):**
1. **`StoreNetworkScreen`** («Rete del negozio», indirizzo nuovo `settings/network`, intestazione con la freccia verso Impostazioni) al posto di `TeamScreen`. `settings/team` resta come indirizzo vecchio e apre la stessa schermata.
   - In cima **lo stato in una riga**, col pallino e il testo: «Non collegato», «Collegamento al centro "Magazzino"…», «Collegato al centro "Magazzino" · 3 telefoni online», «Il centro "Magazzino" non risponde da 2 min», «Questo telefono è il centro · 2 telefoni collegati», «Centro spento».
   - **All'entrata non si sceglie nulla e non parte nulla**: due scelte grandi, «Fai da centro del negozio» (sul web spenta, col motivo «Sul computer non si può: usa un telefono che resta acceso in negozio.») e «Collegati a un centro» (leggi o scrivi il codice). Nessuna richiesta esterna: via `api.ipify.org` (AR02, AR11, CT09).
   - **Codice controllato prima della domanda** (AR05): vuoto, non un codice, senza chiave, fuori dalla rete locale → il motivo in parole sotto il campo, niente finestra. Poi la domanda in pagina: «Collegarti al centro "Magazzino"? Gli altri telefoni ti vedranno come «Mario · Banco 1».»
   - **Esito vero** (CT13, AR03, AR06): collegato solo dopo la risposta del centro; se no «Il centro non risponde: controlla che sia acceso e sulla stessa rete Wi-Fi.», senza segno verde, senza indirizzi, porte, «Host», router o `adb`. Un primo collegamento fallito non salva nulla, non riprova da solo e non lascia nulla in memoria (prima un messaggio scritto in Chat partiva verso l'indirizzo mai raggiunto, col codice).
   - **Telefoni della rete** in righe da 56: nome dato in Accesso, «online dalle 10:42» o «visto alle 10:40», pallino verde o grigio col testo «Online» / «Non in linea». In testa il centro, poi questo telefono («Questo telefono · …»).
   - **«Che cosa passa»** detto com'è (AR01): «Per ora passano solo i messaggi della Chat; l'inventario non passa ancora.», con «Apri la Chat» (fino a CHAT1) e l'avviso «Usala solo sulla rete Wi-Fi del negozio: i messaggi passano senza cifratura.». Via «Sincronizza ora», «Invia light payload», «Heartbeat ogni 5s», i ruoli finti e il codice di accesso a video (AR04, AR07, AR08).
2. **`contexts/StoreNetworkContext.tsx`** al posto di `useMeshRole`: la connessione vive sopra la navigazione (uscire dalla schermata non riavvia nulla, AR10). Con il ruolo «nessuno» non apre socket, non avvia timer, non scrive chiavi e non apre il database della Chat. Un centro a cui ci si è collegati si ricorda in `network:v1:{org}:settings` e ci si ricollega da soli alla riapertura.
3. **Presenza e battito veri** (CT14), in funzioni pure (`utils/storeNetwork.ts`, jest `storeNetwork.test.ts`):
   - `hello` col nome di questo telefono; il centro risponde col suo nome e manda a tutti l'elenco (`presence`: chi è collegato, da quando, l'ultima volta), a ogni entrata e uscita;
   - un segnale ogni 10 s; il centro che tace da 30 s «non risponde», e chi era online diventa «visto alle…»; si riprova da soli dopo 2, 5, 10 e poi ogni 15 s, finché non si tocca «Scollegati»;
   - le ore sono riportate all'orologio di questo telefono e scritte a mano («dalle 10:42», «il 23 nov alle 18:03»), senza la lingua del sistema.
4. **La voce di Impostazioni dice lo stato vero**, dal contesto: «Non collegato», «Collegamento in corso», «Collegato al centro "Magazzino"», «Il centro non risponde», «Fa da centro · 2 telefoni», «Centro spento».
5. **Il centro sul telefono** (`src/services/meshServer.ts`, `startCenter` in `meshSync.ts`), scritto qui e **non provato**: resta a RETE1. Parte solo con «Fai da centro del negozio» o «Accendi il centro» (mai da solo, nemmeno alla riapertura: CT09); il codice si salva e si riusa; «Nuovo codice» cambia il codice senza riavviare il server e senza scollegare nessuno (CT11, AR10); nome e telefoni in `hello` e `presence`; chi tace da 30 s esce dagli online; `/pull` e `/push` rispondono 404 (l'inventario non passa: AR01, CT15); un messaggio della Chat non torna a chi lo ha mandato.

**Fuori** (con chi le prende):
- La Chat in Home, il mittente e i messaggi doppi sul web: CHAT1.
- Due telefoni veri, il centro vero, il QR letto dalla fotocamera, la riconnessione col telefono in tasca, CT12: RETE1 (CF-T6).
- L'inventario comune e gli eventi da un altro telefono: RETE2a. Internet e cloud: RETE2b, L1.
- Le funzioni di prima di `meshSync.ts` (`createHostRoom`, `joinRoom`, `syncDatabase`) restano nel file ma nessuno le chiama più: le toglie o le rifà RETE2a.

**I dati dell'inventario non si toccano**: solo schermate, testi e la chiave per telefono `network:v1:{org}:settings`. Niente Supabase.

**Decisioni** (decise dall'orchestratore al posto dell'utente, 24/11):
1. **Indirizzo nuovo `settings/network`**, con `settings/team` come indirizzo vecchio verso la stessa schermata: la voce di Impostazioni porta a quello nuovo.
2. **Chi si collega si ricollega da solo, il centro no.** Un telefono collegato ricorda il centro e riprova da solo; un telefono che faceva da centro si riapre con «Centro spento» e il pulsante «Accendi il centro». Sul web il ruolo «centro» salvato torna «nessuno».
3. **Il codice del centro resta lo stesso finché non si tocca «Nuovo codice»** (il ticket diceva «dura quanto la sessione»): così chi si è già collegato si ricollega da solo anche dopo che il centro è stato spento e riacceso. Limite: dopo un codice nuovo, chi cade non rientra e vede «non risponde» (il centro rifiuta prima dell'aggancio e il telefono non distingue i due casi); la schermata lo dice quando il centro non risponde («Se il centro ha fatto un codice nuovo, scollegati e leggi quello.»).
4. **Solo indirizzi della rete locale**: il codice è `ws://IP:PORTA?token=…&name=…` e si accettano solo `10.x`, `172.16-31.x`, `192.168.x`, `169.254.x` e `127.x` (questo computer, per le prove). Il codice si salva sul telefono in chiaro, come le altre chiavi, e non si mostra mai su chi si collega; sul centro solo con «Mostra il codice».
5. **Che cosa si accetta da un telefono sconosciuto**: niente prima di un `hello` col codice giusto; del `hello` solo un id (80 caratteri, lettere e cifre) e un nome (40 caratteri, senza caratteri di controllo o di direzione); cornici fino a 1 MB; elenco dei telefoni fino a 50, più 20 andati via. Sul telefono che si collega la presenza mandata dal centro si pulisce allo stesso modo. Il codice è un segreto condiviso su una rete senza cifratura: protegge dagli errori, non da chi ascolta la rete; diventa sicuro con gli account (ACC3) e gli eventi firmati (RETE2a).
6. **«3 telefoni online» conta anche il centro e questo telefono**; i telefoni andati via restano «visto alle…» finché il centro è acceso (l'elenco non si salva).
7. **Senza nomi in Accesso** il telefono è «Telefono senza nome» per gli altri e «Questo telefono» nel proprio elenco; l'id del profilo nasce al primo collegamento (come al primo evento in ACC1).

## Verifica

- **ACC1**: Impostazioni con «Accesso» e «Rete del negozio» e senza «Team e spazi di lavoro»; nome del telefono salvato e riletto dopo una ricarica; «Spazio locale» e «Titolare»; «Backup Google Drive» spento col motivo; nessuna richiesta a `supabase.co`; `settings/access` dall'indirizzo, freccia verso Impostazioni.
- **RETE0**: all'entrata nessuna scelta e nessuna richiesta esterna; «Fai da centro» spento sul web; `abc` rifiutato; porta chiusa con un messaggio in parole, senza segno verde; collegamento al centro finto, messaggio, centro spento («non risponde»), riconnessione; `settings/team` porta alla schermata nuova.
- Regressioni da aggiornare: `a3-chat`, `a4-impostazioni`, `c2-indietro`, `c2-util`, `collaudo` (CF-A2), `ind-indietro`, `ct-chat-team`, `stato-da-indirizzo.mjs`.
- Telefono (RETE1, RETE2a): CF-T6, «non provato» fino alla prova. Branch di L1: accesso reale fatto dall'utente, inviti tra due account (CF-T8).

## Come si torna indietro

ACC1 e RETE0 cambiano solo schermate, testi e una chiave nuova per telefono: nessun dato dell'inventario si tocca. L'indirizzo `settings/team` resta. Le parti cloud stanno sul branch di L1, con `LOGIN_ENABLED = false` su quello condiviso.
