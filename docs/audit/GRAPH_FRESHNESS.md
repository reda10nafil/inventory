# GRAPH_FRESHNESS — Verifica win32 SyncroFlow (2026-09-02T01:11 UTC)

> Temporaneo — solo verifica, non modifica codice. Rigenerare dopo `graphify update .`.

## 1) graphify CLI alternativo — esito

| Tentativo | Risultato |
|-----------|-----------|
| `node .opencode/plugins/graphify.js` | **NON è CLI**: plugin ESM per OpenCode (`tool.execute.before` hook). Esecuzione diretta fallisce: `MODULE_TYPELESS_PACKAGE_JSON` + reparse ES module, nessun output utile. File esiste: `.opencode/plugins/graphify.js` (30 righe). |
| `npx graphify` / `node_modules/.bin/graphify` | **NON trovato**: `node_modules/.bin/graphify` assente. `npx --yes graphify --help` bloccato da `ExecutionPolicy` PowerShell (`npx.ps1` disabilitato). Workaround: `npx.cmd graphify` con `cmd /c` o `Set-ExecutionPolicy Bypass -Scope Process`. |
| `graphify-out/graph.json` freshness (fallback) | **OK — usato come fonte verità**. `graph.json` 2.938.396 B, mtime `2026-09-02 00:51:23`, report data `2026-09-02`, commit `bac43a2a`. |

**Comandi win32 alternativi consigliati:**
```powershell
# 1) via npx (bypass ExecutionPolicy)
cmd /c "npx.cmd --yes graphify --help"
cmd /c "npx.cmd --yes graphify query ""SyncroFlow inventory"" --limit 10"

# 2) via opencode plugin (già attivo): hook prepende echo reminder su ogni `bash` tool
# 3) freshness diretta (usata qui)
Get-Item graphify-out/graph.json | Select LastWriteTime, Length
Select-String -Path graphify-out/GRAPH_REPORT.md -Pattern "Built from commit"
git rev-parse HEAD
git status --porcelain | Measure-Object -Line
```

## 2) Graph Freshness — verdetto

- **HEAD attuale:** `bac43a2a8754d79d007a9185cc22c7d5e7954de5`
- **Commit nel graph:** `bac43a2a` (GRAPH_REPORT.md:12)
- **Confronto:** `HEAD.StartsWith("bac43a2a")` → **MATCH** → graph committato è **FRESH** alla data report `2026-09-02`.
- **Età:** `graph.json` mtime `2026-09-02 00:51:23` → ~0.34h fa al momento verifica `2026-09-02 01:11:46`.
- **Corpus:** 2824 nodi · 4661 edge · 290 community · 305 file · ~694k parole (`GRAPH_REPORT.md:2-8`).

**MA: working directory DIRTY (89 porcelain entries) → graph diventerà stale al prossimo commit se non aggiornato.**

```
 M app/(tabs)/settings.tsx
 M contexts/LayoutContext.tsx
 M docs/cronologia_migrazione.md
 M graphify-out/.graphify_labels.json (+.sig / graph.html / manifest.json / GRAPH_REPORT.md)
 M ios/Podfile
 M package-lock.json / package.json
 M src/navigation/RootNavigator.tsx
 M src/screens/tabs/HomeScreen.tsx / SettingsScreen.tsx
 M tsconfig.json
 ... + ?? .detoxrc.js, __tests__/, e2e/, .ruflo/, docs/audit/screenshots/*.png (untracked)
```

- File dirty **già visti** dal manifest con `seen` recente (es. `contexts/LayoutContext.tsx` seen `1788303083` ≈ `2026-09-02 00:51`), ma `mtime` nuovi non ricalcolati in graph AST.
- **Azione richiesta:** dopo ogni modifica codice, eseguire:
  ```powershell
  # AST-only, no API cost
  cmd /c "npx.cmd --yes graphify update ."
  # poi verifica
  git diff --stat HEAD
  ```

## 3) ADB devices — verifica win32

- **adb.exe:** `C:\Users\Primo\AppData\Local\Android\Sdk\platform-tools\adb.exe` (8.273.560 B, 2026-08-20, v37.0.1-15733141, `1.0.41`)
- **Output `adb devices -l`:**
  ```
  List of devices attached
  emulator-5554  device product:sdk_gphone16k_x86_64 model:sdk_gphone16k_x86_64 device:emu64xa16k transport_id:6
  emulator-5556  device product:sdk_gphone64_x86_64  model:sdk_gphone64_x86_64  device:emu64xa   transport_id:7
  ```
- **Mapping AVD reale (via `adb -s <emu> emu avd name`):**
  - `emulator-5554` → `Pixel_10_Pro` (Android 17, `sdk_gphone16k_x86_64`) ← **è il Pixel_10_Pro atteso, ma su porta 5554 non 5556**
  - `emulator-5556` → `S25_Ultra_API35` (Android 15, `sdk_gphone64_x86_64`)
  - `avdmanager list avd` riporta errore di parsing per entrambi ma conferma nomi AVD esistenti.

**Verdetto Pixel_10_Pro (5556):** Task chiede porta `5556`, ma il device è **CONNESSO su 5554**. Non è "non connesso" — è solo offset porta. Fallback web/screencap documentato sotto per completezza, ma device è disponibile per `adb screencap` / Detox / Mobile MCP su `emulator-5554`.

## 4) Fallback adb screencap + web + confronto screenshots

> Istruzioni da loggare se device fosse stato assente — incluse comunque perché richiesta task.

### 4a) adb screencap (device connesso → usare 5554)
```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$dev = "emulator-5554"  # Pixel_10_Pro (se task vuole 5556, sostituire con emulator-5556 per S25)

# singolo screenshot
& $adb -s $dev exec-out screencap -p > docs/audit/screenshots/pixel10pro_main.png

# dump UI per audit (già presente: docs/audit/dump.xml)
& $adb -s $dev exec-out uiautomator dump /dev/tty | Out-File -Encoding utf8 docs/audit/dump.xml

# loop 14 screenshot attesi (vedi PLACEHOLDER.md)
& $adb -s $dev shell input swipe 0 0 0 0 200  # wake
```

**File attesi da PLACEHOLDER.md (14):**
`01-tabs-index.png`, `02-tabs-timeline.png`, `03-tabs-automations.png`, `04-tabs-add.png`, `05-tabs-settings.png`, `06-scanner.png`, `07-scanner-action-product.png`, `08-product-detail.png`, `09-product-edit.png`, `10-not-found.png`, `11-automation-flow.png`, `12-custom-runner.png`, `13-settings-locations.png`, `14-settings-trash.png`

### 4b) Fallback web (senza device)
```powershell
# PowerShell Bypass + Expo web
powershell -ExecutionPolicy Bypass -Command "npm run web"  # http://localhost:19006
# oppure
cmd /c "npm run web"
# screenshot browser manuale → salva in docs/audit/screenshots/web-*.png
# confronto visivo con DESIGN_SYSTEM.md (palette La Palais #0a0a0a→#1a1a1a per +not-found)
```

### 4c) Confronto `docs/audit/screenshots/` attuale (13 file)
```
00-emulator-home-fase0.png  2017217  01/09 18:07  (fase0)
00-emulator-home.png        1916285  01/09 13:48
01-tabs-index-fase2.png     2017952  01/09 18:39  (fase2)
05-nativa-fase5.png         2017425  01/09 18:57  (fase5)
add_FIXED2.png               215417  02/09 00:00
home_FIXED2.png               27528  01/09 23:59  (FIXED2)
home_FIXED2_v2.png          1693001  01/09 23:59
pixel-home.png                27331  01/09 21:22
pixel-launcher.png           330150  01/09 21:22
pixel10pro_deeplink.png       44564  01/09 22:30
pixel10pro_main.png         1803188  01/09 22:30  ← ultimo screencap Pixel_10_Pro
s25_main.png                1754928  01/09 22:30  ← ultimo screencap S25
PLACEHOLDER.md                 2437  01/09 13:09
```
- Nessuno dei 14 file canonici `01..14-*.png` presente con naming esatto — presenti varianti fase/FIXED2/pixel*.png. Gap da colmare con Mobile MCP o adb screencap loop sopra.
- Per verifica pixel: usare `CHECKLIST_PARITA.md` + `DESIGN_SYSTEM.md` finché screenshot canonici non generati (come da PLACEHOLDER.md:42).

## 5) Riepilogo log finale

- **graphify CLI:** nessun bin nativo; plugin `.opencode/plugins/graphify.js` attivo come hook; `npx graphify` richiede `npx.cmd` + ExecutionPolicy Bypass. Freshness verificata via `graph.json` → **FRESH at HEAD** (`bac43a2a`) ma dirty WD → run `graphify update .` prima del prossimo commit.
- **ADB:** `adb.exe` OK, 2 emulatori connessi. **Pixel_10_Pro è su `emulator-5554` (non 5556)** — task logga fallback ma device è disponibile; istruzioni screencap + fallback web + confronto screenshots fornite sopra.
- **Non modificato codice** — solo creato questo `GRAPH_FRESHNESS.md` temporaneo + log verifica.

---
*Generato da Worker graphify + adb (win32) — verifica sola lettura.*
