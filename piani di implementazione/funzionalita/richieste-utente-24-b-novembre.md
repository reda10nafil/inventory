# Richieste dell'utente del 24 novembre, secondo messaggio (circa 08:40)

Scritto all'orchestratore 4 dopo la pubblicazione di S1b e riportato dall'orchestratore 5. L'utente è molto scontento: dice che l'app sembra uguale a prima e che le funzioni nuove o non funzionano o sono bozze.

## Che cosa chiede

1. **Scaffali.** Così non vanno come li aveva chiesti. Ogni scaffale deve avere:
   - le misure: lunghezza, altezza e profondità;
   - il **peso massimo** che regge, oppure il **numero massimo di pezzi**.

   Servono a capire che scatole ci stanno e quante, o quanto peso porta lo scaffale. Devono funzionare con le automazioni, con i prodotti e con i **suggerimenti di altri scaffali**.

   Sono le fette S2 e S3, ticket 14 e 15: **tornano in cima**.
2. **NFC.** Così non va. Oggi «bisogna inserire un codice», e l'utente non capisce che cosa significhi.

   Il flusso NFC va reso ovvio: si avvicina il tag, l'app sa che cosa farne e non chiede codici senza spiegarli. È la fetta N1, ticket 16, 18 e 22, che va anticipata.
3. **«Accesso Multi-Utente».** Dentro ci sono due funzioni, e in più la **Chat**, nascosta lì per caso invece che in Home: non si sa se funziona. Sul collegamento degli operatori l'utente dice:
   - l'interfaccia non funziona e non si capisce come collegarsi;
   - non si vede se qualcuno è davvero collegato, se la connessione va, quanti sono online, da quanto e l'ultima volta online.

   La vuole semplice e moderna: oggi è una bozza datata. Mancano anche:
   - **registrazione del profilo**: foto, nome e dati dell'operatore;
   - un **amministratore** che gestisce i **permessi**;
   - nella **Cronologia**, **chi** ha fatto **che cosa** e **quando**.

   Tutto questo va nel ticket 32: Accesso, Rete del negozio, presenza online, profili, permessi e autore nella Cronologia. La Chat va in Home, con la fetta CHAT1.
4. **Mancano automazioni e tante altre funzioni**: FLU1, CON, FLU2, RIO e RES.
5. **Dove vedere l'app.**
   - L'utente non sa dove sia l'app e dice di averne due.
   - Voleva il lavoro salvato su **main** su GitHub e **una sola porta**, quella dell'app che si sta facendo.

   L'orchestratore 4 ha già portato `main` a `71b3e12` con un fast-forward da `funzioni/magazzino`, su richiesta esplicita dell'utente. D'ora in poi **dopo ogni fetta verificata si pubblica anche su `main`**, con un fast-forward da `funzioni/magazzino`.

   La sola app accesa è `http://localhost:8082`, servita dal worktree `inventory-stili`.
6. **Più lavoro in parallelo.** L'utente chiede di avviare più lavoro insieme e di dividerlo su più agenti, invece di una fetta alla volta.

## Che cosa cambia per l'orchestratore 5

- **Priorità**:
  1. Scaffali (S2, S3) e NFC (ETI → N1, con GS1 se serve a N1) insieme ai campi (EDC → MOD → MCAT → MSET), già in corso.
  2. Poi Accesso (ticket 32, con i requisiti qui sopra) e Chat in Home.
  3. Poi le automazioni (FLU1…).
- **Corsie parallele**: ogni corsia ha un suo worktree e un suo branch, con un server Metro su una porta sua (`APP=http://localhost:<porta>` in `prova/lib.cjs`). Le fette entrano in `funzioni/magazzino` e poi in `main` solo dopo la verifica dell'orchestratore. I conflitti sui documenti comuni (CRONOLOGIA, PASSAGGIO, `collaudo.cjs`, `stili-fette.cjs`) li risolve l'orchestratore quando unisce le corsie. Le corsie:
  - A: campi, già in corso nel worktree `inventory-stili`;
  - B: scaffali, S2 → S3;
  - C: codici e NFC, ETI → N1.
- **Una sola porta per l'utente**: `:8082`. Va detto all'utente in una riga, con la pagina «Lavori Syncro Flow». La pagina deve dire, per ogni funzione fatta, **dove si vede nell'app**, cioè quale schermata e quale tocco, perché l'utente dice di non vedere nulla.
