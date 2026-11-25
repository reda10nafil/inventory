// M08 - CSV: il giro esporta-reimporta conserva giacenza, unità e scorta minima; i CSV di prima si importano come
// prima; una giacenza non valida salta la riga; i due report nuovi (giacenze e movimenti).
// Per ogni prodotto reimportato si legge lo stato salvato: giacenza salvata = eventi `stock` rigiocati.
const fs = require('fs');
const { scenario } = require('./lib.cjs');
const { product } = require('./a3-util.cjs');

const P = 'inventory:v1:local:products';
const T = 'inventory:v1:local:timeline';

// Copia in JS di utils/csv.ts (solo per leggere il file scaricato)
function parseCsv(input) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) { if (c === '"' && input[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"' && field.length === 0) quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && input[i + 1] === '\n') i++; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  return rows;
}
const toCsv = (rows) => rows.map((r) => r.map((v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\r\n');

function replay(events) {
  const m = {};
  for (const e of events) {
    if (e.type !== 'stock' || typeof e.details.qty !== 'number') continue;
    const q = Math.round(e.details.qty * 1000);
    if (e.details.from) m[e.details.from] = (m[e.details.from] || 0) - q;
    if (e.details.to) m[e.details.to] = (m[e.details.to] || 0) + q;
  }
  return Object.fromEntries(Object.entries(m).filter(([, v]) => v !== 0).map(([k, v]) => [k, v / 1000]));
}
const positive = (stock) => Object.fromEntries(Object.entries(stock || {}).filter(([, q]) => q > 0));
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

async function rendiAQuantita(h, sku, stock, extra = {}) {
  await h.page.evaluate(([pk, tk, sku, stock, extra]) => {
    const list = JSON.parse(localStorage.getItem(pk));
    const p = list.find((x) => x.sku === sku);
    Object.assign(p, { stock, unit: 'pz', ...extra });
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    for (const [place, qty] of Object.entries(stock)) {
      if (qty > 0) tl.unshift({ id: `m08-${sku}-${place}`, productId: p.id, type: 'stock', timestamp: '2026-11-22T08:00:00.000Z', details: { movement: 'carico', qty, to: place, reason: 'iniziale', before: 0, after: qty } });
    }
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  }, [P, T, sku, stock, extra]);
}
// Tre articoli a quantità: principale non la più grande (VIS-0098), esaurito (LIN-0021), decimale (AST-0033)
async function preparaCampionario(h) {
  await rendiAQuantita(h, 'VIS-0098', { vetrina: 2.5, magazzino: 12 }, { location: 'vetrina', unit: 'kg', minStock: 20 });
  await rendiAQuantita(h, 'LIN-0021', { stand_b: 0 }, { minStock: 1 });
  await rendiAQuantita(h, 'AST-0033', { sartoria: 0.125 }, { unit: 'm' });
  await h.go('');
}

const DROP = '[aria-label="Importa CSV trascinando un file qui"]';
// IMP (DATI): il riquadro è nella schermata Importa prodotti; si importa con l'abbinamento proposto e si torna
async function drop(h, csv, name = 'prova.csv') {
  await require('./imp-util.cjs').importaCsv(h, csv, name);
}
async function scarica(h, voce) {
  const dl = h.page.waitForEvent('download', { timeout: 8000 });
  await h.click(voce);
  const d = await dl;
  return { nome: d.suggestedFilename(), righe: parseCsv(fs.readFileSync(await d.path(), 'utf8').replace(/^﻿/, '')) };
}

(async () => {
  // 1. Esporta, reimporta con SKU «RT-…»: articoli a quantità uguali, eventi che ridanno la giacenza, pezzi unici uguali
  await scenario('m08-giro-esporta-reimporta', async (h) => {
    await preparaCampionario(h);
    await h.tab('Impostazioni');
    const prima = await h.products(0);
    const { righe } = await scarica(h, 'Esporta Inventario');
    const header = righe[0];
    const rt = [header, ...righe.slice(1).map((r) => r.map((v, i) => (i === 0 ? `RT-${v}` : v)))];
    await drop(h, toCsv(rt), 'reimport.csv');
    const dopo = await h.products();
    const tl = await h.timeline(0);
    const confronto = prima.filter((o) => !o.deletedAt).map((o) => {
      const n = dopo.find((p) => p.sku === `RT-${o.sku}`);
      if (!n) return { sku: o.sku, importato: false };
      const persi = [];
      for (const k of ['location', 'status', 'unit', 'minStock', 'furType', 'sellPrice']) if (JSON.stringify(o[k] ?? null) !== JSON.stringify(n[k] ?? null)) persi.push(`${k} ${JSON.stringify(o[k])}->${JSON.stringify(n[k])}`);
      if (JSON.stringify(o.stock ?? null) !== JSON.stringify(n.stock ?? null) && !same(Object.entries(o.stock || {}), Object.entries(n.stock || {}))) persi.push(`stock ${JSON.stringify(o.stock)}->${JSON.stringify(n.stock)}`);
      const ev = tl.filter((e) => e.productId === n.id);
      return { sku: o.sku, persi, coincide: same(positive(n.stock), replay(ev)), eventi: ev.map((e) => e.type === 'stock' ? `stock:${e.details.to}:${e.details.qty}` : e.type) };
    });
    return { colonne: header.slice(-3), prodottiDopo: dopo.length, confronto };
  });

  // 2. CSV di prima (senza le colonne nuove) come prima; giacenza non valida saltata; giacenza + «venduto» = disponibile
  await scenario('m08-import-vecchio-e-rifiuti', async (h) => {
    await h.tab('Impostazioni');
    await drop(h, 'SKU,Tipo Pelle,Posizione,Status,Prezzo Vendita\r\nM08-OLD-1,volpe,stand_a,venduto,"1234,50"\r\nM08-OLD-2,visone,vetrina,,\r\n', 'vecchio.csv');
    await drop(h, 'SKU,Categoria,Posizione,Status,Unità,Giacenza,Scorta minima\r\nM08-BAD-1,visone,vetrina,,pz,vetrina:-1,\r\nM08-BAD-2,visone,vetrina,,pz,vetrina,\r\nM08-NEW-1,visone,vetrina,venduto,kg,"vetrina:2,5; magazzino:4",3\r\nM08-NEW-2,visone,,,,magazzino:0,\r\n', 'nuovo.csv');
    const list = await h.products();
    const tl = await h.timeline(0);
    const get = (sku) => list.find((p) => p.sku === sku);
    const desc = (sku) => {
      const p = get(sku);
      if (!p) return 'assente';
      const ev = tl.filter((e) => e.productId === p.id);
      return { location: p.location, status: p.status, stock: p.stock ?? null, unit: p.unit ?? null, minStock: p.minStock ?? null, coincide: same(positive(p.stock), replay(ev)) };
    };
    return { old1: desc('M08-OLD-1'), old2: desc('M08-OLD-2'), bad1: desc('M08-BAD-1'), bad2: desc('M08-BAD-2'), new1: desc('M08-NEW-1'), new2: desc('M08-NEW-2') };
  });

  // 3. Report giacenze: righe per posizione con i nomi, esaurito a 0, pezzo unico a 1, venduto assente, sotto scorta
  await scenario('m08-report-giacenze', async (h) => {
    await preparaCampionario(h);
    await h.tab('Impostazioni');
    const { nome, righe } = await scarica(h, 'Esporta giacenze');
    return { nome: nome.replace(/\d+/, 'N'), intestazione: righe[0], righe: righe.slice(1).map((r) => r.join('|')) };
  });

  // 4. Report movimenti: dopo uno scarico dalla Scheda, gli eventi `stock` dal più vecchio con nomi e causale
  await scenario('m08-report-movimenti', async (h) => {
    await preparaCampionario(h);
    const label = (name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
    await h.click('VIS-0098'); await h.page.waitForTimeout(800);
    await label('Movimenta').click(); await h.page.waitForTimeout(500);
    await label('Tipo Scarico').click();
    await label('Da Magazzino').click();
    await h.page.locator('input[placeholder^="es. 2,5"]').locator('visible=true').first().fill('1,5');
    await label('Causale Danno').click();
    await h.page.getByPlaceholder('es. fattura 124, bancale rotto').fill('bancale rotto, lato');
    await label('Registra movimento').click();
    await h.page.waitForTimeout(800);
    await h.go('');
    await h.tab('Impostazioni');
    const { nome, righe } = await scarica(h, 'Esporta movimenti');
    const stockEvents = (await h.timeline(0)).filter((e) => e.type === 'stock').length;
    return { nome: nome.replace(/\d+/, 'N'), intestazione: righe[0], eventiStock: stockEvents, righe: righe.slice(1).map((r) => r.slice(1).join('|')), dataOk: righe.slice(1).every((r) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(r[0])) };
  });
})();
