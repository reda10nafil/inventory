// Campo rinominato: la Scheda di un prodotto già salvato usa il nome nuovo o quello della copia (fieldSnapshot)?
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');
const NAME_PH = 'Es: Taglia Pantalone, PDF Manuale';
const cardButtons = (h, text) => h.vis(text).locator('xpath=ancestor::div[.//div[@tabindex="0"]][1]').locator('div[tabindex="0"]');
(async () => {
  await scenario('v6-rinomina-campo', async (h) => {
    await h.go('settings/fields');
    await cardButtons(h, 'Fornitore').nth(0).click();
    await h.page.waitForTimeout(700);
    const cambiaTipo = await h.has('Cambia', true);
    await h.page.getByPlaceholder(NAME_PH).fill('Fornitore principale');
    await h.click('Aggiorna');
    await h.go('product/cmp-1');
    await h.page.getByText('Campi strutturati', { exact: false }).first().waitFor().catch(() => {});
    const t = await h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const i = t.indexOf('Pellicceria Bianchi');
    return { cambiaTipoInModifica: cambiaTipo, schedaNomeNuovo: t.includes('Fornitore principale'), intorno: i >= 0 ? t.slice(Math.max(0, i - 25), i + 20) : null };
  }, { dialogs: ['ok'] });
})();
