# Campi per categoria con i Modelli di settore («selettori»)

Tipo: grilling + research (verifica). Stato: **deciso dall'utente** il 23 novembre 2026 mattina (due risposte), con il piano. Fetta: **MCAT**. Mappa: [`../map-3.md`](../map-3.md). Verifica completa: [`../ricerche/verifiche-23/verifica-campi-layout-selettori.md`](../ricerche/verifiche-23/verifica-campi-layout-selettori.md) §4-5.

## Question

Che cosa sono i «selettori» e come si danno a ogni categoria i suoi campi, scelti in fretta da elenchi già pronti?

## Richiesta dell'utente (23 novembre mattina)

> «I selettori dovrebbero essere praticamente come dei campi personalizzati per delle categorie […] i campi per una borsa non sono i campi per una giacca […] ogni categoria dovrebbe avere i suoi componenti nei selettori, in modo che posso decidere che tipo di campi voglio in modo veloce, già preprogrammati.»

Risposte dell'utente:
- «Quando dici "selettori" intendi Impostazioni › Modelli di settore?» → **«Sì, Modelli di settore»**.
- «Impostazioni › Campi con due schede, "Campi" e "Modulo" con in alto la categoria; ogni categoria ha i suoi campi e i suoi obbligatori, si parte da un Modello di settore e le sottocategorie usano quelli della principale; "Configura Layout Aggiungi" sparisce; in Aggiungi scegli prima la categoria e compaiono i suoi campi» → **«Sì, così»**.

## Stato verificato (sintesi)

- **Scegliendo la categoria in Aggiungi i campi non cambiano** (provato sul web: testo di Aggiungi identico con e senza categoria). Aggiungi mostra il layout unico e non legge mai `libraryId` per i campi.
- `Library.fields` («campi della categoria») **non esiste**: è un tipo morto in `types/index.ts:86-92`; scritto a mano nel dato resta ignorato.
- **Modelli di settore**: 15 pacchetti (`constants/sectorTemplates.ts`); «Importa» aggiunge i campi mancanti al registro e in fondo al modulo di **tutto** lo spazio, quindi gli obbligatori di un modello valgono per ogni prodotto (CAM-L9: con «Elettronica & Tech» una pelliccia chiede Brand, Modello, Numero di serie). Tengono in silenzio un campo con lo stesso nome e tipo diverso (CAM-L10). Un secondo elenco di modelli diverso sta nel layout builder (`lib/templates.ts`). «Salva Campi Attuali come Modello» non salva nulla su web e Android (usa `Alert.prompt`, solo iOS). La chiave dei modelli dell'utente non è per spazio.

## Piano di implementazione (fetta MCAT, dopo MOD)

1. **Forma dei dati** (compatibile, nessuna perdita; vincolo 3 della mappa: i moduli stanno nella chiave del layout, non nelle categorie, perché a cloud acceso le categorie si sincronizzano e campi e layout no):
   ```
   furinventory_layout_config:{org} = {
     version: 4,                                   // non alzare
     fields: LayoutField[],                        // modulo «Tutte le categorie», come oggi
     byCategory?: { [libraryId]: LayoutField[] }   // facoltativo
   }
   LayoutField += required?: boolean               // obbligatorio per quel modulo
   ```
   Una categoria senza voce usa quella della principale (`parentIdOf`, che regge cicli e genitori spariti), poi `fields`. Voci di categorie cancellate: ignorate.
2. `utils/forms.ts` nuovo con test: `formFor(categoryId, libraries, layout)` con l'eredità; validazione degli obbligatori per modulo (sostituisce `missingRequiredFields` di `utils/formValidation.ts`, anche per l'import della fetta IMP).
3. Scheda **Modulo** (ticket 24) con il **selettore della categoria** in alto: «Tutte le categorie | Pellicce | Borse…». Una sottocategoria mostra «Come Pellicce» finché non si sceglie «Personalizza». **«Parti da un modello»**: applica un Modello di settore **a quella categoria** (crea i campi che mancano, compone il modulo; gli obbligatori del modello valgono solo lì).
4. **Aggiungi**: la scelta della categoria va **in testa**, fuori dal modulo (come il blocco Magazzino e lo Scaffale); scegliendola compare il suo modulo. Cambiando categoria con valori già scritti: i valori dei campi che restano si tengono, quelli che spariscono si scartano **dopo una domanda**. Lo stesso modulo in Modifica e nell'ordine della Scheda. «Tipo di pelle» sta nel modulo di Pellicce e sparisce dagli altri.
5. **Modelli di settore**: resta il catalogo; «Importa» chiede «per quale categoria?»; un solo elenco (`lib/templates.ts` confluisce in `constants/sectorTemplates.ts`); con un nome già esistente e tipo diverso avvisa e lascia scegliere (CAM-L10); «Salva come modello» che funziona su web e Android (finestra dell'app, non `Alert.prompt`), chiave per spazio.
6. File: `utils/forms.ts`, `contexts/LayoutContext.tsx`, `contexts/CustomFieldsContext.tsx`, `types/index.ts` (via il `Library` morto), `FieldsScreen.tsx`, `LayoutBuilderScreen.tsx`, `SectorTemplatesScreen.tsx`, `constants/sectorTemplates.ts`, `lib/templates.ts`, `hooks/useInstallFields.ts`, `utils/templateFields.ts`, `AddScreen.tsx`, `EditScreen.tsx`, `DetailScreen.tsx`, `SettingsScreen.tsx`.

## Piano di verifica

- Jest: `forms.test.ts` (eredità, cicli, categorie sparite, obbligatori per modulo), `templateFields.test.ts` (stesso nome e tipo diverso), `formValidation.test.ts`, `categories.test.ts`.
- Prova nuova `prova/mcat-moduli.cjs` (resoconto §5.5): campionario così com'è (niente `byCategory`) → Aggiungi, Modifica e Scheda identiche a oggi e chiavi con la stessa forma; modulo di «Usato e permute» con Taglia e Condizione → solo quei campi; «Pellicce» con Tipo di pelle; sottocategoria «Pellicce › Visone» → modulo di Pellicce, «Personalizza» → il suo; obbligatorio solo in una categoria, anche in Modifica; modello «Elettronica & Tech» applicato a una categoria nuova che non blocca una pelliccia; cambio di categoria con valori scritti → domanda; categoria cancellata → modulo ignorato; «Salva come modello» sul web.
- Regressioni: tutte quelle dei ticket 23 e 24, più `c1-categorie.cjs`, `m01-categorie.cjs`, `a4-cartelle.cjs`, `a2-modelli-settore.cjs`, `a2-csv.cjs`, `m08-csv.cjs`, `s1-scaffali.cjs`, `controllo.sh`.
- 5 stili: `stili-mcat.jpg` (Modulo con il selettore della categoria, Aggiungi con la categoria in testa).

## Come si torna indietro

`byCategory` è facoltativo: senza, tutto torna al modulo unico di oggi. Nessun campo né prodotto viene riscritto.
