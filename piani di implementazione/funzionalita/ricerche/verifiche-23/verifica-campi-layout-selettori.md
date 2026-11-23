# Verifica: campi personalizzati, layout builder, «selettori» (23 novembre 2026)

> **Nota dell'orchestratore 3 (23 novembre 2026, dopo le risposte dell'utente).**
> - **Domanda 1 risolta**: «selettori» = Modelli di settore. **Domanda 2 risolta**: un solo posto, Campi + Modulo per categoria, sottocategorie che ereditano (ticket 24 e 25).
> - Domanda 3 (icone e colori nella card o nella Scheda) aperta: fetta EDC.
> - Sigle di questo resoconto nei ticket: F1-F11 → `CAM-F1…F11`, L1-L12 → `CAM-L1…L12` (non sono le fette L1/L2 del login).
> - Sigle con il prefisso dell'area nei ticket (regola in `../../map-3.md`, Notes). Numeri di riga a `4b94e4c`; i difetti si riproducono su `HEAD` prima di correggerli.

Sola lettura. Codice citato a `4b94e4c` (branch `funzioni/magazzino`). Prove sul web su `http://localhost:8082`, che serve la **copia di lavoro** con le modifiche non committate di S1a (scaffali), e campionario `seed.json` di `:8765`. Un browser pulito 375×812 per scenario, uno alla volta.

Etichette usate: **[web]** = provato sul web; **[codice]** = letto nel codice; **[dedotto]** = ragionamento non provato. **[S1a]** = da riconfermare dopo S1a: tocca Aggiungi, Modifica, Scheda o Impostazioni, file che S1a ha modificato e non committato.

**Aggiornamento**: durante la verifica S1a è stato committato (`7bfcd72`, «S1a scaffali…»); a fine lavoro il worktree risulta pulito. Le prove [S1a] sono state fatte con quel codice ancora non committato: da riconfermare su `7bfcd72`, non sulla copia di lavoro. I numeri di riga restano quelli di `4b94e4c`.

S1a nella mia area. Nella copia di lavoro S1a aggiunge solo lo scaffale: in `Product.shelfId`, sotto il layout in Aggiungi e Modifica, nella Scheda, nel CSV e come voce in Impostazioni. Non tocca campi personalizzati, layout e modelli. Si spostano però i numeri di riga di quei file.

Script della verifica (temporanei, nella cartella scratch della sessione):
`script/campi/`.
- `v1-campi-tipi.cjs`: un campo per tipo creato dall'interfaccia.
- `v2-opzioni-modifica.cjs`: opzione rinominata, stepper, Modifica.
- `v3-layout.cjs` e `v3b-modifica.cjs`: layout builder.
- `v4-categorie-modelli.cjs`: categoria in Aggiungi, `Library.fields`, modelli.
- `v5-lettura.cjs`: Scheda, card, CSV.
- `v6-rinomina-campo.cjs`.
- `v7-azioni-mancanti.cjs`: X e CAMPO, sezioni rinominate ed eliminate, X su Posizione, P02, elenco dal basso.

Rilanciati senza cambi: `a2-campi.cjs`, `a2-layout.cjs`, `a2-modelli-settore.cjs`, `c07-campi-modelli.cjs`, `c08-modifica-campi.cjs`. Esiti in fondo.

---

## 0. Forma dei dati dei campi (riferimento per C2, per questi punti e per il «crea campo» dall'import CSV)

### Chiavi salvate (AsyncStorage, che sul web è il localStorage)

Tutte per spazio, salvo dove è detto. `{org}` vale `local` senza login.

| Chiave | Contenuto | Viaggia nel cloud? |
| --- | --- | --- |
| `furinventory_custom_fields:{org}` | `CustomField[]`: registro dei campi, compresi i campi **Base** (`isSystem: true`) e quelli nel cestino (`deletedAt`). `CustomFieldsContext.tsx:8, 72-103` | **No** [codice] |
| `furinventory_layout_config:{org}` | `LayoutConfig { fields: LayoutField[]; version: 4 }`: modulo di Aggiungi. `LayoutContext.tsx:20-23, 72` | **No** [codice] |
| `furinventory_categories:{org}` | `FurType[] { id, label }`: valori di «Tipo di pelle» (nome storico della chiave). `FurTypesContext.tsx:9` | **No** [codice] |
| `inventory:v1:{org}:libraries` | `Library[]`: le categorie. `InventoryContext.tsx:17-27` | **Sì, quando il cloud è acceso** (`cloudEnabled = !!session`, `InventoryContext.tsx:117`; oggi il login è spento): `merge_inventory_snapshot` e realtime (`:153-200`) [codice] |
| `inventory:v1:{org}:products` | `Product[]` con `customData` | **Sì, quando il cloud è acceso** [codice] |
| `furinventory_user_templates` | `SectorTemplate[]`: modelli dell'utente. **Non è per spazio** (`constants/sectorTemplates.ts:251`) | No |
| `furinventory_gs1_config:{org}` | contiene `lottoFieldId`, cioè l'id di un campo | No |

**Conseguenza** [codice]: a cloud acceso le categorie si sincronizzano, il registro dei campi e il layout no. Una categoria che punti a dei campi, su un altro telefono troverebbe id sconosciuti. Questo pesa su dove salvare i «campi per categoria» (punto 5).

### `CustomField` (`types/index.ts:94-111`)

```
id            'field_<ms>_<rand>' (FieldsScreen/addField), oppure id fissi dei Base: images, sku, furType, location, folder,
              purchasePrice, sellPrice, length, width, weight, technicalNotes (CustomFieldsContext.tsx:17-30)
name          testo libero; i modelli lo usano come chiave (templateFields.ts:6-18)
type          'number'|'currency'|'date'|'text_short'|'text_long'|'images'|'single_choice'|'multi_choice'|'document'
uiType        'grid'|'stepper'|'segmented'|'text'|'gps-link'|'date'|'images'|'picker'|'modal_list'|'document'
              ('gps-link' non usato da nessuna parte)
dataset?      string[] per le scelte | { min, max, step } per lo stepper | null
options?      { id, label }[]: id 'opt_0'… rigenerati a ogni salvataggio dell'editor (FieldsScreen.tsx:106-112);
              nei modelli id parlanti ('xs', 'nero'…)
unit?, icon?, required, order, isSystem?, deletedAt?
isBarcode?    solo text_short
linkTo?       'locations'|'libraries'|'furType': le opzioni vengono da una lista dell'app
```

Forme salvate davvero creando un campo per tipo dall'interfaccia [web, `v1-crea-tipi`]:

| Tipo | `uiType` | `dataset` | `options` | Icona predefinita |
| --- | --- | --- | --- | --- |
| Numero (unità cm) | text | null | — | `pin` |
| Numero, contatore | stepper | `{min:2,max:5,step:1}` (il passo non si sceglie) | — | `pin` |
| Valuta | text | null | — | `euro` |
| Data | date | null | — | `calendar-today` |
| Testo breve con lettore | text, `isBarcode:true` | null | — | `short-text` |
| Testo lungo | text | null | — | `notes` |
| Immagini | images | null | — | `collections` |
| Scelta singola | segmented | `["Piccola","Media","Grande"]` | `opt_0..2` | `radio-button-checked` |
| Scelta multipla | modal_list | `["Borsa","Gruccia"]` | `opt_0..1` | `check-box` |
| Documento | document | null | — | `description` |

Ogni campo nuovo finisce subito nel layout come `custom/medium/visible` [web].

### Valore nel prodotto: `customData: { value, fieldSnapshot: CustomField }[]` (`types/index.ts:25, 49-52`)

`fieldSnapshot` è una **copia completa** del campo al momento del salvataggio. La Scheda legge nome e icona da questa copia, non dal registro [web, `v6`: dopo «Fornitore» → «Fornitore principale» la Scheda di VIS-0142 dice ancora «Fornitore»].

| Tipo | `value` salvato |
| --- | --- |
| testo breve / lungo | stringa |
| numero, valuta | **stringa come scritta** («2,5», «12,50»), non convertita. Il contatore salva un numero, ma solo se lo si tocca [web `v5`, `v2`] |
| data | stringa ISO |
| scelta singola | **etichetta** dell'opzione (`toggleChoice` salva `option.label`, `components/ui/formStyles.ts:306-312`); `null` se tolta. Dati vecchi possono avere l'id: `isChoiceSelected` accetta entrambi (`:297-303`) |
| scelta multipla | `string[]` di etichette |
| collegata (`linkTo`) | **etichetta** della posizione/categoria/tipo (seed: «Sartoria»), non l'id |
| immagini, documento | `string[]` di indirizzi; più `storageCustomDataPaths[fieldId]` e `backupCustomDataLinks[fieldId]` |

Aggiungi e Modifica costruiscono le opzioni da `dataset` con id `ds_i` e usano `options` solo se `dataset` manca (`AddScreen.tsx:471-479`, `EditScreen.tsx:524-532`). Quindi `options` serve davvero solo alla Scheda, per tradurre un id in etichetta (`DetailScreen.tsx:1056-1058, 1151-1153`) [codice].

### `LayoutField` (`LayoutContext.tsx:11-18`)

`{ id, type: 'base'|'custom'|'section', size: 'small'|'medium'|'full', visible, label? (solo sezioni), icon? (sostituisce l'icona del campo) }`.

Layout predefinito: `LayoutContext.tsx:28-56`. **Rischio** [codice]: se `version` salvata è minore di quella predefinita, il layout dell'utente viene **sovrascritto** col predefinito (`LayoutContext.tsx:122-127`). Cambiare la forma alzando `version` cancellerebbe il modulo di tutti.

### Categorie: `Library` (`contexts/InventoryContext.tsx:17-27`)

`{ id (slug), parentId?, name, icon, createdAt, updatedAt?, barcode?, nfcTag? }`. **Nessun campo `fields`.**

Il `Library` con `fields: CustomField[]` di `types/index.ts:86-92` è un **tipo morto**: nessuno lo importa (`git grep "\bLibrary\b"`) [codice]. Scritto a mano nel dato, resta lì ma Aggiungi lo ignora [web, `v4`].

### Modelli

Tre fonti diverse [codice]:
1. `constants/sectorTemplates.ts`: 15 modelli (`SECTOR_TEMPLATES`), usati da Impostazioni › Modelli di settore.
2. `lib/templates.ts`: 2 modelli (`PREDEFINED_TEMPLATES`), usati da Layout builder › MODELLI. Hanno contenuti diversi a parità di settore: «Abbigliamento» ha campi diversi da «Abbigliamento & Moda». `layoutFields` vuoti e mai letti (`:72-74, 124`).
3. `furinventory_user_templates`: mai scritto su web e Android (vedi punto 4).

Installazione: `hooks/useInstallFields.ts:8-25` → `matchTemplateFields`, che associa **per nome** e tiene il campo esistente anche se tipo e opzioni sono diversi (`utils/templateFields.ts:9-18`), poi `appendToLayout`.

### Chi usa l'id di un campo (da non cambiare mai)

- voci del layout;
- `customData[].fieldSnapshot.id`;
- chiavi di `storageCustomDataPaths` e `backupCustomDataLinks`;
- `gs1Config.lottoFieldId`;
- colonna CSV «Dati Personalizzati JSON», dove le copie importate sono prese per buone senza confronto col registro (`utils/productCsv.ts:199`);
- `describeChanges` della cronologia (`utils/productChanges.ts:45-52`).

I modelli dell'utente usano il nome, non l'id.

### Codice morto da sapere

`components/DynamicFieldRenderer.tsx` (783 righe) non è importato da nessuno [codice]. Aggiungi e Modifica hanno ciascuno un proprio disegnatore dei campi, duplicato: `AddScreen.tsx:466-748` e `EditScreen.tsx:517-793`.

---

## 1. Campi Personalizzati (Impostazioni › Campi Personalizzati)

### 1.1 Stato attuale

**Creare** [web]
- I 9 tipi si creano tutti e compaiono subito in fondo ad Aggiungi (P11 chiuso da C07, riconfermato: `a2-campi-crea`, `c07-campo-nuovo`, `v1`).
- Modi di inserimento oggi:
  - testo breve, anche con pulsante lettore QR/codice;
  - testo lungo;
  - numero libero o contatore +/- (solo minimo e massimo; `FieldsScreen.tsx:462-489`);
  - valuta, data;
  - immagini (fino a 10), documento;
  - scelta singola e multipla, mostrate a **riquadri** (GRID/SEGMENTED) o come **elenco dal basso** (PICKER/MODAL_LIST);
  - opzioni scritte a mano o prese da una «Sorgente Dati»: Posizioni, Categorie, Tipi di pelle (`FieldsScreen.tsx:399-460`).
- «Obbligatorio» è una casella del campo (`:491-498`). Vale in Aggiungi (`a2-campi-modifica`: «Compila anche: Fornitore A2») ma **non in Modifica** (vedi 1.2).

**Modificare** [web]
- Provato su tre campi: Fornitore (testo, nome e obbligatorio, `a2-campi-modifica` e `v6`) e Taglia (scelta, opzione rinominata, `v2`). Gli altri tipi passano dallo stesso editor [codice].
- Nome, obbligatorio, icona, unità e opzioni si cambiano.
- **Il tipo no**: «Cambia» c'è solo alla creazione (`FieldsScreen.tsx:337-344`; [web] `v6`: nessun «Cambia»).
- I campi Base non hanno né matita né cestino (`:234`): Tipo di pelle oggi non si apre da qui.

**Eliminare** [web]
- Provato su Spessore (numero); gli altri tipi passano dalla stessa funzione [codice].
- Va nel cestino (`deletedAt`), sparisce da Aggiungi e compare nel Cestino (`a2-campi-elimina`).
- Il valore resta nei prodotti (copia), e Modifica non lo cancella più: Spessore nel cestino, VIS-0142 salvato in Modifica, valore ancora «3» (P02 chiuso da C02, riconfermato da `v7-p02-campo-nel-cestino`).

**Valori precompilati** [codice + web]
- Esistono solo come opzioni delle scelte. Per testo e numero non c'è:
  - un elenco di valori suggeriti;
  - un valore predefinito;
  - un elenco «scegli o scrivi».
- Le misure Base (Lunghezza, Larghezza, Peso) sono caselle di testo fisse, non configurabili (`AddScreen.tsx:909-949`).

**Come si sceglie in Aggiungi** [web `v1`, S1a]
- GRID e SEGMENTED danno lo **stesso** disegno: riquadri a tutta larghezza (Taglia «grid» e Condizione «segmented» larghi uguali, 343 px).
- PICKER e MODAL_LIST danno lo **stesso** disegno: casella «Seleziona…» che apre un elenco dal basso (Colore e Lavorazione, 165 px). Provato fino in fondo su Colore: l'elenco si apre, «Nero» compare nella casella e si salva `"Nero"` [web `v7-picker-aggiungi`].
- Non esistono: menu a tendina in linea, pillole scorrevoli in orizzontale, ruota verticale.
- **Non provati sul web**: inserimento di data, immagini e documento (selettori di data e di file del sistema). Comportamento letto nel codice: `AddScreen.tsx:587-698`.

**Icone** [codice + web]
- Ogni campo ha un'icona scelta da 40 (`FieldsScreen.tsx:15-22`).
- Il layout builder ne ha un'**altra** lista (~80, `LayoutBuilderScreen.tsx:27-72`) che sostituisce quella del campo, ma solo in Aggiungi e Modifica.
- La Scheda usa l'icona della copia salvata nel prodotto [web `v3`: Fornitore con icona cambiata nel builder → glifo `ef6b` in Aggiungi, `e558` (quella vecchia) nella Scheda].
- Le opzioni non hanno icona.

**Colori** [codice]
- Nessun colore per campo o per opzione.
- Nella Scheda il colore dipende solo dal tipo: data blu, valuta col colore d'accento (`DetailScreen.tsx:1119-1140`).
- Tipo di pelle ha pillole senza colore (`parseFurTypes` tiene solo `id`/`label`, `utils/furTypes.ts:23-41`).

**Lettura**
- **Scheda** [web, S1a]: blocco «Campi strutturati» nell'ordine del layout (`DetailScreen.tsx:1020-1170`):
  - testo lungo e scelte multiple a tutta larghezza (scelte multiple come etichette);
  - documenti come righe da aprire, immagini in fila;
  - gli altri campi in mezze card con icona.
- **Card dell'Inventario** [web `v5`]: nessun campo personalizzato (non compaiono «Grigio perla», «Lasciata fuori», «Pellicceria Bianchi»; `HomeScreen.tsx:162-252`).
- **PDF** [codice]: nessun campo personalizzato (`DetailScreen.tsx:426-756`). D16 **ancora aperto**. Sul web il PDF non si prova (P27).
- **Testi da condividere** (cliente e professionista) [codice]: nessun campo personalizzato (`DetailScreen.tsx:~90-160`).
- **CSV** [web `v5`]: una sola colonna «Dati Personalizzati JSON» con tutto `customData`, copie comprese (`utils/productCsv.ts:16, 69`). Nessuna colonna per campo.
- **Ricerca** dell'Inventario [codice]: non cerca nei campi personalizzati (`utils/inventoryFilter.ts:14-17`).

### 1.2 Difetti (con passi)

| # | Difetto | Passi | Etichetta |
| --- | --- | --- | --- |
| F1 | **Rinominare un'opzione stacca i prodotti che l'avevano** | Campi › Taglia › matita › «M» → «Media» › Aggiorna. VIS-0142 resta `"M"`. In Modifica nessun riquadro di Taglia è selezionato; nella Scheda c'è ancora «Taglia M» | [web `v2-opzione-rinomina`, S1a] |
| F2 | **Valuta personalizzata con la virgola → «NaN,undefined»** nella Scheda; i numeri personalizzati restano stringhe | Aggiungi: Costo riparazione «12,50», Spessore «2,5», salva. Salvati `"12,50"` e `"2,5"`. Scheda: «Costo riparazione NaN,undefined», «Spessore 2,5 mm». Causa: `formatPrice(Number(value))` (`DetailScreen.tsx:1140`); Aggiungi salva il testo scritto (`AddScreen.tsx:742`) | [web `v5`, S1a] |
| F3 | **Il contatore mostra un valore che non salva** | Aggiungi: Pezzi mostra «1» (minimo). Senza toccarlo, salva: in `customData` Pezzi è assente | [web `v2-stepper-non-toccato`, S1a] |
| F4 | **Modifica non controlla gli obbligatori** | Modifica VIS-0142: togli Taglia (obbligatoria), Salva: salvato con Taglia `null` (`EditScreen.tsx:152-157` controlla solo SKU e posizione) | [web `v2-modifica-obbligatorio`, S1a] |
| F5 | **Modifica non ha il contatore** | Pezzi in Modifica è una casella di testo «2» (`EditScreen.tsx:771-789`) | [web, S1a] |
| F6 | **Campo rinominato: la Scheda dei prodotti già salvati mostra il nome vecchio** (copia) | Campi › Fornitore → «Fornitore principale». Scheda VIS-0142: «Fornitore Pellicceria Bianchi…» | [web `v6`, S1a] |
| F7 | Icona cambiata nel layout builder: vale in Aggiungi, non nella Scheda | vedi 1.1 Icone | [web `v3`, S1a] |
| F8 | Due coppie di aspetti identici (GRID = SEGMENTED, PICKER = MODAL_LIST): la scelta non cambia nulla | vedi 1.1 | [web `v1`] |
| F9 | Testi tecnici o in inglese nell'editor: titolo «Field Builder» (`FieldsScreen.tsx:290`), «(UI: grid)» nell'elenco (`:223`), pulsanti «GRID/SEGMENTED/PICKER/MODAL_LIST» (`:403-410`), «Intelligenza Avanzata». «Max 100 caratteri» non è applicato (nessun `maxLength`); «Dropdown menu» per la scelta singola, che però nasce a riquadri (`:95`) | — | [codice] |
| F10 | Il tipo di un campo non si cambia dopo la creazione | vedi 1.1 | [web `v6`] |
| F11 | `updateField`/`deleteField` partono dall'elenco della schermata, non dal più recente (`CustomFieldsContext.tsx:135-166`): chiamati più volte di seguito perderebbero modifiche, come D12 per `addField`. Oggi nessuno li chiama in fila | — | [dedotto] |

Già chiusi e riconfermati oggi [web]:
- P11 (campo nuovo in Aggiungi), chiuso da C07;
- P02 (valore dei campi nel cestino), chiuso da C02 (`v7-p02-campo-nel-cestino`);
- D03 (Modifica mostra i campi vuoti), chiuso da C08 (`c08-campo-vuoto`);
- D24 (obbligatori personalizzati in Aggiungi).

### 1.3 Che cosa manca rispetto alle parole dell'utente

- **«Scegliere se il campo si scrive al momento o ha valori già pronti»**: per testo e numero non si può. Mancano:
  - elenco di valori pronti (anche per i numeri: 80, 90, 100 cm);
  - «scegli o scrivi»;
  - valore predefinito.
- **«Tenda a scomparsa, menu a scomparsa, campi scorrevoli verticali e orizzontali, un picker per lunghezza e larghezza»**: mancano il menu a tendina in linea, le pillole scorrevoli, la ruota. Il contatore non ha il passo. Le misure Base non sono configurabili.
- **«Icone giuste per una lettura veloce»**: l'icona c'è, ma vive in due liste, non arriva nella Scheda se cambiata dal builder, manca nelle opzioni, nella card e nel PDF.
- **«Se è solamente un campo, se ci sono più campi»**: scelta singola e multipla ci sono. Manca un campo «Sì/No» (esiste solo come lettura di un booleano nella Scheda, `DetailScreen.tsx:1149`, ma nessun tipo lo crea).
- **«I colori»**: nessun colore per campi od opzioni.
- **Lettura**: nessun campo nella card, nel PDF, nei testi condivisi e nella ricerca; nel CSV i campi sono un blob JSON.

### 1.4 Proposta (semplice)

Un editor del campo in **tre domande**, al posto della pagina tecnica di oggi:
1. **Che cosa contiene**: Testo, Numero/Misura (con unità), Prezzo, Data, Sì/No, Scelta (una o più), Foto, Documento.
2. **Come si compila**: «Lo scrivo io», «Scelgo da un elenco», «Scelgo o scrivo», «Contatore +/-» (minimo, massimo, **passo**), «Ruota» (per misure: da, a, passo).
3. **Come si vede**: per le scelte Riquadri, Pillole scorrevoli, Menu a tendina, Elenco dal basso; più icona e **colore**.

Altro:
- Opzioni con **id stabile**, etichetta, colore e icona facoltativi. Rinominare non stacca più i prodotti.
- Valore predefinito facoltativo.
- «Mostra nella card» (al massimo 2 campi).
- Un solo disegnatore dei campi per Aggiungi e Modifica (`components/FieldInput.tsx`) e uno per la lettura (Scheda, card, PDF).
- Si toglie il codice morto `DynamicFieldRenderer.tsx`.

File da toccare (elenco, non piano):
- `types/index.ts` [S1a]: proprietà nuove **facoltative**; via il `Library` morto.
- `contexts/CustomFieldsContext.tsx`: lettura che normalizza le opzioni; `updateField` dall'elenco più recente.
- `src/screens/settings/FieldsScreen.tsx`.
- Nuovi `components/FieldInput.tsx` e `components/OptionsEditor.tsx` (da C2, punto 2).
- `src/screens/tabs/AddScreen.tsx` [S1a] e `src/screens/product/EditScreen.tsx` [S1a]: usano `FieldInput`.
- `src/screens/product/DetailScreen.tsx` [S1a]: lettura, icone dal registro con ripiego sulla copia, PDF (D16).
- `src/screens/tabs/HomeScreen.tsx` [S1a]: card.
- Nuovo `utils/fieldValues.ts` con test: normalizzazione e testo da mostrare.

Rischi per i dati:
- **Valori delle scelte salvati come etichetta.** Proposta: le scritture nuove salvano l'**id** dell'opzione; i valori vecchi (etichette) si leggono abbinandoli all'opzione con la stessa etichetta. `isChoiceSelected` lo fa già. Nessuna riscrittura forzata.
- **Id delle opzioni rigenerati `opt_i`.** Dalla prima apertura dell'editor nuovo si conservano gli id esistenti. Mai rinumerare: un dato vecchio salvato come `opt_1` dopo una cancellazione punterebbe all'opzione sbagliata [dedotto].
- **Numeri stringa.** Si leggono con `parseNumber` (C01) e si scrivono come numero. I valori vecchi restano stringhe e si leggono bene.
- **`fieldSnapshot`.** Resta. Per nome, icona e opzioni la Scheda preferisce il registro e ricade sulla copia se il campo non c'è più (cestino o import).

### 1.5 Come si proverebbe

Prova `prova/f1-campi.cjs` (nome indicativo):
- un campo per ogni combinazione «contiene × si compila × si vede»: forma salvata e disegno in Aggiungi e Modifica;
- rinomina e cancellazione di un'opzione usata (VIS-0142 Taglia «M» → «Media»: selezionata in Modifica, «Media» nella Scheda);
- «12,50» → Scheda «12,50 €»;
- contatore: valore salvato anche se non toccato, oppure casella vuota finché non si tocca (da decidere);
- obbligatorio in Modifica;
- icona e colore uguali in Aggiungi, Scheda e card;
- campionario vecchio caricato: nessun valore cambiato.

Test jest: `utils/fieldValues.ts`; `formChoice.test.ts`, `formValidation.test.ts`, `templateFields.test.ts`.

Regressioni da rilanciare: `a2-campi`, `a2-aggiungi`, `c07-campi-modelli`, `c08-modifica-campi`, `a1-modifica`, `a1-scheda`, `a2-csv`, `s1-scaffali` (Aggiungi con scaffali).

---

## 2. Editor delle opzioni per C2 («Tipo di pelle» apribile in Campi Personalizzati)

### 2.1 Che cosa serve a C2

Base: la bozza del ticket 21 e il codice.
- In `FieldsScreen.tsx:234` il campo Base `furType` deve avere la matita, che apre **solo** l'editor dei valori: nome, tipo e icona restano bloccati.
- Valori dalla lista di `FurTypesContext`:
  - `addFurType` crea un id dal nome;
  - `renameFurType` cambia solo l'etichetta, **l'id resta**;
  - `deleteFurType` cancella.
- Controlli di oggi da riportare [codice]:
  - `furTypeNameError`: doppioni senza badare a maiuscole e accenti;
  - blocco della cancellazione se il valore è usato, anche solo da prodotti nel cestino (`usage(products, { furType })`, `FurTypesScreen.tsx:55-61`);
  - **almeno un tipo deve restare** (`FurTypesScreen.tsx:51-54`). Serve: `parseFurTypes` legge una lista vuota come «i predefiniti» (`utils/furTypes.ts:37`), quindi cancellarli tutti li farebbe ricomparire.
- Da sapere [codice]: i campi personalizzati con «Sorgente Dati: Tipi di pelle» (`linkTo: 'furType'`) salvano l'**etichetta**, non l'id (`AddScreen.tsx:474`, `formStyles.ts:306-312`). Rinominando un tipo, `Product.furType` segue ma quei valori restano col nome vecchio e non risultano più scelti in Modifica (come F1). C2 deve dirlo, oppure il disegno nuovo deve passarli all'id.
- Si toglie la voce Impostazioni › Tipi di pelle (`SettingsScreen.tsx:416` a `4b94e4c` [S1a: il file è cambiato]) e si sistema l'indirizzo `settings/categories`.
- Dati invariati: chiave `furinventory_categories:{org}`, id, `Product.furType` (id).

### 2.2 Perché l'editor di oggi non va bene così com'è [web + codice]

Le opzioni dei campi a scelta e i valori di Tipo di pelle hanno **forme opposte**:

| | Campi a scelta (oggi) | Tipo di pelle |
| --- | --- | --- |
| Lista | stringhe in `dataset`; `options` rigenerate `opt_i` a ogni salvataggio (`FieldsScreen.tsx:106-112`) | `{ id, label }` con id stabile |
| Valore sul prodotto | etichetta | id |
| Rinomina | stacca i prodotti (F1, provato) | i prodotti seguono (id invariato) |
| Cancellazione | libera, senza controllo | bloccata se usata |

«Lo stesso editor delle opzioni dei campi a scelta», preso alla lettera, darebbe a Tipo di pelle il difetto F1: rinominare «Visone» cambierebbe il significato dei prodotti, oppure servirebbe un ramo speciale.

### 2.3 Prima o insieme?

**C2 prima** (è piccola e serve prima di S1b), ma con l'editor delle opzioni scritto **già nella forma del disegno nuovo**, così non si rifà [dedotto]:
- `components/OptionsEditor.tsx` lavora su `{ id, label, color? }[]` con id stabili;
- callback `onAdd / onRename / onDelete` e un controllo `usedBy(id)`;
- C2 lo collega a `FurTypesContext`. Il disegno nuovo dei campi (punto 1) lo collegherà alle opzioni dei campi a scelta, dopo averle portate agli id stabili.

Unica cosa da ricordare dopo: se le opzioni avranno un colore, `parseFurTypes` (`utils/furTypes.ts:23-41`) deve tenere `color`, oggi lo scarta. Con i campi per categoria (punto 5), «Tipo di pelle» potrà comparire solo nel modulo di Pellicce: risolve in modo pulito il «facoltativo per chi non vende pellicce».

### 2.4 Come si proverebbe C2

Oltre a quanto già scritto nella bozza (`c2-tipo-pelle.cjs`):
- rinominare un tipo usato (Visone): VIS-0142 resta `furType: 'visone'` e mostra il nome nuovo in Scheda, card, CSV e Aggiungi;
- cancellare un tipo usato: bloccato col conteggio;
- doppione «visone» rifiutato;
- la chiave salvata ha la stessa forma `[{id,label}]`.

Regressioni: `m01-categorie`, `c1-categorie`, `a2-campi`, `a4-impostazioni`.

---

## 3. Layout builder (Impostazioni › Configura Layout Aggiungi)

### 3.1 Che cosa configura oggi

Solo il **modulo di Aggiungi**, uno per tutto lo spazio. Per ogni voce [codice + web]:
- ordine, con frecce su e giù, un passo alla volta;
- visibile o nascosto (occhio);
- togli dal modulo (X), per i campi Base come per i personalizzati;
- dimensione 1/3, 1/2 o intera (toccando la voce);
- icona sostitutiva.
- Sezioni: aggiungi, rinomina, elimina.
- «CAMPO»: rimette un campo del registro che non è nel modulo.
- «MODELLI»: 2 modelli.
- «Salva Layout».

Provate oggi una per una, con lo stato salvato e l'effetto in Aggiungi [web, S1a]:
- **ordine** (frecce) e **nascondi**: `a2-layout-sposta-nascondi`;
- **togli (X)**: Fornitore esce dal modulo salvato e da Aggiungi;
- **CAMPO**: lo rimette **in fondo**, a 1/2 (`v7-x-e-campo`). Propone anche i campi Base tolti, per esempio Posizione (`v7-x-posizione`);
- **rinomina sezione**: «Dati economici» → «Prezzi V7», salvato e visibile in Aggiungi;
- **elimina sezione**: «Misure» sparisce, i suoi campi restano e finiscono sotto la sezione precedente (`v7-sezioni`);
- **dimensione** e **icona**: `v3` (vedi L5, L7);
- **nuova sezione**: `v3` (vedi L4);
- **MODELLI**: `v4`, `a2-layout` (vedi L9, L10);
- **Salva**: tutti gli scenari; **uscire senza salvare**: L1, L2.

Assenti [web `v3`: nessuna delle parole «Anteprima», «Annulla», «Obbligatori», «Ripristina», «Trascina» nella schermata]:
- nessuna **anteprima**;
- nessun **Annulla** o domanda uscendo con modifiche;
- nessun **obbligatorio** (sta nel campo, in Campi);
- nessun **ripristino** del predefinito (`resetToDefault` esiste nel contesto ma nessun pulsante lo usa);
- nessun trascinamento;
- nessuna visibilità per le sezioni;
- nessun nome sostitutivo per i campi Base (`LayoutField.label` serve solo alle sezioni).

**Effetto su Aggiungi**: sì [web `a2-layout-sposta-nascondi`]. **Su Modifica**: quasi nullo (vedi L6). **Sulla Scheda**: solo l'ordine dei campi personalizzati (`orderByLayout`).

### 3.2 Tutto ciò che «non funziona bene» (con passi)

| # | Difetto | Passi | Etichetta |
| --- | --- | --- | --- |
| L1 | **P12, ancora aperto**: le modifiche valgono subito in Aggiungi senza «Salva» e spariscono alla ricarica, senza avviso | Builder › occhio su Peso › indietro senza salvare → Aggiungi senza Peso; ricarica → Peso torna. Causa: ogni azione scrive nel contesto (`LayoutBuilderScreen.tsx:113-114, 122-123, 131-132`) | [web `a2-layout-non-salvato`, S1a] |
| L2 | **P12 peggiore del previsto: le modifiche non salvate si salvano di nascosto** se nel frattempo crei un campo. Vale anche applicando un modello: `appendToLayout` scrive il layout del momento (`LayoutContext.tsx:186-192`) | Builder › nascondi Peso (senza salvare) › indietro › Campi › crea un campo. Il layout salvato ha Peso nascosto (`visible: true` → `false`) | [web `v3-p12-campo-nuovo-salva-tutto`; modello: codice] |
| L3 | **Nascondere o togliere Posizione rende Aggiungi impossibile da salvare** | Builder › occhio (o X) su Posizione › Salva → Aggiungi senza posizioni; Salva → «Compila almeno la Posizione», nessun prodotto. Si rimedia solo rimettendola da CAMPO, e nulla lo dice | [web `v3-posizione-nascosta`, `v7-x-posizione`, S1a] |
| L4 | **La sezione nuova nasce in cima, sopra le foto**, e si sposta solo a un passo per tocco (~35 tocchi col campionario) | Builder › SEZIONE › Salva: «Nuova sezione» è la voce 0; in Aggiungi compare prima di «Foto prodotto» (`LayoutContext.tsx:208-221`) | [web `v3`] |
| L5 | **La dimensione non vale per molti campi**: scelte a riquadri, immagini, documenti, Tipo di pelle sono sempre a tutta larghezza (`AddScreen.tsx:540, 590, 665, 827`) | Builder › Taglia › 1/3 › Salva: salvato `size: small`, in Aggiungi larga 343 px (Pezzi a 1/3 = 106 px) | [web `v3`, S1a] |
| L6 | **Modifica non segue il layout**: campi Base scritti nel codice (Peso nascosto resta in Modifica come «Peso (kg)»), niente dimensioni né sezioni, e i campi personalizzati raggruppati prima tutte le scelte e poi gli altri | Peso nascosto e salvato → Modifica VIS-0142 mostra «Peso (kg)». Ordine in Modifica: Colore, Lavorazione, Taglia, Condizione… poi Pezzi, Data… (nel layout Pezzi è il primo). `EditScreen.tsx:353-515, 554, 612` | [web `v3b`, `v2-modifica-obbligatorio`, S1a] |
| L7 | Icona del builder non usata dalla Scheda (F7); due liste di icone diverse | — | [web `v3`] |
| L8 | Due modi di togliere un campo (occhio e X) con effetti diversi e nessuna spiegazione. Un campo tolto con la X torna solo da «CAMPO» | — | [codice] |
| L9 | **Modello del builder**: crea i campi e li mette nel modulo (**D12 chiuso da C07, riconfermato**), ma vale per tutto lo spazio. Gli obbligatori del modello diventano obbligatori per **ogni** prodotto, anche una pelliccia | MODELLI › Elettronica & Tech → 4 campi nuovi nel modulo; Aggiungi una pelliccia → «Compila anche: Brand/Produttore, Modello, Numero di Serie (S/N)» | [web `v4-modello-builder`, `a2-layout-modello`, S1a] |
| L10 | Modello con un nome che esiste già: tiene il campo vecchio con tipo e opzioni vecchi, senza dirlo | MODELLI › Abbigliamento: «Taglia» resta XS…XL (il modello ha anche XXL e TU); «Colore» resta una scelta a elenco (nel modello è testo). Avviso: «3 campi nuovi, 2 già presenti» | [web `v4-modello-nome-esistente`] |
| L11 | Cambiare la forma del layout alzando `version` cancellerebbe il modulo dell'utente (`LayoutContext.tsx:122-127`) | — | [codice, rischio] |
| L12 | Il titolo «Configura Layout Aggiungi» non dice che il modulo decide anche l'ordine dei campi nella Scheda (`DetailScreen.tsx:1025`) | — | [codice] |

### 3.3 Che cosa manca

- Bozza con **Salva / Annulla** e domanda uscendo.
- Anteprima del modulo.
- Posizione (e gli altri obbligatori di sistema) non nascondibile.
- Sezione aggiunta in fondo o sotto la voce scelta.
- Spostamento veloce (trascinamento, oppure «sposta in cima/in fondo/sotto la sezione…»).
- Obbligatorio e visibilità per **categoria**.
- Lo stesso modulo in Modifica.
- Dimensione mostrata solo dove vale.
- Ripristino del predefinito.

### 3.4 Proposta

Il builder diventa la scheda **«Modulo»** dentro Campi Personalizzati, per categoria (punto 5). Lavora su una **copia di bozza** (stato locale, il contesto non cambia finché non si salva). Pulsanti «Salva» e «Annulla», domanda uscendo. Anteprima con lo stesso `FieldInput` di Aggiungi.

Regole:
- Posizione sempre visibile.
- SKU e Foto nascondibili ma non eliminabili.
- Sezione nuova in fondo.
- Dimensione solo per testi, numeri, date ed elenchi dal basso.
- Modifica e Scheda usano lo stesso modulo (Modifica mostra in più i campi che il prodotto ha già, come `editableFields`).
- Nel contesto: `appendToLayout` parte dal layout **salvato**, non da quello del momento.

File da toccare:
- `src/screens/settings/LayoutBuilderScreen.tsx`;
- `contexts/LayoutContext.tsx`: bozza; caricamento che **non** sovrascrive il layout se la versione è vecchia (migrare, non sostituire);
- `utils/layoutOrder.ts`;
- `src/screens/product/EditScreen.tsx` [S1a];
- `src/screens/tabs/AddScreen.tsx` [S1a].

Rischio per i dati: nessuno se si aggiungono solo proprietà facoltative e `version` resta 4. Va corretto `LayoutContext.tsx:122-127` prima di qualunque cambio di versione.

### 3.5 Come si proverebbe

- Modifica senza salvare → Aggiungi invariato; uscendo compare la domanda.
- Annulla → tutto come prima.
- Campo nuovo creato con una bozza aperta → la bozza non viene salvata.
- Posizione non nascondibile.
- Sezione nuova in fondo.
- Taglia: il controllo della dimensione non c'è.
- Peso nascosto → assente anche in Modifica (salvo valore già presente).
- Ordine in Modifica = ordine del modulo.
- Campionario col layout `version: 4` → identico.

Regressioni: `a2-layout`, `a2-aggiungi`, `c07-campi-modelli`, `c08-modifica-campi`, `a1-modifica`, `s1-scaffali`.

---

## 4. «Selettori»

### 4.1 Candidati (nell'interfaccia non c'è nessuna etichetta «Selettori»)

| Candidato | Che cosa fa | Etichetta |
| --- | --- | --- |
| **Impostazioni › Modelli di settore** («Campi pronti per il tuo tipo di prodotti») | 15 pacchetti di campi pronti (Pellicce, Gioielleria, Abbigliamento, Calzature, Elettronica, Vini, Mobili, Auto, Orologi, Cosmetici, Alimentari, Farmacia, Arte, Tessuti, Ottica) con anteprima. «Importa» aggiunge i campi mancanti al registro e in fondo al modulo di **tutto** lo spazio. Raggiungibile (D13 **chiuso da C07, riconfermato**): `a2-modelli-settore`, `v4-modelli-settore` (Pellicce & Pellicceria: 3 nuovi, 4 già presenti, tutti nel modulo) | [web, S1a] |
| Layout builder › MODELLI | Stessa idea con 2 modelli **diversi** da quelli sopra (`lib/templates.ts`) | [web] |
| «Salva Campi Attuali come Modello» | Sul web dice solo «disponibile a breve» e non salva nessuna chiave [web `v4`]. Stessa cosa su Android [codice]: usa `Alert.prompt`, che esiste solo su iOS (`SectorTemplatesScreen.tsx:82-107`) | [web + codice] |
| `Library.fields` («campi della categoria») | **Non esiste nell'app**: tipo morto (`types/index.ts:86-92`). Categorie e cartelle non hanno campi; FoldersScreen non ha nulla per i campi | [codice] |
| «Sorgente Dati» di un campo a scelta | Opzioni prese da Posizioni, Categorie o Tipi di pelle (`FieldsScreen.tsx:415-432`) | [codice] |
| «Aspetto UI» (GRID / SEGMENTED / PICKER / MODAL_LIST) | Come si mostra una scelta; in pratica 2 disegni, non 4 (F8) | [web] |
| Scelta della Categoria in Aggiungi (`CategoryPicker`) | Sceglie categoria e sottocategoria; non cambia i campi (sotto) | [web, S1a] |
| Scaffali «generici o di una categoria» (S1a) | Scaffali legati a una categoria; non riguardano i campi | [S1a, non verificato qui] |

**Lettura più probabile** [dedotto]: l'utente parla di **Modelli di settore**. La descrizione coincide («campi pronti per il tuo tipo di prodotti», «preprogrammati», «in modo veloce»), e «selettori/settore» suonano simili in una dettatura. Quello che chiede è che quei pacchetti valgano **per categoria**: «i campi per una borsa non sono i campi per una giacca». Da confermare con l'utente (domanda 1).

### 4.2 Punto chiave: scegliendo la categoria in Aggiungi i campi cambiano?

**No** [web `v4-categoria-cambia-campi`, S1a].
- Il testo di Aggiungi è identico (147 righe) senza categoria, con «Pellicce» e con «Usato e permute».
- Scritto a mano `fields: [{… «Solo per Pellicce» …}]` nella categoria Pellicce: Aggiungi **non** lo mostra (il dato resta salvato, ignorato).
- Nel codice Aggiungi mostra `getVisibleFields()` del layout unico (`AddScreen.tsx:971, 997`) e non legge mai `libraryId` per i campi.

### 4.3 Difetti e mancanze

- Nessun legame categoria → campi.
- I modelli sono globali: i loro obbligatori valgono per tutti i prodotti (L9).
- Associano per nome e tengono il vecchio senza dirlo (L10).
- Due elenchi di modelli diversi.
- I modelli dell'utente non si salvano su web e Android.
- La loro chiave non è per spazio.

### 4.4 Proposta

Al punto 5: un modello di settore si applica **a una categoria**.

### 4.5 Come si proverebbe

Al punto 5.

---

## 5. Proposta unica: campi, modulo e campi per categoria

### 5.1 L'idea (un solo posto)

**Impostazioni › Campi** con due schede:

1. **«Campi»**: il registro unico, come oggi ma con l'editor in tre domande (punto 1). Un campo esiste una volta sola e si può usare in più categorie: «Colore» della borsa e della giacca è lo stesso campo. Valori confrontabili, una sola colonna nel CSV futuro.
2. **«Modulo»** con in alto il **selettore della categoria**: «Tutte le categorie | Pellicce | Borse | Scarpe…».
   - «Tutte le categorie» = il modulo di oggi, per i prodotti senza categoria e per le categorie senza un modulo proprio.
   - Una categoria può avere il **suo modulo**: quali campi (Base e personalizzati), in che ordine, sezioni, obbligatorio sì/no **per quella categoria**, dimensione. Bozza con Salva/Annulla (punto 3).
   - **Sottocategoria**: usa il modulo della principale («Come Pellicce») finché non si sceglie «Personalizza» [da decidere: domanda 2].
   - **«Parti da un modello»**: applica un modello di settore **a quella categoria**. Crea i campi che mancano e compone il suo modulo; gli obbligatori del modello valgono solo lì.

Via la voce «Configura Layout Aggiungi»: diventa la scheda Modulo. Con C2, via anche «Tipi di pelle». «Modelli di settore» resta come catalogo, ma «Importa» chiede «per quale categoria?». Un solo elenco di modelli: `lib/templates.ts` confluisce in `constants/sectorTemplates.ts`.

In **Aggiungi**, scegliendo la categoria compare il suo modulo. Lo stesso modulo vale in **Modifica**, che mostra in più i campi che il prodotto ha già, e nell'ordine della **Scheda**. «Tipo di pelle» sta nel modulo di Pellicce e sparisce dagli altri: niente più obbligatorietà per chi non vende pellicce.

Problema da risolvere in Aggiungi [dedotto]: oggi la Categoria è un campo **dentro** il modulo. Se il modulo dipende dalla categoria, la scelta della categoria va **in testa** ad Aggiungi, fuori dal modulo, come il blocco Magazzino di M03 e lo Scaffale di S1a. Cambiando categoria con valori già scritti, i valori dei campi che restano si tengono; quelli che spariscono si scartano, con un avviso.

### 5.2 Forma dei dati proposta (compatibile, nessuna perdita)

- **Moduli per categoria nella chiave del layout**, non nelle categorie. A cloud acceso (login, oggi spento) le categorie si sincronizzano, campi e layout no: un modulo dentro `Library` arriverebbe su un altro telefono senza i suoi campi.
  ```
  furinventory_layout_config:{org} = {
    version: 4,                       // NON alzare (LayoutContext.tsx:122-127 cancellerebbe tutto)
    fields: LayoutField[],            // = modulo «Tutte le categorie», come oggi
    byCategory?: { [libraryId]: LayoutField[] }   // facoltativo: assente = come oggi
  }
  LayoutField += required?: boolean   // facoltativo: obbligatorio per quel modulo; assente = quello del campo
  ```
  Una categoria senza voce in `byCategory` usa quella della principale (`parentIdOf`, che regge cicli e genitori spariti), poi `fields`. Voci di categorie cancellate: ignorate.
- **`CustomField`**, solo proprietà facoltative:
  - `options: { id, label, color?, icon? }[]` come fonte unica, con `dataset` tenuto allineato o letto come ripiego;
  - `input?` (scrivo / elenco / elenco o scrivo / contatore / ruota);
  - `uiType` con valori nuovi (pillole scorrevoli, tendina, ruota);
  - `dataset.step` modificabile;
  - `defaultValue?`, `showInCard?`, `color?`.
- **Valori**: scelte salvate per id d'opzione, con i vecchi valori-etichetta letti per abbinamento; numeri salvati come numero, quelli vecchi letti con `parseNumber`. Nessuna riscrittura dei prodotti.
- **Da non toccare**: id dei campi, `fieldSnapshot`, chiavi `storageCustomDataPaths/backupCustomDataLinks`, `lottoFieldId`, chiave `furinventory_categories:{org}`, `Product.furType` (id).
- **Sincronizzazione** (fuori da questa proposta): moduli e campi restano sul telefono, come oggi. Per il Team servirà portarli nel cloud (ticket 10).

### 5.3 File da toccare (elenco)

- `utils/forms.ts` (nuovo, con test): `formFor(categoryId, libraries, layout)` con eredità; validazione obbligatori per modulo, che sostituisce `missingRequiredFields` (`utils/formValidation.ts`).
- `contexts/LayoutContext.tsx`: `byCategory`, bozza, caricamento senza sovrascrittura.
- `contexts/CustomFieldsContext.tsx`.
- `types/index.ts` [S1a].
- `src/screens/settings/FieldsScreen.tsx`: le due schede.
- `src/screens/settings/LayoutBuilderScreen.tsx`: diventa la scheda Modulo.
- `src/screens/settings/SectorTemplatesScreen.tsx` più `constants/sectorTemplates.ts` e `lib/templates.ts`.
- `hooks/useInstallFields.ts`: applica a una categoria; avvisa se un campo con lo stesso nome ha tipo diverso.
- `src/screens/tabs/AddScreen.tsx` [S1a]: categoria in testa, modulo della categoria.
- `src/screens/product/EditScreen.tsx` [S1a] e `src/screens/product/DetailScreen.tsx` [S1a].
- `src/screens/tabs/SettingsScreen.tsx` [S1a]: voci.
- `components/FieldInput.tsx`, `components/OptionsEditor.tsx` (da C2).
- `utils/fieldValues.ts`.
- `utils/layoutOrder.ts` (`editableFields`, `orderByLayout` per modulo).
- Più avanti: `utils/productCsv.ts`, con una colonna per campo e un import che crea i campi mancanti abbinandoli per nome, senza sovrascrivere le definizioni esistenti (oggi le copie importate sono prese per buone, `:199`).

Ordine suggerito (indicativo, non un piano):
1. **C2**, con `OptionsEditor` a id stabili.
2. Valori e disegnatore unico (F1-F5, `FieldInput`).
3. Moduli per categoria con bozza e P12.
4. Modelli per categoria, un solo elenco.
5. Lettura: card, icone, colori, PDF D16, CSV per colonne.

### 5.4 Rischi per i dati

1. Alzare `version` del layout = modulo cancellato. Va corretto prima.
2. Rinumerare gli id delle opzioni = valori vecchi abbinati all'opzione sbagliata.
3. Cambiare l'id di un campo = valori, allegati, lotto GS1 e cronologia staccati.
4. Moduli dentro `Library` (sincronizzata a cloud acceso) mentre i campi restano locali = moduli con id sconosciuti su altri telefoni.
5. Cambiando categoria in Aggiungi si perdono i valori già scritti dei campi che spariscono: chiedere prima.
6. L'import CSV che crea campi non deve rimpiazzare un campo esistente con lo stesso nome ma tipo diverso (oggi i modelli lo tengono senza dirlo, L10).

### 5.5 Come si proverebbe (prova `prova/f2-moduli-categoria.cjs`, nome indicativo)

- Campionario così com'è (layout `version: 4`, niente `byCategory`): Aggiungi, Modifica e Scheda identiche a oggi, chiavi salvate con la stessa forma.
- Modulo di «Usato e permute» con Taglia e Condizione: in Aggiungi, scelta quella categoria → solo quei campi; «Pellicce» → modulo di tutte le categorie con Tipo di pelle; nessuna categoria → modulo di tutte.
- Sottocategoria «Pellicce › Visone» senza modulo → quello di Pellicce; «Personalizza» → il suo.
- Obbligatorio solo in una categoria: blocca lì, non altrove; vale anche in Modifica.
- Modello «Elettronica & Tech» applicato a una categoria nuova: i suoi obbligatori **non** bloccano una pelliccia.
- Cambio di categoria in Aggiungi con valori scritti: avviso, valori comuni tenuti.
- Categoria cancellata: il suo modulo ignorato, i prodotti senza categoria usano il modulo di tutte.
- Bozza: punti 3.5.

Test jest: `utils/forms.ts` (eredità, cicli, categorie sparite), `utils/fieldValues.ts`, `templateFields.test.ts`, `layoutOrder.test.ts`, `formValidation.test.ts`, `categories.test.ts`.

Regressioni: tutte quelle dei punti 1-3 più `c1-categorie`, `m01-categorie`, `a4-cartelle`, `a2-csv`, `m08-csv`, `s1-scaffali`.

---

## Esiti dei rilanci (23/11, copia di lavoro con S1a)

| Script › scenario | Esito oggi |
| --- | --- |
| `a2-campi` › crea | campo nel modulo subito e dopo la ricarica (P11 chiuso) |
| `a2-campi` › modifica | nome e obbligatorio; Aggiungi lo pretende |
| `a2-campi` › elimina | nel cestino, sparisce da Aggiungi |
| `a2-layout` › sposta-nascondi | funziona col salvataggio |
| `a2-layout` › non-salvato | **P12 ancora aperto** (Peso nascosto prima della ricarica, ricompare dopo) |
| `a2-layout` › modello | 4 campi nuovi, tutti nel modulo e in Aggiungi (**D12 chiuso**) |
| `a2-layout` › modello due volte | la seconda volta «0 campi nuovi, 5 già presenti» |
| `a2-modelli-settore` | voce in Impostazioni e schermata raggiungibili (**D13 chiuso**) |
| `c07` › campo nuovo, modello di settore | tutto nel modulo |
| `c08` › campo vuoto | si compila e si salva in Modifica (D03 chiuso); in console il noto «GO_BACK» aprendo Modifica dall'indirizzo |

Nessun errore di console negli altri scenari.

## Domande per l'utente (solo lui può decidere)

1. Per «selettori» intendi **Impostazioni › Modelli di settore** (i pacchetti di campi pronti), da far valere per una categoria? Oppure un'altra schermata?
2. Un solo posto per i campi: **Campi Personalizzati con il «Modulo» scelto per categoria**, al posto di «Configura Layout Aggiungi». Le **sottocategorie** (Pellicce › Visone) usano i campi della principale finché non le personalizzi?
3. Per la lettura veloce, dove contano di più icone e colori: nella **card dell'Inventario** (1-2 campi scelti, es. Taglia e Colore) o basta la **Scheda**?
