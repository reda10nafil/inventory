# Mappa Wayfinder — Syncro Flow gestionale di magazzino e logistica per qualsiasi prodotto

Tracker locale (come la mappa UI/UX): questa mappa e un file per ticket in `issues/`. Aprire issue su GitHub è un'azione pubblica non autorizzata: si resta in locale.

## Destination

Un **grafo dei lavori** (`grafo-lavori.md`) pronto da eseguire, una fetta per task, che porta Syncro Flow da inventario di pellicce (un prodotto = un pezzo unico) a **gestionale di magazzino e logistica per qualsiasi prodotto**: categorie proprie, quantità e unità, giacenza per posizione, movimenti con causale nello storico, scorta minima e riordino, conta fisica, fornitori e clienti, movimenti col codice a barre, report CSV. I dati e il flusso di oggi (pezzo unico, venduto, spostato) restano validi senza perdite.

## Notes

- Richiesta dell'utente (22 novembre 2026, sera): «Dovrebbe servirci come gestionale per l'inventario e logistica, e non solamente sulle pellicce ma su qualsiasi tipo di prodotto di magazzino, per cui mancano tantissime funzionalità.» Regola: «il modo più giusto e corretto e semplificato».
- **Scostamento dalla procedura Wayfinder**: l'utente dorme e ha dato carta bianca (`NOTTE_22_23.md`, regola 4). I ticket qui sotto sono stati **decisi dall'agente** scegliendo l'opzione più semplice e reversibile; ogni decisione è riportata anche in `DECISIONI_DA_RIVEDERE.md`. Domattina l'utente può riaprire qualsiasi ticket: le fette che ne dipendono si fermano.
- Vincoli per ogni fetta: dati locali per spazio (`AsyncStorage`, chiavi `…:{org}`, oggi `local`); migrazione senza perdite (i dati vecchi si leggono come prima, nessuna riscrittura forzata); test jest per la logica; resa giusta nei 5 stili (ruoli del tema, mai colori scritti a mano); login Google spento; niente cloud.
- Stato dell'app all'inizio: prova delle funzioni in `prova-funzioni.md`; un prodotto ha `sku`, `furType` (lista fissa `FUR_TYPES` in `constants/config.ts`), una sola `location`, `status` available/sold/archived; lo storico è la Cronologia (`TimelineEvent`), sincronizzata come il resto.
- Mappa confermata il 22 novembre dopo le correzioni C01-C14 della prova (nessuna decisione cambiata; le correzioni preparano M03: tutti gli spostamenti passano da `moveProduct`, vendite e spostamenti rifiutano cestino e doppioni, le posizioni con prodotti non si eliminano). Rivista prima dopo il parere del revisore (22 novembre, notte): venduto solo per i pezzi unici, scritture e letture della posizione tutte da `stockOf`/`isAt` nello stesso commit, decimali, categorie e contatti fuori da `InventoryContext`.
- Esiti della prova che toccano la mappa: l'import CSV ricostruisce i prodotti campo per campo, quindi perderebbe `unit`, `stock` e `minStock` finché M08 non li aggiunge alle colonne; eliminare una posizione oggi lascia prodotti orfani (P08, corretto in C05 prima di M03, poi con `isAt` per la giacenza); vendita e spostamento passano tutti da `sellProduct` e `moveProduct` del contesto (Vendita flash, Azione rapida, Esecuzione, Chat), quindi l'instradamento di M03 li copre tutti. Le correzioni C01-C14 di `prova-funzioni.md` vengono prima delle fette M.
- Skill utili: `domain-modeling` (glossario), `tdd` (logica pura in `utils/` con test), `react-native-patterns`.

## Decisions so far

- [Modello delle quantità](issues/01-modello-quantita.md): pezzo unico (senza `stock`, come tutti i prodotti di oggi: nessuna riscrittura) o articolo a quantità (giacenza per posizione `stock`, unità, scorta minima); `stockOf` e `isAt` sono le sole letture.
- [Movimenti](issues/02-movimenti.md): carico, scarico, trasferimento e rettifica sono eventi di Cronologia di tipo `stock` con quantità, posizioni, causale e nota; la giacenza salvata e l'evento si scrivono insieme.
- [Venduto ed esaurito](issues/03-venduto-esaurito.md): «venduto» solo per i pezzi unici; per gli articoli a quantità la vendita è uno scarico con il prezzo nell'evento; «esaurito» è calcolato.
- [Categorie](issues/04-categorie.md): «Tipo di pelle» diventa «Categoria», con una lista modificabile per spazio (contesto proprio) che parte dai tipi di pelle di oggi. **Superato dal [ticket 19](issues/19-cartelle-categorie.md)** (`map-2.md`): le categorie sono le cartelle, «Tipo di pelle» torna un campo.
- [Scorta minima e riordino](issues/05-scorta-minima.md): avviso `low_stock` tra quelli esistenti (filtro Attenzione), più il filtro «Da riordinare».
- [Conta fisica](issues/06-conta-fisica.md): schermata nuova «Conta» per posizione; le differenze diventano rettifiche, scritte in una sola volta.
- [Fornitori e clienti](issues/07-contatti.md): anagrafica minima di contatti per spazio, collegata ai movimenti.
- [Codice a barre](issues/08-codice-a-barre.md): l'Azione rapida dello scanner aggiunge Carico e Scarico con quantità.
- [Report ed export](issues/09-report-csv.md): due CSV, giacenze e movimenti, con lo stesso meccanismo dell'export di oggi.
- [Sincronizzazione](issues/10-sincronizzazione.md): campi nuovi facoltativi nel JSON dei prodotti e nella Cronologia; nessun cambio a cloud, Drive e mesh finché il login è spento.

## Not yet specified

- Lotti, numeri di serie e scadenze: servono giacenze per lotto (FEFO, avvisi di scadenza). Dipende da come l'utente userà i movimenti; si specifica dopo che le fette 10-13 sono in uso.
- Documenti di trasporto, ordini a fornitore e ordini cliente (logistica in uscita): da capire con l'utente se servono e in che forma.
- Prezzi per unità e valore di magazzino (costo medio o ultimo costo).
- Più magazzini con posizioni annidate (magazzino › corsia › scaffale).
- Sincronizzazione delle giacenze tra più telefoni (mesh e cloud) quando il login tornerà acceso: conflitti sulle quantità.

## Out of scope

- Fatturazione, contabilità, IVA, pagamenti.
- App Flutter `syncro_flow_flutter/`, cartella `app/`, login e cloud.
- Ridisegno delle schermate esistenti oltre a ciò che le funzioni nuove richiedono.
