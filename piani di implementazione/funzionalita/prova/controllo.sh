#!/usr/bin/env bash
# Controllo di chiusura di un task (fase B): tsc, eslint, jest, bundle Android, console web su 30 schermate.
# Uso dalla radice del worktree: bash "piani di implementazione/funzionalita/prova/controllo.sh" [cartella scratch]
# Richiede l'app web su :8082 e serve-seed.mjs su :8765. Stampa una riga per controllo; esce con 1 se qualcosa è rosso.
set -u
OUT="${1:-${TEMP:-/tmp}/controllo-fase-b}"
PW="${PW:-C:/Users/reda_/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright}"
mkdir -p "$OUT/schermate"
rosso=0
npx tsc --noEmit > "$OUT/tsc.txt" 2>&1 && echo "tsc: 0 errori" || { echo "tsc: ROSSO (vedi $OUT/tsc.txt)"; rosso=1; }
npx eslint . > "$OUT/eslint.txt" 2>&1 && echo "eslint: 0 problemi" || { echo "eslint: ROSSO (vedi $OUT/eslint.txt)"; rosso=1; }
if npx jest@29.7.0 --config jest.config.js > "$OUT/jest.txt" 2>&1; then echo "jest: $(grep -E '^Tests:' "$OUT/jest.txt")"; else echo "jest: ROSSO (vedi $OUT/jest.txt)"; rosso=1; fi
if npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output "$OUT/index.android.bundle" --assets-dest "$OUT/assets" > "$OUT/bundle.txt" 2>&1; then
  echo "bundle Android: $(wc -c < "$OUT/index.android.bundle") byte, $(grep -o 'Copying [0-9]* asset' "$OUT/bundle.txt" | grep -o '[0-9]*') asset"
else echo "bundle Android: ROSSO (vedi $OUT/bundle.txt)"; rosso=1; fi
APP="${APP:-http://localhost:8082}" EXTRA=1 node "piani di implementazione/ui-ux/campionario/schermate.cjs" "$PW" "${STILE:-}" "$OUT/schermate" > "$OUT/schermate.txt" 2>&1
# Eccezione nota (DECISIONI_DA_RIVEDERE.md, 22/11): al primo avvio in un browser vuoto LokiJS a volte scrive
# «Deleting database failed because it's blocked»; si conta a parte e non blocca.
NOTO="Deleting database failed because it's blocked"
n_ok=$(grep -c " ok " "$OUT/schermate.txt"); n_noto=$(grep -c "$NOTO" "$OUT/schermate.txt")
n_err=$(grep "CONSOLE\|ERRORE" "$OUT/schermate.txt" | grep -vc "$NOTO")
if [ "$n_err" -eq 0 ]; then echo "web: $n_ok schermate, 0 errori in console (eccezione nota di LokiJS: $n_noto)"; else echo "web: ROSSO, $n_err righe d'errore (vedi $OUT/schermate.txt)"; grep "CONSOLE\|ERRORE" "$OUT/schermate.txt" | grep -v "$NOTO" | head -5; rosso=1; fi
exit $rosso
