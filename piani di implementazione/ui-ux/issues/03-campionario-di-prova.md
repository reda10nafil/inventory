# Campionario di prova: come appaiono oggi le schermate piene

Type: task
Status: resolved
Blocked by: —

## Question

Le schermate viste sul web erano vuote (nessun prodotto, nessun campo personalizzato). Card piena, Scheda capo e controlli dei campi personalizzati sono noti solo dal codice. Prima di disegnare serve vederli veri.

Da fare (AFK, nel browser integrato su http://localhost:8081, spazio locale):

1. creare campi personalizzati che coprano ogni tipo e aspetto: numero, numero con contatore, valuta, data, testo breve, testo breve con scanner, testo lungo, immagini, scelta singola a riquadri, a segmenti, a menu e a lista, scelta multipla a riquadri e a lista, scelta collegata a Posizioni, documento; nomi sia corti sia lunghi;
2. nel layout builder metterli a 1/3, 1/2 e intera, con almeno una sezione;
3. inserire 4-6 prodotti con foto, in posizioni e cartelle diverse, uno venduto, uno con avviso;
4. fare le schermate a 375 px di Inventario, Scheda capo (tutti i riquadri), Aggiungi (tutte le larghezze), Modifica, Cronologia, Impostazioni, Campi, Layout builder; salvarle in `piani di implementazione/ui-ux/schermate-attuali/`.

Decidere nel ticket se tenere il campionario come dati inseriti a mano o come script di seed solo per sviluppo (niente codice nell'app senza motivo). Le schermate servono ai prototipi e come «prima» per il confronto finale.

## Answer

22 novembre 2026. Fatto, senza toccare il codice dell'app.

**Decisione: script di seed solo per sviluppo, fuori dall'app**, in `piani di implementazione/ui-ux/campionario/`:

- `build-seed.py` crea `seed.json` (16 campi personalizzati, layout, 3 cartelle, 6 capi con foto in data URI, 11 eventi di cronologia); le forme dei valori sono prese dal codice (`FieldsScreen` per dataset e opzioni, `AddScreen` per i valori: etichetta per le scelte, elenco di etichette per la multipla, numero per il contatore, data ISO, elenco di URI per immagini e documenti);
- `serve-seed.mjs` espone `seed.json` su `http://localhost:8765` (con CORS) e `seed-web.js` lo scrive nello spazio `local` (si ferma se ci sono già prodotti; c'è anche la funzione per toglierlo);
- `schermate.cjs` apre un Chromium isolato a 375 px (fattore 2), carica il campionario e salva le schermate. Uso: `node schermate.cjs <percorso di playwright>` con app web (8081) e `serve-seed.mjs` accesi. Il campionario vive **solo nel profilo temporaneo di quel Chromium**: lo spazio locale dell'utente nel suo browser non è stato toccato.

**Campionario**: Spessore (numero, mm), Pezzi (contatore 1-20), Costo riparazione (valuta), Data di arrivo in negozio (data, etichetta lunga), Fornitore (testo breve), Codice CITES (testo breve con scanner), Storia, provenienza e lavorazioni precedenti del capo (testo lungo, etichetta lunghissima), Foto dettagli (immagini), Taglia (scelta singola a riquadri, obbligatoria), Condizione (a segmenti), Colore (menu), Lavorazione (lista), Dettagli (multipla a riquadri), Trattamenti eseguiti (multipla a lista), Posizione di consegna (collegata a Posizioni), Certificato di origine e autenticità (documento). Layout: le 5 sezioni predefinite più DETTAGLI DEL CAPO e DOCUMENTI E FOTO, con campi a 1/3 (Pezzi, Data, Spessore), 1/2 e intera. Capi: VIS-0142 (vetrina, tutti i 16 campi compilati, 3 foto, link GS1), VOL-0087 (venduto), LIN-0021, AST-0033 (sartoria), VIS-0098 (magazzino, fermo da 200 giorni → avviso), PUZ-0012.

**Foto**: 6 foto di pellicce dal catalogo di Wikimedia Commons, tutte **di pubblico dominio** (Red fox fur coat Germany 1999, Sapphire mink fur coat 1980, Aleutian mink fur coat 1950, Lynx fur coat 1, Persian lamb (Swakara) fur coat 2011, Fitch fur coat frontside); originali in `campionario/foto/`, ritagli 4:5 in `foto/quadrate/`.

**Schermate** in `schermate-attuali/` (375 px, la versione `b` è la schermata intera): 01 Inventario, 02 Scheda capo (02c venduto), 03 Aggiungi, 04 Cronologia, 05 Modifica, 06 Impostazioni, 07 Campi, 08 Layout builder, 09 Automazioni.

Cose viste che servono ai prototipi:

- a 1/3 (circa 106 px) i segnaposto si tagliano («Inserisci spe…») e «Seleziona Data» va a capo; il contatore ci sta;
- Condizione (a segmenti, messa a 1/2) esce comunque intera, a riquadri come Taglia; la multipla a riquadri va su due righe (3+1);
- le pillole di Posizione a 1/2 sono tagliate («V…»), come già annotato;
- Scheda: tutti i 16 valori compaiono come riquadri, mezzi (testo, numero, scelta, contatore, data, valuta) e interi (multipla, documento, immagini, testo lungo); etichette lunghe vanno su 3 righe nei mezzi riquadri;
- la card dell'Inventario mostra l'id della posizione in maiuscolo («STAND A»), senza colore.
- Inconveniente tecnico: il server Playwright MCP si è bloccato due volte (30 minuti ciascuna); lo script `schermate.cjs` con Playwright lanciato da shell fa tutto in meno di un minuto.
