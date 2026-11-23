# Richieste dell'utente del 23 novembre 2026, mattina

Registro completo di quello che l'utente ha chiesto il 23 mattina, perché nulla vada perso. Per ogni punto: che cosa ha detto, dove era già registrato (ticket di `inventory-stili/piani di implementazione/funzionalita/`) e che cosa manca. Le frasi tra virgolette sono dell'utente.

Richiesta generale: «fare dei task e fare dei piani di implementazione per tutte queste cose […] e per come configurarli al meglio. E una volta creato il piano di implementazione bisogna anche creare il piano per controllare che queste cose funzionano, che sono ben connessi e integrati nell'applicazione.» Ha anche detto: «non puoi perdere pezzi in giro».

> **Dove sono finiti** (orchestratore 3, 23 novembre): ogni punto ha un ticket con il piano di implementazione e di verifica nella [mappa 3](map-3.md) (ticket 21-30, più 14 e 15 aggiornati), le verifiche dello stato attuale sono in [`ricerche/verifiche-23/`](ricerche/verifiche-23/), il collaudo in [`collaudo-finale.md`](collaudo-finale.md). La tabella di copertura in fondo a `map-3.md` controlla che nessun punto manchi. Risposte dell'utente del 23: blocco degli scaffali con le soglie 50/80 (punto 1), «selettori» = Modelli di settore e un solo posto Campi + Modulo per categoria (punti 3-5), QR e tag «solo all'app» (punto 2), Chat e Team da tenere (punto 11, sotto).

## 1. Scaffali: capacità, misure, peso, blocco quando è pieno

- «Gli scaffali dovevano avere la capacità di capire il volume dei posti, esempio larghezza e lunghezza di uno scaffale […] oppure un carrello delle grucce, per capire quanti pezzi poteva accogliere».
- «Uno scaffale di 30 cm di altezza per 50 di larghezza e lunghezza non può prendere uno più grande del suo volume, perché non accoglierebbe una scatola così grande.» Quindi serve anche il controllo **del singolo prodotto**: se un lato del prodotto supera lo scaffale, non entra, anche se lo scaffale è vuoto.
- «C'è anche un massimo del peso che può sopportare […] io dovrei poterli configurare.»
- «Devo poter configurare ogni scaffale e andarlo a registrare tramite il QR code oppure l'NFC.»
- «Quando cercherò di mettere una scatola più grande […] oppure il 21° pezzo, allora mi ferma e mi dice è pieno, ha raggiunto il suo massimale, per cui mi consiglia un altro scaffale più adatto per quella categoria lì.»

Già registrato: ticket 13 (S1a in corso, S1b), 14 (capacità in pezzi, peso, volume: fetta S2), 15 (riempimento, avvisi, proposta: fetta S3).

Manca o cambia:
- **controllo del singolo prodotto** (lati del prodotto contro lati dello scaffale): non era nei ticket;
- **blocco**: il ticket 15 diceva «avviso, non blocco» (risposta del 22 sera). Ora l'utente dice «mi ferma». Proposta di conciliazione, da confermare: avviso dall'80%; **blocco** quando il prodotto non entra (lato troppo grande, peso oltre il massimo, pezzi oltre il massimo), con la proposta di uno scaffale adatto della stessa categoria;
- **carrello delle grucce**: un tipo di scaffale la cui capacità si misura in lunghezza di barra o in numero di grucce;
- registrazione dello scaffale con QR e NFC: il codice e il tag sono in S1a, la scrittura del tag NFC no (dipende da N1).

## 2. NFC e GS1 Digital Link: capire se funzionano, rifare le interfacce

- «Primo, non so se funzionano. Secondo, le loro interfacce sono troppo complesse e troppo datate […] di 10-15 anni fa. Io volevo qualcosa di più innovativo e più semplificato, e soprattutto con tutte le funzioni necessarie, per cui dovresti capire come funzionano, che cosa fanno e poi poterle integrare.»

Già registrato: NFC nei ticket 16-18 e nella ricerca N0 (`ricerche/N0-nfc.md`), fette N1 e N2 (funzionamento, non l'aspetto). GS1 Digital Link: nessun ticket.

Manca: verifica di che cosa fa davvero Impostazioni › GS1 Digital Link e Scanner & NFC (Hardware), schermata per schermata; nuovo disegno semplice delle due interfacce; prove (sul web per il GS1, sul telefono per l'NFC).

## 3. Campi personalizzati: tipi, modi di inserimento, lettura veloce

- «Se vado a creare un campo non ho tutte le funzionalità, non posso scegliere se il campo deve contenere solamente, devo scriverlo lì nel momento sul tasto aggiungi, oppure posso configurarlo già all'interno con dei campi già precompilati».
- Valori precompilati mostrati come: «una tenda a scomparsa, un menu a scomparsa, oppure dei campi scorrevoli, verticali e orizzontali, oppure un picker per settare in modo veloce la lunghezza e larghezza».
- «Quando li devo leggere vorrei avere magari delle icone giuste per una lettura veloce con gli occhi».
- «Se è solamente un campo, se ci sono più campi, i colori».
- «Dovresti capire come funzionano i campi personalizzati, come migliorarli al meglio e farli.»

Già registrato: nulla, salvo la correzione «Tipo di pelle solo nei campi» (bozza del ticket 21, `ticket-21-c2-bozza.md`).

## 4. Layout builder (Configura Layout Aggiungi)

- «Layout builder, stessa cosa, non funziona bene.»

Già registrato: nulla.

## 5. Selettori: campi per categoria

- «I selettori dovrebbero essere praticamente come dei campi personalizzati per delle categorie […] i campi per una borsa non sono i campi per una giacca […] ogni categoria dovrebbe avere i suoi componenti nei selettori, in modo che posso decidere che tipo di campi voglio in modo veloce, già preprogrammati.»
- Da chiarire con l'utente: «selettori» è probabilmente Impostazioni › Modelli di settore («Campi pronti per il tuo tipo di prodotti»). Le categorie di C1 sono le cartelle: oggi una cartella ha già un elenco di campi (`Library.fields`); va verificato se Aggiungi li usa.

Già registrato: nulla.

## 6. Import ed export CSV: immagini e corrispondenza delle colonne

- «Bisogna poter importare o esportare i CSV dei prodotti. Peccato che mancano i link delle immagini.»
- «Se poi voglio importare dei prodotti, come faccio a importarli se poi non li accetta? […] non si può mappare i campi. Esempio, un campo mancante, ma che c'è sul CSV […] ci dovrebbe essere il tasto che mi porta nei campi personalizzati, creare il campo che serve e poi tornare indietro e selezionarlo per poter importare quei prodotti. Stessa cosa per i link delle immagini, poi dovrebbe capirlo.»

Già registrato: link delle immagini nel ticket 11 (fette I1-I3, foto sul cloud con link pubblici; dipende dal login). Corrispondenza delle colonne all'import: nessun ticket.

Manca:
- schermata di import con la corrispondenza colonna del CSV → campo dell'app, anteprima, righe rifiutate con il motivo;
- «crea campo» dall'import (va in Campi Personalizzati, poi torna e lo seleziona);
- import dei link delle immagini (scaricarle o tenerle come link);
- export: che cosa c'è oggi nella colonna «Immagini URL» per le foto locali.

## 7. Scheda prodotto: più immagini da scorrere

- «Nei prodotti, se io ho più immagini, non posso selezionarli e poter scrollare tra un'immagine e l'altra. Non funziona.»

Già registrato: nulla. Difetto da riprodurre e correggere.

## 8. Tasto Indietro sparito nelle pagine

- «Il tasto indietro nelle pagine è scomparso.»

Già registrato: bozza del ticket 21 (manca dopo un ricaricamento o un link diretto; riprodotto il 23 mattina). Da verificare se manca anche in altri casi, schermata per schermata.

## 9. Automazioni: mancanti, passi mancanti, funzionano?

- «Ci sono tantissime automazioni che mancano, oppure step che mancano. Per di più bisogna vedere se funzionano bene.»

Già registrato: prova delle funzioni del 22 (`prova-funzioni.md`, gruppo A3) e i difetti rimasti (D16, P16-P17, P20, P23, P26-P30) senza fetta. Passi NFC nelle automazioni: «Not yet specified» in `map-2.md`.

Manca: verifica di ogni automazione e di ogni passo del costruttore; elenco di quelle che mancano per un magazzino di qualsiasi prodotto; piano.

## 10. Icone sparite (segnalazione dello stesso giorno, prima)

Non riprodotta a server acceso (il server `:8082` era spento nella notte). Da ricontrollare nel piano di verifica.

## 11. Chat e Team tra operatori (risposta dell'utente a una domanda dell'orchestratore 3)

Alla proposta di nascondere Chat e Team (difetti P28 e P29), l'utente ha risposto:

- «Deve essere inserito nella pagina home, vicino all'icona di ricerca, magari accanto all'icona di chat. Devi capire come funzionano, perché così dovrà poter inviare, ricevere o gestire uno o più prodotti tra gli operatori. Lo stesso vale per le automazioni.»

Già registrato: P28, P29 (prova del 22). Manca: tutto il resto. Ticket 30, verifica in corso.

## Riepilogo: che cosa era registrato

| Punto | Registrato prima del 23 | Che cosa mancava |
| --- | --- | --- |
| 1 Scaffali | ticket 13-15, fette S1a-S3 | controllo del singolo prodotto, blocco, carrello delle grucce |
| 2 NFC e GS1 | NFC: ticket 16-18, N0 | GS1: tutto; interfacce nuove per entrambi |
| 3 Campi personalizzati | no | tutto |
| 4 Layout builder | no | tutto |
| 5 Selettori per categoria | no | tutto |
| 6 Import/export | link immagini: ticket 11 | corrispondenza delle colonne, crea campo, import immagini |
| 7 Più immagini | no | tutto |
| 8 Tasto Indietro | bozza ticket 21 | verifica completa |
| 9 Automazioni | in parte (prova del 22, difetti senza fetta) | verifica completa, automazioni e passi mancanti |
