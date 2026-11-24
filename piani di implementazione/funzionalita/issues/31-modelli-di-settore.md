# Modelli di settore modificabili, creabili e pulsante «Modello» in Aggiungi

Tipo: richiesta dell'utente (24 novembre 2026 mattina). Stato: **da fare**, piano pronto. Fetta: **MSET**, dopo MCAT. Collegato a [`25-campi-per-categoria.md`](25-campi-per-categoria.md) (MCAT) e [`24-modulo.md`](24-modulo.md) (MOD). Mappa: [`../map-3.md`](../map-3.md). Richieste del giorno: [`../richieste-utente-24-novembre.md`](../richieste-utente-24-novembre.md).

## Richiesta dell'utente

> «modelli di settore praticamente sono definiti e non sono configurabili e non si possono neanche aggiungere, né creare dei nuovi. In più devono essere con un bottone specifico nella pagina aggiungi, in modo che posso subito selezionare quale che voglio. Nel momento opportuno.»

## Stato di oggi

I 15 Modelli di settore sono fissi (`constants/sectorTemplates.ts`): si applicano, non si cambiano, non se ne creano. In Aggiungi non c'è un modo per sceglierne uno. MCAT porta «Parti da un modello» e «Salva come modello» per categoria.

## Piano (proposta dell'orchestratore, da confermare con l'esito)

1. **Schermata Modelli di settore modificabile**: aprire un modello e cambiarne i campi (aggiungere, togliere, rinominare, ordinare, obbligatori); rinominare, duplicare, eliminare; «+ Nuovo modello» da zero. I 15 pronti si modificano come copia nello spazio, con «Ripristina il modello originale»; non si eliminano, si nascondono.
2. **Pulsante «Modello» in Aggiungi**, in alto accanto alla categoria: scelto un modello, compaiono subito i suoi campi (quelli che mancano si creano); i valori già scritti restano, se uno sparirebbe prima la domanda. Poi «Usare sempre questo modello per <categoria>?» (Sì = come «Parti da un modello»; «Solo per questo prodotto»).
3. **Dati**: nessuna migrazione, `version` del layout resta 4; i modelli dell'utente in una chiave per spazio; cambiare un modello non cambia i moduli delle categorie che l'hanno già usato.

Fuori: modelli condivisi tra operatori (RETE2), import ed export dei modelli come file (proposta).

## Verifica

Jest `templates.test.ts` (crea, modifica, rinomina, duplica, elimina, ripristino, nascosto). Prova `prova/mset-modelli.cjs`. Collaudo **CF-B6** (nuovo), più CF-B2 e CF-B4. Foglio `prova/stili-mset.jpg`. Brief dell'esecutore: `side-session-notes/local_e2f2734a…/mset/brief.md`.

## Come si torna indietro

I modelli dell'utente stanno in una chiave a parte: togliendola tornano i 15 pronti; i moduli delle categorie non dipendono dal modello dopo l'applicazione.
