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
  // M03: articoli a quantità (card, esaurito, Scheda, Modifica in sola lettura, Magazzino in Aggiungi, Cronologia)
  m03: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const tk = 'inventory:v1:local:timeline';
      const list = JSON.parse(localStorage.getItem(pk));
      const tl = JSON.parse(localStorage.getItem(tk) || '[]');
      const at = '2026-11-22T08:00:00.000Z';
      const ev = (p, details) => tl.unshift({ id: `m03-${p.id}-${tl.length}`, productId: p.id, type: 'stock', timestamp: at, details });
      const vis = list.find((p) => p.sku === 'VIS-0098'); // Magazzino
      Object.assign(vis, { unit: 'pz', stock: { magazzino: 7, vetrina: 3, stand_a: 2 } });
      ev(vis, { movement: 'carico', qty: 12, to: 'magazzino', reason: 'iniziale', before: 0, after: 12 });
      ev(vis, { movement: 'trasferimento', qty: 3, from: 'magazzino', to: 'vetrina', before: 12, after: 12 });
      ev(vis, { movement: 'trasferimento', qty: 2, from: 'magazzino', to: 'stand_a', before: 12, after: 12 });
      const puz = list.find((p) => p.sku === 'PUZ-0012'); // Stand C, esaurito
      Object.assign(puz, { unit: 'kg', stock: { stand_c: 0 } });
      ev(puz, { movement: 'carico', qty: 2.5, to: 'stand_c', reason: 'iniziale', before: 0, after: 2.5 });
      ev(puz, { movement: 'scarico', qty: 2.5, from: 'stand_c', reason: 'vendita', finalPrice: 450, before: 2.5, after: 0 });
      localStorage.setItem(pk, JSON.stringify(list));
      localStorage.setItem(tk, JSON.stringify(tl));
    },
    schermate: [
      ['card', async (page) => { await page.goto(APP); await page.waitForTimeout(1500); await page.getByText('VIS-0098', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['scheda', async (page) => { await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800); await page.getByText('Giacenza', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['cronologia-scheda', async (page) => { await page.getByText('Cronologia dettagliata', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['esaurito', async (page) => { await page.goto(`${APP}/product/cmp-6`); await page.waitForTimeout(1800); await page.getByText('Giacenza', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['modifica', async (page) => { await page.goto(`${APP}/product/edit/cmp-5`); await page.waitForTimeout(1800); await page.getByText('Posizione e giacenza', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); }],
      ['aggiungi', async (page) => {
        await page.goto(`${APP}/add`); await page.waitForTimeout(1800);
        await page.getByPlaceholder('Vuota = pezzo unico').fill('12,5');
        await page.getByLabel('Unità kg').click(); await page.waitForTimeout(300);
        await page.getByText('Unità', { exact: true }).first().scrollIntoViewIfNeeded();
      }],
      ['cronologia', async (page) => { await page.goto(`${APP}/timeline`); await page.waitForTimeout(1800); }],
    ],
  },
  m04: {
    // Stesso stato di m03, più LIN-0021 articolo a quantità nel cestino
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      Object.assign(list.find((p) => p.sku === 'LIN-0021'), { unit: 'm', stock: { stand_b: 4.5 }, deletedAt: '2026-11-22T09:00:00.000Z' });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['scheda', async (page) => { await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800); await page.getByLabel('Movimenta', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['finestra', async (page) => { await page.getByLabel('Movimenta', { exact: true }).first().click(); await page.waitForTimeout(600); }],
      ['trasferimento', async (page) => {
        await page.getByLabel('Tipo Trasferimento', { exact: true }).click();
        await page.getByLabel('Da Magazzino', { exact: true }).click();
        await page.getByLabel('A Vetrina', { exact: true }).click();
        await page.locator('input[placeholder="es. 2,5"]').fill('2');
      }],
      ['rettifica', async (page) => { await page.getByLabel('Tipo Rettifica', { exact: true }).click(); await page.getByLabel('Causale Conta', { exact: true }).click(); }],
      ['cronologia-movimenti', async (page) => { await page.goto(`${APP}/timeline`); await page.waitForTimeout(1800); await page.getByText('Movimenti', { exact: true }).first().click(); }],
      ['pezzo-unico', async (page) => { await page.goto(`${APP}/product/cmp-1`); await page.waitForTimeout(1800); await page.getByLabel('Movimenta', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['cestino', async (page) => { await page.goto(APP); await page.waitForTimeout(1500); await page.getByText('Cestino').locator('visible=true').first().click(); await page.waitForTimeout(800); }],
    ],
  },
  // M06: scorta minima in Aggiungi e Modifica, Scheda sotto scorta, filtro Attenzione (AST-0033 = cmp-4)
  m06: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      Object.assign(list.find((p) => p.sku === 'AST-0033'), { unit: 'pz', stock: { sartoria: 2 }, minStock: 5 });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['aggiungi', async (page) => {
        await page.goto(`${APP}/add`); await page.waitForTimeout(1800);
        await page.getByPlaceholder('Vuota = pezzo unico').fill('3');
        await page.getByPlaceholder('Vuota = nessun avviso').fill('5');
        await page.getByPlaceholder('Vuota = nessun avviso').evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['modifica', async (page) => {
        await page.goto(`${APP}/product/edit/cmp-4`); await page.waitForTimeout(1800);
        await page.getByPlaceholder('Vuota = nessun avviso').evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['scheda', async (page) => {
        await page.goto(`${APP}/product/cmp-4`); await page.waitForTimeout(1800);
        await page.getByText('Sotto la scorta minima', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['attenzione', async (page) => {
        await page.goto(APP); await page.waitForTimeout(1500);
        await page.getByText(/^Attenzione \d+$/).first().click(); await page.waitForTimeout(800);
      }],
    ],
  },
  // M08: le tre voci di export e l'import in Impostazioni › Dati e backup
  m08: {
    prepara: () => {},
    schermate: [
      ['dati-e-backup', async (page) => {
        await page.goto(`${APP}/settings`); await page.waitForTimeout(1800);
        await page.getByText('Esporta giacenze', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['import', async (page) => { await page.getByText('Importa prodotti CSV', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); }],
    ],
  },
  // M07: Conta da Automazioni (scelta della posizione, elenco con differenze, riepilogo, esito)
  m07: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      const set = (sku, extra) => Object.assign(list.find((p) => p.sku === sku), extra);
      set('VIS-0098', { unit: 'pz', stock: { magazzino: 5 } });
      set('PUZ-0012', { unit: 'kg', stock: { magazzino: 0 }, location: 'magazzino' });
      set('AST-0033', { unit: 'pz', stock: { sartoria: 3, magazzino: 2 } });
      set('LIN-0021', { unit: 'm', stock: { magazzino: 4 }, location: 'magazzino' });
      set('VIS-0142', { location: 'magazzino' });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['automazioni', async (page) => {
        await page.goto(`${APP}/automations`); await page.waitForTimeout(1800);
        await page.getByText('Conta Magazzino', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['posizioni', async (page) => { await page.goto(`${APP}/automations/count`); await page.waitForTimeout(1800); }],
      ['elenco', async (page) => {
        await page.getByLabel('Conta Magazzino', { exact: true }).click(); await page.waitForTimeout(500);
        await page.getByLabel('Contata VIS-0098', { exact: true }).fill('3');
        await page.getByLabel('Contata PUZ-0012', { exact: true }).fill('1,5');
        await page.getByLabel('Contata AST-0033', { exact: true }).fill('2');
      }],
      ['riepilogo', async (page) => { await page.getByLabel('Riepilogo della conta', { exact: true }).click(); }],
      ['esito', async (page) => { await page.getByLabel('Registra rettifiche', { exact: true }).click(); }],
    ],
  },
  // M09: Carico e Scarico nell'Azione rapida (VIS-0098 = cmp-5 a quantità, VIS-0142 = cmp-1 pezzo unico)
  m09: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      Object.assign(list.find((p) => p.sku === 'VIS-0098'), { unit: 'pz', stock: { magazzino: 5 } });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['azione', async (page) => {
        await page.goto(`${APP}/scanner-action?type=product&id=cmp-5`); await page.waitForTimeout(1800);
        await page.getByLabel('Carico', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['carico', async (page) => { await page.getByLabel('Carico', { exact: true }).first().click(); await page.waitForTimeout(600); }],
      ['scarico', async (page) => {
        await page.getByText('Annulla', { exact: true }).first().click(); await page.waitForTimeout(400);
        await page.getByLabel('Scarico', { exact: true }).first().click(); await page.waitForTimeout(600);
        await page.locator('input[placeholder="es. 2,5"]').fill('2');
      }],
      ['pezzo-unico', async (page) => { await page.goto(`${APP}/scanner-action?type=product&id=cmp-1`); await page.waitForTimeout(1800); }],
    ],
  },
};
// m04 parte dallo stato di m03 (le funzioni passano al browser una per volta)
FETTE.m04.prima = FETTE.m03.prepara;

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
    if (fetta.prima) await page.evaluate(fetta.prima);
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
