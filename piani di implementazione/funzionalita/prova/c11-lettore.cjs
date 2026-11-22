// C11 (D02): il pulsante QR di un campo con scanner apre il lettore; il codice letto va nel campo, Chiudi non cambia nulla.
const { scenario } = require('./lib.cjs');
const { press, clickAt, dump } = require('./a1-util.cjs');
const { scan } = require('./a3-util.cjs');
const ph = (page, text) => page.getByPlaceholder(text, { exact: true }).locator('visible=true').first();
const qr = async (page) => {
  const input = ph(page, 'Scansiona o scrivi il codice');
  await input.scrollIntoViewIfNeeded();
  const box = await input.boundingBox();
  const side = (await dump(page)).find((b) => b.x > box.x + box.width && Math.abs(b.y - (box.y + box.height / 2)) < 30);
  await clickAt(page, side.x, side.y);
  await page.waitForTimeout(800);
};
(async () => {
  await scenario('c11-modifica', async (h) => {
    await h.click('VIS-0142'); await h.click('Modifica');
    await qr(h.page);
    const lettoreAperto = await h.has('Nessun accesso alla fotocamera');
    const esito = await scan(h, 'IT-CITES-LETTO-1');
    const dopo = await ph(h.page, 'Scansiona o scrivi il codice').inputValue();
    await press(h.page, /Salva Modifiche$/);
    const p = (await h.products()).find((x) => x.id === 'cmp-1');
    return { lettoreAperto, esito, campo: dopo, salvato: (p.customData || []).find((c) => c.fieldSnapshot.id === 'field_cmp_cites')?.value };
  }, { dialogs: ['ok'] });
  await scenario('c11-aggiungi', async (h) => {
    await h.go('add');
    await ph(h.page, 'Scansiona o scrivi il codice').fill('ABC-1');
    await qr(h.page);
    const lettoreAperto = await h.has('Nessun accesso alla fotocamera');
    const esito = await scan(h, 'LETTO-2');
    return { lettoreAperto, esito, lettoreChiuso: !(await h.has('Nessun accesso alla fotocamera')), campo: await ph(h.page, 'Scansiona o scrivi il codice').inputValue() };
  });
})();
