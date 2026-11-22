// A3 - Costruttore di automazioni, scheda dell'automazione (AutomationFlow) ed esecuzione (CustomRunner).
const { scenario } = require('./lib.cjs');
const { scan, iconAt, product, timelineIds, newEvents } = require('./a3-util.cjs');
const KEY = '@furinventory_custom_automations:local';
const last = async (h, text) => { await h.page.getByText(text, { exact: true }).locator('visible=true').last().click(); await h.page.waitForTimeout(700); };

const seed = (list) => async (h) => {
  await h.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, list]);
};
const auto = (id, steps) => ({ id, name: id, icon: 'flash-on', color: '#3B82F6', description: '', qrValue: `AUTO:${id}`, steps, createdAt: '2026-11-22T00:00:00Z', usageCount: 0 });
const st = (id, type, config = {}, label = type) => ({ id, order: 0, type, config, label });

(async () => {
  // 1. Crea «Scarico Merci»: Scansiona prodotto -> Tag «Controllato» -> Sposta in Sartoria; salva, apre, esegue
  await scenario('a3-builder-crea-esegui', async (h) => {
    await h.tab('Automazioni');
    await h.click('Crea Nuova');
    await h.click('Salva'); // senza nome
    await h.page.getByPlaceholder('Es. Scarico Merci').fill('Scarico Merci');
    await h.click('Salva'); // senza step
    await h.click('Aggiungi Step');
    await h.click('Scansiona Prodotto');
    await h.click('Aggiungi Step');
    await h.click('Aggiungi Tag');
    await h.page.getByPlaceholder('Es. Da Pulire').fill('Controllato');
    await last(h, 'Aggiungi');
    await h.click('Aggiungi Step');
    await h.click('Sposta Prodotto');
    await h.click("Usa l'ultima posizione scansionata");
    await last(h, 'Sartoria');
    await last(h, 'Aggiungi');
    await h.click('Salva');
    const saved = (await h.store(KEY)) || [];
    const a = saved[0] || {};
    const card = await h.has('Scarico Merci', true);
    // scheda dell'automazione e avvio
    await h.click('Scarico Merci');
    const qr = await h.has(a.qrValue || 'AUTO:', true);
    await h.click('Avvia Automazione');
    await last(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    const used = await scan(h, 'VIS-0098', { wait: 1500 });
    const p = await product(h, 'VIS-0098');
    const ev = await newEvents(h, before, 0);
    const dopo = (await h.store(KEY, 500))[0];
    const torna = await h.page.evaluate(() => document.body.innerText.match(/Step \d+ di \d+/)?.[0]);
    return {
      salvate: saved.length, nome: a.name, step: (a.steps || []).map((s) => s.label), qrValue: a.qrValue,
      cardInElenco: card, qrInScheda: qr, lettore: used,
      noteVIS0098: p.technicalNotes, posizione: p.location, eventi: ev, usageCount: dopo && dopo.usageCount, statoRunner: torna,
    };
  });

  // 2. Vendita con prezzo (scan_product -> mark_sold con conferma), avviata leggendo il QR AUTO: dallo Scanner
  await scenario('a3-runner-vendita-da-qr', async (h) => {
    await seed([auto('auto_vendi', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'), st('s2', 'mark_sold', { pricePrompt: true }, 'Vendi (con conferma prezzo)')])])(h);
    await h.go('scanner');
    await scan(h, 'AUTO:auto_vendi', { wait: 1500 });
    const runner = await h.has('auto_vendi', true);
    await last(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'AST-0033', { wait: 1200 });
    await h.page.getByPlaceholder('0.00').locator('visible=true').first().fill('1300');
    await h.click('CONFERMA');
    const p = await product(h, 'AST-0033');
    const ev = await newEvents(h, before, 0);
    const usage = (await h.store(KEY, 0))[0].usageCount;
    return { runnerAperto: runner, status: p.status, soldAt: !!p.soldAt, sellPrice: p.sellPrice, eventi: ev, usageCount: usage };
  });

  // 3. Posizione letta poi prodotti (scan_location -> scan_product -> move_to ultima posizione), due prodotti in fila
  await scenario('a3-runner-posizione-letta', async (h) => {
    await seed([auto('auto_scarico', [
      st('s1', 'scan_location', {}, 'Scansiona Posizione'), st('s2', 'scan_product', {}, 'Scansiona Prodotto'),
      st('s3', 'move_to', { useLastScannedLocation: true }, 'Sposta nella Posizione Scansionata')])])(h);
    await h.go('automations/custom-runner/auto_scarico');
    const usageDaIndirizzo = (await h.store(KEY, 500))[0].usageCount;
    await last(h, 'Scansiona Posizione');
    const before = await timelineIds(h);
    await scan(h, 'stand_b', { wait: 1200 });
    await last(h, 'Scansiona Prodotto');
    await scan(h, 'VIS-0142', { wait: 1200 });
    await scan(h, 'PUZ-0012', { wait: 1200 });
    const a = await product(h, 'VIS-0142');
    const b = await product(h, 'PUZ-0012', 0);
    const ev = await newEvents(h, before, 0);
    return { usageAppenaAperto: usageDaIndirizzo, VIS0142: a.location, PUZ0012: b.location, eventi: ev.map((e) => `${e.type} ${e.productId}`) };
  });

  // 4. Automazione senza lettura iniziale (solo «Sposta in Vetrina»): si può eseguire?
  await scenario('a3-runner-senza-lettura', async (h) => {
    await seed([auto('auto_fissa', [st('s1', 'move_to', { useLastScannedLocation: false, locationId: 'vetrina' }, 'Sposta in: Vetrina')])])(h);
    await h.go('automations/custom-runner/auto_fissa');
    const testo = await h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200));
    const pulsanti = (await iconAt(h)).map((b) => b.t).filter(Boolean);
    return { schermo: testo, pulsantiConTesto: pulsanti };
  });

  // 6. «Imposta Campo» e «Vendi (prezzo catalogo)»: dove finisce il campo? vende senza chiedere?
  await scenario('a3-runner-campo-vendi', async (h) => {
    await seed([auto('auto_campo', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'),
      st('s2', 'set_field', { fieldName: 'Stato', fieldValue: 'Controllato' }, 'Imposta Stato = Controllato'),
      st('s3', 'mark_sold', { pricePrompt: false }, 'Vendi (prezzo catalogo)')])])(h);
    await h.go('automations/custom-runner/auto_campo');
    await last(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'PUZ-0012', { wait: 1500 });
    const p = await product(h, 'PUZ-0012');
    const ev = await newEvents(h, before, 0);
    return { note: p.technicalNotes, customDataStato: (p.customData || {}).Stato ?? null, chiaviCustomData: Object.keys(p.customData || {}), status: p.status, sellPrice: p.sellPrice, eventi: ev.map((e) => e.type) };
  });

  // 5. Modifica (matita) ed eliminazione (cestino) dalla scheda; eliminazione con pressione lunga dall'elenco
  await scenario('a3-builder-modifica-elimina', async (h) => {
    await seed([auto('auto_a', [st('s1', 'scan_product', {}, 'Scansiona Prodotto')]), auto('auto_b', [st('s1', 'scan_product', {}, 'Scansiona Prodotto')])])(h);
    await h.go('automations');
    await h.click('auto_a');
    const top = (await iconAt(h)).filter((b) => b.y < 90).sort((a, c) => a.x - c.x);
    // [indietro, matita, cestino]
    await h.page.mouse.click(top[1].x, top[1].y); await h.page.waitForTimeout(900);
    const modifica = await h.has('Modifica Automazione', true);
    await h.page.getByPlaceholder('Es. Scarico Merci').fill('auto_a rinominata');
    await h.click('Salva');
    const dopoModifica = (await h.store(KEY)).map((x) => x.name);
    const top2 = (await iconAt(h)).filter((b) => b.y < 90).sort((a, c) => a.x - c.x);
    await h.page.mouse.click(top2[top2.length - 1].x, top2[top2.length - 1].y); await h.page.waitForTimeout(900);
    const dopoCestino = (await h.store(KEY)).map((x) => x.name);
    await h.longPress('auto_b');
    const dopoPressione = (await h.store(KEY)).map((x) => x.name);
    return { modifica, dopoModifica, dopoCestino, dopoPressione };
  }, { dialogs: ['ok', 'ok', 'ok'] });
})();
