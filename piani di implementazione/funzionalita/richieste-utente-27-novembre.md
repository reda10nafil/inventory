# Richieste dell'utente del 27 novembre 2026

Messaggio dell'utente del 27/11, riassunto per punti. Ogni blocco è grande e va mappato (Wayfinder) prima del codice.
Stato al 27/11: su main ci sono EDC (editor del campo in tre domande), il pulsante «Modello» con il modello Borse,
EXP/IMP e RETE0. L'utente dice che **campi personalizzati e Layout Builder non sono come li ha chiesti**.

## A. Campi personalizzati «intelligenti» (ticket 23, 24; EDC non basta)

- Per ogni campo l'utente sceglie **tipo di UI e comportamento**: picker, scorrimento laterale o verticale, menu a
  comparsa, scheda, pulsante cliccabile, **rotellina tipo orologio** per i numeri, menu a tendina (es. 3-4 taglie).
- Esempio misure: campo numero con intervallo (es. fino a 2 o 3 metri) e «picker veloce» a rotella per scegliere col
  dito in fretta.
- «Tutti i campi personalizzabili possibili»: tipo di controllo, tipo di pulsante, funzione.
- **Campo «codice»**: creare dal campo un QR o un codice a barre, personalizzabile (oggi è fisso e non modificabile).
- Da controllare per primo: in `utils/fieldValues.ts` esistono già gli aspetti `chips/wrap/list/dropdown/sheet/wheel`
  e `input: 'wheel'` per i numeri (EDC, 24/11). Capire sul telefono perché per l'utente «non c'è»: forse è nascosto,
  poco chiaro o incompleto (intervallo e passo della ruota, scheda, pulsante).

## B. Layout Builder (ticket 24, MOD)

- Dopo aver creato i campi, nel Layout Builder li sceglie e li **posiziona**: dove, a che altezza, che grandezza.
- L'utente dice che è stato trascurato. Il lavoro a metà su questo (scheda «Modulo», moduli per categoria) è sul
  branch locale `campi/wip-8dddc34` (39 file, non finito).

## C. Automazioni da WMS (ticket 29)

- Mancano moltissime automazioni; i passi che ci sono non sono aggiornati alle funzioni nuove (es. **scanner con
  NFC** nei passi).
- Aggiungere i passi tipici di un WMS: inventario e anagrafica (carico, scarico, trasferimento, conta, riordino, reso,
  ricevimento, spedizione…). Fette già scritte: FLU1, CON, FLU2, RIO, RES in `map-3.md`.

## D. Codici (ticket 22, GS1)

- Prodotti: deve esserci scritto **SKU**.
- Scaffali: manca il codice **BIN / LOC** (ubicazione); i codici di adesso sono sbagliati.
- **EAN** non c'è.

## E. Chat e condivisione (ticket 30, CHAT1, RIC1-3)

- La chat deve essere nella **Home** per gli operatori e funzionare; adattarla all'app.
- Condividere tra operatori: prodotti, automazioni, messaggi scritti, audio, foto, video.

## F. Accesso e sincronizzazione degli operatori (ticket 32, RETE1-2)

- Non funziona; **l'interfaccia è da rifare da zero**.
