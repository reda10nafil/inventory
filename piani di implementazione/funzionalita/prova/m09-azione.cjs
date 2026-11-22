// M09 - Carico e Scarico dall'Azione rapida dello scanner (codice scritto a mano, come sul telefono dopo una
// lettura): stessa finestra «Movimenta» della Scheda col tipo già scelto. Per ogni scenario si legge lo stato
// salvato: giacenza salvata = eventi `stock` rigiocati.
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

async function rendiAQuantita(h, sku, stock) {
  await h.page.evaluate(([pk, tk, sku, stock]) => {
    const list = JSON.parse(localStorage.getItem(pk));
    const p = list.find((x) => x.sku === sku);
    Object.assign(p, { stock, unit: 'pz' });
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    for (const [place, qty] of Object.entries(stock)) {
      if (qty > 0) tl.unshift({ id: `m09-${sku}-${place}`, productId: p.id, type: 'stock', timestamp: '2026-11-22T08:00:00.000Z', details: { movement: 'carico', qty, to: place, reason: 'iniziale', before: 0, after: qty } });
    }
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  }, [P, T, sku, stock]);
  await h.go('');
}
async function check(h, sku) {
  const p = (await h.products(1500)).find((x) => x.sku === sku);
  const ev = (await h.timeline(0)).filter((e) => e.productId === p.id && e.type === 'stock');
  return { p, ev, coincide: same(positive(p.stock), replay(ev)) };
}
const label = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
// Scanner › Inserisci Manualmente › codice › Cerca: si apre l'Azione rapida
async function leggi(h, codice) {
  await h.go('scanner');
  await h.click('Inserisci Manualmente');
  await h.page.getByPlaceholder('Es: SKU-001, 1234567890123').fill(codice);
  await h.click('Cerca');
}
async function registra(h, { qty, causale }) {
  await h.page.locator('input[placeholder^="es. 2,5"]').locator('visible=true').first().fill(qty);
  if (causale) await label(h, `Causale ${causale}`).click();
  await label(h, 'Registra movimento').click();
  await h.page.waitForTimeout(800);
}
const riga = (e) => `${e.details.movement}/${e.details.reason || '-'}/${e.details.qty}/${e.details.from || ''}>${e.details.to || ''}`;

(async () => {
  // 1. VIS-0098 (5 pz in Magazzino): Carico 3 con causale Acquisto, poi Scarico 2; dopo ognuno si torna allo scanner
  await scenario('m09-carico-scarico', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 5 });
    await leggi(h, 'vis-0098');
    const badge = await h.has('Magazzino · 5 pz', true);
    const vendita = await h.has('Scarica 1 pz con causale vendita', true);
    await label(h, 'Carico').click(); await h.page.waitForTimeout(500);
    const finestra = await h.has('Movimenta VIS-0098', true);
    await registra(h, { qty: '3', causale: 'Acquisto' });
    const scannerDopoCarico = await h.has('Scanner QR/Barcode', true);
    await leggi(h, 'VIS-0098');
    const badgeDopo = await h.has('Magazzino · 8 pz', true);
    await label(h, 'Scarico').click(); await h.page.waitForTimeout(500);
    await registra(h, { qty: '2' });
    const scannerDopoScarico = await h.has('Scanner QR/Barcode', true);
    const { p, ev, coincide } = await check(h, 'VIS-0098');
    return { badge, vendita, finestra, scannerDopoCarico, badgeDopo, scannerDopoScarico, stock: p.stock, coincide, eventi: ev.map(riga) };
  }, { dialogs: ['ok', 'ok'] });

  // 2. Scarico oltre la giacenza (rifiutato, la finestra resta), Annulla, poi Carico: il tipo è quello chiesto
  await scenario('m09-annulla-e-tipo', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 5 });
    await leggi(h, 'VIS-0098');
    await label(h, 'Scarico').click(); await h.page.waitForTimeout(500);
    await registra(h, { qty: '9' });
    const restaAperta = await h.has('Movimenta VIS-0098', true);
    await h.click('Annulla');
    const chiusa = !(await h.has('Movimenta VIS-0098', true));
    await label(h, 'Carico').click(); await h.page.waitForTimeout(500);
    await registra(h, { qty: '1' });
    const { p, ev, coincide } = await check(h, 'VIS-0098');
    return { restaAperta, chiusa, stock: p.stock, coincide, eventi: ev.map(riga) };
  }, { dialogs: ['ok', 'ok'] });

  // 3. Pezzo unico VIS-0142 (Vetrina): Carico 2 in Magazzino → articolo a quantità con il carico iniziale
  await scenario('m09-pezzo-unico', async (h) => {
    await leggi(h, 'VIS-0142');
    await label(h, 'Carico').click(); await h.page.waitForTimeout(500);
    await label(h, 'In Magazzino').click();
    await registra(h, { qty: '2' });
    const { p, ev, coincide } = await check(h, 'VIS-0142');
    return { stock: p.stock, unit: p.unit, status: p.status, coincide, eventi: ev.map(riga) };
  }, { dialogs: ['ok'] });

  // 4. Venduto (VOL-0087): niente Carico né Scarico; il pezzo unico disponibile li ha
  await scenario('m09-non-disponibile', async (h) => {
    await leggi(h, 'VOL-0087');
    const venduto = { carico: await h.page.getByLabel('Carico', { exact: true }).locator('visible=true').count(), scarico: await h.page.getByLabel('Scarico', { exact: true }).locator('visible=true').count() };
    await leggi(h, 'LIN-0021');
    const disponibile = { carico: await h.page.getByLabel('Carico', { exact: true }).locator('visible=true').count(), badge: await h.has('Stand B', true), vendita: await h.has('Segna come venduto e archivia', true) };
    return { venduto, disponibile };
  });
})();
