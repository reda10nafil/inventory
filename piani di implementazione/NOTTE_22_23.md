# Notte 22 → 23 novembre 2026: lavoro in autonomia su Syncro Flow

Scritto dalla sessione coordinatrice (local_5c439c03…) quando l'utente è andato a dormire. Vale per ogni sessione della famiglia che lavora su `D:\FurInventory Pro\inventory` stanotte.

## Cosa ha detto l'utente (parole sue, 22 novembre, tarda sera)

- «Hai carta bianca, anche perché io andrò a dormire, per cui prova a gestire tu tutto da solo. E prova anche a gestire le nuove sessioni. Quando vedi che una sessione diventa troppo grande, allora cambiala automaticamente.»
- «Tutte le richieste prova a gestirle tu stesso. Hai tutti i permessi di cui ti servono.»
- «Una volta finito il tema, vai a vedere le altre funzionalità e prova a migliorare l'app. […] prova a vedere le altre funzionalità se funzionano abbastanza bene, e poi prova a perfezionarle oppure aggiungere delle funzionalità.»
- «Dovrebbe servirci come gestionale per l'inventario e logistica, e non solamente sulle pellicce ma su qualsiasi tipo di prodotto di magazzino, per cui mancano tantissime funzionalità.»
- «Verifica che non ci siano errori da qualche parte a ogni task che fai, perché questa cosa è importante, il fatto che devi gestire le cose suddivise per task.»
- Regola già data: «il modo più giusto e corretto e semplificato».

## Regole per stanotte

1. **Per task**: ogni lavoro è un task piccolo con un risultato verificabile. Dopo ogni task: `npx tsc --noEmit`, `npx eslint .`, `npx jest@29.7.0 --config jest.config.js`, avvio web senza errori in console; per i task che cambiano codice dell'app anche il bundle Android (`npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output <scratch>/index.android.bundle`). Se qualcosa è rosso, si corregge prima del task successivo. Un commit per task, voce in `piani di implementazione/CRONOLOGIA.md`.
2. **Branch**: tema su `ui-ux/stili`; funzionalità su un branch nuovo `funzioni/magazzino` tagliato da `ui-ux/stili` quando il tema è chiuso. Push su GitHub autorizzato su questi branch (`git push origin HEAD:<branch>`; il repository è pubblico). **Mai su `main`**: niente merge e niente pull request, li decide l'utente domattina.
3. **Vincoli che restano**: login Google spento (`LOGIN_ENABLED = false`); non toccare `syncro_flow_flutter/` né `app/`; nessuna chiave API; nessuna generazione a pagamento (NodeTool, Vertex ecc.); niente cloud Supabase/Drive; nessun comando git distruttivo; il checkout principale `D:\FurInventory Pro\inventory` resta su `main` (si lavora in worktree).
4. **Decisioni che spetterebbero all'utente**: scegliere l'opzione più semplice e reversibile, procedere, e annotarla in `piani di implementazione/DECISIONI_DA_RIVEDERE.md` (una riga per decisione: cosa, perché, come si torna indietro). Domattina l'utente le rivede.
5. **Sessioni lunghe**: quando la conversazione si allunga (molti turni, output grandi, dopo un riassunto automatico), chiudere il task in corso, aggiornare `PASSAGGIO_UI_UX.md` (tema) o `piani di implementazione/funzionalita/PASSAGGIO.md` (funzionalità) e **avviare da sé** una sessione nuova con un brief completo che rimanda a questo file. Non aspettare la coordinatrice.
6. **Resoconti**: brevi, in italiano; i dettagli nei file.

## Ordine del lavoro

### A. Finire il tema (branch `ui-ux/stili`)

Da `piani di implementazione/ui-ux/grafo-lavori.md`, L4 → L9 (L8 non si fa). Sessione in corso: «Syncro Flow 5 stili: da L4 a L9» (local_f225ab1e…).

### B. Funzionalità (branch `funzioni/magazzino`, da `ui-ux/stili` a tema chiuso)

Cartella dei documenti: `piani di implementazione/funzionalita/`.

1. **Prova di ogni funzione** sul web con il campionario (`ui-ux/campionario/`): Inventario (filtri, cartelle, selezione multipla), Aggiungi, Scheda, Modifica, Cronologia, Cestino, Automazioni (Audit, Spostamento rapido, QuickTag, ScanSell, CustomRunner, AutomationFlow, builder), Impostazioni (Posizioni, Cartelle, Campi, Layout builder e modelli, Modelli di settore, GS1, Hardware, Condivisione, Team), Scanner e Azione rapida, import/export, stampa PDF/etichetta. Risultato: `funzionalita/prova-funzioni.md` con funziona / non funziona / non verificabile da qui (NFC, fotocamera, telefono).
2. **Correggere i difetti rimasti** di `ui-ux/difetti-trovati.md` (D02, D03, D12-D19, D21) e quelli trovati al punto 1, uno per task. D20 (codice morto) solo se la rimozione è sicura e verificata.
3. **Mappa Wayfinder «gestionale di magazzino e logistica per qualsiasi prodotto»** (procedura in `~/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/<versione>/skills/engineering/wayfinder/SKILL.md`, tracker locale in `funzionalita/`), con task-graph e dipendenze. Le domande per l'utente si decidono con la regola 4. Candidate da valutare (ordine per valore e semplicità, prima le fette piccole):
   - modelli di settore raggiungibili da Impostazioni (D13) e campi di base non legati alle pellicce, così l'app serve a qualsiasi prodotto;
   - quantità e unità di misura per prodotto, giacenza per posizione;
   - movimenti di magazzino (carico, scarico, trasferimento, rettifica) con causale, data e storico in Cronologia;
   - scorta minima e avvisi di riordino;
   - inventario fisico (conta) con differenze;
   - fornitori (e clienti) collegati ai prodotti;
   - lotti / numeri di serie / scadenze;
   - movimenti guidati dal codice a barre;
   - report ed export CSV di giacenze e movimenti.
   Ogni funzione nuova: dati locali (AsyncStorage come oggi, per spazio `:local`), migrazione dei dati esistenti senza perdite, test jest per la logica, stile del tema attivo.
4. Continuare finché c'è lavoro utile; mantenere sempre il branch verde e pubblicato.
