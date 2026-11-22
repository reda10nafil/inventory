# Report ed export

Tipo: grilling (deciso dall'agente). Stato: **chiuso** il 22 novembre 2026 (notte, regola 4 di `NOTTE_22_23.md`; da rivedere con l'utente).

## Question

Quali report e in che formato?

## Opzioni

- A. Report a schermo con grafici.
- B. **Due export CSV** con il meccanismo di oggi (`utils/csv.ts`): giacenze e movimenti.

## Risposta

**B.** Giacenze: SKU, categoria, posizione, quantità, unità, scorta minima, sotto scorta (sì/no). Movimenti: data, SKU, tipo, quantità, da, a, causale, contatto, nota. L'export e l'import dei prodotti di oggi aggiungono le colonne Unità, Giacenza (per posizione, `posizione:quantità; …`) e Scorta minima, altrimenti un giro esporta-importa le perde (prova A2).

## Come si torna indietro

Togliere le due voci di export.
