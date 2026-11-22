# Cartelle e categorie

Tipo: grilling. Stato: **chiuso** il 22 novembre 2026 sera (risposta dell'utente). Fetta: C1. **Supera il ticket 04** (M01): là «Tipo di pelle» era diventato «Categoria», nel verso sbagliato.

## Question

Oggi «Categoria» è l'ex tipo di pelle (visone, volpe…) e «Cartella» un raggruppamento libero (Pellicce, Collezione Inverno). L'utente vuole le cartelle come categorie (pellicce, abbigliamento, borse, scarpe, zaini). Come si sistemano senza perdere dati?

## Risposta (utente)

- **Le cartelle sono le categorie**, con **sottocategorie**.
- **«Tipo di pelle» è un campo**, non la categoria. Per i prodotti che non sono pellicce non è obbligatorio.
- Gli scaffali «di una categoria» (ticket 13) si riferiscono a queste categorie.
- Nel CSV **due colonne separate**: «Categoria» = cartella per nome, «Tipo di pelle» = `furType`.

## Come si fa (senza perdere dati)

- I dati restano dove sono: `furType` e `libraryId` non si toccano, nessuna riscrittura forzata. Cambiano etichette, schermate e obbligatorietà.
- **Categoria / sottocategoria** = le cartelle di oggi (`libraries`, `libraryId`), con un genitore facoltativo (`parentId`) per le sottocategorie.
- **«Tipo di pelle»** = `furType`, con la lista di valori di M01 (`CategoriesContext`, chiave `furinventory_categories:{org}`) e l'etichetta originale. La lista resta modificabile; cambia il nome con cui la si chiama.
- Punti che oggi mostrano `labelOf(furType)` come «Categoria» (elenco in `PASSAGGIO.md` e nel commit fd051a9): Scheda, card, PDF, CSV, Audit, Conta, Azione rapida.

## CSV: regola per i file vecchi (da fissare con un test)

Le intestazioni sono cambiate tre volte:

| File | Colonna del tipo di pelle | Colonna della cartella |
| --- | --- | --- |
| prima di M01 | «Tipo Pelle» | «Cartella» (da C06) o assente |
| M01-M10 | «Categoria» | «Cartella» |
| da C1 | «Tipo di pelle» | «Categoria» (e sottocategoria) |

L'import riconosce il file dall'intestazione, non dalla posizione: se c'è la colonna «Cartella», oppure non c'è «Tipo di pelle», il file è vecchio e «Categoria» vuol dire tipo di pelle; altrimenti «Categoria» è la cartella. Un test per ognuno dei tre casi. Vale anche per il report «Esporta giacenze» (`STOCK_CSV_HEADER`).

## Come si torna indietro

Rimettere le etichette di M01. I dati non sono cambiati; `parentId` si ignora.
