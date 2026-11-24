// ETI (ticket 22, AU-A8, AU-V16): etichette fatte in locale. Funzioni pure: dal codice e dal nome di una cosa
// (prodotto, posizione, scaffale, categoria) all'HTML da stampare, con il QR e il Code 128 in SVG disegnati qui.
// Nessuno `<script>` e nessun indirizzo esterno (D16): l'etichetta esce uguale senza internet. Il QR porta il codice
// (risposta dell'utente del 23: QR e tag servono solo all'app), lo stesso che la finestra «Codice ed etichetta» mostra.
import QRCode from 'qrcode';
import { code128Bars } from './code128';

/** Una etichetta: il codice (nel QR e scritto grande) e il nome della cosa sotto. */
export interface LabelItem {
  code: string;
  name?: string;
}

export type LabelFormatId = 'single' | 'a4' | 'labeler';

/**
 * Formati delle etichette, in una tabella sola. **Misure segnaposto** (decisa dall'orchestratore al posto dell'utente,
 * 24/11): l'utente non ha ancora detto con che cosa stampa; foglio A4 da 3 × 8 etichette di 70 × 37 mm, etichettatrice
 * a rotolo da 62 × 29 mm. Per cambiarle basta questa tabella.
 */
export const LABEL_FORMATS: Record<LabelFormatId, {
  name: string;
  /** Riga sotto la scelta nella finestra. */
  note: string;
  /** Misure dell'etichetta in millimetri. */
  width: number;
  height: number;
  /** Foglio: colonne e righe di etichette per pagina (1 × 1 = una per pagina). */
  cols: number;
  rows: number;
  /** `size` di `@page` e margine della pagina. */
  page: string;
  margin: number;
}> = {
  single: { name: 'Una etichetta', note: 'Una per pagina, 100 × 60 mm', width: 100, height: 60, cols: 1, rows: 1, page: 'A4', margin: 15 },
  a4: { name: 'Foglio A4', note: '24 per foglio, 70 × 37 mm (3 × 8)', width: 70, height: 37, cols: 3, rows: 8, page: 'A4', margin: 0 },
  labeler: { name: 'Etichettatrice', note: 'Rotolo da 62 × 29 mm', width: 62, height: 29, cols: 1, rows: 1, page: '62mm 29mm', margin: 0 },
};
export const LABEL_FORMAT_IDS: LabelFormatId[] = ['single', 'a4', 'labeler'];
export const DEFAULT_LABEL_FORMAT: LabelFormatId = 'single';

export const isLabelFormat = (value: unknown): value is LabelFormatId =>
  typeof value === 'string' && (LABEL_FORMAT_IDS as string[]).includes(value);

/** Testo sicuro dentro l'HTML (anche negli attributi). */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Moduli del QR (`true` = scuro), riga per riga. Livello di correzione M, come `react-native-qrcode-svg` sullo
 * schermo: la finestra e l'etichetta disegnano la stessa matrice.
 */
export function qrModules(text: string): boolean[][] {
  const { size, data } = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (__, c) => !!data[r * size + c]));
}

/** QR in SVG (nero su bianco, con il margine bianco di 4 moduli che serve ai lettori). Si allarga al contenitore. */
export function qrSvg(text: string): string {
  const modules = qrModules(text);
  const quiet = 4;
  const side = modules.length + quiet * 2;
  let d = '';
  modules.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (!row[c]) { c += 1; continue; }
      let run = 1;
      while (c + run < row.length && row[c + run]) run += 1;
      d += `M${c + quiet} ${r + quiet}h${run}v1h-${run}z`;
      c += run;
    }
  });
  return `<svg class="qr-svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges" role="img" aria-label="QR ${escapeHtml(text)}">`
    + `<rect width="${side}" height="${side}" fill="#fff"/><path fill="#000" d="${d}"/></svg>`;
}

/** Code 128 in SVG, con 10 moduli bianchi ai lati; stringa vuota se il codice non si scrive in Code 128. */
export function code128Svg(text: string): string {
  const code = code128Bars(text);
  if (!code) return '';
  const quiet = 10;
  const width = code.width + quiet * 2;
  const rects = code.bars.map((b) => `<rect x="${b.x + quiet}" width="${b.w}" height="40"/>`).join('');
  return `<svg class="bars-svg" viewBox="0 0 ${width} 40" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="Codice a barre ${escapeHtml(text)}">`
    + `<rect width="${width}" height="40" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}

/** Una etichetta. Nel formato «Una etichetta» c'è posto anche per il Code 128; negli altri solo QR, codice e nome. */
function labelBlock(item: LabelItem, format: LabelFormatId): string {
  const code = item.code.trim();
  const name = item.name?.trim() ? `<div class="name">${escapeHtml(item.name.trim())}</div>` : '';
  const bars = format === 'single' ? code128Svg(code) : '';
  return `<div class="label"><div class="qr">${qrSvg(code)}</div><div class="text"><div class="code">${escapeHtml(code)}</div>${name}`
    + `${bars ? `<div class="bars">${bars}</div>` : ''}</div></div>`;
}

function styles(format: LabelFormatId): string {
  const f = LABEL_FORMATS[format];
  // Etichettatrice: l'etichetta mezzo millimetro più bassa della pagina, perché l'arrotondamento dei mm non aggiunga
  // una pagina bianca tra un'etichetta e l'altra (da provare con la stampante vera)
  const height = format === 'labeler' ? f.height - 0.5 : f.height;
  const common = `*{box-sizing:border-box;margin:0;padding:0}html,body{background:#fff;color:#000}`
    + `body{font-family:Arial,Helvetica,sans-serif}.qr svg,.bars svg{display:block;width:100%;height:100%}`
    + `.code{font-weight:700;letter-spacing:.02em;overflow-wrap:anywhere}.name{overflow:hidden;word-break:break-word}`
    + `.label{width:${f.width}mm;height:${height}mm;overflow:hidden;page-break-inside:avoid;break-inside:avoid}`
    + `@page{size:${f.page};margin:${f.margin}mm}`;
  if (format === 'single') {
    return `${common}.page{page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}`
      + `.label{border:0.3mm dashed #000;padding:4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;text-align:center}`
      + `.qr{width:34mm;height:34mm;flex:none}.text{width:100%}.code{font-size:16pt}.name{font-size:9pt;max-height:8mm}`
      + `.bars{height:8mm;margin-top:1mm}`;
  }
  const qr = format === 'a4' ? 31 : 25;
  return `${common}.page{display:grid;grid-template-columns:repeat(${f.cols},${f.width}mm);grid-auto-rows:${height}mm;`
    + `page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}`
    + `.label{display:flex;align-items:center;gap:2mm;padding:2mm}.qr{width:${qr}mm;height:${qr}mm;flex:none}`
    + `.text{flex:1;min-width:0}.code{font-size:${format === 'a4' ? 10 : 9}pt}.name{font-size:${format === 'a4' ? 8 : 7}pt;max-height:9mm;margin-top:1mm}`;
}

/**
 * Pagina HTML con le etichette nel formato scelto: una per pagina («Una etichetta», «Etichettatrice») o 24 per foglio
 * A4. Le etichette senza codice si saltano. Nessuno script: la stampa la chiede chi apre la pagina.
 */
export function labelHtml(items: readonly LabelItem[], format: LabelFormatId = DEFAULT_LABEL_FORMAT): string {
  const f = LABEL_FORMATS[isLabelFormat(format) ? format : DEFAULT_LABEL_FORMAT];
  const id = isLabelFormat(format) ? format : DEFAULT_LABEL_FORMAT;
  const list = items.filter((i) => i.code?.trim());
  const perPage = f.cols * f.rows;
  const pages: string[] = [];
  for (let i = 0; i < list.length; i += perPage) {
    pages.push(`<div class="page">${list.slice(i, i + perPage).map((item) => labelBlock(item, id)).join('')}</div>`);
  }
  const title = list.length === 1 ? `Etichetta ${list[0].code.trim()}` : `${list.length} etichette`;
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<title>${escapeHtml(title)}</title><style>${styles(id)}</style></head><body>${pages.join('')}</body></html>`;
}

/** «1 etichetta», «12 etichette». */
export const labelCountText = (n: number): string => (n === 1 ? '1 etichetta' : `${n} etichette`);
