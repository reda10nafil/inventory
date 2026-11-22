// A2 - Layout builder: sposta e nascondi campi; MODELLI (D12): il modello aggiunge i campi al registro e al layout?
const { scenario } = require('./lib.cjs');

const KEY = 'furinventory_custom_fields:local';
const LAYOUT = 'furinventory_layout_config:local';
// pulsanti della riga del campo: su, giù, visibilità, rimuovi
const rowButtons = (h, text) => h.vis(text).locator('xpath=ancestor::div[.//div[@tabindex="0"]][1]').locator('div[tabindex="0"]');
const ids = (l) => l.fields.map((f) => f.id);

(async () => {
  // 1. Sposta «Prezzo Vendita» su, nascondi «Peso», salva; poi Aggiungi
  await scenario('a2-layout-sposta-nascondi', async (h) => {
    await h.go('settings/layout-builder');
    const prima = await h.store(LAYOUT, 0);
    await rowButtons(h, 'Prezzo Vendita').nth(0).click(); // su
    await h.page.waitForTimeout(400);
    await rowButtons(h, 'Peso').nth(2).click(); // visibilità
    await h.page.waitForTimeout(400);
    const primaDiSalvare = await h.store(LAYOUT, 300);
    await h.click('Salva Layout');
    const dopo = await h.store(LAYOUT);
    await h.go('add');
    const acquisto = await h.page.getByPlaceholder('2500').boundingBox();
    const vendita = await h.page.getByPlaceholder('4200').boundingBox();
    const pesoInAggiungi = (await h.page.getByPlaceholder('1.2').count()) > 0;
    const i = (l, id) => ids(l).indexOf(id);
    return {
      ordinePrima: [i(prima, 'purchasePrice'), i(prima, 'sellPrice')],
      salvatoPrimaDelPulsante: JSON.stringify(primaDiSalvare) !== JSON.stringify(prima),
      ordineDopo: [i(dopo, 'purchasePrice'), i(dopo, 'sellPrice')],
      pesoVisibile: dopo.fields.find((f) => f.id === 'weight').visible,
      venditaPrimaDiAcquistoInAggiungi: vendita.x < acquisto.x || vendita.y < acquisto.y,
      pesoInAggiungi,
    };
  });

  // 2. Modifiche non salvate: si nasconde «Peso», si torna indietro senza «Salva Layout» (navigazione interna)
  await scenario('a2-layout-non-salvato', async (h) => {
    await h.tab('Impostazioni');
    await h.click('Configura Layout Aggiungi');
    await rowButtons(h, 'Peso').nth(2).click();
    await h.page.waitForTimeout(400);
    await h.page.goBack();
    await h.page.waitForTimeout(1200);
    await h.tab('Aggiungi');
    const pesoInAggiungiPrimaDiRicaricare = (await h.page.getByPlaceholder('1.2').count()) > 0;
    const l = await h.store(LAYOUT);
    await h.go('add');
    const pesoInAggiungiDopoRicarica = (await h.page.getByPlaceholder('1.2').count()) > 0;
    return {
      pesoVisibileSalvato: l.fields.find((f) => f.id === 'weight').visible,
      pesoInAggiungiPrimaDiRicaricare, pesoInAggiungiDopoRicarica,
    };
  });

  // 3. D12: MODELLI > «Elettronica & Tech» (5 campi, nessuno già presente), poi Salva Layout
  await scenario('a2-layout-modello', async (h) => {
    await h.go('settings/layout-builder');
    const campiPrima = (await h.store(KEY, 0)).filter((f) => !f.isSystem).map((f) => f.name);
    const layoutPrima = ids(await h.store(LAYOUT, 0));
    await h.click('MODELLI');
    await h.click('Elettronica & Tech');
    await h.page.waitForTimeout(1500);
    const campiDopo = (await h.store(KEY)).filter((f) => !f.isSystem);
    const nuovi = campiDopo.filter((f) => !campiPrima.includes(f.name));
    const pulsante = await h.has('Salva Layout', true);
    if (pulsante) await h.click('Salva Layout');
    const layoutDopo = ids(await h.store(LAYOUT));
    await h.go('add');
    const inAggiungi = {};
    for (const n of ['Brand/Produttore', 'Modello', 'Numero di Serie (S/N)', 'Condizione', 'Scadenza Garanzia']) inAggiungi[n] = await h.has(n);
    return {
      nuoviNelRegistro: nuovi.map((f) => f.name),
      nuoviNelLayout: layoutDopo.filter((id) => !layoutPrima.includes(id)),
      layoutUguale: JSON.stringify(layoutDopo) === JSON.stringify(layoutPrima),
      inAggiungi,
    };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 4. Stesso modello applicato due volte di seguito: arrivano i campi persi la prima volta?
  await scenario('a2-layout-modello-due-volte', async (h) => {
    await h.go('settings/layout-builder');
    const nomi = async () => (await h.store(KEY)).filter((f) => !f.isSystem && !f.deletedAt).map((f) => f.name);
    const prima = await nomi();
    for (let k = 0; k < 2; k++) {
      await h.click('MODELLI');
      await h.click('Elettronica & Tech');
      await h.page.waitForTimeout(1500);
    }
    const dopo = await nomi();
    return { aggiunti: dopo.filter((n) => !prima.includes(n)) };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });
})();
