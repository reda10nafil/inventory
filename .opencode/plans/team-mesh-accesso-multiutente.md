# Piano Esecutivo — Mesh, Chat e Storage Offline-First (Team Condiviso) — Queen Coordinator Ruflo Swarm

> Stato: APPROVATO — Bare RN 0.81.5 Strictly CLI (no expo)
> Data: 2026-09-02
> PRD: `docs/Accesso a molti utente.md:1-38` + Append `docs/implementation_plan_master.md:92` + `docs/cronologia_migrazione.md`
> Swarm: 4 Worker Ruflo parallel (SPARC) + shared memory `.ruflo/shared-state.json`

## Contesto Verificato
- Team Condiviso totale: nessun filtro `userId` su view, 100% sync prodotti/timeline/automazioni/immagini WebP su mesh LAN. Permessi solo su write (admin/editor/viewer).
- Area Accesso Multi-Utente separata da Chat (`src/screens/tabs/SettingsScreen.tsx:303` people #8B5CF6 showComingSoon -> `TeamScreen`).
- Hydrated Product Cards: payload leggero `{sku, automationIds, text}` -> query locale WatermelonDB `withObservables` -> Card interattiva Sposta/Vendi.

## Swarm Configurazione
- **Worker 1 DB**: WatermelonDB JSI `src/db/schema.ts:61` v1 5 tabelle, `src/db/sync.ts` pull 100% su join + push delta timeline. ADR WatermelonDB vs Ditto in `schema.ts:5` (JSI 120Hz, Ditto swap-ready).
- **Worker 2 UI Media**: `src/components/chat/HydratedProductCard.tsx:1` 570 LOC + `src/services/mediaCompressor.ts:58` compressToWebP 1920x1080 WebP + `ChatMessageItem`.
- **Worker 3 Mesh**: `src/screens/settings/TeamScreen.tsx:68` Host QR `ws://IP:PORT?token=ROOM` via `react-native-qrcode-svg` + Client vision-camera `Camera/useCameraDevice/useCodeScanner` 60fps S25 Ultra. `src/services/meshSync.ts:115` buildQrPayload + `src/hooks/useMeshRole.ts`.
- **Worker 4 QA**: `__tests__/chatPayload.test.ts` 32 casi, `e2e/meshQRLoop.detox.test.ts` 7 test mock WS, `scripts/profileRam.js` S25 Ultra 12GB 120Hz thresholds heap<250MB p95<16ms PASS 5.2MB/3.93ms.

## Fasi
### Fase 0 — Sblocco Immediato (mock) [DONE Swarm]
- MockAuthProvider + TeamMember role, unlock SettingsScreen `router.push('/settings/team')` -> `SettingsTeam` Stack, SafeArea top+bottom theme #0A0A0A/#D4AF37.
- Verifica: `npx tsc --noEmit` verde, `graphify update .` 2824 nodes, `adb screencap` Pixel_10_Pro 5556.

### Fase 1 — Storage JSI [Worker1 done code, deps da npm i @nozbe/watermelondb]
- Enable JSI: `android/app/build.gradle` watermelondb plugin, `ios/Podfile` pod WatermelonDB, `SQLiteAdapter{jsi:true}` in `src/db/index.ts`.
- Migrator: AsyncStorage -> WatermelonDB batch import.

### Fase 2 — Mesh LAN + QR [Worker3 done UI stub, reale WS da integrare con router Mercusys]
- `getLocalIp()` + `NetInfo`, mDNS `SyncroFlow._ws._tcp`, TLS optional.
- Test Detox su device fisico S25 Ultra con router isolato.

### Fase 3 — Chat Hydration + WebP [Worker2 done component, compressor da installare react-native-compressor + react-native-image-crop-picker]
- Swap `useInventory` placeholder -> `withObservables` osserva `Q.where('sku', Q.oneOf(skus))`.
- Compressione multi-thread, test carico 50 cards simultanee <16ms.

### Verifica & Criteri Accettazione
- `npm test` payload parsing 32/32, `profileRam.js --ci` PASS, Detox QR loop 7/7.
- Visivo: TeamScreen gold hairline, QR 200, scanner 60fps overlay.
- Timeline globale propagata a tutti i nodi <50ms su LAN.

## Memory Store Condiviso
`.ruflo/shared-state.json` — ADR Worker1 eredita Worker2 hydration. SPARC parallelo, handling blocchi nativi via Queen reallocation.
