# Movimenti

Tipo: grilling (deciso dall'agente). Stato: **chiuso** il 22 novembre 2026 (notte, regola 4 di `NOTTE_22_23.md`; da rivedere con l'utente).

## Question

Dove e come registrare carico, scarico, trasferimento e rettifica, con causale, data e storico in Cronologia?

## Opzioni

- A. Collezione nuova `movements`: separata dallo storico, andrebbe sincronizzata e mostrata a parte.
- B. **Eventi della Cronologia** di un tipo nuovo: lo storico c'è già, è filtrabile, si salva e si sincronizza con il resto.

## Risposta

**B.** `TimelineEvent.type` aggiunge `'stock'`; `details` aggiunge `movement: 'carico' | 'scarico' | 'trasferimento' | 'rettifica'`, `qty`, `from`/`to` (posizioni), `reason` (causale: acquisto, reso, vendita, uso interno, danno, conta, altro), `note`, `before`/`after` (giacenza totale), `contactId` (ticket 07). Una sola funzione pura `applyMovement(product, movimento)` calcola il nuovo `stock`, rifiuta quantità non positive o uno scarico oltre la giacenza della posizione e restituisce prodotto ed evento; il contesto li salva insieme. Spostamento e vendita di oggi restano eventi `moved` e `sold` (ticket 03).

## Come si torna indietro

Togliere il tipo `stock`: gli eventi già scritti restano nello storico come dati non mostrati.
