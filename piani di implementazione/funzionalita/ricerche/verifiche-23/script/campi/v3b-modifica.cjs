// Peso nascosto e salvato nel layout: Modifica mostra ancora «Peso (kg)»? (etichetta scritta nel codice di Modifica)
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');
const rowButtons = (h, text) => h.vis(text).locator('xpath=ancestor::div[.//div[@tabindex="0"]][1]').locator('div[tabindex="0"]');
(async () => {
  await scenario('v3b-modifica-ignora-layout', async (h) => {
    await h.go('settings/layout-builder');
    await rowButtons(h, 'Peso').nth(2).click();
    await h.page.waitForTimeout(400);
    await h.click('Salva Layout');
    await h.go('add');
    const pesoInAggiungi = (await h.page.getByPlaceholder('1,2').count()) > 0;
    await h.go('product/edit/cmp-1');
    await h.page.getByText('Campi personalizzati', { exact: false }).first().waitFor().catch(() => {});
    return { pesoInAggiungi, pesoInModifica: await h.has('Peso (kg)', true) };
  }, { dialogs: ['ok'] });
})();
