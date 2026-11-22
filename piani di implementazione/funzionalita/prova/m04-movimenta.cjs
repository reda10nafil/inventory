// M04 - «Movimenta» nella Scheda: i quattro movimenti, il primo movimento di un pezzo unico, i rifiuti, il
// filtro «Movimenti» della Cronologia, la giacenza salvata nel cestino e il rifiuto dell'Audit su un esaurito.
// Per ogni scenario si legge lo stato salvato: giacenza salvata = eventi `stock` rigiocati.
const { scenario } = require('./lib.cjs');
const { scan, iconAt, product } = require('./a3-util.cjs');

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
async function check(h, sku, wait = 1500) {
  const p = await product(h, sku, wait);
  const ev = (await h.timeline(0)).filter((e) => e.productId === p.id);
  return { p, ev, coincide: same(positive(p.stock), replay(ev)) };
}
async function rendiAQuantita(h, sku, stock, extra = {}) {
  await h.page.evaluate(([pk, tk, sku, stock, extra]) => {
    const list = JSON.parse(localStorage.getItem(pk));
    const p = list.find((x) => x.sku === sku);
    Object.assign(p, { stock, unit: 'pz', ...extra });
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    for (const [place, qty] of Object.entries(stock)) {
      if (qty > 0) tl.unshift({ id: `m04-${sku}-${place}`, productId: p.id, type: 'stock', timestamp: '2026-11-22T08:00:00.000Z', details: { movement: 'carico', qty, to: place, reason: 'iniziale', before: 0, after: qty } });
    }
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  }, [P, T, sku, stock, extra]);
  await h.go('');
}

const label = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
async function apri(h, sku) {
  await h.click(sku); await h.page.waitForTimeout(800);
  await label(h, 'Movimenta').click(); await h.page.waitForTimeout(500);
}
async function movimento(h, { tipo, da, a, qty, causale, nota }) {
  await label(h, `Tipo ${tipo}`).click();
  if (da) await label(h, da).click();
  if (a) await label(h, a).click();
  if (qty != null) await h.page.locator('input[placeholder^="es. 2,5"], input[placeholder^="Registrata"]').locator('visible=true').first().fill(qty);
  if (causale) await label(h, `Causale ${causale}`).click();
  if (nota) await h.page.getByPlaceholder('es. fattura 124, bancale rotto').fill(nota);
  await label(h, 'Registra movimento').click();
  await h.page.waitForTimeout(700);
}
const again = async (h) => { await label(h, 'Movimenta').click(); await h.page.waitForTimeout(400); };

(async () => {
  // 1. Articolo a quantità VIS-0098 (5 pz in Magazzino): carico, scarico, trasferimento, rettifica; filtro Movimenti
  await scenario('m04-quattro-movimenti', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 5 });
    await apri(h, 'VIS-0098');
    await movimento(h, { tipo: 'Carico', da: 'In Vetrina', qty: '3', causale: 'Acquisto', nota: 'fattura 124' });
    await again(h);
    await movimento(h, { tipo: 'Scarico', da: 'Da Magazzino', qty: '1,5', causale: 'Danno' });
    await again(h);
    await movimento(h, { tipo: 'Trasferimento', da: 'Da Vetrina', a: 'A Stand A', qty: '2' });
    await again(h);
    await movimento(h, { tipo: 'Rettifica', da: 'Posizione contata Magazzino', qty: '3' });
    const { p, ev, coincide } = await check(h, 'VIS-0098');
    const scheda = { totale: await h.has('6 pz', true), standA: await h.has('Stand A', true) };
    await h.go('timeline');
    await h.click('Movimenti');
    const righe = await h.page.getByText(/^VIS-0098 - /).locator('visible=true').count();
    const altri = await h.page.getByText(/^(VIS-0142|LIN-0021|VOL-0087) - /).locator('visible=true').count();
    return {
      stock: p.stock, location: p.location, coincide,
      eventi: ev.filter((e) => e.type === 'stock').map((e) => `${e.details.movement}/${e.details.reason || '-'}/${e.details.qty}/${e.details.from || ''}>${e.details.to || ''}${e.details.note ? '/' + e.details.note : ''}`),
      scheda, cronologiaMovimenti: righe, altriNelFiltro: altri,
    };
  });

  // 2. Pezzo unico VIS-0142 (Vetrina): carico di 2 in Magazzino → articolo a quantità con carico iniziale
  await scenario('m04-pezzo-unico', async (h) => {
    await apri(h, 'VIS-0142');
    await movimento(h, { tipo: 'Carico', da: 'In Magazzino', qty: '2' });
    const { p, ev, coincide } = await check(h, 'VIS-0142');
    await h.go('');
    const card = await h.has('3 pz', true);
    return { stock: p.stock, unit: p.unit, status: p.status, coincide, eventi: ev.filter((e) => e.type === 'stock').map((e) => `${e.details.reason || e.details.movement}:${e.details.qty}`), card };
  });

  // 2b. La Scheda di un pezzo unico dice «Pezzo unico» e offre «Movimenta»; quella di un venduto no
  await scenario('m04-scheda-pezzo-unico', async (h) => {
    await h.click('VIS-0142'); await h.page.waitForTimeout(800);
    const unico = { pezzoUnico: await h.has('Pezzo unico', true), movimenta: await h.page.getByLabel('Movimenta', { exact: true }).locator('visible=true').count() };
    await h.go('');
    await h.click('VOL-0087'); await h.page.waitForTimeout(800);
    const venduto = { movimenta: await h.page.getByLabel('Movimenta', { exact: true }).locator('visible=true').count() };
    return { unico, venduto };
  });

  // 3. Rifiuti: scarico oltre la giacenza, quantità vuota, trasferimento senza destinazione, rettifica uguale
  await scenario('m04-rifiuti', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 1 });
    await apri(h, 'VIS-0098');
    await movimento(h, { tipo: 'Scarico', da: 'Da Magazzino', qty: '2' });
    await movimento(h, { tipo: 'Carico', da: 'In Vetrina', qty: '' });
    await movimento(h, { tipo: 'Trasferimento', da: 'Da Magazzino', qty: '1' });
    await movimento(h, { tipo: 'Rettifica', da: 'Posizione contata Magazzino', qty: '1' });
    const { p, coincide } = await check(h, 'VIS-0098');
    return { stock: p.stock, coincide };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 4. Nel cestino: niente «Movimenta», la Scheda e la card del Cestino mostrano la giacenza salvata
  await scenario('m04-cestino', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 4, vetrina: 0 }, { deletedAt: '2026-11-22T09:00:00.000Z' });
    await h.click('Cestino', false);
    const card = await h.has('4 pz', true);
    await h.click('VIS-0098');
    return {
      card,
      totaleSalvato: await h.has('Totale salvato (nel cestino)', true),
      quattro: await h.has('4 pz', true),
      movimenta: await h.page.getByLabel('Movimenta', { exact: true }).locator('visible=true').count(),
    };
  });

  // 5. Audit: un articolo esaurito letto come intruso con «Sposta qui» viene rifiutato e lo si dice
  await scenario('m04-audit-esaurito', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 0 });
    await h.go('automations/audit');
    await h.click('Stand B');
    const list = await iconAt(h);
    const b = list.sort((x, y) => y.y - x.y)[0];
    await h.page.mouse.click(b.x, b.y); await h.page.waitForTimeout(700);
    await scan(h, 'VIS-0098', { wait: 1500 });
    const p = await product(h, 'VIS-0098');
    return { location: p.location, stock: p.stock };
  }, { dialogs: ['2', 'ok'] });
})();
