# Syncro Flow (FurInventory Pro) — React Native v1

Puntatore sottile: requisiti, stato verificato e cronologia stanno in `piani di implementazione/` (README, PIANO_IMPLEMENTAZIONE.md, CRONOLOGIA.md). Regole graphify in `AGENTS.md`.

## Architettura e stack
- React Native 0.81.5 + React 19.1, TypeScript 5.9, entry `index.js` → `App.tsx` (navigazione React Navigation, ex expo-router "ejected"; la cartella `app/` è residuo).
- Pacchetti Expo ancora presenti (expo 54) e usati per la versione web (`expo start --web`, react-native-web, Metro).
- Backend: Supabase (`backend-auth/supabase/`, URL e chiave publishable in `app.json` → `extra`), Google Drive/Sheets (`backend-auth/google/`), sync LAN mesh (`src/services/mesh*`).
- Stato: React Context in `contexts/` (Inventory, Locations, CustomFields, Layout, Automations, GS1Config, HardwareConfig, Auth).
- `syncro_flow_flutter/`: app Flutter v2, prodotto SaaS distinto.
- Repo GitHub: `reda10nafil/inventory` (main). La copia `../onspace-9b4wtn-11197` punta a un altro repo con la stessa storia.

## Comandi
- Install: `npm ci --legacy-peer-deps` (vedi `.npmrc` del branch feature)
- Web: `npm run web`
- Android: `npm run android` · Metro: `npm start`
- Test: `npx jest@29.7.0 --config jest.config.js` (jest manca nei devDependencies, `npm test` da solo non parte) · E2E: detox
- Lint/typecheck: `npm run lint`, `npx tsc --noEmit`

## Decisioni architetturali
- 2026-10-20 — RN v1 e Flutter v2 sono SaaS separati (Google Cloud, Supabase, OAuth, backup distinti).
- 2026-11-21 — Si lavora su `main`; `feature/auth-and-sync` (diverge da main, base 741f2b1) contiene fix web/TS dell'altro computer da recuperare in modo selettivo.
- 2026-11-21 — Web: `index.js` usa `registerRootComponent` solo su web; WatermelonDB con `src/db/adapter.ts` (SQLite) / `adapter.web.ts` (LokiJS); il client Supabase ricade su `app.json` quando `expo-constants` è vuoto.

- 2026-11-21 — Login Google disattivato (`LOGIN_ENABLED = false` in `contexts/AuthContext.tsx`): app solo locale, spazio `local`, nessuna sync cloud.

## Roadmap e stato
- Vedi `piani di implementazione/PIANO_IMPLEMENTAZIONE.md`.
- Da verificare: Android, NFC e mesh su dispositivo reale.

## Strumenti e MCP del progetto
- graphify (`graphify-out/`, tracciato in git), Context7, MCP supabase (progetto `ymsnlixracwjgajldryb`).
