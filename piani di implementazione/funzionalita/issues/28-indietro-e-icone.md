# Tasto Indietro in tutte le schermate, icone sparite

Tipo: research (verifica). Stato: **verificato** il 23 novembre 2026 mattina; piano proposto. Fette: **C2** (la freccia dopo un ricaricamento e gli indirizzi mancanti, ticket 21) e **IND** (il resto). Mappa: [`../map-3.md`](../map-3.md). Verifica completa: [`../ricerche/verifiche-23/verifica-indietro-icone.md`](../ricerche/verifiche-23/verifica-indietro-icone.md) (difetti `IND-1…IND-9` = §1.3, proposte `IND-P1…P9`), script in `../ricerche/verifiche-23/script/indietro/`.

## Question

Dove manca il tasto Indietro, perché, e che cosa succede alle icone?

## Richiesta dell'utente (23 novembre mattina)

> «Il tasto indietro nelle pagine è scomparso.»

E, prima, nello stesso giorno: le icone sparite.

## Stato verificato (sintesi)

- **Nessuna schermata ha perso la freccia nel codice** (`git log -S`). Manca in quattro casi:
  1. aprendo o ricaricando un indirizzo interno (11 schermate con intestazione nativa): lo stack ha una sola schermata (IND-1, provato); lì frecce, X, «Salva» e «OK» danno `GO_BACK` e non fanno nulla (IND-2) → **C2**;
  2. lo Scanner, che non l'ha mai avuta (IND-3) → IND;
  3. Team, Chat e Crea automazione ricaricando danno «Page Not Found» (IND-4 = P29, AU-V11) → **C2**;
  4. con il server di sviluppo spento la freccia del web è un'immagine che non arriva (IND-9; su Android la disegna il sistema).
- Altri: «Vedi prodotti» e «Return Home» aggiungono una seconda barra delle schede invece di tornare a quella che c'è (IND-5, `compat.ts`); **nella Conta il tasto Indietro di sistema esce senza conferma e perde le quantità scritte** (IND-6; su Android letto nel codice: nessun `BackHandler`, `usePreventRemove` o `beforeRemove`); Scheda e Modifica con un id inesistente mostrano solo «Prodotto non trovato» senza pulsante (IND-7); la freccia nativa si legge «(tabs), back» col lettore di schermo (IND-8).
- **Icone**: nessun nome sbagliato nel codice né nel campionario; con il server acceso si caricano tutte. La segnalazione del 23 **non è riprodotta**: le icone spariscono solo se, mentre la pagina si carica, i caratteri delle icone falliscono o tardano più di 6 s, e allora l'app non si riprende da sola (serve ricaricare). È un fatto del server di sviluppo sul web; sull'APK i caratteri sono dentro l'app (dedotto).
- **LokiJS**: il messaggio «Deleting database failed because it's blocked» è innocuo e compare solo se la pagina si ricarica mentre il database si prepara.

## Decisioni (proposte dell'orchestratore)

- Dopo un ricaricamento o un link la freccia torna alla **scheda madre** (Impostazioni, Automazioni), non alla Home (C2, ticket 21).
- Conta: il tasto Indietro di sistema **torna al passo precedente**, come la freccia a video; dal primo passo, con quantità scritte, chiede «Uscire dalla conta? Le quantità scritte si perdono».
- Icone: nessuna modifica al codice; il collaudo le controlla su ogni schermata principale e sull'APK in modalità aereo.

## Piano di implementazione

- **C2** (ticket 21, **fatta** il 23 novembre): `initialRouteName: '(tabs)'` con la scheda madre in `linking.ts` (IND-P1) e i tre indirizzi mancanti (IND-P2); in più IND-P3 (sotto).
- **IND** (dopo C2):
  1. ~~`compat.ts`: `(tabs)` con `popTo` invece di `navigate`, così non nasce una seconda barra (IND-P3, IND-5); il parametro `library` deve arrivare alla Home filtrata.~~ **Fatto in C2** (23 novembre): con il solo IND-P1 «Return Home» e «Vedi prodotti» aperti da un indirizzo montavano due barre delle schede (su `4674fbc` una); `push('/(tabs)')` usa `StackActions.popTo`, provato da `prova/c2-indietro.cjs` (`c2-ind-vedi-prodotti`, `c2-ind-notfound`: una barra, Scanner e Azione rapida smontati, Home filtrata su Pellicce). Riga in `DECISIONI_DA_RIVEDERE.md`.
  2. `ScannerScreen.tsx`: X in alto che torna da dove si era (IND-P4, IND-3).
  3. `CountScreen.tsx`: `usePreventRemove` per il tasto di sistema (IND-P5, IND-6), come deciso sopra.
  4. `DetailScreen.tsx` ed `EditScreen.tsx`: «Prodotto non trovato» con «Torna all'inventario» (IND-P6, IND-7).
  5. `RootNavigator.tsx`: `headerBackTitle: 'Indietro'` nelle `screenOptions` (IND-P7, IND-8).
  6. Facoltativo: `require` di `src/db` rimandato in `HydratedProductCard.tsx` per il messaggio di LokiJS (IND-P9).
  7. Per il login futuro (L1): `filter` per `auth/callback` in `linking.ts` (IND-P8), annotato nel ticket 20.

## Piano di verifica

- **C2**: vedi ticket 21 (`c2-indietro.cjs` e tutta la cartella `prova/`).
- **IND**: prova nuova `prova/ind-indietro.cjs` (resoconto, «Come si proverebbe» 5-9; i punti 6 e 7, «Vedi prodotti» e «Return Home», sono già in `c2-indietro.cjs`): X dello Scanner → Automazioni; Conta › Magazzino › scrivi 3 › `page.goBack()` → si resta in Conta, al passo precedente; `product/inesistente` → pulsante «Torna all'inventario». Regressioni: `a3-scanner.cjs`, `m07-conta.cjs`, `m09-azione.cjs`, `a1-modifica.cjs`, `a4-esplora.cjs`, `controllo.sh`.
- **Icone**: passo del collaudo (`collaudo-finale.md`, gruppo A): glifi presenti su ogni schermata principale nei 5 stili (`d-icone.cjs` e `icone-nomi.cjs` in `ricerche/verifiche-23/script/indietro/`).
- **Telefono**: Impostazioni › Categorie, freccia e tasto di sistema tornano a Impostazioni; link `syncroflow://settings/folders` ad app chiusa (con la freccia; il primo Indietro non chiude l'app); Conta col tasto di sistema; finestre (Movimenta, QR, foto a tutto schermo, inserimento del codice) che si chiudono col tasto di sistema lasciando la schermata sotto; icone e freccia su un APK di release in modalità aereo.

## Come si torna indietro

Ogni punto è una riga o un blocco piccolo, indipendente dagli altri; nessun dato coinvolto.
