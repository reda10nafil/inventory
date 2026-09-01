# Piano Implementazione — Full Eject Expo → React Native CLI Puro (Opzione B)

> Stato: APPROVATO — Opzione B full eject, parità funzionale + visiva 100% (La Palais level)
> Data: 2026-09-02
> Commit base audit: graphify-out/graph.json 2026-08-29
> Vincolo: nessuna invenzione, nessuna regressione funzionale/visiva

## 1. Contesto e Stato Attuale (verificato)

- **Expo SDK 54.0.35** su `react-native:0.81.5` + `react:19.1.0` — già compatibile CLI puro (no downgrade).
- 53 dipendenze `expo`/`@expo` in `package.json:13-132`, ma solo **16 effettivamente importate** (`from 'expo-` 62 match): `expo-router`, `expo-camera`, `expo-image`, `expo-image-picker`, `expo-image-manipulator`, `expo-document-picker`, `expo-file-system/legacy`, `expo-sharing`, `expo-print`, `expo-clipboard`, `expo-battery`, `expo-av`, `expo-linear-gradient`, `expo-auth-session`, `expo-web-browser`, `@expo/vector-icons`. Le altre 37 sono transitive/plugin-only → rimozione diretta.
- **Router:** `expo-router:6.0.24` file-based in `app/` (26 file). `app/_layout.tsx:2` Stack root 14 Screen + `app/(tabs)/_layout.tsx:3` Tabs 5 tab. Navigazione 100% imperativa `useRouter().push/replace/back` + `useLocalSearchParams` (7 file). `typedRoutes:true` ma aggirato con `as any` in 11 file.
- **Nativo:** `android/` già prebuild ma iniettato Expo (`android/app/build.gradle:12` `require('expo/scripts/resolveAppEntry')`, `cliFile` `@expo/cli`, `settings.gradle` `expo-autolinking-settings`, `MainApplication.kt` `ReactNativeHostWrapper`, `MainActivity.kt` `SplashScreenManager`). `ios/` inesistente (win32). `babel.config.js:4` `babel-preset-expo`, `tsconfig.json:2` `extends expo/tsconfig.base`, `metro.config.js` assente.

## 2. Matrice Sostituzioni (ricerca approfondita, alternative community mantenute)

| Expo usato | API (file:linea) | Sostituto community | Mapping |
|---|---|---|---|
| `expo-router:6.0.24` | `Stack`, `Tabs`, `useRouter`, `useLocalSearchParams` (`app/_layout.tsx:2`) | `@react-navigation/native:7.x` + `native-stack:7.10.1` + `bottom-tabs:7.10.1` + `drawer:7.8.1` (già in package.json) + `react-native-screens:4.16.0` | `src/navigation/RootNavigator.tsx` + `TabsNavigator.tsx` + `linking: { prefixes:['syncroflow://'], config:{ screens:{ '(tabs)':..., 'product/:id':... } } }`. `useRouter().push({pathname:'/scanner-action', params:{type,id}})` → `navigation.navigate('ScannerAction',{type,id})`, `router.back()→goBack()`, `router.replace→replace`, `useLocalSearchParams().id→route.params.id` |
| `expo-battery` | `app/_layout.tsx:11` `getBatteryLevelAsync`, `BatteryState.CHARGING` | `react-native-device-info:10.x` (`getBatteryLevel()`, `isBatteryCharging()`) | BatteryMonitor 15s poll identico, fallback emulatore `try/catch` |
| `expo-av:16.0.8` | `services/SoundService.ts:1` `Audio.Sound.createAsync`, `replayAsync` | `react-native-sound:0.11` | Mantiene interfaccia `SoundService` (`playSuccess`, `playBatteryLow` ecc), `MODIFY_AUDIO_SETTINGS` già in `AndroidManifest.xml:6` |
| `expo-image:3.0.11` | 7 file `<Image contentFit>` | `react-native-fast-image:8.x` (`@d11/react-native-fast-image`) | `contentFit="cover"→resizeMode={FastImage.resizeMode.cover}` |
| `expo-image-manipulator` | `utils/barcodeDecoder.ts:25` `manipulateAsync resize compress` | `react-native-image-resizer:1.4` | `createResizedImage(uri,2000,2000,'PNG',100)` — stessa logica 2000/1200/800 PNG/JPEG |
| `expo-document-picker` | `components/DynamicFieldRenderer.tsx:9` `getDocumentAsync` | `react-native-document-picker:9.x` | `DocumentPicker.pick({type:[types.images]})` → `{uri,name,type}` |
| `expo-image-picker` | `app/scanner.tsx:8` `launchImageLibraryAsync` | `react-native-image-picker:7.x` | `launchImageLibrary({mediaType:'photo', selectionLimit:10, quality:0.8})` |
| `expo-camera:17.0.10` | `components/BarcodeScanner.tsx:3` `CameraView`, `onBarcodeScanned` | `react-native-vision-camera:4.x` + `vision-camera-code-scanner` | `codeScanner={{codeTypes:['qr','ean-13'], onCodeScanned}}`, `enableTorch`, overlay identico. Fallback `react-native-camera-kit` |
| `expo-file-system/legacy` | `app/(tabs)/settings.tsx:7` `writeAsStringAsync`, `readAsStringAsync base64` | `react-native-fs:2.20` | `documentDirectory→RNFS.DocumentDirectoryPath`, `EncodingType.UTF8→'utf8'`, `readFile(uri,'base64')` |
| `expo-sharing` | `app/product/[id].tsx:12` `shareAsync` | `react-native-share:10.x` | `Share.open({url:'file://...', type:'application/pdf'})` |
| `expo-print` | `app/product/[id].tsx:5` `printToFileAsync({html})` | `react-native-html-to-pdf:0.12` | `RNHTMLtoPDF.convert({html,fileName})→{filePath}` |
| `expo-clipboard` | `app/product/[id].tsx:11` `setStringAsync` | `@react-native-clipboard/clipboard:1.16.3` già in `package.json:23` | `Clipboard.setString()` drop-in |
| `expo-auth-session`+`expo-web-browser` | `template/auth/supabase/service.ts:6` | `react-native-app-auth:8.x` + `react-native-inappbrowser-reborn:3.x` | Solo template, opzionale. `authorize({serviceConfiguration, redirectUrl:'syncroflow://auth'})` |
| `expo-linear-gradient` | `app/+not-found.tsx:7` | `react-native-linear-gradient:2.8` | `<LinearGradient colors={['#0a0a0a','#1a1a1a']}>` identico |
| `@expo/vector-icons` | 20 file `<MaterialIcons>` | `react-native-vector-icons:10.x` | `import MaterialIcons from 'react-native-vector-icons/MaterialIcons'` — glyph identici |

**37 non usati** (`expo-blur`, `expo-calendar`, `expo-contacts`, `expo-location`, `expo-notifications`, `expo-sensors` ecc) → `npm uninstall` diretto. Plugin-only (`expo-secure-store`, `expo-sqlite`, `expo-splash-screen`, `expo-localization`, `expo-video`, `expo-font`, `expo-asset`) → rimossi o sostituiti on-demand (`react-native-keychain:8.x`, `op-sqlite:3.x`, `react-native-bootsplash:6.x`, `react-native-localize:3.x`, `react-native-video:6.x`).

## 3. Architettura Target

- **Entry:** `main:expo-router/entry` → `index.js` (`AppRegistry.registerComponent('Syncro Flow', ()=>App)`).
- **Babel:** `babel-preset-expo` → `@react-native/babel-preset` + `react-native-reanimated/plugin` (ultimo) + `nativewind/babel` + `module-resolver @/*`.
- **TS:** `extends expo/tsconfig.base` → `@react-native/typescript-config` + rimozione `.expo/types`, `expo-env.d.ts`.
- **Metro:** nuovo `metro.config.js` con `getDefaultConfig` + `withNativeWind` + `react-native-svg-transformer` per `react-native-svg:15.12.1` + `react-native-skia:2.2.12`.
- **Lint:** `eslint-config-expo` → `@react-native/eslint-config`.
- **Nativa:** eliminare `app.json` Expo, `eas.json`, `.expo/`. Gestire manualmente `AndroidManifest.xml` (pulire 20 permission → tenere `CAMERA,NFC,INTERNET,VIBRATE,READ_MEDIA_*`), `strings.xml`, `styles.xml` splash, `mipmap`. Rigenerare `ios/` via `npx react-native init` template 0.81.5.

## 4. Piano a Fasi

### Fase 0 — Baseline & Branch (0.5g)
- `git checkout -b chore/remove-expo-full-eject`, `npx tsc --noEmit` verde, screenshot visivi prima (home, product, scanner).
- Audit permessi `docs/permissions-audit.md`.

### Fase 1 — Tooling & Config Core (1g)
- File: `babel.config.js`, `tsconfig.json`, `metro.config.js` (nuovo), `eslint.config.js`, `react-native.config.js` (nuovo), `index.js` + `App.tsx` (estratto da `app/_layout.tsx`), `package.json` scripts, rimozione `expo-env.d.ts`.
- Test: `npx tsc --noEmit` + `npx react-native start --reset-cache`.

### Fase 2 — Navigation (2g) — Critico 25 file
- Creare `src/navigation/RootNavigator.tsx`, `TabsNavigator.tsx`, `linking.ts`, `types.ts`.
- Migrare `app/_layout.tsx` (14 screen) + `app/(tabs)/_layout.tsx` (5 tab) → navigators. Convertire `useRouter().push({pathname, params})→navigate`, `router.back()→goBack()`, `useLocalSearchParams→route.params`.
- Spostare `app/*` → `src/screens/*` mantenendo stessi StyleSheet (nessun cambio visivo).
- Verifica: `npx tsc`, `npm run android`, deep link `adb shell am start -W -a android.intent.action.VIEW -d "syncroflow://product/123"`.

### Fase 3 — Media & Camera/FileSystem (2g)
- Ordine: `expo-clipboard` (5min) → `expo-linear-gradient` → `expo-image` → `expo-image-picker/document-picker` → `expo-file-system` → `expo-sharing/print` → `expo-image-manipulator` → `expo-camera` (Vision Camera richiede `minSdk 24`, `NSCameraUsageDescription`).
- File critici: `components/BarcodeScanner.tsx:3`, `app/scanner.tsx:5`, `utils/barcodeDecoder.ts:6`, `components/DynamicFieldRenderer.tsx:6`, `app/product/[id].tsx:5-13`, `app/(tabs)/add.tsx:7`.
- Verifica per sostituto: import galleria + decode QR + export CSV + share PDF.

### Fase 4 — Services & Utility (1g)
- `services/SoundService.ts:1` `expo-av` → `react-native-sound`, `app/_layout.tsx:11` `expo-battery` → `device-info`.
- Verifica: BatteryMonitor 15s poll, audio 3kHz su device.

### Fase 5 — Pulizia Nativa Android (1g)
- Riscrivere `android/settings.gradle`, `android/build.gradle`, `android/app/build.gradle` (`entryFile`, `cliFile`, `bundleCommand`, `expo.gif`), `android/gradle.properties` (`expo.*`), `MainApplication.kt` (`ReactNativeHostWrapper`), `MainActivity.kt` (`SplashScreenManager`) con template RN 0.81.5 + `react-native-bootsplash`.
- Pulire `AndroidManifest.xml`: rimuovere `meta-data expo.modules.updates`, `exp+syncro-flow`, permessi non usati.
- `npm uninstall expo expo-* @expo/* eslint-config-expo babel-preset-expo` + `rm -rf .expo android/.gradle`.

### Fase 6 — iOS Generation & Build Release (1.5g)
- macOS: `npx react-native init` temp + copia `ios/` (Podfile, Info.plist NFC `NDEF/TAG`, entitlements, LaunchScreen, AppIcon da `assets/images/logo.png`), `pod install`.
- Signing keystore release + provisioning.
- Verifica finale: `npx tsc --noEmit`, `eslint`, `./gradlew bundleRelease`, screenshot diff visivo, flussi critici: scanner→product, add con foto/doc, detail→print→share→clipboard, battery low.

## 5. Rischi & Mitigazioni

- Vision Camera NDK/minSdk → fallback `react-native-camera-kit`.
- Metro NativeWind+Skia → testare `withNativeWind` + `getDefaultConfig`, isolare transformer.
- iOS assente → richiede macOS+Xcode; su win32 fase 6 stub per CI Mac.
- 37 pacchetti rimossi → `npm ls` + batch uninstall con `npm install` dopo ogni fase.

## 6. Verifica & Criteri Accettazione

- `npx tsc --noEmit` zero errori, `eslint` zero, `npm run android` avvia.
- Parità visiva: screenshot grid home, product detail, +not-found gradient identici (pixel diff <2%).
- Flussi: scanner QR/ean13, import galleria + `decodeBarcodeImage`, add→edit→trash, CSV export+share, print PDF, clipboard digital link, audio bip, battery low.
- `graphify update .` dopo ogni fase.

## 7. Salvataggio su Grafo

- Questo file è indicizzato via `graphify update .`.
- Memory store: namespace `plans`, key `remove-expo-full-eject`.
