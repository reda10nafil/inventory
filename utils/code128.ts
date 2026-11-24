// ETI (ticket 22): codice a barre Code 128 (set B) fatto in locale, senza servizi esterni. Estratto da
// `components/Barcode.tsx`, che lo disegna sullo schermo; `utils/labelHtml.ts` lo mette nell'etichetta in SVG.
// Ogni simbolo è una sequenza di larghezze alternate barra/spazio, in moduli (11 per simbolo, 13 lo stop).

const PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131',
  '211412', // 103 Start A
  '211214', // 104 Start B
  '211232', // 105 Start C
  '2331112', // 106 Stop
];
const START_B = 104;
const STOP = 106;

/** Vero se il testo si scrive in Code 128 B: caratteri ASCII stampabili (spazio … DEL), almeno uno. */
export function code128Encodable(value: string): boolean {
  if (!value) return false;
  for (let i = 0; i < value.length; i += 1) {
    const c = value.charCodeAt(i);
    if (c < 32 || c > 127) return false;
  }
  return true;
}

/**
 * Larghezze del codice (barra, spazio, barra… in moduli), con start B, cifra di controllo e stop. Null se un
 * carattere non si può scrivere (accenti, emoji, a capo): meglio nessun barcode che uno che si legge come un altro
 * codice (prima un carattere così diventava uno spazio).
 */
export function code128Widths(value: string): number[] | null {
  if (!code128Encodable(value)) return null;
  const symbols = [START_B];
  let checksum = START_B;
  for (let i = 0; i < value.length; i += 1) {
    const v = value.charCodeAt(i) - 32;
    symbols.push(v);
    checksum += v * (i + 1);
  }
  symbols.push(checksum % 103, STOP);
  return symbols.flatMap((s) => PATTERNS[s].split('').map(Number));
}

/** Barre in moduli (`x`, `w`) e larghezza totale, per disegnarle in SVG o con react-native-svg. */
export function code128Bars(value: string): { bars: { x: number; w: number }[]; width: number } | null {
  const widths = code128Widths(value);
  if (!widths) return null;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return { bars, width: x };
}
