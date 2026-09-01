# Design System — La Palais (vincolo visivo post-eject)

> Fonte: `constants/theme.ts:1`, `tailwind.config.js` o `nativewind`, `app/**` StyleSheet. Qualsiasi drift colore/typography/spacing è regressione — questo file è il riferimento pixel.

## 1. Palette

`constants/theme.ts:4`:
```ts
primary: '#D4AF37'        // gold luxury (tab active, headerTint, CTAs)
primaryLight: '#E6C868'
primaryDark: '#B8941F'
background: '#0A0A0A'     // dark base
backgroundSecondary: '#1A1A1A' // header #1A1A1A in app/_layout.tsx:79
surface: '#1F1F1F'        // card
surfaceElevated: '#2A2A2A'
textPrimary: '#FFFFFF'
textSecondary: '#9CA3AF'
textMuted: '#6B7280'
border: '#374151'
borderLight: '#2A2A2A'
success: '#10B981'  error: '#EF4444'  warning: '#F59E0B'  info: '#3B82F6'
available: '#10B981'  sold: '#6B7280'  alert: '#F59E0B'
warehouse: '#3B82F6'  showcase: '#D4AF37'  workshop: '#8B5CF6'  stand: '#10B981'
```
Header Stack: `headerStyle backgroundColor '#1A1A1A'` o `'#0A0A0A'` (`app/_layout.tsx:79,86`), `headerTintColor '#D4AF37'`.

## 2. Typography

`constants/theme.ts:44` (`typography`):
- `heroData: 48/700 primary`, `heroLabel: 11/600 secondary uppercase letterSpacing1`
- `cardTitle: 16/600 primary`, `cardValue: 24/700 primary`, `cardLabel: 13/400 secondary`
- `body: 15/400 primary`, `bodySecondary: 15/400 secondary`, `caption: 13/400 secondary`
- `sectionHeader: 14/600 uppercase letterSpacing0.5 secondary`
- `buttonPrimary: 16/600 #000000` (su bg primary), `buttonSecondary: 16/600 primary`
- Font file: `assets/fonts/SpaceMono-Regular.ttf` (link via `react-native.config.js` post-eject, prima `expo-font`).

## 3. Spacing & Radius & Shadow

`constants/theme.ts:91-102`:
```ts
borderRadius: { small:8, medium:12, large:16, full:9999 }
spacing: { screenPadding:16, cardGap:12, sectionGap:24 }
shadows: { small: elevation2, card: elevation4, cardElevated: elevation8 }
```

## 4. Componenti critici (per confronto screenshot)

- **Tabs:** `app/(tabs)/_layout.tsx` `Tabs screenOptions headerShown:false tabBarActiveTintColor theme.primary` 5 `Tabs.Screen` con `MaterialIcons`.
- **Scanner overlay:** `components/BarcodeScanner.tsx:94` focus 280px, `corner 40x40 border 4 primary`, `overlayColor rgba(0,0,0,0.6)`, scan frame `corner 40x40` in `app/scanner.tsx:390`.
- **Modals:** `app/scanner.tsx:318` `modalOverlay rgba(0,0,0,0.75)`, `modalContent surface borderRadius large padding 24`.
- **Root headers:** tutti `screenOptions headerShown:false` tranne `scanner-action` modal e `settings/*` (true).

## 5. Icone

`@expo/vector-icons:15.0.3` `MaterialIcons` → `react-native-vector-icons:10.x` post-eject (stesso glyph, font linking). Lista usata: `photo-camera`, `close`, `location-on`, `delete`, `add-a-photo`, `calendar-today`, `qr-code-scanner`, `flash-on/off`, ecc. `lucide-react-native:0.475.0` + `@lucide/lab:0.1.2` invariati.

## 6. Verifica visiva

Confronta `docs/audit/screenshots/` (quando generati) con questi token:
- [ ] Header `#0A0A0A`/`#1A1A1A` + tint `#D4AF37` identici
- [ ] Card `surface #1F1F1F` + `borderRadius large 16`
- [ ] Typography `cardTitle` 16/600 vs `caption` 13/400
- [ ] Scanner corner gold 4px, overlay 0.6
