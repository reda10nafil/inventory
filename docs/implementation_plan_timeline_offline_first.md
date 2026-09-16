# Synchroflow — Piano di continuità: Cronologia, conflitti, offline-first e team

> Documento per continuare l'implementazione in una nuova sessione senza perdere decisioni, stato, bug rilevati e priorità.

## 1. Repository e branch

- Repository: `reda10nafil/inventory`
- Branch di lavoro: `feature/auth-and-sync`
- Non fare merge diretto in `main` fino al completamento dei test di auth, inviti, RLS, backup immagini e sync su due dispositivi.
- App da modificare: React Native nativa (React Navigation), non Expo Router.

## 2. Architettura reale rilevata

- Entrypoint: `App.tsx`.
- Navigazione: `src/navigation/RootNavigator.tsx`, `src/navigation/TabsNavigator.tsx`, `src/navigation/compat.ts`, `src/navigation/linking.ts`.
- Schermate native: `src/screens/`.
- Provider/stato esistente: `contexts/InventoryContext.tsx`, `LocationsContext.tsx`, `CustomFieldsContext.tsx`, `LayoutContext.tsx`, `AutomationsContext.tsx`, `GS1ConfigContext.tsx`, `HardwareConfigContext.tsx`.
- Dati correnti: molti context usano AsyncStorage; esiste anche `src/db/` con WatermelonDB/sync parziale.
- Team/chat/mesh LAN esistenti: sono da considerare incompleti e non affidabili; non preservare il comportamento attuale come funzionalità valida, ma sostituirlo gradualmente.
- Modello prodotto attuale: include `images` come array; non ridurre a un solo `image_url`.

## 3. Stato già effettuato

### Git

Nel branch sono già presenti commit che hanno aggiunto documentazione e primi file sperimentali:

- `3411a65c14fc830f4108930ef1a0ac2d9cc131e2`: primi file auth/export/import. ATTENZIONE: diversi file di questo commit usano Expo Router o `localStorage`; non integrarli così come sono nell'app nativa. Devono essere sostituiti/rifattorizzati in `src/`.
- `b46c3da19eb0b78b2e789bd958cb1910defb8355`: piano auth/cloud/inviti.

### Supabase

Progetto corretto: `syncro-flow`, project ID `ymsnlixracwjgajldryb`, regione `eu-west-1`.

Migrazione già applicata:

- `create_organization_membership_and_invitation_foundation`

Tabelle nuove create:

- `profiles`
- `organizations`
- `organization_members`
- `invitations`
- `activity_logs`

Tipi enum creati:

- `organization_role`: `owner`, `admin`, `operator`, `viewer`
- `invitation_status`: `pending`, `accepted`, `revoked`, `expired`

Le nuove tabelle hanno RLS abilitata. Non cancellare le vecchie tabelle in questa fase.

## 4. Bug e rischi rilevati

### Critici

1. Le tabelle legacy `public.users`, `public.operators`, `public.products` e `public.sync_logs` hanno RLS disabilitata, pur avendo policy create. Non esporre l'app cloud a utenti reali finché la migrazione dei dati e le policy per organizzazione non saranno completate.
2. Le funzioni `is_organization_member` e `has_organization_role` sono `SECURITY DEFINER`; correggere i permessi in modo che il ruolo `anon` non possa eseguirle direttamente. Conservare il funzionamento necessario alle policy RLS.
3. Il primo codice auth nel branch usa una struttura Expo Router, mentre l'app attiva usa React Navigation nativo.
4. Il primo codice auth usa `localStorage`, incompatibile con Android/iOS React Native.
5. Non inserire mai `SUPABASE_SERVICE_ROLE_KEY`, OAuth client secret o token di operatori nell'APK, repository o file `.env` committati.

### Cronologia

Dalla schermata attuale emerge:

- Eventi duplicati: `VIS-001-2024 - Spostato: vetrina → vetrina` compare tre volte allo stesso minuto.
- Movimento non valido: una modifica da una posizione verso la stessa posizione non deve generare una timeline entry.
- Card senza operatore, dispositivo, stato di sync, ID operazione o dettaglio prima/dopo.
- La cronologia non può ancora essere usata per determinare con affidabilità l'ordine globale delle operazioni provenienti da più telefoni.

### Mesh/chat

- La connessione tra telefoni e la chat non sono considerate funzionanti.
- Non dichiarare sync LAN o chat "reale" finché non esistono discovery, handshake, autorizzazione, scambio messaggi/operazioni, retry e test su due dispositivi.

## 5. Decisione prodotto: account e inviti

Modello richiesto: stile Netflix/Team.

- Un proprietario crea un'organizzazione e l'inventario condiviso.
- Ogni operatore usa il proprio account Google e il proprio telefono.
- Non condividere password o account Google del proprietario.
- Il proprietario crea un invito QR/link monouso e con scadenza.
- L'invitato apre il QR/link, effettua login Google e viene aggiunto come membro dell'organizzazione proprietaria.
- Ruoli iniziali: owner, admin, operator, viewer.
- Nelle Impostazioni creare la schermata `Team e accesso`, con membri, ruoli, inviti, QR, revoca, dispositivi e stato sync.
- All'avvio app: `Accedi con Google`, `Crea account proprietario`, `Accedi con invito`.

## 6. Decisione prodotto: offline-first

L'app deve funzionare in magazzini senza Internet, aree sotterranee e reti instabili.

Principio: local-first / offline-first.

```text
Azione utente
  -> transazione database locale
  -> operation log locale immutabile
  -> aggiornamento UI immediato
  -> invio LAN se peer autorizzati sono disponibili
  -> invio cloud Supabase quando Internet torna disponibile
  -> conferma, merge o conflitto
```

Il database locale deve diventare la fonte immediata per l'interfaccia. AsyncStorage può restare per piccole preferenze, ma non deve essere l'unica persistenza dell'inventario multiutente.

Entità locali/cloud da modellare: prodotti, immagini, posizioni, cartelle, campi personalizzati, layout, automazioni, messaggi chat, membri, inviti accettati, operazioni pendenti, timeline/activity log, conflitti.

## 7. Cronologia come registro operativo

La cronologia deve essere un activity/event log, non solo una UI.

Ogni azione genera un evento immutabile con:

```ts
interface OperationEvent {
  operationId: string;
  organizationId: string;
  entityType: 'product' | 'location' | 'folder' | 'automation' | 'member' | 'chat_message';
  entityId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actorId: string;
  actorName: string;
  deviceId: string;
  deviceName: string | null;
  localOccurredAt: string;
  serverReceivedAt: string | null;
  baseVersion: number;
  resultVersion: number;
  syncStatus: 'local' | 'lan_sent' | 'cloud_synced' | 'conflict' | 'failed';
  idempotencyKey: string;
}
```

Eventi minimi:

- `product.created`, `product.updated`, `product.moved`, `product.sold`, `product.deleted`, `product.restored`
- `product.image_added`, `product.image_removed`, `product.imported`, `product.exported`
- `inventory.audit_started`, `inventory.audit_completed`
- `automation.started`, `automation.step_completed`, `automation.failed`
- `member.invited`, `member.joined`, `member.role_changed`, `member.removed`
- `sync.sent_lan`, `sync.synced_cloud`, `sync.conflict_detected`, `sync.conflict_resolved`
- `chat.message_sent`, `chat.message_received`

Regola anti-duplicazione:

- Ogni evento deve avere `operationId` e `idempotencyKey` univoci.
- Il client e il server devono ignorare lo stesso `operationId` se ricevuto più volte.
- Un movimento con `fromLocation === toLocation` non deve generare evento.
- Il client non deve creare un evento se non cambia nessun dato significativo.

UI Cronologia da implementare:

- Nome/avatar operatore.
- Nome dispositivo.
- Descrizione leggibile con valori prima/dopo.
- Stato sync: locale, LAN, cloud, conflitto, errore.
- Filtri per operatore, prodotto, azione, data, posizione e stato.
- Dettaglio evento e collegamento al prodotto.
- Sezione owner/admin `Conflitti da risolvere`.

## 8. Conflitti

Non sovrascrivere dati silenziosamente.

### Merge automatico

Unire automaticamente solo modifiche indipendenti. Esempio:

- Anna sposta il prodotto da A1 a B3.
- Luca offline aggiorna il prezzo.
- Risultato: posizione B3 + prezzo aggiornato, due eventi distinti.

### Conflitto manuale

Se due operatori modificano lo stesso campo della stessa versione base:

- conservare entrambe le operazioni;
- segnare il record `needs_review` o una specifica voce conflitto;
- notificare owner/admin;
- mostrare valore precedente, proposta A, proposta B, autori, telefoni e orari;
- la decisione genera `sync.conflict_resolved`, senza cancellare la storia.

### Blocchi per conflitti primari

Per operazioni ad alto rischio, applicare lock/lease temporaneo e validazione server:

- vendita del prodotto;
- eliminazione definitiva;
- trasferimento di massa;
- chiusura inventario/audit;
- modifica di permessi e ruoli;
- accettazione/revoca inviti.

Il lock deve avere scadenza, mostrare chi sta lavorando e non bloccare per sempre se un telefono perde connessione. Offline, le azioni vengono poste in coda e richiedono conferma/conflitto al riallineamento se necessario.

## 9. Rete LAN e chat: riscrittura

Obiettivo: peer sync reale in Wi-Fi locale quando non c'è Internet.

Componenti richiesti:

1. Identità persistente del dispositivo.
2. Discovery peer con mDNS e/o QR pairing.
3. Handshake autenticato: organizzazione, utente, dispositivo e token di sessione verificati.
4. Connessione reale WebSocket/TCP con protocollo di messaggi versionato.
5. Scambio di `OperationEvent` e ACK, non semplice copia dello stato UI.
6. Dedupe tramite `operationId`/`idempotencyKey`.
7. Retry, rilevamento disconnessione, riconnessione e recupero eventi mancanti.
8. Messaggi chat offline nella stessa coda operazioni.
9. Crittografia in transito quando supportata dalla rete/configurazione.
10. Test con due Android reali o emulatori su rete locale.

Non chiamare "mesh" una UI di dispositivi o un broadcast senza questi elementi.

## 10. Immagini, backup e import

### Immagini

- Il modello prodotto usa array `images`.
- Non esportare una sola `image_url`.
- Dopo il caricamento cloud, ogni immagine deve avere path/URL cloud stabile, mime type, ordine e metadati.
- URI locali `file://` non possono essere usati come backup per un altro telefono.
- Usare accesso privato e URL firmati dove necessario; non rendere le immagini pubbliche automaticamente.

### CSV

Usare `images_json` e `custom_data_json` correttamente escapati:

```csv
id,sku,fur_type,location,status,images_json,custom_data_json
"uuid","VIS-001-2024","visone","vetrina","available","[\"storage/path/a.jpg\",\"storage/path/b.jpg\"]","{\"taglia\":\"42\"}"
```

Import:

- Anteprima e validazione prima di scrivere.
- Parser CSV robusto per virgolette e JSON.
- Upsert/idempotenza per non duplicare dati.
- Report record creati, aggiornati, ignorati e falliti.
- Ricostruzione completa dell'array immagini.

Mobile:

- File picker e Share Sheet, non un finto drag & drop.
- Drag & drop reale solo per una futura interfaccia web.

## 11. Fasi di lavoro rimanenti

### Fase A — Hardening immediato

1. Revocare accesso anonimo alle funzioni `SECURITY DEFINER` nuove.
2. Non attivare RLS sulle tabelle legacy finché non esiste migrazione completa e testata.
3. Eseguire nuovo security advisor dopo ogni migration.

### Fase B — Correzione integrazione React Native

1. Creare moduli in `src/auth/`, `src/services/`, `src/screens/auth/`.
2. Non usare come soluzione finale i file Expo Router aggiunti nel primo commit.
3. Usare storage nativo appropriato: sessione Supabase con AsyncStorage/adapter appropriato; credenziali sensibili in secure storage/keychain se necessario.
4. Aggiungere `AuthGate` nel flusso React Navigation.
5. Aggiungere route/tipi/deep link per login, owner setup, invito, team, backup e conflitti.

### Fase C — Backend organizzazioni e inviti

1. Creare Edge Functions per creare organizzazione, creare invito, accettare invito, revocare invito e rimuovere membro.
2. Inserire owner e membership in una singola transazione server-side.
3. Applicare policy RLS per owner/admin/operator/viewer.
4. Aggiungere `organization_id`, autore e versione alle entità inventario.
5. Generare TypeScript types dal progetto Supabase reale.

### Fase D — Team e accesso UI

1. Login Google.
2. Owner onboarding.
3. Invite acceptance via QR/deep link.
4. `Team e accesso` nelle Impostazioni.
5. Cambio organizzazione e profilo.
6. Logout/sessione scaduta/errori OAuth.

### Fase E — Offline data e operazioni

1. Definire schema locale robusto e migrazione dei dati AsyncStorage esistenti.
2. Creare outbox/inbox/operation log.
3. Aggiornare `InventoryContext` e gli altri provider senza rompere scanner, NFC, automazioni, posizioni o campi.
4. Collegare activity log/timeline a ogni mutation.
5. Gestire conflitti e locks per operazioni primarie.

### Fase F — Sync cloud, LAN e chat

1. Sync cloud Supabase con pull/push e cursor.
2. Realtime filtrato per organizzazione.
3. Nuovo protocollo LAN e discovery/handshake.
4. Chat reale basata su eventi persistiti e sincronizzabili.
5. Monitor sync e diagnostica in app.

### Fase G — Immagini e backup

1. Upload cloud immagini/documenti.
2. Retry offline upload.
3. Backup/import CSV/JSON completo con immagini multiple.
4. Backup di layout, campi, automazioni, cartelle e posizioni.

### Fase H — Audit completo e miglioramenti

Analizzare e correggere ogni schermata/funzione:

- Home, ricerca, filtri, selezione multipla, prodotto.
- Scanner QR/barcode, NFC e GS1.
- Cartelle e posizioni.
- Timeline/activity log.
- Team, chat e sync.
- Layout Builder: drag gesture reale, preview live, regole condizionali, template.
- Campi personalizzati: validazioni, tipi nativi, formule, sorgenti dinamiche.
- Automazioni: nuovi step, retry, approvazioni, notifiche, condizioni, audit.
- Cestino, restore, condivisione e PDF.

## 12. Test di accettazione prima del merge

- TypeScript e lint senza nuovi errori.
- Login owner con Google.
- Creazione invito e ingresso operatore da secondo telefono.
- RLS: un utente non autorizzato non legge dati altra organizzazione.
- Due operatori modificano dati indipendenti: merge corretto.
- Due operatori modificano stesso campo: conflitto visibile e risolvibile.
- Offline: aggiunta prodotto/foto/movimento funziona senza Internet.
- LAN: due telefoni autorizzati scambiano eventi con ACK.
- Cloud: operazioni offline si sincronizzano dopo riconnessione.
- CSV: export/import conserva `images_json` completo e non crea duplicati.
- Chat: messaggio offline viene inviato/sincronizzato quando possibile.

## 13. Regole operative per chi continua

- Leggere prima questo file e `docs/implementation_plan_auth_cloud.md`.
- Ispezionare codice esistente prima di sovrascrivere provider/navigazione.
- Ogni scrittura GitHub, migration Supabase o deploy Edge Function richiede conferma esplicita utente.
- Fare commit piccoli, descrittivi e verificabili.
- Dopo ogni migration eseguire Supabase security advisor.
- Non promettere test su dispositivi reali senza averli eseguiti.
- Non definire la app "perfetta" prima dei test end-to-end su rete, offline e cloud.