# Foto nel CSV: dove stanno e chi le vede

Tipo: grilling. Stato: **chiuso** il 22 novembre 2026 sera (risposte dell'utente). Fette: I2, I3. Dipende dal login (ticket 20) e dal formato (ticket 12).

## Question

Il CSV dei prodotti serve anche a un sito e-commerce: come ci arrivano le foto?

## Opzioni

- A. ZIP con il CSV e una cartella `immagini/` in WebP (colonna con il nome del file).
- B. Indirizzo di base da prefissare: l'utente carica la cartella sul suo sito.
- C. **Hosting sul cloud**: Supabase Storage o Google Drive.

## Risposta (utente)

**C, sul cloud**, con un'impostazione per scegliere tra **Supabase Storage** e **Google Drive**.

- Le foto si convertono in WebP prima del caricamento (ticket 12).
- Il CSV porta i link nella colonna «Immagini URL».
- **Link pubblici e permanenti** («chiunque abbia il link»), perché il sito mostra le foto da quei link. Questa risposta sostituisce la prima scelta dei link firmati: il bucket `organization-media` di oggi dà link firmati di 7 giorni, non adatti a un e-commerce.
- Quindi esiste una **copia WebP «di catalogo» pubblica**, separata dalle foto private dell'app:
  - su Supabase, un bucket pubblico nuovo (per esempio `catalogo-pubblico`): scrive solo chi è membro dello spazio, legge chiunque;
  - su Drive, file condivisi «chiunque abbia il link».
- **Le foto dentro l'app restano private dello spazio**: ogni account ha il proprio spazio e il proprio backup; le vedono l'amministratore e gli operatori invitati, come fa oggi `organization-media`.
- Il caricamento richiede il login, oggi spento: vedi il ticket 20.

## Da confermare (proposta dell'orchestratore, prima di I3)

Con Drive come destinazione le foto vanno nel Drive dell'amministratore e gli operatori ricevono la condivisione per email.

## Come si torna indietro

Togliere il caricamento della copia di catalogo: la colonna «Immagini URL» torna a contenere gli indirizzi di oggi. Il bucket pubblico si svuota e si elimina dalla dashboard.
