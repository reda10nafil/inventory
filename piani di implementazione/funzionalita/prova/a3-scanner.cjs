// A3 - Scanner (inserimento manuale e lettura simulata) e Azione rapida (sposta, vendi, posizione, cartella D14).
const { scenario } = require('./lib.cjs');
const { scan, product, timelineIds, newEvents } = require('./a3-util.cjs');
(async () => {
  // 1. Inserimento manuale (minuscolo) -> Azione rapida -> Spostato in Magazzino
  await scenario('a3-scanner-manuale-sposta', async (h) => {
    await h.go('scanner');
    await h.click('Inserisci Manualmente');
    const before = await timelineIds(h);
    await h.page.getByPlaceholder('Es: SKU-001, 1234567890123').fill('vis-0142');
    await h.click('Cerca');
    const azione = await h.has('Azione rapida', true);
    await h.click('SPOSTATO');
    await h.click('Magazzino');
    await h.click('Conferma Spostamento');
    const p = await product(h, 'VIS-0142');
    const ev = await newEvents(h, before, 0);
    const tornatoAScanner = await h.has('Scanner QR/Barcode', true);
    return { azione, posizione: p.location, eventi: ev, tornatoAScanner };
  });

  // 2. Codice manuale sconosciuto
  await scenario('a3-scanner-manuale-sconosciuto', async (h) => {
    await h.go('scanner');
    await h.click('Inserisci Manualmente');
    await h.page.getByPlaceholder('Es: SKU-001, 1234567890123').fill('XYZ-9999');
    await h.click('Cerca');
    return { restaSuScanner: await h.has('Scanner QR/Barcode', true) };
  });

  // 3. Lettura simulata dalla fotocamera: prodotto, posizione, cartella, codice sconosciuto
  await scenario('a3-scanner-lettura', async (h) => {
    await h.go('scanner');
    const before = await timelineIds(h);
    const used = await scan(h, 'PUZ-0012', { wait: 1500 });
    const prodotto = (await h.has('Azione rapida', true)) && (await h.has('PUZ-0012', true));
    const ev = await newEvents(h, before, 0);
    await h.go('scanner');
    await scan(h, 'stand_a', { wait: 1500 });
    const posizione = await h.has('POSIZIONE', true);
    await h.go('scanner');
    await scan(h, 'pellicce', { wait: 1500 });
    const cartella = await h.has('CATEGORIA', true); // C1: etichetta nuova
    await h.go('scanner');
    await scan(h, 'ZZZ-000', { wait: 1200 });
    return { lettore: used, prodotto, eventiDopoLettura: ev, posizione, cartella };
  });

  // 4. Azione rapida › Venduto con prezzo finale
  await scenario('a3-azione-vendi', async (h) => {
    await h.go('scanner-action?type=product&id=cmp-3');
    const before = await timelineIds(h);
    await h.click('VENDUTO');
    await h.page.locator('input').locator('visible=true').first().fill('5500');
    await h.click('Conferma Vendita');
    const p = await product(h, 'LIN-0021');
    const ev = await newEvents(h, before, 0);
    return { status: p.status, soldAt: !!p.soldAt, sellPrice: p.sellPrice, eventi: ev };
  });

  // 5. Azione rapida su un capo già venduto (VOL-0087): si può rivendere?
  await scenario('a3-azione-vendi-gia-venduto', async (h) => {
    const prima = await product(h, 'VOL-0087', 0);
    await h.go('scanner-action?type=product&id=cmp-2');
    const before = await timelineIds(h);
    await h.click('VENDUTO');
    await h.click('Conferma Vendita');
    const p = await product(h, 'VOL-0087');
    const ev = await newEvents(h, before, 0);
    return { soldAtPrima: prima.soldAt, soldAtDopo: p.soldAt, eventi: ev };
  });

  // 6. Cartella › Vedi prodotti (D14): l'inventario è filtrato su Pellicce?
  await scenario('a3-azione-cartella-D14', async (h) => {
    await h.go('scanner-action?type=library&id=pellicce');
    const cartella = await h.has('Pellicce', true);
    await h.click('VEDI PRODOTTI');
    await h.page.waitForTimeout(1000);
    const visibili = [];
    for (const sku of ['VIS-0142', 'VOL-0087', 'LIN-0021', 'AST-0033', 'VIS-0098', 'PUZ-0012']) if (await h.has(sku, true)) visibili.push(sku);
    const params = await h.page.evaluate(() => location.href);
    return { cartella, url: params, skuVisibili: visibili };
  });

  // 7. Posizione › Spostamento di massa / Audit: la posizione letta è già scelta?
  await scenario('a3-azione-posizione', async (h) => {
    await h.go('scanner-action?type=location&id=stand_a');
    await h.click('SPOSTAMENTO DI MASSA');
    const batchFase1 = await h.has('Fase 1: Scannerizza Posizione', true);
    await h.page.goBack(); await h.page.waitForTimeout(1200);
    await h.click('INVENTARIO / AUDIT');
    const auditFase1 = await h.has('Inizia Inventario', true);
    return { batchChiedeDiNuovoPosizione: batchFase1, auditChiedeDiNuovoPosizione: auditFase1 };
  });
})();
