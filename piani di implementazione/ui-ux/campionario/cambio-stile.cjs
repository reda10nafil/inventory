// Prova del cambio di stile da Impostazioni › Aspetto (lavori L3 e L9) - solo per sviluppo, NON fa parte dell'app.
// Uso: node cambio-stile.cjs <percorso di playwright> [stile di partenza] [stile da scegliere]
//   (app web e serve-seed.mjs su 8765 accesi; APP=http://localhost:8082 per un'altra porta)
// Controlla: il nuovo stile si applica restando sulla schermata aperta, un testo scritto in Aggiungi non si perde,
// la scelta resta dopo il riavvio della pagina.
const { chromium } = require(process.argv[2] || 'playwright');

const APP = process.env.APP || 'http://localhost:8081';
const DA = process.argv[3] || 'attuale';
const A = process.argv[4] || 'babilonia';
const NOMI = { attuale: 'Attuale rifinito', babilonia: 'Babilonia Vetro', ishtar: 'Ishtar Lab', ardesia: 'Ardesia e rame', minimal: 'Minimal' };
let falliti = 0;
const esito = (ok, cosa, dettaglio = '') => { if (!ok) falliti++; console.log(ok ? 'ok   ' : 'NO   ', cosa, dettaglio); };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
  page.setDefaultTimeout(15000);
  const vis = (text, exact = true) => page.getByText(text, { exact }).locator('visible=true').first();
  const stile = () => page.evaluate(() => localStorage.getItem('@syncro/stile'));
  const fondo = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.goto(APP);
  await page.waitForTimeout(4000);
  await page.evaluate(async (da) => {
    localStorage.setItem('@syncro/stile', da);
    const seed = await (await fetch('http://localhost:8765/seed.json')).json();
    for (const [key, value] of Object.entries(seed)) {
      localStorage.setItem(key.includes('{org}') ? key.replace('{org}', 'local') : `${key}:local`, JSON.stringify(value));
    }
    localStorage.setItem('inventory:v1:local:alerts', '[]');
    localStorage.setItem('inventory:v1:local:deleted_product_ids', '[]');
  }, DA);
  await page.goto(APP);
  await vis('VIS-0142').waitFor();
  const fondoDa = await fondo();

  // un testo scritto in Aggiungi, lasciato a metà
  await vis('Aggiungi').click();
  await page.waitForTimeout(1500);
  const sku = page.locator('input:visible').first();
  await sku.fill('PROVA-STILE-1');

  // Impostazioni › Aspetto, scelta del nuovo stile
  await vis('Impostazioni').click();
  await page.waitForTimeout(1000);
  await vis(`Stile: ${NOMI[DA]}`).click();
  await page.waitForTimeout(2000);
  const indirizzo = page.url();
  await vis(NOMI[A]).click();
  await page.waitForTimeout(2500);
  esito((await stile()) === A, 'scelta salvata', await stile());
  esito((await fondo()) !== fondoDa, 'stile applicato subito', `${fondoDa} -> ${await fondo()}`);
  esito(page.url() === indirizzo && (await vis('Lo stile cambia colori', false).isVisible()), 'resta sulla schermata Aspetto', page.url());

  // si torna indietro: il testo in Aggiungi c'è ancora
  await page.goBack();
  await page.waitForTimeout(1000);
  await vis('Aggiungi').click();
  await page.waitForTimeout(1500);
  esito((await page.locator('input:visible').first().inputValue()) === 'PROVA-STILE-1', 'testo in Aggiungi non perso');

  // riavvio della pagina
  await page.goto(APP);
  esito(await vis('VIS-0142').waitFor().then(() => true, () => false), 'dopo il riavvio i prodotti ci sono');
  await vis('Impostazioni').click();
  await page.waitForTimeout(1000);
  esito(await vis(`Stile: ${NOMI[A]}`).isVisible(), 'dopo il riavvio resta lo stile scelto', await stile());

  await browser.close();
  console.log(falliti ? `${falliti} prove fallite` : 'tutte le prove riuscite');
  process.exit(falliti ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
