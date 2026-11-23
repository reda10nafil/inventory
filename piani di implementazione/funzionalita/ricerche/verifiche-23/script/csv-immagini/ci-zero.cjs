// Prezzo d'acquisto 0 dal CSV (comune nei file di altri gestionali): che cosa mostra la Scheda?
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');
const DROP = '[aria-label="Importa CSV trascinando un file qui"]';
(async () => {
  await scenario('ci-prezzo-zero', async (h) => {
    const errori = [];
    h.page.on('console', (m) => { if (m.type() === 'error') errori.push(m.text().slice(0, 120)); });
    await h.tab('Impostazioni');
    const csv = 'SKU,Tipo di pelle,Posizione,Prezzo Acquisto,Prezzo Vendita,Note\r\nZERO-1,volpe,vetrina,0,100,nota\r\n';
    const dt = await h.page.evaluateHandle((text) => { const d = new DataTransfer(); d.items.add(new File([text], 'z.csv', { type: 'text/csv' })); return d; }, csv);
    await h.page.locator(DROP).dispatchEvent('drop', { dataTransfer: dt });
    await h.page.waitForTimeout(1500);
    const p = (await h.products()).find((x) => x.sku === 'ZERO-1');
    errori.length = 0;
    await h.go('');
    await h.page.getByText('ZERO-1', { exact: true }).first().click();
    await h.page.waitForTimeout(1500);
    await h.shot('scheda');
    const testo = (await h.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    return { purchasePrice: p && p.purchasePrice, technicalNotes: p && p.technicalNotes, prezzi: testo.slice(testo.indexOf('Prezzi'), testo.indexOf('Prezzi') + 60), erroriScheda: errori };
  });
})();
