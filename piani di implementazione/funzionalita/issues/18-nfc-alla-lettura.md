# NFC: cosa succede alla lettura

Tipo: grilling. Stato: **proposta dell'orchestratore, da confermare con l'utente** prima di N1. Fetta: N1. Dipende dal ticket 16.

## Question

Che cosa fa l'app quando legge un tag?

## Proposta dell'orchestratore

- Una lettura **non vende né paga mai da sola**.
  - Fuori dalle automazioni apre la **Scheda** del prodotto (o l'Azione rapida, come una lettura del codice).
  - In Vendita flash mostra il prodotto e **chiede conferma**.
  - Nelle altre automazioni vale come la lettura di un codice: stesse regole, stessi rifiuti.
- Il tag continua a contenere il **link GS1 di oggi**; un tag di posizione o di scaffale porta il loro codice.
- Il manifest resta **senza `NDEF_DISCOVERED`**: un tag non apre l'app da chiusa.
- Un tag sconosciuto dà un messaggio chiaro e nessuna scrittura.

## Come si torna indietro

La lettura passa dalla stessa strada del codice a barre: togliendo il comando NFC non cambia altro.
