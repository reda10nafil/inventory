// A2 - Aggiungi: salvataggio completo, SKU generato, obbligatori, scanner finto (D02), foto (D18), svuotamento (D22).
const { scenario } = require('./lib.cjs');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
const CITES = 'Scansiona o scrivi il codice';

async function compilaMinimo(h) {
  await h.click('Visone');
  await h.click('Vetrina');
  await h.click('M'); // Taglia, obbligatoria nel campionario
}
const submit = (h) => h.click("Aggiungi all'Inventario");
const cf = (p, name) => (p.customData || []).find((c) => c.fieldSnapshot && c.fieldSnapshot.name === name);

(async () => {
  // 1. Salvataggio completo senza SKU e senza foto
  await scenario('a2-add-completo', async (h) => {
    await h.go('add');
    const before = (await h.products(0)).length;
    await compilaMinimo(h);
    await h.page.getByPlaceholder('2500').fill('1800');
    await h.page.getByPlaceholder('4200').fill('3900');
    await h.page.getByPlaceholder('85').fill('90');
    await h.page.getByPlaceholder('Scrivi').first().fill('Pellami Rossi');
    await h.click('Cappuccio'); // Dettagli (scelta multipla a riquadri)
    await h.click('Tasche');
    await submit(h);
    await h.page.waitForTimeout(1500);
    const list = await h.products();
    const p = list[0];
    const ev = (await h.timeline(0)).filter((e) => e.productId === p.id).map((e) => e.type);
    // D22: si torna in Aggiungi con la barra (senza ricaricare) e si guarda se i campi sono vuoti
    await h.tab('Aggiungi');
    const fornitoreDopo = await h.page.getByPlaceholder('Scrivi').first().inputValue();
    const prezzoDopo = await h.page.getByPlaceholder('2500').inputValue();
    return {
      prima: before, dopo: list.length, sku: p.sku, furType: p.furType, location: p.location, status: p.status,
      purchasePrice: p.purchasePrice, sellPrice: p.sellPrice, length: p.length, immagine: (p.images || [])[0],
      fornitore: cf(p, 'Fornitore') && cf(p, 'Fornitore').value, taglia: cf(p, 'Taglia') && cf(p, 'Taglia').value,
      dettagli: cf(p, 'Dettagli') && cf(p, 'Dettagli').value, eventi: ev,
      dopoReset: { fornitore: fornitoreDopo, prezzo: prezzoDopo },
    };
  }, { dialogs: ['ok', 'ok'] });

  // 2. Obbligatori: niente tipo/posizione, poi niente Taglia
  await scenario('a2-add-obbligatori', async (h) => {
    await h.go('add');
    await submit(h);
    await h.click('Visone');
    await h.click('Vetrina');
    await submit(h);
    return { prodotti: (await h.products()).length };
  });

  // 3. SKU scritto a mano, pulsante SKU, pulsante QR del campo con scanner (D02)
  await scenario('a2-add-sku-scanner', async (h) => {
    await h.go('add');
    const skuInput = h.page.getByPlaceholder('Auto: LOG-2026-001');
    await skuInput.locator('xpath=../following-sibling::div[1]').click();
    await h.page.waitForTimeout(400);
    const skuDalPulsante = await skuInput.inputValue();
    await skuInput.fill('A2-MANUALE');
    const cites = h.page.getByPlaceholder(CITES);
    await cites.locator('xpath=../following-sibling::div[1]').click();
    await h.page.waitForTimeout(400);
    const citesDopoQR = await cites.inputValue();
    await compilaMinimo(h);
    await submit(h);
    await h.page.waitForTimeout(1500);
    const p = (await h.products())[0];
    return { skuDalPulsante, citesDopoQR, skuSalvato: p.sku, citesSalvato: cf(p, 'Codice CITES') && cf(p, 'Codice CITES').value };
  }, { dialogs: ['ok', 'ok'] });

  // 4. Foto dalla galleria (sul web: scelta file del browser), poi ricarica: la foto si apre ancora?
  for (const [scelta, nome] of [['1', 'galleria'], ['3', 'file']]) {
    await scenario(`a2-add-foto-${nome}`, async (h) => {
      await h.go('add');
      const chooser = h.page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
      await h.click('Importa');
      const fc = await chooser;
      if (!fc) return { filechooser: false };
      await fc.setFiles({ name: 'prova.png', mimeType: 'image/png', buffer: PNG });
      await h.page.waitForTimeout(1200);
      const contatore = await h.has('1/10');
      await compilaMinimo(h);
      await submit(h);
      await h.page.waitForTimeout(1500);
      const p = (await h.products())[0];
      const uri = (p.images || [])[0] || '';
      await h.go('');
      const apribileDopoRicarica = await h.page.evaluate(async (u) => {
        try { const r = await fetch(u); return r.ok; } catch (e) { return 'errore: ' + e.message.slice(0, 60); }
      }, uri);
      return { filechooser: true, multiple: fc.isMultiple(), contatore, sku: p.sku, uri: uri.slice(0, 40), tipo: uri.split(':')[0], apribileDopoRicarica };
    }, { dialogs: [scelta, 'ok'] });
  }
})();
