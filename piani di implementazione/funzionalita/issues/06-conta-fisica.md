# Conta fisica

Tipo: grilling (deciso dall'agente). Stato: **chiuso** il 22 novembre 2026 (notte, regola 4 di `NOTTE_22_23.md`; da rivedere con l'utente).

## Question

Come fare l'inventario fisico con le quantità e registrare le differenze?

## Opzioni

- A. Allargare l'Audit di oggi (scansione: trovato, mancante, intruso): pensato per i pezzi unici e legato alla fotocamera.
- B. **Schermata nuova «Conta»** (da Automazioni): scelta della posizione, elenco degli articoli attesi con la quantità prevista, quantità contata scritta a mano, riepilogo delle differenze, conferma.

## Risposta

**B.** Alla conferma tutte le differenze diventano movimenti `rettifica` con causale «conta», scritti con **una sola chiamata al contesto** (un aggiornamento per tutta la conta, non uno per articolo), così nessuna rettifica si perde e `before`/`after` sono giusti. Gli articoli attesi in una posizione si trovano con `isAt`. L'Audit resta com'è (usa anch'esso `isAt`).

## Come si torna indietro

Togliere la schermata; le rettifiche già fatte restano nello storico.
