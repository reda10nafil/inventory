// A1 - Cronologia: filtri per tipo e per data confrontati con lo stato salvato; eventi dopo modifica ed eliminazione.
const { scenario } = require('./lib.cjs');
const { press, clickAt, dump } = require('./a1-util.cjs');

const count = async (page) => {
  const t = await page.getByText(/^\d+ eventi$/).locator('visible=true').first().innerText();
  return Number(t.split(' ')[0]);
};
// Le stesse regole della schermata (TimelineScreen.tsx:111-132)
const expected = (tl, type, date) => {
  const now = new Date();
  return tl.filter((e) => type === 'all' || e.type === type).filter((e) => {
    const d = new Date(e.timestamp);
    if (date === 'today') return d.toDateString() === now.toDateString();
    if (date === 'week') return d >= new Date(now.getTime() - 7 * 864e5);
    if (date === 'month') return d >= new Date(now.getTime() - 30 * 864e5);
    return true;
  }).length;
};
const TYPES = [['all', 'Tutti'], ['created', 'Creati'], ['moved', 'Spostati'], ['modified', 'Modificati'], ['sold', 'Venduti'], ['photo_added', 'Foto']];
const DATES = [['all', 'Tutti i Periodi'], ['today', 'Oggi'], ['week', 'Questa Settimana'], ['month', 'Questo Mese']];

(async () => {
  // 1. Filtri per tipo e per periodo
  await scenario('a1-crono-filtri', async (h) => {
    const { page } = h;
    const tl = await h.timeline(0);
    await h.tab('Cronologia');
    const out = { totaleSalvato: tl.length, diversi: [] };
    for (const [type, tLabel] of TYPES) {
      await press(page, new RegExp(`^${tLabel}$`));
      for (const [date, dLabel] of DATES) {
        await press(page, new RegExp(`^${dLabel}$`));
        const got = await count(page); const exp = expected(tl, type, date);
        if (got !== exp) out.diversi.push(`${tLabel}/${dLabel}: schermo ${got}, atteso ${exp}`);
      }
      await press(page, /^Tutti i Periodi$/);
    }
    out.verificate = TYPES.length * DATES.length;
    out.tipiSalvatiSenzaFiltro = [...new Set(tl.map((e) => e.type))].filter((t) => !TYPES.some(([v]) => v === t));
    return out;
  });

  // 2. Dopo modifica (prezzo) ed eliminazione di VIS-0142: gli eventi compaiono, il tocco apre la scheda
  await scenario('a1-crono-eventi', async (h) => {
    const { page } = h;
    await h.click('VIS-0142'); await page.waitForTimeout(800);
    await press(page, /^.?\s*Modifica$/); await page.waitForTimeout(800);
    await page.getByPlaceholder('4200', { exact: true }).fill('4300');
    await press(page, /Salva Modifiche$/);
    await h.go('');
    await h.longPress('VIS-0142');
    const bar = (await dump(page)).filter((b) => b.y > 630 && b.y < 730 && b.w < 80).sort((a, b) => a.x - b.x);
    await clickAt(page, bar[1].x, bar[1].y);
    await h.products();
    await h.tab('Cronologia');
    await press(page, /^Oggi$/);
    const out = { oggi: await count(page), voci: await page.getByText(/^VIS-0142 - /).locator('visible=true').allInnerTexts() };
    await press(page, /^Modificati$/);
    out.modificatiOggi = await count(page);
    await press(page, /^Tutti$/);
    await page.getByText(/^VIS-0142 - Spostato nel Cestino$/).first().click();
    await page.waitForTimeout(1000);
    out.toccoApre = page.url();
    await h.shot('fine');
    return out;
  }, { dialogs: ['ok', 'ok'] });
})();
