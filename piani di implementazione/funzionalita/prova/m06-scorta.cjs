// M06 - Scorta minima: in Aggiungi (compare con la quantità), in Modifica per gli articoli a quantità, nella Scheda;
// avviso `low_stock` salvato con gli altri, nel filtro «Attenzione» e nella card; sparisce sopra la scorta, torna
// sotto. Si legge lo stato salvato (prodotti, avvisi, cronologia).
const { scenario } = require('./lib.cjs');
const { product } = require('./a3-util.cjs');

const P = 'inventory:v1:local:products';
const T = 'inventory:v1:local:timeline';
const A = 'inventory:v1:local:alerts';

async function rendiAQuantita(h, sku, stock, extra = {}) {
  await h.page.evaluate(([pk, tk, sku, stock, extra]) => {
    const list = JSON.parse(localStorage.getItem(pk));
    const p = list.find((x) => x.sku === sku);
    Object.assign(p, { stock, unit: 'pz', ...extra });
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    for (const [place, qty] of Object.entries(stock)) {
      if (qty > 0) tl.unshift({ id: `m06-${sku}-${place}`, productId: p.id, type: 'stock', timestamp: '2026-11-22T08:00:00.000Z', details: { movement: 'carico', qty, to: place, reason: 'iniziale', before: 0, after: qty } });
    }
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  }, [P, T, sku, stock, extra]);
  await h.go('');
}
const lowAlerts = async (h, wait = 1500) => ((await h.store(A, wait)) || []).filter((a) => a.type === 'low_stock').map((a) => `${a.message}${a.dismissed ? ' (scartato)' : ''}`);
const label = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
async function filtroAttenzione(h, sku) {
  await h.go('');
  // il filtro ha il conteggio («Attenzione 1»); «Attenzione» da solo è il badge delle card
  await h.page.getByText(/^Attenzione \d+$/).locator('visible=true').first().click();
  await h.page.waitForTimeout(800);
  return h.has(sku, true);
}

(async () => {
  // 1. Aggiungi 3 pz con scorta minima 5: il campo compare solo con la quantità; avviso, filtro Attenzione, Scheda
  await scenario('m06-aggiungi', async (h) => {
    await h.go('add');
    const primaDellaQuantita = await h.page.getByPlaceholder('Vuota = nessun avviso').count();
    await h.click('Visone');
    await h.click('Vetrina');
    await h.click('M'); // Taglia, obbligatoria nel campionario
    await h.page.getByPlaceholder('Vuota = pezzo unico').fill('3');
    await h.page.getByPlaceholder('Vuota = nessun avviso').fill('5');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1500);
    const nuovo = (await h.products())[0];
    const avvisi = await lowAlerts(h);
    const inAttenzione = await filtroAttenzione(h, nuovo.sku);
    await h.shot('attenzione');
    await h.go(`product/${nuovo.id}`);
    await h.page.getByText('Giacenza', { exact: true }).locator('visible=true').first().scrollIntoViewIfNeeded();
    await h.shot('scheda');
    const scheda = await h.has('Sotto la scorta minima', true);
    return { campoPrimaDellaQuantita: primaDellaQuantita, stock: nuovo.stock, minStock: nuovo.minStock ?? null, avvisi, inAttenzione, scheda };
  }, { dialogs: ['ok', 'ok'] });

  // 2. Scorta minima non valida: si avvisa e non si aggiunge; scorta su un pezzo unico ignorata (campo nascosto)
  await scenario('m06-aggiungi-non-valida', async (h) => {
    const prima = (await h.products(0)).length;
    await h.go('add');
    await h.click('Visone');
    await h.click('Vetrina');
    await h.click('M');
    await h.page.getByPlaceholder('Vuota = pezzo unico').fill('3');
    await h.page.getByPlaceholder('Vuota = nessun avviso').fill('-2');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1000);
    const dopoErrore = (await h.products(0)).length;
    await h.page.getByPlaceholder('Vuota = pezzo unico').fill('');
    const campoNascosto = (await h.page.getByPlaceholder('Vuota = nessun avviso').count()) === 0;
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1500);
    const nuovo = (await h.products())[0];
    return { prima, dopoErrore, dopoPezzoUnico: (await h.products(0)).length, pezzoUnico: { stock: nuovo.stock ?? null, minStock: nuovo.minStock ?? null }, campoNascosto };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 3. Modifica di un articolo a quantità (12 pz): scorta 20 → avviso e riga in Cronologia; scorta 5 → avviso via
  await scenario('m06-modifica', async (h) => {
    await rendiAQuantita(h, 'AST-0033', { sartoria: 12 });
    const p0 = await product(h, 'AST-0033', 0);
    await h.go(`product/edit/${p0.id}`);
    const campo = h.page.getByPlaceholder('Vuota = nessun avviso');
    await campo.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await h.shot('modifica');
    await campo.fill('20');
    await h.click('S'); // VAL (CAM-F4): Taglia è obbligatoria anche in Modifica e AST-0033 non l'ha
    await h.click('Salva Modifiche');
    await h.page.waitForTimeout(1200);
    const p1 = await product(h, 'AST-0033', 0);
    const avvisi20 = await lowAlerts(h);
    const inAttenzione = await filtroAttenzione(h, 'AST-0033');
    await h.go(`product/edit/${p0.id}`);
    await h.page.getByPlaceholder('Vuota = nessun avviso').fill('5');
    await h.click('Salva Modifiche');
    await h.page.waitForTimeout(1200);
    const p2 = await product(h, 'AST-0033', 0);
    const avvisi5 = await lowAlerts(h);
    const inAttenzione5 = await filtroAttenzione(h, 'AST-0033');
    const righe = ((await h.store(T, 0)) || []).filter((e) => e.productId === p0.id && e.type === 'modified').flatMap((e) => e.details.changes || []);
    return { minStock: [p1.minStock, p2.minStock], stock: p2.stock, avvisi20, inAttenzione, avvisi5, inAttenzione5, cronologia: righe };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 4. Uno scarico porta sotto la scorta: l'avviso compare; scartato, resta scartato; un carico lo fa sparire e
  //    uno scarico dopo lo riporta (non scartato)
  await scenario('m06-movimenti', async (h) => {
    await rendiAQuantita(h, 'AST-0033', { sartoria: 6 }, { minStock: 5 });
    const prima = await lowAlerts(h, 500);
    const movimento = async (tipo, posizione, qty) => {
      await h.go(''); await h.click('AST-0033'); await h.page.waitForTimeout(800);
      await label(h, 'Movimenta').click(); await h.page.waitForTimeout(500);
      await label(h, `Tipo ${tipo}`).click();
      await label(h, posizione).click();
      await h.page.locator('input[placeholder^="es. 2,5"]').locator('visible=true').first().fill(qty);
      await label(h, 'Registra movimento').click();
      await h.page.waitForTimeout(900);
    };
    await movimento('Scarico', 'Da Sartoria', '2');
    const dopoScarico = await lowAlerts(h);
    // scartato a mano nello stato salvato (l'app non ha ancora un pulsante per farlo), poi ricarica
    await h.page.evaluate((ak) => {
      const list = JSON.parse(localStorage.getItem(ak)); list.forEach((a) => { if (a.type === 'low_stock') a.dismissed = true; });
      localStorage.setItem(ak, JSON.stringify(list));
    }, A);
    await h.go('');
    const scartato = await lowAlerts(h);
    const filtroDopoScarto = await filtroAttenzione(h, 'AST-0033');
    await movimento('Carico', 'In Sartoria', '3');
    const dopoCarico = await lowAlerts(h);
    await movimento('Scarico', 'Da Sartoria', '3');
    const dopoNuovoScarico = await lowAlerts(h);
    const p = await product(h, 'AST-0033', 0);
    return { prima, dopoScarico, scartato, filtroDopoScarto, dopoCarico, dopoNuovoScarico, stock: p.stock };
  });
})();
