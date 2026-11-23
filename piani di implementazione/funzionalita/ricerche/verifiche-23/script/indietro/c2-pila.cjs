// C2 bis: «Vedi prodotti» toglie l'Azione rapida o mette una seconda barra delle schede sopra? Conta le copie montate.
const { open, log, MI } = require('./base.cjs');
const { scan } = require(__dirname + '/../../../../prova/a3-util.cjs');
(async () => {
  const { browser, page } = await open();
  const click = async (t) => { await page.getByText(t, { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(1000); };
  const count = () => page.evaluate(() => ({
    centroAutomazioni: [...document.querySelectorAll('div')].filter((e) => e.childElementCount === 0 && e.textContent === 'Centro Automazioni').length,
    categoriaMontata: [...document.querySelectorAll('div')].filter((e) => e.childElementCount === 0 && e.textContent === 'CATEGORIA').length,
    scannerMontato: [...document.querySelectorAll('div')].filter((e) => e.childElementCount === 0 && e.textContent === 'Scanner QR/Barcode').length,
  }));
  await click('Automazioni');
  const pos = await page.evaluate((ch) => { const e = [...document.querySelectorAll('div')].find((x) => x.childElementCount === 0 && x.textContent === ch && x.offsetParent); const r = e.getBoundingClientRect(); return { x: r.x + 10, y: r.y + 10 }; }, String.fromCodePoint(MI['qr-code-scanner']));
  await page.mouse.click(pos.x, pos.y); await page.waitForTimeout(1200);
  await scan({ page }, 'pellicce', { wait: 1500 });
  const prima = await count();
  await click('VEDI PRODOTTI');
  const dopo = await count();
  log(JSON.stringify({ prima, dopo, url: page.url() }));
  await browser.close();
})();
