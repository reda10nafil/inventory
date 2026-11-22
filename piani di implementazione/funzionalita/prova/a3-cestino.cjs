// A3 - Un capo nel cestino (deletedAt) si può ancora leggere e vendere da Scanner e Vendita Flash?
const { scenario } = require('./lib.cjs');
const { scan, product } = require('./a3-util.cjs');
const trash = (sku) => async (h) => h.page.evaluate((s) => {
  const k = 'inventory:v1:local:products';
  const list = JSON.parse(localStorage.getItem(k));
  list.find((p) => p.sku === s).deletedAt = '2026-11-21T10:00:00Z';
  localStorage.setItem(k, JSON.stringify(list));
}, sku);
(async () => {
  await scenario('a3-cestino-vendita-flash', async (h) => {
    await trash('VIS-0098')(h);
    await h.go('automations/scan-sell');
    await h.click('Scansiona Prodotto');
    await scan(h, 'VIS-0098');
    const modale = await h.has('Conferma Vendita', true);
    if (modale) await h.click('CONFERMA VENDITA');
    const p = await product(h, 'VIS-0098');
    return { modaleVendita: modale, deletedAt: p.deletedAt, status: p.status };
  });
  await scenario('a3-cestino-scanner-manuale', async (h) => {
    await trash('VIS-0098')(h);
    await h.go('scanner');
    await h.click('Inserisci Manualmente');
    await h.page.getByPlaceholder('Es: SKU-001, 1234567890123').fill('VIS-0098');
    await h.click('Cerca');
    return { azioneRapidaAperta: await h.has('Azione rapida', true) };
  });
})();
