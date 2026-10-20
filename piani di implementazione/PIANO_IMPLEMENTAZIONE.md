# Piano di implementazione — Inventario, WMS e due SaaS

**Ultima verifica:** 20 ottobre 2026  
**Stato:** documentazione; nessuna modifica applicativa o prova funzionale svolta in questa sessione.  
**Repository:** reda10nafil/inventory.

## 1. Requisiti e decisioni dell'utente

- React Native v1 e Flutter v2 sono due prodotti SaaS autonomi. Devono avere progetti Google Cloud e Supabase distinti, credenziali OAuth, Storage e backup separati. Non assumere che i dati siano condivisi fra le due app.
- Ogni SaaS deve comunque isolare le diverse aziende/organizzazioni al suo interno.
- Backup configurabili: giornaliero, settimanale, mensile o solo manuale.
- Backup e archivio devono includere, secondo la configurazione, prodotti, foto/allegati, CSV, PDF e cronologia. L'utente deve poterli consultare, scaricare e ripristinare da telefono/computer e renderli disponibili agli altri telefoni autorizzati.
- La prova Drive parte da login, creazione di un prodotto di prova con foto, export dei dati con link alle foto e verifica da un secondo dispositivo.
- Import/export deve essere comodo anche da telefono. Oltre al drag-and-drop browser, prevedere selezione da Files/Download e condivisione da altre app; drag-and-drop touch solo dove il sistema operativo lo supporta.

## 2. Fatti verificati

### Repository

- Workspace locale: branch feature/auth-and-sync a 73f6d3b.
- Baseline GitHub verificata: main a [7386308](https://github.com/reda10nafil/inventory/commit/7386308a012806df9e28955d6cd1f995178499a4); feature/auth-and-sync a 73f6d3b.
- I branch divergono: main ha 27 commit non presenti nel feature e il feature ha 4 commit non presenti in main; base comune 741f2b1.
- Su richiesta dell'utente, i tre documenti sono stati pubblicati anche sul branch main; la sua nuova punta è 3c4ac042b3cd20bdc011c44237231c08ded1a85d.
- Dopo la pubblicazione iniziale, i documenti sono stati rimossi dalla punta feature/auth-and-sync su richiesta dell'utente; il branch ora è a b1b36d6ddff1daa73df718387506c1a9d608f474. Il checkout locale è rimasto a 73f6d3b perché il worktree Git locale non è riconosciuto correttamente.
- main live include modifiche in App.tsx, contexts/AuthContext.tsx, schermate Auth, context inventario tenant, media privati, sync LAN, backend-auth/google/driveApi.ts e utils/csv.ts. Include test automatici CSV e mesh auth, non eseguiti qui.
- git status non funziona nel workspace: “not a work tree”. Lo stato pulito/modificato non è verificabile. Non eseguire merge/commit locale basandosi su uno stato pulito presunto.
- La protezione branch di main risulta disabilitata al controllo.
- syncro_flow_flutter/ contiene schermate e storage locale; il pubspec.yaml consultato non dichiara client Supabase o Google Sign-In. README è ancora standard Flutter. Runtime non verificato.
- Il grafo Graphify non ha restituito il risultato della query; il fallback sul JSON ha mostrato 3.012 nodi/4.958 collegamenti, costruiti al commit bac43a2, quindi datati.

### Supabase e Google Cloud

- Supabase ID ymsnlixracwjgajldryb: corrispondenza esatta, nome syncro-flow, stato ACTIVE_HEALTHY, regione eu-west-1.
- Migrazioni registrate fino a 20261020084229_fix_inventory_snapshot_rls_helpers. I metadati mostrano 12 tabelle pubbliche, tutte con RLS attiva e zero righe; la correttezza delle policy non è stata testata fra due aziende.
- Bucket Storage organization-media esiste ed è privato. Nessun file è stato caricato o letto.
- Nessuna Edge Function o branch Supabase di sviluppo è elencato. Prima dei test sintetici A/B va predisposto un ambiente isolato.
- Google Cloud project syncro-flow-app-20261020: esistente e ACTIVE; API Drive e Sheets abilitate.
- Non ci sono file .env.local reali nel workspace. L'esempio Supabase contiene l'URL corretto; le variabili Google project/client, cartella Drive e spreadsheet sono placeholder. La CLI disponibile non esponeva il comando per elencare client OAuth. Consent screen, OAuth client, account autorizzato e link Drive reale non sono verificati.

### Documenti esistenti

- Baseline: [AUTH_SYNC_IMPLEMENTATION_BASELINE.md](../docs/audit/AUTH_SYNC_IMPLEMENTATION_BASELINE.md)
- Piano offline-first: [implementation_plan_timeline_offline_first.md](../docs/implementation_plan_timeline_offline_first.md)
- Piano auth/cloud: [implementation_plan_auth_cloud.md](../docs/implementation_plan_auth_cloud.md)
- Setup Google: [google-cloud-setup.md](../backend-auth/docs/google-cloud-setup.md)
- Il confronto remoto [BRANCH_COMPARISON_2026-10-20.md](https://github.com/reda10nafil/inventory/blob/main/docs/audit/BRANCH_COMPARISON_2026-10-20.md) descriveva main alle 07:40 UTC ed è superato dai commit successivi fino alle 08:43 UTC.

## 3. Ricerca WMS

La documentazione WMS consultata elenca normalmente ubicazioni, ricevimento, putaway/stoccaggio, movimenti, conteggi ciclici, replenishment, picking, packing/loading e tracciabilità. Usarla per una gap analysis, non come approvazione automatica di tutte le funzioni.

- [Infor WMS — overview](https://docs.infor.com/lncs/latest/en-us/lncslib/lncspov/wzu1564481459702.html): ricevimento, putaway, cycle count, replenishment, picking, packing e loading.
- [Oracle WMS Cloud — Implementation and Configuration Guide](https://docs.oracle.com/en/cloud/saas/warehouse-management/26b/owmim/implementation-and-configuration-guide.pdf): location master, receiving, putaway e inventory control.
- [Itemra Docs](https://docs.itemra.io/en): ubicazioni, stock movement ledger, ricezione, trasferimenti, conteggi e picking.

Prima di progettare un WMS completo confermare se servono lotti/seriali, ricezione merci, ordini/picking, packing e spedizione oltre all'inventario, posizioni, movimento e conteggio.

## 4. Piano ordinato

### Fase 0 — Baseline e ambiente sicuro

1. Risolvere il problema worktree e registrare eventuali modifiche locali.
2. Basarsi sul main live verificato; confrontare i quattro commit esclusivi feature e recuperare solo parti utili.
3. Aggiornare l'audit branch e riallineare il grafo.
4. Stabilire se il Supabase esistente è produzione o staging; predisporre ambiente/branch di test e dataset sintetico, senza scrivere dati di prova nell'ambiente incerto.

Verifica: SHA e stato Git tracciabili; ambiente test distinto da dati operativi.

### Fase 1 — Tenant, ruoli e sicurezza

1. Definire separazione per app SaaS e per azienda al suo interno.
2. Revisionare RLS, RPC, inviti e Storage già presenti; non considerare sufficiente il fatto che RLS sia abilitata.
3. Garantire isolamento di prodotti, cronologia, foto/documenti, export e backup.
4. Applicare ruoli owner/admin/operator/viewer lato backend.
5. Eseguire test sintetici aziende A/B su query, modifica, export, download e URL media/backup.

Aree: migrazioni backend-auth/supabase/, servizi sync/storage, tipi e Team UI.  
Criterio: A non può leggere, cambiare, esportare o ricevere link ai contenuti di B e viceversa.

### Fase 2 — React Native v1: OAuth, profili e audit

1. Completare auth nativa nella navigazione App.tsx/React Navigation.
2. Configurare OAuth e progetto Supabase dedicati a React Native v1.
3. Completare profilo con nome, cognome e foto.
4. Attribuire eventi a persona, ruolo, azienda, dispositivo e stato sync.
5. Verificare login, ripristino sessione, logout, inviti, revoca e ruoli.

Aree: contexts/AuthContext.tsx, src/screens/AuthScreen.tsx, src/screens/settings/TeamScreen.tsx, profili e operation/activity logs.  
Dipendenza: passaggi manuali Google Console, client OAuth e redirect/deep link.

### Fase 3 — Offline-first e pairing QR LAN

1. Mappare dati in WatermelonDB, AsyncStorage, context e cloud.
2. Garantire persistenza locale e outbox idempotente per ogni modifica.
3. Completare pairing QR, autorizzazione peer/azienda, handshake, ACK, retry, dedupe e recupero operazioni.
4. Aggiungere tombstone durevoli e riconciliazione al ritorno online; mostrare conflitti sullo stesso campo senza sovrascrittura silenziosa.
5. Valutare cifratura LAN. L'audit remoto segnala traffico in chiaro e conflitti/tombstone ancora da completare.

Aree: src/db/, src/services/meshAuth.ts, meshServer.ts, meshSync.ts, context inventario e timeline.  
Criterio: due telefoni senza Internet continuano a lavorare; al ritorno rete i dati sono sincronizzati e i conflitti sono risolvibili.

### Fase 4 — Backup configurabili e archivio consultabile

1. Impostazioni per backup giornaliero, settimanale, mensile o manuale.
2. Scelta del contenuto: prodotti/campi, foto/documenti, CSV, PDF, configurazioni e cronologia.
3. Lista in-app con data, contenuto, dimensione, ultimo esito, scarica e ripristina.
4. Copia cloud privata per ogni app e azienda, consultabile dai dispositivi autorizzati; download locale su telefono/computer.
5. Su mobile usare Files/Download, file picker e Share Sheet; su desktop download e cartella scelta dal browser. Mostrare chiaramente copia locale e copia sincronizzata, perché una cartella del singolo telefono non si sincronizza da sola.
6. Definire retention, cifratura, versioni, ripresa interruzioni e restore senza duplicati.
7. Valutare scheduler server-side per cadenze affidabili e job locali best-effort con stato esplicito.

Aree: servizi backup RN e Flutter separati, impostazioni, storage Supabase di ciascuna app, file picker/download.  
Criterio: cadenze e manuale funzionano; un secondo dispositivo autorizzato vede e ripristina; A/B e RN/Flutter non accedono ai backup altrui.

### Fase 5 — Prova Google Drive con foto

1. Configurare manualmente consent screen e client OAuth in Google Console, distinti per ciascun SaaS.
2. Decidere se Drive è archivio immagini oppure destinazione export; mantenere chiari i permessi e la fonte ufficiale della foto.
3. Dopo configurazione, autenticarsi, creare un prodotto sintetico con più foto, attendere upload/sync, esportare CSV/JSON e provare link da un secondo telefono.
4. Verificare link privato, account non autorizzato, token scaduto/revocato e reimport con immagini.

Aree: backend-auth/google/driveApi.ts, auth, utils/csv.ts, media e configurazione app.  
Stato attuale: API abilitate, OAuth/configurazione e link reale non provati. Nessun link era disponibile per questa analisi.

### Fase 6 — Import/export mobile e browser

1. Su telefono import da file picker, Files/Download e condivisione da altre app; drag-drop touch dove supportato.
2. Su browser React aggiungere zona drag-and-drop oltre al selettore.
3. Anteprima, mapping, validazione, duplicati e report importazione.
4. Conservare immagini multiple e campi personalizzati nell'export; usare link leggibili dal destinatario autorizzato.
5. Attribuire import/export a cronologia e tenant.

Aree: utils/csv.ts, schermate import/export, superficie web React.  
Criterio: export/reimport idempotente, immagini preservate e nessuna contaminazione cross-tenant.

### Fase 7 — Flutter v2 come SaaS indipendente

1. Definire identità prodotto, package ID e flussi.
2. Configurare un proprio progetto Supabase, Google Cloud, client OAuth, Storage e backup.
3. Implementare in Flutter login, ruoli, sincronizzazione, backup e gestione file con database locale proprio.
4. Verificare che token, URL, bucket e backup React non siano inclusi o usati da Flutter e viceversa.

Aree: syncro_flow_flutter/lib/, pubspec.yaml, configurazioni Android/iOS e progetti cloud separati.

### Fase 8 — Gap analysis WMS

Confrontare con i processi effettivi: articoli/unità, magazzini/ubicazioni, ricevimento, stoccaggio, trasferimenti, conteggi, picking, packing/spedizione, barcode e tracciabilità. Sviluppare soltanto i moduli approvati, con quantità, permessi, audit e modalità offline definiti.

## 5. Verifiche da eseguire dopo approvazione

- Unit: ruoli, CSV/JSON, immagini multiple, dedupe e merge.
- Integrazione: RLS aziende A/B, RPC, Storage privato, export e backup.
- OAuth: login nativo, callback, sessione, logout e revoca.
- Drive: prodotto di prova con foto, link nell'export, lettura da secondo telefono e rifiuto accesso non autorizzato.
- Backup: quattro modalità, errore/interruzione, retention, download, restore e sync tra telefoni.
- Offline/LAN: pairing QR, peer non autorizzato, ACK/retry, conflitti e riconnessione.
- Mobile/web: Files/Share/Downloads, drag-drop browser, anteprima e report.
- Flutter: backend, OAuth, Storage e backup isolati da RN.
- Regressione: scanner/barcode/NFC/GS1, posizioni, campi, automazioni, PDF e inventario.

Non usare il progetto Supabase esistente per prove che scrivono dati finché non è stato chiarito se è produzione e non esiste un ambiente isolato. Nessuno di questi test è stato eseguito in questa sessione.

## 6. Dipendenze e rischi

| Rischio | Risposta prevista |
|---|---|
| Git worktree non riconosciuto e branch divergenti | Sistemare/verificare il repository prima di commit o merge. |
| OAuth richiede configurazione manuale | Client distinti per prodotto, redirect validi, setup Console e sessione di prova. |
| Progetto Supabase senza branch di sviluppo | Chiarire ruolo del progetto e creare staging isolato prima di test mutativi. |
| RLS attiva ma non testata A/B | Testare query, RPC, file, export e backup con utenti/organizzazioni distinti. |
| Backup mobile in background non garantito | Scheduler server-side o stato best-effort esplicito all'utente. |
| Link immagine non accessibile fuori dal proprietario | Verificare accesso mediato e permessi dal secondo dispositivo; niente URL pubblici involontari. |
| Directory locale confusa con archivio sincronizzato | Mostrare posizione, ultimo sync e stato backup/restore. |
| WMS completo aumenta molto lo scope | Gap analysis e approvazione dei singoli processi logistici. |
| main non protetto | Stabilire controlli e criteri di rilascio prima di distribuire. |

## 7. Domande aperte

1. Il Supabase verificato è produzione, staging o progetto vuoto da destinare ai test?
2. Per ogni SaaS, vuoi backup cloud sempre su Supabase o anche/solo Drive? La cartella locale è una copia scaricabile oppure vuoi che sia la destinazione primaria?
3. Vuoi backup automatici solo su Wi-Fi o anche su rete mobile? Quale retention per giornaliero/settimanale/mensile?
4. Per WMS servono ricezione merci, lotti/seriali, ordini/picking, packing e spedizione, oltre a inventario, ubicazioni e conteggio?

