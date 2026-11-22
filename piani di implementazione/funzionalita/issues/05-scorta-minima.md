# Scorta minima e riordino

Tipo: grilling (deciso dall'agente). Stato: **chiuso** il 22 novembre 2026 (notte, regola 4 di `NOTTE_22_23.md`; da rivedere con l'utente).

## Question

Come avvisare quando un articolo scende sotto la scorta minima?

## Opzioni

- A. Notifiche del telefono: servono permessi e un servizio in background.
- B. **Avviso nell'app** come quelli di oggi (`dormant`, `promotion_suggestion`).

## Risposta

**B.** `minStock` si imposta in Aggiungi e Modifica (sezione Magazzino). Avviso nuovo `low_stock` («VIS-0142: 2 pz, scorta minima 5») generato con gli altri: entra nel conteggio e nel filtro «Attenzione» dell'Inventario e nella card. Nessun filtro in più: basta Attenzione.

## Come si torna indietro

Togliere il tipo `low_stock` da `generateAlerts`.
