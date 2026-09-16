# Setup Synchroflow - Guida Completa

## Prerequisiti
- Node.js 18+, pnpm/npm, Expo CLI
- Account Supabase e Google Cloud

## Supabase Setup
1. Crea progetto su supabase.com
2. Esegui `backend-auth/supabase/schema.sql` in SQL Editor
3. Abilita Real-time per `products` e `sync_logs`
4. Copia URL e API key

## Google Cloud Setup
1. Crea progetto su console.cloud.google.com
2. Abilita: Drive API, Sheets API, Google+ API
3. Crea OAuth 2.0 Client ID
4. Redirect URI: `com.synchroflow://oauth/callback`
5. Crea cartella Drive per immagini, copia Folder ID

## Configurazione Ambiente
Crea `.env.local`:
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_DRIVE_FOLDER_ID=xxx
```

## Installa dipendenze
```bash
pnpm install
npx expo install expo-auth-session expo-file-system expo-sharing expo-document-picker expo-image-picker
```

## Test
1. `npx expo start`
2. Login con Google
3. Esporta CSV, verifica che includa `image_url`

Vedi `backend-auth/docs/` per guide dettagliate.
