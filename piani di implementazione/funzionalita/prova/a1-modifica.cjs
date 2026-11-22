// A1 - Modifica: campi di base, campi personalizzati, D03, link GS1, campo nel cestino.
const { scenario } = require('./lib.cjs');
const { press, clickAt, dump } = require('./a1-util.cjs');

const openEdit = async (h, sku) => {
  await h.click(sku); await h.page.waitForTimeout(800);
  await press(h.page, /^.?\s*Modifica$/); await h.page.waitForTimeout(800);
};
const ph = (page, text) => page.getByPlaceholder(text, { exact: true }).locator('visible=true').first();
const cd = (p, id) => (p.customData || []).find((c) => c.fieldSnapshot && c.fieldSnapshot.id === id)?.value;
const newEvents = (before, after) => after.slice(0, after.length - before.length).map((e) => `${e.type}${e.details && e.details.changes ? ' ' + e.details.changes.join(' | ') : ''}`);

(async () => {
  // 1. Campi di base: prezzo, peso con la virgola, posizione, cartella; link GS1 prima e dopo
  await scenario('a1-mod-base', async (h) => {
    const { page } = h;
    const before = (await h.products(0)).find((p) => p.id === 'cmp-1');
    const tl0 = await h.timeline(0);
    await openEdit(h, 'VIS-0142');
    const out = { skuNelCampo: await ph(page, 'es: VIS-001-2024').inputValue() };
    await ph(page, '4200').fill('4500');
    await ph(page, '1.2').fill('2,5');
    await press(page, /Sartoria$/);
    await press(page, /Pellicce$/);
    await press(page, /Salva Modifiche$/);
    const p = (await h.products()).find((x) => x.id === 'cmp-1');
    out.salvato = { sellPrice: p.sellPrice, weight: p.weight, location: p.location, libraryId: p.libraryId };
    out.gs1 = { prima: before.gs1DigitalLink, dopo: p.gs1DigitalLink };
    out.eventiNuovi = newEvents(tl0, await h.timeline(0));
    out.urlDopo = page.url();
    return out;
  }, { dialogs: ['ok'] });

  // 2. Campi personalizzati di VIS-0142: testo, scelta a riquadri, scelta da elenco, multipla
  await scenario('a1-mod-personalizzati', async (h) => {
    const { page } = h;
    const tl0 = await h.timeline(0);
    await openEdit(h, 'VIS-0142');
    await ph(page, 'Inserisci...').fill('Pellicceria Rossi');
    // il testo del riquadro è «icona+etichetta» senza spazio: si salta l'icona con [^A-Za-z]*
    await press(page, /^[^A-Za-z]*L$/);           // Taglia M -> L
    await press(page, /^[^A-Za-z]*Buono$/);       // Condizione Ottimo -> Buono
    await press(page, /Grigio perla/);            // apre l'elenco Colore
    await press(page, /^Nero$/, true);
    await press(page, /^[^A-Za-z]*Cappuccio$/);   // Dettagli: aggiunge Cappuccio
    await press(page, /Salva Modifiche$/);
    const p = (await h.products()).find((x) => x.id === 'cmp-1');
    return {
      fornitore: cd(p, 'field_cmp_fornitore'), taglia: cd(p, 'field_cmp_taglia'), condizione: cd(p, 'field_cmp_cond'),
      colore: cd(p, 'field_cmp_colore'), dettagli: cd(p, 'field_cmp_dett'), campiSalvati: (p.customData || []).length,
      eventiNuovi: newEvents(tl0, await h.timeline(0)),
    };
  }, { dialogs: ['ok'] });

  // 3. D03 e apertura diretta dall'indirizzo
  await scenario('a1-mod-d03', async (h) => {
    const { page } = h;
    const out = {};
    await openEdit(h, 'PUZ-0012'); // nessun campo personalizzato salvato
    out.PUZ = { sezione: await h.has('Campi personalizzati'), taglia: await h.has('Taglia'), fornitore: await h.has('Fornitore') };
    await h.go('');
    await h.page.waitForTimeout(800);
    await openEdit(h, 'VOL-0087'); // solo Taglia, Colore, Pezzi
    out.VOL = { taglia: await h.has('Taglia'), fornitore: await h.has('Fornitore'), condizione: await h.has('Condizione') };
    await h.go('product/edit/cmp-1');
    await page.waitForTimeout(1500);
    out.diretto = { skuNelCampo: await ph(page, 'es: VIS-001-2024').inputValue().catch(() => 'campo assente') };
    await h.shot('diretto');
    return out;
  });

  // 4. Solo il peso, SKU vuoto, Annulla
  await scenario('a1-mod-peso-annulla', async (h) => {
    const { page } = h;
    const tl0 = await h.timeline(0);
    await openEdit(h, 'VIS-0142');
    await ph(page, '1.2').fill('2.4');
    await press(page, /Salva Modifiche$/);
    let p = (await h.products()).find((x) => x.id === 'cmp-1');
    const out = { peso: p.weight, eventiNuovi: newEvents(tl0, await h.timeline(0)) };
    await openEdit(h, 'VIS-0142');
    await ph(page, 'es: VIS-001-2024').fill('');
    await press(page, /Salva Modifiche$/);
    p = (await h.products()).find((x) => x.id === 'cmp-1');
    out.skuVuoto = p.sku;
    await ph(page, '4200').fill('9999');
    await press(page, /^Annulla$/);
    p = (await h.products()).find((x) => x.id === 'cmp-1');
    out.dopoAnnulla = { sellPrice: p.sellPrice, url: page.url() };
    return out;
  }, { dialogs: ['ok', 'ok'] });

  // 5. Campo «Fornitore» nel cestino dei campi: salvare il prodotto senza modifiche conserva il valore?
  await scenario('a1-mod-campo-nel-cestino', async (h) => {
    const { page } = h;
    await page.evaluate(() => {
      const k = 'furinventory_custom_fields:local';
      const f = JSON.parse(localStorage.getItem(k));
      f.find((x) => x.id === 'field_cmp_fornitore').deletedAt = new Date().toISOString();
      localStorage.setItem(k, JSON.stringify(f));
    });
    await h.go('');
    await page.waitForTimeout(800);
    const prima = cd((await h.products(0)).find((x) => x.id === 'cmp-1'), 'field_cmp_fornitore');
    await openEdit(h, 'VIS-0142');
    await press(page, /Salva Modifiche$/);
    const dopo = cd((await h.products()).find((x) => x.id === 'cmp-1'), 'field_cmp_fornitore');
    return { prima, dopo: dopo === undefined ? 'perso' : dopo };
  }, { dialogs: ['ok'] });
// 6. Pulsante QR accanto al codice CITES (campo con scanner): cosa scrive?
  await scenario('a1-mod-scanner-cites', async (h) => {
    const { page } = h;
    await openEdit(h, 'VIS-0142');
    const input = ph(page, 'Scansiona o scrivi il codice');
    await input.scrollIntoViewIfNeeded();
    const box = await input.boundingBox();
    const side = (await dump(page)).find((b) => b.x > box.x + box.width && Math.abs(b.y - (box.y + box.height / 2)) < 30);
    const prima = await input.inputValue();
    await clickAt(page, side.x, side.y);
    const dopo = await input.inputValue();
    await press(page, /Salva Modifiche$/);
    const p = (await h.products()).find((x) => x.id === 'cmp-1');
    return { prima, dopo, salvato: cd(p, 'field_cmp_cites') };
  }, { dialogs: ['ok'] });
})();
