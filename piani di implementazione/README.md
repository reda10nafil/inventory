# Piani di implementazione

Punto di riferimento per decisioni, stato verificato, lavoro da fare e cronologia.

## Documenti

- [Piano di implementazione](PIANO_IMPLEMENTAZIONE.md): requisiti, baseline, fasi, dipendenze, rischi e criteri di accettazione.
- [Cronologia](CRONOLOGIA.md): registro progressivo e aggiornabile delle attività e verifiche.

## Decisioni confermate il 20 ottobre 2026

1. React Native v1 e Flutter v2 sono due prodotti SaaS distinti.
2. Ogni prodotto avrà progetti Google Cloud e Supabase, OAuth, archivi file e backup separati.
3. Backup programmabili ogni giorno, settimana, mese o solo manualmente.
4. Prodotti, foto/documenti, CSV, PDF e cronologia devono essere consultabili e recuperabili da telefono o computer e disponibili sugli altri telefoni autorizzati.
5. Su telefono l'import deve funzionare tramite selezione file/condivisione e drag-and-drop dove il sistema operativo lo consente; su browser desktop anche tramite rilascio del file.
6. La prova Drive desiderata: login, creazione di prodotto sintetico con foto, export con link alle foto e verifica da un secondo dispositivo.

## Aggiornamento

Ogni sessione che cambia lo stato aggiunge una voce in CRONOLOGIA.md con data, branch/SHA, file/servizi, verifiche e attività aperte. Non dichiarare completata una funzione senza prova registrata. Aggiornare il piano quando cambiano requisiti o criteri.
