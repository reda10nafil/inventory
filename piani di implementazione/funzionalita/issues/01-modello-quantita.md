# Modello delle quantità

Tipo: grilling (deciso dall'agente). Stato: **chiuso** il 22 novembre 2026 (notte, regola 4 di `NOTTE_22_23.md`; da rivedere con l'utente).

## Question

Come rappresentare quantità, unità e giacenza per posizione senza rompere i pezzi unici di oggi (un prodotto = una pelliccia, una `location`, `status` disponibile o venduto)?

## Opzioni

- A. Un campo `quantity` e una sola posizione: semplice, ma non dice quanto c'è in ogni posizione.
- B. Registro dei movimenti come unica fonte e giacenza sempre calcolata: corretto, ma ogni schermata dovrebbe ricalcolare e i dati di oggi andrebbero convertiti in movimenti iniziali.
- C. **Giacenza salvata per posizione sul prodotto** (`stock: { [idPosizione]: quantità }`) più i movimenti nello storico (ticket 02): saldo e giornale, come nei gestionali.

## Risposta

**C.** Campi nuovi, tutti facoltativi, in `Product`:
- `unit?: string`: unità di misura (predefinita «pz»; scelte rapide pz, kg, m, l, conf.);
- `stock?: Record<string, number>`: giacenza per posizione;
- `minStock?: number`: scorta minima (ticket 05).

Due tipi di prodotto, distinti solo dalla presenza di `stock`:
- **pezzo unico** (tutti i prodotti di oggi e quelli nuovi senza quantità): nessuna riscrittura, si legge come giacenza 1 nella sua `location` se disponibile e non nel cestino, 0 altrimenti; vendita e spostamento come oggi;
- **articolo a quantità**: diventa tale quando l'utente gli dà una quantità in Aggiungi o fa il primo movimento dalla Scheda; da lì `stock` è la verità e ogni scrittura passa da `applyMovement`.

Regola di lettura, una sola funzione pura `stockOf(product)` in `utils/stock.ts`; chi chiede «il prodotto è in questa posizione?» usa `isAt(product, posizione)` (non più `p.location === x`). `location` resta la **posizione principale** (quella mostrata nella card); per un articolo a quantità si ricalcola dopo ogni movimento (resta se ha ancora giacenza, altrimenti la posizione con più quantità). Quantità decimali per kg, m, l: arrotondate a 3 decimali, «2,5» accettato.

Coerenza (dopo il parere del revisore): per un articolo a quantità `location` e giacenza non si cambiano a mano in Modifica (sola lettura, «usa Movimenta»); `moveProduct`, `sellProduct` e lo spostamento di Audit e Spostamento rapido passano dalla giacenza **nello stesso commit** in cui un prodotto può ricevere `stock` per la prima volta. I calcoli si fanno dentro l'aggiornamento dello stato (`setProducts(prev => …)`), non sulla copia letta prima.

## Come si torna indietro

Togliere i tre campi e `utils/stock.ts`; i prodotti senza `stock` non sono mai cambiati.
