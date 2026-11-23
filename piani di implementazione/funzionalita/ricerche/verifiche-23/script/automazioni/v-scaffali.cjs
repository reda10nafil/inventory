// Verifica automazioni: codice di uno scaffale (S1a, copia di lavoro) letto nelle automazioni.
const P = require('path').join(__dirname, '../../../../prova');
const { scenario } = require(`${P}/lib.cjs`);
const { scan, product, timelineIds, newEvents } = require(`${P}/a3-util.cjs`);
const KEY = '@furinventory_custom_automations:local';
const last = async (h, text) => { await h.page.getByText(text, { exact: true }).locator('visible=true').last().click(); await h.page.waitForTimeout(700); };
const body = (h) => h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

(async () => {
  await scenario('v-scaffale-nelle-automazioni', async (h) => {
    await h.page.evaluate((k) => {
      localStorage.setItem('furinventory_shelves:local', JSON.stringify([{ id: '1732300000000-gen1', name: 'A1', locationId: 'magazzino', barcode: 'SCAF-MAG-A1' }]));
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      Object.assign(list.find((x) => x.sku === 'VIS-0098'), { shelfId: '1732300000000-gen1' });
      localStorage.setItem(pk, JSON.stringify(list));
      localStorage.setItem(k, JSON.stringify([{ id: 'auto_scaf', name: 'auto_scaf', icon: 'flash-on', color: '#3B82F6', description: '', qrValue: 'AUTO:auto_scaf', createdAt: '2026-11-22T00:00:00Z', usageCount: 0,
        steps: [{ id: 's1', order: 0, type: 'scan_location', config: {}, label: 'Scansiona Posizione' }, { id: 's2', order: 1, type: 'scan_product', config: {}, label: 'Scansiona Prodotto' },
          { id: 's3', order: 2, type: 'move_to', config: { useLastScannedLocation: true }, label: 'Sposta nella Posizione Scansionata' }] }]));
    }, KEY);
    // Esecuzione: scan_location con il codice dello scaffale
    await h.go('automations/custom-runner/auto_scaf');
    await last(h, 'Scansiona Posizione');
    await scan(h, 'SCAF-MAG-A1', { wait: 600 });
    const runner = (await body(h)).match(/(Posizione non trovata|📍 [^ ]+)/)?.[0] ?? null;
    // Spostamento rapido: destinazione Vetrina, poi si legge il codice dello scaffale
    await h.go('automations/batch-move');
    await h.click('Vetrina');
    await h.click('Scansiona Prodotto');
    await scan(h, 'SCAF-MAG-A1', { wait: 700 });
    const batchMsg = (await body(h)).match(/(Prodotto non trovato[^ ]* [^ ]+|Cambio Destinazione)/)?.[0] ?? null;
    // Spostamento rapido di VIS-0098 (sullo scaffale A1 del Magazzino) in Vetrina: che fine fa lo scaffale?
    const before = await timelineIds(h);
    await h.page.waitForTimeout(2200);
    await scan(h, 'VIS-0098', { wait: 1200 });
    const p = await product(h, 'VIS-0098');
    const ev = await newEvents(h, before, 0);
    return { runnerScanLocation: runner, spostamentoRapido: batchMsg, VIS0098: { location: p.location, shelfId: p.shelfId ?? null }, eventi: ev.map((e) => `${e.type}:${e.details.from}>${e.details.to}`) };
  });
})();
