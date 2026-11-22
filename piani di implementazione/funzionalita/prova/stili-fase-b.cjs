// Parti nuove della fase B nei 5 stili: card e Scheda senza foto, Cestino con «Svuota», voce «Modelli di settore».
// Uso: OUT=<cartella> node stili-fase-b.cjs  (app su :8082, campionario su :8765)
const PW = process.env.PW || 'C:/Users/reda_/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright';
const { chromium } = require(PW);
const path = require('path');
const APP = process.env.APP || 'http://localhost:8082';
const OUT = process.env.OUT || require('os').tmpdir();
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const stile of ['attuale', 'babilonia', 'ishtar', 'ardesia', 'minimal']) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/Deleting database failed/.test(m.text())) errors.push(m.text().slice(0, 120)); });
    await page.goto(APP); await page.waitForTimeout(2500);
    await page.evaluate(async (stile) => {
      localStorage.setItem('@syncro/stile', stile);
      const seed = await (await fetch('http://localhost:8765/seed.json')).json();
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k.includes('{org}') ? k.replace('{org}', 'local') : `${k}:local`, JSON.stringify(v));
      const p = seed['inventory:v1:{org}:products'] || JSON.parse(localStorage.getItem('inventory:v1:local:products'));
      const list = JSON.parse(localStorage.getItem('inventory:v1:local:products'));
      list[0] = { ...list[0], images: [] }; // VIS-0142 senza foto
      list[1] = { ...list[1], deletedAt: '2026-11-21T10:00:00Z' }; // VOL-0087 nel cestino
      localStorage.setItem('inventory:v1:local:products', JSON.stringify(list));
      localStorage.setItem('inventory:v1:local:alerts', '[]');
      localStorage.setItem('inventory:v1:local:deleted_product_ids', '[]');
    }, stile);
    const shot = async (name) => { await page.waitForTimeout(900); await page.screenshot({ path: path.join(OUT, `${stile}-${name}.png`) }); };
    await page.goto(APP); await page.getByText('VIS-0142', { exact: true }).first().waitFor(); await shot('1-card');
    await page.getByText('VIS-0142', { exact: true }).first().click(); await page.waitForTimeout(1200); await shot('2-scheda');
    await page.goto(`${APP}/settings/trash`); await page.waitForTimeout(1800); await shot('3-cestino');
    await page.goto(`${APP}/settings`); await page.waitForTimeout(1500);
    await page.getByText('Modelli di settore', { exact: true }).first().scrollIntoViewIfNeeded(); await shot('4-impostazioni');
    console.log(stile, 'errori console:', errors.length ? errors : 0);
    await ctx.close();
  }
  await browser.close();
})();
