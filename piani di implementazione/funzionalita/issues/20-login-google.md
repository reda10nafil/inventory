# Login Google funzionante

Tipo: grilling + research (L0) + task. Stato: **aperto**. Risposta dell'utente del 22 novembre 2026 sera: sì al login, **«a patto che funzioni»**. Fette: L0 (ricerca), L1, L2. Serve alle fette I2 e I3 (ticket 11).

## Question

Il login Google è spento dal commit `cfcdecb` (`LOGIN_ENABLED = false` in `contexts/AuthContext.tsx`): l'app è solo locale, spazio `local`. Come si riaccende senza rompere nulla e senza perdere i dati locali?

## Risposta (utente)

- **Login Google da riaccendere, a patto che funzioni**: prima va provato che funziona, su web e su Android; poi si riaccende il cloud per lo spazio.
- Ogni account ha il proprio spazio e il proprio backup; le foto restano private dello spazio (ticket 11).

## L0 — ricerca in sola lettura

Perché è stato spento, quale configurazione OAuth e Supabase esiste (progetto `ymsnlixracwjgajldryb`), che cosa serve nella Google Cloud Console (client web e client Android con la SHA-1 della chiave di debug) e che cosa può fare solo l'utente. Avviata il 22 novembre sera; l'esito va riportato qui.

## L1 — login funzionante

- Su un **branch proprio**: `LOGIN_ENABLED` resta `false` su `funzioni/magazzino` finché L2 non è pronto, altrimenti si rompono le prove (`lib.cjs` carica `:local`) e la dimostrazione su `:8082`.
- Prova reale: l'accesso lo fa l'utente, sul web e sul telefono. Nessuna credenziale inserita dall'agente.

## L2 — dati locali al primo accesso

Oggi `loadData` migra solo le chiavi vecchie senza prefisso. Al primo accesso i dati `…:local` sparirebbero dalla vista e una copia nel cloud potrebbe sovrascrivere quella locale. Va previsto il passaggio dei dati locali allo spazio dell'account, per tutte le chiavi per spazio (prodotti, cronologia, posizioni, categorie, contatti, scaffali…), con una copia di sicurezza prima.

**Da confermare con l'utente** prima di L2: al primo accesso i dati locali diventano i dati dell'account (proposta), oppure si chiede ogni volta.

## Come si torna indietro

`LOGIN_ENABLED = false`: l'app torna locale. La copia di sicurezza dei dati `local` resta sul dispositivo.
