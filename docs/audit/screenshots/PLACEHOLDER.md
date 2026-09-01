# Screenshot — Placeholder (device non connesso al momento audit)

> **Stato:** `adb devices` vuoto il 2026-09-02 → nessun device/emulatore → screenshot live non catturati in questa run.
> **Valore:** l’audit funzionale è già completo nei 4 markdown (`SCREEN_MAP.md`, `LOGISTICA-INVENTARIO.md`, `AUTOMAZIONI.md`, `DESIGN_SYSTEM.md`). Gli screenshot sono solo conferma visiva.

## Come generarli (quando hai device)

Vedi `docs/audit/README.md:15` (sezione “Come rigenerare”). Con Mobile MCP attivo, l’agente può fare:

```text
prompt: "cattura screenshot di ogni tab (index, timeline, automations, add, settings) e di scanner, product/[id], scanner-action"
tool: mobile-mcp mobile_list_available_devices → mobile_take_screenshot → mobile_save_screenshot
out: docs/audit/screenshots/*.png
```

## Lista screenshot attesi (da generare)

| File atteso | Screen | Cosa deve mostrare |
|---|---|---|
| `01-tabs-index.png` | `/(tabs)/index` | Grid prodotti, filtri library, batch selectedIds |
| `02-tabs-timeline.png` | `/(tabs)/timeline` | Timeline `created/moved/sold/scanned` |
| `03-tabs-automations.png` | `/(tabs)/automations` | Hub 4 built-in + lista custom |
| `04-tabs-add.png` | `/(tabs)/add` | Form add con DynamicFieldRenderer, image picker |
| `05-tabs-settings.png` | `/(tabs)/settings` | 8 voci hub impostazioni |
| `06-scanner.png` | `/scanner` | CameraView + scan frame corner gold + flash |
| `07-scanner-action-product.png` | `/scanner-action?type=product` | Modal azione rapida product (move/sold/details) |
| `08-product-detail.png` | `/product/[id]` | Detail con Image expo-image, print/share/clipboard |
| `09-product-edit.png` | `/product/edit/[id]` | Edit form + GS1 regen |
| `10-not-found.png` | `/+not-found` | LinearGradient `#0a0a0a→#1a1a1a` + Return Home |
| `11-automation-flow.png` | `/automations/automation-flow` | Flow detail con QR + steps |
| `12-custom-runner.png` | `/automations/custom-runner` | Runner step-by-step |
| `13-settings-locations.png` | `/settings/locations` | CRUD locations |
| `14-settings-trash.png` | `/settings/trash` | Cestino con restore/permanent delete |

## Fallback web (senza device)

```powershell
powershell -ExecutionPolicy Bypass -Command "npm run web"  # http://localhost:19006
# screenshot browser manuale → salva in docs/audit/screenshots/web-*.png
```

Finché non generati, usa `CHECKLIST_PARITA.md` + `DESIGN_SYSTEM.md` per verifica pixel.
