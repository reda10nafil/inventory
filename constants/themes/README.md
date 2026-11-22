# Temi dell'app

- `types.ts`: il tipo `AppTheme` (un solo proprietario, lavoro L1).
- `oggi.ts`: l'aspetto di prima del restyling, con i valori di `constants/theme.ts` (che resta com'era, solo per `app/` e `components/DynamicFieldRenderer.tsx`, codice morto). Base del controllo G1, non compare nel selettore.
- `index.ts`: i temi pronti (`THEMES`), lo stile predefinito (`DEFAULT_STYLE`), `themeFor`.
- Un file per stile (`attuale.ts`, `babilonia.ts`, …), scritto dai 93 token di `piani di implementazione/ui-ux/temi/token-stili.json` (lavoro L5).

Nelle schermate: `const useStyles = makeStyles((t) => ({ … }))` a livello di modulo e `const styles = useStyles()` in ogni componente; fuori dagli stili `const t = useTheme()` (entrambi da `contexts/ThemeContext.tsx`). Trasparenze con `withAlpha(colore, alfa)` da `utils/color.ts`; icone con `AppIcon` (`components/ui/AppIcon.tsx`); testi con `Text` e `TextInput` di `components/ui/Text.tsx`.

## Regola dei ruoli

I ruoli si chiamano **per ciò su cui stanno**, non per il colore che hanno oggi: `theme.primary` oggi è riempimento, testo, bordo e velo insieme, mentre la tela li divide (`accent`, `accent-ink`, `accent-soft`, `btn-bg`, `on-accent`) e negli stili chiari i valori si separano. Nel tema `oggi` più ruoli hanno lo stesso valore.

Quando si porta una schermata sul tema (lavoro L2) si sceglie il ruolo che descrive l'elemento **solo se nel tema `oggi` ha esattamente il valore che quel punto ha oggi**; altrimenti si tiene il nome generico (`surface`, `background`, `border`, `textSecondary`, raggi `small`/`medium`/`large`/`full`) o `withAlpha` sul ruolo, e il ritocco L6 allinea il punto alla tela. Così il controllo G1 resta identico pixel per pixel.

## Colori: nome di oggi → ruolo → token della tela

| Oggi (`theme.` o scritto a mano) | Ruolo `t.colors.` | Token della tela |
| --- | --- | --- |
| `background`, `#0A0A0A` | `background` | `bg` (+ `bg-img` → `t.backdrop`) |
| `backgroundSecondary`, `#1A1A1A` | `backgroundSecondary` | ricavato (fondo di intestazioni e finestre) |
| `surface`, `#1F1F1F` | `surface` | `surface` |
| `surfaceElevated`, `#2A2A2A` | `surfaceElevated` | ricavato (un gradino sopra `surface`) |
| `textPrimary`, `#FFF` come testo | `textPrimary` | `text` |
| `textSecondary` | `textSecondary` | `text-2` |
| `textMuted` | `textMuted` | `text-3` |
| `border` (bordi di card e righe) | `border` | colore di `surface-border` |
| `borderLight` (filetti) | `borderLight` | colore di `section-line` o `surface-border` |
| `primary` come riempimento, bordo o icona d'accento | `accent` | `accent` |
| `primary` come testo o icona sopra una superficie | `accentInk` | `accent-ink` |
| `${primary}20` sotto un elemento attivo | `accentSoft` | `accent-soft` |
| `#000` sopra un riempimento d'accento | `onAccent` | `on-accent` |
| `primary` come fondo del pulsante principale | `button` (+ `t.gradients.button`) | `btn-bg` |
| `#000` / `buttonPrimary` sul pulsante principale | `onButton` | `btn-text` |
| pulsante secondario: fondo, testo, bordo | `buttonSecondary`, `onButtonSecondary`, `buttonSecondaryBorder` | `btn2-bg`, `btn2-text`, `btn2-border` |
| pillola: fondo, testo, bordo | `chip`, `chipText`, `chipBorder` | `chip-bg`, `chip-text`, `chip-border` |
| pillola attiva: fondo, testo, bordo | `chipActive` (+ `t.gradients.chipActive`), `chipActiveText`, `chipActiveBorder` | `chip-active-bg`, `chip-active-text`, `chip-active-border` |
| campo: fondo, testo, bordo, segnaposto, icona | `input`, `inputText`, `inputBorder`, `placeholder`, `fieldIcon` | `input-bg`, `input-text`, `input-border`, `placeholder`, `field-icon` |
| riquadro: fondo, bordo | `tile`, `tileBorder` | `tile-bg`, `tile-border` |
| riquadro scelto: fondo, bordo, testo | `tileSelected`, `tileSelectedBorder`, `tileSelectedText` | `tile-sel-bg`, `tile-sel-border`, `tile-sel-text` |
| cerchio o quadratino di spunta: vuoto, pieno | `checkRing`, `checkOn` | `check-ring`, `check-on` |
| quadratino dell'icona di una riga | `iconWrap` | `icon-wrap-bg` |
| numeri delle statistiche | `statNumber` | `stat-num` |
| bordo tratteggiato (aggiungi foto, documento) | `dash` | `dash` |
| `success` / `error` / `warning` / `info` | stessi nomi | `good` / `danger` / `warn-text` / `info` |
| velo informativo, velo e bordo di avviso | `infoSoft`, `warningSoft`, `warningLine`, `warningText` | `info-soft`, `warn-soft`, `warn-line`, `warn-text` |
| etichetta Venduto: fondo, testo | `soldBadge`, `soldBadgeText` | `sold-bg`, `sold-text` |
| etichetta Attenzione: fondo, testo | `alertBadge`, `alertBadgeText` | `alert-bg`, `alert-text` |
| `#ECFDF5` / `#065F46` (esito riuscito) | `successSurface`, `onSuccessSurface` | ricavati da `good` |
| `#FFFBEB` / `#FCD34D` / `#B45309` (avviso chiaro) | `warningSurface`, `warningSurfaceBorder`, `onWarningSurface` | ricavati da `warn-soft`, `warn-line`, `warn-text` |
| `#FFF` sopra un colore di dati (voci di Impostazioni, posizioni, automazioni) | `onData` | fisso `#FFFFFF` |
| `rgba(0,0,0,0.5)` / `rgba(0,0,0,0.7)` (velature) | `scrim`, `scrimStrong`; altre alfa con `withAlpha(t.colors.shadow, a)` | fissi o ricavati |
| `#000` dietro la fotocamera | `cameraBackground` | fisso |
| `#FFF` / `#000` dei codici QR e a barre | `qrPaper`, `qrInk` | fissi bianco e nero |
| `shadowColor: '#000'` | `shadow` | fisso |
| `warehouse`, `showcase`, `workshop`, `stand` | stessi nomi | dati, uguali in tutti gli stili |

Restano scritti a mano i **colori che sono dati**: posizioni, palette selezionabili, automazioni, modelli di settore, tipi di evento, riquadri delle voci di Impostazioni, e il CSS della stampa in `DetailScreen` (ticket 10). Il piano chiamava `onPrimary` il testo sopra l'oro e `onAccent` il bianco sui riquadri colorati: qui sono `onAccent` (come `on-accent` della tela) e `onData`.

## Trasparenze

`${c}NN` diventa `withAlpha(c, a)` con un'alfa che dà lo stesso byte: `10` → 0.063, `15` → 0.082, `20` → 0.125, `25` → 0.145, `30` → 0.19, `33` → 0.2, `40` → 0.25, `50` → 0.314, `55` → 0.333, `60` → 0.376, `80` → 0.502, `99` → 0.6, `CC` → 0.8 (in generale `0xNN / 255`).

## Raggi, ombre, misure

| Ruolo `t.radius.` | Oggi | Token |
| --- | --- | --- |
| `small`, `medium`, `large`, `full` | 8, 12, 16, 9999 | generici, uguali in tutti gli stili |
| `card` (card dell'Inventario, pannelli) | 12 | `card-radius` |
| `tile` (riquadri, statistiche, campi della Scheda) | 12 | `tile-radius` |
| `photo` (foto dentro la card) | 0 | `photo-radius` |
| `chip` | 9999 | `chip-radius` |
| `badge` (Venduto, Attenzione) | 8 | `badge-radius` |
| `input`, `inputSmall` (campo a 1/3), `area` (testo lungo) | 12 | `input-radius`, `input-radius-small`, `area-radius` |
| `iconWrap` | 12 | `icon-wrap-radius` |
| `button` | 12 | `btn-radius` |
| `bar`, `tabActive` | 0 | `bar-radius`, `tab-active-radius` |

Ombre `t.shadows.`: `small`, `card`, `cardElevated` come oggi; `button`, `bar`, `tabActive` vuote oggi; negli stili nuovi sono `boxShadow` dai token `card-shadow`, `btn-shadow`, `bar-shadow`, `tab-active-shadow`. Le altre misure dei token stanno in `t.title`, `t.section`, `t.label`, `t.weights`, `t.input`, `t.photo`, `t.bar`, `t.tab`, `t.gradients`, `t.backdrop` (vedi `types.ts`).

## Tipografia

`t.typography.<chiave>` con le chiavi di oggi più `h2` (24/700), `h3` (18/600) e `overline` (vuoto, come la resa di oggi). Colori dentro la tipografia: calcolati per tema.
