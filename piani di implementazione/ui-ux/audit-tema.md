# Audit del tema (misurato il 22 novembre 2026)

Conteggi fatti con script sul codice vivo: `App.tsx`, `src/`, `components/`, `contexts/`, `constants/`, `hooks/`, `utils/`, `services/`, `lib/` (94 file). **Esclusa `app/`**, copia morta di expo-router che raddoppierebbe i numeri. Sostituisce le stime di `docs/design/regole-temi.md` (48/37/15 e «58 file» erano sbagliati).

## Token esistenti (`constants/theme.ts`)

- `theme`: primario oro `#D4AF37` (+ `primaryLight`, `primaryDark`, mai usati); sfondi `#0A0A0A` / `#1A1A1A`; superfici `#1F1F1F` / `#2A2A2A`; testo `#FFFFFF` / `#9CA3AF` / `#6B7280`; bordi `#374151` / `#2A2A2A`; stati success, error, warning, info, notification; inventario available, sold, alert; posizioni warehouse, showcase, workshop, stand.
- `typography`: heroData, heroLabel, cardTitle, cardValue, cardLabel, body, bodySecondary, caption, sectionHeader, buttonPrimary (colore `#000000` scritto dentro), buttonSecondary. Nessun `fontFamily`. Tipo `{[key: string]: TextStyle}`: per questo `typography.h2`, `h3`, `overline` usati in Add, Modifica e Automazioni **non esistono e tsc non se ne accorge**.
- `shadows`: small, card, cardElevated (tutte nere). `borderRadius`: 8, 12, 16, 9999. `spacing`: 16, 12, 24.
- Importato da **31 file**. `constants/Colors.ts` è il residuo del modello Expo, usato solo da `hooks/useThemeColor.ts`, che nessuno importa.
- **Nessun cambio tema a runtime**: `theme` è letto una volta dentro `StyleSheet.create`. `NavigationContainer` non riceve un tema; barre e intestazioni native sono colorate a mano.

## Colori scritti a mano

**423 occorrenze in 39 file** (365 esadecimali, 36 `rgba()`, 22 nomi). I file più carichi: DetailScreen 54 (34 nel CSS della stampa), TeamScreen 30, SettingsScreen 29, LocationsScreen 18, EditScreen 17, AutomationBuilder 17, AddScreen 16, HomeScreen 16, sectorTemplates 15, RootNavigator 14, QuickTag 14.

| Letterale | Totale | Usi |
| --- | --- | --- |
| `#000` / `#000000` | 82 | 34 testo su sfondo oro attivo, 25 icone su sfondo oro attivo, 10 QR e stampa, 6 testo su carta del QR, 4 sfondo fotocamera, 3 `shadowColor` |
| `#FFF` / `#FFFFFF` | 97 | 48 icone bianche su riquadri colorati (14 solo in Impostazioni), 32 testo bianco, 9 sfondo bianco del QR, 5 stampa, 2 bordi, 1 tema locale di Team |
| `#D4AF37` | 27 | 10 accento in `App.tsx`, `RootNavigator.tsx`, `AuthScreen`; 7 valori di dati (posizione Vetrina, palette); 8 CSS di stampa; 1 pulsante; 1 tema locale di Team |
| `rgba(0,0,0,…)` | 31 | velature di finestre, contatori sulle foto, scanner |
| `'transparent'` | 20 | bordi inattivi |
| tinte chiare `#ECFDF5`, `#FFFBEB`, `#FFFBEB`… | 13 | righe Audit, «ultima azione», riquadro «Lo sapevi?» |

**Trasparenze per concatenazione** (`${theme.primary}20`, `T.gold + '55'`): **68 usi in 20 file**, 50 su token, 6 sul tema locale di Team, 12 su colori di dati. Si rompono se un token non è un esadecimale a 6 cifre.

**Palette duplicate**: `TeamScreen.tsx:33-47` (`T`, 13 colori copiati dal tema); posizioni predefinite scritte 3 volte (`constants/config.ts`, `contexts/LocationsContext.tsx`, `hooks/useLocations.ts`).

**Colori che sono dati** (non vanno nel tema): colori delle posizioni e palette da 10 per sceglierli (`LocationsScreen`), colori delle automazioni (`AutomationBuilderScreen`, `AutomationsScreen`, `STEP_TYPE_META`), tag rapidi (`QuickTagScreen`), 15 colori dei modelli di settore, colori per tipo di evento (`TimelineScreen`), colori dei riquadri delle voci di Impostazioni (13 scritti in `SettingsScreen.tsx`).

## Icone

- Una sola famiglia: `MaterialIcons` di `@expo/vector-icons` 15.1.1, **331 tag in 32 file**, **230 nomi diversi**, tutti validi. Un nome sconosciuto verrebbe disegnato come `?`: nessun controllo nel codice.
- Installati ma mai usati: `lucide-react-native` 0.475, `@lucide/lab`, `expo-symbols`. `src/lib/vectorIcons.ts` non è importato.
- **Nomi che vengono dai dati salvati** (da tradurre al momento del disegno, senza toccare i dati):
  - `field.icon` dei campi, anche dentro `fieldSnapshot` dei prodotti (Scheda, Campi, Cestino, GS1, Layout, Modelli);
  - `layout.fields[].icon` (Aggiungi, Modifica, Layout);
  - `library.icon` delle cartelle (Home, Aggiungi, Modifica, Cartelle, Azione rapida);
  - `automation.icon` e `STEP_TYPE_META[...].icon` (Automazioni, Flusso, Esecuzione, Costruttore);
  - `template.icon` dei modelli di layout;
  - `FIELD_TYPE_INFO[tipo].icon`.
- **Cataloghi tra cui l'utente sceglie**: Automazioni 10, Cartelle 8, Campi 39 (`FieldsScreen.tsx:10`), Layout 106 (`LayoutBuilderScreen.tsx:20`). Elenchi completi nel codice.
- **Icone predefinite nei dati**: `SYSTEM_FIELDS` (images `add-photo-alternate`, sku `qr-code`, furType `category`, location `place`, folder `folder`, prezzi `shopping-cart` e `sell`, misure `straighten` ×2 e `fitness-center`, note `notes`); `FIELD_TYPE_INFO` (number `pin`, currency `euro`, date `calendar-today`, text_short `short-text`, text_long `notes`, images `collections`, single `radio-button-checked`, multi `check-box`, document `description`); sezioni `menu`; cartella predefinita `inventory`; i 15 modelli di settore e i 2 modelli di layout.
- Barra in basso: `grid-view`, `timeline`, `account-tree`, `add-circle`, `settings`.
- Emoji usate come icone: le 15 dei modelli di settore; altre emoji nei testi di Esecuzione (15), Scheda (11, nei testi da condividere), Scanner (6) e poche altre.

## Tipografia, forme, effetti

- `fontFamily`: solo 4 `monospace`. Nessun carattere caricato; `expo-font` e `@expo-google-fonts/inter` installati ma non usati.
- `fontSize` scritti a mano: 401 in 34 file (contro 223 usi dei token `typography`). `borderRadius` a mano: 130 in 28 file (contro 200 token). Ombre a mano in 7 file, token in 9. Spaziature a mano: 1103 (token: 48).
- Effetti: `LinearGradient` solo in NotFound; **nessun** blur, Reanimated, Skia o `Animated`. Installati e disponibili: `expo-blur` 15, `expo-linear-gradient` 15, `react-native-svg` 15.12, Skia 2.2, Reanimated 4.1, `@gorhom/bottom-sheet` 4.4, segmented-control, `nativewind` 4 (0 usi, nessuna configurazione).

## Componenti condivisi

Solo `BarcodeScanner` (7 schermate), `Barcode` (1), le due card della chat. `DynamicFieldRenderer` (784 righe) non è importato. Non esistono Button, Card, Header, Input, Chip o Modal condivisi: `StyleSheet.create` in 34 file, 279 `<Pressable>`, 49 `<TextInput>`, 17 `<Modal>`.

## Come rifare i conteggi

Da `inventory/`, con `rg` (14.1.1, non nel PATH di Git Bash) sull'ambito sopra, escludendo `constants/theme.ts` e `constants/Colors.ts`:

- esadecimali: `rg -o -P "(?<![\w&#])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z])"` (384 compresi i commenti, 365 senza);
- trasparenze concatenate: `rg -o -P "\$\{[^}]+\}[0-9a-fA-F]{2}(?![0-9a-zA-Z])|\w+\s*\+\s*'[0-9a-fA-F]{2}'"`;
- icone: `rg -c "<MaterialIcons"`; importatori del tema: `rg -l "constants/theme'"`.
