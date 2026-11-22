# N0 — NFC: zittire Android senza ascolto continuo (ticket 17r)

Ricerca in sola lettura del 22 novembre 2026. Worktree `D:\FurInventory Pro\inventory-stili`, branch `funzioni/magazzino`. Nessun file del repository è stato modificato.

Versioni lette: React Native 0.81.5, `react-native-nfc-manager` **3.17.2** (`node_modules/react-native-nfc-manager/package.json:3`; in `package.json:124` è `^3.17.2`). Tutti i numeri di riga della libreria valgono per la 3.17.2.

Abbreviazioni dei percorsi:
- `LIB` = `node_modules/react-native-nfc-manager`
- `NfcManager.java` = `LIB/android/src/main/java/community/revteltech/nfc/NfcManager.java`
- `RN` = `node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react`

Legenda:
- **[V]** verificato nel sorgente (file e riga).
- **[D]** dedotto: documentazione Android letta oggi, codice AOSP 13 letto tramite sintesi automatica (non riga per riga), o ragionamento sul sorgente.
- **[T]** da provare sul telefono. Nulla di questo documento è stato provato su un dispositivo.

---

## 0. In breve

1. **Opzione consigliata: (a) reader mode come «silenziatore» fisso**, registrato una volta all'avvio e mai tolto mentre l'app è in primo piano. Android consegna il tag all'app invece di aprire il browser. L'app non ha nessun ascoltatore e lo scarta.
2. **Non è un ascolto continuo**: a riposo non c'è nessun ascoltatore JS e nessuna richiesta in corso. Il codice dell'app parte solo dopo la pressione di un pulsante e si ferma al primo tag, al tempo limite o ad Annulla.
3. **Difetto trovato nel flusso di oggi** (Scheda › Programma NFC): il secondo passo parte 500 ms dopo il primo, ma la pulizia del primo passo spegne l'NFC dopo 1000 ms. Il secondo passo resta appeso. [D dal sorgente, T]
4. **Rischi principali**: la libreria 3.x è dichiarata solo per la vecchia architettura (`LIB/README.md:15-18`) e il progetto ha `newArchEnabled=true` (`android/gradle.properties:38`); i flag del reader mode vanno passati a mano (il valore predefinito 0 non attiva nulla); con l'app aperta il telefono non fa da carta contactless (Wallet).
5. **Niente da cambiare** in `AndroidManifest.xml` e in `MainActivity.kt` per l'opzione (a).

---

## 1. Che cosa succede oggi

### 1.1 Stato del codice

- `utils/nfcService.ts:131` crea un singleton all'import. Il costruttore chiama `NfcManager.start()` (`:9-15`). [V]
- Ogni operazione usa `NfcManager.requestTechnology(NfcTech.Ndef, { alertMessage })` (`:37`, `:70`, `:100`) e chiude con `NfcManager.cancelTechnologyRequest()` **senza `await`** (`:58`, `:89`, `:124`). [V]
- Chiamanti: `src/screens/product/DetailScreen.tsx:768-795` (pulisci + scrivi) e `src/screens/settings/HardwareScreen.tsx:20-36` (solo `isSupported`/`isEnabled`). `readTag` non ha chiamanti. `nfcService.cancel` non ha chiamanti. [V]
- Nessuno nel progetto chiama `registerTagEvent` o `setEventListener`. [V, ricerca su tutti i sorgenti fuori da `node_modules` e `syncro_flow_flutter`]
- Manifest: permesso NFC (`android/app/src/main/AndroidManifest.xml:4`), `launchMode="singleTask"` (`:17`), un solo filtro `VIEW` per `syncroflow://` (`:22-27`). Nessun filtro NFC. [V]
- `MainActivity.kt:10-34` non ridefinisce `onNewIntent`, `onPause`, `onResume`. [V]
- `alertMessage` su Android non viene letto: il lato nativo legge solo `isReaderModeEnabled`, `readerModeFlags`, `readerModeDelay` (`NfcManager.java:1115-1117`). Quindi oggi su Android non compare nessun invito «Avvicina il tag». [V]
- `requestTechnology` non ha tempo limite, né in JS (`LIB/src/NfcManagerAndroid.js:26-44`) né nel nativo (`NfcManager.java:129-143`). [V]

### 1.2 Tag sul telefono, app in primo piano, nessuna richiesta in corso

- La libreria non ha nessuna registrazione attiva: `isForegroundEnabled` diventa `true` solo in `registerTagEvent` (`NfcManager.java:1120`), che oggi è chiamato solo dentro `requestTechnology` (`LIB/src/NfcManagerAndroid.js:32-38`). [V]
- Quindi decide Android con il suo smistamento normale dei tag. [D, guida Android «NFC basics»]
  - Tag con link `https://…`: Android avvia l'app che gestisce quel link, cioè il browser. L'app va in secondo piano (`onHostPause`, `NfcManager.java:1185-1190`).
  - Tag vuoto o senza NDEF: Android prova `TECH_DISCOVERED` e poi `TAG_DISCOVERED`. Su molti telefoni compare «Nuovo tag acquisito» o solo il suono.
- L'app non riceve nulla: nessun `onNewIntent`, nessun evento. [V per l'assenza di filtri; D per il resto]
- Da Android 16 i tag con link web arrivano come `ACTION_VIEW`. Da Android 17 il sistema mostra una notifica «apri link» e apre solo dopo il tocco dell'utente. [D, guida Android letta oggi] Su Android 17 il problema del browser quindi si riduce da solo, ma resta la notifica.

### 1.3 Subito dopo una scrittura riuscita, con il tag ancora appoggiato

Sequenza per una singola scrittura (`writeGS1Uri`):

1. `requestTechnology` non trova una registrazione e la crea con le opzioni predefinite: `isReaderModeEnabled: false`, cioè **foreground dispatch** (`LIB/src/NfcManager.js:40-46`, `NfcManager.java:1245-1246`). Segna `cleanUpTagRegistration = true` (`LIB/src/NfcManagerAndroid.js:35-38`). [V]
2. Scrittura (`NfcManager.java:241-269`). [V]
3. `cancelTechnologyRequest()`: chiude la richiesta nativa (`NfcManager.java:112-127`), **aspetta 1000 ms**, poi chiama `unregisterTagEvent` (`LIB/src/NfcManagerAndroid.js:46-56`), che disattiva il foreground dispatch (`NfcManager.java:1144-1158`). [V]
4. Nel primo secondo: se il tag viene riscoperto, l'intent arriva all'app, la libreria emette `NfcManagerDiscoverTag` (`NfcManager.java:1326-1338`) e nessuno lo ascolta (`LIB/src/NfcManager.js:163-168`). Non succede nulla, a parte il suono di sistema. [V]
5. Dopo il primo secondo: l'app non ha più priorità. Se il tag resta fermo e ben accoppiato, Android non lo riconsegna. [D, T] Se il tag si muove, perde il campo per un attimo o viene riappoggiato, Android lo riscopre e **apre il browser con il link appena scritto**. [D, T]

### 1.4 Difetto: gara tra «Pulisci» e «Scrivi» (Scheda prodotto)

Linea del tempo, dedotta dal sorgente:

| Istante | Che cosa succede | Riga |
|---|---|---|
| t0 | Pulizia scritta. `cleanTag` ritorna `true` senza aspettare l'annullamento. | `utils/nfcService.ts:58-60` |
| t0 | Annullamento nativo fatto. Il JS aspetta 1000 ms prima di togliere la registrazione. | `LIB/src/NfcManagerAndroid.js:50-55` |
| t0 + 500 ms | Parte `writeGS1Uri`. Trova la registrazione ancora viva e non ne crea una nuova. La richiesta nativa resta in attesa. | `DetailScreen.tsx:783-790`, `NfcManagerAndroid.js:32-40` |
| t0 + 1000 ms | La pulizia del passo 1 toglie la registrazione sotto i piedi del passo 2. | `NfcManager.java:1144-1158` |
| dopo | Il tocco successivo va ad Android, non all'app. La promessa del passo 2 non si chiude mai: nessun messaggio. | — |
| tentativo dopo | Errore «You can only issue one request at a time» (`NfcManager.java:137-138`), poi due avvisi insieme. | — |

Conseguenza attesa: il secondo passo riesce solo se il tag viene riappoggiato tra 500 e 1000 ms. [D, T — prova P11]

---

## 2. Opzioni per zittire

### 2.0 Fatti comuni sulla libreria

- `requestTechnology` **non sceglie** tra reader mode e foreground dispatch. Usa la registrazione che trova. Se non c'è, la crea con le opzioni ricevute; senza opzioni è foreground dispatch. (`LIB/src/NfcManagerAndroid.js:26-44`, `LIB/src/NfcManager.js:40-46`) [V]
- Se la registrazione esiste già, `cleanUpTagRegistration` resta `false`: `cancelTechnologyRequest` non aspetta 1 s e non toglie nulla (`LIB/src/NfcManagerAndroid.js:52-56`). [V]
- Sospensione e ripresa: `onHostPause` disattiva sempre (`NfcManager.java:1185-1190`); `onHostResume` riattiva da sola se `isForegroundEnabled` è vero (`:1176-1183`). Vale per tutte e due le modalità. [V]
- Se la libreria viene caricata ad app già aperta, React Native le rimanda subito `onHostResume` (`RN/bridge/ReactContext.java:204-231`). [V]
- `MainActivity` non serve: `ReactActivity.onNewIntent` (`RN/ReactActivity.java:130-134`) passa gli intent ai moduli (`RN/runtime/ReactHostImpl.kt:599-611`, `RN/bridge/ReactContext.java:283-293`). [V]
- Su iOS `registerTagEvent` apre il pannello di sistema (`LIB/ios/NfcManager.m:339-347`). Il silenziatore va quindi limitato ad Android. [V]

### 2.a Reader mode con ascoltatore assente — **consigliata**

**Supporto nella 3.17.2: sì.** Opzioni in `LIB/index.d.ts:81-87`, costanti in `LIB/src/NfcManagerAndroid.js:8-16` (esportate come `NfcAdapter`, `LIB/src/index.js:28`), attivazione in `NfcManager.java:1205-1243`. [V]

Chiamate esatte:

```ts
import NfcManager, { NfcAdapter, NfcEvents } from 'react-native-nfc-manager';

const SILENZIATORE = {
  isReaderModeEnabled: true,
  readerModeFlags:
    NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_NFC_B |
    NfcAdapter.FLAG_READER_NFC_F | NfcAdapter.FLAG_READER_NFC_V |
    NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS,        // 0x10F = 271
  readerModeDelay: 500,                               // da tarare sul telefono
};

await NfcManager.start();                              // una volta sola
await NfcManager.registerTagEvent(SILENZIATORE);       // una volta sola
NfcManager.setEventListener(NfcEvents.DiscoverTag, null); // a riposo: nessun ascoltatore
```

Punti fermi:

- **I flag sono obbligatori.** Il valore predefinito della libreria è `readerModeFlags: 0` (`LIB/src/NfcManager.js:44`). [V] Con 0 Android considera il reader mode spento. [D, AOSP 13 `NfcActivityManager`: applica il reader mode solo se i flag sono diversi da zero] Servono i bit delle tecnologie (A, B, F, V).
- **Che cosa fa il nativo quando arriva un tag** (`NfcManager.java:1212-1237`): legge il messaggio NDEF già in memoria, emette `NfcManagerDiscoverTag` (`:1226`) e, solo se c'è una richiesta in attesa, la collega (`:1227-1235`). Senza ascoltatore e senza richiesta non succede altro. [V]
- **Nessun intent**: il tag arriva con una callback, non con `onNewIntent`. L'Activity non va in pausa. [D, documentazione di `enableReaderMode`]
- **Suoni**: con `FLAG_READER_NO_PLATFORM_SOUNDS` Android non suona e non vibra. [D, documentazione Android e AOSP 13] Il riscontro (vibrazione) lo dà l'app, solo quando accetta davvero una lettura.
- **Non usare `FLAG_READER_SKIP_NDEF_CHECK` nella registrazione fissa.** Con quel flag Android non elenca la tecnologia `Ndef` sul tag. [D, documentazione di `enableReaderMode`] La richiesta `requestTechnology(NfcTech.Ndef)` allora non si collega (`TagTechnologyRequest.java:61-121`), ritorna `null` (`NfcManager.java:1231-1233`) e la scrittura dà «unsupported tag api» (`:248-250`). [V]
- **Carta contactless**: in reader mode Android spegne l'emulazione di carta finché l'Activity è in primo piano. [D, documentazione di `enableReaderMode`] Con Syncro Flow aperto, Google Wallet non paga. Fuori dall'app torna normale.

Convivenza con `requestTechnology`:

- Non va smontato nulla. La registrazione fissa è già quella che `requestTechnology` usa. [V]
- `cancelTechnologyRequest` torna subito, senza il secondo di attesa. [V]
- **Mai chiamare `unregisterTagEvent` con l'app in primo piano.** Spegnere il reader mode con un tag appoggiato lo fa riscoprire da Android, che apre il browser. [D, AOSP 13 `NfcService`: allo spegnimento ferma il controllo di presenza; T]
- Per sicurezza passare `SILENZIATORE` anche a `requestTechnology(tech, SILENZIATORE)`: se la registrazione mancasse, quella implicita sarebbe comunque in reader mode.
- Chiamare `registerTagEvent` una volta sola: ogni chiamata aggiunge filtri alle liste interne (`NfcManager.java:1129-1136`), e `unregisterTagEvent` ne svuota solo una (`:1151`). [V]

Rischi di gara:

- Nel reader mode la callback usa `synchronized (this)` sull'oggetto callback (`NfcManager.java:1213`), mentre `cancelTechnologyRequest` blocca il modulo (`:114`). Sono due lucchetti diversi. Un annullamento nello stesso istante di un tocco può trovare `techRequest` a metà (`:1227-1233`). [V] Effetto atteso: un errore nei log, non un blocco. [D, T — prova P10]
- Durante una scrittura la libreria emette comunque l'evento del tag (`:1226`) prima di collegare la richiesta. L'eventuale ascoltatore deve ignorarlo. [V]
- NFC acceso dalla tendina con l'app aperta: l'Activity non va in pausa, quindi nessuno riattiva il reader mode. Riapplicare la registrazione sull'evento `NfcEvents.StateChanged` con stato `on` (`NfcManager.java:1285-1319`, `LIB/src/NfcManager.js:185-190`). [V per l'evento; T]

Consumo: Android cerca tag comunque quando lo schermo è sbloccato. [D, guida Android] Il reader mode non aggiunge ricerca; limita le tecnologie e spegne l'emulazione di carta. Il controllo di presenza gira solo mentre un tag è appoggiato. [D]

Variante «muto totale» (facoltativa, non per N1): un secondo profilo con `FLAG_READER_SKIP_NDEF_CHECK`, sostituito a quello attivo solo durante un'operazione. Vantaggio: a riposo Android non legge la memoria del tag ed evita un possibile avviso di sistema «errore di lettura» sui tocchi sporchi. [D] Costo: lo scambio non è atomico e non è provato. Da valutare solo se la prova P3 mostra l'avviso.

### 2.b Foreground dispatch con gestore vuoto

**Supporto nella 3.17.2: sì.** È la modalità predefinita.

```ts
await NfcManager.start();
await NfcManager.registerTagEvent();                      // isReaderModeEnabled: false
NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
```

- Filtri registrati: NDEF con MIME qualunque, `TECH_DISCOVERED` con `Ndef`, `TAG_DISCOVERED` (`NfcManager.java:1122-1136`). Un tag con link dovrebbe arrivare come `TECH_DISCOVERED`, senza indirizzo (commento a `:1131`). [V per i filtri; D per l'esito]
- Arrivo: `onNewIntent` → `parseNfcIntent` → evento `NfcManagerDiscoverTag` (`:1326-1338`). Senza ascoltatore viene scartato. [V]
- Convive con `requestTechnology` allo stesso modo di (a): registrazione riusata, nessuna attesa. [V]
- Difetti:
  - Android consegna l'intent mettendo l'Activity in pausa e poi riprendendola, a ogni tag. [D, comportamento documentato di `onNewIntent`; T] La libreria spegne e riaccende il dispatch a ogni giro (`:1176-1190`). Oggi nessun file usa `AppState` [V], ma ogni logica futura legata alla ripresa scatterebbe a ogni tag.
  - Il suono e la vibrazione di sistema non si possono togliere. [D]
  - Se l'intent arrivasse con un indirizzo (`NDEF_DISCOVERED` o `VIEW`), React Native emetterebbe un evento `url` (`RN/runtime/ReactHostImpl.kt:602-610`) che `contexts/AuthContext.tsx:123` ascolta. [V per il codice; D/T per il caso]
  - Android 16: avviso all'utente al primo intent NFC ricevuto da un'app, con possibilità di bloccarla. Android 17: per ricevere intent NFC con target SDK oltre il 36 serve proteggere l'Activity con `DISPATCH_NFC_MESSAGE`. [D, guida Android]
- Pregio: l'emulazione di carta (Wallet) resta attiva.

### 2.c Niente

- Nessun codice. Resta tutto come al punto 1: browser o «Nuovo tag acquisito», e il browser dopo una scrittura.
- Su Android 17 il browser non parte più da solo: compare una notifica. [D]

### 2.d Fuori portata: spegnere la ricerca (Android 15+)

`NfcAdapter.setDiscoveryTechnology(activity, FLAG_READER_DISABLE, FLAG_LISTEN_KEEP)` spegne la ricerca dei tag e lascia attiva la carta. [D, documentazione Android, API 35] È il silenzio più pulito, ma: non esiste nella libreria 3.17.2 [V, ricerca nel sorgente], richiede codice nativo, vale solo da Android 15 ed è dichiarata incompatibile con `enableReaderMode`. Da tenere come idea futura.

### 2.e Confronto

| | (a) reader mode | (b) foreground dispatch | (c) niente |
|---|---|---|---|
| Browser / «Nuovo tag» con app aperta | no | no | sì |
| Suono di sistema | no | sì | sì |
| Activity in pausa a ogni tag | no | sì [D] | sì (va nel browser) |
| Carta contactless con app aperta | **no** | sì | sì |
| Modifiche a manifest / MainActivity | nessuna | nessuna | nessuna |
| Dipende da intent NFC (Android 16-17) | no | sì | — |
| Riletture dopo scrittura | scartate | scartate, con suono | browser |

### 2.f Differenze tra versioni di Android

- **12**: i `PendingIntent` devono dichiarare la mutabilità. La libreria lo fa (`NfcManager.java:1263-1266`). Riguarda solo (b). [V]
- **13-15**: nessun cambiamento documentato per `enableReaderMode`. La 15 aggiunge `setDiscoveryTechnology`. [D]
- **16**: link web come `ACTION_VIEW`; avviso e lista «Avvio tramite NFC» per le app che ricevono intent NFC. [D]
- **17**: notifica «apri link»; permesso `DISPATCH_NFC_MESSAGE` per gli intent. [D]
- Il reader mode usa una callback e non intent: le novità di 16 e 17 non dovrebbero toccarlo. [D, T]

### 2.g La vecchia app Flutter: che cosa evitare

- Foreground dispatch con filtri e liste nulli, cioè «prendi tutto» (`syncro_flow_flutter/android/app/src/main/kotlin/com/redako35/syncro_flow/MainActivity.kt:24-27`).
- Filtri `NDEF_DISCOVERED` nel manifest: l'app si apriva da sola (`syncro_flow_flutter/android/app/src/main/AndroidManifest.xml:36-49`).
- Pausa fissa a tempo dopo ogni operazione (`syncro_flow_flutter/lib/services/nfc_coordinator.dart:17-18`): una pausa non distingue il tag appena scritto da un tag nuovo, e allo scadere la lettura riparte.
- Dispatch acceso e spento a ogni operazione (`nfc_coordinator.dart:64-70`, `:74-81`).

Il disegno al punto 4 fa il contrario: registrazione fissa, nessun filtro nel manifest, lettura solo dentro un'operazione avviata a mano, ignora per identità del tag e non solo per tempo.

---

## 3. Evitare la rilettura dopo la scrittura

1. **Con il silenziatore il problema cambia natura.** Finita la scrittura il servizio torna a riposo. Se Android riscopre il tag, lo consegna all'app, che lo scarta. Niente browser, niente azione. [V per il percorso nel codice; T]
2. **`readerModeDelay`** diventa `EXTRA_READER_PRESENCE_CHECK_DELAY` (`NfcManager.java:1209`). [V] È l'intervallo con cui Android controlla se il tag è ancora lì. Non è una pausa contro le riletture. Valore della libreria: 250 ms (`LIB/src/NfcManager.js:45`) [V]; valore di Android: 125 ms [D, AOSP 13]. Un valore più alto (500-1000 ms) rende meno frequenti le riscoperte di un tag che «balla». [D, T] Non basta da solo.
3. **Ignorare lo stesso tag per N secondi**: è logica JS sull'`id` del tag. La libreria lo fornisce in esadecimale (`Util.java:30`, `:61`). [V] Se l'`id` manca, usare come chiave il testo letto.
4. **Non riarmare finché il tag non si è allontanato**: l'API giusta è `NfcAdapter.ignore(tag, debounceMs, …)` (API 24). [D, documentazione Android] La libreria 3.17.2 non la espone. [V, ricerca nel sorgente] Sostituto in JS: ogni volta che lo stesso tag viene rivisto durante la pausa, la pausa riparte. Un tag appoggiato che «balla» resta ignorato finché non sparisce per tutta la pausa.
5. «Un tag fermo non viene riconsegnato finché non perde il campo» è un comportamento atteso di Android, non verificato. [D, T — prova P6]

---

## 4. Disegno consigliato per N1 e N2

### 4.1 File

| File | Contenuto | Dipendenze | Jest |
|---|---|---|---|
| `utils/nfcGate.ts` | Logica pura: stati, tempi, ignora-stesso-tag | nessuna | sì |
| `utils/nfcDecode.ts` | Dal tag grezzo a `{id, testo, tipo}` | solo `react-native-nfc-manager/ndef-lib` | sì |
| `utils/nfcCore.ts` | `creaServizioNfc(driver)`: silenziatore, lettura, serie, scrittura | `nfcGate`, `nfcDecode` | sì, con driver finto |
| `utils/nfcService.ts` | Driver vero + singleton. Poche righe. | `react-native-nfc-manager`, `nfcCore` | no |
| `utils/nfcService.web.ts` | Web: stessa interfaccia, tutto «non disponibile» | nessuna | no |
| `__tests__/nfcGate.test.ts`, `nfcCore.test.ts` | Test | i tre file provabili | — |

Perché la divisione: `LIB/src/index.js` è scritto con `import` e `jest.config.js` non trasforma quel pacchetto (`transformIgnorePatterns`). Un file che importa la libreria non si carica in jest. [V] Per questo il «driver» (le poche chiamate della libreria) entra in `nfcCore.ts` come parametro e solo `nfcService.ts` importa la libreria. In alternativa N1 deve aggiungere `react-native-nfc-manager` alla lista dei pacchetti trasformati.

`ndef-lib` invece si carica senza trasformazione: tutti i suoi file usano `require` e nessuno importa `react-native`. [V, `LIB/ndef-lib/*.js`]

### 4.2 Dove vive il silenziatore

- Nel servizio (`utils/nfcCore.ts`, esposto da `utils/nfcService.ts`), funzione `avviaSilenziatore()`. Solo Android.
- Chiamata **una volta** dalla radice dell'app (`App.tsx`), non dalle schermate. Niente effetti all'import del modulo (oggi `nfcService.ts:131` avvia l'NFC all'import).
- Riapplicata su `NfcEvents.StateChanged` = `on`.
- Mai rimossa in primo piano. In pausa ci pensa la libreria.
- Ogni operazione chiama prima `assicuraSilenziatore()` (idempotente).

### 4.3 Stati

`riposo` → `lettura` | `serie` | `scrittura` → `riposo`. Una sola operazione alla volta: una seconda richiesta riceve `occupato`.

| Stato | Ascoltatore JS | Che cosa fa un tag |
|---|---|---|
| `riposo` | nessuno | scartato |
| `lettura` | attivo | il primo tag è consegnato, poi `riposo` |
| `serie` | attivo | filtrato da riarmo e pausa |
| `scrittura` | nessuno | serve solo alla richiesta di scrittura |

Lettura e serie usano l'evento `NfcManagerDiscoverTag`: il contenuto è già nell'evento, non serve `requestTechnology`. Si evita così la gara descritta in 2.a. La scrittura usa `requestTechnology(NfcTech.Ndef, SILENZIATORE)` + `ndefHandler.writeNdefMessage` + `await cancelTechnologyRequest()`.

### 4.4 Interfaccia proposta

```ts
type EsitoNfc =
  | { esito: 'letto'; id: string | null; testo: string | null; tipo: 'uri' | 'testo' | 'vuoto' | 'non-ndef' }
  | { esito: 'scritto'; id: string | null }
  | { esito: 'annullato' | 'tempo-scaduto' | 'occupato' | 'non-disponibile' | 'nfc-spento' }
  | { esito: 'errore'; messaggio: string };

nfcService.disponibile(): boolean                 // false sul web
nfcService.stato(): Promise<'assente' | 'spento' | 'attivo'>
nfcService.avviaSilenziatore(): Promise<void>
nfcService.leggiUnTag(opz?: { tempoLimiteMs?: number }): Promise<EsitoNfc>   // predefinito 20 s
nfcService.avviaSerie(opz: {
  riarmoMs?: number;            // predefinito 1500
  pausaStessoTagMs?: number;    // predefinito 3000
  inattivitaMs?: number;        // predefinito 60000
  suTag: (t: EsitoNfc) => void;
  suFine: (motivo: 'stop' | 'inattivita' | 'errore') => void;
}): { ferma(): void }
nfcService.scriviLink(uri: string, opz?: { tempoLimiteMs?: number }): Promise<EsitoNfc>
nfcService.annulla(): void
```

Il servizio restituisce solo dati. Non importa nessun context e non chiama vendita, pagamento o movimenti.

### 4.5 Logica pura (`utils/nfcGate.ts`)

```ts
riduci(stato, evento, ora, cfg) → { stato, effetti }
```

- Eventi: `AVVIA_LETTURA`, `AVVIA_SERIE`, `AVVIA_SCRITTURA`, `TAG {id, testo}`, `SCRITTO {id}`, `ANNULLA`, `STOP`, `TIC`.
- Effetti: `CONSEGNA`, `SCARTA {motivo}`, `FINE {motivo}`, `ASCOLTA`, `NON_ASCOLTARE`.
- Il tempo entra come parametro `ora`. Le scadenze sono numeri nello stato. Nessun timer dentro la logica.
- `chiaveTag({id, testo})`: `id` in maiuscolo, altrimenti il testo.
- `decodificaTag(evento)` sta in `utils/nfcDecode.ts`, non nel gate: usa `react-native-nfc-manager/ndef-lib` (`LIB/ndef-lib/index.js:9-15`, `:122`).

Regole della serie:

1. Dopo un tag accettato, ogni tag è scartato fino a `ora + riarmoMs`.
2. Lo stesso tag è scartato fino a `ora + pausaStessoTagMs`. Ogni riavvistamento in pausa la fa ripartire.
3. La serie finisce con Stop o dopo `inattivitaMs` senza tag **accettati**. I tag scartati non allungano la serie.
4. Dopo una scrittura, l'`id` scritto entra nella lista degli ignorati come un tag appena accettato. Nessun effetto `CONSEGNA`.

### 4.6 Che cosa si prova con jest, senza telefono

Comando: `npx jest@29.7.0 --config jest.config.js` (i test stanno in `__tests__/`, radice già prevista in `jest.config.js`).

1. A riposo un tag è scartato e non produce consegne.
2. Lettura singola: il primo tag è consegnato, il secondo scartato, lo stato torna a `riposo`.
3. Lettura singola: tempo scaduto e Annulla chiudono con l'esito giusto.
4. Serie: tag diverso prima del riarmo scartato, dopo il riarmo accettato.
5. Serie: stesso tag entro la pausa scartato; il riavvistamento rinnova la pausa; dopo la pausa accettato.
6. Serie: fine dopo un minuto senza accettati; Stop; i tag scartati non allungano.
7. Scrittura: gli eventi tag durante la scrittura sono scartati; lo stesso `id` è ignorato dopo, anche in serie.
8. Una seconda operazione riceve `occupato`.
9. Tag senza `id`: la chiave è il testo.
10. Decodifica (`nfcDecode.ts`): link, testo, record vuoto, tag senza NDEF.
11. `nfcCore.ts` con driver finto: `registerTagEvent` chiamato una volta, con flag diversi da zero; `unregisterTagEvent` mai chiamato; `cancelTechnologyRequest` chiamato dopo scrittura riuscita e fallita.
12. Nessun effetto della logica ha un tipo diverso da quelli elencati (garanzia «una lettura non vende né paga»).

### 4.7 Fette

**N1 — base e Scheda prodotto**
- `nfcGate.ts` + test; `nfcService.ts` nuovo; `nfcService.web.ts`.
- Silenziatore avviato da `App.tsx`.
- Finestra dell'app «Avvicina il tag» con conto alla rovescia e Annulla (su Android la libreria non mostra nulla).
- «Leggi tag NFC»: una pressione, una lettura.
- Scheda › Programma NFC: **una sola scrittura in un tocco**. `writeNdefMessage` sostituisce l'intero messaggio, quindi il passo «pulisci» non serve prima di scrivere. [D, T] Elimina la gara del punto 1.4. «Pulisci tag» può restare come strumento a parte.
- Limite noto: un tag mai formattato non ha la tecnologia `Ndef`. La richiesta ritorna `null` (`NfcManager.java:1231-1233`). [V] Rimedio: chiedere `[NfcTech.Ndef, NfcTech.NdefFormatable]` e, nel secondo caso, usare `formatNdef` (`NfcManager.java:271-299`). [V che esiste; T]
- Impostazioni › Hardware: diagnostica con i tre stati (`assente`, `spento`, `attivo`).

**N2 — automazioni**
- Passo «Leggi tag NFC» (singolo) e «Leggi più tag» (serie) con i tre tempi configurabili.
- Stop sempre visibile, contatore dei tag letti, avviso di fine per inattività.
- Le schermate che vendono o muovono merce chiedono conferma dopo la lettura. Mai un'azione diretta dalla callback.
- Lettura delle preferenze `scanMode` (difetto D19).

### 4.8 Decisioni da confermare con l'utente

1. Con l'app aperta il telefono non paga con Wallet. Accettabile? In caso contrario: opzione (b), con suono di sistema a ogni tag.
2. Programma NFC in un solo tocco al posto di «pulisci + scrivi».
3. Pausa dello stesso tag che riparte a ogni riavvistamento (scelta proposta) oppure pausa fissa.
4. «Un minuto senza tag» contato solo sui tag accettati (scelta proposta): un tag dimenticato sul telefono non tiene viva la serie.

---

## 5. Web

Oggi:

- `LIB/src/NativeNfcManager.js:4` legge `NativeModules.NfcManager`, che sul web non esiste (`node_modules/react-native-web/dist/exports/NativeModules/index.js`). [V]
- `LIB/src/index.js:12-18` crea comunque la classe Android. [V]
- All'import `NfcManager.start()` fallisce e finisce in un `console.warn` (`utils/nfcService.ts:9-15`). [V]
- Hardware › test: compare «Errore durante la verifica dello stato NFC.» (`HardwareScreen.tsx:33-35`; osservato in `piani di implementazione/funzionalita/prova/esito-a4.md:46`). [V]
- Scheda › Programma NFC: compare «Operazione Annullata — Pulizia del tag non completata» (osservato in `esito-a1.md:31`). [V]

Proposta:

- `utils/nfcService.web.ts` con la stessa interfaccia: `disponibile()` → `false`, ogni operazione → `{ esito: 'non-disponibile' }`. Non importa la libreria. Stesso schema già usato per `src/db/adapter.web.ts`. [D, risoluzione `.web.ts` di Metro]
- Interfaccia: i pulsanti NFC restano visibili ma disattivati, con la riga «NFC disponibile solo nell'app Android». La diagnostica dice «Non disponibile sul web», non «Errore».
- Nelle automazioni un passo NFC sul web offre l'alternativa (fotocamera/QR o inserimento a mano).
- Nessun silenziatore sul web: il browser non ha il problema.

---

## 6. Prove che si possono fare solo sul telefono

Aiuto: `adb logcat -s ReactNativeNfcManager` mostra «enableReaderMode, flags: 271, delay: 500 ms» (`NfcManager.java:1207`) e «readerMode onTagDiscovered» (`:1215`).

| # | Passi | Risultato atteso |
|---|---|---|
| P1 | Installare la build. Impostazioni › Hardware › test NFC. | «Supportato e attivo». Conferma che la libreria 3.x funziona con la nuova architettura (`LIB/README.md:15-18` dice «v3 solo vecchia architettura»; `android/gradle.properties:38` ha `newArchEnabled=true`). L'autolinking non è stato verificato: nel worktree non c'è una build. P1 prova solo che il modulo nativo si carica; eventi e reader mode li provano P2 e P6. |
| P2 | App aperta, nessuna lettura. Avvicinare un tag con link https. | Nessun browser, nessun suono, nessuna schermata. Nel log le due righe sopra. |
| P3 | Come P2 con: tag vuoto, carta contactless, tocco rapido e sporco. | Niente. Nessun «Nuovo tag acquisito», nessun avviso «errore di lettura». |
| P4 | Tasto Home, avvicinare il tag. Tornare nell'app, riavvicinare. Ripetere dopo blocco schermo. | Fuori: Android si comporta come sempre. Dentro: silenzio. |
| P5 | Con l'app aperta, spegnere e riaccendere l'NFC dalla tendina. Avvicinare il tag. | Silenzio anche dopo la riaccensione. |
| P6 | «Leggi tag NFC», un tocco. Poi un secondo tocco senza premere. Poi premere con il tag già appoggiato. | Una lettura. Il secondo tocco non fa nulla. Il tag già appoggiato non è letto finché non viene sollevato e riavvicinato. |
| P7 | «Leggi tag NFC» senza tag; poi di nuovo e Annulla. | Tempo scaduto con messaggio; Annulla chiude subito. Poi P2 vale ancora. |
| P8 | Programma NFC. Lasciare il tag appoggiato 10 s, muoverlo, sollevarlo e riappoggiarlo. | Una scrittura. Nessun browser, nessuna azione, nessuna rilettura. |
| P9 | «Leggi più tag»: A, B, C a ritmo; A lasciato appoggiato; A ritoccato entro 3 s; Stop; un minuto fermo. | Tre letture; A una sola volta; il ritocco ignorato; Stop immediato; fine da sola dopo un minuto. |
| P10 | Premere Annulla nello stesso istante del tocco, venti volte. | Nessun blocco. Lo stato torna a riposo. |
| P11 | **Prima di N1**, sul codice di oggi: Programma NFC, dopo la pulizia riavvicinare il tag. | Atteso dal sorgente: il secondo passo non parte e Android prende il tag. Conferma il difetto 1.4. |
| P12 | Con l'app aperta avvicinare il telefono a un lettore di pagamento. | Atteso: nessun pagamento. Fuori dall'app funziona. Serve per la decisione 4.8-1. |

Se disponibile, ripetere P2 e P8 su Android 16 o 17.

---

## Fonti

Sorgente letto:
- `utils/nfcService.ts`, `src/screens/product/DetailScreen.tsx:755-815`, `src/screens/settings/HardwareScreen.tsx:1-70`, `contexts/HardwareConfigContext.tsx`, `contexts/AuthContext.tsx:96-130`, `src/navigation/linking.ts`, `App.tsx:95-140`.
- `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/com/redako35/syncroflow/MainActivity.kt`, `android/gradle.properties`.
- `LIB/README.md`, `LIB/index.d.ts`, `LIB/src/{index,NfcManager,NfcManagerAndroid,NfcManagerIOS,NativeNfcManager,NfcError}.js`, `LIB/src/NfcTech/NdefHandler.js`, `LIB/android/.../{NfcManager,TagTechnologyRequest,Util}.java`, `LIB/ios/NfcManager.m:339-369`.
- `RN/ReactActivity.java`, `RN/ReactActivityDelegate.java`, `RN/runtime/ReactHostImpl.kt`, `RN/bridge/ReactContext.java`.
- `syncro_flow_flutter/lib/services/nfc_coordinator.dart`, `nfc_foreground_dispatch.dart`, il suo `MainActivity.kt` e manifest (solo come esempio da evitare).

Documentazione consultata oggi:
- Android, riferimento `NfcAdapter` (`enableReaderMode`, `disableReaderMode`, `enableForegroundDispatch`, `ignore`, `setDiscoveryTechnology`, costanti).
- Android, guida «NFC basics» (smistamento dei tag, novità di Android 16 e 17).
- Context7, `/revtel/react-native-nfc-manager`: documenta il ramo principale (4.x). Usato solo dove coincide con il sorgente installato (`requestTechnology`, `cancelTechnologyRequest`).
- AOSP 13 `NfcActivityManager.java` e `NfcService.java` (copia LineageOS 20): letti tramite sintesi automatica, quindi tutto ciò che ne deriva è [D].
- npm: l'ultima versione pubblicata è la 4.3.0; la 4.x è il ramo per la nuova architettura. Un aggiornamento non fa parte di N0.
