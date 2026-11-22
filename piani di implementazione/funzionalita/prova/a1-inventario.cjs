// A1 - Inventario: filtri, pillole delle cartelle, ricerca, selezione multipla (seleziona tutto, sposta, rimuovi, elimina).
const { scenario } = require('./lib.cjs');
const { dump, press, skus, textOf, clickAt, brief } = require('./a1-util.cjs');

const header = (page) => textOf(page, /^\d+ prodotti$/);
const chip = (label) => new RegExp(`^${label}\\s*\\d+$`);
// I tre pulsanti della barra di selezione (cartella, cestino, chiudi), da sinistra
const selectionBar = async (page) => (await dump(page)).filter((b) => b.y > 630 && b.y < 730 && b.w < 80).sort((a, b) => a.x - b.x);

(async () => {
  // 1. Filtri di stato e pillole delle cartelle: la lista confrontata con lo stato salvato
  await scenario('a1-inv-filtri', async (h) => {
    const { page } = h;
    const ps = await h.products(0);
    const alerts = (await h.store('inventory:v1:local:alerts', 0)) || [];
    const alertIds = [...new Set(alerts.filter((a) => !a.dismissed).map((a) => a.productId))];
    const out = { alertsSalvati: alerts.map((a) => `${a.type}:${a.productId}`) };
    for (const f of ['Tutti', 'Disponibili', 'Venduti', 'Attenzione']) {
      await press(page, chip(f));
      out[f] = { chip: await textOf(page, chip(f)), header: await header(page), skus: await skus(page) };
    }
    out.attesi = {
      Disponibili: ps.filter((p) => p.status === 'available' && !p.deletedAt).map((p) => p.sku),
      Venduti: ps.filter((p) => p.status === 'sold' && !p.deletedAt).map((p) => p.sku),
      Attenzione: ps.filter((p) => alertIds.includes(p.id)).map((p) => p.sku),
    };
    // Cartelle
    await press(page, chip('Tutti'));
    for (const lib of ['Pellicce', 'Collezione Inverno', 'Usato e permute']) {
      await press(page, lib);
      out[`cartella ${lib}`] = { header: await header(page), skus: await skus(page), Disponibili: await textOf(page, chip('Disponibili')) };
    }
    await press(page, 'Pellicce');
    await press(page, chip('Disponibili'));
    out['Pellicce+Disponibili'] = await skus(page);
    await press(page, 'Tutti'); // pillola cartella «Tutti» (la prima nel documento)
    out['cartella Tutti'] = await header(page);
    await h.shot('fine');
    return out;
  });

  // 2. Ricerca: SKU, tipo, posizione per nome o per id, e ricerca dentro Attenzione
  await scenario('a1-inv-ricerca', async (h) => {
    const { page } = h;
    await clickAt(page, 337, 43); // lente
    const box = page.getByPlaceholder('Cerca SKU', { exact: false });
    const out = {};
    for (const q of ['VIS', 'visone', 'Stand A', 'stand_a', 'Sartoria', 'Magazzino']) {
      await box.fill(q); await page.waitForTimeout(500);
      out[q] = await skus(page);
    }
    await box.fill('ZZZ'); await page.waitForTimeout(400);
    out['ZZZ (D06)'] = { skus: await skus(page), messaggio: await h.has('Nessun prodotto qui') };
    await box.fill('PUZ'); await page.waitForTimeout(400);
    out['PUZ in Tutti'] = await skus(page);
    await press(page, chip('Attenzione'));
    out['PUZ in Attenzione'] = await skus(page);
    await h.shot('attenzione');
    return out;
  });

  // 3. Selezione multipla: seleziona tutto, deseleziona, sposta in cartella, rimuovi dalla cartella
  await scenario('a1-inv-cartelle', async (h) => {
    const { page } = h;
    const out = {};
    const tl0 = (await h.timeline(0)).length;
    await h.longPress('VIS-0142');
    await press(page, 'Seleziona Tutto');
    out.dopoSelezionaTutto = await textOf(page, /^(Deseleziona|Seleziona Tutto)$/);
    await press(page, 'Deseleziona');
    out.dopoDeseleziona = { barra: (await selectionBar(page)).length, etichetta: await textOf(page, /^(Deseleziona|Seleziona Tutto)$/) };
    // di nuovo: tutto e sposta in «Usato e permute»
    await h.longPress('VIS-0142');
    await press(page, 'Seleziona Tutto');
    const bar = await selectionBar(page);
    out.barra = bar.map((b) => `${b.x},${b.y}`);
    await clickAt(page, bar[0].x, bar[0].y);
    out.finestra = await textOf(page, /^Gestisci \d+ Prodotti$/);
    await press(page, 'Usato e permute', true);
    let ps = await h.products();
    out.dopoSposta = ps.map((p) => `${p.sku}:${p.libraryId}`);
    out.eventiDopoSposta = (await h.timeline(0)).length - tl0;
    // rimuovi dalla cartella solo due prodotti
    await h.longPress('VIS-0142');
    await clickAt(page, 276, 435); // card VOL-0087
    const bar2 = await selectionBar(page);
    await clickAt(page, bar2[0].x, bar2[0].y);
    await press(page, 'Rimuovi dalla cartella', true);
    ps = await h.products();
    out.dopoRimuovi = ps.map((p) => `${p.sku}:${p.libraryId === undefined ? 'nessuna' : p.libraryId}`);
    await press(page, 'Usato e permute');
    out.pillolaUsato = await skus(page);
    return out;
  }, { dialogs: ['ok', 'ok'] });

  // 4. Elimina due prodotti dalla selezione, poi filtro Cestino (anche con ricerca)
  await scenario('a1-inv-elimina', async (h) => {
    const { page } = h;
    await h.longPress('VIS-0142');
    await clickAt(page, 276, 435); // VOL-0087
    const bar = await selectionBar(page);
    await clickAt(page, bar[1].x, bar[1].y); // cestino
    const ps = await h.products();
    const ids = ps.filter((p) => p.deletedAt).map((p) => p.id);
    const ev = (await h.timeline(0)).filter((e) => ids.includes(e.productId) && e.type === 'deleted').length;
    const out = { eliminati: ps.filter((p) => p.deletedAt).map((p) => p.sku), eventiDeleted: ev };
    out.Tutti = await textOf(page, chip('Tutti'));
    await press(page, chip('Cestino'));
    out.Cestino = { chip: await textOf(page, chip('Cestino')), skus: await skus(page) };
    await clickAt(page, 337, 43);
    await page.getByPlaceholder('Cerca SKU', { exact: false }).fill('VOL');
    await page.waitForTimeout(500);
    out['VOL nel Cestino'] = await skus(page);
    // la card nel cestino apre la scheda?
    await page.getByPlaceholder('Cerca SKU', { exact: false }).fill('');
    await page.waitForTimeout(300);
    await h.click('VIS-0142');
    out.schedaDaCestino = { url: page.url(), modifica: await h.has('Modifica', true), segnoCestino: await h.has('Cestino') };
    return out;
  }, { dialogs: ['ok'] });
})();
