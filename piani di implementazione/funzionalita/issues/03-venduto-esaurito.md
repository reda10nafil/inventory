# Venduto ed esaurito

Tipo: grilling (deciso dall'agente). Stato: **chiuso** il 22 novembre 2026 (notte, regola 4 di `NOTTE_22_23.md`; da rivedere con l'utente).

## Question

Con le quantità, che cosa significa «venduto»? E «esaurito»?

## Opzioni

- A. Stato nuovo `out_of_stock` salvato: un altro stato da tenere allineato.
- B. Venduto quando la giacenza arriva a 0 con una vendita: un articolo a 0 uscirebbe da Disponibili, non avrebbe l'avviso di scorta minima proprio quando serve e resterebbe «Venduto» dopo un nuovo carico.
- C. **Venduto solo per i pezzi unici; per gli articoli a quantità la vendita è uno scarico** e «esaurito» è calcolato.

## Risposta

**C** (corretta dopo il parere del revisore, che ha mostrato il problema di B).
- Pezzo unico (senza `stock`): `sellProduct` e `moveProduct` come oggi (stato `sold`, `location` nuova).
- Articolo a quantità: `sellProduct(id, prezzo, qty = 1)` è uno scarico con causale «vendita» dalla posizione principale; il prezzo sta nell'evento (`finalPrice`), `sellPrice` del prodotto non si sovrascrive; lo stato resta disponibile. `moveProduct(id, verso)` trasferisce tutta la giacenza della posizione principale.
- «Esaurito»: etichetta calcolata (articolo a quantità con giacenza 0), mostrata nella card e nella Scheda.

## Come si torna indietro

Ripristinare `sellProduct` e `moveProduct` di prima: i pezzi unici non sono mai cambiati.
