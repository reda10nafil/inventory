# Esito A3 — Automazioni, Scanner, Azione rapida, Chat (web, 22 novembre 2026)

App web su http://localhost:8082, campionario di `seed.json`, browser pulito 375×812 per ogni scenario (`lib.cjs`). Gli script sono `a3-*.cjs` in questa cartella; si lanciano con `SHOTS="$TEMP/prova-funzioni" node a3-<nome>.cjs`. «Funziona» vuol dire che lo stato salvato in localStorage cambia come deve (prodotti, cronologia, automazioni).

**Lettura simulata.** Sul web la fotocamera non c'è: il lettore mostra «Nessun accesso alla fotocamera». L'unico inserimento manuale è nello Scanner. Per le altre schermate `a3-util.cjs › scan()` chiama il gestore che la schermata passa al lettore (`BarcodeScanner.onScan` o `CameraView.onBarcodeScanned`), come farebbe una lettura vera. Così si prova la logica dell'app dopo la lettura. La fotocamera in sé resta **non verificabile da qui**. Le righe con lettura simulata sono marcate «(sim.)».

| Funzione | Esito | Prova | Note (file:riga) |
| --- | --- | --- | --- |
| Scheda Automazioni: elenco template e automazioni personali | funziona | a3-builder-crea-esegui: card «Scarico Merci» in elenco dopo il salvataggio | |
| Spostamento rapido: scelta della posizione a mano | funziona | a3-batch-sposta: destinazione «Vetrina» | |
| Spostamento rapido: lettura prodotto (sim.) | funziona | a3-batch-sposta: PUZ-0012 da `stand_c` a `vetrina`, contatore «1 Spostati»; codice inesistente senza effetti | |
| Spostamento rapido: cronologia «spostato» (D15) | non funziona | a3-batch-sposta: nuovo evento `modified` «Posizione: stand_c → vetrina», nessun `moved` | D15 confermato. `BatchMoveScreen.tsx:146` usa `updateProduct`, non `moveProduct` |
| Spostamento rapido: lettura di una posizione cambia destinazione (sim.) | funziona | a3-batch-cambio-dest: conferma, destinazione «Magazzino» | |
| Spostamento rapido: posizione piena propone la successiva | funziona | a3-batch-piena: Vetrina capacità 1, conferma, destinazione «Stand A» | Propone la successiva in elenco, non «la più vicina» |
| Audit: scelta posizione, attesi e mancanti | funziona | a3-audit-intruso-sposta: Stand B, mancanti 1, trovati 0 | |
| Audit: capo atteso letto → trovato (sim.) | funziona | a3-audit-intruso-sposta: trovati 1, mancanti 0, 100% | |
| Audit: intruso «Aggiungi all'Audit» (sim.) | funziona | a3-audit-intruso-aggiungi: intrusi 1, PUZ-0012 resta in `stand_c`, nessun evento | |
| Audit: intruso «Sposta qui» (sim.) | funziona | a3-audit-intruso-sposta: VIS-0142 passa a `stand_b` | |
| Audit › Sposta qui: cronologia «spostato» (D15) | non funziona | a3-audit-intruso-sposta: evento `modified` «vetrina → stand_b» | D15 confermato. `AuditScreen.tsx:150` |
| Audit: percentuale di avanzamento | non funziona | a3-audit-intruso-sposta: tutti gli attesi trovati, un intruso → 50% | `AuditScreen.tsx:257` divide per un totale che include gli intrusi (la variabile giusta a :47 non è usata) |
| Audit: codice sconosciuto (sim.) | funziona | a3-audit-intruso-aggiungi: avviso «Prodotto sconosciuto», nessuna modifica | |
| Tagging di massa: tag comune (sim.) | funziona | a3-tag-comune: LIN-0021 note «[Da Pulire]», AST-0033 note esistenti + «[Da Pulire]», 2 eventi `modified` | Il tag è testo nelle note tecniche, non un campo |
| Tagging di massa: niente doppioni (sim.) | funziona | a3-tag-comune: seconda lettura di LIN-0021 non aggiunge nulla, contatore 2 | |
| Tagging di massa: tag personalizzato | funziona | a3-tag-personale: «[Collezione 2026]» su PUZ-0012 | |
| Vendita Flash: vendita con prezzo finale (sim.) | funziona | a3-vendita-flash: VIS-0098 `sold`, `soldAt`, `sellPrice` 3500 (proposto 3800), evento `sold` con `finalPrice` 3500 | |
| Vendita Flash: capo già venduto (sim.) | funziona | a3-vendita-flash: VOL-0087 → avviso «già venduto», nessun evento | |
| Vendita Flash: prezzo cancellato (sim.) | funziona | a3-vendita-flash-senza-prezzo: `sold`, `sellPrice` resta 1900 | Lo schermo però scrive «0 €» (difetto N12) |
| Vendita Flash: capo nel cestino (sim.) | non funziona | a3-cestino-vendita-flash: VIS-0098 con `deletedAt` viene venduto | `ScanSellScreen.tsx:40-47` non guarda `deletedAt` (N2) |
| Scanner: fotocamera vera | non verificabile da qui | Lo schermo mostra il riquadro; nel browser di prova non c'è fotocamera | Da provare su telefono |
| Scanner: inserimento manuale | funziona | a3-scanner-manuale-sposta: «vis-0142» in minuscolo apre l'Azione rapida, evento `scanned` | |
| Scanner: codice manuale sconosciuto | funziona | a3-scanner-manuale-sconosciuto: avviso, resta sullo Scanner | |
| Scanner: dopo la lettura riconosce prodotto, posizione, cartella, sconosciuto (sim.) | funziona | a3-scanner-lettura: PUZ-0012 → Azione rapida, `stand_a` → POSIZIONE, `pellicce` → CARTELLA, ZZZ-000 → avviso | Dalla fotocamera non nasce l'evento `scanned` (N11) |
| Scanner: QR «AUTO:» avvia l'automazione (sim.) | funziona | a3-runner-vendita-da-qr: si apre il runner di `auto_vendi` | |
| Scanner: Importa da galleria | non verificabile da qui | Serve scegliere un file e i servizi esterni | Manda l'immagine a `api.qrserver.com` e `zxing.org` (`utils/barcodeDecoder.ts:76`, `:108`), N16 |
| Scanner: flash | non verificabile da qui | Sul web non c'è torcia | |
| Azione rapida: Spostato | funziona | a3-scanner-manuale-sposta: VIS-0142 `vetrina` → `magazzino`, evento `moved` | |
| Azione rapida: Venduto con prezzo | funziona | a3-azione-vendi: LIN-0021 `sold`, `soldAt`, `sellPrice` 5500, evento `sold` | |
| Azione rapida: capo già venduto | non funziona | a3-azione-vendi-gia-venduto: VOL-0087 rivenduto, `soldAt` da 18/11 a oggi, secondo evento `sold` | `ScannerActionScreen.tsx:54-55` non controlla lo stato (N1) |
| Azione rapida › Posizione: Spostamento di massa e Audit | funziona | a3-azione-posizione: aprono le schermate | Chiedono di nuovo la posizione appena letta (N17) |
| Azione rapida › Cartella › Vedi prodotti (D14) | non funziona | a3-azione-cartella-D14: l'inventario mostra 6/6 capi, indirizzo senza `library` | D14 confermato. `compat.ts:17` intercetta `/(tabs)/?library=…` prima di :56. Con `/?library=pellicce` scritto a mano la Home filtra (3 capi) |
| Costruttore: controlli nome e step | funziona | a3-builder-crea-esegui: avvisi «Dai un nome…» e «Aggiungi almeno uno step» | |
| Costruttore: crea e salva | funziona | a3-builder-crea-esegui: `@furinventory_custom_automations:local` con 1 automazione, 3 step, `qrValue` «AUTO:…» | |
| Costruttore: modifica | funziona | a3-builder-modifica-elimina: nome cambiato in «auto_a rinominata» | |
| Eliminazione (cestino nella scheda, pressione lunga in elenco) | funziona | a3-builder-modifica-elimina: dopo le conferme l'elenco salvato si svuota | |
| Scheda automazione: mappa e QR | funziona | a3-builder-crea-esegui: il valore «AUTO:…» è sullo schermo | |
| Scheda automazione: Condividi | non verificabile da qui | Usa la condivisione di sistema; nel browser di prova non c'è | Un errore viene ignorato in silenzio (`AutomationFlowScreen.tsx:61`) |
| Esecuzione: lettura → tag → sposta in posizione fissa (sim.) | funziona | a3-builder-crea-esegui: VIS-0098 note «[Controllato]», posizione `sartoria`, eventi `modified` e `moved`, utilizzi 1, torna allo step 1 | |
| Esecuzione: vendita con conferma prezzo (sim.) | funziona | a3-runner-vendita-da-qr: AST-0033 `sold`, `sellPrice` 1300, evento `sold` | |
| Esecuzione: posizione letta, poi prodotti in fila (sim.) | funziona | a3-runner-posizione-letta: VIS-0142 e PUZ-0012 in `stand_b`, due `moved` | |
| Esecuzione: vendita a prezzo di catalogo (sim.) | funziona | a3-runner-campo-vendi: PUZ-0012 `sold`, `sellPrice` 1900 | |
| Esecuzione: «Imposta campo» (sim.) | non funziona | a3-runner-campo-vendi: note «[Stato=Controllato]», `customData` vuoto | `CustomRunnerScreen.tsx:241-249` scrive nelle note, non nel campo personalizzato (N4) |
| Esecuzione: automazione che non inizia con una lettura | non funziona | a3-runner-senza-lettura: «Sposta in: Vetrina, Step 1 di 1», nessun pulsante | `CustomRunnerScreen.tsx:373` mostra pulsanti solo per le letture; `executeAutoStep` (:69) non è mai chiamato (N3) |
| Esecuzione: contatore utilizzi | funziona | a3-builder-crea-esegui: `usageCount` 1 | Aperta da indirizzo o ricaricata non conta (a3-runner-posizione-letta: 0), N13 |
| Chat: si raggiunge? | funziona | a3-chat: Impostazioni › Accesso Multi-Utente › «Apri Chat Team (placeholder router.push)» | Nessun'altra voce porta alla chat |
| Chat: messaggio di testo | funziona | a3-chat: salvato in localStorage `chat_messages` | Compare due volte sullo schermo (N5) |
| Chat: card prodotti e «Approva spostamento» | funziona | a3-chat: «Approva Spostamento (3/3)» porta VIS-0142, LIN-0021, AST-0033 in `vetrina`, 3 eventi `moved` | Destinazione fissa e un evento «vetrina → vetrina» (N6) |
| Chat: «Vendi» dalla card | funziona | a3-chat: VIS-0142 `sold`, evento `sold` | Vende al primo tocco, senza conferma né prezzo (N7) |
| Chat: invio sulla rete locale (mesh) | non verificabile da qui | Serve un secondo dispositivo sulla LAN | |

Conteggio: 37 funzionano (17 di queste con lettura simulata), 8 non funzionano, 5 non verificabili da qui (fotocamera, galleria, flash, Condividi, mesh). La lettura con fotocamera vera resta da provare su telefono in tutte le schermate.

## Difetti nuovi

Comportamento, non estetica. In ordine di gravità.

1. **N1 — Si rivende un capo già venduto.** L'Azione rapida offre «Venduto» anche su un capo `sold`. Conferma: `soldAt` viene riscritto e nasce un secondo evento `sold`. `ScannerActionScreen.tsx:54-55`. `sellProduct` non controlla nulla (`contexts/InventoryContext.tsx:522`). Prova: a3-azione-vendi-gia-venduto.
2. **N2 — Si vende un capo che è nel cestino.** Vendita Flash vende VIS-0098 con `deletedAt`. Anche lo Scanner manuale lo apre in Azione rapida. Nessuno guarda `deletedAt`: `ScanSellScreen.tsx:40-47`, `ScannerScreen.tsx:133-136`, `getProductBySku` in `InventoryContext.tsx:583`. Prova: a3-cestino-*.
3. **N3 — Un'automazione che non inizia con una lettura resta bloccata.** Il costruttore la salva, ma l'esecuzione non ha pulsanti. `CustomRunnerScreen.tsx:373`. `executeAutoStep` (:69) è codice morto.
4. **N4 — «Imposta campo» non imposta il campo.** Scrive «[campo=valore]» nelle note tecniche. `CustomRunnerScreen.tsx:113-121` e `:241-249`.
5. **N7 — Chat: «Vendi» sulla card vende subito**, senza conferma e senza prezzo finale. `src/components/chat/HydratedProductCard.tsx:214-216`.
6. **N6 — Chat: «Approva spostamento» sposta sempre in `vetrina`.** Il valore è scritto nel codice (`ChatScreen.tsx:120`). Un capo già in vetrina riceve comunque un evento `moved` «vetrina → vetrina»: `moveProduct` non confronta le posizioni (`InventoryContext.tsx:494-519`).
7. **N5 — Chat: ogni messaggio compare due volte.** L'eco locale `notifyLocalChat` (`ChatScreen.tsx:81`, `:103`) arriva al proprio ascoltatore (`:54`) e aggiunge una copia «ricevuta». Vale anche per le card.
8. **N9 — Audit: la percentuale scende con gli intrusi.** Tutti gli attesi trovati più un intruso danno 50%. `AuditScreen.tsx:257`.
9. **N10 — Audit: l'esito non resta.** Niente riepilogo, niente evento in cronologia. Uscendo l'audit ricomincia da capo. `AuditScreen.tsx:36` (solo stato della schermata).
10. **N11 — Scanner: la lettura da fotocamera non registra l'evento `scanned`** né `lastScannedAt`. L'inserimento manuale sì. `ScannerScreen.tsx:48-64` contro `:142`.
11. **N12 — Vendita Flash senza prezzo:** lo schermo scrive «Venduto: … - 0 €» e il Totale aggiunge 0. Il prezzo di catalogo però resta salvato. `ScanSellScreen.tsx:79-80`.
12. **N13 — Esecuzione aperta da indirizzo o ricaricata:** l'utilizzo non viene contato, perché l'effetto parte prima del caricamento delle automazioni. `CustomRunnerScreen.tsx:57-59`.
13. **N8 — Chat: lo storico non è separato per spazio di lavoro.** La chiave è `chat_messages`, senza organizzazione. `ChatScreen.tsx:47`, `:70`.
14. **N16 — Importa da galleria manda la foto a servizi esterni** (`api.qrserver.com`, `zxing.org`). Senza internet non funziona e l'immagine esce dal dispositivo. `utils/barcodeDecoder.ts:76`, `:108`.
15. **N17 — Dall'Azione rapida di una posizione,** Spostamento di massa e Audit chiedono di nuovo la posizione appena letta. `ScannerActionScreen.tsx:97`, `:108` (lo dice anche il commento a :62-67).
16. **Da verificare su telefono — fotocamera dello Scanner sempre attiva.** Aprendo un'automazione dal QR, lo Scanner resta montato sotto con la sua `CameraView` (in prova la lettura simulata finiva sullo Scanner nascosto). Sul telefono una lettura potrebbe arrivare a due schermate. `ScannerScreen.tsx:276-280` non sospende la fotocamera quando la schermata perde il fuoco.
17. **Nota su D14.** Correggere solo l'ordine in `compat.ts` non basta: il ramo `/?library=` (:56) passa `library` al navigatore `(tabs)`, mentre la Home legge i parametri della schermata `index`. Serve `navigate('(tabs)', { screen: 'index', params: { library } })`. Ricavato dal codice, non provato.

Messaggio di console visto solo aprendo l'Azione rapida da indirizzo: «GO_BACK was not handled» dopo «OK». Nell'uso normale (si arriva dallo Scanner) c'è una schermata a cui tornare.
