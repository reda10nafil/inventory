// C13 (P24): «Svuota» elimina per sempre tutti i prodotti del cestino (conferma), gli altri restano.
const { scenario } = require('./lib.cjs');
(async () => {
  await scenario('c13-svuota', async (h) => {
    await h.page.evaluate(() => {
      const k = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(k));
      list.filter((p) => ['VIS-0142', 'VOL-0087'].includes(p.sku)).forEach((p) => { p.deletedAt = '2026-11-21T10:00:00Z'; });
      localStorage.setItem(k, JSON.stringify(list));
    });
    await h.go('settings/trash');
    const prima = await h.has('Prodotti eliminati (2)');
    await h.click('Svuota');
    const products = await h.products();
    const deleted = await h.store('inventory:v1:local:deleted_product_ids', 0);
    return { prima, rimasti: products.map((p) => p.sku), nelCestino: products.filter((p) => p.deletedAt).length, deletedIds: deleted, vuoto: await h.has('vuoto') };
  }, { dialogs: ['ok'] });
})();
