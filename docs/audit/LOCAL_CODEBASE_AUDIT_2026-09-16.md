# Audit locale codebase — 2026-09-16

## 1. Data e branch

- Data: 2026-09-16. Directory: `C:\Users\Primo\Desktop\inventory`.
- Branch: `feature/auth-and-sync` (tracking `origin/feature/auth-and-sync`).
- Repo: `reda10nafil/inventory`. App target: React Native nativa (0.81.5) + React Navigation. Non Expo Router.

## 2. Commit HEAD

- `73f6d3b` — `docs(audit): record auth and sync implementation baseline`.

## 3. Git status iniziale

- `git diff --name-only`: vuoto. `git diff --cached --name-only`: vuoto. `git diff --check`: pulito.
- Solo file untracked (`??`): log (`*.log`), script `fix_*`/`scripts/*.ps1`, `docs/audit/screenshots/*`, `docs/audit/GRAPH_FRESHNESS.md`, `docs/audit/dump.xml`. Nessun reset/checkout/pull eseguito; nessun file sovrascritto.

## 4. Package manager e lockfile

- `package-lock.json` (754.233 byte) e `pnpm-lock.yaml` (489.304 byte) entrambi tracciati; campo `packageManager` in `package.json` ASSENTE.
- Scelto per i controlli: **npm** (`npm.cmd`, v11.13.0; node v26.2.0) perche disponibile; `pnpm` non installato. Nessun lockfile eliminato, nessuna dipendenza aggiunta.

## 5. Comandi eseguiti e risultati

- `git status --short / branch --show-current / remote -v / log -1`: ok, vedi sez. 1-3.
- `npm.cmd install --no-audit --no-fund`: FALLITO `ERESOLVE` — `lucide-react-native@0.475.0` richiede peer `react@^16.5.1||^17||^18`, root ha `react@19.1.0`. Workaround non applicato (`--legacy-peer-deps`).
- `node node_modules/typescript/bin/tsc --noEmit`: FALLITO, exit 2, ~30 errori pre-esistenti in `backend-auth/*` (14: `googleapis`/`google-auth-library` mancanti, API `expo-file-system`, tipi supabase `never[]`), `utils/exportImport.ts` (11), `app/(auth)/onboarding.tsx` (2), `hooks/useAuth.ts` (2), `components/OperatorSelector.tsx` (1).
- Test: NON ESEGUIBILI — `jest` assente da `devDependencies` e da `node_modules` (`package.json` dichiara solo script `jest --config jest.config.js`).
- `node node_modules/eslint/bin/eslint.js App.tsx index.js`: exit 0 ma `App.tsx` ignorato ("no matching configuration"); `eslint.config.js` contiene solo `ignores`, zero regole → lint di fatto inattivo.
- Secret scan (`git grep -E`, solo nomi file): nessuna chiave privata; `SERVICE_ROLE_KEY` solo placeholder in `.example`/docs; 1 anon-key d'esempio completa in `backend-auth/.env.local.example` + riferimento troncato in `backend-auth/SETUP_COMPLETE.md`. Nessun `.env` reale tracciato.

## 6. Architettura runtime

- Entry: `index.js` (`AppRegistry.registerComponent('main', () => App)`, package `com.redako35.syncroflow`, scheme `syncroflow://`) → `App.tsx` → `NavigationContainer` + `RootNavigator` (`src/navigation/RootNavigator.tsx`: stack nativo, route `(tabs)`, `Scanner`, `ProductDetail`, `ProductEdit`, `Settings*`, `Chat`, automazioni).
- Provider montati in `App.tsx:52-71`: Automations, Locations, CustomFields, Layout, HardwareConfig, GS1Config, Inventory. `AuthProvider` NON montato.
- `src/screens/*` usano `src/navigation/compat.ts` (shim `router.push/back`, `useLocalSearchParams` su React Navigation). `app/` (Expo Router: `_layout.tsx`, `(tabs)`, `(auth)`, `product/[id].tsx`) e `expo-router@~6.0.24` in dipendenze sono LEGACY non target: l'app avviata da `index.js` non li monta (fatto; ipotesi: rimozione futura fuori scope).
- Android: `applicationId com.redako35.syncroflow`, v1.0.0; `react-native.config.js` disabilita moduli nativi vision-camera/compressor (fallback JS). iOS: solo `Podfile` stub con istruzioni, `pod install` non eseguibile su win32.

## 7. Schema e persistenza reali

- WatermelonDB `syncroFlowSchema` v1 (`src/db/schema.ts:61-157`): 5 tabelle (`products`, `automations`, `timeline`, `chat_messages`, `team_members`), `sync_status` LWW, team condiviso senza `user_id`. Model in `src/db/models/*` mappati 1:1 (`Product.ts`, `Automation.ts` con `AutomationStep`, `TimelineEvent.ts`, `ChatMessage.ts` con `ChatPayload`/`HydratedCache`, `TeamMember.ts` con `canWrite`/`isAdmin`); `src/db/index.ts` crea `database` con `SQLiteAdapter({jsi:true})`.
- FATTO CHIAVE: il flusso prodotti montato NON usa WatermelonDB. `database` e importato solo in `src/db/index.ts`, `src/components/chat/HydratedProductCard.tsx:38-40` (require lazy) e `src/services/meshServer.ts:307-419` (require lazy best-effort). CRUD UI = `contexts/InventoryContext.tsx` su AsyncStorage.
- Wiring JSI/gradle esplicito NON CONFERMATO: `android/` non cita watermelondb; `ios/Podfile` lo cita solo in commenti (rr. 6, 50, 57). Ipotesi (non verificata): autolinking sufficiente.
- Chiavi AsyncStorage (JSON serializzato): `products`, `timeline`, `alerts`, `libraries` (InventoryContext), `furinventory_custom_fields`, `furinventory_layout_config`, `furinventory_locations`, `@furinventory_custom_automations`, `furinventory_gs1_config`, `furinventory_hardware_config`, `@syncroflow_last_pulled_at` (+ `removeItem` su mesh-join). `AuthContext` usa `localStorage`/`googleAccessToken`/`operatorId` (API web, vedi sez. 16).

## 8. Flusso prodotti

- `InventoryContext.tsx:174-194` `addProduct` (SKU auto `LOG-YYYY-NNN` o fornito, id `Date.now()-random`, timeline `created`); `updateProduct` (196-...: tracking changes + eventi `modified`/`photo_added`); `deleteProduct` (soft via `deletedAt`), `restoreProduct`, `permanentlyDeleteProduct`, `moveProduct`, `sellProduct`, `scanProduct`; query `getProductById`, `getTimelineForProduct`, `filterProducts(all|available|sold|alert|trash)`, `getProductBySku`; librerie slug (`addLibrary/updateLibrary/deleteLibrary`).
- `DetailScreen` (`src/screens/product/DetailScreen.tsx`): legge da `useInventory` + `useCustomFields` (r. 28), render `product.customData` rr. 906-911; nessun `useLayout`.
- `EditScreen` (`src/screens/product/EditScreen.tsx`): form state + `customFieldValues` da `product.customData` (rr. 34-41); `useLayout` usato SOLO per override icona (r. 750). Ordinamento/visibilita layout NON applicati (fatto).

## 9. Custom fields

- Definizione `types/index.ts:63-80` (`CustomField`: id, name, type, uiType, required, order, isSystem, options/dataset/unit/icon, barcode/linkTo); valori su prodotto `ProductCustomData { value, fieldSnapshot }` (`types/index.ts:31-34`).
- `CustomFieldsContext.tsx`: 11 `SYSTEM_FIELDS` (rr. 15-27), CRUD + soft-delete/restore/reorder/reset, persistenza `furinventory_custom_fields`, merge campi di sistema mancanti al load (rr. 65-93).
- `FieldsScreen` (`src/screens/settings/FieldsScreen.tsx`, 580 righe): builder con modal add/edit, tipi base+UI, icone, stepper/options, required/barcode/linkTo. Funzionamento reale NON testato su device (fatto: codice presente e cablato, esecuzione non verificata).

## 10. Layout Builder

- `LayoutContext.tsx`: `LayoutField { id, type: base|custom|section, size: small|medium|full, visible, label?, icon? }`, `LayoutConfig { fields, version }`, `DEFAULT_LAYOUT` v4 (rr. 26-54), CRUD ordine/size/visibilita/sezioni/template + `saveLayout`, persistenza `furinventory_layout_config` con migrazione su versione obsoleta (rr. 95-...).
- `LayoutBuilderScreen` (744 righe) + `lib/templates.ts` (`PREDEFINED_TEMPLATES`, es. `store-abbigliamento`): esistenti e cablati. Applicazione reale parziale (solo Edit/icone, vedi sez. 8).

## 11. Sync / offline / backup / import

- Offline-first locale CONFERMATO: tutto il CRUD vive in AsyncStorage; WatermelonDB pronto ma non nel path UI.
- Sync mesh LAN: `src/db/sync.ts` (stub `pullChanges` GET `/pull?since`, `pushChanges` POST `/push`, `synchronize` Watermelon, LWW, `syncOnMeshJoin` full-pull); `src/services/meshSync.ts` (439 righe: `createHostRoom`, `joinRoom`, `syncDatabase`, `sendLightPayload`, QR `ws://IP:PORT?token=`) ; `src/services/meshServer.ts` (813 righe: TCP via `react-native-tcp-socket` + upgrade WS manuale, REST `GET /pull`, `POST /push`, `POST /chat/push`, `GET /health`). Esecuzione reale su rete NON testata.
- Chat: payload leggero `{sku[], automationIds[], text?}` + `hydrated_cache`; unit test `__tests__/chatPayload.test.ts`, `bossShare.test.ts` (NON eseguibili, sez. 5); E2E `e2e/meshQRLoop.detox.test.ts` + `.detoxrc.js` (richiede build APK/emulatore, NON eseguito).
- Backup/restore dedicati ASSENTI (nessun file `*backup*`/`*restore*` tracciato). Import/export = `utils/exportImport.ts` + tab `app/(tabs)/export.tsx`: CSV via Supabase con schema DIVERSO (`name/description/quantity/operator_id`) rispetto a `Product` locale → NON allineato al modello reale. `backend-auth/services/*` (exportImport, imageConverter, operatorSync) affetti da errori tsc.

## 12. Google Cloud / API

- Riferimenti Google SOLO in `backend-auth/`: `google/auth.ts` (expo-auth-session providers/google; tsc: `signInAsync`/`signOutAsync` inesistenti), `google/drive.ts`, `google/sheets.ts` (`googleapis`/`google-auth-library` NON installati → errori tsc). Nessun riferimento in `app/src/contexts/utils/services/components/hooks`.
- `AuthContext.tsx` importa `backend-auth/supabase/client` + `backend-auth/google/auth`, ma NON e montato in `App.tsx`; usa `localStorage` (rr. 28, 51, 63-64, 70) non disponibile su RN nativo. Supabase Edge Functions ASSENTI (`supabase/functions/` non tracciato).

## 13. CONFERMATO

Runtime RN+React Navigation; schema WatermelonDB v1 e model; AsyncStorage come store effettivo con chiavi note; CRUD Timeline-aware; formati custom fields/layout; mesh LAN (codice) pull-100/push-delta LWW; assenza `.env` reali in git; screens prodotto/Fields/LayoutBuilder/cartelle-posizioni-automazioni esistenti e registrate nel Router.

## 14. NON CONFERMATO

Esecuzione su device/emulatore (nessuna build/test eseguiti qui); wiring JSI WatermelonDB; applicazione layout a Detail; allineamento export CSV al modello; funzionamento Auth Google/Supabase nel runtime (provider non montato + `localStorage`).

## 15. ASSENTE

Test runner (`jest`), backup/restore dedicati, Supabase Edge Functions, `IMPLEMENTATION_HISTORY.md`, regole ESLint, `.npmrc`, campo `packageManager`, wiring nativo WatermelonDB esplicito, `pod install` iOS (ambiente).

## 16. RISCHI e BLOCKER

- BLOCKER: `npm install` fallisce (ERESOLVE react19 vs lucide) → install/test non riproducibili; `jest` mancante → suite unitaria ineseguibile; `tsc` ~30 errori pre-esistenti.
- RISCHIO: `backend-auth/supabase/client.ts:9-19` esporta `supabaseAdmin` con `SUPABASE_SERVICE_ROLE_KEY` da file importabile dal bundle (`AuthContext`, `utils/exportImport`) — service role committata o iniettata in build = compromissione RLS.
- RISCHIO: anon-key d'esempio completa in `backend-auth/.env.local.example` (valida la ref progetto; dipende da RLS).
- RISCHIO: doppia persistenza (AsyncStorage effettivo + WatermelonDB in parallelo via meshServer) → divergenza dati.
- RISCHIO: `AuthContext` con `localStorage` crasha su nativo se mai montato; `exportImport` scrive su tabella remota con schema diverso.
- RISCHIO: untracked `fix_*`/`scripts/*.ps1`/log estranei al branch — rumore e possibile confusione operativa.

## 17. Decisione tecnica raccomandata

Ipotesi di lavoro (da validare, non fatto): convergere su UN solo store locale effettivo (AsyncStorage attuale vs migrazione a WatermelonDB) prima di toccare sync/cloud; separare `supabaseAdmin` in codice mai importato dal bundle; fissare install riproducibile come prerequisito di qualsiasi task.

## 18. Primo compito implementativo

Rendere installazione e controlli riproducibili SENZA modifiche architetturali: decidere npm vs pnpm, risolvere ERESOLVE in modo dichiarato, ripristinare runner jest. Fermarsi prima di migration/modifiche schema.

## 19. File candidati

`.npmrc` o `package.json` (strategia peer-deps / devDep `jest` mancante), `pnpm-workspace.yaml` (se scelta pnpm), `eslint.config.js` (solo se si decide copertura reale). Nessun file `src/` in questo compito.

## 20. Test previsti

`npm.cmd install` pulito; `tsc --noEmit` (fotografare delta errori, non necessarily zero); `npm test` (chatPayload/bossShare); `git diff --check`; secret scan.

## 21. Rollback

`git checkout -- <file>` per i file toccati; `git clean -fd` SOLO su untracked noti se creati dal task; nessun commit/push senza conferma.

## 22. Conferma necessaria

SI: scelta package manager unico, permesso ad aggiungere la sola devDep `jest` (nuova dipendenza), strategia ERESOLVE (`legacy-peer-deps` vs upgrade `lucide-react-native`). Senza queste autorizzazioni il compito non puo partire.
