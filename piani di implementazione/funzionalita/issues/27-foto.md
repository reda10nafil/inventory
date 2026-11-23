# Foto del prodotto: galleria da scorrere e foto che non si perdono

Tipo: research (verifica). Stato: **verificato** il 23 novembre 2026 mattina; **GAL fatta** il 23 novembre (notte, esecutore unico; sotto «Fetta GAL — fatta»); FOTO da fare. Fette: **GAL** (galleria, presto: un difetto cancella la foto sbagliata) e **FOTO** (foto che restano). Mappa: [`../map-3.md`](../map-3.md). Verifica completa: [`../ricerche/verifiche-23/verifica-csv-immagini.md`](../ricerche/verifiche-23/verifica-csv-immagini.md) §4 (difetti `CSV-G1…G6`), script `ci-galleria.cjs` e `ci-dito.cjs` in `../ricerche/verifiche-23/script/csv-immagini/`.

## Question

Perché con più immagini non si può scegliere e scorrere, e come si tengono le foto senza perderle?

## Richiesta dell'utente (23 novembre mattina)

> «Nei prodotti, se io ho più immagini, non posso selezionarli e poter scrollare tra un'immagine e l'altra. Non funziona.»

## Stato verificato (sintesi)

- **CSV-G1, rovina dati** (provato sul web): in Aggiungi e Modifica il tocco su una miniatura sposta il contatore ma **non** la foto grande, e il cestino cancella la foto che si vede, non quella scelta. Modifica di VIS-0142 › terza miniatura › cestino → **cancellata la foto 1**. `removeImage` non corregge l'indice.
- **CSV-G2**: nella Scheda non ci sono miniature né frecce; i puntini sono solo disegnati; con il mouse la galleria non scorre (solo col dito o col touchpad). È il «non posso selezionarli e scrollare».
- **CSV-G3**: il visore a tutto schermo ha solo la chiusura: niente frecce, tastiera, zoom.
- **CSV-G4 = P20** (provato): sul web le foto aggiunte diventano `blob:` e dopo una ricarica sono vuote.
- **CSV-G5** (dedotto, da provare sul telefono): su Android la foto resta nella cache di `expo-image-picker`; svuotando la cache spariscono.
- **CSV-G6** (vincolo): `storageImagePaths` è allineato a `images` per posizione: un riordino deve spostarli insieme (vincolo 4 della mappa).
- Non esistono «principale» né riordino: la principale è sempre la prima. Le foto dei campi «immagini» nella Scheda non si aprono.
- Trovati nell'area CSV e messi qui perché toccano la Scheda: prezzo 0 mostrato come «0» isolato (**CSV-I6**, su Android può far cadere la schermata), note vuote (CSV-I7), link rotto = riquadro nero (CSV-I8).

## Decisioni (proposte dell'orchestratore, dal resoconto §4.4)

- **Un componente unico `components/PhotoGallery.tsx`** per Scheda, Aggiungi e Modifica, con indice controllato.
- Nessun trascinamento per riordinare: «Metti come principale» e «‹ Sposta / Sposta ›», che funzionano anche col mouse.
- Lo zoom (doppio tocco, pizzico) è un secondo passo, dopo GAL.
- **Foto locali**: sul web in IndexedDB con un riferimento `local-photo:<id>` in `images`; su Android copia da `cache/` a `documentDirectory/foto/<idProdotto>/`. Con I1 la copia diventa WebP ridotta.

## Piano di implementazione

### Fetta GAL — galleria (dopo C2) — **fatta il 23/11**

1. `utils/photos.ts` nuovo con test: sposta, metti come principale, elimina, **spostando insieme `images` e `storageImagePaths`** (CSV-G6).
2. `components/PhotoGallery.tsx`: indice controllato con `ref.scrollTo` al tocco di miniatura, puntino o freccia (CSV-G1, CSV-G2); indice corretto dopo un'eliminazione; frecce ‹ › quando le foto sono più di una, ←/→ sul web; **fila di miniature anche nella Scheda**.
3. Aggiungi e Modifica: sotto la foto grande **un solo cestino per la foto scelta** (con conferma «Eliminare la foto 3?»), «Metti come principale», «‹ Sposta / Sposta ›».
4. Visore: stessa galleria, con Esc e frecce (CSV-G3); le foto dei campi «immagini» si aprono nello stesso visore.
5. Scheda: `{x != null && …}` al posto di `{x && …}` per i prezzi (CSV-I6); note vuote non mostrate (CSV-I7); riquadro «foto non disponibile» per i link rotti (CSV-I8).
6. File: `DetailScreen.tsx`, `AddScreen.tsx`, `EditScreen.tsx`, `components/PhotoGallery.tsx`, `utils/photos.ts`.

### Fetta GAL — fatta (23 novembre, notte)

**Confine** (decisione dell'orchestratore, brief di GAL): GAL = punti 1-6 qui sopra: `utils/photos.ts` con test;
`components/PhotoGallery.tsx` unico per Scheda, visore, Aggiungi e Modifica; un solo cestino per la foto scelta, con
conferma; «Metti come principale» e «‹ Sposta / Sposta ›»; visore con frecce, ←/→ ed Esc, in cui si aprono anche le foto
dei campi «immagini»; Scheda con prezzo 0 (CSV-I6), note vuote (CSV-I7) e foto rotta (CSV-I8). **Restano fuori**: lo zoom
(passo successivo), la persistenza delle foto (FOTO: CSV-G4 = P20, CSV-G5) e il riordino per trascinamento (scartato).

- Difetti riprodotti su `2127283` prima del codice (esiti nella cartella delle note condivise `…/gal/base/`): CSV-G1
  (Modifica di VIS-0142 › miniatura 3 → foto grande la 1; cestino → cancellata la 1), CSV-G6 (`storageImagePaths` non
  allineati dopo l'eliminazione), CSV-G2, CSV-G3, CSV-I6 («Prezzi 0 Vendita …», con 0 e 0 la sezione spariva), CSV-I7 (2
  errori in console), CSV-I8 (nessun riquadro).
- Fatto: `utils/photos.ts` (`movePhoto`, `makeMainPhoto`, `removePhoto`, `addPhotos`, `indexAfterRemove`,
  `clampPhotoIndex`, `photosPatch`, `isReorder`; i percorsi cloud si spostano con le foto) e `__tests__/photos.test.ts`;
  `components/PhotoGallery.tsx` (varianti «scheda», «modulo», «visore»); Scheda con miniature, frecce, puntini, ←/→,
  visore con frecce ed Esc, foto dei campi «immagini» nel visore, prezzi `!= null`, note vuote non mostrate, «Foto non
  disponibile»; Aggiungi e Modifica con «‹ Sposta», «Sposta ›», «Metti come principale», «Elimina» con conferma; Modifica
  salva `storageImagePaths` allineati; «Foto riordinate» in Cronologia.
- Prove: `prova/gal-galleria.cjs` (11 scenari, verdi; su HEAD i 9 di allora rossi), `prova/collaudo.cjs` CF-C1 (parte GAL), CF-C3,
  CF-C4 (prezzo 0) verdi; tutta `prova/` confrontata con la base; foglio `prova/stili-gal.jpg`.
- Decisioni prese al posto dell'utente: righe GAL in `../../DECISIONI_DA_RIVEDERE.md`.
- Non verificato: Android (scorrimento col dito, frecce e comandi sul telefono, Scheda con prezzo d'acquisto 0 che non
  cade, CF-T5). Il caricamento delle foto sul cloud (`InventoryContext`, effetto del backup) scrive il percorso
  all'indice che la foto aveva quando il caricamento è partito: un riordino durante un caricamento li disallineerebbe. Con
  il login spento non succede; da guardare quando torna il cloud (L1, L2).

### Fetta FOTO — foto che restano (dopo GAL; prima di I1, I2 e di qualsiasi download dai link del CSV)

1. Web: `src/lib/photoStore.web.ts` (IndexedDB) e un hook che trasforma `local-photo:<id>` in un indirizzo da mostrare; non nel localStorage (circa 5 MB in tutto; VIS-0142 con 3 foto pesa già circa 280 KB).
2. Android: al salvataggio copia in `documentDirectory/foto/<idProdotto>/<n>` (`expo-file-system`, già presente).
3. Le foto `blob:` già salvate non si recuperano: la Scheda mostra «foto non più disponibile» al posto del vuoto.
4. L'export continua a escludere i riferimenti locali (avviso della fetta EXP).

## Piano di verifica

- **GAL**: jest `photos.test.ts` (ordine, principale, eliminazione con `storageImagePaths` allineati). Prova nuova `prova/gal-galleria.cjs`: Scheda › terza miniatura → contatore 3/3 e foto 3 visibile (lunghezza della data-URI, come in `ci-galleria.cjs`); frecce e ←/→; visore con frecce ed Esc; Modifica › sceglie la 3 › elimina → restano 1 e 2; «Metti come principale» → la 3 diventa `images[0]`; «Sposta ›»; prezzo d'acquisto 0 → nessuno «0» isolato. Regressioni: `a1-scheda.cjs`, `c12-senza-foto.cjs`, `a2-aggiungi.cjs`, `a1-modifica.cjs`, `controllo.sh`.
- **FOTO**: prova nuova `prova/foto-restano.cjs`: 3 foto da Aggiungi → ricarica → tutte caricate; Galleria in Modifica → ricarica; 20 foto su 5 prodotti senza errori di spazio; una foto `blob:` vecchia → «foto non più disponibile».
- 5 stili: `stili-gal.jpg` (Scheda con miniature e frecce, Modifica con i comandi della foto).
- **Telefono**: scorrimento col dito; foto da galleria e fotocamera; la foto c'è ancora dopo Impostazioni Android › App › Svuota cache (CSV-G5); Scheda di un prodotto con prezzo d'acquisto 0 che non cade (CSV-I6).

## Come si torna indietro

La galleria non cambia il formato dei dati; il riordino tocca solo l'elenco del prodotto al salvataggio. Le foto `http`/`data:` esistenti restano valide con FOTO.
