# NFC: pause e ritardi

Tipo: grilling + research (N0). Stato: **proposta dell'orchestratore, da confermare con l'utente** prima di N1. Fette: N1, N2. Dipende dal ticket 16.

## Question

Come si evita che lo stesso tag venga riletto subito dopo una scrittura, e quanto tempo passa tra un tag e l'altro?

## Proposta dell'orchestratore

- Una pressione di **«Leggi tag NFC» = una lettura**, con tempo limite e Annulla.
- Nelle automazioni c'è in più **«Leggi più tag»**: una serie avviata a mano che
  - si riarma dopo un **ritardo regolabile** (predefinito 1,5 s);
  - ignora lo stesso tag per una **pausa** (predefinita 3 s);
  - si ferma con Stop o dopo un minuto senza tag.
- **Dopo una scrittura** lo stesso tag viene ignorato per la pausa e non parte nessuna azione.
- I valori si regolano in Scanner & NFC e, se serve, per automazione.
- La logica di pausa, ritardo e «stesso tag» sta in funzioni pure con test jest; il resto si prova sul telefono.

## Ricerca N0 (ex 17r): zittire Android con l'app aperta

Con l'app aperta e nessuna lettura in corso, un tag con un link https fa aprire il browser ad Android.

Chiusa il 22 novembre sera, **non provata su un telefono**: tutto è letto dal sorgente della libreria o dedotto. Resoconto completo, con il disegno per N1 e N2 e le prove da fare sul telefono: [`ricerche/N0-nfc.md`](../ricerche/N0-nfc.md). In breve:

- **Consigliato: reader mode fisso come «silenziatore»**. `registerTagEvent` una volta all'avvio, con i flag delle tecnologie A, B, F, V e `FLAG_READER_NO_PLATFORM_SOUNDS`; nessun ascoltatore a riposo. Android consegna il tag all'app invece di aprire il browser, e l'app lo scarta. `react-native-nfc-manager` 3.17.2 lo supporta; `requestTechnology` riusa quella registrazione. Manifest e `MainActivity` non cambiano.
- **Non è un ascolto continuo**: a riposo non gira codice dell'app. Una lettura parte solo da un pulsante e finisce al primo tag, al tempo limite o ad Annulla.
- Regole: mai `unregisterTagEvent` con l'app in primo piano; mai `FLAG_READER_SKIP_NDEF_CHECK` nella registrazione fissa; riapplicare la registrazione quando l'NFC viene riacceso.
- **Rischi**: la libreria 3.x è dichiarata per la vecchia architettura e il progetto ha `newArchEnabled=true` (prima prova sul telefono: l'NFC funziona sulla build?); con l'app aperta il telefono non paga con Wallet; una gara interna alla libreria tra annullamento e tocco.
- **Difetto di oggi** (Scheda › Programma NFC): «Scrivi» parte dopo 500 ms, ma la pulizia del passo prima spegne l'NFC dopo 1000 ms, e il secondo passo resta appeso. In N1: una sola scrittura in un tocco.
- Logica pura in `utils/nfcGate.ts` con test jest; `utils/nfcService.ts` e `nfcService.web.ts`.

Decisioni per l'utente, una per volta prima di N1:

1. Con l'app aperta il telefono non paga con Wallet: va bene? Altrimenti resta il foreground dispatch, con il suono di sistema a ogni tag.
2. Programma NFC in un solo tocco al posto di «pulisci + scrivi».
3. La pausa dello stesso tag riparte a ogni riavvistamento (proposta) oppure è fissa.
4. Il minuto senza tag si conta solo sui tag accettati (proposta): un tag dimenticato sul telefono non tiene viva la serie.

## Come si torna indietro

Togliere «Leggi più tag»: resta la lettura singola. Il silenziatore, se c'è, è un interruttore.
