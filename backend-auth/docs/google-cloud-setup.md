# Setup Google Cloud API

## 1. Crea un progetto Google Cloud

1. Vai su [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuovo progetto chiamato **Synchroflow**
3. Copia il **Project ID**

## 2. Abilita le API necessarie

Nel dashboard Google Cloud:

1. **Google Drive API** → Abilita
2. **Google Sheets API** → Abilita
3. **Google+ API** (per OAuth) → Abilita

## 3. Configura OAuth 2.0

1. Vai su **API & Services** → **Credentials**
2. Crea **OAuth 2.0 Client ID**
3. Configura:
   - Application type: **Web application** (o iOS/Android per mobile)
   - Authorized redirect URIs: `com.synchroflow://oauth/callback`
4. Copia:
   - **Client ID**
   - **Client Secret**

## 4. Configura Google Drive

1. Crea una cartella in Google Drive per le immagini
2. Copia il **Folder ID** dall'URL:
   - URL: `https://drive.google.com/drive/folders/1ABC...`
   - Folder ID: `1ABC...`

## 5. Configura Google Sheets

1. Crea un nuovo Google Sheet per l'export
2. Copia lo **Spreadsheet ID** dall'URL:
   - URL: `https://docs.google.com/spreadsheets/d/1XYZ...`
   - Spreadsheet ID: `1XYZ...`

## 6. Configura le variabili ambiente

In `.env.local`:

```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=com.synchroflow://oauth/callback
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
```

## 7. Testa la connessione

```typescript
import { signInWithGoogle } from './backend-auth/google/auth';

const result = await signInWithGoogle();
console.log(result);
```

## Note

- **Redirect URI**: per React Native usa `expo-auth-session` con scheme personalizzato
- **Permessi**: richiedi solo gli scope necessari (Drive, Sheets)
- **Security**: mai committare `.env.local` su GitHub
