# Modulo (ex «Configura Layout Aggiungi»)

Tipo: grilling + research (verifica). Stato: **verificato** il 23 novembre 2026 mattina; **forma decisa dall'utente** (il layout builder diventa la scheda «Modulo» di Impostazioni › Campi). Fetta: **MOD**. Mappa: [`../map-3.md`](../map-3.md). Verifica completa: [`../ricerche/verifiche-23/verifica-campi-layout-selettori.md`](../ricerche/verifiche-23/verifica-campi-layout-selettori.md) §3 (difetti `CAM-L1…L12`).

## Question

Perché il layout builder «non funziona bene» e come deve funzionare?

## Richiesta dell'utente (23 novembre mattina)

> «Layout builder, stessa cosa, non funziona bene.»

Alla proposta «Impostazioni › Campi con due schede, "Campi" e "Modulo" con in alto la categoria; "Configura Layout Aggiungi" sparisce» la risposta è stata **«Sì, così»**.

## Stato verificato (sintesi)

- **P12 ancora aperto e peggiore** (CAM-L1, CAM-L2, provato): ogni azione del builder vale subito in Aggiungi senza «Salva» e sparisce alla ricarica; se nel frattempo si crea un campo o si applica un modello, le modifiche non salvate si salvano di nascosto (`appendToLayout` scrive il layout del momento).
- **Nascondere o togliere Posizione rende Aggiungi impossibile da salvare** (CAM-L3, provato) e nulla lo dice.
- La sezione nuova nasce in cima, sopra le foto, e si sposta un passo per tocco (~35 tocchi) (CAM-L4); la dimensione non vale per molti campi (CAM-L5); **Modifica non segue il layout** (CAM-L6: campi Base scritti nel codice, niente dimensioni né sezioni, ordine diverso); icona del builder non usata dalla Scheda (CAM-L7); occhio e X con effetti diversi senza spiegazione (CAM-L8); il titolo non dice che il modulo decide anche l'ordine della Scheda (CAM-L12).
- Modelli del builder: creano i campi e li mettono nel modulo (D12 chiuso), ma valgono per tutto lo spazio (CAM-L9) e tengono in silenzio i campi con lo stesso nome (CAM-L10): ticket 25.
- **Rischio**: alzare `version` del layout cancellerebbe il modulo dell'utente (`LayoutContext.tsx:122-127`, CAM-L11).

## Piano di implementazione (fetta MOD, dopo EDC)

1. **Prima di tutto** `LayoutContext`: il caricamento con una versione vecchia **migra** invece di sostituire (CAM-L11); `version` resta 4 (vincolo 1 della mappa).
2. La scheda **«Modulo»** in Impostazioni › Campi (la voce «Configura Layout Aggiungi» sparisce; l'indirizzo vecchio porta alla scheda Modulo). Lavora su una **bozza** (stato locale): il contesto cambia solo con «Salva»; «Annulla» e domanda uscendo con modifiche (P12, CAM-L1). `appendToLayout` parte dal layout **salvato** (CAM-L2).
3. Regole: Posizione sempre visibile (e gli altri obbligatori di sistema); SKU e Foto nascondibili ma non eliminabili (CAM-L3); un solo modo di togliere un campo dal modulo, «Nascondi», con il campo che resta nel registro (CAM-L8); sezione nuova in fondo o sotto la voce scelta, «Sposta in cima / in fondo / sotto la sezione…» (CAM-L4); dimensione proposta solo dove vale (testi, numeri, date, elenchi dal basso) (CAM-L5); «Ripristina il modulo predefinito».
4. **Anteprima** del modulo con lo stesso `FieldInput` di Aggiungi (fetta VAL).
5. **Modifica e Scheda seguono il modulo** (CAM-L6, CAM-L7): Modifica mostra in più i campi che il prodotto ha già (`editableFields`); icona del modulo usata anche nella Scheda.
6. File: `src/screens/settings/LayoutBuilderScreen.tsx` (diventa la scheda), `src/screens/settings/FieldsScreen.tsx` (le due schede), `contexts/LayoutContext.tsx`, `utils/layoutOrder.ts`, `AddScreen.tsx`, `EditScreen.tsx`, `DetailScreen.tsx`, `SettingsScreen.tsx` (voce), navigazione.

## Piano di verifica

- Jest: `layoutOrder.test.ts` (ordine, sezioni, campi nascosti, migrazione da una versione vecchia senza perdite).
- Prova nuova `prova/mod-modulo.cjs`: nascondere Peso senza salvare → Aggiungi invariata, domanda uscendo; creare un campo con una bozza aperta → il layout salvato non cambia; Posizione non nascondibile; sezione nuova in fondo; «Sposta sotto la sezione…»; Modifica con lo stesso ordine, le stesse sezioni e senza Peso nascosto; ricarica → tutto come salvato.
- Regressioni: `a2-layout.cjs` (gli attesi di P12 cambiano), `a2-campi.cjs`, `a2-aggiungi.cjs`, `a1-modifica.cjs`, `a1-scheda.cjs`, `c07-campi-modelli.cjs`, `c08-modifica-campi.cjs`, `controllo.sh`.
- 5 stili: `stili-mod.jpg` (scheda Modulo con l'anteprima).

## Come si torna indietro

La forma salvata del modulo non cambia (stessa chiave, `version` 4, proprietà nuove facoltative): rimettere la schermata di prima basta.
