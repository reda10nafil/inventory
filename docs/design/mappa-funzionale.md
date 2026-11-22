# Mappa funzionale di Syncro Flow (React Native v1)

Scritta il 22 novembre 2026 leggendo il codice di `main` (`cfcdecb`) e guardando l'app sul web (porta 8081, spazio locale, nessun prodotto). Sostituisce `regole-temi.md`, che era una prima bozza: le correzioni rispetto a quella bozza sono segnate con **[corretto]**. Dove una cosa non è stata provata a runtime è scritto «non verificato».

Serve a chi disegna gli stili e a chi li applica: dice cosa c'è, come funziona e cosa un tema deve reggere. Il piano dei lavori è in `piani di implementazione/ui-ux/`.

## 1. A cosa serve

Inventario per pelliccerie (nome interno FurInventory Pro, nome pubblico Syncro Flow). Ogni capo ha SKU, tipo di pelle, posizione, stato (disponibile, venduto, archiviato), prezzi, misure, foto, note e **campi personalizzati** definiti dall'utente. L'app serve a:

- registrare un capo con le foto (scheda Aggiungi, configurabile);
- ritrovarlo dalla griglia o con lo scanner (QR/barcode dello SKU);
- spostarlo, venderlo, metterlo nel cestino, con cronologia di ogni evento;
- stampare etichette e la scheda PDF, condividere i dati con clienti e professionisti;
- dare a ogni capo un'identità digitale GS1 (link, QR, tag NFC);
- automatizzare operazioni ripetitive (spostamenti, vendite, inventario a scaffale).

Si usa su telefono Android/iOS; c'è una versione web per lo sviluppo. Oggi l'app è **solo locale**: login Google spento (`LOGIN_ENABLED = false`), spazio `local`, tutto in AsyncStorage su un dispositivo.

## 2. Navigazione

Ingresso `index.js` → `App.tsx` → `src/navigation/RootNavigator.tsx` (la cartella `app/` è un residuo di expo-router, non usato).

Barra in basso con 5 schede: **Home** (Inventario), **Cronologia**, **Automazioni**, **Aggiungi**, **Impostazioni**. Sopra le schede, schermate a pila: Scheda capo, Modifica, Scanner, azioni dello scanner, le voci di Impostazioni e le automazioni. Dettaglio di ogni schermata secondaria nella sezione 9.

## 3. Campi: di base e personalizzati

Definizioni in `types/index.ts` (`CustomField`) e `contexts/CustomFieldsContext.tsx`, salvate in AsyncStorage (`furinventory_custom_fields:<spazio>`).

### 3.1 Campi di base (`SYSTEM_FIELDS`)

11 campi fissi, non modificabili né eliminabili dalla schermata Campi:

| Campo | id | Tipo | Icona salvata |
| --- | --- | --- | --- |
| Foto Prodotto | `images` | immagini | `add-photo-alternate` |
| SKU / Codice | `sku` | testo breve | `qr-code` |
| Tipo Pelle | `furType` | testo breve | `category` |
| Posizione | `location` | testo breve | `place` |
| Cartella | `folder` | testo breve | `folder` |
| Prezzo Acquisto | `purchasePrice` | valuta | `shopping-cart` |
| Prezzo Vendita | `sellPrice` | valuta | `sell` |
| Lunghezza | `length` | numero, cm | `straighten` |
| Larghezza | `width` | numero, cm | `straighten` |
| Peso | `weight` | numero, kg | `fitness-center` (manubrio) |
| Note Tecniche | `technicalNotes` | testo lungo | `notes` |

Il tipo di pelle è un elenco fisso in codice (`constants/config.ts`: Visone, Volpe, Zibellino, Cincillà, Ermellino, Astrakan, Altro), senza colori.

### 3.2 Campi personalizzati

Si creano da Impostazioni › Campi Personalizzati (`src/screens/settings/FieldsScreen.tsx`), senza limite di numero. Ognuno ha:

- **nome** libero (le etichette possono essere lunghe);
- **tipo**, uno di 9: numero, valuta, data, testo breve, testo lungo, immagini (fino a 10), scelta singola, scelta multipla, documento;
- **aspetto** (`uiType`), scelto solo per alcuni tipi:
  - scelta singola o multipla: `grid` (predefinito), `segmented`, `picker`, `modal_list`;
  - numero: `stepper` (contatore +/−) con minimo e massimo; il **passo** non si imposta dalla schermata e vale 1 **[corretto]**;
  - data → `date`, immagini → `images`, documento → `document`, tutti gli altri → `text`;
- **opzioni** delle scelte: scritte a mano, oppure prese da una libreria dell'app (`linkTo`: Posizioni, Cartelle o Tipi pelle, chiamati «Categorie»);
- **unità di misura** (numero e valuta), **icona** scelta da un catalogo di 39 icone, **obbligatorio**, e per il testo breve **scanner barcode/QR** (`isBarcode`).

I tipi `gps-link` di `FieldUIType` non sono usati da nessuna schermata.

La schermata Campi mostra l'elenco dei campi attivi (icona, nome, etichette «Base» e «Obblig», tipo e aspetto, valori), modifica ed elimina per quelli personalizzati, il pulsante «Crea Nuovo Campo» e un avviso sull'immutabilità storica. Il costruttore è una finestra a tutto schermo: prima l'elenco dei 9 tipi, poi nome, unità, icona, opzioni specifiche, obbligatorio. Gli aspetti sono mostrati con i nomi tecnici in inglese (GRID, SEGMENTED, PICKER, MODAL_LIST).

Un campo eliminato va nel cestino dei campi (`deletedAt`) e si può ripristinare.

### 3.3 Il valore salvato porta con sé la definizione

Ogni prodotto salva i valori dei campi personalizzati come `customData: [{ value, fieldSnapshot }]`: la definizione del campo è copiata nel prodotto al momento del salvataggio. Per questo la Scheda mostra anche campi poi modificati o cestinati.

Dettagli che contano:

- vengono salvati **solo i campi che l'utente ha toccato** nel modulo; quelli lasciati vuoti non entrano in `customData`;
- le scelte fatte con riquadri o finestra salvano l'**etichetta** dell'opzione (es. «M»), non il suo id;
- l'ordine di `customData` è l'ordine in cui l'utente ha toccato i campi, **non** l'ordine del layout **[nuovo]**.

## 4. Layout builder

Impostazioni › Configura Layout Aggiungi (`src/screens/settings/LayoutBuilderScreen.tsx`, `contexts/LayoutContext.tsx`, chiave `furinventory_layout_config:<spazio>`).

Il layout è un elenco ordinato di voci; ogni voce è un campo di base, un campo personalizzato o una **sezione** (titolo scritto dall'utente). Per ogni campo:

- **larghezza**: `small` 1/3, `medium` 1/2, `full` intera;
- **visibile** sì/no;
- **icona** diversa da quella del campo (catalogo di 106 icone, diverso da quello della schermata Campi).

Il layout predefinito: Foto; sezione DATI PRODOTTO (SKU intero, Tipo pelle intero, Posizione ½, Cartella ½); DATI ECONOMICI (due prezzi ½); MISURE (tre misure ⅓); NOTE (note intere).

La schermata mostra un elenco di schede: frecce su/giù per riordinare (niente trascinamento), icona, nome, una barretta che indica la larghezza, occhio per nascondere, × per togliere. Toccando una scheda si aprono la scelta della larghezza (1/3, 1/2, Intera) e la fila di icone. In alto tre pulsanti: **MODELLI**, **SEZIONE** (aggiunge «NUOVA SEZIONE» in cima), **CAMPO** (aggiunge un campo non ancora presente, a ½). In basso «Salva Layout».

**Modelli**: ce ne sono due serie diverse **[nuovo]**:

| Dove | File | Cosa fa |
| --- | --- | --- |
| Layout builder › MODELLI | `lib/templates.ts` (2 modelli: Abbigliamento, Elettronica & Tech) | crea i campi mancanti; i due modelli non hanno un layout proprio, quindi il codice dovrebbe aggiungere i campi in fondo al layout attuale, ma quasi certamente non lo fa (difetto D12) |
| schermata Modelli di settore (oggi senza ingresso, vedi 9.5) | `constants/sectorTemplates.ts` (15 modelli con emoji e colore: Pellicce, Gioielleria, Abbigliamento, Calzature, Elettronica, Vini, Mobili, Auto, Orologi, Cosmetici, Alimentari, Farmacia, Arte, Tessuti, Ottica) | aggiunge i campi al registro, **non tocca il layout**; «Salva campi attuali come modello» funziona solo su iOS (`Alert.prompt`), altrove mostra «disponibile a breve» |

**Il layout governa solo il modulo Aggiungi** **[corretto]**. La Scheda capo e la Modifica hanno una struttura fissa (sezioni 6 e 7).

## 5. Modulo Aggiungi (`src/screens/tabs/AddScreen.tsx`)

Intestazione «Aggiungi Prodotto» con icona. Poi le voci visibili del layout in una riga che va a capo (`flexWrap`, spazio 12 px tra colonne e 16 tra righe). Le larghezze sono percentuali: 1/3 = 31 %, 1/2 = 48 %, intera = 100 %. Su un telefono largo 375 px un terzo è circa 106 px.

Ogni campo ha l'etichetta sopra (nome del campo o del layout, asterisco rosso se obbligatorio) e il controllo sotto. Come viene disegnato ogni caso, nell'ordine in cui il codice lo decide:

| Caso | Controllo | Larghezza |
| --- | --- | --- |
| sezione | titolo maiuscolo grigio con filetto sottile | intera |
| scelta con aspetto `picker` o `modal_list` | campo «Seleziona...» con freccia; apre una **finestra dal basso** con l'elenco (spunta, «Conferma Selezione» per la multipla). Nessun menu a tendina nativo **[corretto]** | dal layout |
| scelta con aspetto `grid` o `segmented`, o qualsiasi scelta senza aspetto | **riquadri quadrati** (30 %, minimo 100 px) con cerchio di spunta e etichetta su 2 righe; `segmented` è identico a `grid` **[corretto]**. Una scelta **multipla** a riquadri qui si comporta da singola (difetto D01) | sempre intera |
| numero con `stepper` | − valore + in una barra | dal layout |
| immagini | miniature 80 px con × e riquadro tratteggiato «+ foto» | sempre intera |
| data | campo con testo e icona calendario; apre il calendario di sistema (sul web non verificato) | dal layout |
| documento | righe con nome file, tocco per condividere, cestino; pulsante tratteggiato «Allega Documento» | sempre intera |
| testo breve con scanner | campo con icona + pulsante QR quadrato 50 px. **Il pulsante non apre la fotocamera: scrive un codice finto `SCAN-1234`** **[nuovo]** | dal layout |
| testo breve, numero, valuta, testo lungo | campo con l'icona del campo dentro, a sinistra | dal layout |

Campi di base:

| Campo | Controllo |
| --- | --- |
| Foto | foto grande 280 px scorrevole con pallini e cestino, miniature 80 px, riquadro «Importa» (galleria, fotocamera, file) |
| SKU | campo + pulsante che genera lo SKU (`LOG-AAAA-NNN`), suggerimento «💡 Generato automaticamente se vuoto» |
| Tipo pelle | pillole scorrevoli in orizzontale, sempre intere |
| Posizione | pillole con il **pallino colorato** della posizione, scorrevoli |
| Cartella | pillole con l'icona della cartella, scorrevoli |
| Prezzi, misure, note | campo con icona |

In fondo il pulsante oro «Aggiungi all'Inventario» e la nota sui campi obbligatori. Il controllo vero chiede SKU, tipo e posizione: lo SKU vuoto viene rifiutato anche se il testo dice che si genera da solo (D23); l'«obbligatorio» dei campi personalizzati non viene controllato (D24); dopo il salvataggio i campi personalizzati non si svuotano (D22). Senza foto l'app chiede conferma e, se si prosegue, salva una foto d'esempio presa da Unsplash.

Visti sul web: le pillole di Posizione in una colonna da ½ vengono tagliate («V…»); il titolo di sezione usa uno stile tipografico che non esiste (`typography.overline`), quindi esce con lo stile di base.

`components/DynamicFieldRenderer.tsx` contiene una versione più vecchia di questo modulo ma **non è importato da nessuno**: è codice morto **[nuovo]**.

## 6. Scheda capo (`src/screens/product/DetailScreen.tsx`)

Dall'alto:

1. **Foto** a tutta larghezza, 320 px, scorrevoli, contatore «1/3» e pallini; tocco = visore a schermo intero.
2. Etichetta **VENDUTO** se venduto.
3. **SKU** grande e tipo pelle, pulsante **Condividi** (testo per Cliente o per Professionista).
4. Riquadro **Posizione attuale** con bordo e icona del colore della posizione.
5. **PREZZI**: due riquadri affiancati (acquisto; vendita in oro).
6. **MISURE**: tre riquadri con icona fissa (`straighten`, `width-wide`, `scale`), etichetta e valore.
7. **NOTE TECNICHE**.
8. **CAMPI STRUTTURATI**: un riquadro per ogni valore salvato, nell'ordine di `customData`:
   - **mezzo riquadro** (48 %) con icona in un quadratino, etichetta e valore: testo breve, numero (con unità), scelta singola, contatore, sì/no, data (icona azzurra), valuta (icona e valore in oro);
   - **riquadro intero**: testo lungo, scelta multipla (etichette a pillola), documento (righe apribili con icona «apri»), immagini (galleria orizzontale);
   - i valori vuoti non compaiono.
   Le larghezze 1/3 del layout **non** valgono qui: la Scheda usa solo mezzi riquadri e riquadri interi **[corretto]**.
9. **CRONOLOGIA DETTAGLIATA**: punti con testo e data, prime 4 voci e «Altro».
10. **IDENTITÀ DIGITALE GS1**: QR del Digital Link, URL, «Copia Link», «Programma Tag» (NFC). Se manca il link: avviso e «Mostra SKU QR (Legacy)», che apre una finestra QR/Barcode con «Stampa Etichetta».
11. «Stampa Scheda PDF».
12. Barra fissa in basso: **Indietro** e **Modifica** (oro).

La scheda PDF e l'etichetta sono pagine HTML con colori scritti a mano (oro `#D4AF37`, grigi) e codici presi da servizi esterni (CDN, `api.qrserver.com`, `barcodeapi.org`). **La scheda PDF non contiene i campi personalizzati** **[nuovo]**.

Difetto tecnico: alcuni `useState` stanno dopo il ritorno anticipato «Prodotto non trovato» (regola degli hook violata). Da tenere presente se si tocca il file.

## 7. Modifica (`src/screens/product/EditScreen.tsx`)

Struttura fissa, **non segue il layout** **[nuovo]**: Foto; INFORMAZIONI BASE (SKU, tipo, posizione, cartella); PREZZI; MISURE; NOTE TECNICHE; CAMPI PERSONALIZZATI. In quest'ultima sezione compaiono **solo i campi che il prodotto ha già in `customData`**: un campo lasciato vuoto in Aggiungi, o creato dopo, non si può più compilare **[nuovo]**. Le scelte vengono prima (riquadri o finestra), poi gli altri tipi, con gli stessi controlli di Aggiungi ma tutti a larghezza piena. Salvare rigenera il Digital Link GS1 (con seriale casuale cambia a ogni salvataggio).

## 8. Inventario (`src/screens/tabs/HomeScreen.tsx`)

Dall'alto:

- titolo **«FurInventory Pro»** (non Syncro Flow) e numero di prodotti; lente che apre la ricerca (SKU, tipo, posizione);
- **cartelle** come pillole con icona («Tutti» + una per cartella);
- tre **riquadri statistici** scorrevoli: Disponibili, Venduti, Richiedono attenzione (bordo e triangolo se ci sono avvisi);
- **filtri** a pillola con conteggio: Tutti, Disponibili, Venduti, Attenzione, Cestino;
- **griglia a 2 colonne** di card separate: foto in alto alta 160 px, etichette VENDUTO o ALERT sulla foto, sotto SKU, tipo, posizione con icona, prezzo di vendita in oro.

La card mostra **l'id della posizione in maiuscolo** («STAND A»), non la sua etichetta né il suo colore **[nuovo]**. Pressione lunga: selezione multipla con cerchio di spunta, barra in basso con conteggio, «sposta in cartella» (finestra), elimina, chiudi. **Nessun messaggio quando l'inventario è vuoto**: sotto i filtri resta il nero (visto sul web).

## 9. Altre schermate

### 9.1 Barra in basso e intestazioni

| Scheda | Icona | Schermata |
| --- | --- | --- |
| Home | `grid-view` | Inventario |
| Cronologia | `timeline` | `TimelineScreen` |
| Automazioni | `account-tree` | `AutomationsScreen` |
| Aggiungi | `add-circle` | `AddScreen` |
| Impostazioni | `settings` | `SettingsScreen` |

Barra alta 60 px più il margine sicuro (70 sul web), etichette 11 px. Le schermate Posizioni, Campi, Cartelle, Layout, GS1, Hardware e Azione rapida usano l'**intestazione nativa** dello stack, con colori scritti in `RootNavigator.tsx` (`#0A0A0A`, testo oro); tutte le altre disegnano un'intestazione propria (freccia o X, titolo 18 px, filetto), ripetuta in ogni file.

### 9.2 Cronologia

Titolo «Cronologia Completa» e numero di eventi; due file di pillole (tipo: Tutti, Creati, Spostati, Modificati, Venduti, Foto; periodo: Tutti i Periodi, Oggi, Questa Settimana, Questo Mese); elenco di card con icona colorata in un quadrato, titolo, descrizione, data, freccia. Colori per tipo: creato/venduto/ripristinato verde, spostato blu, modificato oro, foto arancione, scansionato viola, eliminato rosso. Tocco = apre il prodotto. Stato vuoto «Nessun evento trovato». **Sul web le pillole escono gonfie** (le prime alte quasi 80 px, quelle del periodo quadrate): difetto visibile.

### 9.3 Automazioni

**Centro Automazioni**: pulsante Scanner in alto a destra (unico ingresso allo Scanner), «LE MIE AUTOMAZIONI» con «Crea Nuova» e card (cerchio colorato con icona, nome, «N step · N utilizzi»); stato vuoto tratteggiato; «TEMPLATE PREDEFINITI» con 4 card; riquadro **chiaro** «Lo sapevi?» con colori fissi gialli, fuori tema.

Le 4 automazioni predefinite:

| Nome | Colore, icona | Cosa fa |
| --- | --- | --- |
| Spostamento Rapido (`BatchMove`) | blu, `move-to-inbox` | scegli una posizione, poi scansioni in serie; ogni capo viene spostato |
| Vendita Flash (`ScanSell`) | verde, `shopping-cart-checkout` | a ogni scansione chiede conferma del prezzo e vende; conta pezzi e totale |
| Audit Posizione (`Audit`) | arancione, `fact-check` | scegli una posizione, scansioni ciò che trovi: trovati, mancanti, intrusi (con scelta di spostarli) |
| Tagging di Massa (`QuickTag`) | viola, `label` | scegli un tag (Da Pulire, Riparare, Riservato, Vetrina o libero) e lo aggiungi alle note dei capi scansionati |

**Automazioni personalizzate** (`AutomationsContext.tsx`): nome, descrizione, icona (10), colore (10), QR `AUTO:<id>` e una sequenza di passi. Passi possibili: Scansiona Prodotto, Scansiona Posizione, Sposta Prodotto, Segna Venduto (con prezzo facoltativo), Aggiungi Tag, Imposta Campo. «Aggiungi Tag» e «Imposta Campo» scrivono nelle note tecniche (`[tag]`, `[campo=valore]`), **non** nei campi personalizzati. Non ci sono attivazioni automatiche: si avviano a mano o scansionando il loro QR. I passi non si riordinano.

- **Costruttore** (`AutomationBuilderScreen`): nome, descrizione, icona e colore in righe scorrevoli, flusso di nodi collegati da frecce, «Aggiungi Step» tratteggiato, anteprima; finestre dal basso per scegliere e configurare un passo.
- **Flusso** (`AutomationFlowScreen`): scheda con icona e statistiche, «Mappa del flusso» (Inizio, passi con barra colorata, Fine), QR da condividere, barra fissa «Avvia Automazione».
- **Esecuzione** (`CustomRunnerScreen`): puntini di avanzamento, passo corrente, pulsante di scansione del colore del passo, prossimi passi; la sequenza ricomincia dal primo «Scansiona Prodotto» finché non si chiude; messaggi con emoji.

Le schermate con fotocamera usano `components/BarcodeScanner.tsx` a tutto schermo (mirino ad angoli, «Inquadra il codice», pulsante rosso tondo per chiudere); Spostamento, Tagging ed Esecuzione lo lasciano aperto per scansioni continue con un riquadro scuro di conferma. Righe e riquadri di esito usano **colori chiari fissi** (`#ECFDF5`, `#FFFBEB`), fuori tema.

BatchMove e Audit spostano con `updateProduct`: in cronologia risulta «modificato», non «spostato».

### 9.4 Scanner e Azione rapida

**Scanner** (`ScannerScreen`): titolo, torcia, fotocamera con mirino, istruzioni, «Importa da Galleria», «Inserisci Manualmente». Riconosce prodotto → posizione → cartella → automazione; altrimenti «Codice Non Riconosciuto» con suono. Galleria e inserimento manuale cercano solo prodotti.

**Azione rapida** (`ScannerActionScreen`, finestra modale):

- prodotto: anteprima (foto, SKU, tipo, posizione) e tre scelte — Spostato (elenco posizioni con pallino), Venduto (prezzo facoltativo), Dettagli/Modifica — più conferma;
- posizione: scheda con bordo del colore, capacità, «Spostamento di massa» e «Inventario/Audit» (la posizione non viene passata all'automazione);
- cartella: «Vedi prodotti» dovrebbe filtrare l'Inventario ma **il filtro si perde** (`compat.ts`).

### 9.5 Impostazioni

Titolo e sezioni con etichetta maiuscola; ogni voce è una riga con **quadrato colorato 48 px e icona bianca** (colori scelti a mano, non dal tema), titolo, descrizione, freccia.

| Sezione | Voci |
| --- | --- |
| Configurazione hardware | GS1 Digital Link, Scanner & NFC |
| Gestione inventario | Gestisci Cartelle, Campi Personalizzati, Configura Layout Aggiungi, Cestino, Gestisci Posizioni |
| Condivisione | Configurazione Condivisione (solo anteprima) |
| Alert e notifiche | Prodotti Dormienti, Suggerimenti AI (entrambi «Prossimamente») |
| Team e spazi di lavoro | spazio attivo «Spazio locale»; con il login spento solo un testo |
| Dati e backup | Esporta Inventario, Importa CSV, zona di trascinamento (solo web), Backup Google Drive |
| Team e accesso | Accesso Multi-Utente (Team) |
| Info | «FurInventory Pro, Versione 1.0.0» |

**Modelli di settore** (`SectorTemplatesScreen`) è registrata ma **nessuna voce ci porta**: oggi non si raggiunge dall'app **[nuovo]**.

Schermate delle voci:

- **Posizioni**: modulo in alto (nome, 10 colori a pallini, codice barcode/NFC con scansiona e genera `LOC-…`, anteprima QR) e elenco (pallino, nome, id e codice, QR, cestino). Almeno una posizione deve restare. Predefinite: Magazzino blu, Vetrina oro, Stand A/B/C verde, Sartoria viola. La capacità esiste nei dati ma non si modifica.
- **Cartelle**: stesso schema; 8 icone (`folder`, `inventory`, `warehouse`, `store`, `shopping-bag`, `category`, `collections`, `layers`), **nessun colore**; codice salvato solo modificando, non creando; non si elimina una cartella che contiene capi. Predefinita «Pellicce» (`inventory`).
- **GS1 Digital Link**: dominio base, AI 01 sempre attivo, AI 21 seriale (UUID o progressivo, controllo a segmenti), AI 10 lotto collegato a un campo personalizzato, anteprima dell'URL con legenda, «Ripristina Predefiniti».
- **Scanner & Hardware**: modalità di lettura (QR, NFC, Entrambi), scrittura automatica NFC, test del sensore. Le prime due non hanno effetto.
- **Cestino**: campi eliminati e prodotti eliminati, ciascuno con Ripristina ed Elimina definitivamente.
- **Condivisione**: pagina statica con cosa vede il Cliente e cosa il Professionista.
- **Team & Accesso**: host/client sulla rete locale con QR, stanza, dispositivi; ha un **suo tema locale** (`T` in `TeamScreen.tsx`). Porta alla **Chat**, che dipende dalla mesh.

### 9.6 Altre

- **Accesso** (`AuthScreen`): «SYNCRO FLOW», «Continua con Google»; oggi non compare.
- **Pagina non trovata**: in inglese, oro diverso (`#FFD700`), sfumatura; non raggiungibile dalle schermate.
- **Avvio**: spinner oro e «Caricamento spazio di lavoro…» con colori scritti in `App.tsx`.

### 9.7 Elementi ripetuti in molti file

Un tema che cambia solo `constants/theme.ts` non basta, perché questi pezzi sono ridefiniti in ogni schermata: intestazione propria; titolo di sezione maiuscolo; riga con quadrato icona, titolo, descrizione e freccia; pillole/chip; riquadri di scelta; campo con icona; pulsante primario oro; pulsante grande di scansione; finestra dal basso; controllo a segmenti; interruttore; stato vuoto; selettori di colore e di icona; riquadri chiari fissi. Le emoji nei testi (💡, 🏷️, ✅, 📍…) sono stringhe nel codice.

## 10. Servizi

### 10.1 Dove stanno i dati

- Prodotti, cronologia, avvisi e cartelle: `contexts/InventoryContext.tsx`, AsyncStorage `inventory:v1:<spazio>:{products,timeline,alerts,libraries,deleted_product_ids}`.
- Configurazioni, sempre in AsyncStorage per spazio: posizioni, campi, layout, automazioni, GS1, hardware.
- Chat: AsyncStorage `chat_messages` (ultimi 100, non per spazio).
- Cestino prodotti: `deletedAt`; l'eliminazione definitiva registra l'id.
- Avvisi: «dormiente» dopo 180 giorni, «promozione» dopo 90, ricalcolati a ogni modifica.
- WatermelonDB (`src/db/`) esiste ma **nessuna schermata ci scrive**: è vuoto e lo usano solo la mesh e una card della chat.
- Supabase (sincronizzazione a «istantanea» per organizzazione, foto nel bucket `organization-media`) e Google Drive funzionano solo con il login, oggi spento.

### 10.2 GS1 / Identità digitale

`utils/gs1.ts`, `contexts/GS1ConfigContext.tsx`, schermata Impostazioni › GS1 Digital Link. Link `{baseUrl}/01/{GTIN}[/21/{seriale}][?10={lotto}]`, con `baseUrl` predefinito `https://syncroflow.app/id`. Il **GTIN è lo SKU** (non viene controllato che sia un GTIN valido); il seriale è casuale (`uuid`) o progressivo a 6 cifre; il lotto viene da un campo personalizzato scelto. Il link si crea in Aggiungi e si **rigenera a ogni salvataggio** in Modifica. Lo scanner interno **non riconosce** i Digital Link: cerca solo SKU o id.

### 10.3 NFC

`utils/nfcService.ts` con `react-native-nfc-manager`. «Programma Tag» nella Scheda pulisce il tag e scrive un record URI con il Digital Link. **La lettura NFC non è usata da nessuna schermata.** Impostazioni › Scanner & NFC verifica supporto e attivazione; le preferenze `scanMode` e «scrivi NFC al salvataggio» si salvano ma nessuno le legge. Sul web: non verificato.

### 10.4 Barcode e QR

- QR generati con `react-native-qrcode-svg` (Scheda, Cartelle, Posizioni, Automazioni, Team); barcode Code 128 disegnato in SVG (`components/Barcode.tsx`), solo nella Scheda.
- Fotocamera: `components/BarcodeScanner.tsx` (QR, EAN-13/8, Code 128/39, UPC) nelle automazioni, Cartelle e Posizioni; lo Scanner principale riconosce nell'ordine prodotto (SKU/id), posizione, cartella, automazione (`AUTO:…`), altrimenti «Codice non riconosciuto» con suono. Prodotto fragile = suono di avviso.
- Lettura da foto in galleria: l'immagine viene **inviata a servizi esterni** (`api.qrserver.com`, `zxing.org`).
- Lettori hardware a tastiera: nessun supporto dedicato.

### 10.5 Stampa e condivisione

Etichetta (QR o barcode) e scheda PDF dalla Scheda capo, tramite HTML → PDF → condivisione. Condivisione testo «Cliente» o «Professionista» con la prima foto. Impostazioni › Condivisione è solo un'anteprima («prossima versione»). Nessuna stampa di elenchi.

### 10.6 Import ed export (Impostazioni › Dati e backup)

- **Esporta CSV** (15 colonne, apribile in Excel); su web scarica, su telefono condivide.
- **Importa CSV**: gli SKU già presenti o vuoti vengono saltati, senza anteprima; sul web anche trascinando il file nella zona tratteggiata.
- **Backup Google Drive** (CSV + Foglio Google): richiede il login, oggi mostra «Google Drive non collegato».
- Nessun backup automatico né ripristino.

### 10.7 Sincronizzazione, team e chat

Tutto spento o scollegato dai dati veri: cloud Supabase (login spento); mesh LAN (`src/services/mesh*`, Impostazioni › Team) che sincronizza solo WatermelonDB, vuoto; ruoli team segnaposto; chat che viaggia sulla mesh. Non fa parte del lavoro sullo stile.

### 10.8 Codice morto o residuo

`app/` (expo-router), `template/`, `components/DynamicFieldRenderer.tsx`, `src/services/mediaCompressor.ts`, gran parte di `backend-auth/` (resta vivo `supabase/client.ts` e `google/driveApi.ts`), `backend-auth/services/exportImport.ts`. Vivi nonostante il nome: `services/SoundService.ts`, `services/mockData.ts` (calcolo avvisi), `lib/templates.ts`.

## 11. Regole per i temi

Un tema cambia l'aspetto, non le funzioni. Oggi il tema è una costante scura letta una volta (`constants/theme.ts`, importato da 31 file), ma ci sono anche 423 colori scritti a mano in 39 file e 331 icone in 32 file: misure complete in `piani di implementazione/ui-ux/audit-tema.md`, difetti in `difetti-trovati.md` (stessa cartella). Ogni proposta deve reggere:

1. **Tutti i tipi di campo** della sezione 5 nel modulo Aggiungi, a 1/3 (circa 106 px), 1/2 e intera, con etichette lunghe; e tutti i riquadri della sezione 6 nella Scheda (mezzo e intero).
2. **Inventario a griglia** a 2 colonne con foto grande in alto; **campi della Scheda come riquadri separati** che sembrano pulsanti (vincoli dell'utente).
3. **I colori delle posizioni** (Magazzino blu, Vetrina oro, Stand verde, Sartoria viola, più quelle create dall'utente): l'utente li usa per riconoscerle; un tema può attenuarli, non toglierli.
4. **Il testo sopra il colore principale**: oggi è nero scritto a mano perché l'oro è chiaro. Con un colore principale scuro serve testo chiaro: va gestito con un token, non file per file.
5. **Le icone salvate nei dati** (campi, layout, cartelle, modelli) sono nomi Material Icons: si possono cambiare solo attraverso una tabella di corrispondenza applicata al momento del disegno, senza toccare i dati salvati.
6. **Colori composti per concatenazione** (`${theme.primary}20` per le trasparenze): funzionano solo se i token sono esadecimali a 6 cifre. Un tema con `rgba()` o nomi di colore li rompe finché non si usa un aiuto per le trasparenze.

Cosa ogni proposta di stile deve mostrare: Inventario (griglia), Scheda capo con un campione di tutti i tipi di riquadro, modulo Aggiungi con campi a 1/3, 1/2 e intera, una sezione, una griglia di riquadri di scelta, un contatore, un documento.
