import type { TextStyle, ViewStyle } from 'react-native';

// Tipo del tema dell'app (lavoro L1). Un solo proprietario: chi ha bisogno di un ruolo nuovo lo chiede, non lo aggiunge.
// I ruoli si chiamano per ciò su cui stanno (fondo di un pulsante, testo sopra l'accento, bordo di un campo…),
// non per il colore che hanno oggi. Corrispondenza con i nomi di oggi e con i token della tela: README.md.

/** Gli stili che l'utente può scegliere in Impostazioni › Aspetto. */
export type StyleId = 'attuale' | 'babilonia' | 'ishtar' | 'ardesia' | 'minimal';
/** `oggi` è l'aspetto di prima del restyling: serve solo come base dei controlli, non si sceglie. */
export type ThemeId = StyleId | 'oggi';

export type FontWeight = '400' | '500' | '600' | '700' | '800';

export interface ThemeColors {
  // Fondi, superfici, testo e bordi generici (nomi di oggi)
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;

  // Stati
  success: string;
  error: string;
  warning: string;
  info: string;
  notification: string;
  available: string;
  sold: string;
  alert: string;

  // Colori predefiniti delle posizioni: sono dati, uguali in tutti gli stili
  warehouse: string;
  showcase: string;
  workshop: string;
  stand: string;

  // Accento (oggi `primary`, diviso per ruolo)
  /** Riempimenti, bordi e icone d'accento (selezione, punti attivi, interruttori). */
  accent: string;
  /** Testo e icone d'accento sopra una superficie (prezzi, collegamenti, etichette). */
  accentInk: string;
  /** Velo d'accento sotto un elemento attivo. */
  accentSoft: string;
  /** Testo e icone sopra un riempimento `accent`. */
  onAccent: string;

  // Pulsanti
  button: string;
  onButton: string;
  buttonSecondary: string;
  onButtonSecondary: string;
  buttonSecondaryBorder: string;

  // Pillole (cartelle, filtri, posizioni)
  chip: string;
  chipText: string;
  chipBorder: string;
  chipActive: string;
  chipActiveText: string;
  chipActiveBorder: string;

  // Campi del modulo
  input: string;
  inputText: string;
  inputBorder: string;
  placeholder: string;
  fieldIcon: string;

  // Riquadri (scelte a riquadri, campi della Scheda)
  tile: string;
  tileBorder: string;
  tileSelected: string;
  tileSelectedBorder: string;
  tileSelectedText: string;
  checkRing: string;
  checkOn: string;

  // Altri ruoli della tela
  iconWrap: string;
  statNumber: string;
  dash: string;
  infoSoft: string;
  warningSoft: string;
  warningLine: string;
  warningText: string;
  soldBadge: string;
  soldBadgeText: string;
  alertBadge: string;
  alertBadgeText: string;

  // Superfici chiare di esito (righe Audit, «ultima azione», «Lo sapevi?») e testi sopra
  successSurface: string;
  onSuccessSurface: string;
  warningSurface: string;
  warningSurfaceBorder: string;
  onWarningSurface: string;

  // Fissi o quasi: velature, fotocamera, codici, ombre
  /** Testo e icone sopra un colore di dati (riquadri delle voci di Impostazioni, posizioni, automazioni). */
  onData: string;
  scrim: string;
  scrimStrong: string;
  cameraBackground: string;
  /** Carta e inchiostro dei codici QR e a barre: bianco e nero in tutti gli stili, per restare leggibili. */
  qrPaper: string;
  qrInk: string;
  shadow: string;
}

export type TypographyKey =
  | 'heroData'
  | 'heroLabel'
  | 'cardTitle'
  | 'cardValue'
  | 'cardLabel'
  | 'body'
  | 'bodySecondary'
  | 'caption'
  | 'sectionHeader'
  | 'buttonPrimary'
  | 'buttonSecondary'
  | 'h2'
  | 'h3'
  | 'overline';

export type Typography = Record<TypographyKey, TextStyle>;

export interface ThemeRadii {
  // Generici, uguali in tutti gli stili (valori di oggi)
  small: number;
  medium: number;
  large: number;
  full: number;
  // Ruoli che cambiano tra gli stili
  card: number;
  tile: number;
  photo: number;
  chip: number;
  badge: number;
  input: number;
  inputSmall: number;
  area: number;
  iconWrap: number;
  button: number;
  bar: number;
  tabActive: number;
}

export interface ThemeShadows {
  small: ViewStyle;
  card: ViewStyle;
  cardElevated: ViewStyle;
  button: ViewStyle;
  bar: ViewStyle;
  tabActive: ViewStyle;
}

/** Sfumatura lineare per `expo-linear-gradient`; `angle` come in CSS (180 = dall'alto in basso). */
export interface Gradient {
  colors: string[];
  locations?: number[];
  angle: number;
}

/** Bagliore radiale (da disegnare con `react-native-svg`): centro in frazioni della pagina, raggi in px. */
export interface Glow {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: string;
  /** Dove il colore diventa trasparente, frazione del raggio (0,7 = 70%). */
  stop: number;
}

export interface ThemeFont {
  /** Famiglia caricata; `null` = carattere di sistema (tema `oggi`). */
  family: string | null;
  /** Nome del file registrato per ogni peso usato nel codice (es. '600' → 'Inter_600SemiBold'). */
  files: Partial<Record<FontWeight, string>>;
}

export type TabIndicator = 'pill' | 'line' | 'box' | 'color';

export interface AppTheme {
  id: ThemeId;
  name: string;
  dark: boolean;
  colors: ThemeColors;
  typography: Typography;
  radius: ThemeRadii;
  shadows: ThemeShadows;
  spacing: { screenPadding: number; cardGap: number; sectionGap: number };
  font: ThemeFont;
  /** Titolo delle schermate principali. `tracking` in px. */
  title: { size: number; weight: FontWeight; tracking: number };
  /** Titoli di sezione: misura, peso e colore stanno in `typography.sectionHeader`. */
  section: { uppercase: boolean; tracking: number; line: string | null };
  /** Etichette dei campi del modulo. */
  label: { size: number; weight: FontWeight; color: string };
  weights: { strong: FontWeight; price: FontWeight };
  input: { height: number };
  /** Margine della foto dentro la card dell'Inventario (0 = foto a filo). */
  photo: { inset: { top: number; right: number; bottom: number; left: number } };
  /** Strati facoltativi sopra il colore pieno del ruolo con lo stesso nome. */
  gradients: { button?: Gradient; chipActive?: Gradient; tabActive?: Gradient };
  /** Sfondo dietro le schermate: bagliori e sfumatura facoltativi sopra `colors.background`. */
  backdrop: { glows: Glow[]; gradient?: Gradient };
  bar: {
    floating: boolean;
    marginHorizontal: number;
    marginBottom: number;
    paddingBottom: number;
    background: string;
    borderColor: string;
    borderWidth: number;
    /** Vetro sfocato; `null` = barra piena. Sul web `blur` in px e `saturate` in %. */
    glass: { blur: number; saturate: number } | null;
  };
  tab: {
    color: string;
    activeColor: string;
    activeBackground: string;
    activeIndicator: TabIndicator;
    labelSize: number;
    activeWeight: FontWeight;
  };
}
