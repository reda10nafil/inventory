// ETI (ticket 22, punto 5; D16, D07): HTML della scheda PDF di un prodotto. Funzione pura: chi la chiama passa i testi
// già pronti (prezzi, misure, posizione, Cronologia) e le foto in base64. Codici fatti in locale (QR e Code 128 in SVG,
// con lo SKU come l'etichetta e la finestra «Codice ed etichetta»: NG23), titolo «Syncro Flow», campi personalizzati
// nell'ordine del modulo. Nessuno script e nessun indirizzo esterno. Ogni testo dell'utente passa da `escapeHtml`.
import type { ProductCustomData } from '../types';
import { orderByLayout } from './layoutOrder';
import { code128Svg, escapeHtml, qrSvg } from './labelHtml';

export interface PdfField { name: string; value: string }

export interface ProductPdfInput {
  sku: string;
  /** Categoria col nome completo («Pellicce › Visone») e tipo di pelle, se ci sono. */
  category?: string;
  furType?: string;
  sold: boolean;
  location: string;
  /** Colore della posizione (un dato, come nella Scheda). */
  locationColor?: string;
  purchasePrice?: string;
  sellPrice?: string;
  measures: PdfField[];
  notes?: string;
  fields: PdfField[];
  /** Foto JPEG in base64 (senza `data:`). */
  images: string[];
  timeline: { text: string; date: string }[];
  generatedAt: string;
}

/**
 * Ordine dei campi personalizzati nel PDF: oggi quello del modulo (`LayoutContext`), come la Scheda. **Un punto solo**:
 * quando ogni categoria avrà il suo modulo (MCAT) basta cambiare qui (il prodotto c'è già fra gli argomenti).
 */
export function pdfFieldOrder(layout: { fields: readonly { id: string }[] }, _product?: { libraryId?: string }): string[] {
  return layout.fields.map((f) => f.id);
}

const COLOR = /^#[0-9a-f]{3,8}$/i;

/**
 * Righe dei campi personalizzati per il PDF, nell'ordine dato, senza i valori vuoti. Foto e documenti si contano o si
 * nominano (le foto del prodotto sono già nella galleria), le date in italiano; il resto lo scrive `describe` (lo
 * stesso testo della Scheda).
 */
export function pdfFieldRows(
  customData: readonly ProductCustomData[] | undefined,
  order: string[],
  describe: (item: ProductCustomData) => PdfField,
): PdfField[] {
  const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
  return orderByLayout([...(customData ?? [])], order).flatMap((item): PdfField[] => {
    if (empty(item.value)) return [];
    const { name, value } = describe(item);
    const type = item.fieldSnapshot?.type;
    const list = Array.isArray(item.value) ? item.value : [item.value];
    if (type === 'images') return [{ name, value: list.length === 1 ? '1 foto' : `${list.length} foto` }];
    if (type === 'document') return [{ name, value: list.map((uri) => String(uri).split('/').pop() || 'Documento').join(', ') }];
    if (type === 'date') {
      const d = new Date(item.value);
      return [{ name, value: Number.isNaN(d.getTime()) ? String(item.value) : d.toLocaleDateString('it-IT') }];
    }
    return value ? [{ name, value }] : [];
  });
}

const cards = (rows: PdfField[], primaryLast = false) => rows.map((r, i) => `<div class="card"><div class="card-label">${escapeHtml(r.name)}</div>`
  + `<div class="card-value${primaryLast && i === rows.length - 1 ? ' primary' : ''}">${escapeHtml(r.value)}</div></div>`).join('');

/** La pagina HTML della scheda, da stampare o salvare in PDF. */
export function productPdfHtml(p: ProductPdfInput): string {
  const color = p.locationColor && COLOR.test(p.locationColor) ? p.locationColor : '#000';
  const prices: PdfField[] = [
    ...(p.purchasePrice ? [{ name: 'Acquisto', value: p.purchasePrice }] : []),
    ...(p.sellPrice ? [{ name: 'Vendita', value: p.sellPrice }] : []),
  ];
  const section = (title: string, body: string) => `<div class="section"><div class="section-title">${escapeHtml(title)}</div>${body}</div>`;
  // Uno SKU vuoto (solo da un import) non fa fallire il PDF: senza codici
  const sku = p.sku.trim();
  const bars = sku ? code128Svg(sku) : '';
  const qr = sku ? qrSvg(sku) : '';
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scheda prodotto ${escapeHtml(p.sku)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000;padding:32px;line-height:1.5}
.header{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #000}
.header h1{font-size:26px;margin-bottom:6px}
.header .sku{font-size:22px;font-weight:700}
.header .kind{font-size:15px;color:#444}
.badge{display:inline-block;border:1px solid #000;padding:2px 12px;border-radius:12px;font-size:13px;font-weight:700;margin-top:8px}
.location{border:2px solid ${color};border-radius:10px;padding:14px;margin-bottom:24px}
.location .label,.card-label,.section-title{font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:1px}
.location .value{font-size:18px;font-weight:700}
.section{margin-bottom:24px;page-break-inside:avoid}
.section-title{margin-bottom:10px}
.cards{display:flex;flex-wrap:wrap;gap:10px}
.card{flex:1 1 140px;border:1px solid #ccc;border-radius:8px;padding:10px}
.card-value{font-size:16px;font-weight:600}
.card-value.primary{font-size:18px}
.fields{width:100%;border-collapse:collapse}
.fields td{border-bottom:1px solid #ddd;padding:6px 4px;font-size:14px;vertical-align:top}
.fields td:first-child{color:#555;width:40%}
.notes{border:1px solid #ccc;border-radius:8px;padding:12px;font-size:14px;white-space:pre-wrap}
.gallery img{display:block;max-width:100%;margin:0 auto 12px;border:1px solid #ccc;border-radius:6px;page-break-inside:avoid}
.event{margin-bottom:8px;font-size:14px}.event .date{font-size:12px;color:#555}
.codes{display:flex;justify-content:center;gap:40px;align-items:flex-start;flex-wrap:wrap;border:1px dashed #000;border-radius:10px;padding:20px;page-break-inside:avoid}
.code{text-align:center}.code .qr{width:150px;height:150px;margin:0 auto}.code .bars{width:220px;height:60px;margin:0 auto}
.code svg{display:block;width:100%;height:100%}.code .value{font-size:14px;font-weight:700;margin-top:6px}
.footer{margin-top:24px;padding-top:12px;border-top:1px solid #ccc;text-align:center;font-size:11px;color:#555}
</style></head><body>
<div class="header"><h1>Syncro Flow</h1><div class="sku">${escapeHtml(p.sku)}</div>`
    + `${p.category ? `<div class="kind">${escapeHtml(p.category)}</div>` : ''}`
    + `${p.furType ? `<div class="kind">Tipo di pelle: ${escapeHtml(p.furType)}</div>` : ''}`
    + `${p.sold ? '<div class="badge">Venduto</div>' : ''}</div>
<div class="location"><div class="label">Posizione attuale</div><div class="value">${escapeHtml(p.location)}</div></div>`
    + (prices.length ? section('Prezzi', `<div class="cards">${cards(prices, true)}</div>`) : '')
    + (p.measures.length ? section('Misure', `<div class="cards">${cards(p.measures)}</div>`) : '')
    + (p.fields.length ? section('Campi', `<table class="fields">${p.fields.map((f) => `<tr><td>${escapeHtml(f.name)}</td><td>${escapeHtml(f.value)}</td></tr>`).join('')}</table>`) : '')
    + (p.notes?.trim() ? section('Note tecniche', `<div class="notes">${escapeHtml(p.notes.trim())}</div>`) : '')
    + (p.images.length ? section(`Foto (${p.images.length})`, `<div class="gallery">${p.images.map((img, i) => `<img src="data:image/jpeg;base64,${img.replace(/[^A-Za-z0-9+/=]/g, '')}" alt="Foto ${i + 1}">`).join('')}</div>`) : '')
    + (p.timeline.length ? section('Cronologia', p.timeline.map((e) => `<div class="event">${escapeHtml(e.text)} <span class="date">${escapeHtml(e.date)}</span></div>`).join('')) : '')
    + (qr ? section('Codice', `<div class="codes"><div class="code"><div class="qr">${qr}</div><div class="value">${escapeHtml(sku)}</div></div>`
      + `${bars ? `<div class="code"><div class="bars">${bars}</div><div class="value">${escapeHtml(sku)}</div></div>` : ''}</div>`) : '')
    + `<div class="footer">Documento generato: ${escapeHtml(p.generatedAt)}</div></body></html>`;
}
