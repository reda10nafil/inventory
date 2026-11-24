# Richieste dell'utente del 24 novembre 2026, mattina (scritte dall'orchestratore 4)

L'utente è tornato e ha scritto direttamente all'orchestratore 4. La carta bianca vale «fino al prossimo contatto»: adesso l'utente c'è, quindi le domande davvero necessarie si possono fare, poche e brevi (non vuole leggere tanto).

## Che cosa ha detto, in breve

- Mancano ancora molte cose che aveva chiesto: revisione dello scanner, NFC, GS1 Digital Link, campi personalizzati, configura layout, categorie, modelli di settore, import ed export.
- **Modelli di settore**: oggi sono fissi. Vanno resi modificabili, si devono poter aggiungere e creare, e in Aggiungi ci vuole un pulsante per sceglierli subito, «nel momento opportuno».
- **Import ed export**: non trova i link delle immagini. Chiede: «come faccio a caricare o scaricare i prodotti con le immagini per caricare nel sito, nel gestionale o in qualsiasi altra parte».
- **«Accesso e molti utenti»**:
  - va rifatto da zero, perché non funziona ed è pieno di difetti;
  - contiene **due funzionalità diverse**, che vanno separate.
- **Il lavoro va troppo piano**: chiede perché queste cose non risultano tra i task, perché non hanno un piano e perché non sono fatte.
- La sessione dell'orchestratore 4 è troppo grande. Finito il lavoro in corso, si passa all'**orchestratore 5**.

## Che cosa cambia (deciso dall'orchestratore 4)

1. **Nuovo ordine, con prima le richieste che l'utente ha nominato.** Dopo S1b:

   EDC → MOD → MCAT → **MSET** → FOTO → EXP → IMP → ETI → GS1 → N1 → N2 → S2 → S3 → FLU1 → CON → FLU2 → RIO → RES → CHAT1 → RIC1 → RIC2 → VOCI → RETE1.

   I brief non dipendono da S2 e S3, salvo l'informazione dello scaffale all'import, che ora vale «se S3 è fatta».
2. **MSET** (ticket nuovo 31): Modelli di settore modificabili e creabili, e pulsante «Modello» in Aggiungi. Brief in `mset/brief.md`.
3. **EXP**: si toglie la scelta «basta l'avviso». Si aggiunge «Esporta con le foto», uno ZIP con il CSV e la cartella `immagini/`, utile per caricare i prodotti su un sito o un gestionale. **IMP** importa lo stesso ZIP.

   I **link web pubblici** delle foto servono solo per gli import «da indirizzo» dei siti, e arrivano con il cloud (I1-I3, dopo il login).
4. **Ticket nuovo 32, «Accesso» e «Rete del negozio»**: oggi una sola voce di Impostazioni, «Accesso Multi-Utente», apre `TeamScreen`. Quella schermata mescola due cose:
   - Team e accesso: account e operatori;
   - la rete locale Host/Client col QR e la sincronizzazione.

   **Separazione proposta**: «Accesso» (login, operatori, ruoli, inviti) e «Rete del negozio» (collegare i telefoni e sincronizzare).

   Prima si fa una ricerca in sola lettura, **A0**, con un subagente dell'orchestratore 5 che lavora **in parallelo** alle fette, perché non scrive nel worktree. Ne escono:
   - l'elenco dei difetti, provati sul web;
   - il piano da zero delle due parti;
   - che cosa serve dall'utente, cioè il provider Google acceso in Supabase, le prove sul telefono e il sì alle migrazioni.

   Il ticket entra nel worktree col primo commit di documenti dopo A0. Se l'utente intendeva due funzionalità diverse da queste, lo dirà: la separazione proposta si può cambiare.
5. **Più velocità**:
   - la base di una fetta è il giro finale della fetta prima, se dopo non è cambiato codice; altrimenti si rilanciano solo le prove toccate dalle correzioni. Così si risparmiano circa 25 minuti a fetta;
   - l'orchestratore 5 valuta una **seconda corsia** in un worktree separato, per esempio ETI → GS1 → N1 su un branch a parte con la sua porta Metro (`APP` di `prova/lib.cjs` si può cambiare). Il branch si unisce a `funzioni/magazzino` dopo ogni fetta. Va fatto solo se l'avvio di un secondo server con `preview_start` e l'unione dei documenti restano semplici; altrimenti resta una corsia.

## Dove l'utente trova i task

`piani di implementazione/funzionalita/map-3.md` nel worktree, con le tabelle «Fette» e «Richiesta → ticket → fetta → prova → collaudo», e i ticket in `issues/20-30`. Da far vedere all'utente con un riepilogo semplice: per esempio, una pagina «Stato del lavoro» fatta dall'orchestratore 5, aggiornata a ogni fetta.
