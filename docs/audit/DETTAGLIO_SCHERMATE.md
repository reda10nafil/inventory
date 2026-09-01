# Dettaglio Schermate — Syncro Flow (Audit minimo per ogni componente)

> Fonte: lettura diretta `app/**/*.tsx` (27 file), `contexts/*.tsx` (7), `services/*.ts`, `utils/*`, `components/*` il 2026-09-02. Ogni riga è verificabile `file:linea`. Build mode: questo file è la verità per parità post-eject.

## Indice
1. [Home — `app/(tabs)/index.tsx`](#1-home)
2. [Cronologia — `app/(tabs)/timeline.tsx`](#2-cronologia)
3. [Automazioni Hub — `app/(tabs)/automations.tsx`](#3-automazioni-hub)
4. [Aggiungi Prodotto — `app/(tabs)/add.tsx`](#4-aggiungi)
5. [Impostazioni Hub — `app/(tabs)/settings.tsx`](#5-impostazioni)
6. [Sotto-Impostazioni (10)](#6-sotto-impostazioni)
7. [Automazioni — 6 flussi](#7-automazioni-flussi)
8. [Scanner — `app/scanner.tsx` + `scanner-action.tsx` + `BarcodeScanner.tsx`](#8-scanner)
9. [Prodotto — Dettaglio `product/[id].tsx` + Modifica `product/edit/[id].tsx`](#9-prodotto)
10. [Navigazione — `_layout.tsx` + `(tabs)/_layout.tsx` + `+not-found.tsx`](#10-navigazione)
11. [Interazioni trasversali](#11-interazioni)

---

## 1. Home — `app/(tabs)/index.tsx:16`

**Ruolo:** griglia inventario con filtri multi-livello + batch actions. È la schermata più densa.

**Header `styles.header:500`:** `SafeAreaView edges=['top']` + `headerTitle "FurInventory Pro" 20` + `headerSubtitle "{filteredProducts.length} prodotti"` + a destra: se `selectedIds.length>0` → `TextButton "Seleziona Tutto/Deseleziona"` (`handleSelectAll`), altrimenti `iconButton search/close` (`MaterialIcons search 24 primary`) che toggla `isSearchVisible` e resetta `searchQuery`.

**Search `styles.searchContainer:683`:** condizionale `isSearchVisible` → `searchBox surface 44h border` con `search 20` + `TextInput placeholder "Cerca SKU, tipo, posizione..." autoFocus` + `cancel 18` se `searchQuery`. Filtro su `sku/furType/location` lowercase.

**Selettore Cartelle (Library) `styles.libraryScroll:723`:** `ScrollView horizontal` con chip `Tutti` (`apps 18`) + `libraries.map` (`lib.icon 18`, `lib.name`). `activeLibraryId` da `useLocalSearchParams().library` (deep link da `scanner-action` `/?library=ID`). Tap → `setActiveLibraryId`. Stato `libraryChipActive` gold `#D4AF37`, testo nero.

**Stats `styles.statsScroll:521`:** 3 card `surface` con `shadows.card`: `DISPONIBILI` (`stats.available`), `VENDUTI` (`stats.sold`), `RICHIEDONO ATTENZIONE` (`stats.alerts` con `warning 20` se >0, `border warning`). Calcolo su `folderFilteredProducts` (prima filtra per `activeLibraryId`, poi per `activeFilter`).

**Filtri Stato `styles.filterScroll:555`:** 5 chip `All (total-trash) / Disponibili / Venduti / Attenzione / Cestino` con count, `filterChipActive` gold. `activeFilter` default `all`.

**Griglia `FlatList:406`:** `data=filteredProducts` (dopo folder+status+search), `numColumns=2`, `paddingHorizontal 16`, `paddingBottom insets.bottom+16`, `keyExtractor id`, `renderProductCard`.

**Card Prodotto `renderProductCard:168`:** `Pressable productCard surface 12r overflow hidden border2 transparent` + `productCardSelected` gold se `selected`. `Image expo-image 160h cover` da `product.images[0]` + overlay selezione `checkbox 24 circle` + `selectionOverlay top8 right8`. Badge `badgeContainer top8`: `VENDUTO` (`sold` grigio) + `ALERT` (`warning` con `warning 12` se `hasAlert && available`). Info: `sku 14`, `furType` capitalized, `locationRow location-on 14` `location.replace('_',' ').toUpperCase()`, `priceText €sellPrice` gold 16. `onPress→handlePress` (se selezione attiva toggle, altrimenti `router.push('/product/${id}')`), `onLongPress→handleLongPress` (entra in selezione, `delayLongPress 300`).

**Bottom Bar Selezione `styles.bottomActionBar:860`:** condizionale `selectedIds.length>0` → `selectionInfo {count}` + `actionButtons`: `folder-open 24 #000` su `primary` (`setShowActionModal(true)`), `delete 24 #FFF` su `error` (`CONFIRM_DELETE_PRODUCT`), `close 24` (`exitSelectionMode`).

**Modal Azioni `Modal showActionModal:439`:** overlay `rgba(0,0,0,0.7)` + `modalContent surface 20p maxHeight80%`. `modalHeader "Gestisci N Prodotti"` + `modalSectionLabel "SPOSTA IN CARTELLA"` + `ScrollView` con `modalOption folder-off "Rimuovi dalla cartella"` + `libraries.map` (`folder` icon `primary`). `modalCancelButton Annulla`.

**Dati:** `useInventory {products, alerts, filterProducts, deleteProduct, updateProduct, libraries}`, `products.filter` per `activeLibraryId` (folder), `stats` su `folderFilteredProducts`, `filteredProducts` su `activeFilter` + `searchQuery`, `activeAlerts = alerts.filter(!dismissed)`, `trashProducts`.

**Azioni:** `toggleSelection`, `handleLongPress`, `handlePress`, `handleSelectAll`, `exitSelectionMode`, `handleMoveToLibrary(libraryId|undefined)` → `updateProduct(id,{libraryId})` batch + `Alert Spostato`, `CONFIRM_DELETE_PRODUCT` → `Alert Conferma Eliminazione` + `deleteProduct` batch (soft delete `deletedAt`), `setIsSearchVisible`, `setSearchQuery`, `setActiveLibraryId`, `setActiveFilter`.

**Navigazione:** `router.push('/product/${id}')` da card, `useLocalSearchParams().library` per deep link.

**Interazioni:** `InventoryContext` (products, libraries, alerts), `isDormant/needsPromotion` per `hasAlert`, `FlashList`/`FlatList`, `expo-image`, `MaterialIcons`.

---

## 2. Cronologia — `app/(tabs)/timeline.tsx:14`

**Header `styles.header:280`:** `SafeAreaView top` + `headerTitle "Cronologia Completa" 24` + `headerCount "{filteredTimeline.length} eventi" 14`.

**Filtri Tipo `styles.filterScroll:293`:** `ScrollView horizontal` 6 chip `Tutti / Creati / Spostati / Modificati / Venduti / Foto` (`filterType: all|created|moved|modified|sold|photo_added`), `filterChipActive` gold. `onPress setFilterType`.

**Filtri Data `styles.dateFilterScroll:300`:** 4 chip `Tutti i Periodi / Oggi / Questa Settimana / Questo Mese` (`dateFilter: all|today|week|month`), `dateChipActive` `primary30`. `filterByDate` su `event.timestamp` vs `now`.

**Lista `ScrollView:224`:** `paddingHorizontal 16`, `filteredTimeline = timeline.filter(type).filter(date).sort(desc timestamp)`. Empty `emptyState timeline 64` + `Nessun evento trovato`. Mappa `timelineItem surface 14p` → `eventIcon 48 circle bg ${color}20` con `getEventIcon` (`add-circle, swap-horiz, edit, sell, qr-code-scanner, add-photo-alternate, delete, restore-from-trash`) + `eventContent` (`eventTitle` via `getEventTitle` con `sku` da `getProductById` + `details.from/to/changes/finalPrice/photoCount`, `eventDescription` per `modified` slice `changes[1..]`, `eventDate toLocaleDateString it-IT`), `chevron-right 24`.

**Dati:** `useInventory {timeline, getProductById}`, `TimelineEvent {id, productId, type, timestamp, details}`.

**Azioni:** `setFilterType`, `setDateFilter`, `handleEventPress` → `if product exists router.push('/product/${event.productId}') else Alert Prodotto Non Trovato`.

**Interazioni:** `InventoryContext` timeline globale, `router`.

---

## 3. Automazioni Hub — `app/(tabs)/automations.tsx:45`

**Header `styles.header:174`:** `SafeAreaView top` + `headerTitle "Centro Automazioni" 20` + `scannerButton qr-code-scanner 24 primary15` (`router.push('/scanner')`).

**Sezione Mie Automazioni `styles.content:220`:** `sectionHeader` `LE MIE AUTOMAZIONI` + `createButton add 20 #FFF su primary "Crea Nuova"` (`router.push('/settings/automation-builder')`). Empty `emptyCard dashed auto-awesome 40` + `Nessuna automazione` + hint. Lista `automations.map` → `card surface 16p` con `iconContainer 56 circle ${color}20` + `icon 32 color` + `cardContent` (`cardTitle 18` + `cardDescription "N step · M utilizzi"`), `chevron-right 24`, `onPress→handleOpenCustom(id)` (`router.push('/automations/automation-flow', {id})`), `onLongPress→handleDeleteCustom` (`Alert Elimina` → `deleteAutomation`).

**Sezione Template `styles.content:130`:** `sectionTitle TEMPLATE PREDEFINITI` + `sectionDescription` + 4 `BUILTIN_AUTOMATIONS` (`batch_move #3B82F6 move-to-inbox`, `scan_sell #10B981 shopping-cart-checkout`, `audit #F59E0B fact-check`, `tagging #8B5CF6 label`) ognuna `card` con `onPress→handleStartBuiltin` (`router.push(route)`).

**Pro Tip `styles.proTip:289`:** `lightbulb 24 #F59E0B` + `Lo sapevi? Ogni automazione ha un QR...`.

**Dati:** `useAutomations {automations, deleteAutomation}`, `BUILTIN_AUTOMATIONS` constant.

**Azioni:** `handleStartBuiltin`, `handleOpenCustom`, `handleDeleteCustom`, `router.push` per scanner/builder/flow.

**Interazioni:** `AutomationsContext`, `Inventory`/`Locations` indiretto via automazioni.

---

## 4. Aggiungi Prodotto — `app/(tabs)/add.tsx:22`

**Header `styles.header:1027`:** `SafeAreaView top` + `KeyboardAvoidingView ios:padding else:height` + `ScrollView paddingHorizontal 16`. `headerTitle "Aggiungi Prodotto" 24` + `add-photo-alternate 32 primary`.

**Campi base (da `visibleFields` di `LayoutContext`):**
- `images:710` Full: `sectionTitle FOTO PRODOTTO (n/10)` + `mainImageContainer` `ScrollView horizontal paging` `imageWidth=screenWidth-32` `mainImage 280 cover` + `removeMainImageButton 36` + `imageIndicator` + `dotsContainer` + thumbnails `imageThumb 80` + `addImageButton 80 dashed add-a-photo`.
- `sku:711` medium: `TextInput placeholder Auto: FUR-YYYY-###` + `qrButton qr-code-2 24` (`generateSKU`), helper `Generato automaticamente se vuoto`.
- `furType:738` full: `ScrollView horizontal` chips `FUR_TYPES` (`chipDot color`).
- `location:758` medium: chips `locations` con `dot color`.
- `folder:779` medium: chips `Nessuna` + `libraries` (`lib.icon`).
- `purchasePrice:804` medium: `inputWithIcon euro`.
- `sellPrice:817` medium.
- `length:830` small: `85 cm`, `width:843`, `weight:856` (`1.2 kg`).
- `technicalNotes:869` full: `TextInput multiline 4`.

**Campi custom (da `customFields` + `layout.fields`):** `renderDynamicField` switch su `customField.type/uiType`:
- `picker/modal_list:382` → `Pressable` con `keyboard-arrow-down 24`, `selectModalConfig` bottomSheet.
- `grid/segmented/single/multi_choice:408` → `quickSettingsGrid` tiles `30% aspect1` con `check-circle/radio-button-unchecked 28`.
- `stepper:478` → `-`/`+` con `min/max/step` da `dataset`.
- `images:498` → `ScrollView horizontal` 80 + `add-a-photo`.
- `date:542` → `Pressable` + `DateTimePicker spinner/default`.
- `document:573` → lista `insert-drive-file` + `Sharing.shareAsync` + `delete` + `upload-file`.
- `text_short isBarcode:612` → `TextInput` + `qr-code-scanner` fake `SCAN-xxxx`.
- default `text_long/number/currency:638` → `inputWithIcon`.

**Seleziona Cartella/Library/Posizione:** chips con `getDynamicOptionsList` (`linkTo locations/libraries/furType`).

**Footer:** `submitButton primary check-circle 24 "Aggiungi all'Inventario"` (`handleSubmit` → valida `sku/furType/location` + `Alert Campi Obbligatori`, se `images 0` `Alert Attenzione` con `Continua Senza Foto`, poi `submitProduct` → `generateGS1DigitalLink` se `gs1Config.baseUrl` + `addProduct` + `Alert Prodotto Aggiunto` + `router.push('/(tabs)')`), `footNote * Campi obbligatori`.

**Modal Select `selectModalConfig:936`:** `Modal slide transparent` con `background rgba(0,0,0,0.5)`, `borderTopRadius 24`, `maxHeight 80%`, lista `options` con `check 24 primary`, `Conferma Selezione` per `isMulti`.

**Dati:** `useInventory {addProduct, products, libraries}`, `useLocations {locations}`, `useCustomFields {customFields}`, `useLayout {layout, getVisibleFields}`, `useGS1Config {gs1Config}`, `customFieldValues Record<string,any>`, `formData`, `images`, `FUR_TYPES`.

**Azioni:** `generateSKU`, `updateField`, `showImageSourcePicker` (ActionSheet iOS / Alert Android) → `pickImages` (`launchImageLibraryAsync allowsMultipleSelection 10-images.length quality 0.8`), `pickFromFiles` (`DocumentPicker image/*`), `takePhoto` (`launchCameraAsync`), `removeImage`, `pickDocument`, `handleSubmit`, `submitProduct`, `getSizeStyle`, `renderDynamicField`.

**Interazioni:** `LayoutContext` definisce `visibleFields` e `size`, `CustomFieldsContext` per campi, `GS1` per `gs1DigitalLink`, `Inventory` per `addProduct`, `expo-image-picker/document-picker/sharing` per media.

---

## 5. Impostazioni Hub — `app/(tabs)/settings.tsx:12`

**Header `styles.header:652`:** `SafeAreaView top` + `ScrollView paddingHorizontal 16`. `headerTitle "Impostazioni" 24`.

**Sezioni:**
- `CONFIGURAZIONE HARDWARE` → `GS1 Digital Link` (`link 24 #F59E0B` + `router.push('/settings/gs1-config')`), `Scanner & NFC` (`settings-cell #3B82F6` → `/settings/hardware`).
- `GESTIONE INVENTARIO` → `Gestisci Cartelle` (`folder #3B82F6` → `/settings/folders`), `Campi Personalizzati` (`tune #10B981` → `/fields`), `Configura Layout Aggiungi` (`dashboard-customize #8B5CF6` → `/layout-builder`), `Cestino` (`delete error` → `/trash`), `Gestisci Posizioni` (`location-on primary` → `/locations`).
- `CONDIVISIONE` → `Configurazione Condivisione` (`share #06B6D4` → `/share`).
- `ALERT E NOTIFICHE` → `Alert Prodotti Dormienti` / `Suggerimenti AI` (entrambi `showComingSoon`).
- `DATI E BACKUP` → `Esporta Inventario` (`file-download #10B981` → `exportToCSV` `FileSystem.documentDirectory + inventario_{Date.now()}.csv` + `Sharing.shareAsync`), `Backup Cloud` (`cloud-upload #3B82F6` → `showComingSoon`).
- `TEAM E ACCESSO` → `Accesso Multi-Utente` (`people #8B5CF6` → `showComingSoon`).
- `INFO` → `infoCard surface 20p` con `FurInventory Pro 1.0.0` + `DATABASE LOCALE`.

**Azioni:** `router.push` per 7 voci, `exportToCSV` (genera CSV con `sku,furType,location,status,purchasePrice,sellPrice,length,width,weight,technicalNotes`), `showComingSoon` per altre.

**Interazioni:** `InventoryContext` per `products` (export), `expo-file-system` + `expo-sharing`.

---

## 6. Sotto-Impostazioni (10)

### 6.1 GS1 Config `app/settings/gs1-config.tsx:1`
- `infoCard link`, `card Endpoint` `TextInput baseUrlLocal url`, `card AI01 GTIN` `Obbligatorio lock`, `card AI21 Seriale` `Switch enableSerial` + `segmented UUID/Progressivo`, `card AI10 Lotto` `Switch enableLotto` + `fieldPickerGrid` (campi `text_short/long` non system) o `Nessun campo...`, `previewCard qr-code 180` con `previewLink monospace` + `previewBreakdown` dot base/AI01/AI21/AI10, `resetButton restore`. `updateGS1Config` su ogni toggle, `handleReset` con `Alert`.

### 6.2 Hardware `app/settings/hardware.tsx:1`
- `infoCard settings-cell`, `card Modalità` `segmented 3` `Solo QR/Solo NFC/Entrambi` (`scanMode`), `card Scrittura Automatica NFC` `Switch autoWriteNfcOnSave`, `card Diagnostica` `health-and-safety` → `handleTestNfc` (`nfcService.isSupported/isEnabled` + `Alert`).

### 6.3 Cartelle `app/settings/folders.tsx:1`
- `formCard CREA/MODIFICA` `TextInput name`, `iconPicker 8` (`folder, inventory...`), `barcodeRow TextInput + qr-code-scanner + autorenew` + `qrPreview 60`, `actionButtons Annulla/Crea/Salva`, `warningText`. Lista `libraries.map` con `libraryIcon`, `libraryInfo` (`name, count, ID: {id} • 🏷️ {barcode}`), `itemActions qr-code/delete`. Modali `BarcodeScanner` + `Modal QR 200`. `handleSave` valida `name`, `addLibrary` (nota: `barcode` ignorato su creazione), `updateLibrary`, `deleteLibrary` con `getItemCount` blocco se `>0`, `generateBarcode LIB-...`, `handleBarCodeScanned`.

### 6.4 Campi `app/settings/fields.tsx:1`
- `sectionTitle CAMPI ATTIVI`, `addButton Crea Nuovo Campo`, `infoCard security`. Lista `fieldCard` con `fieldIcon`, `fieldName + Base/Obblig`, `fieldType + uiType + unit`, `fieldOptions dataset`, `edit/delete`. `Modal Field Builder` 2 step: Step1 `FIELD_TYPE_INFO` 9 tipi (`number/currency/date/text_short/text_long/images/single/multi_choice/document`) + Step2 `Nome *`, `Unità` se number/currency, `Scegli icona 41`, `Intelligenza Avanzata` (`isBarcode` per `text_short`, `Aspetto UI` `grid/segmented/picker/modal_list`, `Sorgente Dati` `Manuale/locations/libraries/furType`, `Opzioni` con `remove-circle`), `Contatore STEPPER` + `Min/Max`, `requiredToggle`. `handleSaveField` valida `selectedBaseType && fieldName`, `addField/updateField`, `deleteField` soft.

### 6.5 Layout Builder `app/settings/layout-builder.tsx:1`
- `instructionsContainer info-outline`, `previewHeader MODELLI/SEZIONE/CAMPO`. `localFields.map` → `fieldCard` (`fieldCardHidden`, `fieldCardSelected`) con `moveButtons up/down`, `TextInput` per `section`, `icon`, `sizeIndicator 33/50/100%`, `visibility`, `close` remove. `sizeSelector 3` + `ScrollView icone 80+`. `bottomBar Salva Layout`. Modali `Templates` (`PREDEFINED_TEMPLATES`) + `AddFieldModal` (customFields non in layout). `moveField`, `handleSizeChange`, `toggleFieldVisibility`, `handleSave` (`saveLayout`), `loadTemplate`.

### 6.6 Cestino `app/settings/trash.tsx:1`
- `header back + "Cestino (n)"` dove `n=trashProducts.length+deletedFields.length`. Empty `delete-outline`. Se non vuoto: `CAMPI ELIMINATI` + `fieldCard` con `restore/delete-forever`, `PRODOTTI ELIMINATI` `FlatList` con `Image expo-image 100` + `content` (`sku, furType - location, deletedDate rossa`) + `actions restore/delete`. `handleRestore*`/`handleDeleteForever` con `Alert`.

### 6.7 Posizioni `app/settings/locations.tsx:1`
- `formCard AGGIUNGI/MODIFICA` `TextInput name`, `colorRow 10` (`#3B82F6`...), `barcodeRow TextInput + qr-code-scanner + autorenew` + `qrPreview`, `actionButtons`. Lista `locations.map` con `locationColor dot`, `locationInfo` (`label, ID: {id} • 🏷️ {barcode}`), `itemActions qr-code/delete`. Modali `BarcodeScanner` + `QR 200`. `handleSave` valida `name`, `newId=name.toLowerCase().replace(/[^a-z0-9]/g,'_')`, `addLocation/updateLocation`, `deleteLocation` se `locations.length>1`, `generateBarcode LOC-...`, `handleBarCodeScanned`.

### 6.8 Condivisione `app/settings/share.tsx:1`
- `header back`, `infoCard info-outline`, `section MODALITÀ CLIENTE` `previewCard` 6 `check-circle success` + 3 `cancel`, `MODALITÀ PROFESSIONISTA` 6 check, `noteCard Nota: foto NON condivise`. Solo `router.back`.

### 6.9 Modelli Settore `app/settings/sector-templates.tsx:1`
- `header back + Modelli Settore`, `subtitle`, `templateCard` per `SECTOR_TEMPLATES+userTemplates` con `emoji 56`, `name, desc, n campi`, `chevron`, `customBadge` + `delete`. `saveTemplateButton save`. `Modal Anteprima` con `templateInfoCard` + `CAMPI INCLUSI` lista `fieldPreview` + `importFullButton download`. `handleImportTemplate` (`addField` loop, `Alert Successo/Info`), `handleSaveCurrentAsTemplate` (`AsyncStorage`).

### 6.10 Builder Automazioni `app/settings/automation-builder.tsx:1`
- `header close + {Modifica/Nuova} + Salva`, `section NOME` `TextInput`, `DESCRIZIONE` multiline, `ICONA & COLORE` `ScrollView` 10 icone + 10 colori, `FLUSSO` `emptyFlow account-tree` o `flowContainer` `flowNode` (`meta.color/icon/label` + `Step N`) + `connector arrow-downward` + `delete`, `addStepButton dashed add`, `ANTEPRIMA` `previewCard` con `QR: AUTO:...`, Modali `Scegli Tipo di Step` 6 opzioni (`scan_product/location, move_to, mark_sold, add_tag, set_field`) + `Config` per `add_tag` (`TextInput tag`), `set_field` (`nome/valore`), `move_to` (`toggle Usa ultima posizione scansionata` + `locations`), `mark_sold` (`toggle Chiedi conferma prezzo`). `handleAddStep`, `handleSaveConfig`, `removeStep`, `handleSave` (`addAutomation/updateAutomation`).

---

## 7. Automazioni — 6 flussi

### 7.1 Audit `app/automations/audit.tsx:1`
- `header close Audit Posizione`, Step `scan_location` (`fact-check 64 warning`, `scanButton qr-code-scanner`, `locationsGrid` 6 `locationChip`), Step `audit_loop` (`auditHeader` con `AUDIT IN CORSO + targetLocation` + `progressContainer` cerchio `found/total%` + `statsRow` `found/missing/intruders` + `FlatList auditItems` con `itemCard found #ECFDF5 check-box / intruder #FFFBEB warning / missing muted`, `footer scanFab 64 warning`). Scanner `BarcodeScanner` + `feedbackOverlay`. `handleLocationScan` (`locations.find id/label/barcode`), `startAudit` (expected `products.filter location===id`), `handleProductScan` (found→`found`, intruder→`Alert Intruso` con `Ignora/Aggiungi/Sposta Qui & Aggiungi` + `updateProduct`), `addIntruder`.

### 7.2 Flow `app/automations/automation-flow.tsx:1`
- `header arrow-back + name + edit/delete`, not-found `error-outline`, `ScrollView` con `infoCard 72 icon ${color}20`, `infoStats 3 colonne`, `MAPPA DEL FLUSSO` con `INIZIO play-circle-filled #10B981` + `flowCard borderLeft 4 meta.color` per ogni `step` + `connectorArrow` + `FINE stop-circle #EF4444`, `qrContainer QRCode 180 value=qrValue` + `shareButton`, `floatingBar runButton automation.color play-arrow Avvia`. `handleDelete` (`Alert`), `handleShare` (`Share.share`), `handleRun` (`router.push custom-runner`).

### 7.3 Batch Move `app/automations/batch-move.tsx:1`
- `header close Spostamento Rapido`, Step `scan_location` (`location-on 64 primary`, `scanButton`, `locationsGrid`), Step `scan_products` (`targetCard Destinazione Attuale: targetValue 32 primary + Cambia`, `statsContainer cerchio scannedCount`, `lastActionCard #ECFDF5` se `lastScannedProduct`, `scanButton Scansiona Prodotto`, `BarcodeScanner delay 500` + `feedbackOverlay`). `checkCapacityAndSetLocation` (`currentItems vs capacity` + `Alert Posizione Piena` con `getNextLocation`), `handleProductScan` (`updateProduct location`, `scannedCount+1`, `playSuccess`, `feedback`).

### 7.4 Custom Runner `app/automations/custom-runner.tsx:1`
- `header close + name + completedCount + headerBadge`, `progressBar dots 10` (`<current #10B981, current color, else border`), Complete `check-circle 80 #10B981` + `doneButton`. Step `stepCard surface` con `stepIcon 80 ${meta.color}20`, `stepLabel`, `stepMeta Step X di Y`, `scanButton meta.color` se `scan_*`, `miniFlow PROSSIMI STEP` (3), `Scanner Overlay` + `feedbackOverlay`, `toast` + `Modal Prezzo` (`priceInput numeric`). Engine `executeAutoStep` (`move_to/add_tag/set_field/mark_sold`), `handleScan` (`getProductBySku/locations.find`), `advanceToNextScanStep` (loop su `scan_*`, auto-esegue non-scan, loopback su ultimo `scan_product`), `confirmSale` (`sellProduct`), `recordUsage` su mount.

### 7.5 Quick Tag `app/automations/quick-tag.tsx:1`
- `header close Tagging Rapido`, Step `select_tag` (`label 64 info`, `tagsGrid 2col` 4 `COMMON_TAGS` `Da Pulire/Riparare/Riservato/Vetrina` + `customTagContainer TextInput + goButton arrow-forward`), Step `scan_loop` (`statusCard MODALITÀ TAGGING ATTIVA + activeTagBadge + count + lastActionCard`, `scanButton Scansiona Prodotto`, `stopButton Termina`). `handleStartTagging`, `handleBarCodeScanned` continuous (`updateProduct technicalNotes` con `[activeTag]`).

### 7.6 Scan Sell `app/automations/scan-sell.tsx:1`
- `header close Vendita Flash`, `statsContainer` 2 `statBox` (`scannedCount`, `totalRevenue €`), `lastActionCard`, `shopping-cart-checkout 64 success` + `scanButton`, `Modal Prezzo` (`productInfo sku 24 primary`, `TextInput numeric priceInput` `backgroundSecondary 24 center`, `confirmButton success CONFERMA`). `handleBarCodeScanned` (`find id/sku` → `setPendingProduct` + `showPriceModal`, se `sold` `Alert già venduto`), `confirmSale` (`sellProduct` + `totalRevenue` + `playSuccess` + `setTimeout 500 setShowScanner(true)`).

---

## 8. Scanner — `app/scanner.tsx:1` + `scanner-action.tsx:6` + `BarcodeScanner.tsx:1`

**Scanner `app/scanner.tsx:5`:** `SafeAreaView top` `header Scanner QR/Barcode 20 + flashButton 44 flash-on/off primary` + `cameraContainer flex1 margin16 large overflow hidden backgroundSecondary` `CameraView facing back enableTorch barcodeScannerSettings [qr,ean13,ean8,code128,code39] scanFrame 4 corner 40 primary 25%/15%` + `instructionsContainer center-focus-strong 48 + Inquadra` + `actionsContainer 2 actionButton surface border photo-library/keyboard` + `Modal isAnalyzing ActivityIndicator` + `Modal showManualInput TextInput SKU-001`. `handleBarCodeScanned` 5-step: product (`sku/id`) → `sound+push scanner-action type product`, location (`barcode/id`) → `location`, library (`barcode/id`) → `library`, `AUTO:` → `getAutomationByQR` → `push custom-runner`, else `Alert Codice Non Riconosciuto` 400ms. `pickQRImage` (`launchImageLibraryAsync` → `FileSystem.readAsStringAsync base64` → `decodeBarcodeImage`), `handleManualSearch` (`sku/id` → `scanProduct + push`).

**Action `app/scanner-action.tsx:6`:** `SafeAreaView backgroundSecondary` `presentation modal header #1A1A1A/#D4AF37 Azione Rapida` (`app/_layout.tsx:74`). Branch `type`: `location` → `headerCard surface borderLeft 6` + `POSIZIONE` + `capacity` + `AZIONI SPOSIZAMENTO/VENDITA` + `closeButton`; `library` → `VEDI PRODOTTI` + `push /?library=ID`; `product` → `productPreview flexRow surface` `Image 100 cover` + `details sku 18` + `locationBadge` + `AZIONE RAPIDA` 3 `actionButton surface border2` (`move-to-inbox #3B82F6`, `sell #10B981`, `edit primary`) + `optionsContainer backgroundSecondary` con `optionChip dot12` + `priceInput`; `selectedAction moved/sold/details/audit/batch-move`; `executeButton disabled !selectedAction`. `router.back/replace/push`.

**BarcodeScanner `components/BarcodeScanner.tsx:1`:** `hasPermission`, `scanned`, `Camera.requestCameraPermissionsAsync`, `CameraView facing back onBarcodeScanned barcodeTypes [7]`, overlay `unfocused 0.6` + `focused 280` + 4 `cornerTL/TR/BL/BR 40 border4 primary`, `controls bottom 50 Inquadra + closeRoundButton 64 error`.

---

## 9. Prodotto — Dettaglio + Modifica

**Dettaglio `app/product/[id].tsx:1`:** `SafeAreaView top` `ScrollView paddingBottom insets.bottom+80`. `imageGalleryContainer` `ScrollView horizontal paging heroWidth=screenWidth Image 320 contain bg backgroundSecondary` + `imageCounter rgba0.7` + `paginationDots` + `soldBadge sell` top16 right16. `content padding 16`: `titleRow sku 24 + furType + shareButton 44`, `locationCard flexRow border2 location.color` + `location-on`, `priceSection` 2 cards `Acquisto/Vendita` + `measureSection` 3 cards `straighten/width-wide/scale` + `notesSection` + `customFieldsSection flexWrap` (per `customData` snapshot: `text_long` full, `multi_choice` chips, `document` `Sharing.shareAsync`, `images` `ScrollView 100`, `date 48% event`, `currency attach-money`, default `info`), `timelineSection dot 12 primary` + `showMoreButton`, `qrSection/gs1Section` `QRCode 160 value=gs1DigitalLink` + `Copia Link` (`Clipboard.setStringAsync`) + `Programma Tag` (`nfcService.writeGS1Uri`), `bottomActions absolute bottom gap12 Indietro surface + Modifica primary edit`, `Modal QR/Barcode` (`qrcodejs`/`JsBarcode` + `Print.printToFileAsync` + `Sharing.shareAsync` `com.adobe.pdf`) + `Modal Image Viewer` `StatusBar hidden` `modalContainer #000`. `handlePrintLabel/handlePrintPDF` (`ImageManipulator resize600 compress0.5` + `FileSystem.readAsStringAsync base64` + `timelineHTML/galleryHTML`), `handleShare` (`Share.share` Cliente/Professionista), `handleCopyGS1Link`, `handleProgramNFC`.

**Modifica `app/product/edit/[id].tsx:1`:** `SafeAreaView top` `KeyboardAvoidingView ios:padding` `ScrollView`. `headerTitle Modifica Prodotto 24 + edit 32`. `mainImageContainer` `ScrollView horizontal paging imageWidth=screenWidth-32 mainImage 280 cover` + `removeMainImageButton 36` + `dots` + `thumbnails 80` + `addImageButton 80 dashed add-a-photo` (Galleria/Fotocamera via `ImagePicker quality 0.8`, `allowsMultipleSelection 10-images.length`). Form `sectionTitle INFORMZIONI BASE *` `sku TextInput + qrButton generateSKU`, `furType` chips `FUR_TYPES`, `location` chips `locations` con `dot`, `folder` chips `libraries`, `PREZZI` 2x `purchasePrice/sellPrice` `inputWithIcon euro`, `MISURE` 3x `length/width/weight`, `NOTE TECNICHE` textarea, `existingFields` custom: `grid/segmented` tiles `30% aspect1`, `picker/modal_list` `Pressable keyboard-arrow-down` → `Modal`, `stepper` `- / +` con `min/max/step`, `images` `ScrollView 80` + `add-a-photo`, `date` `Pressable calendar-today` + `DateTimePicker`, `document` `insert-drive-file` + `Sharing.shareAsync` + `delete` + `upload-file` (`DocumentPicker`), `text_short isBarcode` `TextInput` + `qr-code-scanner SCAN-xxxx`, default `tune`. `bottomActions Annulla secondary + Salva Modifiche primary`. `Modal select` `borderTopRadius24 maxHeight80%`. `handleSave` valida `sku/furType/location`, `Alert` se `images 0`, `generateGS1DigitalLink` con `lottoFieldId`, `updateProduct` + `Alert Modifiche Salvate → router.back`.

---

## 10. Navigazione — `_layout.tsx` + `(tabs)/_layout.tsx` + `+not-found.tsx`

**Root `app/_layout.tsx:1`:** `SafeAreaProvider` → nesting `AutomationsProvider > LocationsProvider > CustomFieldsProvider > LayoutProvider > HardwareConfigProvider > GS1ConfigProvider > InventoryProvider` + `BatteryMonitor` (`expo-battery getBatteryLevelAsync/getBatteryStateAsync` ogni 15s, `level<0.15 && state!==CHARGING` → `soundService.playBatteryLow()` throttled 60s). `Stack screenOptions headerShown:false` con 14 `Stack.Screen`: `(tabs) false`, `product/[id] false`, `product/edit/[id] false`, `scanner-action modal headerShown true #1A1A1A/#D4AF37 Azione Rapida`, `settings/locations true #0A0A0A/#D4AF37 Gestisci Posizioni`, `settings/fields Campi Personalizzati`, `settings/folders Gestisci Cartelle`, `settings/layout-builder Configura Layout Aggiungi`, `settings/gs1-config GS1 Digital Link`, `settings/hardware Scanner & Hardware`, `settings/automation-builder false`, `automations/automation-flow false`, `automations/custom-runner false`.

**Tabs `app/(tabs)/_layout.tsx:1`:** `Tabs tabBarStyle height 60+insets.bottom, paddingTop8 paddingBottom 8+insets, paddingHorizontal16 bg background borderTop1 border, tabBarActiveTintColor primary, inactive textSecondary, label 11 600, MaterialIcons 24: grid-view Home, timeline Cronologia, account-tree Automazioni, add-circle Aggiungi, settings Impostazioni` (`Platform.select` per ios/android).

**Not Found `app/+not-found.tsx:1`:** `SafeAreaView #0a0a0a` + `LinearGradient #0a0a0a→#1a1a1a absoluteFill` + `content center padding20` `photo-camera 80 #FFD700`, `Page Not Found 28 white`, `The moment... 16 #CCCCCC`, `homeButton bg #FFD700 padding30x15 radius25 Return Home #0a0a0a 16` (`router.push('/')`), `expo-linear-gradient`.

---

## 11. Interazioni trasversali (come ogni componente parla con gli altri)

| Sorgente | Destinazione | Meccanismo | Esempio flusso |
|---|---|---|---|
| **Home** → **Prodotto Dettaglio** | `router.push('/product/${id}')` | `press` su card non in selezione | Home grid → Detail con `getProductById` |
| **Home** → **Scanner Action** | `useLocalSearchParams().library` | `scanner-action` fa `router.push('/?library=ID')` per filtrare Home per cartella | Library scan → Home filtrata |
| **Home Batch** → **Inventory** | `updateProduct(id,{libraryId})` / `deleteProduct` | `handleMoveToLibrary` / `CONFIRM_DELETE` batch su `selectedIds` | Seleziona 3 prodotti con long-press → Sposta in "Pellicce" → `InventoryContext` + `Alert` |
| **Scanner** → **Inventory/Locations/Libraries/Automations** | `handleBarCodeScanned` 5-step | `products.find sku/id`, `locations.find barcode/id`, `libraries.find`, `getAutomationByQR AUTO:` → `router.push scanner-action/custom-runner` | Scansione QR `AUTO:xxx` → `custom-runner` con `Steps` |
| **Scanner** → **BarcodeDecoder** | `pickQRImage` → `FileSystem.readAsStringAsync base64` → `decodeBarcodeImage` (3 variazioni `ImageManipulator` + `qrserver` + `zxing` con `expo-file-system` + `fetch`) | Galleria → `decodeBarcodeImage` → `Alert` o `push` |
| **Add Prodotto** → **Layout+CustomFields+GS1+Inventory** | `visibleFields=LayoutContext.getVisibleFields()` + `customFields.find` + `generateGS1DigitalLink(gs1Config)` → `addProduct` | Form dinamico con `Layout` (ordine/size/visibilità) + `CustomFields` (tipo/uiType) → `Inventory` + `GS1` link → `Sound` + `Hardware autoWriteNfcOnSave` |
| **Add Prodotto** → **Locations/Libraries** | `locationOptions` / `libraries` chips | `FUR_TYPES` + `locations` + `libraries` come sorgenti per `getDynamicOptionsList` quando `customField.linkTo` = `locations/libraries/furType` |
| **Prodotto Dettaglio** → **Inventory/Locations/CustomFields** | `getProductById` + `getTimelineForProduct` + `locations.find` + `customFields.find` per `fieldSnapshot` | Detail mostra `customData` snapshot (immutabile) anche se campo cancellato |
| **Prodotto Dettaglio** → **Sharing/Print/NFC/Clipboard** | `Print.printToFileAsync({html})` → `Sharing.shareAsync` PDF, `Share.share` Cliente/Professionista, `Clipboard.setStringAsync(gs1DigitalLink)`, `nfcService.writeGS1Uri` | Stampa etichetta QR/barcode + scheda PDF con `ImageManipulator` + `FileSystem` base64 |
| **Modifica Prodotto** → **Inventory+GS1** | `updateProduct` con `gs1DigitalLink` rigenerato via `lottoFieldId` | Edit ricalcola `gs1DigitalLink` e salva `customData` con nuovi snapshot |
| **Locations/Folders** → **Inventory** | `addLibrary/updateLibrary/deleteLibrary` con `getItemCount` blocco, `addLocation` con `newId` slug | Cartella con `barcode` scansionabile per muovere prodotti |
| **Fields** → **Layout+GS1+Inventory** | `addField/updateField/deleteField` soft, `linkTo` per `locations/libraries`, `isBarcode` per scanner in form | Nuovo campo `isBarcode` appare in Add/Edit con `qr-code-scanner` |
| **Layout Builder** → **CustomFields+Inventory** | `applyTemplate` crea `customFields` mancanti via `addField`, `addSectionHeader`, `updateFieldOrder/Size/Icon` | Modelli Settore (`SECTOR_TEMPLATES`) importano campi in `sector-templates.tsx` + layout in `layout-builder` |
| **Trash** → **Inventory+CustomFields** | `getTrashProducts` / `getDeletedFields` + `restore/permanentlyDelete` | Ripristino riporta in `filterProducts` |
| **Automazioni Hub** → **AutomationsContext** | `deleteAutomation`, `router.push automation-flow` | Long-press delete |
| **Automation Flow** → **Custom Runner** | `router.push('/automations/custom-runner', {id})` + `recordUsage` su mount | Flow visualizza `STEP_TYPE_META` + `qrValue` stampabile |
| **Custom Runner** → **Inventory/Locations/Sound** | `moveProduct/sellProduct/updateProduct` + `playSuccess/playBlockingError` + `Vibration` | Engine esegue `scan_product` → `move_to` con `useLastScannedLocation` |
| **Batch Move** → **Locations/Inventory** | `checkCapacityAndSetLocation` (`capacity` vs `currentItems`) + `getNextLocation` | Sposta rapido con controllo capienza |
| **Scan Sell** → **Inventory** | `sellProduct(id,finalPrice)` + `totalRevenue` | Vendita flash con `priceInput` modal |
| **Quick Tag** → **Inventory** | `updateProduct technicalNotes` con `[activeTag]` | Tagging di massa via `technicalNotes` |
| **Audit** → **Inventory/Locations** | `startAudit` con `products.filter location`, `updateProduct` per intrusi | Inventario fisico vs digitale |
| **GS1 Config** → **CustomFields+Inventory** | `lottoFieldCandidates = customFields.filter text_short/long` | AI10 Lotto mappa a campo custom |
| **Hardware** → **Scanner/NFC** | `scanMode qr_only/nfc_only/both` + `autoWriteNfcOnSave` + `nfcService.isSupported/isEnabled` | Diagnostica NFC |
| **SoundService** | Tutti | `playSuccess 1 bip`, `playAnomaly 3x400`, `playBlockingError long`, `playFragileAlert 2x600`, `playOrderComplete 4x150`, `playBatteryLow 2x1200`, `playUrgentOrder 5x100` + fallback `Vibration` | Feedback aptico/sonoro globale |
| **Timeline** | `InventoryContext` | `timeline` con 8 tipi + `details` + `Alert` dormienti/promozione via `isDormant/needsPromotion` | Cronologia globale + per prodotto |

> Ogni componente persiste via `AsyncStorage` con chiavi separate (`products`, `timeline`, `alerts`, `libraries`, `furinventory_*`), nessun context scrive direttamente in un altro — comunicazione solo via props/hooks nelle screen.

