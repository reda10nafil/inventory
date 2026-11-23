# Sincronizzazione

Tipo: grilling (deciso dall'agente). Stato: **chiuso** il 22 novembre 2026 (notte, regola 4 di `NOTTE_22_23.md`; da rivedere con l'utente).

**Riaperto il 23 novembre 2026** (mappa 3, ticket 30): l'utente vuole la rete locale del negozio (modem, nodi in magazzino e negozio) come canale principale anche senza internet, internet quando c'è, con un interruttore. La verifica `ricerche/verifiche-23/verifica-chat-team.md` ha trovato che la rete locale sincronizza tabelle WatermelonDB che l'app non scrive (CT10) e che il cloud perde una giacenza con due movimenti contemporanei (CT18). Il lavoro è la fetta RETE2: un solo spazio di lavoro su due canali con `utils/merge.ts` e le giacenze ricalcolate dagli eventi. La regola B qui sotto (campi facoltativi nel JSON) resta valida.

## Question

I campi nuovi rompono cloud (Supabase), Drive o mesh LAN?

## Opzioni

- A. Adattare subito tabelle cloud e schema WatermelonDB.
- B. **Solo campi facoltativi nel JSON** di prodotti e Cronologia: il login è spento e la mesh usa WatermelonDB, separato dall'inventario.

## Risposta

**B.** Nessun cambio al cloud né alla mesh in questa mappa. Quando il login tornerà acceso, un'app vecchia ignora i campi nuovi; i conflitti sulle quantità tra telefoni sono nella nebbia della mappa.

## Come si torna indietro

Nulla da annullare.
