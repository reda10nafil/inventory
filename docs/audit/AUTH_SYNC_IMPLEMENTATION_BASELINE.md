# Synchroflow — Baseline di audit Auth, Sync e Offline-first

> Data audit: 2026-09-16
> Branch analizzato: `feature/auth-and-sync`
> Ambito: solo analisi documentale e strutturale. Nessuna build, test runtime, test Supabase, test OAuth, test LAN o test su due dispositivi è stato eseguito in questa fase.

## 1. Vincoli operativi

- Lavorare esclusivamente su `feature/auth-and-sync`; non fare merge in `main`.
- L'architettura finale è React Native nativo con `App.tsx`, React Navigation in `src/navigation/`, schermate in `src/screens/`, provider in `contexts/` e dati locali in `src/db/`.
- Non usare Expo Router come architettura finale e non usare `localStorage` per la versione mobile.
- Chiedere conferma prima di commit, migration Supabase, deploy Edge Function/Google Cloud, pull request o merge.
- Non dichiarare funzionanti OAuth, RLS, chat, sync cloud, LAN/mesh o test multi-dispositivo senza prova eseguita e registrata.

## 2. Fonti esaminate

- `AGENTS.md` e struttura repository.
- `docs/implementation_plan_master.md`.
- `docs/implementation_plan_auth_cloud.md`.
- `docs/implementation_plan_timeline_offline_first.md`.
- `docs/audit/LOGISTICA-INVENTARIO.md`.
- `docs/audit/AUTOMAZIONI.md`.
- `docs/audit/DETTAGLIO_SCHERMATE.md`.
- `docs/audit/SCREEN_MAP.md`, `CHECKLIST_PARITA.md`, `README.md` e commit di migrazione React Native/mesh.

## 3. Architettura reale e stato

### 3.1 Da usare come base

- `App.tsx` e `index.js` sono l'entrypoint React Native.
- `src/navigation/RootNavigator.tsx`, `TabsNavigator.tsx`, `linking.ts`, `types.ts` e `compat.ts` sono la base React Navigation.
- `src/screens/` contiene le schermate native; `src/screens/settings/TeamScreen.tsx` e `src/screens/ChatScreen.tsx` esistono.
- `contexts/InventoryContext.tsx`, `LocationsContext.tsx`, `CustomFieldsContext.tsx`, `LayoutContext.tsx`, `AutomationsContext.tsx`, `GS1ConfigContext.tsx` e `HardwareConfigContext.tsx` mantengono ancora logica funzionale esistente.
- `src/db/` contiene WatermelonDB: schema, modelli Product/Automation/ChatMessage/TeamMember/TimelineEvent e codice sync. È una base candidata per il database locale strutturato, non una garanzia di sync completa.
- Il modello prodotto usa `images: string[]`; ogni nuova API, export e import deve conservare l'array completo.

### 3.2 Da sostituire o isolare

- `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/onboarding.tsx` e `app/(tabs)/export.tsx`, introdotti nel commit sperimentale `3411a65...`, non devono diventare il flusso finale: usano la struttura Expo Router.
- `contexts/AuthContext.tsx`, `hooks/useAuth.ts` e `utils/exportImport.ts` del commit sperimentale devono essere revisionati funzione per funzione prima del riuso: nessun adapter web o `localStorage` è ammesso nel runtime Android/iOS.
- La compatibilità legacy sotto `app/` può restare temporaneamente solo come riferimento/migrazione; nessuna nuova feature auth o sync deve dipenderne.

### 3.3 Limitazioni della verifica

- L'audit precedente documenta molte UI e flussi, ma dichiarava esplicitamente l'assenza di un device collegato per screenshot live.
- Il commit mesh precedente dichiara APK build e test, ma tali affermazioni non sono state rieseguite o convalidate in questo audit.
- Non esiste ancora evidenza verificata qui di login Google, invito, RLS cross-organizzazione, sync cloud, discovery LAN, ACK/retry LAN, chat persistita tra due telefoni o backup/import su secondo dispositivo.

## 4. Funzionalità: reale, parziale o UI

| Area | Stato osservato | Decisione |
|---|---|---|
| Inventario, prodotti, immagini locali, posizioni, cartelle e campi | Implementazione locale esistente soprattutto nei context/AsyncStorage, con UI ampia | Preservare i flussi; migrare progressivamente mutazioni e dati verso DB locale + operation log |
| React Navigation | Navigator, linking e screen native esistono | Estendere questa architettura; non creare router parallelo |
| Auth Google, owner e inviti | Piano e file sperimentali presenti; flusso nativo e backend verificati assenti | Da implementare in `src/auth`, `src/services`, `src/screens/auth` e Edge Functions dopo hardening |
| Team e accesso | TeamScreen e riferimenti UI esistono | Non considerare inviti, ruoli o presenza come sicuri/funzionanti fino a backend, RLS e test |
| WatermelonDB e sync | Schema/modelli/sync esistono | Audit tecnico e migrazione controllata necessari prima di dichiararlo offline-first |
| Mesh LAN e chat | meshServer, meshSync, ChatScreen e dati chat esistono; una chat usa anche AsyncStorage/broadcast | Trattare come sperimentali; riscrivere protocollo e verificare su due dispositivi |
| Timeline | TimelineEvent e UI esistono | Non è un registro multioperatore affidabile: manca contratto operativo completo e deduplicazione verificata |
| Automazioni | Builder, runner, built-in, scanner e mutazioni locali esistono | Mantenere compatibilità; instradare ogni mutazione futura attraverso operation log |
| Export/import | CSV/export e file sperimentali presenti | Non approvare finché CSV/JSON non usa `images_json`, anteprima, report e idempotenza |

## 5. Bug e rischi prioritari

### P0 — sicurezza e integrità

1. Le tabelle legacy Supabase `users`, `operators`, `products` e `sync_logs` hanno RLS disabilitata. Non abilitare RLS senza migrazione completa, policy per organizzazione/ruolo e test, altrimenti si rischia esposizione dati o blocco dell'app.
2. `is_organization_member` e `has_organization_role` sono `SECURITY DEFINER` ed eseguibili direttamente da anon/authenticated. Preparare hardening con `search_path` sicuro e privilegi minimi; verificare l'uso nelle policy prima di revocare permessi che potrebbero interromperle.
3. Auth sperimentale basata su Expo Router e possibile storage web: non integrarla nel runtime mobile.
4. Nessuna service role key, OAuth client secret o token operativo deve entrare in Git, APK o frontend.

### P1 — affidabilità operativa

1. La cronologia può contenere duplicati e movimenti nulli, incluso `vetrina -> vetrina`.
2. Le mutazioni locali basate su context/AsyncStorage non garantiscono transazioni, idempotenza, ordine globale o conflitti multiutente.
3. Mesh/chat non hanno ancora prova di discovery, handshake autenticato, ACK, retry, dedupe, recupero eventi e test a due dispositivi.
4. URI `file://` delle immagini locali non sono backup trasferibili tra telefoni.

### P2 — copertura e qualità

1. Team e backup cloud risultano in parte UI/stub o funzionalità da confermare.
2. Export CSV storico non è sufficiente se serializza una sola immagine o omette layout, cartelle, posizioni, campi e automazioni.
3. Automazioni, scanner, NFC, GS1, PDF e condivisione devono essere sottoposti a regressione dopo il cambio del percorso dati.

## 6. Piano auth, owner e inviti

1. Implementare moduli nativi: `src/auth/`, `src/services/auth/`, `src/screens/auth/LoginScreen.tsx`, `CreateOwnerAccountScreen.tsx` e `AcceptInviteScreen.tsx`.
2. Inserire un `AuthGate` nel `RootNavigator`; estendere tipi e `linking.ts` per `syncroflow://auth`, `syncroflow://invite/<token>` e relativi stati errore.
3. Usare sessione Supabase con adapter React Native; usare storage sicuro per dati sensibili quando necessario, mai `localStorage`.
4. Configurare OAuth Google PKCE e redirect Android/iOS senza committare secret.
5. Usare `auth.users` come identità, `profiles`, `organizations`, `organization_members` e `invitations` come modello applicativo.
6. Eseguire creazione owner, invito, accettazione, revoca, rimozione membro e cambio ruolo tramite Edge Functions; token invito hashato, monouso, revocabile e con scadenza.
7. Costruire `Team e accesso` solo dopo API/RLS: membri, ruoli owner/admin/operator/viewer, inviti QR/deep link, dispositivi, stato sync e cambio organizzazione.

## 7. Piano offline-first, LAN, chat e conflitti

### 7.1 Fonte locale e operation log

Ogni mutazione deve seguire:

```text
azione utente
-> transazione DB locale
-> OperationEvent immutabile in outbox
-> UI locale immediata
-> invio LAN a peer autorizzati quando disponibili
-> invio/pull cloud Supabase alla riconnessione
-> ACK, dedupe, merge oppure conflitto
```

- Usare WatermelonDB o altra soluzione già compatibile come fonte immediata per prodotti, posizioni, cartelle, campi, layout, automazioni, messaggi, membri, inviti accettati, outbox, inbox, activity log e conflitti.
- AsyncStorage può rimanere solo per preferenze/minima compatibilità; non per stato multioperatore autorevole.
- Migrare provider uno alla volta dietro adapter, senza rompere scanner, NFC, GS1 e automazioni.

### 7.2 Rete LAN

1. Generare e persistere una device identity separata dall'identità utente.
2. Implementare discovery mDNS e/o pairing QR.
3. Stabilire handshake autenticato con organizzazione, utente, dispositivo, versione protocollo e sessione verificata.
4. Definire protocollo versionato per `OperationEvent`, ACK, cursori, richiesta eventi mancanti, retry e riconnessione.
5. Deduplicare in inbox/outbox con `operationId` e `idempotencyKey` univoci.
6. Non definire mesh una sola UI presenza, un server in ascolto o un broadcast TCP.

### 7.3 Chat e conflitti

- La chat deve essere un'entità locale persistita e sincronizzata come operazione/evento, non un solo broadcast effimero.
- Le modifiche su campi indipendenti possono fare merge automatico.
- Due modifiche concorrenti allo stesso campo dalla stessa baseVersion devono creare un conflitto verificabile da owner/admin.
- Vendita, eliminazione definitiva, trasferimento di massa, chiusura audit, ruoli e inviti richiedono lock/lease temporaneo e validazione server.

## 8. Cronologia e deduplicazione

Adottare un contratto minimo:

```ts
interface OperationEvent {
  operationId: string;
  idempotencyKey: string;
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
}
```

Regole:

- Validare prima di scrivere: nessun evento se non cambia alcun dato significativo.
- Rifiutare uno spostamento se `fromLocation === toLocation`.
- Client, LAN e cloud ignorano una ripetizione dello stesso `operationId`.
- L'ordine di visualizzazione deve distinguere orario locale, ricezione server e versione; non presumere un ordine globale dal solo timestamp client.
- UI Timeline: operatore/avatar, dispositivo, prima/dopo, stato sync, filtri e dettaglio conflitto.

## 9. Immagini cloud e backup/import

1. Il prodotto conserva un array immagini; ogni elemento cloud deve includere path privato stabile, nome, MIME, dimensione e ordine.
2. Upload da fotocamera, galleria e file entra in una coda offline con retry; URI locali non costituiscono backup condivisibile.
3. Storage privato per organizzazione e URL firmati temporanei per la visualizzazione autorizzata; evitare URL pubblici permanenti di default.
4. CSV deve usare almeno `images_json` e `custom_data_json` correttamente serializzati.
5. Backup JSON/CSV deve includere prodotti, immagini, campi, cartelle, posizioni, layout, automazioni e metadati di versione/import.
6. Import mobile: file picker/Share Sheet, anteprima, validazione, report creati/aggiornati/ignorati/falliti e idempotenza tramite ID/chiave import.
7. Drag & drop reale resta una funzionalità futura web, non un requisito della UI mobile.

## 10. Sequenza di implementazione

1. Hardening Supabase revisionato e approvato.
2. Auth/Routing React Native nativi e test di compilazione.
3. Backend organizzazioni/inviti/RLS/Edge Functions e test cross-organizzazione.
4. Team e accesso UI.
5. Schema locale, operation log, timeline, conflitti e migrazione graduale dai context.
6. Sync cloud pull/push/cursore e Realtime filtrato per organizzazione.
7. Protocollo LAN, chat e test reali su due telefoni.
8. Storage immagini, backup/import completo e test su secondo dispositivo.
9. Audit regressione scanner, NFC, GS1, layout, campi, automazioni, cestino, PDF e condivisione.

## 11. Criteri prima di main

- TypeScript, lint e test non introducono nuovi errori.
- Login Google owner reale, ripristino sessione e logout verificati.
- Invito QR/deep link: valido, scaduto, revocato e riutilizzato verificati.
- RLS: nessun utente legge/modifica dati di un'altra organizzazione.
- Due operatori: merge di campi diversi e conflitto visibile sullo stesso campo.
- Offline: creazione/modifica/foto/movimento producono dati locali e outbox.
- LAN: due dispositivi autorizzati scambiano eventi con handshake, ACK, retry e dedupe.
- Cloud: operazioni offline si sincronizzano al ritorno della connettività.
- Chat: messaggio offline persiste e si sincronizza quando possibile.
- Export/import: `images_json` completo, nessun duplicato al reimport, report corretto.
- Scanner, NFC, GS1, automazioni, layout, campi, PDF e sharing superano regressione mirata.

## 12. Stato di questa baseline

Questo documento non implementa né certifica alcuna funzionalità. Registra decisioni, rischi, confini architetturali e criteri verificabili per i successivi piccoli commit.
