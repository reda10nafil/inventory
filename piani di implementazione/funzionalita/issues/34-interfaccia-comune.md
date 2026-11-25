# Interfaccia comune (UX1): binario a tutta riga, finestra dal basso unica, pezzi comuni

Tipo: piano di UX0 (direzione R1-R15 e fetta UX1, `ux0/direzione.md` e `ux0/piano-fette.md` nelle note dell'orchestratore) più la richiesta dell'utente del 24. Stato: **UX1-0 fatta** il 24 novembre 2026 (corsia A, `funzioni/magazzino`; SHA nel `git log` e nella voce di `../../CRONOLOGIA.md`); UX1-1…8 da fare. Riga 11b (UX1-0) e 13c (UX1-1…7) di [`map-3.md`](../map-3.md).

## Le parole dell'utente (24 novembre)

Tipo di pelle, Posizione e Categoria in Aggiungi devono tornare **un binario orizzontale** (dal 22, D09, andavano a capo). Con EDC il binario c'era, ma in Aggiungi Posizione e Categoria stanno a mezza colonna e, per la regola R1 di UX0 (binario solo a tutta larghezza), erano diventate tendine. **La richiesta dell'utente vale più di R1.**

## UX1, tutta (dal piano di UX0)

Solo presentazione: nessun dato cambia, nessuna chiave nuova (salvo `collapsed?` di MOD).

| Pezzo | Che cosa | Quando |
| --- | --- | --- |
| **UX1-0** | Binario a tutta riga in Aggiungi; `Sheet` (finestra dal basso, R14) e `ChoiceRail` (binario, R1) in `components/ui/`; bordo di campi e pillole di Minimal (R9) | prima di MOD (fatta) |
| UX1-1 | Impostazioni in 6 sezioni, righe da 52 in una card per sezione, lessico, icone neutre | dopo ACC1 o con lei |
| UX1-2 | Home: via le card dei numeri, «Da controllare», Scanner nell'intestazione | dopo MSET |
| UX1-3 | Automazioni e Azione rapida | dopo MSET |
| UX1-4 | Posizioni e Categorie: elenco prima, modulo in una finestra dal basso | dopo CAT0 |
| UX1-5 | Scanner: testi e pulsanti in basso | — |
| UX1-6 | Cronologia: una riga di filtri e «Periodo ▾» | — |
| UX1-7 | Scheda prodotto | dopo MOD ed ETI |
| UX1-8 | Lessico, pezzo per pezzo | con ogni pezzo |

Pezzi comuni del piano di UX0 **non** fatti in UX1-0, perché nessuna schermata li usa ancora: `BottomBar` (barra fissa «Salva prodotto»/«Salva campo», R11), `Toast` con «Annulla» (R13), `ListGroup`/`ListRow` (R9), `EmptyState` (R12). **Li fa la prima fetta che li usa**: MOD per la barra fissa, l'elenco dei Campi e l'avviso con «Annulla»; UX1-1 e UX1-4 per il resto. Niente componenti senza una schermata, niente pagine di prova nell'app. Fuori da UX1-0 anche le sezioni ripiegabili e il gruppo «Essenziale» (MOD) e le Impostazioni (UX1-1).

## Dentro UX1-0

1. **Binario a tutta riga in Aggiungi** (richiesta dell'utente). Un campo a scelta con l'aspetto **binario** (Tipo di pelle, Posizione, Categoria con la sottocategoria, i campi personalizzati a binario) che nel modulo sta in una colonna da 1/2 o 1/3 **si disegna su una riga intera**, al momento del disegno (`choiceRowSize` in `utils/fieldValues.ts`); gli altri campi della riga restano della loro larghezza e vanno a capo da soli. **Il layout salvato non cambia**: niente `version`, niente riscrittura (vincolo 1). Con «Menu a tendina» scelto in Campi resta tendina nella colonna; a capo, elenco verticale e ruota delle scelte in colonna restano tendina come prima; la ruota delle misure in colonna resta il campo che apre la finestra. La Categoria ha solo il binario: prende sempre la riga intera. In **Modifica** non cambia nulla: lì le scelte sono già a tutta larghezza e le misure a 1/3 sono ruote o campi scritti.
2. **`components/ui/Sheet.tsx`** (R14): maniglia, titolo, X «Chiudi», riga fissa facoltativa (`top`, la ricerca), contenuto che scorre, barra in basso facoltativa (`footer` con `SheetButton`), altezza fino al 90%, velatura `scrim` che chiude, Esc e tasto Indietro (telefono: `onRequestClose`; web: una voce della storia con lo stesso indirizzo, tolta alla chiusura). È **l'unica finestra dal basso delle scelte**: la ruota in colonna (`FieldInput`, era `BottomSheet` di `ChoicePicker`), l'«Elenco dal basso» delle scelte (`ChoicePicker`, era un `Modal` suo) e la categoria dello scaffale (`CategorySelect`). Etichette e testi uguali: «Chiudi», «Fatto», «Conferma Selezione», «Chiudi la scelta della categoria», «Cerca categoria».
3. **`components/ui/ChoiceRail.tsx`** (R1): è `ChipRail` di EDC spostato qui, usato da `ChoicePicker` e `CategoryPicker`. Esce fino al bordo dello schermo (la prima pillola resta allineata al modulo); all'apertura la scelta entra in vista e l'ultima pillola a vista è tagliata (spazio tra le pillole 8, da 4 a 16 solo quando serve, `railGap` in `utils/choiceRail.ts`), deciso una volta: un tocco dopo non fa scorrere. Pillole alte 36 (`RAIL_PILL`), 44 da toccare (`RAIL_HIT_SLOP`), anche quelle della Categoria.
4. **Minimal** (R9): `chip-border` e `input-border` da `#F4F4F2` (uguale al fondo, invisibile) a `#E7E6E3` in `piani di implementazione/ui-ux/temi/token-stili.json`, rigenerati con `genera_temi.py`: cambiano solo le due righe di `constants/themes/minimal.ts`; contrasti stampati uguali.

## Verifica

`__tests__/choiceRail.test.ts` (12, rossi prima del codice); prova `prova/ux10-scelte.cjs` (6 scenari: binari a tutta riga e salvataggio, tendina scelta in Campi, finestra della ruota e della categoria con X, Esc e Indietro, ultima pillola tagliata e scelta in vista, bordo di Minimal); `edc-binario` di `edc-editor.cjs` riscritto per la regola nuova; giro di tutta `prova/` confrontato con quello dell'Unione 1; foglio `prova/stili-ux10.jpg`. Non provato sul telefono (CF-T9: binari e finestre col dito, tasto Indietro di Android).

Dopo il parere del revisore (secondo commit): il binario tiene le misure per pillola e si ricalcola con pillole, larghezza o stile nuovi; le sottocategorie di un'altra categoria ripartono da capo; la storia del browser è condivisa tra le finestre (una finestra aperta subito dopo un'altra non si chiude più da sola). Restano annotati in `DECISIONI_DA_RIVEDERE.md`: lo scatto all'apertura del binario, la voce di Indietro che resta in due casi rari, la conferma prima di chiudere.

Secondo parere del revisore sulle correzioni (24/11 sera): i quattro rilievi sono chiusi, «si può salvare e pubblicare». Tre rilievi bassi passano a **MOD1**: (A) al cambio di stile sul telefono lo spazio del binario si calcola con le larghezze dello stile di prima (mettere lo stile nelle chiavi delle pillole di `ChoiceRail`); (B) la voce di storia della seconda finestra dipende dall'ordine degli ascoltatori di `popstate` (rimandare il `push` in attesa con `setTimeout(…, 0)` in `Sheet`); (C) le pillole del binario di `ChoicePicker` senza ruolo né stato «scelta» per chi legge lo schermo (già in `7af7e38`).
