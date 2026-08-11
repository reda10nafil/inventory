# Cronologia e Stato della Migrazione: Syncro Flow (Expo → Flutter)

Questo documento riassume lo stato attuale del processo di migrazione dell'applicazione **Syncro Flow** (FurInventory Pro) da Expo/React Native a Flutter/Dart.

---

## 📅 Cronologia delle Attività Svolte

1. **Analisi Completa del Progetto React Native (Expo)**:
   - Esaminata la struttura delle directory, il file `package.json` (con oltre 100 dipendenze), e le configurazioni di build.
   - Analizzati tutti e 7 i Context Provider (`InventoryContext`, `CustomFieldsContext`, `LocationsContext`, etc.) che gestiscono lo stato globale dell'app con persistenza locale su `AsyncStorage`.
   - Analizzati i modelli dati principali (`Product`, `TimelineEvent`, `CustomField`, `Alert`) definiti in `types/index.ts`.
   - Studiate le utilità critiche del sistema: NFC (`nfcService.ts`), barcode (`barcodeDecoder.ts`), standard GS1 (`gs1.ts`), e gestione audio (`SoundService.ts`).

2. **Creazione e Approvazione del Piano di Implementazione**:
   - Creato un piano dettagliato per migrare ogni componente a Flutter utilizzando **Riverpod** per la gestione dello stato e pacchetti nativi Flutter equivalenti (es. `nfc_manager`, `mobile_scanner`, `shared_preferences`).
   - Il piano è stato approvato dall'utente e prevede la creazione del nuovo progetto in una sottocartella (`syncro_flow_flutter`), preservando l'app Expo originale.

3. **Inizializzazione del Task Tracker**:
   - Creato un file di tracciamento (`task.md`) strutturato in 9 fasi (Fase 0 - Fase 8) per monitorare lo sviluppo file per file.

4. **Installazione di Flutter SDK**:
   - Scaricato e clonato Flutter SDK (ramo stabile) direttamente in `C:\flutter`.
   - Aggiunta permanentemente la directory `C:\flutter\bin` al `PATH` di sistema dell'utente in Windows.
   - Risolto un problema di file di blocco (`lockfile`) residui che causavano il blocco dell'inizializzazione.
   - Eseguita con successo la prima compilazione e verifica con `flutter --version` (Flutter 3.44.2, Dart 3.12.2).

5. **Creazione Progetto Flutter (Completato)**:
   - Generati con successo i file di template del progetto (131 file scritti) nella sottocartella `syncro_flow_flutter`.

6. **Configurazione Dipendenze (pubspec.yaml) (Completato)**:
   - Aggiunte le 26 dipendenze necessarie per il funzionamento dell'app (Riverpod, GoRouter, sqlite, mobile_scanner, nfc_manager, audioplayers, etc.) con risoluzione automatica delle versioni compatibili.

7. **Copia delle Risorse (Asset) dell'Applicazione (Completato)**:
   - Copiati i file audio (beep) e le immagini (logo) dall'app Expo originale alla cartella `assets/` del progetto Flutter e registrati all'interno di `pubspec.yaml`.

---

## 📂 Cosa è stato Fatto e Dove

Tutti i file di pianificazione e controllo sono stati memorizzati nella cartella dei dati dell'assistente per non interferire con il codice sorgente del tuo progetto. 

Ecco i file creati finora con i loro percorsi assoluti:

* **Piano di Migrazione Dettagliato**:
  📄 [implementation_plan.md](file:///C:/Users/Primo/.gemini/antigravity-ide/brain/71f8fb31-5d2d-469b-9b4f-960dbd9158f4/implementation_plan.md)
  *Contiene la mappatura dei moduli React Native -> Flutter, le dipendenze da configurare, e l'ordine di sviluppo.*

* **Tabella di Marcia / Task Tracker**:
  📄 [task.md](file:///C:/Users/Primo/.gemini/antigravity-ide/brain/71f8fb31-5d2d-469b-9b4f-960dbd9158f4/task.md)
  *Un elenco di controllo (TODO list) per marcare lo stato di avanzamento di ogni singolo file durante lo sviluppo.*

* **Download e Configurazione Flutter SDK**:
  📂 Salvato nella cartella `C:\flutter` e configurato nel `PATH` di Windows.

* **Inizializzazione Progetto e Asset**:
  📂 Sottocartella `c:\Users\Primo\Desktop\inventory\syncro_flow_flutter` (template generato, dipendenze configurate e asset copiati).

---

## 🛠 Cosa Manca Ancora da Fare (I Prossimi Passi)

Siamo attualmente nella **Fase 0 (Setup)**. I prossimi passi operativi che eseguiremo sono:

1. **Configurazione Permessi (Fase 0)**:
   - Configurare i permessi per l'utilizzo dell'NFC e della fotocamera su Android (`AndroidManifest.xml`) e iOS (`Info.plist` / entitlements).

2. **Inizio dello Sviluppo (Fase 1 e successive)**:
   - **Fase 1 (Core)**: Definire il tema dark con dettagli in oro (`#D4AF37`) e creare i modelli dati in Dart corrispondenti a quelli TypeScript.
   - **Fase 2 (State)**: Creare i provider Riverpod per gestire lo stato locale (prodotti, posizioni, campi personalizzati) rimpiazzando AsyncStorage con SQLite (`sqflite`) o `shared_preferences`.
   - **Fase 3-8**: Sviluppare progressivamente i servizi di sistema, le schermate dei tab, i dettagli prodotto, lo scanner fotocamera, la gestione NFC e tutti i widget dinamici.
