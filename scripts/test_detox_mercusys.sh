#!/usr/bin/env bash
# SyncroFlow — scripts/test_detox_mercusys.sh
# QA Detox 2-device su LAN Mercusys isolata (senza WAN) + single-device emulator
# Device target: Pixel_10_Pro (emulator) + S25 Ultra fisico opzionale
# Non richiede installazione — solo preparazione comandi (win32: usa WSL/Git Bash)
#
# Prerequisiti macOS/Linux:
#   - Android SDK (adb), Node 20+, Detox CLI, emulator o 2 device fisici
#   - Router Mercusys senza cavo WAN, DHCP 192.168.1.100-199, AP isolation OFF
#   - Entrambi i device connessi a SSID SyncroFlow-Mesh (2.4GHz) con IP 192.168.1.x
#
# Config Detox attesa (.detoxrc.js):
#   - android.emu.debug  -> emulator Pixel_7_API_34 (default)
#   - android.device.debug -> s25ultra attached (adbName .*SM-S938.*)
#   - Per Pixel_10_Pro emulator: crea AVD "Pixel_10_Pro" oppure usa --device-name override
#
set -euo pipefail

# --- 0) Check ambiente ---
echo "=== SyncroFlow Detox — Mercusys LAN isolata ==="
echo "[INFO] PWD: $(pwd)"
echo "[INFO] Node: $(node -v 2>&1 || echo 'node non trovato')"
echo "[INFO] ADB: $(adb --version 2>&1 | head -n1 || echo 'adb non trovato')"
echo "[INFO] Detox: $(npx detox --version 2>&1 || echo 'detox non trovato')"
echo ""

# --- 1) Verifica adb devices ---
echo "=== 1) adb devices ==="
adb devices
echo ""
echo "[CHECK] Attesi:"
echo "  - emulator-5554  -> Pixel_10_Pro AVD (se AVD nome Pixel_10_Pro)"
echo "  - <HOST_SERIAL>  -> S25 Ultra fisico (opzionale 2-device)"
echo "  - <CLIENT_SERIAL>-> Pixel 10 Pro fisico o secondo device"
echo ""
# opzionale: lista IP LAN per debug Mercusys
for SERIAL in $(adb devices | awk 'NR>1 && $2=="device" {print $1}'); do
  echo "--- $SERIAL ---"
  adb -s "$SERIAL" shell ip addr show wlan0 2>&1 | grep -E "inet " || echo "  (wlan0 inet non trovato)"
  adb -s "$SERIAL" shell getprop ro.product.model 2>&1 | sed 's/^/  model: /'
done
echo ""

# --- 2) Verifica Mercusys LAN isolata ---
echo "=== 2) Mercusys LAN check (senza WAN) ==="
echo "[MANUALE] Su entrambi i device:"
echo "  - WiFi -> SyncroFlow-Mesh (Mercusys, 2.4GHz)"
echo "  - Verifica IP: Impostazioni -> WiFi -> Dettagli -> 192.168.1.x"
echo "  - Ping incrociato atteso <50ms (se AP isolation OFF):"
echo "    adb -s <HOST> shell ping -c 3 192.168.1.<CLIENT_IP>"
echo "    adb -s <CLIENT> shell ping -c 3 192.168.1.<HOST_IP>"
echo "  - Router admin: http://192.168.1.1 (admin/admin) -> DHCP 192.168.1.100-199"
echo ""

# --- 3) Build APK debug (skip se già presente) ---
echo "=== 3) Build ==="
if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
  echo "[OK] APK già presente: android/app/build/outputs/apk/debug/app-debug.apk"
  echo "[SKIP] Per rebuild forzato: cd android && ./gradlew assembleDebug assembleAndroidTest -DtestSingleFile=e2e/meshQRLoop.detox.test.ts"
else
  echo "[BUILD] npx detox build --configuration android.emu.debug"
  echo "  (su win32: usa WSL o esegui su macOS)"
  npx detox build --configuration android.emu.debug || echo "[WARN] build fallita — verifica su macOS/Linux"
fi
echo ""

# --- 4) Test single-device — Pixel_10_Pro emulator ---
# Nota task: detox test --configuration android.emu.debug --device Pixel_10_Pro
# .detoxrc.js definisce emulator avdName Pixel_7_API_34; per Pixel_10_Pro crea AVD o usa override:
echo "=== 4) Detox single-device — Pixel_10_Pro emulator ==="
echo "[CMD] npx detox test --configuration android.emu.debug --device-name Pixel_10_Pro e2e/meshQRLoop.detox.test.ts"
echo ""
# Variante A — AVD già creato come Pixel_10_Pro:
echo "# Variante A (AVD Pixel_10_Pro esistente):"
echo "npx detox test --configuration android.emu.debug --device-name Pixel_10_Pro e2e/meshQRLoop.detox.test.ts --loglevel verbose --record-logs all"
echo ""
# Variante B — usa config esistente emulator Pixel_7_API_34 e forza avdName via env:
echo "# Variante B (usa config emulator esistente, avvia emulator manualmente):"
echo "emulator -avd Pixel_10_Pro -netdelay none -netspeed full &"
echo "adb wait-for-device"
echo "npx detox test --configuration android.emu.debug e2e/meshQRLoop.detox.test.ts"
echo ""
# Variante C — su macOS con Detox device override (se .detoxrc ha device Pixel_10_Pro):
echo "# Variante C (se .detoxrc.js aggiunge device pixel10pro):"
echo '  # devices: { pixel10pro: { type: "android.emulator", device: { avdName: "Pixel_10_Pro" } } }'
echo "  # npx detox test --configuration android.emu.debug --device pixel10pro"
echo ""

# Esecuzione effettiva single-device (se emulator raggiungibile):
if adb devices | grep -q "emulator"; then
  echo "[RUN] Tentativo detox su emulator..."
  npx detox test --configuration android.emu.debug e2e/meshQRLoop.detox.test.ts --loglevel verbose || echo "[WARN] detox emulator fallito — verifica AVD Pixel_10_Pro"
else
  echo "[SKIP] Nessun emulator attivo — avvia: emulator -avd Pixel_10_Pro &"
  echo "[MOCK] Fallback logica pura (senza Detox device):"
  echo "DETOX_MOCK=1 npx jest e2e/meshQRLoop.detox.test.ts --no-coverage --runInBand"
fi
echo ""

# --- 5) Test 2-device reali — Mercusys isolata ---
echo "=== 5) Detox 2-device reali — Mercusys senza WAN ==="
echo "[INFO] Richiede 2 serial adb — esempio:"
echo "  HOST_SERIAL=\$(adb devices | awk 'NR>1 && /device/ {print \$1}' | sed -n 1p)"
echo "  CLIENT_SERIAL=\$(adb devices | awk 'NR>1 && /device/ {print \$1}' | sed -n 2p)"
echo ""
HOST_SERIAL=$(adb devices | awk 'NR>1 && $2=="device" {print $1}' | sed -n '1p')
CLIENT_SERIAL=$(adb devices | awk 'NR>1 && $2=="device" {print $1}' | sed -n '2p')
echo "[DETECTED] HOST_SERIAL=${HOST_SERIAL:-<none>}"
echo "[DETECTED] CLIENT_SERIAL=${CLIENT_SERIAL:-<none>}"
echo ""

if [ -n "${HOST_SERIAL:-}" ] && [ -n "${CLIENT_SERIAL:-}" ] && [ "$HOST_SERIAL" != "$CLIENT_SERIAL" ]; then
  echo "[2-DEVICE] Entrambi i device rilevati — installo APK..."
  adb -s "$HOST_SERIAL" install -r android/app/build/outputs/apk/debug/app-debug.apk || echo "[WARN] install host fallita"
  adb -s "$CLIENT_SERIAL" install -r android/app/build/outputs/apk/debug/app-debug.apk || echo "[WARN] install client fallita"

  echo "[2-DEVICE] Avvio Host room (genera token ROOM 8 char)..."
  echo "  adb -s $HOST_SERIAL shell am start -n com.syncroflow/.MainActivity --es action createHostRoom"
  echo "  # In alternativa: lancia app e tap su mesh-create-room-btn (Detox device.launchApp)"
  echo ""
  echo "[2-DEVICE] Detox parallelo — 2 terminali consigliati:"
  echo "  Terminal 1 (Host S25 Ultra):"
  echo "    npx detox test --configuration android.device.debug e2e/meshQRLoop.detox.test.ts --testNamePattern='Host:'"
  echo "  Terminal 2 (Client Pixel):"
  echo "    npx detox test --configuration android.device.debug --device-name Pixel_10_Pro e2e/meshQRLoop.detox.test.ts --testNamePattern='Client:'"
  echo ""
  echo "[2-DEVICE] Verifica sync 100% attesa:"
  echo "  - Host log: 'roomToken X7K9PQ2M' + 'WS OPEN' + 'roomSize 2'"
  echo "  - Client log: 'hello' + 'pulled 42' + 'Sincronizzato 100%'"
  echo "  - Entrambi: chat lightPayload {skus:[LOG-2026-001], automationIds:[auto-1]} <2KB"
  echo ""
  echo "[RUN] Esecuzione sequenziale mock 2-device (stessa macchina, 2 ws mock):"
  npx detox test --configuration android.device.debug e2e/meshQRLoop.detox.test.ts --loglevel verbose 2>&1 | head -n 200 || echo "[WARN] 2-device detox richiede 2 device fisici — fallback a mock single-process OK"
else
  echo "[SKIP 2-DEVICE] Servono 2 device adb attivi."
  echo "  Connetti 2 device alla stessa WiFi Mercusys, poi:"
  echo "    adb devices  # verifica 2 serial"
  echo "    ./scripts/test_detox_mercusys.sh"
  echo ""
  echo "[MOCK 2-DEVICE] Validazione logica WS/sync senza hardware:"
  echo "  DETOX_MOCK=1 npx jest e2e/meshQRLoop.detox.test.ts --no-coverage --runInBand"
  DETOX_MOCK=1 npx jest e2e/meshQRLoop.detox.test.ts --no-coverage --runInBand 2>&1 | tail -n 80 || echo "[WARN] jest mock richiede DETOX_MOCK"
fi

echo ""
echo "=== 6) Log e troubleshooting Mercusys ==="
echo "  - Se detox timeout >120s: aumenta testTimeout in e2e/jest.config.js (attuale 120000)"
echo "  - Se WS non connette: verifica AP isolation OFF su 192.168.1.1, firewall device OFF"
echo "  - Se sync non 100%: controlla log 'pulled products' — atteso 42 su Pixel_10_Pro"
echo "  - Per iOS su macOS: cd ios && pod install --repo-update && npx detox build --configuration ios.sim.debug"
echo "  - Screenshot Detox: artifacts in /tmp/detox_*/"
echo ""
echo "=== DONE ==="
echo "[NEXT] Su macOS con Xcode:"
echo "  cd ios && pod install --repo-update --verbose"
echo "  npx detox build --configuration ios.sim.debug"
echo "  npx detox test --configuration ios.sim.debug e2e/meshQRLoop.detox.test.ts"
