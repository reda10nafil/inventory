# Scelta dello stile

Type: grilling
Status: resolved
Blocked by: 06

## Question

Quale dei 5 stili applicare, e con quali ritocchi? La risposta fissa i valori dei token (palette, testo sopra il colore principale, caratteri, raggi, ombre, spazi) e i ritocchi per schermata che i lavori L5 e L6 di `grafo-lavori.md` realizzeranno. Se l'utente vuole mescolare due stili, scrivere esattamente cosa viene da ciascuno.

## Answer

Stato: deciso tutto il 22 novembre 2026 (stile e ritocchi comuni).

### Stile: tutti e 5, scelti in Impostazioni (deciso)

22 novembre 2026, parole dell'utente: «posso avere tutti i 5 stili che hai fatto? Mi piacciono moltissimo, per cui magari metti l'opzione di poterli scegliere nell'impostazione e decidere quale utilizzare».

Conseguenze, registrate in `map.md` e `grafo-lavori.md`:

- l'app avrà **5 temi** (Babilonia Vetro, Ishtar Lab, Attuale rifinito, Ardesia e rame, Minimal) con i valori della tela, estratti in `temi/token-stili.json` (93 token per stile, stessi nomi per tutti);
- il «cambio tema dall'app», prima fuori ambito, **entra nel lavoro**: gli stili delle schermate diventano funzioni del tema attivo;
- **stile predefinito proposto: Attuale rifinito**, il più vicino all'app di oggi (l'utente può dire altro);
- la scelta è **del dispositivo**: salvata in AsyncStorage fuori dallo spazio di lavoro, non va nell'esportazione né nella sincronizzazione;
- il **selettore** è una voce nuova in Impostazioni, mai disegnata nei prototipi: si fa nello stile delle righe di Impostazioni esistenti (lavoro L3);
- resta fuori: il passaggio automatico chiaro/scuro secondo il telefono, stili diversi per spazio, colori scelti dall'utente.

### Ritocchi comuni (accettati)

22 novembre 2026, risposta dell'utente all'elenco del ticket 06 («Ritocchi proposti in tutti gli stili»): «Per i ritocchi sì, va bene. L'importante è che fai il modo più giusto e corretto e semplificato.»

Entrano quindi in L6, uguali in tutti gli stili: posizione con nome e pallino colorato sulla card (D05); pillole di Posizione e Cartella a 1/2 che vanno a capo (D09); controlli della stessa riga allineati in basso, etichette su due righe al massimo, segnaposto corti a 1/3 con l'unità a destra; «Venduto», «Attenzione», «Aggiungi prodotto», prezzi in formato italiano; titoli di sezione predefiniti con iniziale maiuscola (salvo Ardesia; i titoli scritti dall'utente restano come li ha scritti); 3 statistiche in una riga; scelta multipla a riquadri che funziona da multipla (D01); le icone nuove del ticket 06, che chiudono anche il ticket 07.

«Il modo più giusto, corretto e semplificato» vale come regola per gli esecutori: la soluzione più semplice che rispetta la tela e la struttura, niente astrazioni in più del necessario.
