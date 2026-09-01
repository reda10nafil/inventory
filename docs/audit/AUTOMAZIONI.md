# Automazioni — Engine Completo (per qualsiasi settore)

> Fonte: `contexts/AutomationsContext.tsx`, `app/(tabs)/automations.tsx:6`, `app/automations/*.tsx`, `app/settings/automation-builder.tsx:9`, `types/index.ts` (Automation, Step). L’app contiene automazioni built-in + custom builder — tutte devono restare identiche post-eject.

## 1. Modelli

**CustomAutomation** (`types/index.ts` / `AutomationsContext`):
```ts
id, name, icon, color, description, createdAt, updatedAt,
triggerQR?: string // es. "AUTO:INVENTARIO-01" scansionabile
steps: AutomationStep[]
usageCount?: number
```
**AutomationStep:**
```ts
id, type: StepType, config: AutomationStepConfig
StepType ∈ { scan_product, move_product, tag_product, update_field, confirm, custom }
config: { targetLocation?, tag?, fieldId?, value?, message? }
```

Built-in (da `app/(tabs)/automations.tsx:6` + `AutomationsContext`):
- `batch-move` — sposta N prodotti verso `targetLocation`
- `scan-sell` — vendi al scan con `finalPrice`
- `audit` — verifica posizione: confronta atteso vs scansionato
- `quick-tag` — applica tag comune batch
- `custom-runner` — engine generico per flow custom

## 2. Store & Persistenza

`AutomationsContext` (`contexts/AutomationsContext.tsx`):
- `AsyncStorage` key `automations`, mock fallback `mockAutomations`.
- CRUD: `addAutomation`, `updateAutomation`, `deleteAutomation`, `getAutomationById`, `getAutomationByQR(qr)` (`qr===automation.triggerQR`), `incrementUsageCount`.
- Ogni mutation → `setAutomations(prev=>[...])` + `AsyncStorage.setItem`.

## 3. UI Entry

- **Hub** `app/(tabs)/automations.tsx:47` `useRouter()`:
  - `router.push(automation.route as any)` per built-in (`/automations/batch-move`, `/scan-sell`, `/audit`, `/quick-tag`)
  - `router.push({pathname:'/automations/automation-flow', params:{id}} as any)` per custom
  - `router.push('/scanner' as any)` quick scan
  - `router.push('/settings/automation-builder' as any)` crea nuova
  - `as any` bypass `typedRoutes:true` (11 occorrenze, non tipizzato)
- **Builder** `app/settings/automation-builder.tsx:42`:
  - `useLocalSearchParams().editId` → edit mode
  - `_addStep(type)` + `AVAILABLE_STEPS` (`COLOR_OPTIONS`, `ICON_OPTIONS` in `app/settings/automation-builder.tsx:9` constants)
  - Save → `addAutomation`/`updateAutomation` → `Alert` → `router.back()`
  - Permette drag/reorder, delete, config per step

## 4. Esecuzione

**Flow detail** `app/automations/automation-flow.tsx:8`:
- `useLocalSearchParams().id` → `getAutomationById(id)`
- Azioni: `router.back()` (back/delete), `router.push({pathname:'/automations/custom-runner', params:{id}} as any)` Run, `router.push({pathname:'/settings/automation-builder', params:{editId}} as any)` Edit
- Mostra `steps` con icon/color, `usageCount`, `triggerQR` (render `react-native-qrcode-svg:6.3.15` + `react-native-svg:15.12.1`)

**Runner** `app/automations/custom-runner.tsx:8`:
- `useLocalSearchParams().id` → `automation`
- Stato: `_currentStepIndex`, `_completedCount`, `_advanceToNextScanStep`, `_confirmSale`
- Loop: per ogni `step` di tipo `scan_product` → attende scan `scanner.tsx` o manuale → `scanProduct(id)` + `soundService.playSuccess()` / `playAnomaly()` su errore → `moveProduct`/`tag`/`update_field` a seconda di `config` → `timeline` event
- Su `confirm` step → `Alert` conferma
- Su completamento → `incrementUsageCount` + `router.back()` + `soundService.playOrderComplete()`

**Built-in screens** (ognuno `useRouter().back()` header):
- `batch-move.tsx:6` — seleziona N `product.id` → `targetLocation` picker (`LocationsContext`) → `moveProduct` loop + `soundService.playAnomaly` se mismatch
- `scan-sell.tsx:6` — scan → `sellProduct(id,finalPrice)` + timeline `sold`
- `audit.tsx:6` — per `locationId`: lista attesi vs scansionati, `Alert` discrepanza, genera `timeline scanned`
- `quick-tag.tsx:6` — `commonTags` (`COMMON_TAGS` in `contexts/AutomationsContext`) batch apply → `updateProduct` customData

## 5. QR Trigger

- Ogni `CustomAutomation` può avere `triggerQR = "AUTO:<slug>"`. In `app/scanner.tsx:88`:
  ```ts
  if (data.startsWith('AUTO:')) {
    const automation = getAutomationByQR(data);
    if (automation) { soundService.playSuccess(); router.push({pathname:'/automations/custom-runner', params:{id: automation.id}} as any); }
  }
  ```
  Post-eject: mantenere identico `linking` + `react-native-qrcode-svg` per generare QR stampabile in `automation-flow`.

## 6. Settore-agnostico — esempi

- **Moda pellicce:** `batch-move` per spostare da magazzino a vetrina stagionale, `audit` per inventario vetrina.
- **Food:** `scan-sell` con `finalPrice` per cassa rapida, `quick-tag` per etichettare lotti scadenza.
- **Hardware:** `custom` step `update_field` per aggiornare `stato`/`collocazione`.

## 7. Cosa non deve cambiare (vincolo)

- `SoundService` 8 pattern (`playSuccess`, `playAnomaly` 3 bip 400ms, `playBlockingError` long, `playFragileAlert` 2 bip 600ms, `playOrderComplete` 4 bip 150ms, `playBatteryLow` 2 long 1200ms, `playUrgentOrder` 5 bip 100ms) — già in `services/SoundService.ts:47-138`.
- `BatteryMonitor` `app/_layout.tsx:15` 15s poll `level<0.15 && state!==CHARGING` → `playBatteryLow` ogni 60s.
- `Timeline` 8 tipi + `details` shape.

## Checklist parità automazioni

- [ ] Hub mostra built-in + custom, tap → navigazione corretta
- [ ] Builder crea/edita/reordina step, save → persistenza + triggerQR
- [ ] QR `AUTO:` scan → `custom-runner` con `id` corretto
- [ ] Runner esegue `scan_product` → `move/tag/update_field` → timeline + sound
- [ ] Built-in `batch-move`/`scan-sell`/`audit`/`quick-tag` completi
- [ ] Flow detail share QR ( `react-native-share` + `view-shot:4.0.3`)
