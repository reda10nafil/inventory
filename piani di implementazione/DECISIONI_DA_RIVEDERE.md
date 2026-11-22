# Decisioni da rivedere

Scelte prese senza l'utente (notte 22 → 23 novembre 2026, regola 4 di `NOTTE_22_23.md`): l'opzione più semplice e reversibile. Una riga per decisione: cosa, perché, come si torna indietro.

| Data | Branch | Decisione | Perché | Come si torna indietro |
| --- | --- | --- | --- | --- |
| 22/11 | `ui-ux/stili` | Ordine del selettore Aspetto: Attuale rifinito (predefinito), Babilonia Vetro, Ishtar Lab, Ardesia e rame, Minimal | il predefinito per primo, poi l'ordine della tela | cambiare l'ordine delle chiavi di `THEMES` in `constants/themes/index.ts` |
| 22/11 | `ui-ux/stili` | Le icone nuove valgono ovunque per nome: `straighten` diventa `tape-measure` anche per la Larghezza in Aggiungi (la tela lì usa `arrow-expand-horizontal`) | l'icona viene dal campo salvato; cambiare i dati salvati non era nel lavoro | dare al campo Larghezza l'icona `width-wide` (che ora si disegna come `arrow-expand-horizontal`) in `contexts/CustomFieldsContext.tsx`, con una migrazione dei campi salvati |
| 22/11 | `ui-ux/stili` | Barra in basso: il contenuto delle schede non le passa sotto; dietro la barra sospesa (Babilonia, Ishtar) si vede lo sfondo dello stile, sfocato dal vetro | nessuna schermata deve cambiare i margini in fondo; meno rischi di contenuti coperti | `position: 'absolute'` nella barra (`src/navigation/TabBar.tsx`) e margine in fondo nelle 5 schede |
| 22/11 | `ui-ux/stili` | Titoli delle 4 sezioni predefinite del layout («DATI PRODOTTO»…) mostrati con l'iniziale maiuscola solo a schermo (`sectionLabel` in `contexts/LayoutContext.tsx`); i dati salvati restano | ritocco accettato senza toccare i dati dell'utente | togliere la mappa `DEFAULT_SECTION_LABELS` |
| 22/11 | `ui-ux/stili` | Barra di navigazione di Android: si cambia solo il colore dei pulsanti (chiari o scuri), non il fondo | con edge-to-edge attivo il fondo non si può colorare; la barra è trasparente sopra l'app | togliere `SystemBars` in `App.tsx` |
| 22/11 | `ui-ux/stili` | iOS senza i caratteri nuovi (vale il carattere di sistema) | l'app si prova su Android; su iOS servirebbe registrarli in Xcode e `Info.plist` | aggiungere i 14 TTF al progetto iOS |
