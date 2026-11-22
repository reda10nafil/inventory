# Scaffale: riempimento e avvisi

Tipo: grilling. Stato: **chiuso** il 22 novembre 2026 sera (risposta dell'utente), **soglie da confermare**. Fette: S2 (riempimento), S3 (avviso e proposta). Dipende dai ticket 13 e 14.

## Question

Come si vede quanto è pieno uno scaffale, e che cosa succede quando è pieno?

## Risposta (utente)

- Ogni scaffale mostra **colore e percentuale** e quanto manca (volume, peso, pezzi).
- Durante un carico (automazioni, Movimenta, Aggiungi) il conto **si aggiorna a ogni articolo**.
- Dall'80-90% c'è un **avviso in rosso** («quasi pieno» / «pieno») con la **proposta di un altro scaffale adatto**.
- È un **avviso, non un blocco**.

## Da confermare (proposta dell'orchestratore, prima di S2)

Soglie: verde sotto il 50%, blu dal 50 all'80%, rosso dall'80%; «pieno» dal 100%. Colori dai ruoli del tema (successo, informazione, errore) nei 5 stili, mai scritti a mano.

## Scaffale proposto (decisione tecnica dell'orchestratore, da validare con i test in S3)

Tra gli scaffali della stessa posizione che restano sotto l'80% dopo il carico: prima quelli della categoria del prodotto, poi i generici; a parità, quello con più spazio libero. Se nessuno basta, l'avviso lo dice e non propone nulla.

## Come si torna indietro

Togliere l'avviso e la proposta: il riempimento resta solo un'informazione.
