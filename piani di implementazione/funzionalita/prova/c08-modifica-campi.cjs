// C08 (D03): in Modifica un campo personalizzato vuoto si compila e si salva (PUZ-0012 non ha campi compilati).
const { scenario } = require('./lib.cjs');
(async () => {
  await scenario('c08-campo-vuoto', async (h) => {
    await h.go('product/edit/cmp-6');
    await h.page.getByText('PUZ-0012', { exact: false }).first().waitFor().catch(() => {});
    const inputs = h.page.locator('input:visible');
    const ph = await h.page.evaluate(() => [...document.querySelectorAll('input')].filter((i) => i.offsetParent).map((i) => i.placeholder));
    const forn = ph.find((p) => p === 'Inserisci...');
    if (!forn) return { ph, url: h.page.url() };
    await h.page.getByPlaceholder(forn).fill('Fornitore C08');
    await h.click('Salva', false);
    const p = (await h.products()).find((x) => x.sku === 'PUZ-0012');
    const v = (p.customData || []).find((c) => c.value === 'Fornitore C08');
    return { campo: v && v.fieldSnapshot.name, salvato: v && v.value, campiSalvati: (p.customData || []).length };
    return { segnaposto: forn, salvato: v && v.value, inputs: await inputs.count() };
  }, { dialogs: ['ok'] });
})();
