# Esito A1 - Inventario, Scheda, Modifica, Cronologia, Cestino (web, 22 novembre 2026)

App web su `localhost:8082`, campionario di `seed.json` (6 prodotti), finestra 375×812. Gli script stanno in questa cartella: `a1-inventario.cjs`, `a1-scheda.cjs`, `a1-modifica.cjs`, `a1-cronologia.cjs`, `a1-cestino.cjs`, con gli aiuti in `a1-util.cjs`. Si eseguono con `SHOTS="$TEMP/prova-funzioni" node <file>.cjs`. Le schermate sono in `%TEMP%\prova-funzioni\a1-*.png`.

«Funziona» vuol dire che lo stato salvato in localStorage cambia come deve. Nella colonna Prova c'è lo scenario e cosa ha letto.

| Funzione | Esito | Prova | Note (file:riga) |
| --- | --- | --- | --- |
| Inventario › filtri Tutti, Disponibili, Venduti | funziona | `a1-inv-filtri`: le card e «N prodotti» coincidono con i prodotti salvati (6, 5, 1). | |
| Inventario › filtro Attenzione (lista) | funziona | `a1-inv-filtri`: mostra VIS-0098, l'unico prodotto con avvisi salvati (dormiente e promozione). | |
| Inventario › numero sulla pillola Attenzione | non funziona | `a1-inv-filtri`: la pillola dice «Attenzione 2» ma il prodotto è uno solo. | Conta gli avvisi, non i prodotti: `HomeScreen.tsx:61-64`. |
| Inventario › filtro Cestino | funziona | `a1-inv-elimina`: «Cestino 2» con VIS-0142 e VOL-0087; «Tutti 4». | |
| Inventario › pillole delle cartelle | funziona | `a1-inv-filtri`: Pellicce 3, Collezione Inverno 2, Usato e permute 1, come `libraryId`. Pellicce + Disponibili dà 2. | |
| Inventario › ricerca per SKU e tipo | funziona | `a1-inv-ricerca`: «VIS» e «visone» trovano VIS-0142 e VIS-0098. | |
| Inventario › ricerca per posizione | non funziona | `a1-inv-ricerca`: «Stand A» non trova nulla, «stand_a» trova VOL-0087. «Sartoria» funziona solo perché l'id è il nome in minuscolo. | Confronta l'id, non il nome: `HomeScreen.tsx:87`. |
| Inventario › ricerca dentro Cestino e Attenzione | non funziona | `a1-inv-ricerca`: «PUZ» dentro Attenzione mostra VIS-0098. `a1-inv-elimina`: «VOL» nel Cestino mostra anche VIS-0142. | I due filtri escono prima della ricerca: `HomeScreen.tsx:77-78`. |
| Inventario › messaggio con lista vuota (D06) | funziona | `a1-inv-ricerca`: con «ZZZ» compare «Nessun prodotto qui». | D06 risolto. |
| Selezione › Seleziona tutto e Deseleziona | funziona | `a1-inv-cartelle`: l'etichetta passa a «Deseleziona»; dopo il tocco la barra sparisce. | |
| Selezione › sposta in cartella | funziona | `a1-inv-cartelle`: i 6 prodotti salvati hanno `libraryId` «usato-e-permute». | Nessun evento in cronologia (0 nuovi), vedi N6. |
| Selezione › rimuovi dalla cartella | funziona | `a1-inv-cartelle`: VIS-0142 e VOL-0087 restano senza `libraryId`; la pillola Usato e permute ne mostra 4. | |
| Selezione › elimina | funziona | `a1-inv-elimina`: `deletedAt` su 2 prodotti e 2 eventi `deleted`. L'Annulla è già provato in `t-alert.cjs`. | |
| Scheda › peso | non funziona | `a1-scheda-visore`: si legge «2.1 kg» e non «2,1 kg». | `DetailScreen.tsx:916`; anche 79, 112 (testi da condividere) e 672 (PDF). |
| Scheda › visore delle foto | non funziona (web) | `a1-scheda-visore`: con il contatore a 1/3 o 3/3 il visore mostra sempre la foto 2. La rotella non lo fa scorrere. Lo scorrevole del visore è largo 1125 px e parte da -375. | `alignItems: 'center'` di `modalContainer` (`DetailScreen.tsx:1745-1750`) e lo ScrollView senza larghezza (`:1295`) fanno sì che lo ScrollView diventi largo quanto le 3 foto e venga centrato: si vede la foto di mezzo e non c'è niente da scorrere. Anche `contentOffset` (`:1305`) non esiste sul web. Su Android non verificato. |
| Scheda › condividi Cliente (testo) | funziona | `a1-scheda-condividi`, con `navigator.share` finto: titolo «VIS-0142 - Visone», misure, prezzo, note, «Disponibile presso: Vetrina». | I prezzi usano `toLocaleString()` del dispositivo (`DetailScreen.tsx:84`). |
| Scheda › condividi Professionista (testo) | funziona | `a1-scheda-condividi`: scheda tecnica completa, margine compreso. | L'evento «foto aggiunte» lascia una riga vuota («20 nov: »): `DetailScreen.tsx:142-150`. |
| Scheda › condividi (foglio del sistema) | non verificabile da qui | Serve il foglio di condivisione del telefono. Nel browser di prova, senza Web Share, non succede nulla: c'è solo un errore in console. | Nessun avviso all'utente: `DetailScreen.tsx:180-182, 201-203`. Come `url` passa una data-URI di 82 KB (`:175-177`). |
| Scheda › Stampa scheda PDF | non funziona (web) | `a1-scheda-pdf-gs1`: compare «Impossibile generare il PDF». Sul web `printToFileAsync` apre la stampa della pagina dell'app (1 chiamata a `window.print`) e non restituisce nulla. | `DetailScreen.tsx:729` (`{ uri }` di undefined). Sul web le foto si perdono (`:338`, `readAsStringAsync` non disponibile). Su telefono non verificabile. |
| Scheda › etichetta QR / Barcode | non funziona (web) | `a1-scheda-etichetta` (PUZ-0012): la finestra si apre e il barcode viene disegnato, ma «Stampa Etichetta» dà due volte «Impossibile stampare l'etichetta». `a1-scheda-pdf-gs1`: su VIS-0142 il pulsante non c'è. | `DetailScreen.tsx:318`. Si raggiunge solo dai prodotti senza link GS1: `:1143-1181`. |
| Scheda › D16 (PDF senza campi personalizzati, servizi esterni) | non funziona (confermato) | Lettura del codice e `curl`. | L'HTML del PDF (`DetailScreen.tsx:616-727`) non usa `customData`. URL esterni: `api.qrserver.com` (`:704`) e `barcodeapi.org` (`:709`) nel PDF; `cdn.rawgit.com` (`:250`, oggi un 301 verso jsdelivr) e `cdn.jsdelivr.net` (`:304`) nell'etichetta. Senza internet i codici mancano. Il titolo del PDF è ancora «FurInventory Pro» (`:619`, D07). |
| Scheda › copia link GS1 | funziona | `a1-scheda-pdf-gs1`: gli appunti contengono esattamente `gs1DigitalLink`; compare l'avviso «Copiato». | |
| Scheda › programma tag NFC | non verificabile da qui | Serve un lettore NFC. Sul web compare «Operazione Annullata - Pulizia del tag non completata». | `DetailScreen.tsx:748-775`. |
| Scheda › apri documento allegato | non verificabile da qui | Usa la condivisione del sistema su URI `file:///` che non esistono nel campionario. | `DetailScreen.tsx:996`. |
| Scheda › Modifica | funziona | Tutti gli scenari `a1-mod-*` entrano in Modifica dalla scheda. | |
| Modifica › prezzo, posizione, cartella | funziona | `a1-mod-base`: salvati `sellPrice` 4500, `location` «sartoria», `libraryId` «pellicce»; poi torna alla scheda. | |
| Modifica › numeri con la virgola | non funziona | `a1-mod-base`: il peso «2,5» viene salvato come 2. | `parseFloat` (`EditScreen.tsx:150-154`). Dal codice, «4.500» diventerebbe 4,5 €. |
| Modifica › campi personalizzati già presenti | funziona | `a1-mod-personalizzati`: salvati Fornitore «Pellicceria Rossi», Taglia L, Condizione Buono, Colore Nero, Dettagli + Cappuccio. | |
| Modifica › D03 (campi vuoti o creati dopo) | non funziona (confermato) | `a1-mod-d03`: per PUZ-0012 manca la sezione «Campi personalizzati»; per VOL-0087 c'è Taglia ma mancano Fornitore e Condizione. | `EditScreen.tsx:486-491`. |
| Modifica › SKU vuoto e Annulla | funziona | `a1-mod-peso-annulla`: con SKU vuoto compare «Campi Obbligatori» e resta lo SKU salvato; dopo Annulla `sellPrice` resta 4200. | |
| Modifica › aperta dall'indirizzo o ricaricata | non funziona (web) | `a1-mod-d03` (`product/edit/cmp-1`): SKU vuoto, 0 foto, nessuna posizione (schermata `a1-mod-d03-diretto.png`). | Lo stato si crea una volta sola, prima che i prodotti siano caricati: `EditScreen.tsx:41-64`. Vedi N1. |
| Modifica › pulsante QR del codice CITES | non funziona | `a1-mod-scanner-cites`: il tocco cambia «IT-CITES-2026-004512» in «SCAN-2702» e il salvataggio lo conserva. | Scrive un codice finto al posto di aprire la fotocamera: `EditScreen.tsx:710-715` (come D02 in Aggiungi). |
| Modifica › foto da Galleria e Fotocamera, Allega documento | non verificabile da qui | Servono la galleria, la fotocamera o il selettore di file del telefono. Non ho provato la rimozione di una foto né il campo data. | `EditScreen.tsx:75-113, 603-616, 666-692`. |
| Modifica › link GS1 | non funziona | `a1-mod-base`: dopo il salvataggio il link passa da `.../21/000142` a `.../21/MWRFCLG5-8MPZ88`. | Il link si rigenera a ogni salvataggio: `EditScreen.tsx:129-143`. |
| Modifica › campo personalizzato nel cestino | non funziona | `a1-mod-campo-nel-cestino`: «Fornitore» è stato messo nel cestino scrivendo `deletedAt` in localStorage, non dalla schermata. Un salvataggio senza modifiche cancella il valore «Pellicceria Bianchi, Milano». | `EditScreen.tsx:158-162`. Contraddice la promessa di `TrashScreen.tsx:66`. |
| Cronologia › evento dopo modifica di prezzo o posizione | funziona | `a1-mod-base`: 1 evento `modified` «Posizione: vetrina → sartoria \| Prezzo vendita: €4200 → €4500». | La posizione compare come id e come «modificato», non «spostato». |
| Cronologia › evento dopo modifica di peso, cartella o campi personalizzati | non funziona | `a1-mod-peso-annulla` e `a1-mod-personalizzati`: 0 eventi nuovi. | Si tracciano solo posizione, prezzi, note e foto: `InventoryContext.tsx:410-434`. |
| Cronologia › filtri per tipo e periodo | funziona | `a1-crono-filtri`: 24 combinazioni, tutte uguali al conteggio calcolato dagli 11 eventi salvati. | «Questa Settimana» e «Questo Mese» sono gli ultimi 7 e 30 giorni (`TimelineScreen.tsx:118-123`). |
| Cronologia › eventi dopo modifica ed eliminazione | funziona | `a1-crono-eventi`: «Oggi» mostra 2 eventi («Prezzo vendita: €4200 → €4300» e «Spostato nel Cestino»); «Modificati» + «Oggi» ne mostra 1. | |
| Cronologia › tocco su un evento | funziona | `a1-crono-eventi` apre `/product/cmp-1`. `a1-cestino-elimina`: per un prodotto eliminato per sempre compare «Prodotto Non Trovato». | |
| Cestino › apertura da Impostazioni | funziona | `a1-cestino-ripristina`: la voce porta a `/settings/trash` con «Cestino (2)». | |
| Cestino › ripristina (Annulla e conferma) | funziona | `a1-cestino-ripristina`: dopo Annulla `deletedAt` resta; dopo la conferma sparisce, c'è l'evento `restored` e si legge «Cestino (1)». | |
| Cestino › elimina per sempre | funziona | `a1-cestino-elimina`: 5 prodotti salvati, `deleted_product_ids` = [cmp-2], «Il cestino è vuoto», pillola «Cestino 0». | I 3 eventi di VOL-0087 restano come «Prodotto eliminato - …»; nessun evento per l'eliminazione definitiva. |
| Cestino › svuota | non funziona (assente) | `a1-cestino-ripristina`: non c'è alcun testo «Svuota». | `TrashScreen.tsx` non ha questa azione. |

**Conteggio:** 24 funzionano, 16 non funzionano (di cui 4 solo sul web, 2 difetti noti confermati e 1 funzione assente), 4 non verificabili da qui.

Difetti noti:
- D03 e D16 confermati.
- D06 risolto (provato).
- D05 risolto nel codice: la card usa nome e colore della posizione (`HomeScreen.tsx:182-236`).
- D04 risolto nel codice: la Scheda ordina i campi con `orderByLayout` (`DetailScreen.tsx:939`); l'ordine sullo schermo non è stato provato.
- D07 risolto in Inventario ma non nel PDF.
- D17 risolto nel codice (`DetailScreen.tsx:46-52`).

## Difetti nuovi

- **N2 (grave, provato)**: se un campo personalizzato è nel cestino, salvare un prodotto in Modifica ne cancella il valore (`EditScreen.tsx:158-162`). Nella prova il campo è stato messo nel cestino via localStorage. Il cestino invece promette che i dati restano (`TrashScreen.tsx:66`).
- **N3 (grave, provato)**: Modifica legge i numeri con `parseFloat`. «2,5» è stato salvato come 2; dal codice, «4.500» diventerebbe 4,5 (`EditScreen.tsx:150-154`).
- **N4 (grave, provato)**: ogni salvataggio in Modifica genera un link GS1 con un seriale nuovo (`EditScreen.tsx:129-143`). Un tag NFC o un'etichetta già fatti puntano al link vecchio.
- **N16 (provato)**: in Modifica il pulsante QR di un campo con scanner sostituisce il codice salvato (nella prova il CITES) con un codice finto `SCAN-<numero>` (`EditScreen.tsx:710-715`).
- **N1 (web, provato in parte)**: Modifica aperta dall'indirizzo o dopo una ricarica mostra il modulo vuoto (`EditScreen.tsx:41-64`). È stato provato solo il modulo vuoto. Il resto è dedotto dal codice: se l'utente aggiunge una foto (richiesta a `:123`), compila e salva, il prodotto viene sovrascritto e i campi personalizzati svuotati (`:158`).
- **N5 (web)**: il visore delle foto mostra sempre la seconda foto, qualunque sia il contatore, e non scorre. Lo ScrollView senza larghezza viene centrato da `alignItems: 'center'` (`DetailScreen.tsx:1295` e `:1745-1750`).
- **N6**: la cronologia non registra le modifiche a peso, misure, tipo, SKU, cartella e campi personalizzati. Non registra nemmeno lo spostamento in cartella dalla selezione multipla (`InventoryContext.tsx:410-434`, `HomeScreen.tsx:139-141`). Il cambio di posizione fatto da Modifica risulta «modificato» con gli id, non «spostato» (`InventoryContext.tsx:411-412`).
- **N7**: la ricerca cerca l'id della posizione, non il nome: «Stand A» non trova nulla (`HomeScreen.tsx:87`).
- **N8**: nei filtri Cestino e Attenzione la ricerca viene ignorata (`HomeScreen.tsx:77-78`).
- **N9**: la pillola «Attenzione» e il riquadro «Richiedono attenzione» contano gli avvisi, non i prodotti: 2 invece di 1 (`HomeScreen.tsx:61-64`).
- **N10**: l'etichetta (QR e Barcode con «Stampa Etichetta») non si raggiunge per i prodotti che hanno il link GS1 (`DetailScreen.tsx:1143-1181`).
- **N11**: sul web PDF ed etichetta finiscono in errore (`DetailScreen.tsx:318, 729`). `expo-print` sul web chiama `window.print()` sulla pagina dell'app, e le foto vengono scartate (`:338`).
- **N12**: in un browser senza Web Share, «Condividi» non fa nulla e non avvisa (`DetailScreen.tsx:180-182, 201-203`).
- **N13 (minore)**: nel testo Professionista l'evento «foto aggiunte» lascia una riga vuota (`DetailScreen.tsx:142-150`).
- **N14 (minore)**: il Cestino mostra il tipo in minuscolo e l'id della posizione: «volpe - stand_a» (`TrashScreen.tsx:175`).
- **N15 (minore)**: la Cronologia non ha filtri per eliminati, ripristinati e scansionati; si vedono solo in «Tutti» (`TimelineScreen.tsx:20-27`).
