# Checklist Parità — Verifica post-eject (da spuntare)

> Ogni riga deve restare verde dopo ogni Fase del piano `.opencode/plans/remove-expo-full-eject.md`. Se una riga diventa rossa → regressione.

## Build & Tooling
- [ ] `powershell -ExecutionPolicy Bypass -Command "npx tsc --noEmit"` zero errori (era `expo/tsconfig.base` → `@react-native/typescript-config`)
- [ ] `powershell -ExecutionPolicy Bypass -Command "npx eslint ."` zero errori (era `eslint-config-expo`)
- [ ] `powershell -ExecutionPolicy Bypass -Command "npx react-native start --reset-cache"` avvia (era `expo start`)
- [ ] `powershell -ExecutionPolicy Bypass -Command "& 'C:\Users\Primo\AppData\Local\Android\Sdk\platform-tools\adb.exe' devices"` mostra device, poi `npx react-native run-android` installa debug
- [ ] `./gradlew assembleDebug` (o `npx react-native run-android`) verde dopo Fase 5
- [ ] `ios/pod install` verde su macOS dopo Fase 6

## Navigazione (Fase 2)
- [ ] `syncroflow://` deep link → `product/:id`, `scanner-action?type=&id=`, `/?library=ID`
- [ ] `router.back()` / `replace` / `push` → `navigation.goBack()/replace()/navigate()` identico in tutti i 27 file
- [ ] Header `#1A1A1A/#0A0A0A` + tint `#D4AF37` invariati (DESIGN_SYSTEM.md)
- [ ] Tabs 5 voci, `tabBarActiveTintColor #D4AF37`

## Inventario & Logistica
- [ ] Add prodotto → `FUR-YYYY-###`, `libraryId` slug, `gs1DigitalLink`, `timeline created`
- [ ] Edit → `photo_added`/`modified` timeline
- [ ] Move → `moved {from,to}` + dormant alert
- [ ] Sell → `sold {finalPrice}` + `soldAt`
- [ ] Scan live/qr + galleria + manuale → `scanner-action` corretta per product/location/library/AUTO
- [ ] Library create/delete (blocco se ha prodotti)
- [ ] Locations CRUD + capacity/color
- [ ] DynamicFieldRenderer 10 uiType (`grid/stepper/segmented/text/gps-link/date/images/picker/modal_list/document`)

## Media & File
- [ ] `expo-image` → `react-native-fast-image` (contentFit cover/contain)
- [ ] `expo-image-picker` → `react-native-image-picker` (galleria + camera, quality 0.8/1, single/multiple)
- [ ] `expo-document-picker` → `react-native-document-picker`
- [ ] `expo-file-system` → `react-native-fs` (CSV export UTF8, base64 read)
- [ ] `expo-sharing` → `react-native-share` (PDF/CSV/doc)
- [ ] `expo-print` → `react-native-html-to-pdf` (HTML→PDF)
- [ ] `expo-clipboard` → `@react-native-clipboard/clipboard` (GS1 copy)
- [ ] `expo-image-manipulator` → `react-native-image-resizer` (3 variazioni)
- [ ] `expo-camera` → `react-native-vision-camera` (qr/ean13/ean8/code128/code39/upc)
- [ ] `expo-linear-gradient` → `react-native-linear-gradient` (`+not-found`)

## Services
- [ ] `expo-av` → `react-native-sound` (8 pattern bip 3kHz, fallback Vibration)
- [ ] `expo-battery` → `react-native-device-info` (15s poll, <0.15 non charging → bip ogni 60s)

## Nativo
- [ ] `AndroidManifest.xml` permessi solo necessari (CAMERA,NFC,INTERNET,VIBRATE,READ_MEDIA_*) — rimossi CALENDAR/CONTACTS/LOCATION non usati
- [ ] `MainApplication.kt` senza `ReactNativeHostWrapper`/`ApplicationLifecycleDispatcher`, `getJSMainModuleName()="index"` (non `.expo/.virtual-metro-entry`)
- [ ] `MainActivity.kt` senza `SplashScreenManager`, con `react-native-bootsplash` se usato
- [ ] `settings.gradle`/`build.gradle`/`gradle.properties` senza `expo.*`/`expo-autolinking`
- [ ] `babel-preset-expo` rimosso, `metro.config.js` con `getDefaultConfig` + `withNativeWind` + `svg-transformer`
- [ ] `ios/` generato (Info.plist NFC NDEF/TAG, CFBundleURLSchemes syncroflow)

## Visivo La Palais
- [ ] Confronto screenshot `docs/audit/screenshots/` vs attuali: pixel diff <2%
- [ ] `theme` `constants/theme.ts:4` invariato

## Automazioni
- [ ] Hub built-in + custom, builder, runner, QR `AUTO:`, sound, timeline → vedi `AUTOMAZIONI.md` checklist
