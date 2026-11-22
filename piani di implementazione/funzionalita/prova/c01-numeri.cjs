// C01 (P03): numeri in formato italiano in Aggiungi e Modifica.
const { scenario } = require('./lib.cjs');
(async () => {
  await scenario('c01-aggiungi', async (h) => {
    await h.go('add');
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await h.page.getByPlaceholder('2500').fill('1.800');
    await h.page.getByPlaceholder('4200').fill('4.500,50');
    await h.page.getByPlaceholder('1,2').fill('2,5');
    await h.click("Aggiungi all'Inventario");
    const p = (await h.products()).find((x) => x.sku === 'LOG-2026-001');
    return { purchasePrice: p.purchasePrice, sellPrice: p.sellPrice, weight: p.weight };
  }, { dialogs: ['ok'] });
  await scenario('c01-modifica-mostra', async (h) => {
    await h.click('VIS-0142');
    await h.click('Modifica');
    return { peso: await h.page.getByPlaceholder('1,2').inputValue() };
  });
})();
