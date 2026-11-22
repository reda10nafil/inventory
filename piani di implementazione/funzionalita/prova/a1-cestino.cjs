// A1 - Cestino: ripristina (anche Annulla), elimina per sempre, svuota; eventi in cronologia.
const { scenario } = require('./lib.cjs');
const { press, clickAt, dump } = require('./a1-util.cjs');

const selectionBar = async (page) => (await dump(page)).filter((b) => b.y > 630 && b.y < 730 && b.w < 80).sort((a, b) => a.x - b.x);
const trashFromUi = async (h, cards) => {
  await h.longPress(cards[0]);
  for (const sku of cards.slice(1)) await h.click(sku);
  const bar = await selectionBar(h.page);
  await clickAt(h.page, bar[1].x, bar[1].y);
  await h.products();
};
// Pulsanti icona delle card del cestino: coppie (ripristina, elimina) per riga
const rowButtons = async (page) => (await dump(page)).filter((b) => b.w < 60 && b.y > 80).sort((a, b) => a.y - b.y || a.x - b.x);

(async () => {
  // 1. Ripristina: prima Annulla, poi conferma
  await scenario('a1-cestino-ripristina', async (h) => {
    const { page } = h;
    await trashFromUi(h, ['VIS-0142', 'VOL-0087']);
    await h.tab('Impostazioni');
    await page.mouse.move(188, 400); await page.mouse.wheel(0, 3000); await page.waitForTimeout(600); // la voce sta in fondo, sotto la barra delle schede
    await h.click('Cestino'); // voce di Impostazioni (SettingsScreen.tsx:417)
    const out = { url: page.url(), titolo: await h.has('Cestino (2)', true), dettaglio: await page.getByText(/^volpe - /).first().innerText(), svuota: await h.has('Svuota') };
    const btns = await rowButtons(page);
    out.pulsanti = btns.map((b) => `${b.x},${b.y}`);
    await clickAt(page, btns[0].x, btns[0].y); // ripristina VIS-0142 -> Annulla
    let p = (await h.products()).find((x) => x.id === 'cmp-1');
    out.dopoAnnulla = !!p.deletedAt;
    await clickAt(page, btns[0].x, btns[0].y); // ripristina VIS-0142 -> OK
    p = (await h.products()).find((x) => x.id === 'cmp-1');
    out.dopoRipristina = { deletedAt: !!p.deletedAt, eventi: (await h.timeline(0)).filter((e) => e.productId === 'cmp-1').slice(0, 2).map((e) => e.type) };
    out.titoloDopo = await h.has('Cestino (1)', true);
    await h.shot('dopo');
    return out;
  }, { dialogs: ['ok', 'cancel', 'ok'] }); // elimina, ripristina-Annulla, ripristina-OK

  // 2. Elimina per sempre VOL-0087: sparisce dai prodotti, resta in cronologia come «Prodotto eliminato»
  await scenario('a1-cestino-elimina', async (h) => {
    const { page } = h;
    await trashFromUi(h, ['VOL-0087']);
    await h.go('settings/trash');
    const btns = await rowButtons(page);
    await clickAt(page, btns[1].x, btns[1].y); // elimina per sempre -> OK
    const ps = await h.products();
    const out = {
      prodotti: ps.length, vol: !!ps.find((x) => x.id === 'cmp-2'),
      deletedIds: await h.store('inventory:v1:local:deleted_product_ids', 0),
      eventiRimasti: (await h.timeline(0)).filter((e) => e.productId === 'cmp-2').map((e) => e.type),
      vuoto: await h.has('Il cestino è vuoto'),
    };
    await h.go('timeline');
    out.voci = await page.getByText(/^Prodotto eliminato - /).locator('visible=true').allInnerTexts();
    await page.getByText(/^Prodotto eliminato - /).first().click();
    await page.waitForTimeout(800);
    await h.go('');
    out.chipCestino = await page.locator('[tabindex="0"]').filter({ hasText: /^Cestino\s*\d+$/ }).first().innerText();
    return out;
  }, { dialogs: ['ok', 'ok', 'ok'] });
})();
