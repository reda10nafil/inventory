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

Con l'app aperta e nessuna lettura in corso, un tag con un link https fa aprire il browser ad Android. Va capito se `react-native-nfc-manager` permette di zittirlo (reader mode senza azioni) senza che diventi un ascolto continuo.

Avviata il 22 novembre sera, in sola lettura. L'esito va riportato qui. Qualunque «silenziatore» tiene il lettore NFC all'app mentre è aperta, anche se non fa nulla: rispetto a «mai ascolto continuo» la scelta spetta all'utente.

## Come si torna indietro

Togliere «Leggi più tag»: resta la lettura singola. Il silenziatore, se c'è, è un interruttore.
