// Aiuti per le prove delle funzioni sul web (fase B) - solo per sviluppo, NON fanno parte dell'app.
// Richiede l'app web (APP, predefinito http://localhost:8082) e serve-seed.mjs su 8765.
// PW = percorso di playwright (predefinito quello di @playwright/mcp installato globalmente).
const PW = process.env.PW || 'C:/Users/reda_/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright';
const { chromium } = require(PW);
const path = require('path');

const APP = process.env.APP || 'http://localhost:8082';
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'prova-funzioni');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// Un contesto nuovo per ogni scenario: storage vuoto, campionario caricato, finestre del browser accettate.
async function scenario(name, fn, { dialogs = [] } = {}) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  const seenDialogs = [];
  page.on('pageerror', (e) => errors.push(`pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  // dialogs: risposte in ordine ('ok' | 'cancel' | testo per prompt); senza risposta si accetta
  page.on('dialog', async (d) => {
    seenDialogs.push(`${d.type()}: ${d.message().replace(/\n+/g, ' | ').slice(0, 160)}`);
    const answer = dialogs.shift();
    if (answer === 'cancel') await d.dismiss();
    else if (d.type() === 'prompt') await d.accept(answer && answer !== 'ok' ? answer : '1');
    else await d.accept();
  });
  await page.goto(APP);
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const seed = await (await fetch('http://localhost:8765/seed.json')).json();
    for (const [key, value] of Object.entries(seed)) {
      localStorage.setItem(key.includes('{org}') ? key.replace('{org}', 'local') : `${key}:local`, JSON.stringify(value));
    }
    localStorage.setItem('inventory:v1:local:alerts', '[]');
    localStorage.setItem('inventory:v1:local:deleted_product_ids', '[]');
  });
  await page.goto(APP);
  await page.getByText('VIS-0142', { exact: true }).first().waitFor();
  await page.waitForTimeout(800);
  const h = helpers(page, name);
  let result;
  try {
    result = await fn(h);
  } catch (e) {
    result = { esito: 'ERRORE SCRIPT', nota: e.message.split('\n')[0] };
    await page.screenshot({ path: path.join(SHOTS, `${name}-errore.png`) }).catch(() => {});
  }
  const known = /Deleting database failed/;
  const realErrors = errors.filter((e) => !known.test(e));
  log(`[${name}]`, JSON.stringify(result), '| finestre:', JSON.stringify(seenDialogs), '| errori console:', realErrors.length ? JSON.stringify(realErrors) : 0);
  await browser.close();
  return { name, result, dialogs: seenDialogs, errors: realErrors };
}

// EDC (R1 di UX0): in Aggiungi Posizione, Categoria e i campi a scelta in una colonna da 1/2 o 1/3 sono tendine. Una
// scelta che non si vede può stare in una tendina chiusa: come l'utente, si aprono una alla volta le tendine chiuse
// (`aria-expanded="false"`) finché la scelta compare; quelle che non la contengono si richiudono. Conta solo una scelta
// che si tocca (dentro un pulsante): lo stesso testo può essere un titolo («Magazzino» è anche la sezione di Aggiungi).
async function apriTendinaCon(page, locator) {
  const toccabile = () => locator.evaluateAll((els) => els.some((e) => e.closest('[tabindex="0"], [role="button"], button, a, input')));
  if (await toccabile()) return true;
  for (const tendina of await page.$$('[aria-expanded="false"]')) {
    if (!(await tendina.isVisible())) continue;
    await tendina.click(); await page.waitForTimeout(250);
    if (await toccabile()) return true;
    await tendina.click(); await page.waitForTimeout(150);
  }
  return false;
}

function helpers(page, name) {
  const vis = (text, exact = true) => page.getByText(text, { exact }).locator('visible=true').first();
  return {
    page,
    vis,
    click: async (text, exact = true) => {
      await apriTendinaCon(page, page.getByText(text, { exact }).locator('visible=true'));
      await vis(text, exact).click(); await page.waitForTimeout(700);
    },
    longPress: async (text) => {
      const box = await vis(text).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
      await page.waitForTimeout(500);
    },
    go: async (route) => { await page.goto(`${APP}/${route}`); await page.waitForTimeout(2000); },
    tab: async (label) => { await vis(label).click(); await page.waitForTimeout(1200); },
    // stato salvato (il salvataggio ha un ritardo: si aspetta)
    store: async (key, wait = 1500) => {
      await page.waitForTimeout(wait);
      return page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
    },
    products: async (wait) => (await helpers(page).store('inventory:v1:local:products', wait)) || [],
    timeline: async (wait) => (await helpers(page).store('inventory:v1:local:timeline', wait)) || [],
    shot: async (suffix) => { await page.screenshot({ path: path.join(SHOTS, `${name}-${suffix}.png`) }); },
    has: async (text, exact = false) => (await page.getByText(text, { exact }).locator('visible=true').count()) > 0,
  };
}

module.exports = { scenario, log, APP, SHOTS, apriTendinaCon };
