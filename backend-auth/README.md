# Backend Auth & Configuration

Questa cartella contiene tutti i file di configurazione per:
- **Supabase (Synchroflow)**: Database, Auth, Real-time
- **Google Cloud**: OAuth, Drive API, Sheets API
- **Servizi backend**: Immagini, Export/Import, Sync tra operatori

## Setup

1. Copia `.env.example` in `.env.local`
2. Inserisci le tue API key
3. Segui le guide in `docs/`

## Struttura

```
backend-auth/
├── .env.example                 # Template variabili ambiente
├── supabase/
│   ├── client.ts                # Client Supabase
│   ├── schema.sql               # Schema database
│   └── realtime.ts              # Sincronizzazione real-time
├── google/
│   ├── auth.ts                  # Google OAuth 2.0
│   ├── drive.ts                 # Google Drive API (immagini)
│   └── sheets.ts                # Google Sheets API (export/import)
├── services/
│   ├── imageConverter.ts        # Converti immagini → link
│   ├── exportImport.ts          # Export/Import CSV + Sheets
│   └── operatorSync.ts          # Sync tra operatori
└── docs/
    ├── supabase-setup.md        # Setup Supabase
    └── google-cloud-setup.md    # Setup Google Cloud
```

## Nota per Google Anti Gravity

Questi file sono pronti per essere configurati con le API key corrette. Verificare:
- URL progetto Supabase: `https://xxxxx.supabase.co`
- Project ID Google Cloud
- API abilitate: Drive, Sheets, OAuth 2.0
