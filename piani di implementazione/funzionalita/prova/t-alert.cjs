// Verifica della conferma sul web (Alert -> window.confirm): elimina da selezione multipla, poi Annulla.
const { scenario } = require('./lib.cjs');
(async () => {
  await scenario('elimina-conferma-si', async (h) => {
    await h.longPress('VIS-0142');
    await h.page.mouse.click(256, 675); // cestino nella barra della selezione
    const p = (await h.products()).find((x) => x.sku === 'VIS-0142');
    const ev = (await h.timeline(0)).filter((e) => e.productId === p.id).map((e) => e.type);
    return { deletedAt: !!p.deletedAt, eventi: ev };
  }, { dialogs: ['ok'] });
  await scenario('elimina-conferma-no', async (h) => {
    await h.longPress('VIS-0142');
    await h.page.mouse.click(256, 675);
    const p = (await h.products()).find((x) => x.sku === 'VIS-0142');
    return { deletedAt: !!p.deletedAt };
  }, { dialogs: ['cancel'] });
})();
