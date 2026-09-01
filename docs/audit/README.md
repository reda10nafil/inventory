# Audit Applicazione Syncro Flow — Parità pre-eject Expo

> **Scopo:** cattura completa dello stato attuale (logistica, inventario, automazioni) per garantire **parità 100% funzionale + visiva** dopo il full eject Expo → React Native CLI puro (Opzione B). Nessuna funzione viene inventata o persa — questo audit è il “gold standard” per la verifica.
> **Data:** 2026-09-02
> **Piano associato:** `.opencode/plans/remove-expo-full-eject.md`
> **Grafo:** `graphify-out/graph.json` (aggiornato post-audit con `graphify update .`)

## Come è stato catturato

- **Tentativo Mobile MCP (`@mobilenext/mobile-mcp@1.0.2`):** configurato in `.opencode/opencode.json:4` (`mobile-mcp` local `npx.cmd -y @mobilenext/mobile-mcp@latest` enabled). Verifica ADB:
  ```
  C:\Users\Primo\AppData\Local\Android\Sdk\platform-tools\adb.exe devices
  List of devices attached  (vuoto)
  ```
  Nessun device/emulatore connesso al momento dell’audit → **screenshot live non catturabili ora**.
- **Fallback statico (verificato, non inventato):** lettura diretta di `app/**/*.tsx` (27 file), `contexts/*.tsx` (7), `types/index.ts`, `constants/theme.ts`, `services/SoundService.ts:1`, `utils/barcodeDecoder.ts:6`, `components/BarcodeScanner.tsx:3`, `app.json:1`, `package.json:1`, `android/app/build.gradle:1` + `AndroidManifest.xml:1`. Ogni riga citata è tracciabile file:linea.
- **Screenshot:** cartella `docs/audit/screenshots/` contiene **placeholder descrittivi + istruzioni per rigenerazione** quando un device/emulatore sarà disponibile (vedi sotto). Il contenuto funzionale è già tutto documentato nei file markdown successivi — gli screenshot sono solo conferma visiva, non fonte di verità.

## Come rigenerare gli screenshot quando hai un device

```powershell
# 1. Avvia emulatore o collega device USB con debug attivo
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices  # deve mostrare emulator-5554 o device

# 2. Avvia l’app (Expo Go ancora attivo pre-eject)
powershell -ExecutionPolicy Bypass -Command "npm run android"
# oppure
powershell -ExecutionPolicy Bypass -Command "npx expo start --android"

# 3. Con Mobile MCP attivo (già in .opencode/opencode.json), chiedi all’agente:
# "/audit vivo" oppure "cattura screenshot di ogni tab" — l’agente userà mobile-mcp per dump UI + screenshot

# 4. Alternativa senza Mobile MCP: web
powershell -ExecutionPolicy Bypass -Command "npm run web"  # apre http://localhost:19006
# poi screenshot browser manuale
```

Finché non c’è device, usa `SCREEN_MAP.md` + `LOGISTICA-INVENTARIO.md` + `AUTOMAZIONI.md` come checklist — sono estratti dal codice, non ipotesi.

## Struttura cartella

```
docs/audit/
  README.md                ← questo file
  SCREEN_MAP.md            ← mappa 27 screen: route, file, ruolo, dipendenze expo
  LOGISTICA-INVENTARIO.md  ← flussi inventario/logistica per qualsiasi settore
  AUTOMAZIONI.md           ← engine automazioni, tipi step, esecuzione
  DESIGN_SYSTEM.md         ← tema La Palais (colori, typography, spacing) — vincolo visivo
  CHECKLIST_PARITA.md      ← checklist verifica post-eject (no regressione)
  screenshots/
    PLACEHOLDER.md         ← istruzioni + lista screenshot attesi
    _layout-tabs.png       ← (da generare con device)
    ...
```

## Vincolo visivo La Palais

Il livello visivo “La Palais” è codificato in `constants/theme.ts:4` (`primary #D4AF37`, `background #0A0A0A`, `surface #1F1F1F`) + `nativewind:4.1.23` + `typography` + `borderRadius` + `shadows`. Dopo l’eject i valori **non cambiano** — vedi `DESIGN_SYSTEM.md`. Qualsiasi drift colore/spacing è considerato regressione.

## Handoff implementazione

Dopo questo audit, il prossimo passo è l’esecuzione del piano `.opencode/plans/remove-expo-full-eject.md` per fasi (Fase 0 → Fase 6) con `graphify update .` dopo ogni fase.
