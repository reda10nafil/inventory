// VAL (ticket 23): valori dei campi personalizzati corretti, un disegnatore solo (`components/FieldInput.tsx`).
// - val-rinomina (CAM-F1): Taglia «M» → «Media» dall'editor dei valori; id uguali, nessun prodotto riscritto; VIS-0142
//   resta scelta in Modifica e la Scheda dice «Media»; Modifica salvata senza cambi non tocca nulla; valore usato non
//   eliminabile, valore libero sì;
// - val-valuta (CAM-F2): «12,50» → 12,5 salvato come numero e «12,50 €» nella Scheda; «tanto» in un numero rifiutato;
// - val-contatore (CAM-F3): Pezzi non toccato si salva col valore mostrato (il minimo), anche al secondo prodotto;
// - val-obbligatorio (CAM-F4): Modifica rifiuta Taglia (obbligatoria) tolta, e chiede Taglia a un prodotto che non l'ha;
// - val-pezzi-modifica (CAM-F5): Pezzi col contatore in Modifica, «–» per chi non l'ha;
// - val-tipo-pelle-id (punto 7): un campo collegato a Tipi di pelle salva l'id e segue il rinomina; il nome scritto
//   prima resta e la finestra lo dice.
// Dopo il parere del revisore:
// - val-nome-ritirato: dopo «M» → «Media» un valore nuovo «M» è rifiutato (VIS-0142 e VIS-0098 hanno «M» salvato);
// - val-nome-in-sospeso: un nome scritto e non salvato nell'editor dei valori ferma «Aggiorna» invece di perdersi.
// Ogni scenario restituisce `ok` e i dettagli. Uso: node val-campi.cjs [nome-scenario]
const { scenario } = require('./lib.cjs');
const { press } = require('./a1-util.cjs');
const v = require('./val-util.cjs');

const P = 'inventory:v1:local:products';
const T = 'inventory:v1:local:timeline';
const TAGLIA = 'field_cmp_taglia';
const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const finestre = (page) => { const l = []; page.on('dialog', (d) => l.push(d.message().replace(/\n+/g, ' | '))); return l; };
const detto = (l, testo) => l.some((m) => m.includes(testo));
const salva = (h) => press(h.page, /Salva Modifiche$/);
const eventiDi = async (h, id) => ((await h.store(T, 0)) || []).filter((e) => e.productId === id && e.type === 'modified');

(async () => {
  await run('val-rinomina', async (h) => {
    const f = finestre(h.page);
    const prima = await h.products(0);
    await v.matita(h, 'Taglia');
    await v.rinomina(h, 'M', 'Media');
    await h.click('Aggiorna');
    const dopoRinomina = (await h.store(v.CF)).find((x) => x.id === TAGLIA);
    // «Media» è usata (VIS-0142 e VIS-0098 hanno «M» salvato prima): non si elimina; «XL» è libera
    await v.matita(h, 'Taglia');
    await h.page.locator('[aria-label="Elimina Media"]').locator('visible=true').first().click(); await h.page.waitForTimeout(500);
    await h.page.locator('[aria-label="Elimina XL"]').locator('visible=true').first().click(); await h.page.waitForTimeout(500);
    await h.click('Aggiorna');
    const taglia = (await h.store(v.CF)).find((x) => x.id === TAGLIA);
    const prodotti = await h.products(0);
    await v.openEdit(h, 'VIS-0142');
    const inModifica = await v.scelti(h.page, ['XS', 'S', 'Media', 'L']);
    const eventi0 = (await eventiDi(h, 'cmp-1')).length;
    await salva(h);
    const vis = (await h.products()).find((p) => p.id === 'cmp-1');
    const eventi1 = (await eventiDi(h, 'cmp-1')).length;
    const scheda = await v.scheda(h, 'cmp-1', [['Taglia', 5]]);
    const out = {
      idDopoRinomina: (dopoRinomina.options || []).map((o) => `${o.id}:${o.label}`),
      dataset: taglia.dataset, idFinali: (taglia.options || []).map((o) => o.id),
      prodottiUguali: JSON.stringify(prodotti) === JSON.stringify(prima),
      salvatoVIS: v.valore(vis, TAGLIA), inModifica, customDataUguale: JSON.stringify(vis.customData) === JSON.stringify(prima.find((p) => p.id === 'cmp-1').customData),
      eventiNuovi: eventi1 - eventi0, scheda: scheda.Taglia,
      rifiutoUsato: detto(f, 'Il valore "Media" è usato da 2 prodotti.'),
    };
    const ok = out.idDopoRinomina.join() === 'opt_0:XS,opt_1:S,opt_2:Media,opt_3:L,opt_4:XL' && out.idFinali.join() === 'opt_0,opt_1,opt_2,opt_3'
      && out.dataset.join() === 'XS,S,Media,L' && out.prodottiUguali && out.salvatoVIS === 'M' && out.inModifica.join() === 'Media'
      && out.customDataUguale && out.eventiNuovi === 0 && out.scheda === 'Media' && out.rifiutoUsato;
    return { ok, ...out };
  });

  await run('val-valuta', async (h) => {
    const f = finestre(h.page);
    await h.go('add');
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await v.scrivi(h, 'Spessore', 'tanto');
    await v.scrivi(h, 'Costo riparazione', '12,50');
    await h.click("Aggiungi all'Inventario");
    const dopoRifiuto = (await h.products(0)).length;
    await v.scrivi(h, 'Spessore', '2,5');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1500);
    const p = (await h.products())[0];
    const out = {
      rifiutato: detto(f, 'Scrivi un numero in: Spessore') && dopoRifiuto === 6,
      costo: v.valore(p, 'field_cmp_riparazione'), spessore: v.valore(p, 'field_cmp_spessore'),
      scheda: await v.scheda(h, p.id, [['Costo riparazione', 7], ['Spessore', 6]]),
      // valori salvati prima di VAL come testo: «180» di VIS-0142
      schedaVecchio: (await v.scheda(h, 'cmp-1', [['Costo riparazione', 5]]))['Costo riparazione'],
    };
    const ok = out.rifiutato && out.costo === 12.5 && out.spessore === 2.5 && out.scheda['Costo riparazione'] === '12,50 €'
      && out.scheda.Spessore === '2,5 mm' && out.schedaVecchio === '180 €';
    return { ok, ...out };
  });

  await run('val-contatore', async (h) => {
    await h.go('add');
    const mostrato = await v.contatore(h.page, 'Pezzi');
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1500);
    const primo = (await h.products())[0];
    // dopo l'OK (D22: il modulo si svuota) il secondo prodotto parte dallo stesso valore
    await h.tab('Aggiungi');
    const mostrato2 = await v.contatore(h.page, 'Pezzi');
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1500);
    const secondo = (await h.products())[0];
    const out = { mostrato, salvato: v.valore(primo, 'field_cmp_pezzi'), mostrato2, salvato2: v.valore(secondo, 'field_cmp_pezzi'), sku2: secondo.sku };
    const ok = out.mostrato === '1' && out.salvato === 1 && out.mostrato2 === '1' && out.salvato2 === 1 && out.sku2 === 'LOG-2026-002';
    return { ok, ...out };
  });

  await run('val-obbligatorio', async (h) => {
    const f = finestre(h.page);
    await v.openEdit(h, 'VIS-0142');
    await h.click('M'); // toglie la Taglia (obbligatoria)
    await salva(h);
    const vis = (await h.products()).find((p) => p.id === 'cmp-1');
    const rimastoInModifica = /product\/edit/.test(h.page.url());
    // PUZ-0012 non ha Taglia: anche lì Modifica la chiede, come Aggiungi
    await v.openEdit(h, 'PUZ-0012');
    await salva(h);
    const puz = (await h.products()).find((p) => p.id === 'cmp-6');
    const out = {
      taglia: v.valore(vis, TAGLIA), rimastoInModifica, puzTaglia: v.valore(puz, TAGLIA) ?? null,
      detto: f.filter((m) => /Compila anche/.test(m)), salvate: f.filter((m) => /aggiornato/.test(m)).length,
    };
    const ok = out.taglia === 'M' && out.rimastoInModifica && out.puzTaglia === null && out.detto.length === 2
      && out.detto.every((m) => m === 'Campi obbligatori | Compila anche: Taglia') && out.salvate === 0;
    return { ok, ...out };
  });

  await run('val-pezzi-modifica', async (h) => {
    await v.openEdit(h, 'VIS-0142');
    const prima = await v.contatore(h.page, 'Pezzi');
    const casella = await h.page.evaluate(() => [...document.querySelectorAll('input')].filter((i) => i.offsetParent).some((i) => i.value === '2'));
    await h.page.locator('[aria-label="Aumenta Pezzi"]').locator('visible=true').first().click(); await h.page.waitForTimeout(300);
    const dopo = await v.contatore(h.page, 'Pezzi');
    await salva(h);
    const vis = (await h.products()).find((p) => p.id === 'cmp-1');
    const righe = (await eventiDi(h, 'cmp-1')).map((e) => (e.details.changes || []).join(' | '));
    await v.openEdit(h, 'PUZ-0012');
    const puzMostra = await v.contatore(h.page, 'Pezzi');
    const out = { prima, casellaDiTesto: casella, dopo, salvato: v.valore(vis, 'field_cmp_pezzi'), cronologia: righe[0] ?? null, puzMostra };
    const ok = out.prima === '2' && !out.casellaDiTesto && out.dopo === '3' && out.salvato === 3 && out.cronologia === 'Pezzi: 2 → 3' && out.puzMostra === '–';
    return { ok, ...out };
  });

  await run('val-tipo-pelle-id', async (h) => {
    const f = finestre(h.page);
    // Campo «Pelle interna» collegato ai Tipi di pelle, nel modulo; VIS-0098 lo ha compilato prima di VAL (col nome)
    await h.page.evaluate(([cf, lk, pk]) => {
      const pelle = { id: 'field_val_pelle', name: 'Pelle interna', type: 'single_choice', uiType: 'grid', dataset: null, required: false, icon: 'layers', order: 40, isSystem: false, linkTo: 'furType' };
      const fields = JSON.parse(localStorage.getItem(cf));
      fields.push(pelle);
      localStorage.setItem(cf, JSON.stringify(fields));
      const layout = JSON.parse(localStorage.getItem(lk));
      layout.fields.push({ id: pelle.id, type: 'custom', size: 'full', visible: true });
      localStorage.setItem(lk, JSON.stringify(layout));
      const list = JSON.parse(localStorage.getItem(pk));
      list.find((p) => p.sku === 'VIS-0098').customData.push({ value: 'Visone', fieldSnapshot: pelle });
      localStorage.setItem(pk, JSON.stringify(list));
    }, [v.CF, v.LAYOUT, P]);
    await h.go('add');
    await h.click('Volpe'); await h.click('Vetrina'); await h.click('M');
    await h.page.locator('xpath=//div[normalize-space()="Pelle interna"]/following-sibling::div[1]').getByText('Visone', { exact: true }).click();
    await h.page.waitForTimeout(300);
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1500);
    const nuovo = (await h.products())[0];
    await h.go('settings/fields');
    await h.page.locator('[aria-label="Modifica i valori di Tipo di pelle"]').locator('visible=true').first().click();
    await h.page.waitForTimeout(600);
    await h.page.locator('[aria-label="Rinomina Visone"]').locator('visible=true').first().click();
    await h.page.getByPlaceholder('Es. Lapin, Castoro, Montone').fill('Visone Black');
    await h.click('Salva nome');
    const out = {
      salvato: v.valore(nuovo, 'field_val_pelle'),
      schedaNuovo: (await v.scheda(h, nuovo.id, [['Pelle interna', 12]]))['Pelle interna'],
      schedaVecchio: (await v.scheda(h, 'cmp-5', [['Pelle interna', 6]]))['Pelle interna'],
      messaggio: f.find((m) => m.includes('«Visone» ora si chiama')) || null,
    };
    const ok = out.salvato === 'visone' && out.schedaNuovo === 'Visone Black' && out.schedaVecchio === 'Visone'
      && out.messaggio === 'Fatto | «Visone» ora si chiama «Visone Black». I 2 prodotti che lo usano mostrano il nome nuovo. Nel campo «Pelle interna» 1 prodotto compilato prima ha il nome scritto: lì resta «Visone».';
    return { ok, ...out };
  });

  await run('val-nome-ritirato', async (h) => {
    const f = finestre(h.page);
    await v.matita(h, 'Taglia');
    await v.rinomina(h, 'M', 'Media');
    await h.click('Aggiorna');
    await v.matita(h, 'Taglia');
    await h.page.getByPlaceholder(v.PH_VALORE).locator('visible=true').first().fill('M');
    await h.click('Aggiungi valore');
    await h.page.getByPlaceholder(v.PH_VALORE).locator('visible=true').first().fill('');
    await h.click('Aggiorna');
    const taglia = (await h.store(v.CF)).find((x) => x.id === TAGLIA);
    const scheda = (await v.scheda(h, 'cmp-1', [['Taglia', 5]])).Taglia;
    const out = {
      opzioni: (taglia.options || []).map((o) => `${o.id}:${o.label}`).join(), scheda,
      rifiuto: f.find((m) => m.includes('è ancora salvato')) || null,
    };
    const ok = out.opzioni === 'opt_0:XS,opt_1:S,opt_2:Media,opt_3:L,opt_4:XL' && out.scheda === 'Media'
      && out.rifiuto === 'Errore | Il nome "M" è ancora salvato in 2 prodotti per il valore "Media": scegline un altro, altrimenti quei prodotti passerebbero al valore nuovo.';
    return { ok, ...out };
  });

  await run('val-nome-in-sospeso', async (h) => {
    const f = finestre(h.page);
    await v.matita(h, 'Taglia');
    await h.page.locator('[aria-label="Rinomina M"]').locator('visible=true').first().click();
    await h.page.getByPlaceholder(v.PH_VALORE).locator('visible=true').first().fill('Media');
    await h.click('Aggiorna');
    const dopoAggiorna = (await h.store(v.CF)).find((x) => x.id === TAGLIA).options.map((o) => o.label).join();
    const fermato = f.some((m) => m.startsWith('Nome non salvato'));
    await h.click('Salva nome');
    await h.click('Aggiorna');
    const dopo = (await h.store(v.CF)).find((x) => x.id === TAGLIA).options.map((o) => o.label).join();
    const out = { fermato, dopoAggiorna, dopo };
    const ok = fermato && dopoAggiorna === 'XS,S,M,L,XL' && dopo === 'XS,S,Media,L,XL';
    return { ok, ...out };
  });
})();
