// A2 - Impostazioni > Campi personalizzati: crea, modifica, elimina; il campo nuovo compare in Aggiungi?
const { scenario } = require('./lib.cjs');

const KEY = 'furinventory_custom_fields:local';
const LAYOUT = 'furinventory_layout_config:local';
const NAME_PH = 'Es: Taglia Pantalone, PDF Manuale';
// pulsanti (modifica, cestino) della card che contiene il testo
const cardButtons = (h, text) => h.vis(text).locator('xpath=ancestor::div[.//div[@tabindex="0"]][1]').locator('div[tabindex="0"]');

(async () => {
  // 1. Crea un campo Testo Breve: compare subito in Aggiungi e resta nel layout dopo la ricarica (P11, C07)
  await scenario('a2-campi-crea', async (h) => {
    await h.go('settings/fields');
    const prima = (await h.store(KEY, 0)).length;
    await h.click('Crea Nuovo Campo');
    await h.click('Max 100 caratteri'); // descrizione del tipo: «Testo Breve» compare anche nell'elenco sotto la finestra
    await h.page.getByPlaceholder(NAME_PH).fill('Campo A2');
    await h.click('Salva Campo');
    const campi = await h.store(KEY);
    const nuovo = campi.find((f) => f.name === 'Campo A2');
    await h.go('add');
    const inAggiungiSubito = await h.has('Campo A2', true);
    const layoutPrima = (await h.store(LAYOUT, 0)).fields.some((f) => f.id === (nuovo && nuovo.id));
    // Dopo C07 (P11) il campo entra da solo in fondo al layout: si controlla che resti dopo la ricarica
    await h.page.reload(); await h.page.waitForTimeout(2500);
    const layoutDopo = (await h.store(LAYOUT, 0)).fields.find((f) => f.id === (nuovo && nuovo.id));
    await h.go('add');
    const inAggiungiDopoLayout = await h.has('Campo A2', true);
    return {
      prima, dopo: campi.length, nuovo: nuovo && { id: nuovo.id, type: nuovo.type, uiType: nuovo.uiType, isSystem: nuovo.isSystem },
      inAggiungiSubito, nelLayoutSubito: layoutPrima, nelLayoutDopo: layoutDopo || null, inAggiungiDopoLayout,
    };
  }, { dialogs: ['ok'] });

  // 2. Modifica «Fornitore»: nome e obbligatorio; Aggiungi mostra il nome nuovo e lo pretende
  await scenario('a2-campi-modifica', async (h) => {
    await h.go('settings/fields');
    await cardButtons(h, 'Fornitore').nth(0).click();
    await h.page.waitForTimeout(700);
    await h.page.getByPlaceholder(NAME_PH).fill('Fornitore A2');
    await h.click('Campo obbligatorio in fase di aggiunta');
    await h.click('Aggiorna');
    const f = (await h.store(KEY)).find((x) => x.id === 'field_cmp_fornitore');
    await h.go('add');
    const etichetta = await h.has('Fornitore A2'); // l'etichetta è «Fornitore A2 *»
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    return { name: f.name, required: f.required, type: f.type, etichettaInAggiungi: etichetta, prodotti: (await h.products()).length };
  });

  // 3. Elimina «Spessore» (cestino): deletedAt, sparisce da Aggiungi, compare nel Cestino
  await scenario('a2-campi-elimina', async (h) => {
    await h.go('settings/fields');
    await cardButtons(h, 'Spessore').nth(1).click();
    await h.page.waitForTimeout(700);
    const f = (await h.store(KEY)).find((x) => x.id === 'field_cmp_spessore');
    const nellElenco = await h.has('Spessore', true);
    await h.go('add');
    const inAggiungi = await h.has('Spessore', true);
    await h.go('settings/trash');
    const nelCestino = await h.has('Spessore', true);
    return { deletedAt: !!f.deletedAt, ancoraNellElenco: nellElenco, inAggiungi, nelCestino };
  }, { dialogs: ['ok'] });
})();
