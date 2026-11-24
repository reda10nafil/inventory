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

## Allargamento del 24 novembre, secondo messaggio dell'utente

Testo dell'utente in [`richieste-utente-24-b-novembre.md`](../richieste-utente-24-b-novembre.md).

- **Separazione confermata nei fatti** dal secondo messaggio: da una parte profili, amministratore e permessi (Accesso), dall'altra collegamento e presenza (Rete del negozio). La Chat esce dalla Rete e va in Home (CHAT1).
- **Rete del negozio, in più**: collegarsi in modo ovvio (niente codici da scrivere senza spiegazione); vedere **chi è collegato adesso**, **quanti sono online**, **da quanto** e **l'ultima volta online** di ognuno; stato della connessione in una riga («Collegato al centro», «Il centro non risponde da 2 min»). Fetta RETE0 (schermata e contesto, provati sul web con il centro finto), RETE1 (sul telefono).
- **Accesso, in più**: **profilo dell'operatore** con foto, nome e dati (telefono, ruolo); **amministratore** che gestisce i **permessi** (che cosa può fare ogni ruolo). Senza login: profilo per telefono (chiave per telefono, foto locale) e ruoli applicati sul telefono; con il login (L1, ACC3) i profili e i ruoli vanno nello spazio dell'account. Fetta ACC1 (profilo e ruoli locali, sul web), ACC3 (inviti e ruoli veri col cloud).
- **Cronologia con l'autore**: ogni evento nuovo porta **chi** l'ha fatto (profilo del telefono, poi l'account) e la Cronologia lo mostra («Mario · Banco 1 · 10:42»); gli eventi vecchi restano senza autore («—»). Fetta ACC1 (campo facoltativo negli eventi, nessuna riscrittura), RETE2a per gli eventi arrivati da un altro telefono.
- **Ordine** (dal secondo messaggio): dopo le corsie A (campi), B (scaffali), C (codici e NFC): **ACC1 → RETE0 → CHAT1**, poi le automazioni (FLU1, CON, FLU2, RIO, RES), poi RIC1, RIC2, VOCI, RETE1, RETE2a e il branch di L1.

## Verifica

- **ACC1**: Impostazioni con «Accesso» e «Rete del negozio» e senza «Team e spazi di lavoro»; nome del telefono salvato e riletto dopo una ricarica; «Spazio locale» e «Titolare»; «Backup Google Drive» spento col motivo; nessuna richiesta a `supabase.co`; `settings/access` dall'indirizzo, freccia verso Impostazioni.
- **RETE0**: all'entrata nessuna scelta e nessuna richiesta esterna; «Fai da centro» spento sul web; `abc` rifiutato; porta chiusa con un messaggio in parole, senza segno verde; collegamento al centro finto, messaggio, centro spento («non risponde»), riconnessione; `settings/team` porta alla schermata nuova.
- Regressioni da aggiornare: `a3-chat`, `a4-impostazioni`, `c2-indietro`, `c2-util`, `collaudo` (CF-A2), `ind-indietro`, `ct-chat-team`, `stato-da-indirizzo.mjs`.
- Telefono (RETE1, RETE2a): CF-T6, «non provato» fino alla prova. Branch di L1: accesso reale fatto dall'utente, inviti tra due account (CF-T8).

## Come si torna indietro

ACC1 e RETE0 cambiano solo schermate, testi e una chiave nuova per telefono: nessun dato dell'inventario si tocca. L'indirizzo `settings/team` resta. Le parti cloud stanno sul branch di L1, con `LOGIN_ENABLED = false` su quello condiviso.
