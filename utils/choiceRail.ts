// Binario di pillole (R1 di UX0; UX1-0): conti senza schermo di `components/ui/ChoiceRail.tsx`. Si parte dalle sole
// larghezze delle pillole e dalla parte a vista del binario, mai dalle posizioni misurate (cambiano con lo spazio).
// `width` è la parte a vista misurata dall'inizio della prima pillola fino al bordo dove il binario si taglia.

/** Spazio tra le pillole del binario (R1). */
export const RAIL_GAP = 8;
/** Spazio più stretto e più largo, quando lo si cambia per tagliare l'ultima pillola a vista. */
const RAIL_GAP_MIN = 4;
const RAIL_GAP_MAX = 16;
/** Larghezza della sfumatura sul bordo dove il binario si taglia (dice che continua). */
export const RAIL_FADE = 20;
/** All'apertura la scelta si porta a 24 px dall'inizio, con la pillola prima che si affaccia. */
const OPEN_MARGIN = 24;

/** Dove comincia ogni pillola, con quello spazio tra l'una e l'altra. */
export function railOffsets(widths: readonly number[], gap: number): number[] {
  const out: number[] = [];
  let x = 0;
  for (const w of widths) {
    out.push(x);
    x += w + gap;
  }
  return out;
}

/** Quanta parte dell'ultima pillola che comincia a vista sta dentro (1 = tutta, oltre 1 = c'è spazio dopo). */
export function railLastPart(widths: readonly number[], width: number, gap: number): number {
  const xs = railOffsets(widths, gap);
  let j = 0;
  xs.forEach((x, i) => { if (x < width) j = i; });
  return (width - xs[j]) / widths[j];
}

const isCut = (part: number) => part >= 0.3 && part <= 0.7;

/**
 * Spazio tra le pillole perché all'apertura l'ultima a vista sia **tagliata** (dal 30 al 70% dentro, R1: «si capisce
 * che continua»): una pillola quasi tutta dentro sembra l'ultima, una appena affacciata sparisce sotto la sfumatura.
 * Con tutte le pillole dentro o con l'ultima già tagliata resta 8; altrimenti lo spazio da 4 a 16 che la taglia più
 * vicino alla metà (a pari taglio, quello più vicino a 8); se nessuno la taglia, 8.
 */
export function railGap(widths: readonly number[], width: number): number {
  if (widths.length < 2 || width <= 0 || widths.some((w) => !(w > 0))) return RAIL_GAP;
  const total = widths.reduce((a, b) => a + b, 0) + RAIL_GAP * (widths.length - 1);
  if (total <= width) return RAIL_GAP;
  if (isCut(railLastPart(widths, width, RAIL_GAP))) return RAIL_GAP;
  let best = RAIL_GAP;
  let bestKey: [number, number] | null = null;
  for (let gap = RAIL_GAP_MIN; gap <= RAIL_GAP_MAX; gap += 1) {
    const part = railLastPart(widths, width, gap);
    if (!isCut(part)) continue;
    const key: [number, number] = [Math.abs(part - 0.5), Math.abs(gap - RAIL_GAP)];
    if (!bestKey || key[0] < bestKey[0] - 1e-9 || (Math.abs(key[0] - bestKey[0]) < 1e-9 && key[1] < bestKey[1])) {
      best = gap;
      bestKey = key;
    }
  }
  return best;
}

/**
 * Di quanto scorrere il binario all'apertura perché la scelta (`selected`, −1 = nessuna) entri in vista: niente se è
 * già tutta a vista prima della sfumatura, altrimenti fino a 24 px prima di lei.
 */
export function railOpenScroll(widths: readonly number[], width: number, gap: number, selected: number): number {
  if (selected < 0 || selected >= widths.length) return 0;
  const x = railOffsets(widths, gap)[selected];
  if (x + widths[selected] <= width - RAIL_FADE) return 0;
  return Math.max(0, x - OPEN_MARGIN);
}
