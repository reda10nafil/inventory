// Verifica NFC e GS1 (23 novembre 2026), sola lettura dell'app: scenari Playwright sul web.
// Uso: SHOTS=<questa cartella> node ng.cjs <scenario>   (un solo scenario per volta)
const P = __dirname + '/../../../../prova/';
const { scenario, APP } = require(P + 'lib.cjs');
const { scan } = require(P + 'a3-util.cjs');
const { press } = require(P + 'a1-util.cjs');
const GS1 = 'furinventory_gs1_config:local';
const HW = 'furinventory_hardware_config:local';
const solo = process.argv[2];
const run = (name, fn, opts) => (!solo || name === solo ? scenario(name, fn, opts) : null);
const prod = async (h, sku, wait) => (await h.products(wait)).find((p) => p.sku === sku);
const stubs = (page) => page.evaluate(() => {
  window.__shared = []; window.__prints = 0;
  navigator.share = async (d) => { window.__shared.push(d); };
  window.print = () => { window.__prints += 1; };
});
const openDetail = async (h, sku) => { await h.click(sku); await h.page.waitForTimeout(800); };
const input = (h) => h.page.locator('input').first();

(async () => {
  // 1. Lo Scanner riconosce il QR della Scheda (link GS1)? Controllo: lo SKU sì.
  await run('ng-scanner-gs1', async (h) => {
    const link = (await prod(h, 'VIS-0142', 0)).gs1DigitalLink;
    await h.go('scanner');
    const lettore = await scan(h, link, { wait: 1500 });
    const azioneConLink = await h.has('Azione rapida', true);
    await h.go('scanner');
    await scan(h, 'VIS-0142', { wait: 1500 });
    const azioneConSku = await h.has('Azione rapida', true);
    return { link, lettore, azioneConLink, azioneConSku };
  });

  // 2. Inserimento a mano del link GS1
  await run('ng-scanner-manuale-gs1', async (h) => {
    const link = (await prod(h, 'VIS-0142', 0)).gs1DigitalLink;
    await h.go('scanner');
    await h.click('Inserisci Manualmente');
    await h.page.getByPlaceholder('Es: SKU-001, 1234567890123').fill(link);
    await h.click('Cerca');
    return { azione: await h.has('Azione rapida', true) };
  });

  // 3. Vendita flash con il link GS1 (come farebbe un tag NFC o il QR della Scheda)
  await run('ng-vendita-gs1', async (h) => {
    const link = (await prod(h, 'VIS-0142', 0)).gs1DigitalLink;
    await h.go('automations/scan-sell');
    await h.click('Scansiona Prodotto');
    const lettore = await scan(h, link, { wait: 1500 });
    const prezzo = await h.page.getByPlaceholder('0.00').locator('visible=true').count();
    const testo = await h.page.evaluate(() => document.body.innerText.slice(0, 400).replace(/\n+/g, ' | '));
    return { lettore, campoPrezzo: prezzo, testo, status: (await prod(h, 'VIS-0142')).status };
  });

  // 4. Modifica: VIS-0142 (con link) resta uguale? PUZ-0012 (senza link) riceve un link? Sparisce l'etichetta?
  await run('ng-modifica-link', async (h) => {
    const out = {};
    const v0 = await prod(h, 'VIS-0142', 0);
    await openDetail(h, 'VIS-0142');
    await h.click('Modifica'); await h.page.waitForTimeout(800);
    await h.click('Salva Modifiche');
    const v1 = await prod(h, 'VIS-0142');
    out.vis = { prima: v0.gs1DigitalLink, dopo: v1.gs1DigitalLink, uguale: v0.gs1DigitalLink === v1.gs1DigitalLink };
    await h.go('');
    await h.page.getByText('PUZ-0012', { exact: true }).first().waitFor();
    const p0 = await prod(h, 'PUZ-0012', 0);
    await openDetail(h, 'PUZ-0012');
    out.etichettaPrima = await h.has('Mostra SKU QR');
    await h.click('Modifica'); await h.page.waitForTimeout(800);
    await h.click('Salva Modifiche');
    await h.page.waitForTimeout(1200);
    const p1 = await prod(h, 'PUZ-0012');
    out.puz = { prima: p0.gs1DigitalLink ?? null, dopo: p1.gs1DigitalLink ?? null };
    out.etichettaDopo = await h.has('Mostra SKU QR');
    out.cardGs1Dopo = await h.has('URL GS1 Digital Link');
    return out;
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'] });

  // 5. Seriale progressivo: Modifica di un prodotto senza link, poi Aggiungi -> stesso numero?
  await run('ng-progressivo-doppio', async (h) => {
    await h.go('settings/gs1-config');
    await h.click('Progressivo');
    await h.go('');
    await h.page.getByText('PUZ-0012', { exact: true }).first().waitFor();
    await openDetail(h, 'PUZ-0012');
    await h.click('Modifica'); await h.page.waitForTimeout(800);
    await h.click('Salva Modifiche');
    const puz = (await prod(h, 'PUZ-0012')).gs1DigitalLink;
    await h.go('add');
    await h.click('Visone');
    await h.click('Magazzino');
    await h.click('M');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1200);
    const prods = await h.products();
    const nuovo = prods.find((p) => !['VIS-0142', 'VOL-0087', 'LIN-0021', 'AST-0033', 'VIS-0098', 'PUZ-0012'].includes(p.sku));
    return { puz, nuovo: nuovo && { sku: nuovo.sku, link: nuovo.gs1DigitalLink }, config: await h.store(GS1, 0) };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'] });

  // 6. Si può spegnere il GS1? Dominio cancellato -> cosa si salva; seriale spento -> link in Aggiungi
  await run('ng-gs1-spegni', async (h) => {
    await h.go('settings/gs1-config');
    await input(h).fill('');
    await input(h).blur();
    await h.page.waitForTimeout(400);
    const dopoVuoto = await h.store(GS1, 300);
    const campo = await input(h).inputValue();
    await h.page.getByRole('switch').first().click(); // Seriale
    await h.page.waitForTimeout(400);
    const dopoSeriale = await h.store(GS1, 300);
    await h.go('add');
    await h.page.locator('input').first().fill('ABC 12/ü');
    await h.click('Visone');
    await h.click('Magazzino');
    await h.click('M');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1200);
    const nuovo = await prod(h, 'ABC 12/ü');
    return { dopoVuoto, campo, dopoSeriale, linkNuovo: nuovo && nuovo.gs1DigitalLink, skuSalvato: nuovo && nuovo.sku };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 7. Lotto con un campo scelto (Fornitore): link in Aggiungi; anteprima senza campo
  await run('ng-gs1-lotto', async (h) => {
    await h.go('settings/gs1-config');
    await h.page.getByRole('switch').nth(1).click(); // Lotto
    await h.page.waitForTimeout(400);
    const anteprimaSenzaCampo = await h.page.evaluate(() => (document.body.innerText.match(/https?:\/\/\S+\?10=\S+/) || [null])[0]);
    const candidati = await h.page.evaluate(() => document.body.innerText.match(/Campo Mappato[\s\S]{0,300}/)?.[0].replace(/\n+/g, ' | '));
    await h.click('Fornitore');
    const cfg = await h.store(GS1, 300);
    return { anteprimaSenzaCampo, candidati, cfg };
  });

  // 7b. Lotto acceso con Fornitore: la Modifica di VIS-0142 (Fornitore già scritto) cambia il link? E spegnendo il Lotto?
  await run('ng-lotto-modifica', async (h) => {
    const salva = async () => {
      await h.go('');
      await h.page.getByText('VIS-0142', { exact: true }).first().waitFor();
      await openDetail(h, 'VIS-0142');
      await h.click('Modifica'); await h.page.waitForTimeout(800);
      await h.click('Salva Modifiche');
      return (await prod(h, 'VIS-0142')).gs1DigitalLink;
    };
    const prima = (await prod(h, 'VIS-0142', 0)).gs1DigitalLink;
    await h.go('settings/gs1-config');
    await h.page.getByRole('switch').nth(1).click(); // Lotto acceso
    await h.page.waitForTimeout(400);
    await h.click('Fornitore');
    const cfg = await h.store(GS1, 300);
    const conLotto = await salva();
    await h.go('settings/gs1-config');
    await h.page.getByRole('switch').nth(1).click(); // Lotto spento
    await h.page.waitForTimeout(400);
    const cfg2 = await h.store(GS1, 300);
    const senzaLotto = await salva();
    return { prima, cfg, conLotto, cfg2, senzaLotto };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 8. Etichetta e PDF dalla Scheda (P27, D16)
  await run('ng-etichetta', async (h) => {
    const { page } = h;
    const out = {};
    await openDetail(h, 'VIS-0142');
    await stubs(page);
    out.vis = { pulsanteEtichetta: await h.has('Mostra SKU QR'), stampaEtichetta: await h.has('Stampa Etichetta'), programmaTag: await h.has('Programma tag') };
    await press(page, 'Stampa scheda PDF');
    await page.waitForTimeout(2000);
    out.vis.stampePdf = await page.evaluate(() => window.__prints);
    await h.go('');
    await page.getByText('PUZ-0012', { exact: true }).first().waitFor();
    await openDetail(h, 'PUZ-0012');
    await stubs(page);
    out.puz = { pulsanteEtichetta: await h.has('Mostra SKU QR'), programmaTag: await h.has('Programma tag') };
    await press(page, 'Mostra SKU QR');
    out.puz.finestra = await h.has('Codice Prodotto', true);
    await press(page, 'Stampa Etichetta', true);
    await page.waitForTimeout(1500);
    out.puz.stampeEtichetta = await page.evaluate(() => window.__prints);
    await h.shot('puz-etichetta');
    return out;
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 9. NFC sul web: Programma tag dalla Scheda
  await run('ng-nfc-scheda', async (h) => {
    await openDetail(h, 'VIS-0142');
    await press(h.page, 'Programma tag');
    await h.page.waitForTimeout(2500);
    return { schedaAncora: await h.has('Identità digitale GS1') };
  }, { dialogs: ['ok', 'ok'] });

  // 10. Scanner & NFC: «Solo NFC» cambia lo Scanner?
  await run('ng-hw-solo-nfc', async (h) => {
    await h.go('scanner');
    const prima = await h.page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 300));
    await h.go('settings/hardware');
    await h.click('Solo NFC');
    const cfg = await h.store(HW, 500);
    await h.go('scanner');
    const dopo = await h.page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 300));
    return { cfg, scannerUguale: prima === dopo, dopo };
  });

  // 11. Posizioni: il QR di un'altra riga cambia il codice nel modulo aperto?
  await run('ng-posizioni-qr', async (h) => {
    await h.go('settings/locations');
    const field = () => h.page.getByPlaceholder('Scansiona o Genera...');
    const nome = () => h.page.locator('input').first();
    // A: «Banco Uno» con codice; B: «Banco Due» con codice
    await nome().fill('Banco Uno'); await field().fill('LOC-UNO');
    await h.click('Crea Posizione');
    await nome().fill('Banco Due'); await field().fill('LOC-DUE');
    await h.click('Crea Posizione');
    await h.click('Banco Uno'); // modifica A
    const campoA = await field().inputValue();
    // icona QR della riga B: il pulsante premibile accanto al testo «LOC-DUE» nella riga
    const rowB = h.page.locator('[tabindex="0"]').filter({ hasText: 'Banco Due' }).locator('visible=true').first();
    const icons = rowB.locator('[tabindex="0"]');
    const n = await icons.count();
    await icons.first().click();
    await h.page.waitForTimeout(700);
    const finestra = await h.has('Codice Posizione', true);
    await h.page.mouse.click(10, 10); // chiude la finestra
    await h.page.waitForTimeout(500);
    const campoDopo = await field().inputValue();
    await h.click('Salva Modifiche');
    const locs = await h.store('furinventory_locations:local', 800);
    return { campoA, iconeRiga: n, finestra, campoDopo, uno: locs.find((l) => l.id === 'banco_uno'), due: locs.find((l) => l.id === 'banco_due') };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 12. Scaffale (copia di lavoro S1a): codice generato, QR, lettura nello Scanner
  await run('ng-scaffale-qr', async (h) => {
    const { page } = h;
    await h.go('settings/shelves');
    if (await h.has('Nuovo scaffale', true)) await page.getByLabel('Nuovo scaffale').first().click().catch(() => {});
    await page.waitForTimeout(500);
    await page.getByLabel('Nome').first().fill('A1');
    await page.getByLabel('Posizione Magazzino').first().click();
    await page.waitForTimeout(300);
    await page.getByLabel('Genera il codice').first().click();
    await page.waitForTimeout(300);
    const codice = await page.getByLabel('Codice dello scaffale').first().inputValue();
    await page.getByLabel('Tag NFC (facoltativo)').first().fill('04:A2:3B:1C');
    await page.getByLabel('Crea scaffale').first().click();
    await page.waitForTimeout(800);
    const salvati = await page.evaluate(() => Object.keys(localStorage).filter((k) => /shel|scaff/i.test(k)).map((k) => [k, localStorage.getItem(k).slice(0, 300)]));
    await page.getByLabel('Codice QR di A1').first().click();
    await page.waitForTimeout(500);
    const finestra = await page.evaluate(() => document.body.innerText.match(/Codice scaffale[\s\S]{0,120}/)?.[0].replace(/\n+/g, ' | '));
    const stampaNellaFinestra = await h.has('Stampa');
    await page.mouse.click(10, 10);
    await h.go('scanner');
    await scan(h, codice, { wait: 1500 });
    const conCodice = await h.has('SCAFFALE', true);
    await h.go('scanner');
    await scan(h, '04:A2:3B:1C', { wait: 1500 });
    const conTag = await h.has('SCAFFALE', true);
    return { codice, salvati, finestra, stampaNellaFinestra, conCodice, conTag };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });
})();
