# Mappa Screen — Syncro Flow (estratta da `app/`)

> Fonte: `app/_layout.tsx:60`, `app/(tabs)/_layout.tsx:3`, grep `from 'expo-router'` 27 file. Ogni riga è verificabile `file:linea`.

| # | Route (expo-router) | File | Layout / Header | Ruolo funzionale | Dipendenze Expo reali |
|---|---|---|---|---|---|
| 1 | `app/_layout.tsx` (Stack root) | `app/_layout.tsx:60` | `Stack screenOptions headerShown:false` | Root: `SafeAreaProvider` + 7 `ContextProvider` (Inventory, Locations, CustomFields, Layout, Automations, GS1, Hardware) + `BatteryMonitor` | `expo-router:Stack`, `expo-battery:11` |
| 2 | `/(tabs)` (group) | `app/(tabs)/_layout.tsx:3` | `Tabs` 5 tab, `tabBarActiveTintColor theme.primary` | Container tab bar | `expo-router:Tabs` |
| 3 | `/(tabs)/index` (Home) | `app/(tabs)/index.tsx:6` | tab `index` | Grid prodotti, filtri `library`, `filterProducts('all'/'available'/'sold'/'alert')`, batch `selectedIds`, `router.push('/product/${id}')` | `expo-router useRouter useLocalSearchParams`, `expo-image:8` |
| 4 | `/(tabs)/timeline` | `app/(tabs)/timeline.tsx:6` | tab `timeline` | Cronologia `TimelineEvent` (`created/moved/modified/sold/scanned/photo_added/deleted/restored`), tap → `router.push('/product/${event.productId}')` | `expo-router` |
| 5 | `/(tabs)/automations` | `app/(tabs)/automations.tsx:6` | tab `automations` | Centro automazioni: built-in `batch-move/scan-sell/audit/quick-tag` + custom `automation-flow`, `router.push({pathname:'/automations/automation-flow', params:{id}}) as any` | `expo-router` |
| 6 | `/(tabs)/add` | `app/(tabs)/add.tsx:6` | tab `add` | Add prodotto: `ImagePicker.launchImageLibraryAsync`, `DocumentPicker.getDocumentAsync`, `Image` expo-image, `Sharing.shareAsync`, GS1 link, `router.push('/(tabs)')` | `expo-router`, `expo-image:10`, `expo-image-picker:7`, `expo-document-picker:8`, `expo-sharing:12` |
| 7 | `/(tabs)/settings` | `app/(tabs)/settings.tsx:6` | tab `settings` | Hub impostazioni: 8 voci → `gs1-config`, `hardware`, `folders`, `fields`, `layout-builder`, `trash`, `locations`, `share` | `expo-router`, `expo-file-system/legacy:7`, `expo-sharing:8` |
| 8 | `/scanner` | `app/scanner.tsx:5` | header custom `Scanner QR/Barcode` | Camera live `CameraView facing back enableTorch barcodeScannerSettings [qr,ean13,ean8,code128,code39]`, galleria `ImagePicker` + `FileSystem.readAsStringAsync base64` + `decodeBarcodeImage` (qrserver+zxing), manuale input, `soundService` | `expo-camera:5`, `expo-image-picker:8`, `expo-image-manipulator:9`, `expo-file-system/legacy:10` |
| 9 | `/scanner-action` (modal) | `app/scanner-action.tsx:6` | `presentation modal headerShown true #1A1A1A/#D4AF37` | Azione rapida su `type ∈ {product,location,library}` + legacy `productId`, `router.back/replace/push` (move/sold/details, location audit, library filter `/?library=ID`) | `expo-router`, `expo-image:7` |
| 10 | `/product/[id]` | `app/product/[id].tsx:5` | header false | Dettaglio prodotto: `Print.printToFileAsync({html})`, `FileSystem`, `ImageManipulator` resize 600px 0.5, `Clipboard.setStringAsync(gs1DigitalLink)`, `Sharing.shareAsync`, `Image expo-image`, `router.back/push('/product/edit/${id}')` | `expo-print:5`, `expo-file-system:6`, `expo-image-manipulator:7`, `expo-clipboard:11`, `expo-sharing:12`, `expo-image:13` |
| 11 | `/product/edit/[id]` | `app/product/edit/[id].tsx:6` | header false | Edit prodotto: `ImagePicker`, `DocumentPicker`, `Image`, `Sharing`, rigenerazione `gs1DigitalLink` | `expo-router`, `expo-image-picker:7`, `expo-document-picker:8`, `expo-image:9`, `expo-sharing:11` |
| 12 | `/settings/locations` | `app/settings/locations.tsx:6` | header `Gestisci Posizioni #0A0A0A` | CRUD `Location` (barcode, capacity, color) via `LocationsContext` | `expo-router` (dichiarato ma non navigato, header Stack) |
| 13 | `/settings/fields` | `app/settings/fields.tsx` | header `Campi Personalizzati` | CRUD `CustomField` (type, uiType, dataset, icon, linkTo, isBarcode) via `CustomFieldsContext` | — (header Stack) |
| 14 | `/settings/folders` | `app/settings/folders.tsx` | header `Gestisci Cartelle` | CRUD `Library` (id slug, icon, barcode/nfcTag) via `InventoryContext.addLibrary` | — |
| 15 | `/settings/layout-builder` | `app/settings/layout-builder.tsx:7` | header `Configura Layout Aggiungi` | Builder layout `add.tsx` (visibility, order `LayoutProvider`) | `expo-router` dead-code |
| 16 | `/settings/gs1-config` | `app/settings/gs1-config.tsx:6` | header `GS1 Digital Link` | Config GS1 (`GS1ConfigProvider`) | `expo-router` dead-code |
| 17 | `/settings/hardware` | `app/settings/hardware.tsx` | header `Scanner & Hardware` | Config hardware (flash, sound, NFC) via `HardwareConfigContext` | — |
| 18 | `/settings/trash` | `app/settings/trash.tsx:6` | — | Cestino: `getTrashProducts()`, `restoreProduct` / `permanentlyDeleteProduct`, `Image expo-image` thumb | `expo-router`, `expo-image:7` |
| 19 | `/settings/share` | `app/settings/share.tsx:6` | — | Share stub (CSV export via `settings.tsx:7` + `Sharing`) | `expo-router` |
| 20 | `/settings/sector-templates` | `app/settings/sector-templates.tsx:6` | — | Template settore → genera `CustomField` preset | `expo-router` |
| 21 | `/settings/automation-builder` | `app/settings/automation-builder.tsx:9` | headerShown false | Builder `CustomAutomation` (steps, `useLocalSearchParams().editId`, save `router.back()`) | `expo-router` |
| 22 | `/automations/automation-flow` | `app/automations/automation-flow.tsx:8` | headerShown false | Dettaglio flow custom: `router.push('/automations/custom-runner')` + `'/settings/automation-builder?editId'` | `expo-router` |
| 23 | `/automations/custom-runner` | `app/automations/custom-runner.tsx:8` | — | Runner step-by-step (scan next, `playSuccess/playAnomaly`, `_advanceToNextScanStep`) | `expo-router` |
| 24 | `/automations/audit` | `app/automations/audit.tsx:6` | — | Audit posizione: `InventoryContext` + `LocationsContext`, `soundService` | `expo-router` |
| 25 | `/automations/batch-move` | `app/automations/batch-move.tsx:6` | — | Batch move: sposta N prodotti → `moveProduct(id,newLocation)` + timeline `moved` | `expo-router` |
| 26 | `/automations/scan-sell` | `app/automations/scan-sell.tsx:6` | — | Scan & sell: `sellProduct(id,finalPrice)` + timeline `sold` | `expo-router` |
| 27 | `/automations/quick-tag` | `app/automations/quick-tag.tsx:6` | — | Quick tag: commonTags batch | `expo-router` |
| 28 | `/+not-found` | `app/+not-found.tsx:7` | — | 404: `LinearGradient ['#0a0a0a','#1a1a1a']`, `router.push('/')` singleton | `expo-linear-gradient:7`, `expo-router:8` |

> **Componenti extra non-route:** `components/BarcodeScanner.tsx:3` (`CameraView`, `Camera.requestCameraPermissionsAsync`, overlay focus 280px), `components/DynamicFieldRenderer.tsx:6` (renderer `FieldUIType` 10 tipi: `grid/stepper/segmented/text/gps-link/date/images/picker/modal_list/document`), `services/SoundService.ts:1` (`expo-av Audio.Sound` 2 wav 3kHz 8 pattern), `utils/barcodeDecoder.ts:6` (`expo-image-manipulator` 3 variazioni + `expo-file-system` + fetch qrserver/zxing).

## Dipendenze Expo effettive per screen (riepilogo)

- **Solo 16 pacchetti toccano UI:** vedi matrice in `.opencode/plans/remove-expo-full-eject.md:15`. Gli altri 37 (`expo-blur`, `expo-calendar`, `expo-contacts`, `expo-location`, `expo-notifications`, `expo-sensors` ecc) sono installati ma **mai importati** → rimozione senza impatto.
