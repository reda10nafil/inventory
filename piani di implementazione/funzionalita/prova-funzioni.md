# Prova delle funzioni sul web (fase B, punto 1)

## Stato attuale (22 novembre, mattina, dopo le correzioni)

La prova qui sotto descrive l'app **prima** delle correzioni. Le correzioni C01-C14 (un commit ciascuna, dettagli in `../CRONOLOGIA.md`) hanno chiuso:

| Correzione | Chiude | Commit |
| --- | --- | --- |
| C01 numeri in formato italiano | P03 | d3128a6 |
| C02 Modifica salva i dati giusti | P01, P02, P04 | 7baa3f8 |
| C03 niente vendite doppie né dal cestino | P05, P06, P25 | bdf04fa |
| C04 spostamenti registrati come tali, percentuale dell'Audit | D15, P22 | 913e7cd |
| C05 posizioni e cartelle eliminate senza orfani | P08, P09 | cb7e9c7 |
| C06 export CSV con cartella e senza cestino, import col pulsante sul web | P07, P18 | e1fbbd1 |
| C07 modelli e campi nuovi nel modulo, Modelli di settore in Impostazioni | D12, D13, P11 | 6a56c73 |
| C08 Modifica mostra i campi del modulo anche vuoti | D03 | ee53296 |
| C09 ricerca per nome della posizione, Attenzione, filtro della cartella | P14, P15, D14 | e2b30fd |
| C10 Cronologia completa | P13 | ffc17bc |
| C11 pulsante QR con il lettore vero | D02 | 844e986 |
| C12 niente immagine d'esempio senza foto | D18 | 77c0549 |
| C13 dominio GS1, numeri della Scheda, Svuota cestino, visore delle foto | P10, P19, P24, P21 | a71ef0a |
| C14 una sola copia delle posizioni predefinite | D21 | 42301ae |

**Restano aperti**: D16 (PDF senza campi personalizzati, codici da servizi esterni), D19 (preferenze Scanner & NFC non lette), P12 (modifiche del Layout builder non salvate ma già applicate), P16-P17 (esecuzione delle automazioni), P20 (foto `blob:` sul web), P23 (esito dell'Audit non salvato), P26 (lettura da fotocamera senza «scansionato»), P27 (etichetta per i capi con link GS1; PDF ed etichetta sul web), P28 (Chat), P29 (Team sul web), P30 (voci «Prossimamente»), il messaggio di LokiJS al primo avvio web. Non verificabili da qui: fotocamera, NFC, stampa, condivisione del telefono, mesh LAN, Drive.

## La prova (prima delle correzioni)

22 novembre 2026, notte. Branch `funzioni/magazzino` dopo F00 (conferme del browser al posto di `Alert.alert`, che su react-native-web non fa nulla). App web su `localhost:8082`, campionario di `ui-ux/campionario/seed.json` (6 capi), finestra 375×812, **un browser pulito per ogni scenario**.

**Metodo.** «Funziona» vuol dire che **lo stato salvato** (localStorage: prodotti, cronologia, liste) cambia come deve, non solo che la schermata compare. Ogni riga dei dettagli cita lo scenario che lo prova. Script Playwright in `prova/` (`lib.cjs` più `a1-…` `a4-…`), riepiloghi per area in `prova/esito-a1.md` … `esito-a4.md` con file:riga per ogni difetto. Le prove delle 4 aree sono state fatte da 4 subagenti in parallelo e poi **rilanciate tutte** dalla sessione principale (vedi in fondo).

**Lettura simulata.** Sul web non c'è fotocamera: per Audit, Spostamento rapido, Tagging, Vendita flash ed Esecuzione lo script chiama il gestore che la schermata dà al lettore, come una lettura vera. Si prova la logica dopo la lettura; la fotocamera resta da provare sul telefono.

## Riepilogo per funzione (righe della lista B.1)

| Funzione | Esito | Dettagli |
| --- | --- | --- |
| Inventario: filtri | funziona, con difetti | Tutti, Disponibili, Venduti, Attenzione, Cestino giusti; la pillola Attenzione conta gli avvisi, non i prodotti (P15); la ricerca usa l'id della posizione (P14) e nei filtri Cestino e Attenzione è ignorata (P14). `esito-a1` |
| Inventario: cartelle | funziona, con difetti | Pillole e conteggi giusti; «Vedi prodotti» di una cartella dall'Azione rapida perde il filtro (D14). `esito-a1`, `esito-a3` |
| Inventario: selezione multipla | funziona | Seleziona tutto, sposta e togli dalla cartella, elimina (con conferma). Lo spostamento in cartella non va in cronologia (P13). `esito-a1` |
| Aggiungi | funziona, con difetti | Salvataggio completo, SKU generato, obbligatori di base e personalizzati, modulo svuotato. Difetti: immagine d'esempio Unsplash senza foto (D18), pulsante QR che scrive un codice finto (D02), numeri con la virgola troncati (P03), sul web foto salvate come `blob:` perse alla ricarica (P20). `esito-a2` |
| Scheda | funziona, con difetti | Condividi Cliente/Professionista (testo), copia link GS1, Modifica. Difetti: peso «2.1 kg» (P19), visore delle foto fermo sulla seconda sul web (P21). Condivisione del sistema, NFC, documenti: non verificabili da qui. `esito-a1` |
| Modifica | non funziona (dati a rischio) | Prezzo, posizione, cartella e campi già presenti si salvano. Ma: **ogni salvataggio cambia il link GS1** (P01), **cancella i valori dei campi nel cestino** (P02), **«2,5» diventa 2** (P03), aperta dall'indirizzo o ricaricata mostra il modulo vuoto (P04), non segue il layout e non mostra i campi vuoti (D03), pulsante QR con codice finto (D02). `esito-a1` |
| Cronologia | funziona, con difetti | Filtri per tipo e periodo giusti (24 combinazioni), tocco sull'evento; non registra peso, misure, cartella e campi personalizzati (P13); spostamenti da Spostamento rapido e Audit risultano «modificato» (D15). `esito-a1` |
| Cestino | funziona, con difetti | Apertura, ripristina (con Annulla), elimina per sempre. Manca «Svuota cestino» (P24). `esito-a1` |
| Automazioni: Audit | funziona, con difetti | Attesi, trovati, mancanti, intrusi, «Sposta qui». Difetti: percentuale sbagliata con un intruso (P22), «Sposta qui» = «modificato» (D15), esito non salvato (P23). `esito-a3` |
| Automazioni: Spostamento rapido | funziona, con difetti | Scelta e cambio destinazione, posizione piena; in cronologia «modificato» (D15). `esito-a3` |
| Automazioni: QuickTag | funziona | Tag comune e personale, niente doppioni (il tag è testo nelle note). `esito-a3` |
| Automazioni: ScanSell | funziona, con difetti | Vendita con prezzo, capo già venduto rifiutato; **vende un capo nel cestino** (P06); senza prezzo lo schermo scrive «0 €» (P25). `esito-a3` |
| Automazioni: CustomRunner | funziona, con difetti | Lettura, tag, sposta, vendita; «Imposta campo» scrive nelle note (P17); un'automazione senza lettura iniziale resta bloccata (P16); aperta dall'indirizzo non conta l'uso. `esito-a3` |
| Automazioni: AutomationFlow | funziona | Mappa e QR «AUTO:»; Condividi non verificabile da qui. `esito-a3` |
| Automazioni: builder | funziona | Controlli, crea, modifica, elimina, salvataggio. `esito-a3` |
| Impostazioni: Posizioni | funziona, con difetti | Crea, modifica nome e colore, elimina, nome doppio rifiutato; **eliminare una posizione lascia i prodotti con un id orfano** (P08); D21 confermato (due copie su tre sono codice morto). `esito-a4` |
| Impostazioni: Cartelle | funziona, con difetti | Crea, rinomina, elimina (bloccata se piena); si elimina se i prodotti sono solo nel cestino, che poi ripristinati puntano al nulla (P09). `esito-a4` |
| Impostazioni: Campi | funziona, con difetti | Crea, modifica, elimina; il campo nuovo non entra in Aggiungi finché non lo si mette nel layout, senza avviso (P11). `esito-a2` |
| Impostazioni: Layout builder e modelli | non funziona (modelli) | Sposta, nascondi, aggiungi campo funzionano; **MODELLI salva un solo campo e non tocca il layout, ma dice «Layout sostituito con successo!»** (D12 confermato, peggio del previsto); le modifiche non salvate valgono fino alla ricarica (P12). `esito-a2` |
| Impostazioni: Modelli di settore | non funziona | Nessuna voce la apre, l'indirizzo dà «Page Not Found» (D13); l'import avrebbe lo stesso difetto di D12; «Salva come modello» solo iOS. `esito-a2` |
| Impostazioni: GS1 | funziona, con difetti | Salva, ripristina, link in Aggiungi; ricaricando la pagina il dominio salvato viene sovrascritto (P10); vedi P01 per Modifica. `esito-a4` |
| Impostazioni: Hardware (Scanner & NFC) | non funziona | Le preferenze si salvano ma nessuno le legge (D19); test NFC non verificabile da qui. `esito-a4` |
| Impostazioni: Condivisione | non funziona | Pagina statica «prossima versione». `esito-a4` |
| Impostazioni: Team | non verificabile da qui | Si apre solo da «Accesso Multi-Utente»; mesh LAN: servono due dispositivi; sul web dice «Host pronto» anche se la creazione fallisce; ricaricando dà NotFound (manca in `linking.ts`). `esito-a4` |
| Scanner | funziona | Codice scritto a mano, prodotto/posizione/cartella/sconosciuto, QR «AUTO:». Fotocamera, galleria (che manda la foto a servizi esterni), flash: non verificabili da qui. La lettura da fotocamera non registra «scansionato» (P26). `esito-a3` |
| Azione rapida | funziona, con difetti | Spostato, Venduto con prezzo, Spostamento di massa e Audit dalla posizione; **rivende un capo già venduto** (P05); «Vedi prodotti» della cartella perde il filtro (D14). `esito-a3` |
| Import/export | funziona, con difetti | Export CSV e import trascinando il file funzionano; il pulsante «Importa» sul web fallisce (P18); l'export include il cestino senza segnarlo e non ha la cartella, quindi il giro esporta-importa la perde (P07); backup Drive e file su telefono non verificabili da qui. `esito-a2`, `esito-a4` |
| Stampa PDF ed etichetta | non verificabile da qui (telefono); non funziona sul web | Sul web entrambe finiscono in errore (`expo-print` stampa la pagina dell'app); l'etichetta non si raggiunge per i capi con link GS1 (P27); il PDF non ha i campi personalizzati e scarica i codici da servizi esterni, titolo «FurInventory Pro» (D16, D07). `esito-a1` |
| Chat (fuori lista, trovata in Team) | funziona, con difetti | Messaggi doppi, «Approva spostamento» sempre verso Vetrina, «Vendi» senza conferma né prezzo, storico non separato per spazio. `esito-a3` |

Conteggi per area: A1 24 funzionano / 16 no / 4 non verificabili; A2 15 / 12 / 4; A3 37 / 8 / 5; A4 29 / 10 / 5.

## Difetti trovati (nuovi), in ordine di gravità

I difetti già numerati (D02, D03, D12-D16, D18, D19, D21) restano in `ui-ux/difetti-trovati.md`; qui quelli nuovi, `P` = prova. Fonti e file:riga negli esiti.

| N | Dove | Cosa | Gravità |
| --- | --- | --- | --- |
| P01 | Modifica | Ogni salvataggio rigenera il seriale del link GS1: QR, etichette e tag NFC già fatti non corrispondono più | dati |
| P02 | Modifica | Se un campo personalizzato è nel cestino, salvare il prodotto ne cancella il valore (il cestino promette il contrario) | dati |
| P03 | Aggiungi, Modifica | Numeri letti con `parseFloat`: «2,5» → 2, «4.500» → 4,5 | dati |
| P04 | Modifica | Aperta dall'indirizzo o ricaricata: modulo vuoto, e salvando si sovrascrive il prodotto | dati (web) |
| P05 | Azione rapida | Rivende un capo già venduto (nuovo `soldAt`, secondo evento) | dati |
| P06 | Vendita flash, Scanner | Vende o apre un capo nel cestino | dati |
| P07 | Export CSV | Include il cestino senza segnarlo, manca la cartella; il giro esporta-importa perde cartella e foto locali | dati |
| P08 | Posizioni | Eliminare una posizione lascia i prodotti con l'id orfano (mostrato grezzo, Modifica senza posizione) | dati |
| P09 | Cartelle | Una cartella con prodotti solo nel cestino si elimina; ripristinati puntano al nulla | dati |
| P10 | GS1 | Ricaricando la pagina il campo mostra il dominio predefinito e uscendo sovrascrive quello salvato | dati (web) |
| P11 | Campi | Un campo nuovo non entra in Aggiungi finché non lo si aggiunge dal Layout builder, senza avviso | comportamento |
| P12 | Layout builder | Le modifiche non salvate valgono subito e spariscono alla ricarica, senza avviso | comportamento |
| P13 | Cronologia | Non registra peso, misure, tipo, SKU, cartella, campi personalizzati né lo spostamento in cartella | comportamento |
| P14 | Inventario | La ricerca usa l'id della posizione («Stand A» non trova nulla); in Cestino e Attenzione è ignorata | comportamento |
| P15 | Inventario | La pillola e il riquadro Attenzione contano gli avvisi, non i prodotti | comportamento |
| P16 | Esecuzione automazioni | Un'automazione che non inizia con una lettura resta bloccata (codice di esecuzione mai chiamato) | comportamento |
| P17 | Esecuzione automazioni | «Imposta campo» scrive nelle note, non nel campo | comportamento |
| P18 | Import CSV (web) | Il pulsante fallisce (`readAsStringAsync` non c'è sul web); il trascinamento va | comportamento (web) |
| P19 | Scheda, testi condivisi | Pesi e numeri non in formato italiano («2.1 kg») | comportamento |
| P20 | Aggiungi (web) | Foto salvate come `blob:`, perse alla ricarica | comportamento (web) |
| P21 | Scheda (web) | Il visore mostra sempre la seconda foto e non scorre | comportamento (web) |
| P22 | Audit | Percentuale 50% con tutti gli attesi trovati e un intruso | comportamento |
| P23 | Audit | L'esito non resta (né riepilogo né cronologia) | comportamento |
| P24 | Cestino | Manca «Svuota cestino» | comportamento |
| P25 | Vendita flash | Senza prezzo lo schermo scrive «0 €» (il dato salvato è giusto) | comportamento |
| P26 | Scanner | La lettura da fotocamera non registra «scansionato» (quella a mano sì) | comportamento |
| P27 | Scheda | L'etichetta non si raggiunge per i capi con link GS1; su web PDF ed etichetta in errore | comportamento |
| P28 | Chat | Messaggi doppi; «Approva spostamento» sempre verso Vetrina; «Vendi» senza conferma né prezzo; storico non per spazio | comportamento |
| P29 | Team (web) | «Host pronto» anche se la creazione fallisce; Team e Chat danno NotFound ricaricando | comportamento (web) |
| P30 | Impostazioni | «Alert Prodotti Dormienti», «Suggerimenti AI» e Condivisione dicono solo «Prossimamente» | da decidere |

Note aperte della settima parte di `PASSAGGIO_UI_UX.md`, chiarite dalla prova: visore della Scheda (P21, sul web; sul telefono da provare); pesi non in formato italiano (P19); ricerca per id della posizione (P14); messaggio di WatermelonDB al primo avvio (eccezione nota, resta per la fase B); ruoli del tema mancanti (estetica, non provati qui).

## Ordine delle correzioni (punto 2)

Prima i difetti che rovinano dati, poi quelli che toccano le fette del magazzino (`grafo-lavori.md`), poi il resto. Un task per riga; i difetti dello stesso file e della stessa causa vanno insieme.

| Task | Difetti | Perché in questo ordine |
| --- | --- | --- |
| C01 | P03 (numeri con la virgola, Aggiungi e Modifica) | dati; funzione `parseNumber` che serve anche alle quantità (M02) |
| C02 | P01, P02, P04 (Modifica salva i dati giusti) | dati |
| C03 | P05, P06 (niente vendite doppie né dal cestino) | dati; prepara `sellProduct` per M03 |
| C04 | D15 (Spostamento rapido e Audit con «spostato»), più P22 | serve prima di M03 |
| C05 | P08, P09 (posizioni e cartelle eliminate) | dati |
| C06 | P07, P18 (export CSV completo, import col pulsante sul web) | dati; prepara M08 |
| C07 | D12, D13, P11 (modelli e campi nuovi nel layout) | modelli di settore = app per qualsiasi prodotto |
| C08 | D03 (Modifica segue il layout) | serve prima di M03 |
| C09 | P14, P15, D14 (ricerca, Attenzione, filtro cartella) | Inventario |
| C10 | P13 (cronologia completa) | storico del magazzino |
| C11 | D02 (QR in Aggiungi e Modifica con il lettore vero) | |
| C12 | D18 (niente immagine d'esempio) | |
| C13 | P10, P19, P24, P21 | piccoli |
| C14 | D21 (copie morte delle posizioni) | sicuro, verificato: nessun importatore |
| dopo | D16, D19, P16, P17, P20, P23, P25-P30 | meno urgenti o non verificabili da qui |

## Rilancio di controllo

La sessione principale ha rilanciato tutti gli script delle 4 aree (95 scenari, 4 processi in parallelo, browser puliti). Stessi esiti dei subagenti per tutti i «non funziona» chiave: link GS1 che cambia in Modifica (`a1-mod-base`, `a4-gs1-modifica`), campo nel cestino che perde il valore (`a1-mod-campo-nel-cestino`), peso «2,5» salvato come 2 (`a1-mod-base`), modello che salva un solo campo e lascia il layout uguale (`a2-layout-modello`), giro CSV che perde cartella e foto (`a2-csv-esporta-reimporta`), «modificato» invece di «spostato» (`a3-batch-sposta`), vendita dal cestino (`a3-cestino-vendita-flash`), rivendita (`a3-azione-vendi-gia-venduto`), cartella eliminata con prodotti nel cestino (`a4-cart-cestino`), posizione eliminata con prodotti orfani (`a4-pos-elimina`). Errori di console visti solo dove attesi: condivisione assente nel browser di prova, `blob:` dopo la ricarica (P20), `GO_BACK` aprendo l'Azione rapida dall'indirizzo.
