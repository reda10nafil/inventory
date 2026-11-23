// a4: Impostazioni › GS1 Digital Link - salvataggio della configurazione, ricarica, ripristino,
// e uso della configurazione quando si salva un prodotto (Aggiungi e Modifica).
// Uso: node a4-gs1.cjs [nome-scenario]
const { scenario } = require('./lib.cjs');
const KEY = 'furinventory_gs1_config:local';
const URL_IN = 'https://syncroflow.app/id';
const solo = process.argv[2];
const run = (name, fn, opts) => (!solo || name.includes(solo) ? scenario(name, fn, opts) : null);
const input = (h) => h.page.locator('input:visible').first();

// imposta dominio e seriale progressivo dalla schermata
async function configura(h) {
  await h.go('settings/gs1-config');
  await input(h).fill('https://id.prova.it');
  await input(h).blur();
  await h.page.waitForTimeout(300);
  await h.click('Progressivo');
}

(async () => {
  await run('a4-gs1-salva', async (h) => {
    await configura(h);
    await h.page.getByRole('switch').locator('visible=true').nth(1).click(); // Lotto
    await h.page.waitForTimeout(500);
    const salvato = await h.store(KEY);
    const anteprima = await h.has('https://id.prova.it/01/8001234567890/21/000042?10=LOTTO-2026A');
    // ricarica della pagina: il campo deve mostrare il dominio salvato
    await h.go('settings/gs1-config');
    const campoDopoRicarica = await input(h).inputValue();
    // tocco e uscita dal campo senza scrivere nulla
    await input(h).focus();
    await input(h).blur();
    const dopoBlur = await h.store(KEY);
    return { salvato, anteprima, campoDopoRicarica, baseUrlDopoBlur: dopoBlur.baseUrl };
  });

  // Stesso controllo arrivando dalla voce di Impostazioni (app già caricata), senza ricaricare la pagina GS1.
  await run('a4-gs1-da-impostazioni', async (h) => {
    await configura(h);
    await h.go('settings');
    await h.click('GS1 Digital Link');
    return { campo: await input(h).inputValue(), salvato: (await h.store(KEY, 300)).baseUrl };
  });

  await run('a4-gs1-ripristina', async (h) => {
    await configura(h);
    const prima = await h.store(KEY);
    await h.click('Ripristina Predefiniti');
    const dopo = await h.store(KEY);
    return { prima, dopo, campo: await input(h).inputValue() };
  }, { dialogs: ['ok'] });

  await run('a4-gs1-aggiungi', async (h) => {
    await configura(h);
    const n0 = (await h.products(0)).length;
    await h.go('add');
    await h.click('Visone');
    await h.click('Magazzino');
    await h.click('M'); // Taglia, campo obbligatorio del campionario
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1200);
    const prods = await h.products();
    const nuovo = prods.find((p) => !['VIS-0142', 'VOL-0087', 'LIN-0021', 'AST-0033', 'VIS-0098', 'PUZ-0012'].includes(p.sku));
    return { prodottiPrima: n0, prodottiDopo: prods.length, sku: nuovo && nuovo.sku, gs1DigitalLink: nuovo && nuovo.gs1DigitalLink };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // Modifica di VIS-0142 senza cambiare nulla: il link GS1 (già scritto su QR/NFC) dovrebbe restare uguale.
  await run('a4-gs1-modifica', async (h) => {
    const prima = (await h.products(0)).find((p) => p.sku === 'VIS-0142');
    await h.click('VIS-0142');
    await h.page.waitForTimeout(800);
    await h.click('Modifica');
    await h.page.waitForTimeout(800);
    const skuNelCampo = await h.page.locator('input:visible').first().inputValue();
    await h.click('Salva Modifiche');
    const dopo = (await h.products()).find((p) => p.sku === 'VIS-0142');
    return { skuNelCampo, linkPrima: prima.gs1DigitalLink, linkDopo: dopo.gs1DigitalLink, uguale: prima.gs1DigitalLink === dopo.gs1DigitalLink };
  }, { dialogs: ['ok'] });
})();
