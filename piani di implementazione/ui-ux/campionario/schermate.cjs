// Schermate del campionario a 375 px (ticket 03) - solo per sviluppo, NON fa parte dell'app.
// Uso: node schermate.cjs <percorso di playwright> [stile] [cartella]   (app web e serve-seed.mjs su 8765 accesi)
//   stile: attuale | babilonia | ishtar | ardesia | minimal (scritto in AsyncStorage prima di caricare; vuoto = predefinito)
//   cartella: dove salvare (predefinito ../schermate-attuali); APP=http://localhost:8082 per un'altra porta
const { chromium } = require(process.argv[2] || 'playwright');
const path = require('path');

const STILE = process.argv[3] || '';
const DIR = path.resolve(process.argv[4] || path.join(__dirname, '..', 'schermate-attuali'));
const APP = process.env.APP || 'http://localhost:8081';
const W = 375, H = 812;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);

  const extra = () => page.evaluate(() => {
    let m = 0;
    document.querySelectorAll('div').forEach((d) => {
      const s = getComputedStyle(d);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && d.offsetParent !== null && d.scrollHeight > d.clientHeight)
        m = Math.max(m, d.scrollHeight - d.clientHeight);
    });
    return m;
  });
  const shot = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: path.join(DIR, name) }); log('ok', name); };
  const tall = async (name) => {
    let h = await extra();
    if (h > 0) { await page.setViewportSize({ width: W, height: H + h }); await page.waitForTimeout(900); const h2 = await extra(); if (h2 > 0) { h += h2; await page.setViewportSize({ width: W, height: H + h }); await page.waitForTimeout(700); } }
    await page.screenshot({ path: path.join(DIR, name) });
    await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(500);
    log('ok', name, 'altezza', H + h);
  };
  const vis = (text, exact = true) => page.getByText(text, { exact }).locator('visible=true').first();
  const home = async () => { await page.goto(APP); await vis('VIS-0142').waitFor(); await page.waitForTimeout(800); };
  const tab = async (name) => { await vis(name).click(); await page.waitForTimeout(1500); };
  const step = async (label, fn) => { try { await fn(); } catch (e) { log('ERRORE', label, e.message.split('\n')[0]); } };

  await page.goto(APP);
  await page.waitForTimeout(4000);
  const seeded = await page.evaluate(async (stile) => {
    if (stile) localStorage.setItem('@syncro/stile', stile);
    const org = 'local';
    if (JSON.parse(localStorage.getItem(`inventory:v1:${org}:products`) || '[]').length) return 'già presente';
    const seed = await (await fetch('http://localhost:8765/seed.json')).json();
    for (const [key, value] of Object.entries(seed)) {
      localStorage.setItem(key.includes('{org}') ? key.replace('{org}', org) : `${key}:${org}`, JSON.stringify(value));
    }
    localStorage.setItem(`inventory:v1:${org}:alerts`, '[]');
    localStorage.setItem(`inventory:v1:${org}:deleted_product_ids`, '[]');
    return 'caricato';
  }, STILE);
  log('campionario', seeded, STILE ? `stile ${STILE}` : 'stile predefinito');

  await step('inventario', async () => { await home(); await shot('01-inventario.png'); await tall('01b-inventario-intero.png'); });
  await step('scheda', async () => { await home(); await vis('VIS-0142').click(); await vis('CAMPI STRUTTURATI').waitFor(); await shot('02-scheda.png'); await tall('02b-scheda-intera.png'); });
  await step('modifica', async () => { await vis('Modifica').click(); await page.waitForTimeout(1500); await shot('05-modifica.png'); await tall('05b-modifica-intera.png'); });
  await step('aggiungi', async () => { await home(); await tab('Aggiungi'); await shot('03-aggiungi.png'); await tall('03b-aggiungi-intera.png'); });
  await step('cronologia', async () => { await home(); await tab('Cronologia'); await shot('04-cronologia.png'); });
  await step('automazioni', async () => { await home(); await tab('Automazioni'); await shot('09-automazioni.png'); await tall('09b-automazioni-intera.png'); });
  await step('impostazioni', async () => { await home(); await tab('Impostazioni'); await shot('06-impostazioni.png'); await tall('06b-impostazioni-intera.png'); });
  await step('campi', async () => { await home(); await tab('Impostazioni'); await vis('Campi Personalizzati').click(); await page.waitForTimeout(1500); await shot('07-campi.png'); await tall('07b-campi-intera.png'); });
  await step('layout', async () => { await home(); await tab('Impostazioni'); await vis('Configura Layout Aggiungi').click(); await page.waitForTimeout(1500); await shot('08-layout-builder.png'); await tall('08b-layout-builder-intera.png'); });
  await step('venduto', async () => { await home(); await vis('VOL-0087').click(); await page.waitForTimeout(1500); await shot('02c-scheda-venduto.png'); });

  await browser.close();
  log('fine');
})().catch((e) => { console.error(e); process.exit(1); });
