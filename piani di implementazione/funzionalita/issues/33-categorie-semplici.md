# Categorie semplici: albero, sottocategorie sulla riga, Elimina che sposta i prodotti

Tipo: decisione (orchestratore 5, al posto dell'utente). Stato: **fatto** il 24 novembre 2026, fetta **CAT1**, corsia C (`funzioni/codici`; SHA nel `git log` e nella voce di `../../CRONOLOGIA.md`). Collegato al [ticket 19](19-cartelle-categorie.md) (C1, categorie = cartelle) e al [ticket 25](25-campi-per-categoria.md) (MCAT, che si tiene la scelta in Aggiungi e Modifica). Piano e difetti: `cat0/proposta.md` e `cat0/difetti.md` nelle note dell'orchestratore.

## Le parole dell'utente (24 novembre)

> «Le categorie non è stata fatta come ho richiesto. In più c'è sottocategoria. Peccato che non si può selezionarla come sottocategoria. Perché sottocategorie ce n'è una che è pelliccia, però non si può togliere, non si può aggiungere.»

Lettura (CAT0, D1-D4): «Sottocategoria di» sembrava l'elenco delle sottocategorie ed era la scelta del genitore; la pillola non si toglieva; sulla riga non c'era un modo di aggiungere una sottocategoria; il modulo di modifica restava fuori dallo schermo; una categoria con prodotti non si eliminava, senza una via d'uscita.

## Decisione

**Impostazioni › Categorie è un albero, e ogni cosa si fa sulla riga.** Decisa dall'orchestratore al posto dell'utente, 24/11.

- **In cima** solo «Nome categoria (es: Giacche)» e «Crea Categoria»: crea una principale. Icona e codice si mettono dopo, nella finestra. Sparisce l'avviso «il barcode verrà salvato solo se…».
- **L'elenco è l'albero**: una card per principale, con la freccia che apre e chiude, «3 prodotti · 2 sottocategorie», le sottocategorie rientrate e in fondo **«+ Sottocategoria»** (campo «Es: Zaini» e «Aggiungi»; un doppione si dice sotto il campo). Di partenza è aperta una principale che ha sottocategorie.
- **Toccando una riga** si apre la **finestra della categoria** sopra l'elenco, nel punto dove si è (come Movimenta): Nome, Icona, **«Dove sta»** («Categoria principale» o «Dentro Pellicce», con la spunta; al posto di «Sottocategoria di»), il blocco Codice **così com'è**, «Elimina categoria», «Annulla» e «Salva Modifiche». Con sottocategorie, al posto di «Dove sta» la frase «Ha delle sottocategorie: resta principale.».
- **Elimina** (dalla riga o dalla finestra):
  - vuota: conferma, come prima;
  - **con prodotti**: «Pellicce ha 3 prodotti. Dove li sposto?», le altre categorie col nome completo e «Senza categoria», **nessuna scelta di partenza**; «Sposta ed elimina» sposta ogni prodotto con `updateProduct` (la Cronologia scrive «Categoria: pellicce → collezione-inverno») e poi elimina la categoria; «Annulla» non cambia nulla. I prodotti nel cestino perdono la categoria come prima (P09);
  - con sottocategorie: rifiutata come prima, e l'albero si apre e le mostra, ognuna col suo «Elimina»;
  - usata da uno scaffale: rifiutata come prima (S1a), controllata **prima** dei prodotti.
- **I dati non cambiano**: `libraries`, `parentId`, `libraryId` come sono, nessuna migrazione. Un livello di sottocategorie nelle schermate; i dati vecchi con più livelli si vedono rientrati.

## Dentro (CAT1)

Casi 1-11 di `cat0/proposta.md`, in `src/screens/settings/FoldersScreen.tsx` e `utils/categories.ts` (`productsInCategory`, `categoryDeleteStep`, `categoryMoveTargets`, `moveQuestion`, `placeChoices`, `savedParentId`; test in `__tests__/categories.test.ts`). Prova `prova/cat1-categorie.cjs` (12 scenari), collaudo **CF-B1** in `prova/collaudo.cjs`, foglio `prova/stili-cat1.jpg`.

Dopo il parere del revisore (secondo commit): «Dove sta» non toccato lascia la categoria dov'è, così un albero vecchio a più livelli (dati importati) non si appiattisce salvando la sola icona, e la frase dice «resta dentro Pellicce» quando serve; il tasto Indietro con il lettore aperto chiude solo il lettore; «Sposta ed elimina» ricontrolla sottocategorie e scaffali prima di spostare.

## Fuori (annotato)

- Casi 12-13, la scelta in Aggiungi e Modifica («Pellicce › Visone» con la ×, Categoria in cima): **MCAT** (ticket 25).
- Il codice che nasce da solo alla creazione e la finestra «Codice ed etichetta» al posto del blocco Codice: **ETI**. «Collega un tag» al posto di «Barcode / NFC (Opzionale)»: **N1**.
- «ID: …» sulla riga (D9): resta, perché lo leggono quattro prove; lo toglie UX1-4.
- «Pellicce» predefinita in ogni spazio nuovo (D5, `InventoryContext.tsx:32-34`): non toccata. **Domanda per l'utente**: uno spazio nuovo deve partire senza categorie?
- La Cronologia scrive l'id della categoria («pellicce»), non il nome: è `describeChanges` di prima, uguale per «Sposta in categoria» dell'Inventario.

## Rischio controllato

`deleteLibrary` conta i prodotti da `productsRef`: `updateProduct` lo aggiorna subito, quindi l'eliminazione va nello stesso tocco degli spostamenti. Provato con il caso 8 (`cat1-sposta-elimina`): i 3 prodotti spostati, 3 eventi, Pellicce eliminata. Se un giorno `deleteLibrary` dicesse di no dopo lo spostamento, la schermata lo dice («… spostati, ma "Pellicce" non si è potuta eliminare»).

## Da rivedere con l'utente

Righe in `../../DECISIONI_DA_RIVEDERE.md` (24/11, CAT1): «Sposta ed elimina» cambia la regola C1 della categoria con prodotti; «Sottocategoria di» diventa «Dove sta»; «Pellicce» predefinita negli spazi nuovi.
