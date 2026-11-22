// C07 (D12, D13, P11): campo nuovo subito in Aggiungi (anche dopo la ricarica); import di un modello di settore.
const { scenario } = require('./lib.cjs');
const NAME_PH = 'Es: Taglia Pantalone, PDF Manuale';
(async () => {
  await scenario('c07-campo-nuovo', async (h) => {
    await h.go('settings/fields');
    await h.click('Crea Nuovo Campo');
    await h.click('Max 100 caratteri');
    await h.page.getByPlaceholder(NAME_PH).fill('Campo C07');
    await h.click('Salva Campo');
    const layout = await h.store('furinventory_layout_config:local');
    const fields = await h.store('furinventory_custom_fields:local', 0);
    const f = fields.find((x) => x.name === 'Campo C07');
    await h.go('add');
    const inAggiungi = await h.has('Campo C07', true);
    await h.page.reload(); await h.page.waitForTimeout(2500);
    await h.go('add');
    return { nelLayoutSalvato: layout.fields.some((x) => x.id === f.id), inAggiungi, dopoRicarica: await h.has('Campo C07', true) };
  }, { dialogs: ['ok'] });
  await scenario('c07-modello-settore', async (h) => {
    await h.go('settings/sector-templates');
    const before = (await h.store('furinventory_custom_fields:local', 0) || []).length;
    await h.click('Abbigliamento', false);
    await h.click('Importa', false);
    const after = await h.store('furinventory_custom_fields:local');
    const layout = await h.store('furinventory_layout_config:local', 0);
    const nuovi = after.slice(before);
    return { nuovi: nuovi.map((f) => f.name), tuttiNelLayout: nuovi.every((f) => layout.fields.some((x) => x.id === f.id)) };
  }, { dialogs: ['ok', 'ok', 'ok'] });
})();
