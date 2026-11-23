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
