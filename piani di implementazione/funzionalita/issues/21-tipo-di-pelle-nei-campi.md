# «Tipo di pelle» solo nei campi, freccia Indietro dopo un ricaricamento

Tipo: grilling. Stato: **deciso** il 23 novembre 2026 mattina (risposta dell'utente), con il piano. Fetta: **C2**, piccola, prima di S1b. Dipende da S1a (`7bfcd72`). Mappa: [`../map-3.md`](../map-3.md). Verifiche: [`../ricerche/verifiche-23/verifica-campi-layout-selettori.md`](../ricerche/verifiche-23/verifica-campi-layout-selettori.md) §2 e [`verifica-indietro-icone.md`](../ricerche/verifiche-23/verifica-indietro-icone.md) §1-2.

## Question

Dove si gestiscono i valori di «Tipo di pelle» ora che la categoria è la cartella (C1)? E perché la freccia Indietro sparisce?

## Richiesta e risposta dell'utente (23 novembre mattina)

> «La categoria che era assegnata al posto delle cartelle… è stata configurata sotto dei campi personalizzati che era tipo di pelle. Quello era solamente un campo personalizzato e lì doveva rimanerci.»
> «Il tasto indietro nelle pagine è scomparso.»

Alla domanda «Tolgo la voce Tipi di pelle dalle Impostazioni e lo gestisci solo da Campi Personalizzati?» la risposta è stata **«Sì, solo nei campi»**.

## Stato verificato (23 mattina)

- C1 (`345f255`) ha già fatto della categoria l'interfaccia delle cartelle, e «Tipo di pelle» è il campo Base `furType` in Campi Personalizzati. Resta di M01 la voce a parte Impostazioni › Tipi di pelle (`settings/categories`, `FurTypesScreen`).
- **Le opzioni dei campi a scelta e i valori di Tipo di pelle hanno forme opposte** (CAM §2.2, provato sul web): le prime sono stringhe con id rigenerati `opt_i` a ogni salvataggio e il prodotto salva l'etichetta, quindi rinominare un'opzione stacca i prodotti (CAM-F1); i tipi di pelle hanno `{ id, label }` con id stabile e il prodotto salva l'id. **Non si usa l'editor delle opzioni di oggi**: porterebbe CAM-F1 nel Tipo di pelle.
- **Freccia Indietro** (IND §1, provato sul web): nessuna schermata l'ha persa nel codice. Manca quando si apre o si ricarica un indirizzo interno (lo stack ha una sola schermata: 11 schermate con intestazione nativa), e lì frecce, X, «Salva» e «OK» danno `GO_BACK` in console e non fanno nulla (IND-1, IND-2). Team, Chat e Crea automazione danno «Page Not Found» ricaricando (P29, AU-V11): mancano in `linking.ts`.

## Piano di implementazione (fetta C2)

1. **`components/OptionsEditor.tsx`** nuovo, già nella forma del disegno futuro dei campi (ticket 23): lavora su `{ id, label, color? }[]` con id stabili; `onAdd`, `onRename`, `onDelete`, `usedBy(id)` (conteggio dei prodotti che usano il valore, cestino compreso). Logica pura dei controlli in `utils/furTypes.ts` (già c'è `furTypeNameError`) con test.
2. **Campi Personalizzati**: il campo Base «Tipo di pelle» ha la matita, che apre **solo** l'editor dei valori; nome, tipo e icona restano bloccati. Gli altri campi Base restano non modificabili. Regole riportate da `FurTypesScreen`: doppioni rifiutati senza badare a maiuscole e accenti; valore usato non eliminabile (con il conteggio); **almeno un valore resta** (`parseFurTypes` legge una lista vuota come i predefiniti).
3. **Togliere la voce** Impostazioni › Tipi di pelle (`SettingsScreen.tsx`). L'indirizzo `settings/categories` resta registrato e apre Campi Personalizzati con l'editor di «Tipo di pelle» aperto (nessun indirizzo morto; decisione annotata). `FurTypesScreen` si toglie se nessuno la usa più.
4. **Dati invariati**: chiave `furinventory_categories:{org}`, stessi id, `Product.furType` non toccato. Da dire nel messaggio del rinomina: i campi personalizzati con «Sorgente Dati: Tipi di pelle» (`linkTo: 'furType'`) salvano l'etichetta e non seguono il nome nuovo (resta per il ticket 23).
5. **Freccia Indietro** in `src/navigation/linking.ts` (scelta A del resoconto, provata iniettandola nel bundle: frecce presenti, 0 `GO_BACK`):
   - `initialRouteName: '(tabs)'` alla radice della `config`;
   - un `getStateFromPath` di circa 10 righe che sotto `settings/*` e `automations/*` dà alla `(tabs)` aggiunta la scheda madre (`settings` o `automations`), così la freccia torna a Impostazioni o ad Automazioni e non alla Home (decisione dell'orchestratore: è ciò che ci si aspetta; da annotare);
   - i tre indirizzi mancanti `settings/team`, `chat`, `settings/automation-builder` (P29, AU-V11). Team sul web avvierà l'host anche alla ricarica: annotarlo.
6. Decisioni in `DECISIONI_DA_RIVEDERE.md`, voce in `CRONOLOGIA.md`, riga C2 in `map-3.md`.

## Piano di verifica

- **Prova nuova `prova/c2-tipo-pelle.cjs`**: voce sparita da Impostazioni; `settings/categories` apre l'editor; aggiunta, rinomina di un valore usato (VIS-0142 resta `furType: 'visone'` e mostra il nome nuovo in Scheda, card, CSV e Aggiungi), eliminazione di un valore usato rifiutata con il conteggio, doppione «visone» rifiutato, ultimo valore non eliminabile; chiave salvata con la stessa forma `[{id,label}]`.
- **Prova nuova `prova/c2-indietro.cjs`** (scenari del resoconto IND, «Come si proverebbe» 1-4): per ogni indirizzo di `linking.ts`, compreso `settings/shelves`, aperto con `h.go`: freccia presente, il tocco porta alla scheda madre, 0 `GO_BACK`; ricarica di Categorie; `settings/team`, `chat`, `settings/automation-builder` senza NotFound; Azione rapida e Modifica aperte dall'indirizzo senza `GO_BACK`.
- **Regressioni: tutta la cartella `prova/`**, non solo le prove dei campi: con `initialRouteName` la Home è montata sotto ogni indirizzo diretto e ogni scenario entra con `h.go`. Prima, aggiungere `:visible` ai selettori indicati nel resoconto IND §2.2 (`a4-impostazioni`, `a4-posizioni`, `a4-cartelle`). Poi `controllo.sh` verde.
- 5 stili: `stili-c2.jpg` (Campi Personalizzati con l'editor aperto).
- Telefono (quando collegato): `adb shell am start -W -a android.intent.action.VIEW -d "syncroflow://settings/folders" com.redako35.syncroflow` ad app chiusa → Categorie con la freccia, il tasto di sistema torna a Impostazioni (prima della correzione chiude l'app).

## Come si torna indietro

Rimettere la voce in Impostazioni e togliere la matita dal campo Base: i dati non cambiano. Per la freccia, togliere `initialRouteName` e `getStateFromPath` da `linking.ts`.
