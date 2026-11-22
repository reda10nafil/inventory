# Categorie

Tipo: grilling (deciso dall'agente). Stato: **chiuso** il 22 novembre 2026 (notte, regola 4 di `NOTTE_22_23.md`; da rivedere con l'utente).

**Superato dal [ticket 19](19-cartelle-categorie.md)** il 22 novembre sera (risposta dell'utente): le categorie sono le cartelle, «Tipo di pelle» torna un campo. Quanto segue descrive M01 com'è nel codice finché la fetta C1 non la rifà.

## Question

Il campo di base «Tipo di pelle» offre solo la lista fissa `FUR_TYPES`: come renderlo valido per qualsiasi prodotto?

## Opzioni

- A. Lasciare i tipi di pelle e usare i campi personalizzati: la Categoria resterebbe obbligatoria e sbagliata per altri prodotti.
- B. **Una lista di categorie per spazio, modificabile**, che parte dai tipi di pelle di oggi (stessi id), con l'etichetta «Categoria».

## Risposta

**B.** Il dato resta `furType` (nessuna migrazione); l'etichetta diventa «Categoria»; la lista sta in un **contesto piccolo e separato** come Posizioni (`contexts/CategoriesContext.tsx`, chiave `furinventory_categories:{org}`), fuori dall'elenco di chiavi di `InventoryContext` (che la vecchia migrazione legge per posizione e il ramo cloud riscrive con `[]`). Predefinita = `FUR_TYPES`, quindi chi ha pellicce vede le stesse voci. Impostazioni › Categorie per aggiungere, rinominare ed eliminare (una categoria usata da prodotti non si elimina, si può solo rinominare). Un prodotto con un id che non è più in lista mostra l'id, come per le posizioni.

## Come si torna indietro

Rimettere `FUR_TYPES` nelle tre schermate e l'etichetta «Tipo di pelle»; la chiave delle categorie si ignora.
