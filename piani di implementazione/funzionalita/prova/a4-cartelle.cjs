// a4: Impostazioni › Cartelle - crea, rinomina, elimina (piena, vuota), e cartella eliminata con prodotti nel cestino.
// Uso: node a4-cartelle.cjs [nome-scenario]   (senza argomento li esegue tutti)
const { scenario } = require('./lib.cjs');
const KEY = 'inventory:v1:local:libraries';
const NOME = 'Nome cartella (es: Giacche)';
const row = (h, id) => h.page.locator('[tabindex="0"]').filter({ hasText: `ID: ${id}` }).first();
const solo = process.argv[2];
const run = (name, fn, opts) => (!solo || name.includes(solo) ? scenario(name, fn, opts) : null);

(async () => {
  await run('a4-cart-crea', async (h) => {
    await h.go('settings/folders');
    await h.page.getByPlaceholder(NOME).fill('Giacche');
    await h.page.locator('[tabindex="0"]').nth(2).click(); // terza icona = warehouse
    await h.page.getByPlaceholder('Scansiona o Genera...').fill('LIB-PROVA-1');
    const avviso = await h.has('Il barcode verrà salvato solo se modifichi');
    await h.click('Crea Cartella');
    const libs = (await h.store(KEY)) || [];
    const nuova = libs.find((l) => l.name === 'Giacche');
    await h.go('');
    const chipHome = await h.has('Giacche', true);
    return { nuova, totale: libs.length, avvisoBarcode: avviso, chipHome };
  });

  await run('a4-cart-rinomina', async (h) => {
    await h.go('settings/folders');
    await row(h, 'pellicce').click();
    await h.page.waitForTimeout(400);
    const titolo = await h.has('Modifica cartella');
    await h.page.getByPlaceholder(NOME).fill('Pellicce Lusso');
    await h.page.getByPlaceholder('Scansiona o Genera...').fill('LIB-PELLICCE');
    await h.click('Salva Modifiche');
    const libs = (await h.store(KEY)) || [];
    const prods = await h.products(0);
    await h.go('');
    const chipHome = await h.has('Pellicce Lusso', true);
    return { titoloModifica: titolo, pellicce: libs.find((l) => l.id === 'pellicce'), prodottiInPellicce: prods.filter((p) => p.libraryId === 'pellicce').map((p) => p.sku), chipHome };
  });

  await run('a4-cart-elimina-piena', async (h) => {
    await h.go('settings/folders');
    await row(h, 'pellicce').locator('[tabindex="0"]').last().click();
    await h.page.waitForTimeout(500);
    const libs = await h.store(KEY);
    return { ancoraPresente: (libs || []).some((l) => l.id === 'pellicce'), totale: (libs || []).length };
  });

  await run('a4-cart-elimina-vuota', async (h) => {
    await h.go('settings/folders');
    await h.page.getByPlaceholder(NOME).fill('Temporanea');
    await h.click('Crea Cartella');
    const creata = ((await h.store(KEY)) || []).find((l) => l.name === 'Temporanea');
    await row(h, creata.id).locator('[tabindex="0"]').last().click();
    await h.page.waitForTimeout(500);
    const libs = (await h.store(KEY)) || [];
    return { creataId: creata.id, dopoElimina: libs.map((l) => l.id) };
  }, { dialogs: ['ok', 'ok'] });

  // AST-0033 è l'unico prodotto di «Usato e permute»: lo si mette nel cestino, si elimina la cartella, lo si ripristina.
  await run('a4-cart-cestino', async (h) => {
    await h.vis('AST-0033').evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await h.page.waitForTimeout(500);
    await h.longPress('AST-0033');
    await h.page.mouse.click(256, 675); // cestino della barra di selezione (come in t-alert)
    const ast = (await h.products()).find((p) => p.sku === 'AST-0033');
    await h.go('settings/folders');
    const conteggio = await row(h, 'usato-e-permute').innerText();
    await row(h, 'usato-e-permute').locator('[tabindex="0"]').last().click();
    await h.page.waitForTimeout(500);
    const libs = (await h.store(KEY)) || [];
    await h.go('settings/trash');
    await h.shot('cestino');
    // primo pulsante dopo «indietro» = ripristina del primo prodotto nel cestino
    await h.page.locator('[tabindex="0"]').nth(1).click();
    await h.page.waitForTimeout(500);
    const dopo = (await h.products()).find((p) => p.sku === 'AST-0033');
    return {
      nelCestino: !!ast.deletedAt, rigaCartella: conteggio.replace(/\s+/g, ' '),
      cartellaEliminata: !libs.some((l) => l.id === 'usato-e-permute'),
      ripristinato: !dopo.deletedAt, libraryIdDopo: dopo.libraryId,
      cartellaEsiste: libs.some((l) => l.id === dopo.libraryId),
    };
  }, { dialogs: ['ok', 'ok', 'ok'] });
})();
