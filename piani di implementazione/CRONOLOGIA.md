# Cronologia aggiornabile

Registro progressivo. Aggiungere nuove voci in cima senza cancellare quelle vecchie. Specificare data, branch/SHA, file e servizi, prove con esito e ciò che resta aperto. Non segnare una funzione come verificata finché la prova non è stata svolta.

## 20 ottobre 2026 — Analisi e decisioni SaaS/backup

### Attività documentali completate

- Letti AGENTS.md, struttura del repository e documenti locali auth/cloud/offline-first.
- Interrogato Graphify; la query non ha restituito risultati e ha segnalato discrepanza di versione. JSON usato come fallback; grafo datato al commit bac43a2.
- Verificato GitHub: main a 7386308, feature a 73f6d3b, divergenza 27 commit di main e 4 esclusivi del feature; base comune 741f2b1.
- Tentato git status; errore “not a work tree”, quindi lo stato locale non è confermato.
- Verificato Supabase ID esatto ymsnlixracwjgajldryb: attivo/sano; migrazioni fino a 20261020084229_fix_inventory_snapshot_rls_helpers; 12 tabelle public con RLS attiva e zero righe; bucket organization-media privato; nessuna Edge Function o branch di sviluppo.
- Verificato Google Cloud syncro-flow-app-20261020 attivo, con Drive e Sheets API abilitate.
- Non trovati file .env.local reali; esempio Supabase combacia, variabili Google sono placeholder. OAuth, account e link Drive reale non verificati.
- Ricerca web via agent-reach/Exa: consultati Infor WMS, Oracle WMS, Itemra Docs. Ricerca aggiuntiva fermata al limite gratuito Exa.
- Nessun test, login, upload, modifica DB o scrittura cloud eseguiti.

### Decisioni dell'utente registrate

- RN v1 e Flutter v2 sono SaaS distinti con Google Cloud, Supabase, OAuth, archivi e backup separati.
- Backup selezionabile: giornaliero, settimanale, mensile o manuale, con prodotti, foto/documenti, CSV, PDF e cronologia.
- Accesso e recupero da telefono/computer con sincronizzazione verso gli altri telefoni autorizzati.
- Import mobile via file/condivisione e drag-drop dove supportato; esperienza browser con drag-and-drop.
- Prova Drive: autenticazione, prodotto sintetico con foto, export con link e controllo dal secondo dispositivo.

### Ancora da fare

- Ripristinare la verifica Git del workspace e scegliere la baseline corretta.
- Stabilire se il Supabase esistente è produzione o staging; predisporre ambiente test isolato.
- Configurare manualmente OAuth e fornire account/link Drive autorizzato per prova.
- Implementare le fasi elencate in PIANO_IMPLEMENTAZIONE.md solo dopo approvazione.
- Eseguire test A/B, backup/restore, Drive, import/export, offline/LAN e prove multi-dispositivo dopo l'approvazione.
- Chiarire destinazione/retention dei backup, uso rete mobile e processi WMS richiesti.

## Modello per le prossime voci

Per la prossima voce aggiungere in cima:

### AAAA-MM-GG — Attività

- Branch / SHA:
- Fatto:
- File e servizi:
- Verifiche e risultato:
- Problemi/rischi:
- Ancora da fare:

