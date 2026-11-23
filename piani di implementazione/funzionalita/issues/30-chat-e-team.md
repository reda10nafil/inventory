# Chat e Team: prodotti e automazioni tra operatori

Tipo: grilling + research (verifica). Stato: **aperto**. La verifica in sola lettura è partita il 23 novembre 2026 mattina; il piano si scrive quando arriva il resoconto (`../ricerche/verifiche-23/verifica-chat-team.md`, difetti `CT01…`). Fetta: **CHAT** (forma da decidere). Mappa: [`../map-3.md`](../map-3.md).

## Question

Come devono funzionare Chat e Team perché gli operatori possano inviare, ricevere e gestire uno o più prodotti tra loro (e le automazioni), e dove si aprono?

## Richiesta e risposta dell'utente (23 novembre mattina)

Alla domanda «Chat e Team fanno parte del gestionale? (oggi: messaggi doppi, "Approva" sempre verso Vetrina, "Vendi" senza conferma né prezzo, NotFound ricaricando). Proposta: nasconderli per ora», l'utente ha risposto:

> «Deve essere inserito nella pagina home, vicino all'icona di ricerca, magari accanto all'icona di chat. Devi capire come funzionano, perché così dovrà poter inviare, ricevere o gestire uno o più prodotti tra gli operatori. Lo stesso vale per le automazioni.»

Quindi:
- Chat e Team **restano** e vanno resi utili (la proposta di nasconderli è scartata);
- l'accesso sta nella **Home, vicino all'icona di ricerca**;
- tra operatori si devono poter **inviare, ricevere e gestire uno o più prodotti**;
- **«lo stesso vale per le automazioni»**: da chiarire con l'utente dopo la verifica (condividere le automazioni tra operatori, oppure usarle per mandare e ricevere prodotti).

## Stato già noto (prima della verifica)

- P28 (prova del 22, riconfermato il 23 in `verifica-automazioni.md`): ogni messaggio compare due volte; «Approva» sposta sempre in `vetrina`; «Vendi» vende al primo tocco senza conferma né prezzo; lo storico ha la chiave `chat_messages`, senza lo spazio di lavoro; «Approva» dice 3/3 anche con un rifiuto (AU-V15); la card del prodotto nella Chat mostra `furType` così com'è (visto in C1).
- P29: «Host pronto» anche se la creazione fallisce; Team e Chat danno NotFound ricaricando (gli indirizzi si aggiungono in C2).
- La rete tra telefoni sincronizza la tabella WatermelonDB `automations`, ma il costruttore salva le automazioni in AsyncStorage: oggi non passano tra telefoni (dedotto).
- Il login è spento (`LOGIN_ENABLED = false`): senza cloud la rete del negozio è l'unico canale tra operatori.

## Piano

Da scrivere con il resoconto della verifica: flusso più semplice per mandare un prodotto o una quantità a un collega (trasferimento da approvare, richiesta, incarico), che cosa viaggia sulla rete e che cosa nel cloud (ticket 10 e 20), rischi di doppioni tra telefoni, prove con due telefoni.
