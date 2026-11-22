// M07 - Conta di magazzino (Automazioni › Conta Magazzino): differenze in più e in meno, uguali, vuote, pezzi
// unici e cestino esclusi, conteggio nella posizione secondaria e nella principale, tutto uguale, quantità non
// valida. Per ogni scenario si legge lo stato salvato: giacenza salvata = eventi `stock` rigiocati, e i prodotti
// non rettificati restano identici.
const { scenario } = require('./lib.cjs');

const P = 'inventory:v1:local:products';
const T = 'inventory:v1:local:timeline';

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

// Prodotti cambiati nello stato salvato (prima di aprire l'app): { SKU: campi }; per gli articoli a quantità un
// carico iniziale per posizione nella Cronologia, così giacenza = eventi.
async function prepara(h, changes) {
  await h.page.evaluate(([pk, tk, changes]) => {
    const list = JSON.parse(localStorage.getItem(pk));
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    for (const [sku, extra] of Object.entries(changes)) {
      const p = list.find((x) => x.sku === sku);
      Object.assign(p, extra);
      for (const [place, qty] of Object.entries(extra.stock || {})) {
        if (qty > 0) tl.unshift({ id: `m07-${sku}-${place}`, productId: p.id, type: 'stock', timestamp: '2026-11-22T08:00:00.000Z', details: { movement: 'carico', qty, to: place, reason: 'iniziale', before: 0, after: qty } });
      }
    }
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  }, [P, T, changes]);
  await h.go('');
}

const label = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
async function conta(h, posizione, conteggi) {
  await label(h, `Conta ${posizione}`).click(); await h.page.waitForTimeout(500);
  for (const [sku, qty] of Object.entries(conteggi)) await label(h, `Contata ${sku}`).fill(qty);
  await h.page.waitForTimeout(300);
}
async function stato(h) {
  const products = await h.products(1500);
  const timeline = await h.timeline(0);
  const of = (sku) => {
    const p = products.find((x) => x.sku === sku);
    const ev = timeline.filter((e) => e.productId === p.id);
    return { p, ev, coincide: same(positive(p.stock), replay(ev)) };
  };
  return { products, timeline, of };
}
const rett = (ev) => ev.filter((e) => e.type === 'stock' && e.details.movement === 'rettifica')
  .map((e) => `${e.details.reason}/${e.details.qty}/${e.details.from || ''}>${e.details.to || ''}`);

(async () => {
  // 1. Magazzino: VIS-0098 5 → 3, PUZ-0012 esaurito qui 0 → 1,5, AST-0033 2 uguale (secondaria), LIN-0021 vuota;
  //    VIS-0142 pezzo unico e VOL-0087 nel cestino non si contano. Ingresso dalla scheda Automazioni.
  await scenario('m07-differenze', async (h) => {
    await prepara(h, {
      'VIS-0098': { unit: 'pz', stock: { magazzino: 5 } },
      'PUZ-0012': { unit: 'kg', stock: { magazzino: 0 }, location: 'magazzino' },
      'AST-0033': { unit: 'pz', stock: { sartoria: 3, magazzino: 2 } },
      'LIN-0021': { unit: 'm', stock: { magazzino: 4 }, location: 'magazzino' },
      'VIS-0142': { location: 'magazzino' },
      'VOL-0087': { status: 'available', unit: 'pz', stock: { magazzino: 2 }, location: 'magazzino', deletedAt: '2026-11-22T09:00:00.000Z' },
    });
    const prima = await stato(h);
    await h.tab('Automazioni');
    await h.click('Conta Magazzino');
    const chip = await h.has('Magazzino · 4', true);
    await conta(h, 'Magazzino', { 'VIS-0098': '3', 'PUZ-0012': '1,5', 'AST-0033': '2' });
    const elenco = {
      righe: await h.page.getByLabel(/^Contata /).locator('visible=true').count(),
      pezzoUnico: await h.has('1 pezzo unico in questa posizione', false),
      cestino: await h.page.getByLabel('Contata VOL-0087', { exact: true }).count(),
      meno: await h.has('−2 pz', true), piu: await h.has('+1,5 kg', true), uguale: await h.has('Uguale', true),
      piede: await h.has('Contati 3 di 4 · 2 con differenze', true),
    };
    await label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(500);
    const riepilogo = {
      nonContati: await h.has('Non contati: 1 (restano come sono)', false),
      vis: await h.has('5 → 3 pz', true), puz: await h.has('0 → 1,5 kg', true),
      pulsante: await h.has('Registra 2 rettifiche', true),
    };
    await label(h, 'Registra rettifiche').click(); await h.page.waitForTimeout(600);
    const esito = await h.has('2 rettifiche registrate in Magazzino; 1 uguale alla giacenza registrata.', true);
    await h.shot('esito');
    const dopo = await stato(h);
    const vis = dopo.of('VIS-0098'); const puz = dopo.of('PUZ-0012');
    const nuovi = dopo.timeline.filter((e) => !prima.timeline.some((x) => x.id === e.id));
    const intatti = ['AST-0033', 'LIN-0021', 'VIS-0142', 'VOL-0087'].filter((sku) =>
      JSON.stringify(prima.products.find((p) => p.sku === sku)) === JSON.stringify(dopo.products.find((p) => p.sku === sku)));
    await h.go('timeline');
    await h.click('Movimenti');
    const cronologia = { vis: await h.has('Rettifica: −2 pz in Magazzino', false), puz: await h.has('Rettifica: +1,5 kg in Magazzino', false) };
    return {
      chip, elenco, riepilogo, esito,
      vis: { stock: vis.p.stock, coincide: vis.coincide, rettifiche: rett(vis.ev) },
      puz: { stock: puz.p.stock, coincide: puz.coincide, rettifiche: rett(puz.ev) },
      eventiNuovi: nuovi.length, stessoIstante: new Set(nuovi.map((e) => e.timestamp)).size === 1,
      intatti, cronologia,
    };
  });

  // 2. Conteggio 0 nella posizione principale con giacenza altrove: la principale passa dove resta giacenza
  await scenario('m07-principale', async (h) => {
    await prepara(h, { 'AST-0033': { unit: 'pz', stock: { sartoria: 3, magazzino: 2 } } });
    await h.go('automations/count');
    await conta(h, 'Sartoria', { 'AST-0033': '0' });
    await label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(400);
    await label(h, 'Registra rettifiche').click(); await h.page.waitForTimeout(600);
    const { of } = await stato(h);
    const ast = of('AST-0033');
    return { stock: ast.p.stock, location: ast.p.location, coincide: ast.coincide, rettifiche: rett(ast.ev) };
  });

  // 3. Tutto uguale: «Nessuna differenza», nessun pulsante Registra, nessun evento nuovo
  await scenario('m07-tutto-uguale', async (h) => {
    await prepara(h, { 'VIS-0098': { unit: 'pz', stock: { magazzino: 5 } } });
    const prima = await stato(h);
    await h.go('automations/count');
    await conta(h, 'Magazzino', { 'VIS-0098': '5' });
    await label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(400);
    const nessuna = await h.has('Nessuna differenza: niente da rettificare.', true);
    const registra = await h.page.getByLabel('Registra rettifiche', { exact: true }).count();
    const dopo = await stato(h);
    return { nessuna, registra, eventiNuovi: dopo.timeline.length - prima.timeline.length };
  });

  // 4. Quantità non valida e niente scritto: il riepilogo non si apre, nulla cambia
  await scenario('m07-non-valida', async (h) => {
    await prepara(h, { 'VIS-0098': { unit: 'pz', stock: { magazzino: 5 } } });
    const prima = await stato(h);
    await h.go('automations/count');
    await label(h, 'Conta Magazzino').click(); await h.page.waitForTimeout(500);
    await label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(400);
    await label(h, 'Contata VIS-0098').fill('-2');
    const avviso = await h.has('Quantità non valida', true);
    await label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(400);
    const ancoraElenco = await h.page.getByLabel('Contata VIS-0098', { exact: true }).locator('visible=true').count();
    const dopo = await stato(h);
    return { avviso, ancoraElenco, eventiNuovi: dopo.timeline.length - prima.timeline.length, stock: dopo.of('VIS-0098').p.stock };
  }, { dialogs: ['ok', 'ok'] });
})();
