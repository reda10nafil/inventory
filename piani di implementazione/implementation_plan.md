# Piano di Implementazione — Fase 2: Colmare i Core Gaps

Ho letto approfonditamente i documenti `docs/diagnosi_gap_flutter.md` e `docs/piano_gap_implementazione.md`. Come hai giustamente fatto notare, i 6 problemi sistemati finora **erano solo la punta dell'iceberg**.
L'app Flutter attuale (`syncro_flow_flutter`) ha l'architettura corretta, ma molte funzionalità core sono state lasciate a uno stadio "mock" (finto) o parziale rispetto a React Native.

Ecco il piano per affrontare le mancanze più grandi e bloccanti, divise in 3 macro-aree prioritarie:

---

## 1. Gestione Prodotti e Campi Dinamici (Fase G1 & G2)

### 🛑 Il Problema
Attualmente è **impossibile modificare un prodotto**. La schermata non esiste. Inoltre, il componente che disegna i campi (`dynamic_field_renderer.dart`) supporta solo testo e numeri, ignorando completamente i campi data, foto multiple, file, selettori da dataset, ecc.

### 🛠️ Le Modifiche Proposte
- **Creare `ProductEditScreen`**: Una schermata da ~1000 righe analoga a quella React Native, che precarica i dati del prodotto e permette di salvarli in persistenza.
- **Aggiornare `DynamicFieldRenderer`**: Aggiungeremo il supporto completo per:
  - Date Picker (`showDatePicker`)
  - Stepper (min/max/step)
  - Dropdown con Dataset collegati (`linkTo`) e Modali di selezione
  - File picker e Image Picker (per campi custom foto e documenti)
- **Aggiungi Prodotto (Update)**: Aggiorneremo l'attuale form di inserimento per usare l'Image Picker reale (galleria + fotocamera) per catturare fino a 10 foto e salveremo i campi personalizzati con il loro "snapshot" come fa React Native.

---

## 2. Il Motore delle Automazioni Reali (Fase G4)

### 🛑 Il Problema
Se clicchi "Play" su un'automazione personalizzata, l'app ti fa vedere le schermate degli step, ma **non modifica nulla nel database**. Fa solo finta. Anche gli audit e le vendite rapide sono versioni molto ridotte e senza vera integrazione di sistema.

### 🛠️ Le Modifiche Proposte
- **Riscrittura `custom_runner_screen.dart`**: Implementeremo la logica vera:
  - *Scan*: Aprirà lo scanner fotocamera e validerà se l'elemento esiste.
  - *Move/Sell/Tag*: Applicherà la vera modifica sul database tramite `inventoryProvider.updateProduct`.
  - Riprodurrà i suoni corretti (Success, Anomaly, Blocking-Error) in base all'esito.
- **Audit e Spostamento Rapido**: Porting delle schermate React Native per gestire loop di scansioni continui, conteggi di sessione (trovati/mancanti) e report di fine audit.

---

## 3. Impostazioni e Funzionalità Native (Fase G3 & G5)

### 🛑 Il Problema
Molte impostazioni (come il generatore layout e modelli di settore) non salvano realmente i dati o mancano di opzioni (es. import/export JSON reale). Inoltre manca il servizio per decodificare barcode da una foto in galleria.

### 🛠️ Le Modifiche Proposte
- **Barcode Decoder**: Creazione di `barcode_decoder_service.dart` per leggere QR/Barcode importando una foto dalla galleria (funzionalità vitale per chi riceve codici su WhatsApp).
- **Template Settore**: Far sì che la schermata `sector_templates` importi **veramente** i campi nel database quando si sceglie un template.
- **Layout Builder**: Completare la schermata permettendo l'aggiunta, rimozione e riordino dei campi.
- **Export/Import**: Completare la funzione di backup in formato JSON (`share_screen.dart`).

---

## Domande per Te

> [!IMPORTANT]
> **Priorità di Partenza**
> Visto l'enorme carico di lavoro, da cosa preferisci che io parta immediatamente?
> 
> **A)** **Modifica Prodotto & Campi Dinamici** (così puoi finalmente editare i dati salvati e usare il layout avanzato).
> **B)** **Il Motore Automazioni** (così le automazioni che crei e avvii modificano realmente l'inventario).
> **C)** **L'Image Picker fotocamera** e i Servizi (Barcode decoder).

Non appena mi indichi la preferenza (A, B o C), inizio a scrivere il codice!
