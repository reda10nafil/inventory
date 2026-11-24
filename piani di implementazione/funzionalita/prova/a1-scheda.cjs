// A1 - Scheda prodotto: pesi, visore delle foto, condividi, PDF, etichetta, copia link GS1, NFC.
const { scenario, APP } = require('./lib.cjs');
const { dump, press, textOf, clickAt } = require('./a1-util.cjs');
const { chiudiCodice } = require('./eti-util.cjs');

// Foto in primo piano in un punto: lunghezza della data-URI (identifica quale delle foto salvate si vede)
const topImg = (page, x, y) => page.evaluate(([x, y]) => {
  for (const e of document.elementsFromPoint(x, y)) {
    const bg = getComputedStyle(e).backgroundImage;
    if (bg && bg.includes('data:')) return bg.length - 7; // toglie url("")
    if (e.tagName === 'IMG' && e.src.startsWith('data:')) return e.src.length;
  }
  return null;
}, [x, y]);
// Galleria della scheda alla foto n (1..3)
const heroTo = (page, n) => page.evaluate((n) => {
  const d = [...document.querySelectorAll('div')].find((d) => d.scrollWidth > d.clientWidth + 10 && getComputedStyle(d).overflowX === 'auto');
  d.scrollLeft = (n - 1) * d.clientWidth;
}, n);
// Finti condividi e stampa: registrano la chiamata invece di aprire la finestra del sistema
const stubs = (page) => page.evaluate(() => {
  window.__shared = []; window.__prints = 0;
  navigator.share = async (d) => { window.__shared.push(d); };
  window.print = () => { window.__prints += 1; };
});
const openDetail = async (h, sku) => { await h.click(sku); await h.page.waitForTimeout(800); };
// Pulsante Condividi della Scheda: per nome (da GAL, che mette le miniature sotto la foto e lo fa scendere); prima di
// GAL non aveva nome e stava in (337, 362)
const share = async (page) => {
  const l = page.locator('[aria-label="Condividi"]').locator('visible=true');
  if (await l.count()) { await l.first().click(); await page.waitForTimeout(1000); } else await clickAt(page, 337, 362, 1000);
};

(async () => {
  // 1. Pesi e visore delle foto (VIS-0142 ha 3 foto): la foto mostrata nel visore è quella del contatore?
  await scenario('a1-scheda-visore', async (h) => {
    const { page } = h;
    await openDetail(h, 'VIS-0142');
    const lens = (await h.products(0)).find((p) => p.sku === 'VIS-0142').images.map((x) => x.length);
    const n = (len) => lens.indexOf(len) + 1; // numero della foto salvata
    const out = { '2.1 kg': await h.has('2.1 kg'), '2,1 kg': await h.has('2,1 kg'), prove: [] };
    for (const start of [1, 3]) {
      await heroTo(page, start); await page.waitForTimeout(700);
      const scheda = `scheda ${await textOf(page, /^\d\/3$/)} foto ${n(await topImg(page, 188, 160))}`;
      await clickAt(page, 188, 160, 1300); // apre il visore
      const visore = `visore ${await textOf(page, /^\d \/ 3$/)} foto ${n(await topImg(page, 188, 400))}`;
      if (start === 1) {
        await h.shot('visore-da-1');
        // larghezza e bordo sinistro dei contenitori sopra la foto del visore
        out.contenitoriVisore = await page.evaluate(() => { let e = document.elementsFromPoint(188, 400)[0]; const r = []; while (e && r.length < 8) { const b = e.getBoundingClientRect(); r.push(Math.round(b.left) + '/' + Math.round(b.width) + '/' + getComputedStyle(e).overflowX); e = e.parentElement; } return r; });
      }
      await page.mouse.move(188, 400); await page.mouse.wheel(375, 0); await page.waitForTimeout(800);
      const rotella = `dopo rotella ${await textOf(page, /^\d \/ 3$/)} foto ${n(await topImg(page, 188, 400))}`;
      out.prove.push([scheda, visore, rotella].join(' | '));
      const close = (await dump(page)).filter((b) => b.y < 120).pop();
      await clickAt(page, close.x, close.y, 900);
    }
    return out;
  });

  // 2. Condividi: Cliente (1) e Professionista (2), con navigator.share finto; poi senza (come un browser desktop)
  await scenario('a1-scheda-condividi', async (h) => {
    const { page } = h;
    await openDetail(h, 'VIS-0142');
    await share(page); // senza navigator.share
    await stubs(page);
    await share(page); // Cliente
    await share(page); // Professionista
    const sh = await page.evaluate(() => window.__shared.map((d) => ({ title: d.title, text: d.text, url: (d.url || '').slice(0, 40), urlLen: (d.url || '').length })));
    return { condivisioni: sh };
  }, { dialogs: ['1', '1', '2'] });

  // 3. PDF, copia link GS1, NFC (VIS-0142 ha il link GS1). ETI (ticket 22): «Copia link» e «Programma tag» stanno in
  //    «Codice ed etichetta» › Avanzate; il PDF si apre in una finestra sua (`stampeFinestra` conta le stampe della
  //    pagina dell'app, che non si stampa più); `pulsanteEtichetta` = l'etichetta si raggiunge anche per VIS-0142 (P27)
  await scenario('a1-scheda-pdf-gs1', async (h) => {
    const { page } = h;
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP });
    await page.context().addInitScript(() => { window.print = () => {}; }); // la finestra della stampa (ETI)
    await openDetail(h, 'VIS-0142');
    await stubs(page);
    const link = (await h.products(0)).find((p) => p.sku === 'VIS-0142').gs1DigitalLink;
    const codice = page.getByLabel('Codice ed etichetta', { exact: true }).locator('visible=true');
    const avanzate = async () => { if (await codice.count()) { await codice.first().click(); await page.waitForTimeout(700); await page.getByLabel('Avanzate', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(400); } };
    await avanzate();
    await press(page, 'Copia link');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    await chiudiCodice(h);
    await press(page, 'Stampa scheda PDF');
    await page.waitForTimeout(2500);
    const prints = await page.evaluate(() => window.__prints);
    const legacy = (await h.has('Mostra SKU QR')) || (await codice.count()) > 0;
    await avanzate();
    await press(page, 'Programma tag');
    await page.waitForTimeout(2500);
    return { link, copiato: copied, uguale: copied === link, stampeFinestra: prints, pulsanteEtichetta: legacy };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 4. Etichetta. ETI (ticket 22): per ogni prodotto, dalla riga «Codice ed etichetta» (prima «Mostra SKU QR», solo
  //    senza link); la stampa apre una finestra sua (`finestreStampa`) e non la pagina dell'app (`stampeFinestra`);
  //    la seconda volta nel formato «Foglio A4». Il binario QR/Barcode non c'è più.
  await scenario('a1-scheda-etichetta', async (h) => {
    const { page } = h;
    const nuove = [];
    page.context().on('page', (p) => nuove.push(p));
    await page.context().addInitScript(() => { window.print = () => {}; });
    await openDetail(h, 'PUZ-0012');
    await stubs(page);
    const out = { pulsante: await h.has('Codice ed etichetta', true) };
    await page.getByLabel('Codice ed etichetta', { exact: true }).locator('visible=true').first().click();
    await page.waitForTimeout(700);
    out.finestra = await h.has('Stampa etichetta', true);
    await press(page, 'Stampa etichetta', true);
    await page.waitForTimeout(1500);
    await page.getByLabel('Formato Foglio A4', { exact: true }).locator('visible=true').first().click();
    await page.waitForTimeout(400);
    await press(page, 'Stampa etichetta', true);
    await page.waitForTimeout(1500);
    out.finestreStampa = nuove.length;
    out.stampeFinestra = await page.evaluate(() => window.__prints);
    await h.shot('etichetta');
    return out;
  }, { dialogs: ['ok', 'ok'] });
})();
