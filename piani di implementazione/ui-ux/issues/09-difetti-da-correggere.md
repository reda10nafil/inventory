# Quali difetti correggere insieme allo stile

Type: grilling
Status: resolved
Blocked by: 06

## Question

Leggendo il codice sono emersi 24 difetti (`difetti-trovati.md`). Quelli visivi (ordine dei campi nella Scheda, posizione senza etichetta e colore nella card, inventario vuoto senza messaggio, titolo «FurInventory Pro», stili tipografici mancanti, pillole tagliate, pillole gonfie in Cronologia, caratteri rotti) toccano le schermate che verranno ridisegnate. Altri cambiano il comportamento (scelta multipla che funziona da singola, scanner finto, Modifica che non mostra tutti i campi).

Quali entrano in questo lavoro e quali restano per dopo? Da porre all'utente **insieme alla scelta dello stile**, in poche righe, per non caricarlo prima. Ogni difetto scelto diventa un passo del lavoro L7 nel grafo.

## Answer

22 novembre 2026. L'utente non ha scelto difetto per difetto: ha accettato i ritocchi e ha chiesto di procedere «nel modo più giusto e corretto e semplificato». La divisione qui sotto è quindi **dell'agente**, con questa regola: entrano i difetti che stanno nei file già ridisegnati, si correggono in poche righe e non aggiungono funzioni; restano fuori quelli che sono lavori a sé. L'utente può spostarne uno in qualunque momento.

**Entrano** (lavoro L7, o già in L1/L6 dove indicato):

| N | Cosa | Dove si fa |
| --- | --- | --- |
| D01 | scelta multipla a riquadri che funziona da multipla | L6c (ritocco accettato) |
| D04 | campi della Scheda nell'ordine del layout, non in quello di compilazione | L7, `DetailScreen.tsx` |
| D05 | posizione con nome e colore sulla card | L6a (ritocco accettato) |
| D06 | messaggio per inventario o filtro vuoti | L7, `HomeScreen.tsx` |
| D07 | «Syncro Flow» al posto di «FurInventory Pro» nell'app (la scheda PDF segue il ticket 10) | L7 |
| D08 | stili tipografici mancanti | L1 |
| D09 | pillole che vanno a capo | L6c (ritocco accettato) |
| D10 | pillole gonfie in Cronologia | L6f |
| D11 | caratteri rotti «Ã¨» nei messaggi e nei file | L7 |
| D17 | `useState` dopo il ritorno anticipato nella Scheda | L7, `DetailScreen.tsx` |
| D22 | dopo il salvataggio si svuotano anche i campi personalizzati | L7, `AddScreen.tsx` |
| D23 | SKU vuoto generato da solo, come dicono suggerimento e nota (se un generatore esiste già; altrimenti resta fuori) | L7, `AddScreen.tsx` |
| D24 | «Obbligatorio» controllato davvero al salvataggio | L7, `AddScreen.tsx` |

**Restano per dopo** (ognuno è un lavoro a sé o tocca dati e servizi): D02 scanner vero nel campo testo, D03 Modifica che segue il layout, D12 modelli del Layout builder, D13 modelli di settore irraggiungibili, D14 filtro della cartella perso, D15 «spostato» nella cronologia, D16 PDF senza campi personalizzati e codici da internet, D18 foto d'esempio da Unsplash, D19 preferenze di Scanner & NFC, D20 codice morto, D21 posizioni predefinite scritte tre volte.
