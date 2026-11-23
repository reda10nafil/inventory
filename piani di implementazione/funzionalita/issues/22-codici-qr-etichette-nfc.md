# Codici, QR, etichette e NFC: funzionano? interfacce semplici

Tipo: grilling + research (verifica). Stato: **verificato** il 23 novembre 2026 mattina, **una risposta dell'utente**, due domande aperte; **fetta COD fatta** il 23 novembre (vedi sotto). Fette: **COD**, **ETI**, **GS1**, più gli aggiornamenti di **N1** e **N2** (ticket 16-18). Mappa: [`../map-3.md`](../map-3.md). Verifica completa: [`../ricerche/verifiche-23/verifica-nfc-gs1.md`](../ricerche/verifiche-23/verifica-nfc-gs1.md) (difetti `NG01-NG27`) e, per i lettori nelle automazioni, [`verifica-automazioni.md`](../ricerche/verifiche-23/verifica-automazioni.md) (AU-V07, AU-V14, AU-A0, AU-A8).

## Question

Le funzioni NFC e GS1 Digital Link funzionano? Come devono essere fatte per essere semplici, moderne e complete, e come si registra uno scaffale con QR o NFC?

## Richiesta dell'utente (23 novembre mattina)

> «Primo, non so se funzionano. Secondo, le loro interfacce sono troppo complesse e troppo datate […] di 10-15 anni fa. Io volevo qualcosa di più innovativo e più semplificato, e soprattutto con tutte le funzioni necessarie, per cui dovresti capire come funzionano, che cosa fanno e poi poterle integrare.»
> «Devo poter configurare ogni scaffale e andarlo a registrare tramite il QR code oppure l'NFC.»

## Stato verificato (sintesi; i dettagli e i passi sono nel resoconto)

1. **L'app non sa rileggere i codici che crea** (NG01 = AU-V07, provato sul web): la Scheda mostra un QR con il link GS1 e lo scrive sul tag, ma Scanner, inserimento a mano e le 5 automazioni cercano solo SKU o id esatti; il link dà «Codice non riconosciuto». Ci sono **sette ricerche diverse** dei codici. Il codice di uno scaffale non è riconosciuto nelle automazioni (AU-V14); lo SKU in minuscolo nemmeno; lo Scanner a mano cerca solo i prodotti.
2. **Il link GS1 non è conforme**: GTIN = SKU non controllato (NG05), lotto in `?10=` (NG06) da un testo senza limite (NG08), seriale progressivo che si ripete (NG03), seriale anche per gli articoli a quantità (NG09), non si spegne (NG04), anteprima falsa (NG07).
3. **Dati che si rovinano**: la Modifica aggiunge in silenzio un link ai prodotti che non l'avevano (NG02) e un cambio di Lotto o di SKU riscrive i link già stampati (NG27); toccando l'icona QR di un'altra riga mentre si modifica una posizione, due posizioni finiscono con lo stesso codice (NG24, provato; nelle Cartelle letto nel codice); nessun controllo dei doppioni tra posizioni e categorie (NG25, anche nei «visti e non toccati» di S1a).
4. **Scanner & NFC: 4 controlli su 5 non hanno effetto** (NG11 = D19, provato); la diagnostica sul web dice «Errore» (NG12); testi che promettono funzioni inesistenti (NG13).
5. **NFC**: si scrive solo dalla Scheda, solo per i prodotti con il link (NG15), in due passi con la gara 500/1000 ms di N0 (NG14); **la lettura non esiste** (NG16); i tag di posizioni e categorie sono campi mai usati (NG17); il tag dello scaffale è testo scritto a mano (NG18). Libreria 3.x con la nuova architettura: rischio da provare sul telefono (NG20).
6. **Etichette**: solo i prodotti senza link hanno l'etichetta (P27 = NG21); PDF ed etichetta sul web in errore; codici da servizi esterni (D16, AU-V16: senza internet l'etichetta esce probabilmente senza QR); tre QR diversi per lo stesso prodotto (NG23); posizioni, categorie e scaffali hanno il QR solo sullo schermo (NG26).
7. **Perché sembrano vecchie**: 14 controlli su due pagine, tre quarti senza effetto o da specialisti, 20 parole tecniche («AI 01», «Endpoint», «UUID», «Legacy»…), italiano e inglese mescolati.

Riconfermati: P01 chiuso in parte (una Modifica senza cambiamenti tiene il link), P10 chiuso.

## Decisioni

- **Risposta dell'utente (23 mattina)**: QR e tag dei prodotti servono **«solo all'app»**. Portano **il codice** del prodotto (si leggono senza internet). Il link al sito (GS1 conforme) resta una scelta da accendere sotto «Avanzate». Il resolver GS1 e gli App Links sono **fuori** (NG10). Il lettore unico riconosce comunque i link GS1 già stampati o scritti.
- **Proposte dell'orchestratore** (dal resoconto, «il modo più giusto e corretto e semplificato»):
  - **un codice per ogni cosa** (prodotto, posizione, scaffale, categoria), uguale in QR, barcode e tag NFC; nasce da solo alla creazione;
  - **un solo lettore** che riconosce tutti i formati, vecchi compresi;
  - **una sola finestra «Codice ed etichetta»** con Stampa, Condividi, Scrivi tag;
  - due schermate d'impostazioni con 2-3 scelte ciascuna, il resto sotto «Avanzate».
- **Da chiedere quando la fetta è la prossima** (una per volta):
  - GS1: i prodotti hanno codici **EAN/GTIN ufficiali** (iscrizione a GS1 Italy) o solo codici interni? Decide se il campo «EAN / GTIN» serve subito.
  - ETI: con che cosa si stampano le etichette (stampante normale su A4 o etichettatrice) e di che misura?
  - N1: le quattro decisioni di N0 (ticket 17) e le proposte del ticket 18.

## Piano di implementazione

### Fetta COD — lettore unico e codici che non si rovinano (dopo C2; blocca S3, N1, ETI, ESE) — **fatta il 23/11**

**Confine** (decisa dall'orchestratore al posto dell'utente, notte del 23): entrano i punti 1-7 qui sotto, cioè `utils/codes.ts` con i test; chi lo usa (Scanner e le 5 automazioni); «scansionato» anche dalla fotocamera (P26); l'inserimento a mano in `BarcodeScanner`; la Modifica che non crea né riscrive link (NG02, NG27); i doppioni (NG24, NG25); i resti di S1a e C1. Restano fuori: le etichette e la finestra «Codice ed etichetta» (ETI), il link GS1 conforme (GS1), l'esecuzione corretta delle automazioni, AU-V01-V06 e gli altri (ESE), l'NFC sul telefono (N1, N2).

**Esito** (dettagli in `../../CRONOLOGIA.md`, decisioni nelle righe COD di `../../DECISIONI_DA_RIVEDERE.md`): `utils/codes.ts` (`resolveCode`, `gs1LinkParts`, `gs1ElementParts`, `productRead`, `placeRead`, `codeOwner`, `codeError`, `codeCheck`, testi) con `hooks/useCodeReader.ts`; Scanner (fotocamera, a mano, immagine) e 5 automazioni lo usano; «Scrivi il codice» in ogni lettore; prodotto nel cestino rifiutato alla lettura; scaffale = la sua posizione con l'avviso (AU-V14); Modifica senza link: **il link non si riscrive mai, nemmeno con lo SKU cambiato** (punto 5 cambiato per il vincolo 5: il lettore riconosce comunque il link vecchio); finestra del QR con uno stato suo e `codeCheck` con l'avviso sotto il campo in Posizioni, Categorie e Scaffali; `#666` → ruolo del tema in Posizioni e Categorie. `getProductBySku` resta solo per l'import CSV e la Chat. Prova `prova/cod-lettore.cjs` (11 scenari), jest `__tests__/codes.test.ts`, `__tests__/gs1Keep.test.ts` riscritto (la Modifica non usa più `keepGS1DigitalLink`), collaudo CF-E1, CF-E2, CF-E3 (parte COD), CF-C4 (parte COD). Non verificati: fotocamera vera e NFC sul telefono.


1. Primo passo: **riprodurre su `HEAD`** NG24 e NG25 (le schermate Posizioni e Cartelle sono cambiate con S1a dopo la verifica).
2. `utils/codes.ts` nuovo, puro, con test jest:
   - `resolveCode(testo, fonti)` → `{ tipo: 'prodotto' | 'posizione' | 'scaffale' | 'categoria' | 'automazione', id }`, «nel cestino», «ambiguo» (con i candidati, mai il primo a caso) o «sconosciuto»;
   - ordine: link salvato identico (anche versioni precedenti, NG27); link GS1 scomposto con qualunque dominio (`/01/…`, `/10/` o `?10=`, `/21/`), GTIN o SKU **e** seriale insieme (con NG03 due prodotti hanno già lo stesso seriale); SKU e id senza maiuscole; stringhe GS1 (`]C1`, `(01)…(21)…`); codici e tag (testo o UID) di posizioni, categorie, scaffali; `AUTO:`; `syncroflow://`;
   - `codeOwner` / `codeError` spostati da `utils/shelves.ts` e allargati a tutti (posizioni, categorie, scaffali, prodotti, UID).
3. Chi lo usa: `ScannerScreen` (fotocamera e inserimento a mano, che ora trova anche posizioni, scaffali e categorie), le 5 automazioni (`CustomRunnerScreen`, `AuditScreen`, `BatchMoveScreen`, `QuickTagScreen`, `ScanSellScreen`), `getProductBySku` del contesto (lascia il posto al lettore). La lettura dalla fotocamera registra «scansionato» come quella a mano (P26).
4. **Inserimento a mano** in `components/BarcodeScanner.tsx` («Scrivi il codice», stesso `onScan`): vale per 5 automazioni e serve per le prove sul web, per le etichette rovinate e per i lettori a pistola.
5. **Modifica non crea né riscrive link** (NG02, NG27): si toglie il ramo «nessun link» di `keepGS1DigitalLink` dalla Modifica (con il test `__tests__/gs1Keep.test.ts:33-35` e il testo della Scheda «Modifica e salva il prodotto per generarlo»); un cambio di lotto o d'impostazioni non riscrive; un cambio di SKU riscrive con l'avviso «etichette e tag già fatti restano leggibili dall'app».
6. **Doppioni** (NG24, NG25): stato della finestra del QR proprio, non quello del modulo; `codeError` a ogni salvataggio di posizione, categoria e scaffale; i doppioni già presenti si segnalano senza bloccare il salvataggio di un altro campo.
7. Resti di S1a e C1 da chiudere qui: ricerca a mano dello Scanner solo sui prodotti; `#666` in `FoldersScreen` (ruolo del tema).

### Fetta ETI — etichette e finestra «Codice ed etichetta» (dopo COD)

1. `utils/labelHtml.ts` (puro, con test): HTML con SVG del QR e del Code128 fatti in locale, **senza script e senza indirizzi esterni** (D16, AU-V16); `utils/code128.ts` estratto da `components/Barcode.tsx`. Formati: un'etichetta per pagina; foglio A4; misura dell'etichettatrice (secondo la risposta).
2. `components/CodeSheet.tsx`: una finestra per prodotti, posizioni, categorie e scaffali (sostituisce le 4 di oggi): QR grande, codice scritto, **Stampa etichetta**, **Condividi**, **Scrivi tag NFC** (sul telefono, fetta N1), sotto «Avanzate» **Cambia codice** e **Collega un tag**. Raggiungibile per **tutti** i prodotti (P27).
3. Un contenuto solo per il QR di un prodotto, uguale in Scheda, etichetta, PDF e tag (NG23): il codice (risposta dell'utente).
4. PDF: codici locali, campi personalizzati nell'ordine del modulo, titolo «Syncro Flow» (D16, D07).
5. Web: stampa dell'HTML dell'etichetta in una finestra sua (`window.print()`), mai la pagina dell'app.
6. **Registrazione di uno scaffale** (e di posizioni e categorie): alla creazione il codice nasce da solo (`suggestShelfCode` di S1a), poi si apre «Codice ed etichetta»; dall'elenco «Stampa tutte le etichette di questa posizione» (AU-A8, etichette in serie, anche dalla selezione multipla dell'Inventario).

### Fetta GS1 — Impostazioni «Codici ed etichette» (dopo ETI e la risposta sul GTIN)

1. Schermata nuova al posto di GS1 Digital Link: in alto l'anteprima vera di un'etichetta con «Stampa una prova»; **«Che cosa portano QR e tag»**: «Il codice del prodotto» (predefinito, risposta dell'utente) o «Un link al tuo sito» (campo «Indirizzo del sito»); **formato delle etichette** e che cosa scrivere sotto il QR; **Avanzate** chiuse: lotto da un campo di testo corto (avviso oltre 20 caratteri), seriale diverso dallo SKU, «Crea il link per i prodotti che non l'hanno» (con il numero e la conferma, in cronologia), «Ripristina».
2. Link conforme quando è acceso: `utils/gs1.ts` con `isValidGTIN`, `toGTIN14`, lotto nel percorso (`/01/{gtin}/10/{lotto}/21/{seriale}`), seriale = SKU per i pezzi unici, nessun seriale per gli articoli a quantità; un prodotto senza GTIN non riceve un link GS1 (NG03-NG09). Campo facoltativo «EAN / GTIN» nel prodotto se l'utente ha codici ufficiali.
3. Chi ha già una configurazione salvata resta in modo «Link» (per lui non cambia nulla); i campi nuovi si uniscono ai predefiniti. Le due voci passano da «Configurazione hardware» a «Codici, etichette e NFC» in Impostazioni.

### N1 e N2 (ticket 16-18, mappa 2) — aggiunte

- Schermata «Scanner e NFC» semplice: stato in una riga, «Prova un tag», fotocamera / NFC / tutti e due (sul web la scelta non c'è), «Proponi di scrivere il tag» dopo un prodotto nuovo; «Avanzate» per «Leggi più tag» (N2), «Zittisci Android con l'app aperta», «Pulisci un tag» (NG11-NG13, D19).
- Sul tag si scrive **il codice come record di testo** in un tocco (`writeNdefMessage` sostituisce tutto, la pulizia prima non serve: NG14), e si salva l'**UID** in `nfcTag`; «Collega un tag» per i tag bloccati (sostituisce il campo scritto a mano di S1a, NG18). Prima di sovrascrivere un tag pieno si mostra il contenuto e si chiede conferma.
- La lettura NFC passa da `resolveCode`: i passi «Scansiona» delle automazioni accettano QR, NFC o entrambi secondo Scanner e NFC (così i «passi NFC nel costruttore» di `map-2.md` non sono passi a sé).
- Sul web: «Non disponibile sul web» invece di «Operazione annullata» (NG19).

## Piano di verifica

- **COD**: jest `codes.test.ts` (ogni formato, link vecchi con `?10=` e SKU al posto del GTIN, seriale doppio → ambiguo, maiuscole, cestino, UID, codici doppi). Prova nuova `prova/cod-lettore.cjs`: il link GS1 di VIS-0142 apre il prodotto dallo Scanner a mano e in ognuna delle 5 automazioni; lo SKU in minuscolo idem; il codice di uno scaffale in «Scansiona Posizione» e nello Spostamento rapido; posizione, scaffale e categoria dallo Scanner a mano; NG24 rifatto passo per passo → nessun doppione; Modifica di un prodotto senza link → resta senza; cambio di lotto → link invariato. Regressioni: `a3-*.cjs`, `m09-azione.cjs`, `a4-gs1.cjs`, `a4-posizioni.cjs`, `a4-cartelle.cjs`, `s1-scaffali.cjs`, `a1-modifica.cjs`; `controllo.sh`.
- **ETI**: jest `labelHtml.test.ts` (nessun `<script>` né `http` nell'HTML, QR con il codice). Prova `prova/eti-etichette.cjs`: «Codice ed etichetta» raggiungibile per un prodotto con link (P27), per posizione, categoria e scaffale; contenuto del QR uguale in Scheda e etichetta; sul web la stampa apre la finestra dell'etichetta senza errori. Telefono: stampa in modalità aereo con il QR presente; etichette in serie di una posizione.
- **GS1**: prova `prova/gs1-codici.cjs` (scenari `u1-*` del resoconto §5.5): predefiniti con lo storage vuoto (modo «Codice», Avanzate chiuse, lotto spento); configurazione vecchia → modo «Link» con lo stesso dominio; link conforme per un prodotto con GTIN valido, nessun link senza GTIN. Regressioni: `a4-gs1.cjs` (atteso aggiornato), `a2-aggiungi.cjs`, `a1-modifica.cjs`.
- 5 stili per ogni fetta: `stili-cod.jpg`, `stili-eti.jpg`, `stili-gs1.jpg`.
- **Telefono** (N1/N2, ticket 17 §6 e resoconto §3.5): scrittura in un tocco e lettura di un tag di prodotto, di posizione e di scaffale; tag sconosciuto; «Collega un tag»; Scanner e NFC = «solo fotocamera» → nessun pulsante NFC; Wallet con l'app aperta (decisione di N0).

## Come si torna indietro

Il lettore unico è sola lettura: tornare alle ricerche di prima non tocca i dati. I link salvati non si riscrivono mai, quindi le etichette restano valide in ogni caso. La configurazione GS1 vecchia si legge sempre.
