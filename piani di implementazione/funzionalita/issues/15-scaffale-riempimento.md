# Scaffale: riempimento e avvisi

Tipo: grilling. Stato: **chiuso** il 22 novembre 2026 sera, **aggiornato il 23 mattina** (risposta dell'utente: soglie confermate e **blocco** quando il prodotto non entra; vedi in fondo). Fette: S2 (riempimento, **fatto il 24 novembre**, vedi in fondo), S3 (avviso, blocco e proposta, **fatto il 24 novembre**, vedi in fondo). Dipende dai ticket 13 e 14.

## Question

Come si vede quanto è pieno uno scaffale, e che cosa succede quando è pieno?

## Risposta (utente)

- Ogni scaffale mostra **colore e percentuale** e quanto manca (volume, peso, pezzi).
- Durante un carico (automazioni, Movimenta, Aggiungi) il conto **si aggiorna a ogni articolo**.
- Dall'80-90% c'è un **avviso in rosso** («quasi pieno» / «pieno») con la **proposta di un altro scaffale adatto**.
- ~~È un **avviso, non un blocco**.~~ **Superato il 23 mattina**: vedi «Blocco» qui sotto.

## Soglie (confermate dall'utente il 23 mattina)

Verde fino al 50%, blu fino all'80%, rosso oltre l'80%; «pieno» al 100%. Colori dai ruoli del tema (successo, informazione, errore) nei 5 stili, mai scritti a mano.

## Blocco (risposta dell'utente, 23 novembre mattina)

> «Quando cercherò di mettere una scatola più grande […] oppure il 21° pezzo, allora mi ferma e mi dice è pieno, ha raggiunto il suo massimale, per cui mi consiglia un altro scaffale più adatto per quella categoria lì.»

Alla proposta «avviso dall'80%; blocco quando il prodotto non entra (un lato più grande dello scaffale, peso oltre il massimo, pezzi oltre il massimo), con la proposta di un altro scaffale adatto della stessa categoria» la risposta è stata **«Sì, così»**:

- **avviso** dall'80%, con la proposta di un altro scaffale;
- **blocco** quando il prodotto non entra: un lato troppo grande (`fitsShelf`, ticket 14), peso oltre il massimo, pezzi oltre il massimo, volume oltre il massimo;
- con il blocco, la **proposta di uno scaffale adatto**: prima della stessa categoria, poi generico; un tocco la sceglie;
- **nessun «Metti comunque»** (scartato dall'utente).

Casi che la risposta non copre (**proposte dell'orchestratore, da confermare quando S3 è la prossima**):

- **Conta** (rettifica in aumento), **Audit «Sposta qui»** e **import CSV** registrano merce che è già fisicamente lì: niente blocco, solo l'informazione «scaffale oltre il limite» (nel riepilogo della Conta, nella conferma dell'Audit, nell'anteprima dell'import).
- **Posizioni con `capacity`** (Spostamento rapido, oggi «Usa comunque»): stessa regola degli scaffali (blocco oltre il massimo, con la proposta), contando i pezzi e non i prodotti (AU-V13).

## Scaffale proposto (decisione tecnica dell'orchestratore, da validare con i test in S3)

Tra gli scaffali della stessa posizione in cui il prodotto **entra** (`fitsShelf`) e che restano sotto l'80% dopo il carico: prima quelli della categoria del prodotto (o di una categoria che la contiene, come in S1a), poi i generici; a parità, quello con più spazio libero. Se nessuno basta, il messaggio lo dice e non propone nulla.

## Piano di implementazione (fetta S3, dopo S2 e COD)

1. Funzione pura `checkShelfLoad(scaffale o posizione, prodotti, in arrivo)` in `utils/shelves.ts` → `{ livello: 'ok' | 'avviso' | 'blocco', motivo, proposta? }`, con test. Usa `fitsShelf`, `shelfLoad` e la regola dello scaffale proposto.
2. Un hook `useLoadCheck()` che tutte le schermate chiamano: nessuna copia del calcolo.
3. Punti di carico (elenco verificato in `verifica-automazioni.md` §3.1, più quelli che `map-2.md` non nominava):
   - Aggiungi (blocco Magazzino), Modifica (cambio di scaffale), Movimenta (carico e trasferimento), Azione rapida («Spostato», Carico), Spostamento rapido (conto aggiornato a ogni articolo, in pezzi, peso e volume; il controllo di oggi diventa la prima chiamata), esecuzione delle automazioni (passo «Sposta»): **avviso e blocco**;
   - Conta, Audit «Sposta qui», import CSV: solo informazione (vedi sopra, da confermare);
   - Chat: secondo la fetta CHAT (ticket 30).
4. Lo scaffale come destinazione nelle automazioni: la lettura del codice di uno scaffale dà `{ locationId, shelfId }` (lettore unico della fetta COD, ticket 22); la posa sullo scaffale degli articoli a quantità segue la forma delle chiavi decisa in S1b: **`stockKey(locationId, shelfId)` = `posizione/idScaffale`** (ticket 13). Per S3: la quantità di un prodotto su uno scaffale è `qtyAt(prodotto, stockKey(posizione, scaffale))` (esatta), quella di una posizione `qtyAt(prodotto, posizione)` somma già i suoi scaffali; un pezzo unico su uno scaffale vale 1 su quella chiave; `shelfUsage` conta già i prodotti con giacenza sullo scaffale.
5. Messaggio del blocco: motivo in una riga, scaffale proposto con il pulsante «Usa A2», «Annulla». Colori dai ruoli del tema.

## Piano di verifica

- Jest: `checkShelfLoad` (soglie 50/80/100, blocco per lato, peso, pezzi, volume; proposta: categoria, poi generico, poi più spazio; nessuna proposta se nessuno basta).
- Prova nuova `prova/s3-avvisi.cjs`:
  - ripiano da 2 pezzi: il secondo pezzo dà l'avviso, il terzo il blocco con la proposta, il tocco sulla proposta lo posa lì;
  - prodotto 60×40×20 su ripiano 50×50×30: blocco «non entra» a scaffale vuoto;
  - prodotto da 12 kg su scaffale da 10 kg: blocco;
  - stessi casi in Aggiungi, Movimenta, Azione rapida, Spostamento rapido, esecuzione;
  - Conta e Audit: nessun blocco, solo l'informazione;
  - lettura del codice di uno scaffale come destinazione.
- Regressioni: `a3-batchmove.cjs` (capienza della posizione, che cambia comportamento: aggiornare l'atteso con la decisione), `s1-scaffali.cjs`, `s2-capacita.cjs`, `m04-movimenta.cjs`, `m09-azione.cjs`, `m07-conta.cjs`, `a3-audit.cjs`, `controllo.sh`.
- 5 stili: `stili-s3.jpg` (avviso e blocco).

## Come si torna indietro

Togliere il blocco e lasciare l'avviso; o togliere entrambi: il riempimento resta solo un'informazione.

## Riempimento fatto in S2 (24 novembre 2026, corsia B)

- **Fatta la parte del riempimento** (fetta S2, ticket 14): `fillLevel` in `utils/shelves.ts` (il più alto tra pezzi, peso e volume; percentuale per difetto, così 199 su 200 è 99% e non «pieno»; verde fino al 50%, blu fino all'80%, rosso oltre, «Pieno» al 100%, «Pieno (110%)» sopra), barra alta 6 con la percentuale scritta accanto («72%», revisione UX0) in `components/ShelfFill.tsx` con i ruoli del tema `success`, `info`, `error` (nei 5 stili, `stili-s2.jpg`), in Impostazioni › Scaffali (con «Liberi: … pezzi · … kg») e nella Scheda («Spazio sullo scaffale»). Uno scaffale senza limiti non ha barra. Prova `s2-capacita.cjs` · `s2-riempimento`; collaudo CF-D2.
- **Pronto per S3**: `fitsShelf` (motivo del blocco «non entra»), `shelfLoad` (carico in pezzi, kg e cm³ dalle chiavi `posizione/scaffale`), `fillLevel` (soglie dell'avviso), `fitCount` e `fitCountText` (perché lo scaffale proposto va bene: «A2: ne entrano ancora 5», aggiunta della corsia B del 24), `shelvesOfProduct`. Il carico «in arrivo» di `checkShelfLoad` si fa sommando la quantità al `ShelfLoad` (pezzi + q, peso + q × peso, volume + q × volume) e richiamando `fillLevel`.
- **Resta a S3** (invariato): avviso, blocco e proposta nei punti di carico; lo scaffale come destinazione nelle automazioni (aggiunta della corsia B del 24); posizioni con `capacity` in pezzi (AU-V13).

## Avviso, blocco e proposta fatti in S3 (24 novembre 2026, corsia B)

**Confine** (decisione scritta qui, come chiedeva il brief): S3 fa i punti 1-3 e 5 del piano, la capienza delle posizioni in pezzi (AU-V13, ticket 29) e, dalla corsia B del 24, **lo scaffale come destinazione** nello Spostamento rapido e nei passi «Scansiona Posizione» / «Sposta in» dell'esecuzione (preso da FLU1: il punto 4 è superato). Restano fuori la Chat (CHAT) e, in FLU1, la quantità nel trasferimento delle automazioni e i flussi nuovi.

- **Un solo calcolo** (punto 1): in `utils/shelves.ts` `checkShelfLoad(scaffale, prodotti, in arrivo, altri)` → `{ level: 'ok' | 'avviso' | 'blocco', name, fill, reason, proposal }`, `checkPlaceLoad` per una posizione con `capacity` (pezzi), `checkPlaceCount` per la Conta; `loadOf` / `placeLoad` contano un articolo in kg o metri come **1 pezzo** per scaffale (e in kg la quantità vale anche come peso); test in `__tests__/loadCheck.test.ts`.
- **Soglie**: avviso dall'80% (la percentuale per difetto, la stessa accanto alla barra), «sarà pieno» al 100%; **blocco** se un pezzo non entra a scaffale vuoto (`fitsShelf`: lato, altezza della barra, peso di un pezzo) o se dopo il carico si supera un limite, sulla quantità vera (30,2 kg su 30 non entrano anche se la barra direbbe «Pieno»). Motivo con i numeri: «21 pezzi, il massimo è 20», «32 kg, il massimo è 30 kg», «16 grucce, il massimo è 15», «Un lato di 60 cm è più grande di 50 cm», «Lo spazio non basta: si arriverebbe al 128%».
- **Proposta** («Scaffale proposto»): gli altri scaffali della stessa posizione dove il prodotto entra e che restano sotto l'80% dopo il carico, prima la categoria del prodotto (o una sopra), poi i generici, a parità il più libero; quelli senza limiti dopo quelli con i limiti. Il perché con `fitCountText` («Su G1 ne entrano ancora 10 come questo»). Per una posizione: la prima dopo nell'elenco con posto (senza capienza entra sempre). Nessuna adatta: la finestra lo dice e non c'è il pulsante.
- **Hook** (punto 2): `hooks/useLoadCheck.ts` (`check`, `checkMove`, `checkCount`), sulla copia più recente dei prodotti (`latestProducts`, nuovo nel contesto): il conto si aggiorna a ogni articolo, anche con due letture nello stesso istante.
- **Schermate** (punti 3 e 5, UX0 piano-fette «S3»): avviso in linea su `warningSurface` sotto lo Scaffale o la destinazione, «R2 sarà pieno all'85%» con «Usa G1» dove si può scegliere (`components/LoadNotice.tsx`); blocco in una finestra dal basso «Non entra in R2», motivo, perché, «Metti in G1 (libero al 90%)» e «Annulla» (`components/LoadBlockSheet.tsx`, `useLoadBlock`). Con il blocco nulla è scritto; il tocco sulla proposta fa il carico lì. Punti: Aggiungi (blocco Magazzino), Modifica (solo cambiando scaffale o posizione di un pezzo unico disponibile), Movimenta (carico e trasferimento; la rettifica in aumento solo l'informazione), Azione rapida (Carico con la stessa finestra, «Spostato» verso una posizione con capienza), Spostamento rapido (destinazione già piena bloccata subito, poi a ogni articolo; la destinazione mostra la barra e lo spazio libero), esecuzione delle automazioni (prima di ogni «Sposta in»; «Annulla» è un rifiuto come gli altri).
- **Solo informazione** «oltre il limite»: Conta (etichetta sulle righe che aumentano e una frase nel riepilogo, se la posizione ha una capienza), Audit «Sposta qui» (frase nella conferma), import CSV (frase nel messaggio finale; oggi l'import non ha un'anteprima, il messaggio è identico quando nulla supera un limite).
- **Scaffale come destinazione**: il codice di uno scaffale nello Spostamento rapido (fase 1 o durante la lettura) e in «Scansiona Posizione» porta il prodotto su quello scaffale: un pezzo unico con `shelfId` (cambiando posizione l'evento è «spostato» come prima; nella stessa posizione il cambio di scaffale di Modifica «Scaffale: — → R2»), un articolo a quantità con `trasferimento` sulla chiave `posizione/idScaffale` di tutta la giacenza della posizione principale (AU-V10 resta a FLU1). Il messaggio «vale la sua posizione» sparisce lì (resta nell'Audit, che controlla una posizione).
- **AU-V13** (ticket 29): niente più «Usa comunque»; la capienza conta i pezzi.
- **Prova** `prova/s3-avvisi.cjs` (11 scenari), collaudo CF-D3, CF-D4 e la parte S3 di CF-D5 in `collaudo.cjs`, foglio `prova/stili-s3.jpg` (`FETTA=s3`).
- **Non fatto**: il controllo quando cambiano le misure o il peso di un prodotto già sullo scaffale (Modifica senza cambio di scaffale), la Chat (CHAT), la quantità nel trasferimento delle automazioni (FLU1). Non provato sul telefono.
