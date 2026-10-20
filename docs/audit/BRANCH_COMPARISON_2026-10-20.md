# Confronto dei rami app — 20 ottobre 2026

## Riferimenti verificati

- `main` remoto: `741f2b1` — app React Native bare con `App.tsx`, React Navigation e schermate in `src/`.
- `feature/auth-and-sync`: `73f6d3b` — discende da `main` e aggiunge quattro commit, soprattutto flussi sperimentali auth/export e documentazione.
- Il grafo era fermo a `bac43a2`; è stato ricostruito dopo le correzioni.

## Differenze e problemi confermati

| Area | `main` | `feature/auth-and-sync` | Esito |
|---|---|---|---|
| Navigazione | React Navigation in `App.tsx` e `src/navigation/` | Schermate auth/export Expo Router in `app/` | Le nuove schermate non sono collegate al router della app nativa. |
| Sessione | Nessun AuthProvider attivo nel root RN | `AuthContext` usa `localStorage` per sessione/operatore | Non è storage utilizzabile in modo affidabile su Android/iOS. |
| Auth Google | Non verificata nel runtime mobile | Codice OAuth sperimentale | Le API chiamate non corrispondono alla versione installata di `expo-auth-session`; nessun login reale verificato. |
| Ruoli e cloud | Schema Supabase legacy | Inviti e sync sono piani, non funzioni complete | RLS confronta `auth.uid()` con `google_id` e manca una matrice di scrittura coerente; non va attivata senza migrazione e test. |
| Export/import | Flussi locali esistenti | CSV Supabase aggiunto | Il codice sperimentale ignora errori Supabase e non conserva l’intero array immagini del modello locale. |
| Sync LAN | Server mesh e client presenti | Non sostituisce la sync LAN | Il server mesh accettava richieste senza token, il client dichiarava join riuscito prima dell’ACK e alcuni delta venivano saltati. Corretto in questo aggiornamento. |

## Correzioni fatte su `main`

- Richiesto il token stanza per `pull`, `push`, chat e handshake WebSocket; rimosso il token da `/health`, dai log e dall’API di diagnostica.
- Portato il token stanza a 16 caratteri casuali sicuri; rimossi IP fittizi e fallback che dichiaravano host attivo senza server.
- L’import/pull ora segnala errori invece di rispondere con snapshot vuoto o `200` dopo un errore DB.
- Il push controlla delta su prodotti, automazioni, timeline, chat e membri, inclusi aggiornamenti e cancellazioni.
- Rimosso `supabaseAdmin` dal client importabile nell’app.

## Limiti ancora aperti

- Auth Google nativa, inviti, organizzazioni, policy RLS e sync cloud non sono implementati/verificati end-to-end.
- Il traffico LAN resta in chiaro: il pairing autentica i peer ma non cifra i dati. Usare solo su rete privata affidabile finché non viene introdotto TLS o un protocollo cifrato.
- La sync LAN non conserva ancora tombstone durevoli per le cancellazioni remote né risolve conflitti tra modifiche concorrenti.
- Restano da eseguire prove di pairing/sync su due dispositivi fisici; i test automatici disponibili sono mock.
- Il ramo feature non è stato unito: farlo così com’è reintrodurrebbe Expo Router e `localStorage` nella app bare RN.
