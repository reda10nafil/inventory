# Synchroflow — Piano di implementazione Auth, Cloud e Qualità

## Stato verificato

- L'app mobile attiva è React Native CLI con React Navigation, non Expo Router.
- L'avvio è `App.tsx`; la navigazione è in `src/navigation/RootNavigator.tsx` e `src/navigation/TabsNavigator.tsx`.
- Le schermate native sono in `src/screens/`; lo stato locale è nei provider in `contexts/` e nel livello `src/db/`.
- Il modello prodotto attuale usa `images: string[]`: backup e cloud devono quindi conservare tutte le immagini, non un solo campo `image_url`.
- Esiste un progetto Supabase attivo denominato `syncro-flow`. Le tabelle pubbliche esistenti non hanno ancora RLS abilitata: non collegare il client mobile finché non sono state applicate policy basate su organizzazione e ruolo.

## Obiettivi

1. Un proprietario crea un'organizzazione e il suo inventario condiviso.
2. Ogni operatore usa il proprio account Google e il proprio telefono.
3. Il proprietario invita operatori con ruoli e permessi.
4. Gli operatori della stessa organizzazione vedono e aggiornano lo stesso inventario in tempo reale.
5. Foto, documenti e backup funzionano tra dispositivi senza dipendere da URI locali `file://`.
6. Il CSV mantiene tutti i dati e l'array completo dei link immagine.

## Modello account e inviti

### Ruoli iniziali

- `owner`: crea organizzazione, inventari, membri, inviti e ruoli.
- `admin`: gestisce inventario, team, inviti e impostazioni autorizzate.
- `operator`: crea e aggiorna prodotti, immagini, movimenti e automazioni autorizzate.
- `viewer`: sola consultazione.

### Flussi UI

- **Accedi**: login Google per un membro esistente.
- **Crea account proprietario**: login Google + nome organizzazione + primo profilo owner.
- **Accedi con invito**: apre QR/deep link, esegue login Google se necessario e accetta un invito valido.
- **Team**: il proprietario crea, revoca e rigenera inviti; visualizza ruoli e dispositivi/membri.
- **Cambia organizzazione/profilo**: disponibile solo agli utenti membri di più organizzazioni.

### Regole invito

- Token criptograficamente casuale, non prevedibile.
- Monouso, con scadenza e possibilità di revoca.
- Il token non espone dati dell'organizzazione.
- Il server verifica token, stato, scadenza e ruolo; il telefono non può assegnarsi ruoli autonomamente.

## Modello dati Supabase

Usare `auth.users` come identità Google e introdurre le seguenti tabelle, tutte con RLS:

- `profiles`: profilo utente applicativo, con `id = auth.users.id`.
- `organizations`: account/inventario del proprietario.
- `organization_members`: relazione tra utente, organizzazione e ruolo.
- `invitations`: token hashato, ruolo proposto, scadenza, creatore, stato di utilizzo/revoca.
- `products`: aggiungere `organization_id`, `created_by`, `updated_by`, `images jsonb` e controllo versione.
- `locations`, `folders`, `custom_fields`, `layouts`, `automations`: aggiungere `organization_id` e metadati autore.
- `activity_logs`: log immutabile di creazioni, modifiche, spostamenti, vendite, import e accettazione inviti.

Le operazioni privilegiate, come creare/accettare inviti e rimuovere membri, devono essere eseguite tramite Edge Functions. La chiave `service_role` non deve essere inserita nell'app o nel repository.

## Fase 1 — Correzione React Native

1. Non usare `app/(auth)` né Expo Router per le nuove funzionalità.
2. Creare i moduli nativi in `src/auth/`, `src/services/` e `src/screens/`.
3. Creare le schermate `LoginScreen`, `CreateOwnerAccountScreen`, `AcceptInviteScreen` e `BackupRestoreScreen`.
4. Registrarle in `src/navigation/RootNavigator.tsx` e aggiornare i tipi di navigazione e deep link `syncroflow://`.
5. Aggiungere un `AuthGate` che mostri il navigatore autenticato solo con sessione valida.
6. Usare `@react-native-async-storage/async-storage` per persistere sessione e organizzazione attiva; mai `localStorage`.
7. Documentare le variabili di ambiente senza pubblicare segreti.

Criterio di completamento: la struttura creata segue la navigazione reale dell'app, non rompe le schermate esistenti e non contiene segreti.

## Fase 2 — Auth Google e backend

1. Configurare Google OAuth nel progetto Supabase e nella console Google Cloud con redirect URI Android/iOS.
2. Implementare il flusso PKCE/deep link nativo con Supabase.
3. Gestire ripristino della sessione, logout, annullamento login e token scaduto.
4. Creare migration SQL per organizzazioni, membri, inviti e tracciamento autore.
5. Applicare RLS con policy testate per owner/admin/operator/viewer.
6. Generare tipi TypeScript dal database dopo ogni migration.

Criterio di completamento: un utente non può leggere o modificare l'inventario di un'altra organizzazione.

## Fase 3 — Immagini e documenti

1. Quando si aggiunge/modifica un prodotto, caricare ogni URI locale in storage cloud.
2. Salvare nel prodotto un array di oggetti immagine: URL o path storage, nome, mime type, dimensioni e ordine.
3. Conservare il caricamento in coda e ritentare quando il dispositivo torna online.
4. Usare URL firmati per asset privati; non rendere pubbliche le foto per default.
5. Eliminare o archiviare file cloud non più collegati a un prodotto.

Criterio di completamento: un secondo dispositivo autorizzato mostra tutte le immagini dello stesso prodotto.

## Fase 4 — Backup, CSV e import

### Contratto CSV

Usare un campo JSON per tutti gli URL immagini:

```csv
id,sku,fur_type,location,status,images_json,custom_data_json
"uuid","FUR-2026-001","visone","magazzino-a","available","[\"storage/path/1.jpg\",\"storage/path/2.jpg\"]","{\"taglia\":\"42\"}"
```

### Comportamento

- Export di prodotti, immagini, posizioni, cartelle, campi, layout e automazioni.
- Import con anteprima, validazione, conteggio e report errori.
- Import idempotente con ID/stabile chiave di import, per evitare duplicati quando un backup viene ripetuto.
- Esportazione tramite Share Sheet e importazione tramite file picker su mobile.
- Vera area drag & drop solo nella futura app web; sui telefoni usare selezione/condivisione file nativa.

Criterio di completamento: export -> installazione/app su secondo telefono -> import mantiene prodotti e tutti i link immagini.

## Fase 5 — Real-time e conflitti

1. Abilitare Realtime solo sulle tabelle dell'organizzazione necessarie.
2. Filtrare subscription per `organization_id`.
3. Aggiornare lista, dettaglio, cronologia e contatori quando cambia un prodotto.
4. Salvare `updated_by`, `updated_at` e `version` per ogni modifica.
5. In caso di conflitto, avvisare l'operatore e proporre refresh/risoluzione; non sovrascrivere silenziosamente dati recenti.
6. Integrare la chat/team LAN esistente come supporto locale, mantenendo Supabase come fonte cloud dei dati condivisi.

Criterio di completamento: due emulatori con operatori diversi della stessa organizzazione vedono una modifica entro pochi secondi.

## Fase 6 — Revisione funzionale

Dopo le fasi precedenti, audit completo di:

- Add/Edit/Detail prodotto e immagini multiple.
- Scanner QR/barcode, NFC, GS1 Digital Link e condivisione.
- Cartelle, posizioni, campi personalizzati, layout e cestino.
- Automazioni built-in e personalizzate.
- Timeline, log attività, ruoli e inviti.
- Backup/import/export e uso offline.

## Miglioramenti successivi

### Layout Builder

- Riordinamento reale con drag gesture.
- Anteprima live della schermata Aggiungi.
- Regole di visibilità condizionale e campi obbligatori per categoria.
- Template esportabili/importabili per organizzazione.

### Campi personalizzati

- Validazione per tipo, unità, regex e min/max.
- Calcoli automatici e campi derivati.
- Tipi nativi barcode, immagine, documento, firma e selettore membro.
- Opzioni dinamiche per cartelle, posizioni e operatori.

### Automazioni

Nuovi step candidati:

- Scansiona QR/NFC/barcode.
- Richiedi foto obbligatoria.
- Sposta quantità o prodotto.
- Aggiorna stato/campo/tag.
- Chiedi approvazione a owner/admin.
- Invia notifica a membro/team.
- Controlla scorta e crea alert.
- Esporta report o invoca webhook autorizzato.
- Crea task di audit o manutenzione.

## Test richiesti

- TypeScript e lint senza nuovi errori.
- Test unitari per serializzazione CSV/JSON, import immagini e policy di ruolo.
- Test integrazione per OAuth e accettazione invito.
- Test manuale su due telefoni/emulatori: owner + operator.
- Test di sicurezza: utente esterno, invito scaduto, invito revocato, token riutilizzato, tentativo di accesso cross-organizzazione.
- Test offline/retry per upload e sincronizzazione.

## Regola di rilascio

Nessuna merge in `main` finché non sono stati verificati almeno: login, invito, RLS, upload immagini, export/import con `images_json`, e sync real-time su due dispositivi.