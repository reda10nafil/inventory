// A3 - Vendita Flash (ScanSell): prezzo finale, stato sold, soldAt, evento «sold» (lettura simulata).
const { scenario } = require('./lib.cjs');
const { scan, product, timelineIds, newEvents } = require('./a3-util.cjs');
(async () => {
  // 1. VIS-0098 (3800) venduto a 3500; poi VOL-0087 già venduto: avviso, nessun evento
  await scenario('a3-vendita-flash', async (h) => {
    await h.go('automations/scan-sell');
    await h.click('Scansiona Prodotto');
    const before = await timelineIds(h);
    const used = await scan(h, 'VIS-0098');
    const prezzoProposto = await h.page.getByPlaceholder('0.00').locator('visible=true').first().inputValue();
    await h.page.getByPlaceholder('0.00').locator('visible=true').first().fill('3500');
    await h.click('CONFERMA VENDITA');
    const p = await product(h, 'VIS-0098');
    const ev1 = await newEvents(h, before, 0);
    await h.page.waitForTimeout(600); // il lettore si riapre da solo
    const before2 = await timelineIds(h);
    await scan(h, 'VOL-0087');
    const ev2 = await newEvents(h, before2);
    const schermo = await h.page.evaluate(() => document.body.innerText.match(/Venduto:.*/)?.[0]);
    return { lettore: used, prezzoProposto, status: p.status, soldAt: !!p.soldAt, sellPrice: p.sellPrice, eventi: ev1, eventiGiaVenduto: ev2, schermo };
  });

  // 2. Prezzo cancellato: si vende senza prezzo finale
  await scenario('a3-vendita-flash-senza-prezzo', async (h) => {
    await h.go('automations/scan-sell');
    await h.click('Scansiona Prodotto');
    await scan(h, 'PUZ-0012');
    await h.page.getByPlaceholder('0.00').locator('visible=true').first().fill('');
    await h.click('CONFERMA VENDITA');
    const p = await product(h, 'PUZ-0012');
    const schermo = await h.page.evaluate(() => document.body.innerText.match(/Venduto:.*/)?.[0]);
    return { status: p.status, sellPrice: p.sellPrice, schermo };
  });
})();
