# NFC: cosa succede alla lettura

Tipo: grilling. Stato: **fetta N1 fatta** il 24 novembre 2026 (corsia C, branch `funzioni/codici`), **non provata sul telefono**; le proposte qui sotto e le decisioni di N1 sono dell'orchestratore al posto dell'utente (24/11), da rivedere con lui. Fetta: N1. Dipende dal ticket 16. Collegati: 16, 17, 22.

## Question

Che cosa fa l'app quando legge un tag?

## Proposta dell'orchestratore

- Una lettura **non vende né paga mai da sola**.
  - Fuori dalle automazioni apre la **Scheda** del prodotto (o l'Azione rapida, come una lettura del codice).
  - In Vendita flash mostra il prodotto e **chiede conferma**.
  - Nelle altre automazioni vale come la lettura di un codice: stesse regole, stessi rifiuti.
- ~~Il tag continua a contenere il **link GS1 di oggi**~~. **Superato il 23 novembre mattina** (risposta dell'utente: QR e tag servono «solo all'app»): il tag porta **il codice** del prodotto, come quelli di posizione, scaffale e categoria; il lettore unico (fetta COD, ticket 22) riconosce anche i link GS1 già scritti sui tag. Oggi nessun lettore riconosce il link GS1 (NG01, AU-V07, provato sul web).
- Il manifest resta **senza `NDEF_DISCOVERED`**: un tag non apre l'app da chiusa.
- Un tag sconosciuto dà un messaggio chiaro e nessuna scrittura.

## N1 — confine e decisioni (24 novembre)

Richiesta dell'utente del 24 (secondo messaggio, punto 2): «si avvicina il tag, l'app sa che cosa farne e non chiede codici senza spiegarli». Tutte le scelte qui sotto: **decisa dall'orchestratore al posto dell'utente, 24/11**.

**Dentro**:

1. **Mai un codice da scrivere per l'NFC** (NG17, NG18, H2 di UX0): via il campo «Tag NFC (facoltativo)» di Scaffali (in Posizioni e Categorie «Barcode / NFC» era già sparito con ETI, ma il tag non si poteva avere). Al suo posto, in «Codice ed etichetta» di posizioni, scaffali e categorie, la riga **«Collega un tag»**, che apre la finestra dal basso «Avvicina il tag al telefono» (`components/NfcSheet.tsx`): una riga di stato («In attesa…», «Tag letto», «Questo tag è di VIS-0098: sostituirlo?») e «Annulla»; un secondo pulsante solo quando serve rispondere («Sostituisci», «Riprova»). L'UID si salva in `nfcTag` come prima («04:A2:3B:1C»): un tag già salvato si legge uguale, nessuna migrazione.
2. **«Scrivi tag NFC» in un tocco** (NG14, decisione 2 di N0): il codice come **record di testo**, un messaggio solo (`writeNdefMessage` sostituisce tutto, la pulizia prima non serve); per posizioni, scaffali e categorie si salva anche l'UID. Tag con dentro altro: si mostra il contenuto e si chiede («Sul tag c'è «Promo inverno»: sostituirlo?»). Tag bloccato: «usa «Collega un tag»». «Programma tag» (il link GS1 in due passi, «Operazione Annullata» sul web, NG19) sparisce da «Avanzate» del prodotto; «Copia link» resta.
3. **Prodotti**: «Scrivi tag NFC» scrive lo SKU; **nessun campo nuovo nel prodotto** (`Product` non ha `nfcTag`; i prodotti hanno colonne nel database locale): niente «Collega un tag» per i prodotti.
4. **Lettura** (NG16): **prima l'UID** se è collegato a qualcosa (un collegamento fatto apposta vince), **poi il testo** del tag, che passa da `resolveCode` come ogni codice (prodotto, posizione, scaffale, categoria; anche i link GS1 scritti prima, vincolo 5). Un tag vuoto e non collegato lo dice in parole («Tag vuoto: scrivilo da «Codice ed etichetta».»); un testo sconosciuto dà «Codice Non Riconosciuto» col testo. Collegare o scrivere un tag di un'altra cosa toglie l'UID a chi lo aveva: un tag non apre mai due cose. «Leggi un tag» nello Scanner (accanto a «Inserisci Manualmente») e in ogni lettore (`BarcodeScanner`, quindi nelle 5 automazioni, accanto a «Scrivi il codice»), solo con l'NFC acceso in Scanner e NFC.
5. **Scanner e NFC** (NG11-NG13, D19): stato in una riga col pallino («NFC pronto», «NFC spento: accendilo…», «Questo telefono non ha l'NFC»), «Fotocamera · NFC · Tutti e due» (valori salvati di prima `qr_only`, `nfc_only`, `both`), «Prova un tag», «Proponi di scrivere il tag» (`autoWriteNfcOnSave`: dopo «Prodotto Aggiunto» il pulsante «Scrivi il tag»), «Avanzate» chiuso con «Zittisci Android con l'app aperta» (qui N2 metterà «Leggi più tag»). Le scelte hanno effetto (`readerSources`, `offerTagWrite`): «Fotocamera» = nessun pulsante NFC; «NFC» = lo Scanner e i lettori senza fotocamera; senza NFC la fotocamera c'è sempre. Via la card col testo lungo, «Pulizia + Scrittura», «Test Stato Sensore» con «Errore». Titolo «Scanner e NFC»; la voce di Impostazioni resta «Scanner & NFC» (la cambia UX1-1 con l'ordine nuovo).
6. **Sul web** (NG19): niente righe NFC; una riga sola «L'NFC si usa dal telefono» (in Scanner e NFC e in «Codice ed etichetta»), mai «Operazione annullata» né «Errore». `utils/nfcService.web.ts` non carica la libreria.
7. **Le quattro decisioni di N0** (ticket 17): (1) silenziatore come interruttore sotto «Avanzate», **spento in partenza** (con l'app aperta il telefono non paga con Wallet: lo sceglie l'utente), solo Android, registrato una volta coi flag 271, mai tolto finché è acceso, riapplicato quando l'NFC si riaccende; (2) scrittura in un tocco; (3) la pausa dello stesso tag riparte a ogni riavvistamento e (4) il minuto senza tag si conta sui soli tag accettati: proposte adottate per N2.

**Fuori**: «Leggi più tag» e la pausa dopo la scrittura (N2); «Pulisci un tag» (non serve: la scrittura sostituisce tutto); un tag mai formattato (`NdefFormatable`: oggi «non si può scrivere», resta «Collega un tag»); il link GS1 conforme (GS1); le etichette (ETI, fatta).

**File**: logica pura in `utils/nfcTag.ts` (jest `nfcTag.test.ts`) e `utils/nfcCore.ts` (servizio con un driver passato da fuori, jest `nfcCore.test.ts` con un driver finto); `utils/nfcService.ts` (driver vero, niente all'import; i nomi di prima `isSupported`, `cleanTag`, `writeGS1Uri` restano solo per i file residui di `app/`) e `utils/nfcService.web.ts`; `tagOwners` in `utils/codes.ts`; `components/NfcSheet.tsx`, `hooks/useTagLinks.ts`, `hooks/useTagOffer.tsx`. Prova `prova/n1-nfc.cjs` (sul web), collaudo CF-E6.

**Da provare sul telefono** (CF-T2, CF-T3): vedi `../collaudo-finale.md`.

## Come si torna indietro

La lettura passa dalla stessa strada del codice a barre: togliendo il comando NFC non cambia altro. N1: togliere le righe NFC da `CodeSheet` e «Leggi un tag» da `ScannerScreen` e `BarcodeScanner`; i `nfcTag` salvati restano e il lettore li legge come prima; la configurazione salvata non è cambiata (solo `silenceAndroid` in più, facoltativo).
