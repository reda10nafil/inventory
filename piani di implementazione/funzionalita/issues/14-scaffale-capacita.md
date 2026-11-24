# Scaffale: capacità

Tipo: grilling. Stato: **chiuso** il 22 novembre 2026 sera (risposta dell'utente). Fetta: S2, **fatta il 24 novembre** (corsia B, branch `funzioni/scaffali`; vedi «Fatto in S2» in fondo). Dipende dal ticket 13.

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

## Aggiornamento del 23 novembre 2026 mattina (mappa 3)

### Richieste dell'utente

- «Gli scaffali dovevano avere la capacità di capire il volume dei posti, esempio larghezza e lunghezza di uno scaffale […] oppure un carrello delle grucce, per capire quanti pezzi poteva accogliere.»
- «Uno scaffale di 30 cm di altezza per 50 di larghezza e lunghezza non può prendere uno più grande del suo volume, perché non accoglierebbe una scatola così grande.» Quindi serve anche il **controllo del singolo prodotto**: se un lato del prodotto supera lo scaffale non entra, anche a scaffale vuoto.
- «C'è anche un massimo del peso che può sopportare […] io dovrei poterli configurare.»
- «Devo poter configurare ogni scaffale e andarlo a registrare tramite il QR code oppure l'NFC.»

### Stato verificato (letto nel codice a `7bfcd72`)

- `Location` (`contexts/LocationsContext.tsx:8`) ha `capacity` in pezzi; la usa solo lo Spostamento rapido (`BatchMoveScreen.tsx`, conta i **prodotti**, non i pezzi: AU-V13) e la mostra l'Azione rapida.
- Il prodotto ha `length` e `width` in cm e `weight` in kg (campi Base del layout); **non ha l'altezza**.
- Lo scaffale di S1a (`utils/shelves.ts`, `Shelf`) non ha misure: ha nome, posizione, categoria facoltativa, codice e tag.

### Che cosa si configura (il «che cosa» è dell'utente; la forma è una proposta dell'orchestratore)

Due tipi, scelti alla creazione:

1. **Ripiano** (scaffale, cassetto, contenitore): larghezza, profondità e altezza in cm, peso massimo in kg, pezzi massimi. Ognuno facoltativo; il volume viene dalle tre misure.
2. **Barra appendiabiti** (carrello delle grucce): grucce massime (= pezzi), peso massimo in kg, altezza libera sotto la barra in cm (un capo più lungo non entra). Ognuno facoltativo.

**Da chiedere all'utente quando S2 è la prossima**: la barra si misura in grucce (proposta) o in centimetri di barra (servirebbe lo spessore di ogni capo)?

### Controllo del singolo prodotto (decisione tecnica, da validare con i test in S2)

- **Ripiano**: ordinando dal più grande i lati del prodotto e quelli del ripiano, ogni lato del prodotto deve essere ≤ al lato corrispondente (la scatola si può girare). Lati mancanti nel prodotto non si controllano; lati mancanti nel ripiano non limitano.
- **Barra**: lato più lungo del prodotto ≤ altezza libera.
- Peso del singolo pezzo ≤ peso massimo dello scaffale.
- Funzione pura `fitsShelf(prodotto, scaffale)` in `utils/shelves.ts`, che restituisce il motivo («lato di 60 cm più grande di 50 cm», «pesa 12 kg, lo scaffale ne regge 10») con test jest.
- **Altezza** (cm) facoltativa nel prodotto, campo Base del layout accanto a lunghezza e larghezza. Nessuna riscrittura dei prodotti di oggi. Attenzione al vincolo 1 della mappa 3: non alzare `version` del layout.

### Piano di implementazione (fetta S2, dopo S1b)

1. `Shelf` con `kind?: 'ripiano' | 'barra'` (assente = ripiano), `width?`, `depth?`, `height?`, `maxWeight?`, `maxPieces?`, tutti facoltativi; `parseShelves` li legge senza riscrivere.
2. `utils/shelves.ts`: `fitsShelf`, `shelfLoad(scaffale, prodotti)` (pezzi, peso e volume occupati, per unità × quantità come sopra), `fillLevel` (il più alto dei tre) con test.
3. `ShelvesScreen`: modulo con il tipo e le misure; riga dell'elenco con la barra del riempimento e il colore (ticket 15).
4. Prodotto: campo Base «Altezza» in `LayoutContext` (aggiunto in fondo alle misure, senza cambiare `version`), Aggiungi, Modifica, Scheda, CSV (colonna in fondo).
5. Scheda: riempimento dello scaffale del prodotto.

### Piano di verifica

- Jest: `shelves.test.ts` (rotazione della scatola, lati mancanti, barra, peso, volume, riempimento = il più alto).
- Prova nuova `prova/s2-capacita.cjs`: crea ripiano 50×50×30, 10 kg, 20 pezzi; crea barra 15 grucce; riempimento a 0, 50, 80, 100%; un prodotto 60×40×20 risulta «non entra» a scaffale vuoto; dati salvati con i campi nuovi e scaffali vecchi letti uguali.
- Regressioni: `s1-scaffali.cjs` (con `invariante`), `m03-giacenza.cjs`, `m04-movimenta.cjs`, `a3-batchmove.cjs`, `a2-csv.cjs`, `m08-csv.cjs`, `controllo.sh`.
- 5 stili: `stili-s2.jpg` (Scaffali con le barre).

## Come si torna indietro

Le misure sono facoltative: uno scaffale senza capacità non mostra riempimento.

## Richiesta dell'utente del 24 novembre (secondo messaggio)

> Ogni scaffale deve avere le misure (lunghezza, altezza, profondità) e il **peso massimo** che regge, oppure il **numero massimo di pezzi**; servono a capire **che scatole ci stanno e quante**, o quanto peso porta; devono funzionare con le automazioni, con i prodotti e con i suggerimenti di altri scaffali.

Aggiunte a S2 (corsia B, orchestratore 5): misure, peso e pezzi tutti facoltativi, da soli o insieme; **«quante ce ne stanno»** (`fitCount`) nella Scheda e in Impostazioni › Scaffali; testi senza sigle («Lunghezza», «Profondità», «Altezza», «Peso massimo», «Pezzi massimi»). Automazioni e suggerimenti di altri scaffali sono di S3 (ticket 15).

## Fatto in S2 (24 novembre 2026, corsia B)

**Confine** (decisione della fetta): punti 1-5 del piano qui sopra, più `fitCount` della richiesta del 24. Fuori: avviso, blocco e proposta di un altro scaffale nei punti di carico, lo scaffale come destinazione nelle automazioni (S3, ticket 15); capienza delle posizioni in pezzi (AU-V13, S3); codice ed etichetta dello scaffale (ETI); testo condiviso e PDF della Scheda con l'Altezza (non fatti: si aggiungono con due righe).

- **Dati** (`utils/shelves.ts`): `Shelf` con `kind?: 'barra'` (assente = ripiano; «ripiano» non si salva), `length`, `depth`, `height` (cm), `maxWeight` (kg), `maxPieces`, tutti facoltativi. `shelfCapacity` tiene solo numeri positivi (pezzi interi), per la barra non tiene lunghezza e profondità; passa da `shelfData`, quindi da `parseShelves`, `addShelf` e `updateShelf`. Uno scaffale di prima si rilegge e si risalva **identico** (test jest e `s2-dati`). Nomi dei campi `length`/`depth`/`height` come le parole dell'utente del 24, invece di `width` del piano: il controllo gira la scatola, quindi il nome non cambia il calcolo.
- **Funzioni pure** con i test (`__tests__/shelves.test.ts`, 12 casi nuovi): `fitsShelf` (lati dal più grande, lato mancante al prodotto non controllato, lato mancante al ripiano senza limite; barra: lato più lungo sotto l'altezza libera; peso di un pezzo; motivo in una riga: «un lato di 60 cm è più grande di 50 cm», «è lungo 120 cm, sotto la barra ce ne sono 100», «pesa 12 kg, lo scaffale ne regge 10»), `shelfLoad` (pezzi, kg e cm³ da `qtyAt` sulla chiave `posizione/scaffale`: pezzo unico disponibile 1, venduti e cestino 0), `shelvesOfProduct`, `fillLevel` (il più alto dei tre; percentuale per difetto; verde ≤ 50, blu ≤ 80, rosso oltre, pieno ≥ 100), `fitCount` (minimo tra pezzi liberi, peso libero / peso, volume libero / volume; esiti `non-entra`, `numero` anche 0, `nessun-limite`, `non-calcolabile`), testi `fitCountText` («Su A1 ne entrano ancora 5 come questo», «circa» quando decide il volume), `capacityText`, `fillText`, `freeText`, `measuresText`, `capacityFromForm`.
- **Impostazioni › Scaffali** (con la revisione UX0 dell'orchestratore 5, `N/ux0/piano-fette.md` blocco S2): «Tipo» Ripiano / Barra appendiabiti; le misure in **una riga** a 1/3 con «cm» dentro il campo (Lunghezza, Altezza, Profondità; la barra solo Altezza libera), poi **«Peso massimo (kg)» e «Pezzi massimi (pz)» affiancati** (barra: Grucce massime), tutti facoltativi, un numero sbagliato rifiutato col nome del campo; **categoria a tendina** (`components/CategorySelect.tsx`, finestra dal basso con «Generico» per primo; la spiegazione dello scaffale generico solo quando è scelto); **«Codice»** con il segnaposto «Si crea da solo»: alla creazione un codice vuoto nasce al salvataggio da posizione e nome (`suggestShelfCode`, come farà ETI con la finestra «Codice ed etichetta»); nella riga dello scaffale «Base 50 × 50 cm, alta 30 cm · fino a 10 kg · fino a 20 pezzi», la barra del riempimento alta 6 con la percentuale scritta accanto («72%», «Pieno»; `components/ShelfFill.tsx`, colori dai ruoli successo, informazione, errore) e «Liberi: 11 pezzi · 5,5 kg»; riquadro **«Quanti ne entrano»** con un prodotto di prova (SKU): ogni scaffale dice «Su A1 ne entrano ancora circa 3 come VOL-0087», «Su A1 non entra: …» o «A2: nessun limite». Uno scaffale senza misure resta com'era (nessuna riga in più). Resta a UX1: l'elenco prima del modulo, col modulo in una finestra dal basso (R15).
- **Altezza del prodotto**: `Product.height` (cm), campo Base «Altezza» nel registro (`SYSTEM_FIELDS`, ordine 9,5 tra Peso e Note) e nel layout predefinito dopo il Peso; nei layout già salvati la mette `withLateBaseFields` (`utils/templateFields.ts`) **solo in memoria**, dopo l'ultima misura (nascosta se lo sono tutte le misure), senza riscrivere il layout né alzare `version` (vincolo 1); il layout ricorda in `lateFields` che l'ha proposta, così tolta dall'utente non torna; un modello che abbina «Altezza» per nome la mette come campo Base; Aggiungi (blocco `case 'height'`), Modifica (riga a sé sotto le misure), Scheda (riquadro «Altezza»), Cronologia («Altezza: 42,5 → 45»), CSV (colonna «Altezza» **in fondo**, dopo «Scaffale»; un CSV di prima senza la colonna dà un prodotto senza altezza).
- **Scheda**: riquadro «Spazio sullo scaffale» (`components/ShelfSpace.tsx`) per gli scaffali con misure o limiti su cui il prodotto sta: misure, barra e «Su A1 ne entrano ancora N come questo» (o il motivo per cui non entra).
- **Barra appendiabiti**: in **grucce** (proposta di `map-3.md`, decisa dall'orchestratore al posto dell'utente, 24/11).
- **Revisore** (dopo `71760ee`): corretti l'Altezza tolta che tornava, l'Altezza visibile con le misure nascoste, un campo di sistema da un modello messo come personalizzato, «quanti ne entrano» con un limite già pieno (ora 0), un numero minuscolo salvato come «nessun limite» (ora rifiutato), «Liberi» senza lo spazio (ora «60% dello spazio»).
- **Prova** `prova/s2-capacita.cjs` (8 scenari, con `s2-altezza-tolta` del revisore): `s2-ripiano`, `s2-barra`, `s2-riempimento` (0, 50, 80, 100%: verde, verde, blu, rosso «Pieno», tre colori diversi, testo dello stesso colore della barra), `s2-quanti`, `s2-dati`, `s2-altezza`, `s2-scheda`. Collaudo: parti S2 di CF-D1, CF-D2, CF-D5. Foglio dei 5 stili `prova/stili-s2.jpg`.
- Da sapere: i prodotti del campionario hanno lunghezza, larghezza e peso ma **non l'altezza**, quindi per loro il volume non conta finché non la si scrive; misurano tutti 98-120 cm, quindi su un ripiano da 50 cm «non entrano» (vero: sono capi lunghi, vanno sulla barra).
