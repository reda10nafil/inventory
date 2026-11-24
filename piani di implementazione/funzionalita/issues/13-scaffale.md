# Scaffale: cos'è e dove sta

Tipo: grilling. Stato: **chiuso** il 22 novembre 2026 sera (risposte dell'utente; il modello dei dati è una decisione tecnica dell'orchestratore, da validare con i test). Fetta: S1. Dipende dal ticket 19 per che cosa sia «categoria».

## Question

Lo scaffale è la posizione (che ha già capienza, codice e tag), un livello sotto la posizione, o la cartella?

## Risposta (utente)

- **La posizione resta il luogo** (negozio, magazzino, altri posti).
- **Gli scaffali sono un'entità a sé**, con una propria schermata di gestione.
- Alla creazione di uno scaffale si scelgono:
  - la **posizione** in cui sta;
  - se è **generico** oppure di una **categoria** (abiti, giacche…), così gli scaffali sono ordinati per luogo e per categoria;
  - un **codice (QR) e un tag NFC**, come per le posizioni.
- Nel prodotto lo scaffale è **facoltativo**: si propongono quelli della sua posizione e della sua categoria, più i generici.

## Modello dei dati (decisione tecnica dell'orchestratore, da validare con i test in S1)

- Uno scaffale è un **posto dentro una posizione**: `shelf.locationId`. Contesto proprio `ShelvesContext`, chiave `furinventory_shelves:{org}`, come Categorie e Contatti, fuori dall'elenco di chiavi di `InventoryContext`.
- Un pezzo unico ha `location` più uno `shelfId` facoltativo.
- Per un articolo a quantità la giacenza può stare su uno scaffale. `isAt` e `qtyAt` di una posizione sommano anche i suoi scaffali; un trasferimento tra scaffali è un trasferimento normale. Forma delle chiavi di `stock` decisa in S1b: **`posizione/idScaffale`** (forma 2).
- Alternativa scartata: una seconda mappa `shelfStock` accanto a `stock`, con il rischio che le due non tornino.
- Uno scaffale con prodotti non si elimina, come le posizioni.

## Divisione in due fette (orchestratore, 22 novembre sera)

Per la regola 7 di `grafo-lavori.md` (nessun commit in cui un prodotto può avere `stock` mentre qualche lettura o scrittura lo ignora), lo scaffale entra in due passi.

### S1a — anagrafica e pezzi unici

Stato: **fatto** il 23 novembre 2026 (vedi `git log` e `../../CRONOLOGIA.md`; decisioni prese al posto dell'utente nelle righe S1a di `../../DECISIONI_DA_RIVEDERE.md`; prova `../prova/s1-scaffali.cjs`). Le eliminazioni contano anche i prodotti venduti e quelli nel cestino, come per le posizioni; la posizione di uno scaffale resta quella della creazione.

- **Nessuna chiave di `stock` è uno scaffale.** Il selettore dello scaffale c'è solo per i pezzi unici: non compare per gli articoli a quantità, né in Movimenta. Un pezzo unico che diventa articolo a quantità (primo movimento) perde `shelfId`.
- **Id opachi** (`${Date.now()}-${random}`, come prodotti e contatti): gli id di posizioni e categorie sono parole (`magazzino`, `visone`) e un id di scaffale fatto allo stesso modo potrebbe scontrarsi con loro.
- **Lo scaffale sta sempre dentro la posizione del prodotto.** Una sola funzione pura con test lo garantisce a ogni scrittura (`moveProduct`, Modifica, Spostamento rapido, Audit, import): se la posizione cambia e lo scaffale non è di quella posizione, `shelfId` si toglie. Le letture ignorano uno `shelfId` che non torna (scaffale eliminato o di un'altra posizione).
- **Scaffale e categoria**: generico (nessuna categoria) o di una categoria. Per un prodotto si propongono gli scaffali della sua posizione che sono generici, della sua categoria o di una categoria che la contiene (l'albero di C1: uno scaffale «Pellicce» va bene per «Pellicce › Visone»).
- **Eliminazioni rifiutate**, con un messaggio come per le posizioni:
  - una posizione che ha scaffali;
  - una categoria usata da uno scaffale (in aggiunta ai controlli di C1);
  - uno scaffale con prodotti. Decidere e annotare che cosa succede ai prodotti nel cestino (come P09 per le cartelle e M10 per i contatti).
- **Codici**: posizioni e categorie hanno già un codice e lo Scanner lo cerca (`ScannerScreen.tsx`, `locations.find`, `libraries.find`). Lo Scanner riconosce anche lo scaffale; un codice già usato da una posizione, una categoria, uno scaffale o un prodotto si rifiuta.
- **Tag NFC**: solo memorizzato nello scaffale, nessuna chiamata NFC (quella è la fetta N1).
- **CSV**: l'import ricostruisce i prodotti campo per campo, quindi `shelfId` andrebbe perso. Aggiungere una colonna «Scaffale» (per nome, dentro la posizione) senza rompere il riconoscimento dei tre formati di C1, oppure annotare la perdita.
- **Chiave nuova** `furinventory_shelves:{org}`: trattare ogni punto come le altre chiavi per spazio (svuota dati, ordine dei provider, `lib.cjs`). Schermata nuova in `schermate.cjs` come `26-scaffali`.
- Prove: `a1-cestino` e `a4-cart-cestino` danno già lo stesso errore dello script prima di S1a.

### S1b — giacenza sugli scaffali

Prima delle schermate, l'esecutore confronta con dei test due forme delle chiavi di `stock` e riferisce all'orchestratore:

1. id dello scaffale da solo, con `locationId` dello scaffale che non cambia più dopo la creazione;
2. chiave che porta anche la posizione (per esempio `magazzino/<idScaffale>`).

Tre domande decidono:

- il totale di una posizione si calcola dal solo prodotto? Oggi `utils/stock.ts` e `InventoryContext` non hanno l'elenco degli scaffali;
- se uno scaffale cambia posizione, la giacenza si sposta senza un evento? Questo romperebbe «giacenza salvata = eventi rigiocati»;
- che cosa succede con uno scaffale che un altro dispositivo non conosce?

Poi tutte le letture e scritture di `stock` (Movimenta, Conta, Audit, Spostamento rapido, Azione rapida, CSV, report) in un solo commit.

Stato: **fatto** il 24 novembre 2026 (vedi `git log` e `../../CRONOLOGIA.md`; decisioni prese al posto dell'utente nelle righe S1b di `../../DECISIONI_DA_RIVEDERE.md`; prova `../prova/s1b-giacenza.cjs`).

**Forma delle chiavi: forma 2, `posizione/idScaffale`** (`magazzino/1732…-a1`). Test in `__tests__/stockKeyForm.test.ts`, che confronta un lettore di prova della forma 1 con le funzioni dell'app:

| Domanda | Forma 1 (id dello scaffale da solo) | Forma 2 (`posizione/idScaffale`) |
| --- | --- | --- |
| Il totale di una posizione si calcola dal solo prodotto? | no: senza l'elenco degli scaffali Magazzino conta 5 invece di 8 | sì |
| Se uno scaffale cambia posizione, la giacenza si sposta senza un evento? | sì: 3 pezzi passerebbero a Vetrina senza evento (oggi non succede solo perché la posizione dello scaffale è fissa) | no: la posizione sta nella chiave |
| Scaffale che un altro dispositivo non conosce? | la chiave sembra una posizione sconosciuta, Magazzino perde i pezzi | la giacenza resta in Magazzino, «scaffale sconosciuto» come nome |

Il separatore `/` non compare negli id delle posizioni (`newLocationId`: solo a-z, 0-9, `_`; posizioni predefinite) né degli scaffali (`newShelfId`); la posizione è tutto prima dell'ultimo `/`, senza `/` o con un lato vuoto la chiave è una posizione. Costo trovato: una chiave `a/b` scritta prima di S1b da un CSV a mano si leggerebbe come posizione `a` con uno scaffale sconosciuto (totale ed eventi uguali, cambia solo il nome); da S1b l'import rifiuta il `/` nella posizione. Criterio dell'orchestratore: vince la forma che risponde senza leggere l'elenco degli scaffali.

**Confine** (decisione dell'orchestratore, notte del 23): in un commit tutte le scritture (`applyMovement` e le cinque funzioni di `inventoryOps`, Movimenta con lo scaffale di partenza e di destinazione, Aggiungi per la giacenza iniziale, Conta, Spostamento rapido, Azione rapida, Audit, esecuzione delle automazioni, import CSV) e le letture (`isAt`, `qtyAt`, `positionsOf`, `mainLocation`, export CSV, avvisi, filtri, Scheda con la giacenza per scaffale, Home, Impostazioni, Vendita flash, `shelfUsage`). Fuori: capacità e riempimento (S2), avvisi e blocchi (S3), scaffale come destinazione e quantità in automazioni e Spostamento rapido (FLU1), scelta e lettura dello scaffale in Conta e Audit (CON).

Che cosa fa S1b:

- `utils/stock.ts`: `stockKey`, `splitStockKey`, `placeOfKey`, `SHELF_KEY_SEPARATOR`, `newLocationId`; `isAt` e `qtyAt` di una posizione sommano i suoi scaffali, `qtyIn` legge la chiave esatta; `positionsOf` e `mainLocation` danno sempre una posizione; `keysAt` (prima la parte senza scaffale, poi gli scaffali) e `drawsAt` (da dove prendere una quantità); `stockGroups` per la Scheda. Un pezzo unico con `shelfId` vale 1 su `posizione/scaffale` e al primo movimento la giacenza resta lì. La posizione principale non resta come chiave a 0 se ha giacenza su un suo scaffale.
- `utils/inventoryOps.ts`: `moveOf` sposta tutta la posizione principale, scaffali compresi (un trasferimento per chiave); `saleOf` vende prima dalla parte senza scaffale, poi dagli scaffali; Conta: «Registrata» è il totale della posizione, un calo scende dalla parte senza scaffale e poi dagli scaffali, un aumento va sulla parte senza scaffale (`countMoves`); `withInitialStock` carica sullo scaffale scelto in Aggiungi.
- `shelfId` resta dei soli pezzi unici: per un articolo a quantità lo scaffale è nella chiave (`keptShelfId` e `productShelfId` non cambiano).
- `utils/shelves.ts`: `shelfUsage` conta anche gli articoli a quantità con giacenza sullo scaffale (anche nel cestino), quindi lo scaffale non si elimina; `stockPlaceLabel` («Magazzino › A1», `UNKNOWN_SHELF`); `stockKeyFromCsv`. `hooks/usePlaceLabel.ts` per tutte le schermate.
- Schermate: Movimenta (fila «Scaffale» con «Nessuno» e gli scaffali, solo per una posizione con scaffali), Scheda (posizione e sotto «Senza scaffale», «Scaffale A1»), Aggiungi (scaffale anche con la quantità), Azione rapida di uno scaffale (anche gli articoli a quantità con la quantità), Cronologia, Fornitori e clienti, report.
- CSV: la Giacenza esporta le chiavi salvate (`magazzino/<id>:3`); l'import accetta `posizione/<id o nome>` e l'id o il codice di uno scaffale; scaffale sconosciuto o `/` nella posizione → riga saltata.
- Dati: nessuna migrazione; gli eventi di prima si rigiocano come prima (`replayStock` è per chiave).

Rischi aperti (revisore di S1b, bassi, nessuno blocca):

- un pezzo unico con uno scaffale che questo dispositivo non conosce: il report delle giacenze dice «Magazzino › scaffale sconosciuto», Scheda e Home solo «Magazzino»;
- un backup CSV con la giacenza su scaffali, reimportato in uno spazio che non ha quegli scaffali, salta quelle righe (il prodotto intero): prima si ricreano gli scaffali;
- con la rete locale (mesh) o il cloud, un dispositivo con l'app di prima di S1b legge `magazzino/<id>` come una posizione sconosciuta: Magazzino conta meno e Conta e Audit non vedono quei pezzi finché non si aggiorna;
- una chiave `a/b` scritta prima di S1b da un CSV a mano conta anche per la posizione `a` (`isAt`, `positionsOf`); totali ed eventi restano giusti.

## Come si torna indietro

`shelfId` è facoltativo: senza la schermata e il campo, i prodotti restano nella loro posizione. Le chiavi `posizione/scaffale` di `stock` si riportano alla loro posizione con un trasferimento per chiave (eventi, così la giacenza salvata resta quella degli eventi rigiocati); anche senza farlo, le funzioni di prima di S1b le leggerebbero come posizioni sconosciute.
