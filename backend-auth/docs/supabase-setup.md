# Setup Supabase (Synchroflow)

## 1. Crea un progetto Supabase

1. Vai su [supabase.com](https://supabase.com)
2. Crea un nuovo progetto chiamato **Synchroflow**
3. Copia le credenziali:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon/Public Key
   - Service Role Key (segreta!)

## 2. Configura il database

1. Vai su **SQL Editor** nel dashboard Supabase
2. Copia e incolla il contenuto di `backend-auth/supabase/schema.sql`
3. Esegui lo script per creare le tabelle

## 3. Abilita Real-time

1. Vai su **Database** → **Replication**
2. Abilita real-time per le tabelle:
   - `products`
   - `sync_logs`

## 4. Configura le variabili ambiente

Copia `backend-auth/.env.example` in `.env.local` e inserisci:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 5. Verifica la connessione

Usa il client in `backend-auth/supabase/client.ts` per testare:

```typescript
import { supabase } from './backend-auth/supabase/client';

const { data, error } = await supabase.from('products').select();
console.log(data, error);
```

## Note

- **Service Role Key**: usala solo lato server, mai nel frontend
- **RLS**: le policy sono già configurate nello schema
- **Real-time**: necessario per sincronizzare più operatori
