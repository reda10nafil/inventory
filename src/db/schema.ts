/**
 * SyncroFlow — WatermelonDB Schema v1
 * Bare React Native 0.81.5 + JSI (SQLiteAdapter)
 *
 * ===========================================================================
 * SCELTA ARCHITETTURALE: WatermelonDB vs Ditto
 * ===========================================================================
 * Requisito PRD: Team Condiviso 100% sync, rete mesh LAN (router Mercusys
 * senza WAN), chat con Hydrated Product Cards, immagini WebP.
 *
 * WatermelonDB (scelta primaria implementata qui):
 *  + JSI adapter sincrono — lettura UI thread senza bridge async, critico per
 *    withObservables / hydration chat a 120Hz su S25 Ultra.
 *  + SQLite nativo + Lazy loading + Observation reattiva fine-grained.
 *  + Bundle ~30KB, MIT, zero costi backend, funziona offline 100%.
 *  + Sync engine "bring your own sync" — perfetto per mesh WebSocket LAN:
 *    possiamo implementare pull 100% su mesh join + push delta timeline.
 *  - Sync va scritto manualmente (vedi src/db/sync.ts).
 *  - Conflitti LWW gestiti lato client (lastWriteWins su updatedAt).
 *
 * Ditto SDK (alternativa valutata, non implementata ora):
 *  + CRDT + mesh P2P automatico (BLE/WiFi/LAN) senza scrivere sync.
 *  + Conflitti automatici small-world.
 *  - SDK closed-source, licenza a pagamento oltre soglia, binario ~12MB.
 *  - Meno controllo su schema SQLite, integrazione JSI opaca.
 *  - Overkill per fase 1 se il router LAN è già centralizzato.
 *
 * Decisione: WatermelonDB JSI ora (costo zero, performance max, controllo
 * totale). Astrazione sync in src/db/sync.ts già compatibile con swap
 * futuro su Ditto — basta sostituire pull/push con Ditto collections.
 *
 * ===========================================================================
 * JSI ENABLE
 * ===========================================================================
 * Bare RN 0.81.5:
 *  - android/app/build.gradle : apply plugin watermelondb -> enable JSI
 *  - android/settings.gradle  : include ':watermelondb-jsi' (autolinking)
 *  - ios/Podfile             : pod 'WatermelonDB', :path => '../node_modules/@nozbe/watermelondb'
 *  Adapter: new SQLiteAdapter({ schema, jsi: true, migrations, ... })
 *  Senza JSI fallback su bridge async (2-3x più lento su lista 10k SKU).
 *
 * ===========================================================================
 * TEAM CONDIVISO — NESSUN ISOLAMENTO userId
 * ===========================================================================
 * Principio: TUTTE le query sono "read all". Nessuna colonna user_id,
 * nessuna where({ userId: currentUser.id }). Ogni nodo vede 100% prodotti,
 * timeline, automazioni, chat.
 * Permessi SOLO su write (role admin|editor|viewer su team_members):
 *  - viewer: read-only (blocca create/update/delete in sync.push / UI)
 *  - editor: CRUD prodotti/timeline/chat, no delete automazioni
 *  - admin: full incl. team_members management
 * Applicato a livello applicativo (canWrite / assertCanWrite) non a query.
 *
 * Immagini: campo `images` = JSON stringified string[] di path locali WebP
 * (già compressi via react-native-compressor, max 1920x1080, EXIF stripped).
 * Non usiamo tabella separata per evitare N+1 su hydration chat.
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const syncroFlowSchema = appSchema({
  version: 1,
  tables: [
    // -----------------------------------------------------------------------
    // products — entità principale magazzino
    // -----------------------------------------------------------------------
    tableSchema({
      name: 'products',
      columns: [
        { name: 'sku', type: 'string', isIndexed: true },
        { name: 'fur_type', type: 'string', isIndexed: true },
        { name: 'location', type: 'string', isIndexed: true },
        { name: 'status', type: 'string', isIndexed: true }, // available|sold|archived
        { name: 'images', type: 'string', isOptional: true }, // JSON stringified string[] (WebP paths)
        { name: 'purchase_price', type: 'number', isOptional: true },
        { name: 'sell_price', type: 'number', isOptional: true },
        { name: 'length', type: 'number', isOptional: true },
        { name: 'width', type: 'number', isOptional: true },
        { name: 'weight', type: 'number', isOptional: true },
        { name: 'technical_notes', type: 'string', isOptional: true },
        { name: 'library_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'gs1_digital_link', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number', isIndexed: true },
        { name: 'deleted_at', type: 'number', isOptional: true, isIndexed: true },
        { name: 'last_scanned_at', type: 'number', isOptional: true },
        // Sync bookkeeping (LWW)
        { name: 'sync_status', type: 'string', isIndexed: true }, // created|updated|deleted|synced
        { name: 'updated_by', type: 'string', isOptional: true, isIndexed: true }, // team_members.id — audit, non filtro
      ],
    }),

    // -----------------------------------------------------------------------
    // automations — steps JSON, riutilizzabili da chat payload
    // -----------------------------------------------------------------------
    tableSchema({
      name: 'automations',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'steps', type: 'string', isOptional: true }, // JSON stringified AutomationStep[]
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_by', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string', isIndexed: true },
      ],
    }),

    // -----------------------------------------------------------------------
    // timeline — append-only, source of truth per push delta
    // -----------------------------------------------------------------------
    tableSchema({
      name: 'timeline',
      columns: [
        { name: 'product_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string', isIndexed: true }, // created|moved|modified|sold|scanned|photo_added|deleted|restored
        { name: 'timestamp', type: 'number', isIndexed: true },
        { name: 'details', type: 'string', isOptional: true }, // JSON {from,to,changes[],finalPrice,photoCount...}
        { name: 'created_by', type: 'string', isOptional: true, isIndexed: true },
        { name: 'sync_status', type: 'string', isIndexed: true },
      ],
    }),

    // -----------------------------------------------------------------------
    // chat_messages — payload leggero + hydrated cache
    // -----------------------------------------------------------------------
    // Payload trasmissione LAN: { sku: string[], automationIds: string[], text?: string }
    // HydratedCache: snapshot JSON delle product cards al momento dell'invio,
    // usato solo per render immediato se DB locale non ha ancora il prodotto
    // (es. nuovo nodo appena joinato). Hydration reale via withObservables.
    tableSchema({
      name: 'chat_messages',
      columns: [
        { name: 'sender_id', type: 'string', isIndexed: true }, // team_members.id
        { name: 'payload', type: 'string' }, // JSON { sku: string[], automationIds: string[], text?: string }
        { name: 'hydrated_cache', type: 'string', isOptional: true }, // JSON snapshot opzionale per offline-first render
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'sync_status', type: 'string', isIndexed: true },
      ],
    }),

    // -----------------------------------------------------------------------
    // team_members — rubrica team, ruoli per permessi write
    // -----------------------------------------------------------------------
    tableSchema({
      name: 'team_members',
      columns: [
        { name: 'email', type: 'string', isIndexed: true },
        { name: 'username', type: 'string', isIndexed: true },
        { name: 'role', type: 'string', isIndexed: true }, // admin|editor|viewer
        { name: 'created_at', type: 'number' },
        { name: 'sync_status', type: 'string', isIndexed: true },
      ],
    }),
  ],
});

export default syncroFlowSchema;
