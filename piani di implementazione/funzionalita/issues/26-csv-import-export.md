# CSV dei prodotti: import con corrispondenza delle colonne, export leggibile, link delle immagini

Tipo: grilling + research (verifica). Stato: **verificato** il 23 novembre 2026 mattina; piano proposto; tre domande aperte. Fette: **EXP** (export) e **IMP** (import). Si lega al ticket 11 (fette I1-I3, link pubblici delle foto dopo il login). Mappa: [`../map-3.md`](../map-3.md). Verifica completa: [`../ricerche/verifiche-23/verifica-csv-immagini.md`](../ricerche/verifiche-23/verifica-csv-immagini.md) §1-3 (difetti `CSV-E1…E6`, `CSV-I1…I10`), file CSV di prova in `../ricerche/verifiche-23/script/csv-immagini/`.

## Question

Come si importano prodotti da un CSV qualsiasi (anche di un altro gestionale) senza perdere colonne, creando i campi che mancano, e come si esportano con le immagini?

## Richiesta dell'utente (23 novembre mattina)

> «Bisogna poter importare o esportare i CSV dei prodotti. Peccato che mancano i link delle immagini.»
> «Se poi voglio importare dei prodotti, come faccio a importarli se poi non li accetta? […] non si può mappare i campi. Esempio, un campo mancante, ma che c'è sul CSV […] ci dovrebbe essere il tasto che mi porta nei campi personalizzati, creare il campo che serve e poi tornare indietro e selezionarlo per poter importare quei prodotti. Stessa cosa per i link delle immagini, poi dovrebbe capirlo.»

## Stato verificato (sintesi)

- **Export** (Impostazioni › Dati e backup): funziona, ma le foto del dispositivo (`data:`, `blob:`, `file:`) non escono mai: «Immagini URL» = `[]` (**CSV-E1**: è il «mancano i link»); campi personalizzati in un JSON di decine di migliaia di caratteri (CSV-E2), con le foto dei campi in base64 mentre quelle del prodotto no (CSV-E3); senza BOM, quindi Excel in italiano scrive male gli accenti (CSV-E4, dedotto); backup Drive con colonne vecchie e cestino incluso (CSV-E5); con il login i link firmati di 7 giorni finirebbero nel CSV (CSV-E6, per I2).
- **Import**: parte subito, senza anteprima né abbinamento; colonne solo per nome esatto con pochi sinonimi; **un CSV col punto e virgola (Excel italiano) è rifiutato tutto** (CSV-I1); «Categoria» di un altro gestionale diventa Tipo di pelle (CSV-I2); Nome, Prezzo, Quantità, Taglia, Colore persi in silenzio anche se Taglia e Colore sono campi esistenti (CSV-I3); righe rifiutate senza il motivo (CSV-I4); righe accettate ma sbagliate senza avviso (prezzo illeggibile, senza posizione, posizione inesistente salvata come id orfano, stato sconosciuto, obbligatori non controllati, nessun link GS1) (CSV-I5); «1.250» letto come 1,25 (CSV-I9); prodotti già presenti mai aggiornati (CSV-I10).
- Difetti nella Scheda trovati qui: **prezzo 0 mostrato come «0» isolato**, che su Android può far cadere la schermata (CSV-I6, va nella fetta GAL); note vuote come stringa vuota (CSV-I7, GAL); link d'immagine rotto = riquadro nero (CSV-I8, GAL).
- **«Crea campo»**: non esiste. I pezzi ci sono: `addField` restituisce il campo creato e la pila tiene montata la schermata di sotto.
- Link d'immagine `http(s)` all'import: oggi si tengono come link e si vedono se il sito risponde; i link Drive privati non si vedono.

## Decisioni

- **Proposte dell'orchestratore** (dal resoconto §1.4, §2.4, §3.4):
  - schermata **«Importa prodotti»** con quattro passi: File (separatore «,» o «;» riconosciuto da solo) → **Colonne** (una riga per intestazione con 2-3 valori d'esempio e la scelta: Ignora, campi di sistema, campi personalizzati, **+ Crea campo**; proposta automatica per nome e sinonimi; l'ultimo abbinamento si ricorda) → **Anteprima** senza scrivere nulla («N nuovi, M rifiutati, K avvisi», righe rifiutate con numero, SKU e motivo, avvisi per colonna) → **Importa** e riepilogo, con «Scarica righe rifiutate»;
  - «+ Crea campo»: **come l'ha descritto l'utente**, si va in Campi Personalizzati con il campo già compilato (nome della colonna, tipo proposto dai valori), si salva e si torna all'import con la colonna già abbinata; il file resta caricato (stato nella schermata d'import, più una bozza salvata per la ricarica sul web). Alternativa più semplice da proporre all'utente quando IMP è la prossima: la stessa finestra di creazione aperta dentro l'import;
  - link delle immagini: colonna riconosciuta anche da «Immagine», «Foto», «Image URL», da più colonne «Immagine 1, 2…» (la prima è la principale), separatori «;», «|» o a capo; «Verifica link» nell'anteprima;
  - export: **una colonna per ogni campo personalizzato** con il valore leggibile (il JSON resta per compatibilità, in fondo), BOM, avviso «N foto non esportate: sono solo su questo dispositivo», backup Drive con la stessa funzione delle righe.
- **Da chiedere quando IMP è la prossima** (una per volta):
  1. SKU già presenti nel file: si saltano come oggi, o si aggiornano i prodotti con i valori del file (solo le colonne abbinate, con l'evento «modificato»)?
  2. Link delle immagini nel CSV importato: si tengono come link (subito; si vedono solo con internet e finché il sito li tiene) o l'app ne scarica una copia (dopo la fetta FOTO; sul web non da tutti i siti)?
- **Da chiedere quando EXP è la prossima**: prima del cloud (I1-I3), all'export basta l'avviso «N foto non esportate», o serve anche un backup a parte con le foto dentro (completo ma pesante)?

## Piano di implementazione

### Fetta EXP — export leggibile (dopo VAL)

1. `utils/productCsv.ts`: `productCsvRows` usata anche dal backup Drive (CSV-E5); colonne nuove **in fondo**: una per campo personalizzato attivo, con `utils/fieldValues.ts` (scelta multipla «Cappuccio; Tasche»; immagini e documenti solo come link `http(s)`). I nomi di campo che coincidono con colonne di sistema si rendono univoci («Categoria (campo)») per non confondere `productCsvFormat`.
2. BOM all'inizio del file in `exportCsv` (`SettingsScreen.tsx`); la virgola resta.
3. Avviso dopo l'export con il numero di foto non esportate.
4. Dopo I1-I3: «Immagini URL» con i link pubblici WebP del catalogo, mai quelli firmati (CSV-E6).

### Fetta IMP — schermata d'import (dopo EDC ed EXP; se MCAT è già fatta, obbligatori per categoria)

1. `utils/csv.ts`: `parseCsv(testo, separatore)`; `utils/csvImport.ts` nuovo con test: `detectDelimiter`, `guessMapping(intestazione, campi)` (tabella unica dei sinonimi), `previewImport(righe, abbinamento, elenchi)` → `{ daAggiungere, rifiutate: [{ riga, sku, motivo }], avvisi }`. `productFromCsvRow` diventa la conversione di una riga già abbinata; riusa `parseStockCell`, `libraryIdFromCsv`, `furTypeFromCsv`, `shelfIdFromCsv`, i controlli di Aggiungi (posizione obbligatoria, obbligatori del modulo) e genera il link solo se la modalità lo chiede (ticket 22).
2. `src/screens/settings/ImportScreen.tsx` (rotta `settings/import`), con la voce di Impostazioni e il riquadro per trascinare il file spostati lì. Posizioni e categorie sconosciute: «Crea / Usa…» su tocco esplicito; «valore per le righe vuote» per Posizione e Categoria; avviso dei valori nuovi delle scelte («aggiunti alle opzioni»). Numeri mostrati già convertiti nell'anteprima (CSV-I9 si vede prima).
3. «+ Crea campo»: andata e ritorno con `router.push({ pathname: '/settings/fields', params: { nuovoCampo, valori } })`; `FieldsScreen` apre l'editor (fetta EDC) già compilato e dopo il salvataggio torna indietro; l'import seleziona il campo nuovo confrontando gli id. Bozza `furinventory_import_draft:{org}` (testo + abbinamento), cancellata dopo «Importa» o «Annulla». L'anteprima dice che il campo creato resta anche se l'import si annulla.
4. Correzioni comprese: CSV-I2 (abbinamento visibile), CSV-I5 (regole di Aggiungi), CSV-I7 (note vuote → `undefined`), link GS1 come in Aggiungi.

## Piano di verifica

- **EXP**: jest `productCsv.test.ts` (colonne dei campi, valori multipli, link, nomi univoci). Prova nuova `prova/exp-export.cjs`: colonne Taglia, Colore, Fornitore con i valori di VIS-0142; primo carattere U+FEFF; avviso «3 foto non esportate»; reimportando i campi tornano uguali. Regressioni: `a2-csv.cjs`, `m08-csv.cjs`, `c1-categorie.cjs c1-csv`, `s1-scaffali.cjs`. Telefono: export, condivisione, apertura in Excel o Fogli.
- **IMP**: jest `csvImport.test.ts` (separatore, sinonimi, abbinamento per nome di campo, motivi di scarto, numeri). Prova nuova `prova/imp-import.cjs` (resoconto §2.5 e §3.5), con i CSV di `ricerche/verifiche-23/script/csv-immagini/` copiati in `prova/imp-csv/`: punto e virgola fino all'anteprima; abbinamento automatico (Prezzo → Prezzo vendita, Taglia e Colore → campi, Categoria → Categoria); Ignora; **localStorage identico prima di «Importa»**; `righe-errate.csv` con 5 rifiutate e il motivo giusto; obbligatori; tre formati di C1 senza toccare l'abbinamento; immagini da più colonne; «+ Crea campo» Materiale con ritorno e valore importato; bozza ritrovata dopo una ricarica. Regressioni: `a2-csv.cjs`, `m08-csv.cjs`, `c1-categorie.cjs c1-csv`, `s1-scaffali.cjs`, `a2-campi.cjs`, `c07-campi-modelli.cjs`. Telefono: scelta del file e CSV salvato da Excel.
- 5 stili: `stili-imp.jpg` (i quattro passi dell'import).

## Come si torna indietro

L'export aggiunge solo colonne in fondo: i file di oggi restano leggibili. L'import non scrive nulla prima di «Importa» e aggiunge soltanto, salvo la scelta «aggiorna» (domanda 1).
