# Effetti e caratteri realizzabili in React Native 0.81 (Android e web)

Type: research
Status: resolved
Blocked by: —

## Question

I prototipi devono usare solo effetti che l'app può davvero rendere. Con lo stack attuale (React Native 0.81.5, Expo 54, nuova architettura da verificare), cosa funziona su **Android** e sul **web**, e a che costo:

- sfocatura «vetro» (`expo-blur` 15, già installato): resa e prestazioni su Android, comportamento sopra liste lunghe e foto;
- sfumature (`expo-linear-gradient` 15);
- ombre: `elevation`, ombre colorate, `boxShadow` (supportato dalla nuova architettura?), differenze Android/web;
- bordi sottili semitrasparenti, angoli molto arrotondati, trasparenze sopra foto;
- caratteri: caricamento con `expo-font` / `@expo-google-fonts/inter` (installati, non usati), impatto sull'avvio, resa dei pesi su Android;
- animazioni leggere (Reanimated 4.1 installato, non usato) se uno stile le prevede;
- **come un carattere caricato arriva a ogni testo** senza modificare uno per uno i 401 `fontSize` e gli stili di 34 file: oggi nessun `fontFamily` è impostato (solo 4 `monospace`). Opzioni da valutare: carattere predefinito globale per `Text` e `TextInput`, componente `Text` dell'app, altro. La risposta decide quanto è grande il lavoro L6.

Risposta: tabella effetto → si può / con limiti / no, con la soluzione React Native da usare. Serve a Babilonia Vetro in particolare.

## Answer

22 novembre 2026. Verificato su sorgenti installati in `node_modules` e docs ufficiali, **nulla provato su dispositivo**. Android minSdk 24 (`react-native/gradle/libs.versions.toml`, letto da `expo-root-project`). Prestazioni non misurate: i limiti indicati sono strutturali.

| Effetto | Android | Web | Soluzione React Native e costo | Fonti |
| --- | --- | --- | --- | --- |
| Vetro (sfocatura dello sfondo) | con limiti | sì | `expo-blur` con `experimentalBlurMethod="dimezisBlurView"`: senza, Android mostra solo un velo rgba. Dimezis BlurView 2.0.6 ricattura l'intera Screen su canvas software a ogni ridisegno, anche mentre la lista scorre. Sfoca con RenderEffect da Android 12 e con RenderScript sotto. Ogni BlurView ripete la cattura, quindi il costo cresce col loro numero. Va messo dopo la lista nell'albero; il raggio funziona solo con `overflow: 'hidden'`; raggio di sfocatura = `intensity / 4`. Non sfoca camera e video. Sopra le foto il rischio va provato sul dispositivo: la cattura passa da un canvas software, che può non accettare le immagini decodificate in memoria grafica. Non c'è un metodo «solo Android 12+»: per limitarlo, l'app sceglie `'none'` in base a `Platform.Version`. Web: `saturate(180%) blur(intensity × 0,2 px)` più velo rgba | [1] [2] [3] |
| `saturate()` dello sfondo | no | sì | Android: si imita solo con il colore del velo (`tint`/rgba); il `filter` RN agisce sul contenuto della vista, non su ciò che sta dietro. Web: esatto con `backdropFilter: 'blur(20px) saturate(200%)'` via `Platform.select` (RNW lo passa e aggiunge `-webkit-`) | [1] [7] [10] |
| Skia `BackdropBlur` | no | no | Sfoca solo ciò che è già disegnato nello stesso Canvas Skia, non le viste RN dietro. Sul web costa CanvasKit da 7,1 MB | [8] |
| Sfumatura lineare | sì | sì | `expo-linear-gradient` (Android nativo con raggi per angolo; web CSS `linear-gradient`). `experimental_backgroundImage` è sperimentale («non in produzione») e RNW 0.21 non lo traduce: evitarlo. Radiale solo con `react-native-svg` | [4] [5] [7] |
| `boxShadow` (colore, spread, inset, più ombre) | con limiti | sì | Richiede la nuova architettura, che è attiva. Ombra esterna da Android 9 (API 28), interna da Android 10 (API 29); su Android 7–8.1 non compare. Taglia l'interno del riquadro (`clipOutPath`), quindi va bene sulle superfici semitrasparenti. Web: CSS `box-shadow` | [5] [6] [9] |
| `elevation` + `shadowColor` | con limiti | no | Solo Android; il colore funziona da API 28. RNW ignora `elevation`. `shadowOffset/Opacity/Radius` sono solo iOS. Sul vetro usare `boxShadow` | [7] [9] |
| Bordi sottili rgba, `hairlineWidth`, raggi grandi | sì | sì | Stili standard | [5] |
| Raggio + `overflow: 'hidden'`, velo o sfumatura sopra foto | sì | sì | Stili standard; velo con rgba o `LinearGradient` assoluto sopra l'immagine | [2] [4] |
| `filter` su un elemento | con limiti | sì | Android: brightness, opacity, contrast, grayscale, hueRotate, invert, sepia e saturate su ogni versione; blur e dropShadow solo da Android 12. Implica `overflow: hidden`. Web: usare la forma stringa | [5] [7] [10] |
| `mixBlendMode` | con limiti | sì | Solo da Android 10: evitarlo | [5] |
| Pressione dei riquadri | sì | sì | `Pressable` con stile da `pressed` (costo zero) oppure Reanimated `withTiming` sulla scala. Reanimated 4.1.6 è compatibile con worklets 0.5.1 e con RN 0.81. `react-native-reanimated/plugin` reindirizza a `react-native-worklets/plugin` ed è l'ultimo in `babel.config.js`. Mai provato in build | [11] [12] |
| Passaggio tra schede | sì | sì | `animation: 'fade'` o `'shift'` di `@react-navigation/bottom-tabs` 7.10, senza codice animato | [13] |
| Inter / Urbanist | sì | sì | Vedi sotto. `@expo-google-fonts/urbanist` 0.4.2 esiste su npm ma non è installato | [14] [15] |

### Carattere globale (decide la grandezza di L6)

- **Pesi.** `useFonts`/`loadAsync` registra ogni file come famiglia a sé, solo in stile normale. Con `fontFamily: 'Inter_400Regular'` su Android, 500 e 600 restano regular; 700, `bold` e 800 non trovano il file e passano al carattere di sistema. Sul web l'`@font-face` generato non dichiara il peso, quindi il browser può aggiungere un finto grassetto. Su entrambe le piattaforme serve una mappa peso → file (`'600'` → `Inter_600SemiBold`) e `fontWeight` riportato a normale [14].
- **Pesi usati oggi** in `src`, `components` e `constants`: 600 (89), 700/bold (93), 800 (10), 500 (4), 400 (4). Servono 5 file Inter da circa 340 KB, circa 1,7 MB in tutto.
- **Incorporamento.** La voce `expo-font` in `app.json` qui non agisce: `android/` è nel repository, `MainApplication.kt` è scritto a mano e la build passa da `react-native run-android`, senza prebuild. Per ottenere lo stesso risultato a mano basta copiare i 5 TTF in `android/app/src/main/assets/fonts/`, con il nome uguale alla famiglia. RN li trova da solo, senza codice nativo né attese all'avvio, ma serve una nuova build [14]. Sul web resta `useFonts` con una schermata d'attesa per i circa 1,7 MB, tempo non misurato. La via XML (`res/font` + `addCustomFont`) gestisce i pesi solo su Android 9+ e non sul web: non conviene.
- **(a) `Text.defaultProps`: no.** In RN 0.81 `Text` è un componente funzione, e React 19 applica `defaultProps` solo alle classi. Anche il runtime JSX automatico le ignora. In più, uno `style` passato sostituirebbe quello predefinito invece di unirsi [16].
- **(b) `Text`/`TextInput` dell'app** (es. `components/ui/Text.tsx`): appiattisce lo stile; se manca `fontFamily`, mette il file del peso e azzera `fontWeight`; i 4 `monospace` restano intatti. Deve anche coprire due casi. Il corsivo, usato 4 volte, chiede un file `_Italic`: senza, passa al carattere di sistema. Il peso va poi passato ai `Text` annidati senza peso proprio: senza, dentro un testo in grassetto tornano regular. Poi cambia solo la riga di import in circa 33 file con `Text` e 19 con `TextInput`, con uno script. Funziona con RN 0.81 e React 19, e i 401 `fontSize` non si toccano.
- **(c) Alias Metro/babel su `react-native`:** si può fare con `resolver.resolveRequest`, ma va gestito anche l'alias web verso `react-native-web` e l'export pigro di RN. Inoltre tsc e jest non lo vedono. Risparmia solo le righe di import: sconsigliato.
- **(d) Il resto:** intestazioni e barra delle schede prendono il carattere da `theme.fonts` di React Navigation 7 (regular, medium, bold, heavy) [17]. Alert, Picker, DateTimePicker e segmented control restano col carattere di sistema.
- **Raccomandazione:** (b) + `theme.fonts` + TTF in `assets/fonts` per Android + `useFonts` sul web. È un lavoro piccolo e da fare una volta sola (un file, uno script sugli import, il tema), da mettere in L5 accanto ai token. Così L6 non tocca i caratteri schermata per schermata.

### Regole per i prototipi

1. Vetro (`backdrop-filter`) solo su barra in basso, intestazione, finestre dal basso e modali, al massimo 2 per schermata. Mai su card della griglia, righe di lista, pillole o riquadri del modulo.
2. `blur` fino a 20px. `saturate()` vale solo come extra web: la superficie deve reggere anche con il solo velo rgba senza sfocatura.
3. Nessun vetro sopra la fotocamera dello scanner: lì un fondo scuro semitrasparente.
4. Card: fondo pieno o rgba, bordo 1px rgba, raggi grandi. `box-shadow` libero (colore, spread, inset), ma la card deve restare leggibile anche senza ombra.
5. Sfumature solo lineari (le radiali solo come SVG). Niente conic, testo sfumato o `mix-blend-mode`.
6. `filter` sulle foto solo grayscale, brightness o saturate; niente `filter: blur` sugli elementi.
7. Caratteri: Inter (installato) o Urbanist (da installare), pesi statici 400–800; corsivo solo nel peso 400 e solo se si carica il file apposito (sesto file).
8. Animazioni: pressione (scala circa 0,97 o opacità), schede in dissolvenza o scorrimento, finestra che sale. Niente parallasse né blur animato.

### Fonti

[1] `node_modules/expo-blur` 15.0.8: `src/BlurView.types.ts`, `src/BlurView.web.tsx`, `android/.../ExpoBlurView.kt`, `android/build.gradle` (Dimezis 2.0.6). · [2] Docs SDK 54, `expo/expo` ramo `sdk-54`, `docs/pages/versions/v54.0.0/sdk/blur-view.mdx`, «Known issues». Oggi `docs.expo.dev/versions/v54.0.0` mostra `blurMethod` e `BlurTargetView`, che non ci sono nel pacchetto installato: appartengono a un SDK successivo. · [3] README Dimezis BlurView `version-2.0.6` (SurfaceView/TextureView, canvas software, main thread). · [4] `expo-linear-gradient` 15.0.8 `NativeLinearGradient.android.tsx` e `.web.tsx`. · [5] reactnative.dev/docs/0.81/view-style-props. · [6] RN 0.81 `ReactAndroid/.../drawable/OutsetBoxShadowDrawable.kt` (API 28, `clipOutPath`) e `InsetBoxShadowDrawable.kt` (API 29). · [7] `react-native-web` 0.21.2 `StyleSheet/preprocess.js` e `modules/prefixStyles/static.js`. · [8] `@shopify/react-native-skia` 2.2.12 `src/sksg/Recorder/DrawingContext.ts` (`saveBackdropFilter` = `saveLayer` sul canvas Skia); `canvaskit-wasm/bin/canvaskit.wasm`. · [9] reactnative.dev/docs/0.81/shadow-props e boxshadowvalue. · [10] RN 0.81 `uimanager/FilterHelper.kt`. · [11] `react-native-reanimated` 4.1.6 `compatibility.json`, `plugin/index.js`; `babel.config.js`. · [12] docs.swmansion.com Reanimated, «Getting started». · [13] `@react-navigation/bottom-tabs` `lib/typescript/src/types.d.ts`. · [14] RN 0.81 `common/assets/ReactFontManager.kt`; `expo-font` 14.0.12 `FontLoaderModule.kt:56`, `build/ExpoFontLoader.web.js:171`, `plugin/build/withFontsAndroid.js`. · [15] registry.npmjs.org `@expo-google-fonts/urbanist`. · [16] RN 0.81 `Libraries/Text/Text.js:38`; `ReactFabric-dev.js` `resolveClassComponentProps`; `@react-native/babel-preset` `runtime: 'automatic'`. · [17] `@react-navigation/native` `theming/fonts.d.ts`.
