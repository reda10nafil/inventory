// Parti nuove delle fette M nei 5 stili (una schermata per riga, uno stile per colonna con foglio.py).
// Uso: FETTA=m01 OUT=<cartella> node stili-fette.cjs   (app su :8082, campionario su :8765)
// Stampa gli errori di console per stile; le schermate sono <OUT>/<stile>-<n>-<nome>.png.
const PW = process.env.PW || 'C:/Users/reda_/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright';
const { chromium } = require(PW);
const path = require('path');
const APP = process.env.APP || 'http://localhost:8082';
const OUT = process.env.OUT || require('os').tmpdir();
const STILI = ['attuale', 'babilonia', 'ishtar', 'ardesia', 'minimal'];

// Ogni fetta: preparazione dello stato salvato (nel browser, prima di aprire l'app) e schermate da fare.
const FETTE = {
  m01: {
    prepara: () => {
      const cats = [['visone', 'Visone'], ['volpe', 'Volpe'], ['altro', 'Altro'], ['viti', 'Viti e bulloni'], ['detersivi', 'Detersivi']];
      localStorage.setItem('furinventory_categories:local', JSON.stringify(cats.map(([id, label]) => ({ id, label }))));
      const list = JSON.parse(localStorage.getItem('inventory:v1:local:products'));
      list[2] = { ...list[2], furType: 'viti' }; // LIN-0021 → Viti e bulloni
      localStorage.setItem('inventory:v1:local:products', JSON.stringify(list));
    },
    schermate: [
      ['categorie', async (page) => { await page.goto(`${APP}/settings/categories`); await page.waitForTimeout(1800); }],
      ['rinomina', async (page) => { await page.getByText('Viti e bulloni', { exact: true }).first().click(); await page.waitForTimeout(600); }],
      ['aggiungi', async (page) => {
        await page.goto(`${APP}/add`); await page.waitForTimeout(1800);
        await page.getByText('Detersivi', { exact: true }).first().click(); await page.waitForTimeout(300);
        await page.getByText('Categoria *', { exact: true }).first().scrollIntoViewIfNeeded();
      }],
      ['card', async (page) => { await page.goto(APP); await page.getByText('LIN-0021', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['impostazioni', async (page) => { await page.goto(`${APP}/settings`); await page.waitForTimeout(1500); await page.getByText('Categorie', { exact: true }).first().scrollIntoViewIfNeeded(); }],
    ],
  },
};

(async () => {
  const fetta = FETTE[process.env.FETTA];
  if (!fetta) throw new Error(`FETTA sconosciuta: ${process.env.FETTA} (note: ${Object.keys(FETTE).join(', ')})`);
  const browser = await chromium.launch({ headless: true });
  for (const stile of STILI) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/Deleting database failed/.test(m.text())) errors.push(m.text().slice(0, 120)); });
    page.on('pageerror', (e) => errors.push(`pageerror ${e.message.slice(0, 120)}`));
    page.on('dialog', (d) => d.accept());
    await page.goto(APP); await page.waitForTimeout(2500);
    await page.evaluate(async (stile) => {
      localStorage.setItem('@syncro/stile', stile);
      const seed = await (await fetch('http://localhost:8765/seed.json')).json();
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k.includes('{org}') ? k.replace('{org}', 'local') : `${k}:local`, JSON.stringify(v));
      localStorage.setItem('inventory:v1:local:alerts', '[]');
      localStorage.setItem('inventory:v1:local:deleted_product_ids', '[]');
    }, stile);
    await page.evaluate(fetta.prepara);
    await page.goto(APP); await page.getByText('VIS-0142', { exact: true }).first().waitFor();
    let n = 1;
    for (const [nome, fai] of fetta.schermate) {
      await fai(page);
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT, `${stile}-${n}-${nome}.png`) });
      n += 1;
    }
    console.log(stile, 'errori console:', errors.length ? errors : 0);
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
