# Login Google funzionante

Tipo: grilling + research (L0) + task. Stato: **aperto**. Risposta dell'utente del 22 novembre 2026 sera: sì al login, **«a patto che funzioni»**. Fette: L0 (ricerca), L1, L2. Serve alle fette I2 e I3 (ticket 11).

## Question

Il login Google è spento dal commit `cfcdecb` (`LOGIN_ENABLED = false` in `contexts/AuthContext.tsx`): l'app è solo locale, spazio `local`. Come si riaccende senza rompere nulla e senza perdere i dati locali?

## Risposta (utente)

- **Login Google da riaccendere, a patto che funzioni**: prima va provato che funziona, su web e su Android; poi si riaccende il cloud per lo spazio.
- Ogni account ha il proprio spazio e il proprio backup; le foto restano private dello spazio (ticket 11).

## Schema Supabase letto dal database (22 novembre sera, sola lettura)

Copia fedele nelle note dell'orchestratore (`side-session-notes/local_12e15b39…/supabase-schema/`: 19 migrazioni e 16 funzioni, md5 uguale al database, più una fotografia dello stato). Da portare nel repository in L1.

- Bucket `organization-media`: esiste, privato, 500 MB per file, 0 oggetti. Zero utenti, zero righe, nessuna funzione edge.
- Avvisi di sicurezza: solo 3 WARN (funzioni `security definer` eseguibili da `authenticated`: `ensure_personal_organization`, `create_organization_invitation`, `accept_organization_invitation`).
- **Probabile guasto della sincronizzazione**: `merge_inventory_snapshot` è `security invoker` e chiama `public.is_organization_member`, su cui `authenticated` non ha `EXECUTE`. Dedotto dai cataloghi, non provato: da provare in L1 e correggere con una migrazione, con il sì dell'utente.
- Le tabelle vecchie (`users`, `operators`, `products`, `sync_logs`) e `update_updated_at_column` non sono in nessuna migrazione: ricostruire il database dalle sole migrazioni fallirebbe.
- Non verificabile da qui se l'API espone lo schema `auth_internal`.

## L0 — ricerca in sola lettura (chiusa il 22 novembre sera)

Resoconto completo, con file e righe: [`ricerche/L0-login.md`](../ricerche/L0-login.md). In breve:

- **Perché era spento**: non è documentato. Il 21 novembre l'utente disse solo «non funziona» (web su `:8081`). Nessun errore registrato e nessuna prova che il login abbia mai funzionato.
- **Causa più probabile, verificata il 22 sera**: in Supabase il **provider Google è spento** (acceso solo l'accesso via email). In più il progetto era **in pausa** (piano gratuito).
- **Supabase** (`ymsnlixracwjgajldryb`): riattivato il 22 sera con il sì dell'utente. 13 tabelle pubbliche con RLS e zero righe, 19 migrazioni. Sul piano gratuito torna in pausa dopo circa una settimana senza uso; in pausa si riattiva solo entro 90 giorni.
- **Lo schema vero non è nel repository**: `backend-auth/supabase/schema.sql` e `types.ts` sono quelli vecchi. Una copia fedele delle migrazioni è nelle note dell'orchestratore (`supabase-schema/`) e va portata nel repository in L1.
- **Flusso nel codice**: `supabase.auth.signInWithOAuth` con PKCE, via browser, uguale su web e Android. **Basta un client OAuth «Web application»**: il client Android e la SHA-1 non servono. Client ID e secret stanno solo in Supabase, mai nel repository.

Spetta all'utente (l'agente non inserisce credenziali né segreti):

1. Google Cloud Console, progetto `syncro-flow-app-20261020`: schermata di consenso con il proprio account tra i tester; client «Web application» con il redirect `https://ymsnlixracwjgajldryb.supabase.co/auth/v1/callback`.
2. Supabase › Authentication › Providers › Google: abilitare, incollare client ID e secret.
3. Supabase › Authentication › URL Configuration: `http://localhost:8082`, `http://localhost:8082/**` e `syncroflow://auth/callback`.
4. Fare l'accesso, prima sul web poi sul telefono.

Da fare nel codice in L1:

- **accesso facoltativo** da Impostazioni: lo spazio `local` resta usabile senza account, così un login rotto non blocca più l'app (proposta dell'orchestratore, da confermare);
- mostrare gli errori di ritorno (`error_description`) e l'accesso annullato;
- tenere `syncroflow://auth/callback` fuori dalla navigazione su Android;
- schema nel repository e `types.ts` rigenerato; documenti aggiornati alla porta 8082.

Avvisi per le fette dopo:

- L2: la copia dei dati locali va fatta **prima** del primo caricamento dello spazio dell'account. Dopo 900 ms l'app salva nel cloud lo stato vuoto, e al caricamento successivo la riga del cloud sovrascrive il locale.
- L2: nel cloud va solo l'inventario (prodotti, cronologia, avvisi, cartelle, eliminati). Posizioni, categorie, contatti, campi, layout, automazioni, GS1 e hardware no.
- I2: il caricamento delle foto su `organization-media` è già scritto in `InventoryContext`, mai provato.
- I3: il permesso Drive dura circa un'ora e Supabase non lo rinnova.

## L1 — login funzionante

- Su un **branch proprio**: `LOGIN_ENABLED` resta `false` su `funzioni/magazzino` finché L2 non è pronto, altrimenti si rompono le prove (`lib.cjs` carica `:local`) e la dimostrazione su `:8082`.
- Prova reale: l'accesso lo fa l'utente, sul web e sul telefono. Nessuna credenziale inserita dall'agente.

## L2 — dati locali al primo accesso

Oggi `loadData` migra solo le chiavi vecchie senza prefisso. Al primo accesso i dati `…:local` sparirebbero dalla vista e una copia nel cloud potrebbe sovrascrivere quella locale. Va previsto il passaggio dei dati locali allo spazio dell'account, per tutte le chiavi per spazio (prodotti, cronologia, posizioni, categorie, contatti, scaffali…), con una copia di sicurezza prima.

**Da confermare con l'utente** prima di L2: al primo accesso i dati locali diventano i dati dell'account (proposta), oppure si chiede ogni volta.

## Come si torna indietro

`LOGIN_ENABLED = false`: l'app torna locale. La copia di sicurezza dei dati `local` resta sul dispositivo.
