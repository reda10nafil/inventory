# Scaffale: capacità

Tipo: grilling. Stato: **chiuso** il 22 novembre 2026 sera (risposta dell'utente). Fetta: S2. Dipende dal ticket 13.

## Question

La capacità si misura in pezzi, in peso, in volume o in più modi?

## Risposta (utente)

- **Tutte e tre le misure, ognuna facoltativa**: pezzi, peso massimo (kg) e volume (dalle dimensioni dello scaffale).
- **Il riempimento è la più alta delle tre.**
- Le automazioni usano queste misure per **suggerire da sole lo scaffale migliore** (ticket 15).
- Ai prodotti servono **altezza e profondità (o un volume) facoltativi**; lunghezza, larghezza e peso ci sono già.

## Calcolo (decisione tecnica dell'orchestratore)

- Peso e volume del prodotto sono **per unità**: l'occupazione è la somma di quantità × peso (o volume); i pezzi sono la somma delle quantità.
- Un prodotto senza peso o senza misure conta solo per i pezzi: non fa scattare un avviso che non si può calcolare.
- Funzioni pure in `utils/shelves.ts` con test jest.

## Come si torna indietro

Le misure sono facoltative: uno scaffale senza capacità non mostra riempimento.
