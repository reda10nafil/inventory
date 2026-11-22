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
- Per un articolo a quantità le chiavi di `stock` possono essere una posizione o uno scaffale. `isAt` e `qtyAt` di una posizione sommano anche i suoi scaffali; un trasferimento tra scaffali è un trasferimento normale.
- Alternativa scartata: una seconda mappa `shelfStock` accanto a `stock`, con il rischio che le due non tornino.
- Uno scaffale con prodotti non si elimina, come le posizioni.

## Come si torna indietro

`shelfId` è facoltativo: senza la schermata e il campo, i prodotti restano nella loro posizione. Le chiavi di `stock` che sono scaffali si riportano alla posizione dello scaffale.
