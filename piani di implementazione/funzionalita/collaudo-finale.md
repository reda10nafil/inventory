# Collaudo finale — tutto collegato (mappa 3)

Piano per controllare, alla fine delle fette di [`map-3.md`](map-3.md), che ogni funzione chiesta dall'utente il 23 novembre funzioni **e sia collegata alle altre**. Si percorre l'app come la usa l'utente. Ogni passo dice **quale fetta lo rende verde**, così si rilancia per gruppi man mano che le fette chiudono; i passi di una fetta non ancora fatta restano «da fare», non «rossi».

## Come si fa

- **Sul web**, con `prova/collaudo.cjs` (nato con C2, che ha scritto CF-A2 per la sua parte e CF-B5; GAL ha scritto CF-C3 e le sue parti di CF-C1 (3 foto, Scheda con galleria e visore; resta a MCAT la categoria in testa) e CF-C4 (prezzo 0); COD ha scritto CF-E1, CF-E2, la sua parte di CF-E3 (link riconosciuto nelle 5 automazioni, prodotto nel cestino rifiutato) e di CF-C4 (SKU e link invariati dopo una Modifica, anche con il lotto acceso; resta a VAL gli obbligatori); ESE ha scritto CF-F7 (automazione fatta dal costruttore con due tag, «Imposta Campo» e vendita con il prezzo «1300,50»: tre note, cioè la nota che c'era e i due tag, il campo in `customData`, prezzo 1300,5; un'automazione senza lettura iniziale non si salva) e la sua parte di CF-E3 (nell'esecuzione un rifiuto si dice e non conta: cestino, capo già venduto senza la finestra del prezzo); VAL ha scritto le sue parti di CF-C4 (la Modifica senza cambi lascia i campi personalizzati identici; togliendo la Taglia obbligatoria non salva) e di CF-B3 (un'opzione usata rinominata dall'editor dei valori: id uguali, prodotti non riscritti, Scheda e Modifica col nome nuovo); EDC ha completato CF-B3 (campo «Colore del capo» creato dall'interfaccia a binario orizzontale con «Mostra nella card», colore e icona dati a un valore, Larghezza Base con la ruota da 40 a 120 passo 10, Aggiungi compilato toccando la pillola e la riga della ruota, Scheda col pallino del colore, card col valore; verde il 24/11); IND ha scritto la sua parte di CF-A2 (la X dello Scanner dall'indirizzo e dai menu; la Conta dai menu con 3 pz scritti: il tasto del browser torna alla scelta della posizione con l'indirizzo giusto, la X chiede «Uscire dalla conta?» e con OK esce, nessuna rettifica) e CF-A3 (avvio a freddo col database del browser vuoto e una ricarica durante il primo avvio, poi le 5 schede e ogni indirizzo di `linking.ts`: 0 errori in console contando anche il messaggio di LokiJS; resta a VOCI la parte «Prossimamente»); verdi il 23/11; S2 ha scritto le sue parti di CF-D1 (ripiano A1 50×50×30 cm, 10 kg, 20 pezzi dal modulo, categoria Borse creata prima e scelta dalla tendina: misure salvate, codice creato da solo `SCAF-MAGAZZINO-A1`, riga con le misure e la barra a 0% verde; resta a ETI la finestra «Codice ed etichetta» con Stampa), CF-D2 (Movimenta Carico su A1 di 10, 6 e 4 pezzi: 50% verde, 80% blu, «Pieno» rosso, tre colori dei ruoli del tema; la Scheda «Su A1 ne entrano ancora 10 come questo», poi «non ne entrano altri: pezzi al massimo») e CF-D5 (barra appendiabiti da 15 grucce senza Lunghezza né Profondità, 15 capi appesi: «Pieno», «Liberi: 0 grucce»; resta a S3 il 16° capo bloccato con la proposta); S3 ha scritto CF-D3 (su A1 di Borse con Movimenta: un prodotto 60×40×20 bloccato «Un lato di 60 cm è più grande di 50 cm» con la proposta del generico G1 perché B2 di Borse è troppo piccola; uno da 12 kg bloccato con la proposta B2; il 21° pezzo bloccato «21 pezzi, il massimo è 20» con la proposta B2; nessun evento con la finestra aperta, il tocco lo posa lì), CF-D4 (su R2 da 2 pezzi lo stesso avviso «R2 sarà pieno» e la stessa finestra «3 pezzi, il massimo è 2» / «Metti in G1 (libero al 90%)» da Aggiungi, Movimenta, Azione rapida, Spostamento rapido col codice di R2 ed esecuzione; «Annulla» non scrive; in Conta e Audit di Vetrina con capienza 2 solo «oltre il limite») e la sua parte di CF-D5 (il 16° capo sulla barra da 15 grucce bloccato con la proposta di una seconda barra, e appeso lì); ACC1 ha scritto CF-H4; ETI ha scritto CF-E4 e CF-D1-ETI e adattato CF-B1 e CF-E2; N1 ha scritto CF-E6; gli altri passi stampano «da fare»): ogni fetta, alla chiusura, **aggiunge i suoi passi** a quel file (uno scenario per passo, nome `CF-…`), con lo stesso aiuto `lib.cjs` delle prove (browser pulito, campionario). Si lancia tutto o un gruppo: `node collaudo.cjs CF-D`. Un passo verde vuol dire: l'azione riesce, i dati salvati sono quelli attesi (letti con `h.store`), 0 errori in console.
- **Nei 5 stili**: il foglio di ogni fetta (`stili-<fetta>.jpg`); alla fine un foglio unico con le schermate nuove (`stili-collaudo.jpg`).
- **Sul telefono** (gruppo T): a mano, con l'APK di debug (`adb install -r`, mai disinstallare), seguendo i passi scritti; esito annotato qui sotto con la data. Finché non si fanno restano **«non provato»**.
- Prima del collaudo finale: `controllo.sh` verde e tutte le prove delle fette verdi.

## A · Avvio e navigazione

| Passo | Che cosa | Atteso | Fetta |
| --- | --- | --- | --- |
| CF-A1 | Aprire le schermate principali (Inventario, Aggiungi, Scheda, Automazioni, Impostazioni e sottopagine) | Tutte le icone visibili (glifi caricati), nei 5 stili | nessuna (controllo) |
| CF-A2 | Ogni indirizzo di `linking.ts` aperto dal menu, poi ricaricato, poi aperto direttamente; Scanner dai menu; Conta col tasto Indietro di sistema | Freccia (o X) presente; porta alla scheda madre; 0 `GO_BACK`; Team, Chat, Crea automazione senza NotFound; nella Conta un passo indietro, poi la domanda | C2, IND (fatte) |
| CF-A3 | Avvio a freddo e giro di tutte le schermate | 0 errori in console (anche LokiJS: da IND il database nasce solo alla prima card di prodotti della Chat); nessuna voce «Prossimamente» rimasta senza decisione | IND (fatta), VOCI |

## B · Catalogo: categorie, campi, modulo

| Passo | Che cosa | Atteso | Fetta |
| --- | --- | --- | --- |
| CF-B1 | Creare la categoria «Borse» con la sottocategoria «Borse › Zaini» | Albero giusto, nome completo ovunque | C1, CAT1 (fatta, 24/11: `cfB1` in `prova/collaudo.cjs`, verde) |
| CF-B2 | Modulo di «Borse»: «Parti da un modello» (un Modello di settore adatto) | Campi creati e messi nel modulo di Borse soltanto; gli obbligatori valgono solo lì | MCAT |
| CF-B3 | Creare un campo «Colore» (scelta da elenco, pillole, colori per opzione, icona) e «Larghezza» (misura con la ruota); rinominare un'opzione usata | Si compilano in fretta in Aggiungi; nella Scheda icone e colori; il prodotto che aveva l'opzione rinominata la mostra col nome nuovo | VAL, EDC (fatte; sul web il campo si chiama «Colore del capo» perché «Colore» c'è già nel campionario, e «Larghezza» è la misura Base con la ruota) |
| CF-B4 | Nel Modulo di «Borse»: nascondere un campo, aggiungere una sezione, uscire senza salvare, poi salvare | Senza «Salva» nulla cambia; dopo, Aggiungi, Modifica e Scheda seguono il modulo; Posizione non nascondibile; «Zaini» usa il modulo di Borse | MOD, MCAT |
| CF-B5 | Campi › «Tipo di pelle»: aggiungere e rinominare un valore | Voce «Tipi di pelle» assente da Impostazioni; i prodotti seguono il nome nuovo; valore usato non eliminabile | C2 |

## C · Prodotto e foto

| Passo | Che cosa | Atteso | Fetta |
| --- | --- | --- | --- |
| CF-C1 | Aggiungi: categoria «Borse» in testa, compaiono i suoi campi; 3 foto; salvare; aprire la Scheda | Galleria con miniature, frecce, puntini; la miniatura 3 mostra la foto 3; visore con frecce | MCAT, GAL |
| CF-C2 | Ricaricare la pagina (web) | Le 3 foto ci sono ancora | FOTO |
| CF-C3 | Modifica: scegliere la foto 2, «Metti come principale», eliminare la foto 3 | Principale e foto rimaste giuste, `storageImagePaths` allineati | GAL |
| CF-C4 | Modifica senza cambiare nulla, poi cambio di un campo | Codice e link del prodotto invariati; campi personalizzati non riscritti; obbligatori controllati; prezzo 0 mostrato bene | COD, VAL, GAL (fatte) |

## D · Scaffali

| Passo | Che cosa | Atteso | Fetta |
| --- | --- | --- | --- |
| CF-D1 | Creare il ripiano «A1» (50×50×30 cm, 10 kg, 20 pezzi) nella posizione Magazzino, categoria Borse | Codice creato da solo; finestra «Codice ed etichetta» con Stampa | S1a, S2, ETI (parte ETI fatta, 24/11: `cfD1Eti`, riga CF-D1-ETI di `prova/collaudo.cjs`, verde; il codice nasce al salvataggio con S2, su `funzioni/codici` da solo con «Crea il codice») |
| CF-D2 | Mettere prodotti su A1 fino al 50%, all'80%, al 100% | Barra e percentuale verde, poi blu, poi rossa | S2 |
| CF-D3 | Mettere su A1 un prodotto 60×40×20, poi uno da 12 kg, poi il 21° pezzo | **Blocco** con il motivo e la proposta di un altro scaffale adatto (prima Borse, poi generico); il tocco sulla proposta lo posa lì | S3 |
| CF-D4 | Stesso carico da Aggiungi, Movimenta, Azione rapida, Spostamento rapido, esecuzione di un'automazione | Stesso avviso e stesso blocco ovunque; in Conta e Audit solo l'informazione | S3 |
| CF-D5 | Creare una barra appendiabiti da 15 grucce, appendere il 16° capo | Blocco con la proposta | S2, S3 |

Da S1b (24/11; nota per chi scrive CF-D1…D5, nessun passo scritto): su A1 si mettono anche **articoli a quantità**. Aggiungi ha lo scaffale anche con la quantità (il carico iniziale va su `magazzino/<idA1>`); Movimenta ha la fila «Scaffale» per «In», «Da» e «A» (etichette `In Magazzino › A1`, `A Magazzino › A1`); l'Azione rapida usa la stessa finestra per Carico e Scarico. Spostamento rapido ed esecuzione delle automazioni portano ancora in una posizione senza scaffale: lo scaffale come destinazione è di FLU1. La prova `prova/s1b-giacenza.cjs` (`prepara`, `invariante`, `movimento`) è il punto di partenza per riempire A1 in CF-D2.

Da S2 (24/11, corsia B): CF-D1 (parte S2), CF-D2 e CF-D5 (parte S2) sono scritti in `collaudo.cjs`. Per CF-D3, CF-D4 e il 16° capo di CF-D5 (S3): `fitsShelf` dà il motivo del blocco («un lato di 60 cm è più grande di 50 cm», «pesa 12 kg, lo scaffale ne regge 10»), `fillLevel` le soglie, `fitCountText` il perché della proposta. I prodotti del campionario non hanno l'altezza e misurano 98-120 cm: il prodotto 60×40×20 e quello da 12 kg vanno preparati (`s2-capacita.cjs`, `prepara` con le misure).

Da S3 (24/11, corsia B): CF-D3, CF-D4 e la parte S3 di CF-D5 sono scritti in `collaudo.cjs` (aiuti in `prova/s3-util.cjs`). CF-D è verde salvo la finestra «Codice ed etichetta» di CF-D1 (ETI). Lo scaffale come destinazione dello Spostamento rapido e dell'esecuzione è già fatto (S3): CF-F1 di FLU1 può mettere i 3 articoli «in Magazzino › A1» leggendo il codice di A1.

Dall'Unione 2 (25/11): CF-D è tutto verde. CF-D1 non ha più «da fare» (la finestra con Stampa è il passo CF-D1-ETI, verde col codice nato al salvataggio); CF-E6 guarda in «Codice ed etichetta» la riga spenta «Scrivi tag NFC» con «Funziona dal telefono».

## E · Codici, etichette, NFC

| Passo | Che cosa | Atteso | Fetta |
| --- | --- | --- | --- |
| CF-E1 | Scanner (inserimento a mano) con lo SKU, lo SKU in minuscolo, il vecchio link GS1 di VIS-0142 | Apre il prodotto ogni volta; la lettura registra «scansionato» | COD |
| CF-E2 | Scanner con i codici di una posizione, di A1, di una categoria; codice di A1 come destinazione nello Spostamento rapido | Apre la cosa giusta; nessun codice doppio accettato tra posizioni, categorie, scaffali | COD |
| CF-E3 | Le 5 automazioni con lo stesso codice di prodotto | Riconosciuto in tutte; un prodotto nel cestino rifiutato col messaggio | COD, ESE |
| CF-E4 | «Codice ed etichetta» di un prodotto con link e di A1: Stampa | Etichetta con QR e codice fatti in locale (nessun indirizzo esterno nell'HTML); sul web si apre la finestra dell'etichetta | ETI (fatta, 24/11: `cfE4` in `prova/collaudo.cjs`, verde) |
| CF-E5 | Impostazioni › Codici ed etichette con lo storage vuoto, poi con una configurazione GS1 vecchia | Modo «Il codice del prodotto», Avanzate chiuse; con la configurazione vecchia modo «Link» con lo stesso dominio | GS1 |
| CF-E6 | Impostazioni › Scanner e NFC sul web | Nessuna scelta NFC, una riga «L'NFC si usa dal telefono» (anche in «Codice ed etichetta»), nessun «Errore»; la configurazione salvata resta | N1 (fatta, 24/11: `cfE6` in `prova/collaudo.cjs`, verde) |

## F · Magazzino e automazioni

| Passo | Che cosa | Atteso | Fetta |
| --- | --- | --- | --- |
| CF-F1 | Ricevimento da un fornitore: 3 articoli in Magazzino › A1 | Eventi di carico con il fornitore, giacenze giuste, blocco se A1 è pieno | FLU1 |
| CF-F2 | Uscita a un cliente con quantità e prezzo | Scarico con il cliente e il prezzo; Cronologia e scheda del contatto | FLU1 |
| CF-F3 | Trasferimento di 2 pezzi su 5 da Magazzino a Vetrina | Giacenze 3 e 2; un evento di trasferimento | FLU1 |
| CF-F4 | Conta col lettore di una posizione con scaffali; Audit di Stand B uscendo e rientrando | Rettifiche giuste; esito dell'Audit salvato; «Posizioni da verificare» aggiornata | CON |
| CF-F5 | «Da riordinare» › «Ricevi» | Apre il Ricevimento già pronto per quel fornitore | RIO |
| CF-F6 | Reso di un articolo a quantità e di un pezzo unico venduto | Giacenza e stato tornano; eventi in Cronologia e nel CSV dei movimenti | RES |
| CF-F7 | Automazione personale [Scansiona, Tag, Tag, Imposta campo, Vendi con conferma]: prezzo «1300,50» | Tre note presenti, campo scritto in `customData`, prezzo 1300,50; un'automazione senza lettura iniziale non si salva | ESE |
| CF-F8 | Costruttore: passi nuovi Carico e «Chiedi conferma», riordino dei passi | Eseguiti con quantità e conferma; ordine salvato | FLU2, ESE |

## G · CSV

| Passo | Che cosa | Atteso | Fetta |
| --- | --- | --- | --- |
| CF-G1 | Esporta inventario | BOM, una colonna per campo («Colore», «Larghezza»), avviso delle foto non esportate (prima di I2), giacenze e scaffale | EXP |
| CF-G2 | Importare un CSV «;» di un altro gestionale con «Materiale» sconosciuto e link di immagini | Anteprima senza scrivere; abbinamento proposto; «+ Crea campo» Materiale e ritorno con il file ancora caricato; righe rifiutate col motivo; dopo «Importa» i valori e le immagini ci sono | IMP |
| CF-G3 | Esportare e reimportare in uno spazio vuoto | Prodotti, categorie, campi, giacenze e scaffali uguali (le foto locali secondo la decisione di EXP) | EXP, IMP |

## H · Operatori

| Passo | Che cosa | Atteso | Fetta |
| --- | --- | --- | --- |
| CF-H1 | Home: icone Team e Chat accanto alla ricerca; Chat senza colleghi; card con dati giusti; «Sposta» verso la destinazione scelta | Si aprono; niente testi di prova; niente messaggi doppi; rifiuti detti | CHAT1 |
| CF-H2 | Selezione di 2 prodotti › «Invia» a un collega › il collega «Ricevuto, sposta» | Un solo evento di trasferimento per prodotto con `requestId`; giacenze giuste; una seconda accettazione non fa nulla | RIC1 |
| CF-H3 | Automazione «Invia a collega» a fine lettura; automazione «Ricevi» che confronta i pezzi arrivati; automazione condivisa trovata da un collega | Richiesta creata; confronto trovati/mancanti/in più; esecuzione; automazione visibile e avviabile dal collega | RIC2, RIC3 |
| CF-H4 | Impostazioni › Persone e telefoni › Accesso: nome e nome del telefono, ricarica; ruolo Operatore; di nuovo Titolare; un prodotto nel cestino dalla Home | Nome riletto; voci di Impostazioni spente col motivo, e il tocco non apre nulla; evento nuovo con «Mario · Banco 1» in Cronologia, i vecchi con «—»; nessuna richiesta a supabase.co | ACC1 (fatta) |

## Z · La catena intera (un solo scenario lungo)

Categoria «Borse» → Modello di settore applicato a Borse → campo nuovo con valori pronti → Aggiungi una borsa con 3 foto nel modulo di Borse → tentativo su uno scaffale troppo piccolo (**blocco** e proposta) → posa sullo scaffale proposto → etichetta del prodotto → lettura del suo codice dallo Scanner e in un'automazione → spostamento in un'altra posizione → export CSV → import del file in uno spazio vuoto → stessa borsa, stessi campi, stesso scaffale, stesse foto (secondo EXP/FOTO). Fette: MCAT, EDC, GAL, FOTO, S3, ETI, COD, ESE, EXP, IMP.

## T · Solo sul telefono (restano «non provato» fino alla prova)

| Passo | Che cosa | Fetta | Esito |
| --- | --- | --- | --- |
| CF-T1 | Tasto Indietro di sistema: Impostazioni › Categorie, Conta a metà, finestre aperte; link `syncroflow://settings/folders` ad app chiusa; icone e freccia su un APK di release in modalità aereo. Da IND: nella Conta (Automazioni › Conta Magazzino › una posizione › una quantità scritta) il tasto di sistema torna alla scelta della posizione con la quantità ancora lì se si rimette la stessa posizione, un secondo tocco chiede «Uscire dalla conta? Le quantità scritte si perdono.» (Annulla resta, Esci torna ad Automazioni), dopo «Registra» si esce senza domanda; Scanner: la X e il tasto di sistema tornano ad Automazioni; la freccia nativa (Categorie, Azione rapida) con TalkBack: che cosa legge dopo `headerBackTitle: 'Indietro'`; Movimenta, QR, foto a tutto schermo e «Inserisci codice» chiusi dal tasto di sistema lasciano la schermata sotto | C2, IND | non provato |
| CF-T2 | Fotocamera nello Scanner e nelle automazioni («scansionato» registrato una volta sola anche con una raffica di letture dello stesso codice: sul web la seconda lettura non si può provare); lettore a pistola in «Scrivi il codice» (in Audit e Vendita flash il lettore si richiude a ogni lettura e va riaperto); «Codice usato da più cose» con 3 candidati su Android (l'Alert ha al massimo 3 pulsanti: controllare che nessuno si perda); NFC: scrivere il codice su un tag in un tocco, leggerlo dallo Scanner e da un passo «Scansiona»; tag sconosciuto; «Collega un tag»; Scanner e NFC = «solo fotocamera» → nessun pulsante NFC; Wallet con l'app aperta. Da N1, passo per passo: (1) Impostazioni › Scanner e NFC: la riga dice «NFC pronto» (con l'NFC spento «NFC spento: accendilo…», poi riacceso dalla tendina torna «NFC pronto» al rientro); «Prova un tag» con un tag vuoto, uno col codice di VIS-0142, uno col vecchio link GS1 → «Tag letto: …» giusto. (2) Scheda VIS-0142 › «Codice ed etichetta» › «Scrivi tag NFC» su un tag vuoto → «Tag scritto» in un tocco; Scanner › «Leggi un tag» → Azione rapida di VIS-0142; lo stesso da «Scansiona Prodotto» di Vendita flash, Tagging, Spostamento rapido, Audit ed Esecuzione. (3) «Scrivi tag NFC» di VIS-0098 sullo stesso tag → «Questo tag è di VIS-0142: sostituirlo?» → «Sostituisci» → il tag apre VIS-0098. (4) Un tag con un testo qualsiasi → «Sul tag c'è «…»: sostituirlo?»; un tag bloccato → «Questo tag non si può scrivere: usa «Collega un tag»». (5) Un tag sconosciuto nello Scanner → «Codice Non Riconosciuto» col testo; un tag vuoto → «Tag vuoto: scrivilo da «Codice ed etichetta».». (6) Scanner e NFC = «Fotocamera» → nessun «Leggi un tag», nessuna riga NFC in «Codice ed etichetta»; «NFC» → Scanner e lettori senza fotocamera, «Leggi un tag» e «Scrivi il codice»; «Tutti e due» → tutte e due. (7) «Proponi di scrivere il tag» acceso, Aggiungi un prodotto → «Prodotto Aggiunto» con «Scrivi il tag» → tag scritto, poi la Home. (8) Avanzate › «Zittisci Android con l'app aperta» acceso: un tag col link https avvicinato con l'app aperta e nessuna lettura non apre il browser né suona; il telefono non paga con Wallet con l'app aperta, fuori sì; spento: come prima. (9) Annulla durante «In attesa…» e dopo 20 s senza tag «Nessun tag letto. Riprova.»; su iPhone, chiudere il pannello di sistema chiude la finestra senza messaggio (in lettura, in scrittura e dopo «Sostituisci»), e «Collega un tag» salva l'UID. (10) NG20: tutto questo con la libreria 3.x e `newArchEnabled=true` (se l'NFC non risponde affatto, è il primo sospetto). (11) Silenziatore spento: dopo una lettura col tag ancora appoggiato al telefono Android non apre una sua schermata né il browser. (12) Un telefono senza NFC (o con la libreria che non parte) e «NFC» salvato dalla schermata di prima: lo Scanner e i lettori hanno la fotocamera, nessun «Leggi un tag»; Scanner e NFC dice «Questo telefono non ha l'NFC». | COD, N1, N2 | non provato |
| CF-T3 | Registrare lo scaffale A1 con un tag NFC e rileggerlo come destinazione. Da N1: Impostazioni › Scaffali › icona del QR di A1 › «Scrivi tag NFC» (scrive SCAF-… e salva l'UID) oppure, con un tag già scritto o bloccato, «Collega un tag»; poi Spostamento rapido › destinazione › «Leggi un tag» sul tag di A1 → Magazzino (lo scaffale vale la sua posizione, AU-V14; dall'Unione 2, con S3, la destinazione letta è lo scaffale: «Magazzino › A1»); lo stesso tag collegato poi a Vetrina → «Questo tag è di Magazzino › A1: sostituirlo?» e A1 lo perde. | ETI, N1 | non provato |
| CF-T4 | Stampa di un'etichetta e del PDF in modalità aereo: QR presente, campi personalizzati nel PDF. Da ETI: Scheda › «Codice ed etichetta» › «Stampa etichetta» (stampa del sistema) nei tre formati, con la stampante dell'utente; «Condividi» (PDF dell'etichetta) e «Stampa scheda PDF» (PDF con «Syncro Flow», campi personalizzati, QR e Code 128) in modalità aereo; inquadrare l'etichetta stampata con lo Scanner → la scheda giusta; la finestra del codice sopra la finestra della categoria (iOS) e il tasto Indietro col lettore aperto in «Cambia codice». | ETI (il PDF con i campi, lasciato da EDC) | non provato |
| CF-T5 | Foto da galleria e fotocamera; ancora presenti dopo Impostazioni Android › App › Svuota cache; Scheda con prezzo d'acquisto 0 che non cade | FOTO, GAL | non provato |
| CF-T6 | Due (poi tre) telefoni sullo stesso modem **senza internet**: aggancio, Chat nei due versi e con la Chat chiusa, Richiesta inviata e accettata, stesso inventario e stesse giacenze dopo modifiche offline su entrambi; poi internet acceso e cloud allineato; interruttore Automatico / Solo rete locale / Solo internet | CHAT1, RETE1, RETE2, RIC1, RIC2 | non provato |
| CF-T7 | Export CSV condiviso e aperto in Excel o Fogli; import di un CSV salvato da Excel sul telefono | EXP, IMP | non provato |
| CF-T8 | Login Google e passaggio dei dati locali (quando L1 e L2 sono pronti) | L1, L2 | non provato |
| CF-T9 | Campi in Aggiungi e Modifica col dito: la ruota di «Larghezza» (e di un Tipo di pelle a ruota) scorsa e lasciata va a scatti, si ferma sulla riga nella fascia e la sceglie, senza far scorrere la pagina; i binari di Tipo di pelle, Posizione e Categoria scorrono veloci in orizzontale e la sfumatura dice che continuano; il menu a tendina si apre e si chiude dentro la pagina che scorre; la tastiera non copre «Oppure scrivi un altro valore» e «Aggiungi … ai valori» | EDC | non provato |
| CF-T10 | Foto del profilo dalla galleria del telefono (permesso, foto non quadrata), tastiera dei campi di Accesso | ACC1 | non provato |
