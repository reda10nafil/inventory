// A3 - Spostamento rapido (BatchMove): posizione scelta a mano, prodotti letti (lettura simulata), D15.
const { scenario } = require('./lib.cjs');
const { scan, product, timelineIds, newEvents } = require('./a3-util.cjs');
(async () => {
  // 1. Destinazione Vetrina, si legge PUZ-0012 (stand_c): posizione e cronologia
  await scenario('a3-batch-sposta', async (h) => {
    await h.go('automations/batch-move');
    await h.click('Vetrina');
    await h.click('Scansiona Prodotto');
    const before = await timelineIds(h);
    const used = await scan(h, 'PUZ-0012');
    const p = await product(h, 'PUZ-0012');
    const nuovo = await newEvents(h, before, 0);
    // codice inesistente: messaggio, nessuna modifica
    await scan(h, 'NON-ESISTE', { wait: 800 });
    const contatore = await h.page.evaluate(() => document.body.innerText.match(/(\d+)\s*\n\s*Spostati/)?.[1]);
    return { lettore: used, posizione: p.location, eventiNuovi: nuovo, spostatiSulloSchermo: contatore };
  });

  // 2. Durante la lettura prodotti si legge un codice posizione: cambio destinazione con conferma
  await scenario('a3-batch-cambio-dest', async (h) => {
    await h.go('automations/batch-move');
    await h.click('Vetrina');
    await h.click('Scansiona Prodotto');
    await scan(h, 'magazzino');
    const dest = await h.page.evaluate(() => document.body.innerText.match(/Destinazione Attuale:\s*\n?\s*(.+)/)?.[1]);
    return { destinazione: dest };
  }, { dialogs: ['ok'] });

  // 3. Posizione piena (capacità 1 su Vetrina, che ha già VIS-0142): suggerisce la successiva
  await scenario('a3-batch-piena', async (h) => {
    await h.page.evaluate(() => localStorage.setItem('furinventory_locations:local', JSON.stringify([
      { id: 'magazzino', label: 'Magazzino', color: '#3B82F6' },
      { id: 'vetrina', label: 'Vetrina', color: '#D4AF37', capacity: 1 },
      { id: 'stand_a', label: 'Stand A', color: '#10B981' },
    ])));
    await h.go('automations/batch-move');
    await h.click('Vetrina');
    const dest = await h.page.evaluate(() => document.body.innerText.match(/Destinazione Attuale:\s*\n?\s*(.+)/)?.[1]);
    return { destinazione: dest };
  }, { dialogs: ['ok'] });
})();
