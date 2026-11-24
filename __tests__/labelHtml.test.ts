// ETI (ticket 22, AU-A8, AU-V16, D16, D07): etichette e scheda PDF fatte in locale (`utils/labelHtml.ts`,
// `utils/productPdf.ts`): nessuno script, nessun indirizzo esterno, il QR porta il codice, i tre formati, i testi
// dell'utente escapati, i campi personalizzati nell'ordine del modulo.
import QRCode from 'qrcode';
import {
  LABEL_FORMATS, code128Svg, escapeHtml, isLabelFormat, labelCountText, labelHtml, qrModules, qrSvg,
} from '../utils/labelHtml';
import { pdfFieldOrder, pdfFieldRows, productPdfHtml, type ProductPdfInput } from '../utils/productPdf';

/** Celle scure del primo QR dell'HTML, rilette dal percorso SVG («M x y h n v1 h-n z»), senza il margine di 4. */
function qrCells(html: string): Set<string> {
  const d = html.match(/<svg class="qr-svg"[^>]*>.*?<path fill="#000" d="([^"]*)"/)?.[1] ?? '';
  const cells = new Set<string>();
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const [x, y, n] = [Number(m[1]) - 4, Number(m[2]) - 4, Number(m[3])];
    for (let i = 0; i < n; i += 1) cells.add(`${y},${x + i}`);
  }
  return cells;
}
/** Celle scure del QR di un testo secondo la libreria `qrcode` (livello M, come `react-native-qrcode-svg`). */
function expectedCells(text: string): Set<string> {
  const { size, data } = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
  const cells = new Set<string>();
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) if (data[r * size + c]) cells.add(`${r},${c}`);
  return cells;
}
const pages = (html: string) => (html.match(/<div class="page">/g) ?? []).length;
const labels = (html: string) => (html.match(/<div class="label">/g) ?? []).length;

describe('labelHtml', () => {
  const items = [{ code: 'VIS-0142', name: 'Collezione Inverno · Visone' }];

  it('nessuno script e nessun indirizzo esterno, in tutti e tre i formati (D16, AU-V16)', () => {
    for (const format of ['single', 'a4', 'labeler'] as const) {
      const html = labelHtml(items, format);
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toMatch(/https?:/i);
      expect(html).not.toMatch(/src=|href=|@import|url\(/i);
      expect(html).toContain('<svg');
    }
  });

  it('il QR porta il codice: la matrice disegnata è quella di `qrcode` per quel testo', () => {
    for (const code of ['VIS-0142', 'LOC-MAGAZZINO', 'SCAF-MAGAZZINO-A1', 'LIB-PELLICCE-VISONE']) {
      const html = labelHtml([{ code }], 'single');
      expect(qrCells(html)).toEqual(expectedCells(code));
      expect(html).toContain(`>${code}</div>`);
    }
    expect(qrModules('VIS-0142')).toHaveLength(21);
  });

  it('una etichetta per pagina, foglio A4 da 24, etichettatrice a rotolo', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ code: `P-${i}` }));
    const a4 = labelHtml(many, 'a4');
    expect(pages(a4)).toBe(2);
    expect(labels(a4)).toBe(30);
    expect(a4).toContain('@page{size:A4;margin:0mm}');
    expect(a4).toContain('grid-template-columns:repeat(3,70mm)');
    const single = labelHtml(many.slice(0, 3), 'single');
    expect(pages(single)).toBe(3);
    const roll = labelHtml(many.slice(0, 2), 'labeler');
    expect(pages(roll)).toBe(2);
    expect(roll).toContain('@page{size:62mm 29mm;margin:0mm}');
    expect(roll).toContain('grid-auto-rows:28.5mm'); // mezzo millimetro sotto la pagina: nessuna pagina bianca in più
    expect(LABEL_FORMATS.a4.cols * LABEL_FORMATS.a4.rows).toBe(24);
  });

  it('il Code 128 solo nel formato con lo spazio («Una etichetta»), e mai per un codice che non si può scrivere', () => {
    expect(labelHtml(items, 'single')).toContain('class="bars-svg"');
    expect(labelHtml(items, 'a4')).not.toContain('class="bars-svg"');
    expect(code128Svg('Città')).toBe('');
    expect(labelHtml([{ code: 'Città' }], 'single')).not.toContain('class="bars-svg"');
  });

  it('i testi dell\'utente sono escapati (nome e codice)', () => {
    const html = labelHtml([{ code: 'A<1>', name: '<b>"Rossi" & figli\'</b>' }], 'a4');
    expect(html).toContain('&lt;b&gt;&quot;Rossi&quot; &amp; figli&#39;&lt;/b&gt;');
    expect(html).toContain('A&lt;1&gt;');
    expect(html).not.toContain('<b>');
    expect(escapeHtml('<&>')).toBe('&lt;&amp;&gt;');
  });

  it('le etichette senza codice si saltano; titolo e contatore', () => {
    const html = labelHtml([{ code: 'A1' }, { code: '  ' }, { code: 'B2' }], 'labeler');
    expect(labels(html)).toBe(2);
    expect(html).toContain('<title>2 etichette</title>');
    expect(labelHtml([{ code: 'A1' }], 'single')).toContain('<title>Etichetta A1</title>');
    expect(labelCountText(1)).toBe('1 etichetta');
    expect(labelCountText(12)).toBe('12 etichette');
  });

  it('un formato sconosciuto (chiave salvata rovinata) vale «Una etichetta»', () => {
    expect(isLabelFormat('a4')).toBe(true);
    expect(isLabelFormat('a5')).toBe(false);
    expect(labelHtml(items, 'a5' as never)).toBe(labelHtml(items, 'single'));
  });

  it('qrSvg ha il margine bianco di 4 moduli', () => {
    expect(qrSvg('VIS-0142')).toContain('viewBox="0 0 29 29"');
  });
});

describe('productPdfHtml', () => {
  const base: ProductPdfInput = {
    sku: 'VIS-0142', category: 'Collezione Inverno', furType: 'Visone', sold: false, location: 'Vetrina', locationColor: '#D4AF37',
    sellPrice: '4.200 €', measures: [{ name: 'Peso', value: '2,1 kg' }], notes: 'Fodera <seta>',
    fields: [{ name: 'Fornitore', value: 'Pellicceria Bianchi, Milano' }, { name: 'Taglia', value: 'M' }],
    images: [], timeline: [{ text: 'Creato', date: '22 nov 2026' }], generatedAt: '24 novembre 2026',
  };

  it('titolo «Syncro Flow», campi personalizzati, codici in SVG locali, nessuno script né indirizzo esterno (D07, D16)', () => {
    const html = productPdfHtml(base);
    expect(html).toContain('<h1>Syncro Flow</h1>');
    expect(html).not.toContain('FurInventory');
    expect(html).toContain('<td>Fornitore</td><td>Pellicceria Bianchi, Milano</td>');
    expect(html.indexOf('Fornitore')).toBeLessThan(html.indexOf('Taglia'));
    expect(html).not.toMatch(/<script|https?:|qrserver|barcodeapi/i);
    expect(qrCells(html)).toEqual(expectedCells('VIS-0142'));
    expect(html).toContain('class="bars-svg"');
    expect(html).toContain('Fodera &lt;seta&gt;');
  });

  it('uno SKU vuoto (da un import) non fa fallire il PDF: niente codici (rilievo del revisore)', () => {
    const html = productPdfHtml({ ...base, sku: '  ' });
    expect(html).toContain('<h1>Syncro Flow</h1>');
    expect(html).not.toContain('class="qr-svg"');
  });

  it('un colore della posizione che non è un colore non entra nello stile', () => {
    expect(productPdfHtml({ ...base, locationColor: 'red;} body{display:none' })).toContain('border:2px solid #000');
  });

  it('foto come data: e niente sezioni vuote', () => {
    const html = productPdfHtml({ ...base, images: ['QUJD'], fields: [], measures: [], notes: '', timeline: [] });
    expect(html).toContain('src="data:image/jpeg;base64,QUJD"');
    expect(html).not.toContain('class="fields"');
    expect(html).not.toContain('>Misure<');
  });
});

describe('pdfFieldRows e pdfFieldOrder', () => {
  const field = (id: string, name: string, type: string) => ({ id, name, type }) as never;
  const data = [
    { value: 'M', fieldSnapshot: field('taglia', 'Taglia', 'single_choice') },
    { value: '', fieldSnapshot: field('note', 'Note', 'text_short') },
    { value: ['a.jpg', 'b.jpg'], fieldSnapshot: field('foto', 'Foto extra', 'images') },
    { value: 'Rossi', fieldSnapshot: field('fornitore', 'Fornitore', 'text_short') },
    { value: '2026-11-22', fieldSnapshot: field('data', 'Data', 'date') },
    { value: ['file:///x/fattura.pdf'], fieldSnapshot: field('doc', 'Fattura', 'document') },
  ];
  const describeText = (item: { value: unknown; fieldSnapshot: { name: string } }) => ({ name: item.fieldSnapshot.name, value: String(item.value) });

  it('nell\'ordine del modulo, senza i vuoti; foto contate, documenti per nome, date in italiano', () => {
    const order = pdfFieldOrder({ fields: [{ id: 'fornitore' }, { id: 'taglia' }, { id: 'data' }] });
    expect(order).toEqual(['fornitore', 'taglia', 'data']);
    const rows = pdfFieldRows(data as never, order, describeText as never);
    expect(rows.map((r) => r.name)).toEqual(['Fornitore', 'Taglia', 'Data', 'Foto extra', 'Fattura']);
    expect(rows.find((r) => r.name === 'Foto extra')?.value).toBe('2 foto');
    expect(rows.find((r) => r.name === 'Fattura')?.value).toBe('fattura.pdf');
    expect(rows.find((r) => r.name === 'Data')?.value).toBe(new Date('2026-11-22').toLocaleDateString('it-IT'));
  });

  it('nessun campo personalizzato: nessuna riga', () => {
    expect(pdfFieldRows(undefined, [], describeText as never)).toEqual([]);
  });
});
