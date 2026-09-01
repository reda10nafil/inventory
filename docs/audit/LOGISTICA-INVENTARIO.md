# Logistica & Inventario — Flussi Funzionali Completi

> Fonte: `contexts/InventoryContext.tsx:1`, `contexts/LocationsContext.tsx`, `contexts/CustomFieldsContext.tsx`, `contexts/LayoutContext.tsx`, `types/index.ts:3`, `app/(tabs)/index.tsx:6`, `app/(tabs)/add.tsx:6`, `app/product/[id].tsx:5`. Settore-agnostico: la stessa engine gestisce pellicce, accessori, food, hardware — basta cambiare `CustomField`/`Library`.

## 1. Modelli Dati (da `types/index.ts`)

**Product** `types/index.ts:4`:
```ts
id, sku (FUR-YYYY-###), furType, location, status: 'available'|'sold'|'archived',
images: string[], purchasePrice?, sellPrice?, length?, width?, weight?, productionDate?,
technicalNotes?, customData: ProductCustomData[] (value + fieldSnapshot),
createdAt, updatedAt, lastScannedAt?, soldAt?, deletedAt?, libraryId? (slug),
gs1DigitalLink? (URI generato al save), isFragile?: boolean
```
**Library** `InventoryContext.tsx:8` (`id` slug lowercase no-spazi, `name`, `icon`, `createdAt`, `barcode?`, `nfcTag?`). Default `pellicce`.
**Location** (da `contexts/LocationsContext.tsx`): `id, label, barcode?, capacity?, color`.
**TimelineEvent** `types/index.ts`: `id, productId, type: 'created'|'moved'|'modified'|'sold'|'scanned'|'photo_added'|'deleted'|'restored', timestamp, details {from,to,field,oldValue,newValue,finalPrice,photoCount,changes[]}`.
**CustomField** `types/index.ts`: `id, name, type: 'number'|'currency'|'date'|'text_short'|'text_long'|'images'|'single_choice'|'multi_choice'|'document', uiType: FieldUIType 10 valori, dataset?, unit?, icon?, options?, required, order, isSystem?, linkTo?: 'locations'|'libraries'|'furType', isBarcode?: boolean`.

## 2. Inventario Core (da `InventoryContext.tsx:21`)

- **Persistenza:** `AsyncStorage` (`@react-native-async-storage/async-storage:2.2.0` — **non** Expo) chiavi `products`, `timeline`, `alerts`, `libraries`. Load `loadData()` all mount, save su `useEffect` per ogni stato. Mock fallback `mockProducts`/`mockTimeline`.
- **CRUD:**
  - `addProduct(Omit<Product,'id'|'createdAt'|'updatedAt'>)` → genera `sku` se mancante (`FUR-YYYY-###` incrementale, `InventoryContext.tsx:154`), `id` `${Date.now()}-${random}`, `createdAt/updatedAt` now, `timeline created`.
  - `updateProduct(id, updates)` → track `changes[]` (location, sellPrice, purchasePrice, technicalNotes, images `photo_added`), `timeline modified` + `photo_added` se immagini aumentate.
  - `deleteProduct` → soft delete `deletedAt` + `timeline deleted`. `restoreProduct` → clear `deletedAt` + `restored`. `permanentlyDeleteProduct` → filter out.
  - `moveProduct(id,newLocation)` → `location` + `lastScannedAt` + `timeline moved {from,to}`.
  - `sellProduct(id,finalPrice?)` → `status sold`, `soldAt`, `lastScannedAt`, override `sellPrice` se passato, `timeline sold {finalPrice}`.
  - `scanProduct(id)` → `lastScannedAt` + `timeline scanned`.
- **Filtri:** `filterProducts('all'|'available'|'sold'|'alert'|'trash')`, `getTrashProducts()` (filter `deletedAt`), `alert` = `alerts.some(a.productId===id && !dismissed)`.
- **Alert automatici** `generateAlerts()` su ogni `products` change: `isDormant` (>6 mesi non mosso) → `alert-dormant`, `needsPromotion` (>3 mesi in magazzino) → `promotion_suggestion`. Merge con `dismissed`.
- **Library:** `generateSlug(name)` (NFD, accenti, dash), `addLibrary(name,icon)` con unique slug, `updateLibrary`, `deleteLibrary` (blocca se `products.filter(p.libraryId===id && !deletedAt).length>0` → `false`).

## 3. Logistica (Posizioni, Cartelle, Layout)

- **Locations** (`LocationsContext`): CRUD, `barcode` per scan, `capacity`/`color` per UI warehouse/showcase/workshop/stand (`constants/theme.ts:38` `warehouse #3B82F6`, `showcase #D4AF37`, `workshop #8B5CF6`, `stand #10B981`). Usate in `moveProduct` e `scanner.tsx:62` match `locations.find(l.barcode===data||l.id===data)`.
- **Library/Folder** (`app/settings/folders.tsx`): cartelle settore-agnostiche, usate per filtrare home `useLocalSearchParams().library` (`app/(tabs)/index.tsx:19`) e per scanner `libraries.find(l.barcode===data)` (`scanner.tsx:75`).
- **Layout** (`LayoutContext`): ordine/visibilità campi in `add.tsx` e `product/edit/[id].tsx` via `layout-builder` (`app/settings/layout-builder.tsx:7`). Topologia `FieldUIType` → `DynamicFieldRenderer`.
- **CustomFields** (`CustomFieldsContext`): definisce `CustomField` con `uiType` e `linkTo`. `DynamicFieldRenderer.tsx:6` renderizza 10 tipi: `grid` (stepper), `stepper`, `segmented`, `text`, `gps-link`, `date` (`@react-native-community/datetimepicker:8.4.4`), `images` (`expo-image-picker/document-picker`), `picker` (`@react-native-picker/picker:2.11.1`), `modal_list`, `document` (`expo-document-picker`). Ogni campo può avere `isBarcode` → bottone scanner, `linkTo` → opzioni dinamiche da `locations`/`libraries`.

## 4. Scanner & Acquisizione (da `app/scanner.tsx:5`, `components/BarcodeScanner.tsx:3`, `utils/barcodeDecoder.ts:6`)

- **Live scan:** `CameraView facing back enableTorch barcodeScannerSettings [qr,ean13,ean8,code128,code39,upc_e,upc_a]` + `onBarcodeScanned` → `handleBarCodeScanned(type,data)` con debounce 400ms e `soundService.playSuccess/playBlockingError`.
- **Risoluzione codice:** ordine `scanner.tsx:42-97`: 1) `products.find(sku===data||id===data)` → `push /scanner-action {type:product}`, 2) `locations.find(barcode===data||id===data)` → `location`, 3) `libraries.find(...)` → `library`, 4) `data.startsWith('AUTO:')` → `getAutomationByQR(data)` → `push /automations/custom-runner {id}`, 5) not found → `Alert Codice Non Riconosciuto` dopo 400ms (permette scan valido immediato successivo).
- **Galleria:** `ImagePicker.requestMediaLibraryPermissionsAsync` → `launchImageLibraryAsync({mediaTypes:['images'], allowsMultipleSelection:false, quality:1})` → `FileSystem.readAsStringAsync(uri,'base64')` → `decodeBarcodeImage(base64,imageUri)` (`utils/barcodeDecoder.ts:182`).
- **Decoder galleria:** `createImageVariations` 3 resize (`expo-image-manipulator` 2000 PNG, 1200 JPEG 0.9, 800 JPEG 0.75) → `tryQRServer` POST `https://api.qrserver.com/v1/read-qr-code/` + `tryZXing` POST `https://zxing.org/w/decode` con base64. Retry 300ms tra variazioni.
- **Manuale:** `TextInput` `manualCode` → `products.find(sku.toLowerCase===manual.toLowerCase||id===manual)` → `scanProduct(id)` + `push /scanner-action {productId}`.

## 5. Prodotto Detail & Edit (da `app/product/[id].tsx:5`, `app/product/edit/[id].tsx:6`)

- **Detail:** `useLocalSearchParams().id` → `getProductById`, `ImageManipulator.manipulateAsync resize 600 compress0.5` per thumb, `Print.printToFileAsync({html})` → `Sharing.shareAsync({UTI:'com.adobe.pdf', mimeType:'application/pdf'})`, `Clipboard.setStringAsync(gs1DigitalLink)`, `Sharing.shareAsync(uri)` per immagini/doc, `router.back` + `push /product/edit/${id}`.
- **GS1 Digital Link:** `GS1ConfigContext` genera `gs1DigitalLink` al save (`generateGS1DigitalLink` con GTIN + serial UUID). Validato in `services/gs1_service.dart` parallel Flutter.
- **Edit:** same `ImagePicker`/`DocumentPicker`/`Image`/`Sharing` + `updateProduct` + `Alert onPress router.back()` dopo save.

## 6. Export & Share (da `app/(tabs)/settings.tsx:7`)

- **CSV export:** `FileSystem.documentDirectory + 'export.csv'` + `writeAsStringAsync(csvContent, EncodingType.UTF8)` + `Sharing.isAvailableAsync()` → `shareAsync(fileUri)`. Mantenuto identico post-eject con `react-native-fs` + `react-native-share`.
- **NFC:** `react-native-nfc-manager:3.17.2` (non Expo) per `Ndef` read/write `Digital Link` (`utils/nfcService.ts`), permission `NFC` in `app.json:31` + `AndroidManifest.xml:7` + `ios entitlements NDEF/TAG`.

## 7. Settore-agnostico — come adattarsi

- Cambia solo `CustomField`/`Library`/`SectorTemplate` (`app/settings/sector-templates.tsx:6`): es. per food → campi `scadenza` (date), `lotto` (text), `peso` (number kg); per hardware → `seriale` (barcode), `collocazione` (linkTo locations). Nessuna modifica codice inventario/logistica.

## Checklist parità (usare `CHECKLIST_PARITA.md`)

- [ ] Add prodotto con `libraryId` slug, immagini, doc, barcode
- [ ] Move prodotto → timeline `moved` + alert dormant
- [ ] Sell → `sold` + `finalPrice`
- [ ] Scan live + galleria + manuale → `scanner-action` corretta
- [ ] Library create/delete (blocco se ha prodotti)
- [ ] Export CSV + share + print PDF + clipboard GS1
- [ ] NFC read/write Digital Link
