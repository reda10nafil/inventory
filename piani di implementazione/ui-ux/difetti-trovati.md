# Difetti trovati leggendo il codice (22 novembre 2026)

Non fanno parte del grafo dei lavori sullo stile: sono comportamenti, non aspetto. Il ticket «Quali difetti correggere insieme allo stile» (`issues/09-difetti-da-correggere.md`) decide con l'utente quali entrano. Quelli marcati **visivo** toccano direttamente le schermate che verranno ridisegnate.

| N | Dove | Cosa succede | Tipo |
| --- | --- | --- | --- |
| D01 | Aggiungi, `AddScreen.tsx:417` | Una **scelta multipla** con aspetto a riquadri (quello predefinito) si comporta da scelta singola: la condizione `isSingle` è vera per ogni `grid`. In Modifica invece funziona da multipla. | comportamento |
| D02 | Aggiungi, testo breve con scanner | Il pulsante QR non apre la fotocamera: scrive un codice finto `SCAN-1234`. | comportamento |
| D03 | Modifica | Non segue il layout e mostra **solo i campi personalizzati già presenti nel prodotto**: un campo lasciato vuoto in Aggiungi, o creato dopo, non si può più compilare. | comportamento |
| D04 | Scheda capo | L'ordine dei campi strutturati è quello in cui l'utente li ha toccati in Aggiungi, non quello del layout. | visivo |
| D05 | Inventario | La card mostra l'id della posizione in maiuscolo («STAND_A» → «STAND A»), non l'etichetta né il colore. | visivo |
| D06 | Inventario | Nessun messaggio quando l'inventario o un filtro sono vuoti. | visivo |
| D07 | Inventario | Titolo «FurInventory Pro» invece di «Syncro Flow»; idem in Impostazioni › Info e nella scheda PDF. | visivo |
| D08 | Aggiungi | Titoli di sezione e titolo della finestra di scelta usano `typography.overline` e `typography.h3`, che non esistono. | visivo |
| D09 | Aggiungi | Le pillole di Posizione in una colonna da ½ vengono tagliate (scorrono, ma non si capisce). | visivo |
| D10 | Cronologia (web) | Le pillole dei filtri escono gonfie (alte quasi 80 px). Su Android non verificato. | visivo |
| D11 | Aggiungi | Messaggi con caratteri rotti «Ã¨» (codifica) in «è stato aggiunto» e nell'errore di salvataggio; byte non UTF-8 anche in `App.tsx` e `sectorTemplates.ts`. | visivo |
| D12 | Layout builder › MODELLI | Il modello crea i campi ma, quasi certamente, **non li aggiunge al layout**: cerca i campi nuovi in un elenco letto prima di crearli (`LayoutBuilderScreen.tsx:150-176`). Da provare. | comportamento |
| D13 | Modelli di settore | La schermata esiste ma nessuna voce di Impostazioni ci porta. «Salva campi attuali come modello» funziona solo su iOS. | comportamento |
| D14 | Azione rapida › cartella | «Vedi prodotti» perde il filtro della cartella (`compat.ts:17`). | comportamento |
| D15 | Spostamento Rapido, Audit | Spostano con `updateProduct`: in cronologia risulta «modificato», non «spostato». | comportamento |
| D16 | Scheda capo | Il PDF non contiene i campi personalizzati; etichetta e PDF scaricano codici da servizi esterni (serve internet). | comportamento |
| D17 | Scheda capo | Alcuni `useState` stanno dopo il ritorno «Prodotto non trovato»: viola le regole degli hook. | tecnico |
| D18 | Aggiungi | Senza foto salva un'immagine d'esempio presa da Unsplash. | comportamento |
| D19 | Impostazioni › Scanner & NFC | Le preferenze si salvano ma nessuno le legge; la lettura NFC non è usata. | comportamento |
| D20 | Codice morto | `app/`, `template/`, `components/DynamicFieldRenderer.tsx`, `src/lib/vectorIcons.ts`, `constants/Colors.ts` + `hooks/useThemeColor.ts`, parti di `backend-auth/`. | tecnico |
| D21 | Posizioni | I valori predefiniti sono scritti tre volte (`constants/config.ts`, `LocationsContext.tsx`, `hooks/useLocations.ts`). | tecnico |
| D22 | Aggiungi, `AddScreen.tsx:253-266` | Dopo il salvataggio vengono svuotati i campi di base e le foto, **non i campi personalizzati**: il prodotto successivo eredita i valori del precedente. | comportamento |
| D23 | Aggiungi, `AddScreen.tsx:187` | Lo SKU vuoto viene rifiutato («Compila almeno SKU…»), anche se suggerimento e nota dicono che si genera da solo. | comportamento |
| D24 | Aggiungi | «Obbligatorio» sui campi personalizzati disegna solo l'asterisco: non viene mai controllato. | comportamento |
