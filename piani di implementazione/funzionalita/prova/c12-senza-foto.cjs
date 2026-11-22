// C12 (D18): un prodotto senza foto si salva senza immagine d'esempio; card, Scheda e Modifica funzionano.
const { scenario } = require('./lib.cjs');
(async () => {
  await scenario('c12-senza-foto', async (h) => {
    await h.go('add');
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    const p = (await h.products()).find((x) => x.sku === 'LOG-2026-001');
    await h.go('');
    const cardSenzaFoto = await h.page.locator('[aria-label="Nessuna foto"]').count();
    await h.click('LOG-2026-001');
    const schedaSenzaFoto = await h.page.locator('[aria-label="Nessuna foto"]:visible').count();
    await h.click('Modifica', false);
    await h.page.getByPlaceholder('4200').fill('999');
    await h.click('Salva Modifiche', false);
    const dopo = (await h.products()).find((x) => x.sku === 'LOG-2026-001');
    return { images: p.images, cardSenzaFoto, schedaSenzaFoto, prezzoDopoModifica: dopo.sellPrice };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });
})();
