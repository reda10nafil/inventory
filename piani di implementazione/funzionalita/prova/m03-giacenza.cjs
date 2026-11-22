// M03 - Articoli a quantità: Aggiungi con quantità, spostamento, vendita, automazione nello stesso istante,
// Modifica in sola lettura, posizione con giacenza nel cestino, esaurito. Per ogni scenario si legge lo stato
// salvato e si controlla che la giacenza salvata sia quella che si ottiene rigiocando gli eventi `stock`.
const { scenario } = require('./lib.cjs');
const { scan, product, timelineIds, newEvents } = require('./a3-util.cjs');

const P = 'inventory:v1:local:products';
const T = 'inventory:v1:local:timeline';
const AUTO = '@furinventory_custom_automations:local';
const LOC = 'furinventory_locations:local';

/** Giacenza dai soli eventi `stock`, in millesimi come `replayStock` (utils/stock.ts). */
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

/** Stato salvato del prodotto e controllo giacenza = eventi. */
async function check(h, sku, wait = 1500) {
  const p = await product(h, sku, wait);
  const ev = (await h.timeline(0)).filter((e) => e.productId === p.id);
  const rigiocata = replay(ev);
  return { p, ev, rigiocata, coincide: same(positive(p.stock), rigiocata) };
}

/** Rende VIS-0098 (cmp-5, Magazzino) articolo a quantità con il suo carico iniziale, poi ricarica. */
async function rendiAQuantita(h, sku, stock, extra = {}) {
  await h.page.evaluate(([pk, tk, sku, stock, extra]) => {
    const list = JSON.parse(localStorage.getItem(pk));
    const p = list.find((x) => x.sku === sku);
    Object.assign(p, { stock, unit: 'pz', ...extra });
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    for (const [place, qty] of Object.entries(stock)) {
      if (qty > 0) tl.unshift({ id: `m03-${sku}-${place}`, productId: p.id, type: 'stock', timestamp: '2026-11-22T08:00:00.000Z', details: { movement: 'carico', qty, to: place, reason: 'iniziale', before: 0, after: qty } });
    }
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  }, [P, T, sku, stock, extra]);
  await h.go('');
}

const submit = (h) => h.click("Aggiungi all'Inventario");

(async () => {
  // 1. Aggiungi con quantità 12,5 kg in Vetrina, poi ricarica la pagina
  await scenario('m03-aggiungi-quantita', async (h) => {
    await h.go('add');
    await h.click('Visone');
    await h.click('Vetrina');
    await h.click('M'); // Taglia, obbligatoria nel campionario
    await h.page.getByPlaceholder('Vuota = pezzo unico').fill('12,5');
    await h.page.getByLabel('Unità kg').click();
    await submit(h);
    await h.page.waitForTimeout(1500);
    const nuovo = (await h.products())[0];
    const a = await check(h, nuovo.sku, 0);
    await h.go('');
    const dopo = await check(h, nuovo.sku);
    const card = await h.has('12,5 kg', true);
    await h.go(`product/${nuovo.id}`);
    await h.shot('scheda');
    const scheda = { giacenza: await h.has('Giacenza', true), totale: await h.has('12,5 kg', true), evento: await h.has('Giacenza iniziale: +12,5 kg in Vetrina', true) };
    // il modulo si svuota anche nella quantità
    await h.go('add');
    const qtyDopo = await h.page.getByPlaceholder('Vuota = pezzo unico').inputValue();
    return {
      stock: a.p.stock, unit: a.p.unit, status: a.p.status, location: a.p.location, eventi: a.ev.map((e) => `${e.type}${e.details.reason ? ':' + e.details.reason : ''}`),
      coincide: a.coincide, dopoRicarica: { stock: dopo.p.stock, coincide: dopo.coincide }, cardMostra: card, scheda, qtyDopo,
    };
  }, { dialogs: ['ok', 'ok'] });

  // 2. Quantità non valida: si avvisa e non si aggiunge nulla; vuota = pezzo unico come prima
  await scenario('m03-aggiungi-non-valida', async (h) => {
    await h.go('add');
    const prima = (await h.products(0)).length;
    await h.click('Visone');
    await h.click('Vetrina');
    await h.click('M');
    await h.page.getByPlaceholder('Vuota = pezzo unico').fill('abc');
    await submit(h);
    const dopoErrore = (await h.products()).length;
    await h.page.getByPlaceholder('Vuota = pezzo unico').fill('');
    await submit(h);
    await h.page.waitForTimeout(1500);
    const list = await h.products();
    return { prima, dopoErrore, dopoVuota: list.length, nuovoHaStock: 'stock' in list[0], unit: list[0].unit ?? null };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 3. Spostamento rapido di un articolo a quantità: trasferisce tutta la giacenza della posizione principale
  await scenario('m03-sposta', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 5 });
    await h.go('automations/batch-move');
    await h.click('Vetrina');
    await h.click('Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'VIS-0098');
    const nuovi = await newEvents(h, before, 0);
    const a = await check(h, 'VIS-0098', 0);
    return { stock: a.p.stock, location: a.p.location, eventi: nuovi.map((e) => `${e.type}:${e.details.movement}:${e.details.qty}`), coincide: a.coincide };
  });

  // 4. Vendita flash: scarico di 1 con il prezzo nell'evento; resta disponibile, il listino non cambia
  await scenario('m03-vendita-flash', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 5 });
    const listino = (await product(h, 'VIS-0098', 0)).sellPrice;
    await h.go('automations/scan-sell');
    await h.click('Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'VIS-0098');
    await h.page.getByPlaceholder('0.00').locator('visible=true').first().fill('99');
    await h.click('CONFERMA VENDITA');
    const nuovi = await newEvents(h, before, 0);
    const a = await check(h, 'VIS-0098', 0);
    return { stock: a.p.stock, status: a.p.status, sellPrice: a.p.sellPrice, listino, eventi: nuovi.map((e) => `${e.type}:${e.details.movement}:${e.details.reason}:${e.details.finalPrice}`), coincide: a.coincide };
  });

  // 5. Stesso istante: automazione scansione → tag → sposta in Vetrina → vendi, tutto nella stessa lettura
  await scenario('m03-stesso-istante', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 5 });
    const st = (id, type, config = {}, label = type) => ({ id, order: 0, type, config, label });
    await h.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [AUTO, [{
      id: 'auto_m03', name: 'auto_m03', icon: 'flash-on', color: '#3B82F6', description: '', qrValue: 'AUTO:auto_m03', createdAt: '2026-11-22T00:00:00Z', usageCount: 0,
      steps: [st('s1', 'scan_product', {}, 'Scansiona Prodotto'), st('s2', 'add_tag', { tag: 'Controllato' }, 'Tag Controllato'),
        st('s3', 'move_to', { locationId: 'vetrina', locationName: 'Vetrina' }, 'Sposta in Vetrina'), st('s4', 'mark_sold', { pricePrompt: false }, 'Vendi')],
    }]]);
    await h.go('automations/custom-runner/auto_m03');
    await h.page.getByText('Scansiona Prodotto', { exact: true }).locator('visible=true').last().click();
    await h.page.waitForTimeout(700);
    const before = await timelineIds(h);
    await scan(h, 'VIS-0098', { wait: 1500 });
    const nuovi = await newEvents(h, before, 0);
    const a = await check(h, 'VIS-0098', 0);
    return { note: a.p.technicalNotes, stock: a.p.stock, location: a.p.location, status: a.p.status, eventi: nuovi.map((e) => `${e.type}${e.details.movement ? ':' + e.details.movement + ':' + e.details.qty : ''}`), coincide: a.coincide };
  });

  // 6. Modifica di un articolo a quantità: posizione e giacenza in sola lettura, il salvataggio non le tocca
  await scenario('m03-modifica', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 3, stand_a: 2 });
    const p0 = await product(h, 'VIS-0098', 0);
    await h.go(`product/edit/${p0.id}`);
    const solaLettura = await h.has('Posizione e giacenza', true);
    const nota = await h.has('cambiano solo con i movimenti');
    await h.shot('modifica');
    await h.page.getByPlaceholder('4200').fill('4100');
    await h.click('Salva Modifiche');
    const a = await check(h, 'VIS-0098');
    const modificato = a.ev.filter((e) => e.type === 'modified').flatMap((e) => e.details.changes || []);
    return { solaLettura, nota, stock: a.p.stock, location: a.p.location, sellPrice: a.p.sellPrice, modifiche: modificato, coincide: a.coincide };
  }, { dialogs: ['ok', 'ok'] });

  // 7. Una posizione con giacenza solo nel cestino non si elimina
  await scenario('m03-posizione-cestino', async (h) => {
    // LIN-0021 (Stand B, unico prodotto di Stand B) diventa articolo a quantità con 1 pz in Stand B, poi nel cestino
    await rendiAQuantita(h, 'LIN-0021', { vetrina: 2, stand_b: 1 }, { location: 'vetrina', deletedAt: '2026-11-22T09:00:00.000Z' });
    await h.go('settings/locations');
    await h.page.locator('[tabindex="0"]').filter({ hasText: 'Stand BID:' }).first().locator('[tabindex="0"]').last().click();
    await h.page.waitForTimeout(800);
    const salvate = (await h.store(LOC, 500)) || null;
    return { standBRestata: salvate === null ? 'nessuna scrittura (non eliminata)' : salvate.some((l) => l.id === 'stand_b') };
  }, { dialogs: ['ok'] });

  // 8. Esaurito: etichetta nella card e nella Scheda, vendita rifiutata con il motivo
  await scenario('m03-esaurito', async (h) => {
    await rendiAQuantita(h, 'VIS-0098', { magazzino: 0 });
    const card = await h.has('Esaurito', true);
    await h.shot('inventario');
    await h.go('automations/scan-sell');
    await h.click('Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'VIS-0098');
    const nuovi = await newEvents(h, before, 0);
    const p = await product(h, 'VIS-0098', 0);
    await h.go(`product/${p.id}`);
    const scheda = await h.has('Esaurito', true);
    return { card, scheda, eventiNuovi: nuovi.length, stock: p.stock, status: p.status };
  }, { dialogs: ['ok'] });
})();
