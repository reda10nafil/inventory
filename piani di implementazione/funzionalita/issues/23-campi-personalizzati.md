# Campi personalizzati: tipi, modi di inserimento, lettura veloce

Tipo: grilling + research (verifica). Stato: **verificato** il 23 novembre 2026 mattina; disegno **approvato dall'utente** nella sua forma generale (un posto solo, ticket 25); la domanda aperta (icone e colori nella card o nella Scheda) risolta dall'orchestratore il 24 con la proposta, da rivedere con l'utente. Fette: **VAL** (valori corretti, **fatta il 23/11**, vedi sotto) e **EDC** (editor e lettura, **fatta il 24/11**). Mappa: [`../map-3.md`](../map-3.md). Verifica completa: [`../ricerche/verifiche-23/verifica-campi-layout-selettori.md`](../ricerche/verifiche-23/verifica-campi-layout-selettori.md) §0-1 (forma dei dati, difetti `CAM-F1…F11`).

## Question

Come devono funzionare i campi personalizzati perché si possano configurare con valori pronti, compilare in fretta con il controllo giusto e leggere a colpo d'occhio?

## Richiesta dell'utente (23 novembre mattina)

> «Se vado a creare un campo non ho tutte le funzionalità, non posso scegliere se il campo deve contenere solamente, devo scriverlo lì nel momento sul tasto aggiungi, oppure posso configurarlo già all'interno con dei campi già precompilati.»
> Valori pronti mostrati come «una tenda a scomparsa, un menu a scomparsa, oppure dei campi scorrevoli, verticali e orizzontali, oppure un picker per settare in modo veloce la lunghezza e larghezza».
> «Quando li devo leggere vorrei avere magari delle icone giuste per una lettura veloce con gli occhi.» «Se è solamente un campo, se ci sono più campi, i colori.» «Dovresti capire come funzionano i campi personalizzati, come migliorarli al meglio e farli.»

## Stato verificato (sintesi)

- **Forma dei dati** (resoconto §0): registro `furinventory_custom_fields:{org}` (campi Base con `isSystem`, cestino con `deletedAt`); valore nel prodotto `customData: { value, fieldSnapshot }[]` con la **copia completa** del campo; scelte salvate come **etichetta**; numeri salvati come stringa scritta; opzioni con id `opt_i` rigenerati a ogni salvataggio. Registro e layout non viaggiano nel cloud, le categorie sì.
- Tipi di oggi: numero, valuta, data, testo breve (con lettore), testo lungo, immagini, scelta singola, scelta multipla, documento. Aspetti: riquadri, contatore, segmenti, elenco dal basso; in pratica due disegni per quattro nomi (CAM-F8).
- **Difetti che rovinano dati**: rinominare un'opzione stacca i prodotti che l'avevano (**CAM-F1**, provato); valuta con la virgola → «NaN,undefined» nella Scheda (**CAM-F2**); il contatore mostra un valore che non salva (**CAM-F3**); Modifica non controlla gli obbligatori (**CAM-F4**) e non ha il contatore (**CAM-F5**); `updateField`/`deleteField` partono dall'elenco della schermata (CAM-F11, dedotto).
- Altri: un campo rinominato resta col nome vecchio nella Scheda dei prodotti già salvati (CAM-F6); icona del layout builder che non arriva alla Scheda (CAM-F7); testi tecnici o in inglese («Field Builder», «GRID/SEGMENTED…», «Max 100 caratteri» non applicato) (CAM-F9); il tipo non si cambia dopo la creazione (CAM-F10).
- Manca: valori pronti per testo e numero, «scegli o scrivi», valore predefinito, menu a tendina, pillole scorrevoli, ruota, passo del contatore, campo Sì/No, colori, icone nelle opzioni, nella card e nel PDF; i campi non sono nella card, nel PDF (D16), nei testi condivisi, nella ricerca; nel CSV sono un JSON illeggibile (ticket 26).
- Codice morto: `components/DynamicFieldRenderer.tsx` (783 righe, nessuno lo importa); Aggiungi e Modifica hanno due disegnatori dei campi duplicati.

## Decisioni

- **Utente (23 mattina)**: un solo posto, Impostazioni › Campi con le schede «Campi» e «Modulo» per categoria (ticket 24 e 25).
- **Proposte dell'orchestratore** (dal resoconto §1.4):
  - editor del campo in **tre domande**: *che cosa contiene* (Testo, Numero/Misura con unità, Prezzo, Data, Sì/No, Scelta una o più, Foto, Documento), *come si compila* («Lo scrivo io», «Scelgo da un elenco», «Scelgo o scrivo», «Contatore +/−» con minimo, massimo e passo, «Ruota» per le misure da/a/passo), *come si vede* (per le scelte: Riquadri, Pillole scorrevoli, Menu a tendina, Elenco dal basso; icona e colore);
  - opzioni con **id stabile**, etichetta, colore e icona facoltativi; valore predefinito facoltativo; «Mostra nella card» (al massimo 2 campi);
  - un solo disegnatore per Aggiungi e Modifica (`components/FieldInput.tsx`) e uno per la lettura (Scheda, card, PDF).
- ~~**Da chiedere quando EDC è la prossima**: per la lettura veloce, icone e colori contano di più nella **card dell'Inventario** (1-2 campi scelti, es. Taglia e Colore) o basta la **Scheda**?~~ **Decisa dall'orchestratore al posto dell'utente, 24/11** (proposta, da rivedere con lui): la Scheda li mostra sempre; la card solo per i campi con «Mostra nella card», al massimo 2, spento per tutti i campi di partenza (la card di oggi non cambia finché l'utente non accende un campo).

## Piano di implementazione

### Fetta VAL — valori corretti e disegnatore unico (dopo C2) — **fatta il 23/11**

**Confine** (decisione dell'orchestratore, notte del 23, in `../../DECISIONI_DA_RIVEDERE.md`): i punti 1-7 qui sotto. Fuori: l'editor in tre domande, gli aspetti nuovi (tendina, pillole, ruota, Sì/No, predefinito, «Scelgo o scrivo») e la lettura con icone e colori, cioè CAM-F6…F10 (EDC); la rimozione di `DynamicFieldRenderer.tsx` (EDC); il modulo per categoria (MOD); le colonne dei campi nel CSV (EXP).

**Fatto** (dettagli in `../../CRONOLOGIA.md`): `utils/fieldValues.ts` (opzioni a id stabili, lettura delle etichette di prima nell'ordine id → etichetta di adesso → etichetta nella copia del prodotto, numeri, contatore, stesso valore, testo da mostrare) con `__tests__/fieldValues.test.ts`; `components/FieldInput.tsx` unico per Aggiungi e Modifica (con la finestra delle scelte, il calendario, il lettore, il contatore in Modifica e la riga rossa dopo un salvataggio rifiutato) e `hooks/useFieldOptions.ts`; registro normalizzato una volta (`normalizeField`) e scritture dall'elenco più recente (CAM-F11); editor delle opzioni = `OptionsEditor` su una bozza, valore usato non eliminabile; Scheda e Cronologia con le etichette di adesso, valuta «12,50 €»; Modifica con gli obbligatori di Aggiungi e senza riscrivere i campi non toccati; Tipi di pelle collegati salvati con l'id (punto 7); «Imposta Campo» di ESE allineato (id e numero). Scelta aperta del punto 3: **il minimo è il valore iniziale vero, salvato** in Aggiungi; in Modifica un valore assente resta «–» finché non si tocca. Prova `prova/val-campi.cjs` (8 scenari, 2 dopo il parere del revisore: nome ritirato non riusabile, nome non salvato che ferma «Aggiorna»), collaudo CF-C4 e CF-B3 (parti VAL), foglio `prova/stili-val.jpg`.


1. **Opzioni a id stabili** (chiude CAM-F1): `options: { id, label, color?, icon? }[]` diventa la fonte; `dataset` tenuto allineato o letto come ripiego. Alla prima lettura le opzioni senza id stabile ricevono l'id una volta sola e si **conservano** gli id esistenti; mai rinumerare (vincolo 2 della mappa). Le scritture nuove salvano l'**id** dell'opzione; i valori vecchi (etichette) si leggono abbinandoli all'opzione con la stessa etichetta (`isChoiceSelected` lo fa già). Nessuna riscrittura dei prodotti. L'editor delle opzioni è `OptionsEditor` della fetta C2.
2. **Numeri** (CAM-F2): si scrivono come numero con `parseNumber` (C01); i vecchi valori stringa si leggono con `parseNumber`. Valuta con `formatPrice` su un numero valido.
3. **Contatore** (CAM-F3): il valore mostrato è quello salvato (il minimo diventa il valore iniziale vero, o il campo parte vuoto: scelta da annotare).
4. **Modifica** (CAM-F4, F5): stesso controllo degli obbligatori di Aggiungi (`missingRequiredFields`), stesso contatore.
5. `components/FieldInput.tsx`: un disegnatore per Aggiungi e Modifica (sostituisce `AddScreen.tsx:466-748` e `EditScreen.tsx:517-793`); `utils/fieldValues.ts` (normalizzazione e testo da mostrare) con test.
6. `CustomFieldsContext`: `updateField`/`deleteField` dall'elenco più recente (CAM-F11).
7. `linkTo: 'furType'`: le scelte collegate ai tipi di pelle salvano l'id, le vecchie etichette si leggono per abbinamento (resto di C2).

### Fetta EDC — editor in tre domande e lettura veloce (dopo VAL) — **fatta il 24/11**

**Confine** (decisione dell'orchestratore, 24/11, in `../../DECISIONI_DA_RIVEDERE.md`): i punti 1-6 qui sotto. Fuori: il **PDF con i campi (D16), che va a ETI** insieme alle etichette (ticket 22); il modulo per categoria (MOD, MCAT); le colonne dei campi nel CSV (EXP). Scelta aperta (card o Scheda) risolta con la proposta: Scheda sempre, card solo con «Mostra nella card», al massimo 2, spento per i campi di partenza.

**Fatto** (dettagli in `../../CRONOLOGIA.md`): editor in tre domande in `FieldsScreen` (1. che cosa contiene: dieci voci in italiano semplice; 2. come si compila: lo scrivo io, col lettore, contatore e ruota con Da/A/Passo, scelgo da un elenco o «Scelgo o scrivo», da dove vengono i valori; 3. come si vede: Binario orizzontale (predefinito), A capo, Riquadri, Elenco verticale, Menu a tendina, Elenco dal basso, Ruota, icona, «Mostra nella card»; valore predefinito; «Cambia tipo» con i tipi non permessi spiegati); campi raggruppati per tipo col numero; `components/ChoicePicker.tsx` (tutti gli aspetti delle scelte, binario `ChipRail` con la sfumatura, ruota a scatti `Wheel`) usato da `FieldInput` e da Tipo di pelle e Posizione in Aggiungi e Modifica, con l'aspetto scelto in Campi (richieste dell'utente del 24: binario predefinito, anche per Categoria; revisione UX0: binario solo a larghezza intera, in colonna tendina, ruota «stile orologio» a 5 righe che in colonna si apre in una finestra dal basso; testi «Obbligatorio» e «sempre presente»; «Salva campo» in basso fisso lasciato a MOD); `FieldInput` con «Scelgo o scrivo», ruota delle misure, Sì/No e testo breve fermo a 100; colore e icona dei valori (`OptionsEditor`, `OptionMark`); Scheda dal registro con ripiego sulla copia e icona del modulo (CAM-F6, F7), pillole colorate; card con i campi accesi; ricerca dell'Inventario nei campi; misure Base con `FieldInput` (scritte o ruota, matita «Come si compila»); `DynamicFieldRenderer.tsx` tolto; `parseFurTypes` col colore. Logica in `utils/fieldValues.ts` (sezione EDC) con `__tests__/fieldEditor.test.ts`. Prova `prova/edc-editor.cjs` (16 scenari, 2 dopo il parere del revisore) con `prova/edc-util.cjs`, collaudo CF-B3 completo, foglio `prova/stili-edc.jpg` (`FETTA=edc`). Non provati: sul telefono la ruota col dito, la tendina e la tastiera.

1. `FieldsScreen`: editor in tre domande (sopra); testi in italiano semplice (CAM-F9, «Max 100 caratteri» applicato); tipo modificabile dove i valori lo permettono (testo ↔ testo lungo, numero ↔ prezzo; CAM-F10), altrimenti spiegato.
2. Aspetti nuovi in `FieldInput`: menu a tendina in linea, pillole scorrevoli orizzontali, ruota per le misure, contatore con il passo; Sì/No; valore predefinito; «Scelgo o scrivo» (elenco più testo libero che può diventare un'opzione nuova, con conferma).
3. Lettura: icone e colori dal **registro** con ripiego sulla copia `fieldSnapshot` (chiude CAM-F6 e CAM-F7); colore delle opzioni come pillola nella Scheda; «Mostra nella card» (fino a 2 campi, secondo la risposta); campi nel PDF nell'ordine del modulo (D16, insieme a ETI: **lasciato a ETI**, ticket 22) e nella ricerca dell'Inventario.
4. Le misure Base (lunghezza, larghezza, altezza da S2, peso) usano lo stesso `FieldInput` con «Ruota» o testo.
5. Si toglie `components/DynamicFieldRenderer.tsx` (con il testo «Cartella» notato da C1).
6. `utils/furTypes.ts`: `parseFurTypes` tiene `color` se le opzioni avranno un colore.

## Piano di verifica

- **VAL**: jest `fieldValues.test.ts` (etichetta vecchia ↔ id nuovo, numeri «12,50» e «1.250,00», contatore). Prova nuova `prova/val-campi.cjs`: rinomina «M» → «Media» con VIS-0142 che resta selezionata in Modifica e mostra «Media» nella Scheda; valuta «12,50» → Scheda «12,50 €»; contatore non toccato salvato col valore mostrato; Modifica che rifiuta un obbligatorio tolto; Pezzi con il contatore in Modifica. Regressioni: `a2-campi.cjs`, `c07-campi-modelli.cjs`, `c08-modifica-campi.cjs`, `a1-modifica.cjs`, `a2-aggiungi.cjs`, `a1-cestino.cjs` (P02), `c2-tipo-pelle.cjs`.
- **EDC**: prova nuova `prova/edc-editor.cjs`: un campo per ogni combinazione «contiene / si compila / si vede» creato dall'interfaccia e compilato in Aggiungi; valore predefinito; «Scelgo o scrivo»; icona e colore visibili nella Scheda e (se scelto) nella card; campo rinominato con il nome nuovo nella Scheda; PDF con i campi (sul telefono). Regressioni come VAL più `a1-scheda.cjs`, `v5-lettura` (in `ricerche/verifiche-23/script/campi/`).
- 5 stili: `stili-val.jpg`, `stili-edc.jpg` (editor e Aggiungi con i nuovi aspetti).

## Come si torna indietro

Tutte le proprietà nuove sono facoltative: un campo senza `input`, `color`, `defaultValue` si comporta come oggi. Gli id dei campi e delle opzioni non cambiano mai, quindi i valori restano leggibili.
