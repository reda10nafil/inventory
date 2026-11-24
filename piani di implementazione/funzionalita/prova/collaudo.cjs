// Collaudo finale della mappa 3 (`../collaudo-finale.md`): un passo `CF-…` per riga del piano, gruppi A-H e Z sul
// web, gruppo T (telefono) solo come elenco «non provato». Nato con C2: ogni fetta, alla chiusura, scrive qui i suoi
// passi (funzione `fai`); i passi senza `fai` stampano «da fare» con la fetta che li rende verdi.
// Un passo è verde se l'azione riesce, lo stato salvato è quello atteso (letto da localStorage) e la console non ha
// errori (lib.cjs). Esce con 1 solo se un passo scritto è rosso.
// Uso (dalla cartella prova/, app su :8082 e campionario su :8765):
//   node collaudo.cjs              tutti i passi
//   node collaudo.cjs CF-A CF-B5   solo i passi che cominciano con uno dei prefissi
const { scenario, APP } = require('./lib.cjs');
const u = require('./c2-util.cjs');
const g = require('./gal-util.cjs');
const { textOf, press } = require('./a1-util.cjs');
const c = require('./cod-util.cjs');
const { scan, iconAt } = require('./a3-util.cjs');
const v = require('./val-util.cjs');

const goBacks = (page) => { const l = []; page.on('console', (m) => { if (/GO_BACK/.test(m.text())) l.push(m.text()); }); return l; };
const IN_BASSO = ['Indietro', 'Annulla', 'Torna Indietro', 'Chiudi'];
async function torna(h) {
  const chiudi = h.page.locator('[aria-label="Chiudi i valori di Tipo di pelle"]').locator('visible=true');
  if (await chiudi.count()) { await chiudi.first().click(); await h.page.waitForTimeout(500); }
  let tocco = await u.toccaIndietro(h.page);
  for (const t of IN_BASSO) { if (tocco) break; if (await h.has(t, true)) { await h.vis(t).click(); tocco = t; } }
  await h.page.waitForTimeout(1200);
  return tocco;
}
const apri = (i) => (i === 'scanner-action' ? 'scanner-action?type=product&id=cmp-1' : u.daAprire(i));

// ---- Passi scritti dalle fette ----

// CF-A2 (parti C2 e IND): ogni indirizzo di linking.ts aperto direttamente (= ricaricato) ha la freccia (o la X) che
// porta alla scheda madre senza GO_BACK, anche lo Scanner (IND-P4); tre voci del menu aperte e poi ricaricate; Team,
// Chat, Crea automazione senza NotFound; la Conta col tasto Indietro di sistema (sul web quello del browser, IND-P5):
// un passo indietro, poi la domanda e l'uscita.
async function cfA2(h) {
  const gb = goBacks(h.page);
  const rosse = [];
  let n = 0;
  for (const { indirizzo } of u.indirizzi()) {
    const atteso = u.PERCORSO_MADRE[u.MADRE[indirizzo]];
    const g0 = gb.length;
    await h.go(apri(indirizzo));
    const notFound = (await u.frecce(h.page)).notFound;
    const tocco = await torna(h);
    const dopo = u.percorso(h.page);
    n += 1;
    if (!tocco || dopo !== atteso || gb.length > g0 || notFound) rosse.push(`${indirizzo}: ${tocco || 'nessuna freccia'} → ${dopo} (atteso ${atteso}), GO_BACK ${gb.length - g0}${notFound ? ', NotFound' : ''}`);
  }
  // Dal menu, poi ricarica
  for (const [voce, indirizzo] of [['Categorie', '/settings/folders'], ['Campi Personalizzati', '/settings/fields'], ['Cestino', '/settings/trash']]) {
    await h.go('settings');
    await h.click(voce);
    const dalMenu = u.percorso(h.page);
    await h.page.reload(); await h.page.waitForTimeout(2200);
    const tocco = await torna(h);
    const dopo = u.percorso(h.page);
    n += 1;
    if (dalMenu !== indirizzo || !tocco || dopo !== '/settings') rosse.push(`menu ${voce}: ${dalMenu}, dopo la ricarica ${tocco || 'nessuna freccia'} → ${dopo}`);
  }
  for (const indirizzo of ['settings/team', 'chat', 'settings/automation-builder']) {
    await h.go(indirizzo);
    await h.page.reload(); await h.page.waitForTimeout(2200);
    n += 1;
    if (await h.has('Page Not Found', true)) rosse.push(`${indirizzo}: Page Not Found`);
  }
  // Scanner dai menu: la X torna ad Automazioni
  await h.go('');
  await h.tab('Automazioni');
  await h.page.evaluate((g) => [...document.querySelectorAll('div')].find((d) => d.childElementCount === 0 && d.textContent === g && d.offsetParent).click(), String.fromCodePoint(0xf206));
  await h.page.waitForTimeout(1200);
  const scanner = { aperto: u.percorso(h.page), tocco: await u.toccaIndietro(h.page) };
  await h.page.waitForTimeout(1200);
  scanner.dopo = u.percorso(h.page);
  n += 1;
  if (scanner.aperto !== '/scanner' || scanner.tocco !== 'X' || scanner.dopo !== '/automations') rosse.push(`Scanner dai menu: ${JSON.stringify(scanner)}`);
  // Conta dai menu con 3 pz scritti: il tasto del browser torna alla scelta della posizione (indirizzo uguale), la X
  // chiede «Uscire dalla conta?» e con OK esce ad Automazioni; nessuna rettifica scritta
  await h.page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('inventory:v1:local:products'));
    Object.assign(list.find((p) => p.sku === 'VIS-0098'), { unit: 'pz', stock: { magazzino: 5 }, location: 'magazzino' });
    localStorage.setItem('inventory:v1:local:products', JSON.stringify(list));
  });
  await h.go('');
  const domande = [];
  h.page.on('dialog', (d) => { if (/Uscire dalla conta/.test(d.message())) domande.push(d.message()); });
  await h.tab('Automazioni');
  await h.click('Conta Magazzino');
  await h.page.getByLabel('Conta Magazzino', { exact: true }).locator('visible=true').first().click(); await h.page.waitForTimeout(500);
  await h.page.getByLabel('Contata VIS-0098', { exact: true }).locator('visible=true').first().fill('3');
  await h.page.goBack(); await h.page.waitForTimeout(1500);
  const conta = { dopoIndietro: u.percorso(h.page), posizione: await h.page.getByLabel('Conta Magazzino', { exact: true }).locator('visible=true').count() };
  conta.tocco = await u.toccaIndietro(h.page); await h.page.waitForTimeout(1500);
  conta.dopo = u.percorso(h.page);
  conta.domande = domande.length;
  conta.rettifiche = (await h.timeline(0)).filter((e) => e.type === 'stock' && e.details.movement === 'rettifica').length;
  n += 1;
  if (conta.dopoIndietro !== '/automations/count' || conta.posizione !== 1 || conta.tocco !== 'X' || conta.dopo !== '/automations' || conta.domande !== 1 || conta.rettifiche)
    rosse.push(`Conta: ${JSON.stringify(conta)}`);
  return { ok: rosse.length === 0, controlli: n, goBack: gb.length, rosse, scanner, conta };
}

// CF-A3 (parte IND): avvio a freddo (database del browser vuoto, ricarica durante il primo avvio, come g2-loki.cjs) e
// giro delle 5 schede e di ogni indirizzo di linking.ts: 0 errori in console, **contando anche** «Deleting database
// failed» di LokiJS (lib.cjs lo filtra; da IND-P9 il database nasce solo alla prima card di prodotti della Chat).
async function cfA3(h) {
  const errori = [];
  h.page.on('console', (m) => { if (m.type() === 'error') errori.push(`${u.percorso(h.page)} ${m.text().slice(0, 140)}`); });
  h.page.on('pageerror', (e) => errori.push(`${u.percorso(h.page)} pageerror ${e.message.slice(0, 140)}`));
  await h.page.evaluate(() => Promise.all(['syncroflow', 'WatermelonIDBChecker'].map((nome) => new Promise((r) => {
    const q = indexedDB.deleteDatabase(nome); q.onsuccess = q.onerror = q.onblocked = () => r();
  }))));
  await h.page.goto(APP); await h.page.waitForTimeout(300);
  await h.page.reload(); await h.page.waitForTimeout(3000);
  const indirizzi = ['', 'timeline', 'automations', 'add', 'settings', ...u.indirizzi().map((r) => apri(r.indirizzo))];
  for (const i of indirizzi) await h.go(i);
  const loki = errori.filter((e) => /Deleting database failed/.test(e)).length;
  return { ok: errori.length === 0, schermate: indirizzi.length, errori: errori.slice(0, 5), loki, daFare: 'VOCI: voci «Prossimamente» rimaste senza decisione' };
}

// CF-B5: Campi › «Tipo di pelle»: aggiungere e rinominare un valore; voce «Tipi di pelle» assente da Impostazioni; i
// prodotti seguono il nome nuovo; un valore usato non si elimina.
async function cfB5(h) {
  const KEY = 'furinventory_categories:local';
  const PH = 'Es. Lapin, Castoro, Montone';
  const prodPrima = await h.products(0);
  const finestre = [];
  h.page.on('dialog', (d) => finestre.push(d.message().replace(/\n+/g, ' | ')));
  await h.go('settings');
  const voce = await h.has('Tipi di pelle', true);
  await h.click('Campi Personalizzati');
  await h.page.locator('[aria-label="Modifica i valori di Tipo di pelle"]').locator('visible=true').first().click(); await h.page.waitForTimeout(600);
  await h.page.getByPlaceholder(PH).fill('Lapin');
  await h.click('Aggiungi valore');
  await h.click('Volpe');
  await h.page.getByPlaceholder(PH).fill('Volpe rossa');
  await h.click('Salva nome');
  await h.page.locator('[aria-label="Elimina Volpe rossa"]').locator('visible=true').first().click(); await h.page.waitForTimeout(600);
  const salvata = await h.store(KEY, 800);
  const prodDopo = await h.products(0);
  await h.go('product/cmp-2'); // VOL-0087, volpe
  const scheda = await h.has('Tipo di pelle: Volpe rossa', true);
  const volpe = salvata && salvata.find((c) => c.id === 'volpe');
  const ok = !voce && volpe && volpe.label === 'Volpe rossa' && salvata.some((c) => c.id === 'lapin' && c.label === 'Lapin')
    && salvata.every((c) => Object.keys(c).sort().join() === 'id,label') && JSON.stringify(prodDopo) === JSON.stringify(prodPrima) && scheda
    && finestre.some((m) => m.includes('«Volpe» ora si chiama «Volpe rossa». Il prodotto che lo usa mostra il nome nuovo.'))
    && finestre.some((m) => m.includes('Il tipo di pelle "Volpe rossa" è usato da 1 prodotto.'));
  return { ok, voceInImpostazioni: voce, valori: salvata && salvata.map((c) => `${c.id}:${c.label}`), prodottiUguali: JSON.stringify(prodDopo) === JSON.stringify(prodPrima), scheda };
}

// CF-C1 (parte GAL): Aggiungi con 3 foto (scelta file del browser), salvare, aprire la Scheda dalla Home (senza
// ricaricare: sul web le foto aggiunte sono `blob:` e una ricarica le perde, P20 = fetta FOTO): miniature, frecce,
// puntini; la miniatura 3 mostra la foto 3; visore con frecce ed Esc. Resta a MCAT la categoria in testa ad Aggiungi.
async function cfC1(h) {
  const { page } = h;
  const seed = await (await fetch('http://localhost:8765/seed.json')).json();
  const foto = seed['inventory:v1:{org}:products'].find((p) => p.sku === 'VIS-0142').images;
  await h.go('add');
  const chooser = page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
  await h.click('Importa');
  const fc = await chooser;
  if (!fc) return { ok: false, filechooser: false };
  await fc.setFiles(foto.map((x, i) => ({ name: `foto${i + 1}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(x.split(',')[1], 'base64') })));
  await page.waitForTimeout(1500);
  await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
  await h.click("Aggiungi all'Inventario");
  const p = (await h.products())[0];
  const imgs = p.images || [];
  await h.tab('Home');
  await h.click(p.sku); await page.waitForTimeout(1200);
  const c = await g.centro(page);
  const vista = async () => `${await textOf(page, /^\d\/3$/)} ${g.quale(await g.fotoIn(page, c.x, c.y), imgs)}`;
  const out = { salvate: imgs.length, miniature: 0, puntini: 0 };
  for (let i = 1; i <= 3; i += 1) { out.miniature += await g.conta(page, `Mostra la foto ${i}`); out.puntini += await g.conta(page, `Vai alla foto ${i}`); }
  out.frecciaAvanti = await g.conta(page, 'Foto successiva');
  await g.tocca(page, 'Mostra la foto 3');
  out.miniatura3 = await vista();
  await g.tocca(page, 'Foto precedente');
  out.freccia = await vista();
  await page.mouse.click(c.x, c.y); await page.waitForTimeout(1300);
  const cv = await g.centro(page, true);
  out.visore = `${await textOf(page, /^\d \/ 3$/)} ${g.quale(await g.fotoIn(page, cv.x, cv.y), imgs)}`;
  await g.tocca(page, 'Foto successiva', true);
  out.visoreFreccia = `${await textOf(page, /^\d \/ 3$/)} ${g.quale(await g.fotoIn(page, cv.x, cv.y), imgs)}`;
  await page.keyboard.press('Escape'); await page.waitForTimeout(900);
  out.chiuso = !(await textOf(page, /^\d \/ 3$/));
  const ok = out.salvate === 3 && out.miniature === 3 && out.puntini === 3 && out.frecciaAvanti === 1 && out.miniatura3 === '3/3 foto 3'
    && out.freccia === '2/3 foto 2' && out.visore === '2 / 3 foto 2' && out.visoreFreccia === '3 / 3 foto 3' && out.chiuso;
  return { ok, ...out, daFare: 'MCAT: categoria «Borse» in testa ad Aggiungi, con i suoi campi' };
}

// CF-C3: Modifica di VIS-0142 (con percorsi cloud finti; le richieste a Supabase non escono dal browser): scegliere la
// foto 2, «Metti come principale», eliminare la foto 3 → principale la 2, restano 2 e 1, percorsi allineati
async function cfC3(h) {
  const { page } = h;
  const prima = (await h.products(0)).find((p) => p.id === 'cmp-1').images;
  const bloccate = await g.prepara(h, g.CON_PERCORSI, g.PERCORSI, { cloud: true });
  await g.openEdit(h);
  const passi = [await g.tocca(page, 'Mostra la foto 2')];
  await h.click('Metti come principale');
  passi.push(await g.tocca(page, 'Mostra la foto 3'), await g.tocca(page, 'Elimina la foto 3'));
  await h.click('Salva Modifiche', false);
  const p = (await h.products()).find((x) => x.id === 'cmp-1');
  const foto = p.images.map((x) => g.quale(x, prima));
  await h.go('product/cmp-1');
  const c = await g.centro(page);
  const scheda = `${await textOf(page, /^\d\/2$/)} ${g.quale(await g.fotoIn(page, c.x, c.y), prima)}`;
  const ok = passi.every(Boolean) && foto.join() === 'foto 2,foto 1' && JSON.stringify(p.storageImagePaths) === JSON.stringify([g.PERCORSI[1], g.PERCORSI[0]])
    && scheda === '1/2 foto 2';
  return { ok, foto, percorsi: p.storageImagePaths, scheda, richiesteSupabaseBloccate: bloccate.n };
}

// CF-C4 (parti GAL, COD e VAL): prezzo d'acquisto 0 (VIS-0098) mostrato bene nella Scheda, prima e dopo una Modifica
// senza cambiare nulla (resta 0, nessuna riga «Prezzo acquisto» in Cronologia); COD: dopo quella Modifica VIS-0098 resta
// senza link GS1 (NG02) e con lo stesso SKU; VIS-0142 con il lotto acceso in Impostazioni › GS1, Modifica senza
// cambiare nulla e poi con il peso cambiato: SKU e link identici (NG27). VAL: la Modifica senza cambi lascia i campi
// personalizzati identici (nessuna riscrittura); togliendo la Taglia (obbligatoria) la Modifica non salva.
async function cfC4(h) {
  const { page } = h;
  // COD: lotto acceso con un campo scelto, come in ng-lotto-modifica (il corpo gira nel browser prima di riaprire l'app)
  await g.prepara(h, "list.find((p) => p.id === 'cmp-5').purchasePrice = 0; localStorage.setItem('furinventory_gs1_config:local', JSON.stringify({ baseUrl: 'https://syncroflow.app/id', enableSerial: true, serialMode: 'uuid', enableLotto: true, lottoFieldId: 'field_cmp_fornitore' }));");
  const prezzi = () => g.prezziScheda(page);
  await h.click('VIS-0098'); await page.waitForTimeout(1200);
  const out = { prima: await prezzi() };
  await h.page.goBack(); await page.waitForTimeout(800);
  await g.openEdit(h, 'VIS-0098');
  out.campo = await page.getByPlaceholder('2500').locator('visible=true').first().inputValue();
  await h.click('Salva Modifiche', false);
  const p = (await h.products()).find((x) => x.id === 'cmp-5');
  out.salvato = p.purchasePrice;
  out.righe = (await h.timeline(0)).filter((e) => e.productId === 'cmp-5' && e.type === 'modified').map((e) => e.details.changes.join(' | '));
  await h.go('product/cmp-5');
  out.dopo = await prezzi();
  const zero = 'Prezzi Acquisto 0 € Vendita 3.800 €';
  const okGal = out.prima === zero && out.dopo === zero && out.campo === '0' && out.salvato === 0 && !out.righe.some((r) => /Prezzo acquisto/.test(r));
  // COD: codice e link
  out.vis0098 = { sku: p.sku, link: p.gs1DigitalLink ?? null };
  const v0 = (await h.products(0)).find((x) => x.id === 'cmp-1');
  await h.go(''); await page.getByText('VIS-0142', { exact: true }).first().waitFor();
  await g.openEdit(h, 'VIS-0142');
  await h.click('Salva Modifiche', false); await page.waitForTimeout(800);
  const v1 = (await h.products()).find((x) => x.id === 'cmp-1');
  await h.go(''); await page.getByText('VIS-0142', { exact: true }).first().waitFor();
  await g.openEdit(h, 'VIS-0142');
  await page.getByPlaceholder('1,2').locator('visible=true').first().fill('2,4');
  await h.click('Salva Modifiche', false); await page.waitForTimeout(800);
  const v2 = (await h.products()).find((x) => x.id === 'cmp-1');
  out.vis0142 = { prima: v0.gs1DigitalLink, senzaCambi: v1.gs1DigitalLink, conPeso: v2.gs1DigitalLink, peso: v2.weight, sku: v2.sku };
  const okCod = out.vis0098.sku === 'VIS-0098' && out.vis0098.link === null && v0.gs1DigitalLink === 'https://syncroflow.app/id/01/VIS-0142/21/000142'
    && v1.gs1DigitalLink === v0.gs1DigitalLink && v2.gs1DigitalLink === v0.gs1DigitalLink && v2.weight === 2.4 && v2.sku === 'VIS-0142';
  // VAL: campi personalizzati identici dopo le due Modifiche (né la Taglia «M» né «180» riscritti), poi la Taglia tolta
  const finestre = [];
  page.on('dialog', (d) => finestre.push(d.message().replace(/\n+/g, ' | ')));
  await v.openEdit(h, 'VIS-0142');
  await h.click('M');
  await press(page, /Salva Modifiche$/);
  const v3 = (await h.products()).find((x) => x.id === 'cmp-1');
  out.val = {
    campiUguali: JSON.stringify(v1.customData) === JSON.stringify(v0.customData) && JSON.stringify(v2.customData) === JSON.stringify(v0.customData),
    rifiuto: finestre.find((m) => /Compila anche/.test(m)) ?? null, taglia: v.valore(v3, 'field_cmp_taglia'), restaInModifica: /product\/edit/.test(page.url()),
  };
  const okVal = out.val.campiUguali && out.val.rifiuto === 'Campi obbligatori | Compila anche: Taglia' && out.val.taglia === 'M' && out.val.restaInModifica;
  return { ok: okGal && okCod && okVal, ...out };
}

// CF-E1 (COD): Scanner a mano con lo SKU, lo SKU in minuscolo, il link GS1 di VIS-0142 e lo stesso link con un altro
// dominio (un'etichetta già stampata); poi la fotocamera (lettura simulata) con il link. Ogni volta l'Azione rapida di
// VIS-0142 e un evento «scansionato» in più (P26: anche dalla fotocamera).
async function cfE1(h) {
  await c.prepara(h);
  const link = (await c.prodotto(h, 'VIS-0142')).gs1DigitalLink;
  const out = {};
  for (const [k, code] of [['sku', 'VIS-0142'], ['minuscolo', 'vis-0142'], ['link', link], ['altroDominio', 'https://esempio.it/01/VIS-0142/21/000142']]) {
    await c.aMano(h, code);
    out[k] = await c.aperto(h);
  }
  await h.go('scanner');
  await scan(h, link, { wait: 1500 });
  out.fotocamera = await c.aperto(h);
  const scansionati = (await c.eventi(h, 'cmp-1', 'scanned', 800)).length;
  return { ok: Object.values(out).every((v) => v === 'prodotto VIS-0142') && scansionati === 5, ...out, scansionati };
}

// CF-E2 (COD): Scanner a mano con il codice di una posizione, dello scaffale A1 (anche il suo tag NFC), di una categoria;
// il codice di A1 come destinazione dello Spostamento rapido (vale la sua posizione, Magazzino); poi nessun codice doppio
// accettato: una posizione con il codice di A1, una categoria con quello di una posizione, A1 con quello di una categoria.
async function cfE2(h) {
  const { page } = h;
  await c.prepara(h);
  const out = {};
  for (const [k, code] of [['posizione', 'LOC-MAGAZZINO'], ['scaffale', 'SCAF-MAG-A1'], ['tag', '04:A2:3B:1C'], ['categoria', 'LIB-PELLICCE']]) {
    await c.aMano(h, code);
    out[k] = await c.aperto(h);
  }
  await h.go('automations/batch-move');
  await h.click('Scansiona Posizione');
  await c.leggi(h, 'SCAF-MAG-A1');
  out.destinazione = (await c.testo(h)).match(/Destinazione Attuale: (\S+)/)?.[1] ?? null;
  await h.click('Scansiona Prodotto');
  await c.leggi(h, 'PUZ-0012');
  out.spostato = (await c.prodotto(h, 'PUZ-0012', 500)).location;
  const visti = [];
  page.on('dialog', (d) => visti.push(d.message()));
  // Posizione Vetrina con il codice di A1
  await h.go('settings/locations');
  await h.click('Vetrina');
  await page.getByPlaceholder('Scansiona o Genera...').locator('visible=true').first().fill('SCAF-MAG-A1');
  await h.click('Salva Modifiche');
  // Categoria Pellicce con il codice di Magazzino
  await h.go('settings/folders');
  await page.locator('[tabindex="0"]').filter({ hasText: 'ID: pellicce' }).locator('visible=true').first().click(); await page.waitForTimeout(400);
  await page.getByPlaceholder('Scansiona o Genera...').locator('visible=true').first().fill('LOC-MAGAZZINO');
  await h.click('Salva Modifiche');
  // Scaffale A1 con il codice di Pellicce
  await h.go('settings/shelves');
  await page.getByLabel('Modifica scaffale A1').locator('visible=true').first().click(); await page.waitForTimeout(400);
  await page.getByLabel('Codice dello scaffale').locator('visible=true').first().fill('LIB-PELLICCE');
  await page.getByLabel('Salva scaffale').locator('visible=true').first().click(); await page.waitForTimeout(700);
  out.rifiutati = visti.filter((m) => /è già usato/.test(m)).length;
  const locs = await h.store(c.LOC, 300);
  const libs = await h.store(c.LK, 0);
  const shelves = await h.store(c.SK, 0);
  out.salvati = { vetrina: locs.find((l) => l.id === 'vetrina').barcode ?? null, pellicce: libs.find((l) => l.id === 'pellicce').barcode, a1: shelves[0].barcode };
  const ok = out.posizione === 'posizione Magazzino' && out.scaffale === 'scaffale A1' && out.tag === 'scaffale A1' && out.categoria === 'categoria Pellicce'
    && out.destinazione === 'Magazzino' && out.spostato === 'magazzino' && out.rifiutati === 3
    && out.salvati.vetrina === 'LOC-VETRINA' && out.salvati.pellicce === 'LIB-PELLICCE' && out.salvati.a1 === 'SCAF-MAG-A1';
  return { ok, ...out };
}

// CF-E3 (parti COD ed ESE): il link di VIS-0142 scritto nel lettore («Scrivi il codice») è riconosciuto nelle 5
// automazioni (Vendita flash, Tagging, Spostamento rapido, Audit, Esecuzione); PUZ-0012 nel cestino è rifiutato in tutte
// con il messaggio e i suoi dati non cambiano. ESE: nell'esecuzione i rifiuti si dicono e non contano un'azione.
async function cfE3(h) {
  const { page } = h;
  await c.prepara(h, { cestino: true });
  const link = (await c.prodotto(h, 'VIS-0142')).gs1DigitalLink;
  const visti = [];
  page.on('dialog', (d) => visti.push(d.message()));
  const fab = async () => { const b = (await iconAt(h)).sort((a, z) => z.y - a.y)[0]; await page.mouse.click(b.x, b.y); await page.waitForTimeout(700); };
  const out = { riconosciuto: {}, cestino: {} };
  const puz0 = await c.prodotto(h, 'PUZ-0012');
  // Vendita flash
  await h.go('automations/scan-sell'); await h.click('Scansiona Prodotto');
  await c.leggi(h, link);
  out.riconosciuto.venditaFlash = (await page.getByPlaceholder('0.00').locator('visible=true').count()) > 0;
  await h.go('automations/scan-sell'); await h.click('Scansiona Prodotto');
  await c.leggi(h, 'PUZ-0012');
  out.cestino.venditaFlash = visti.some((m) => /nel cestino/.test(m));
  // Tagging
  await h.go('automations/quick-tag'); await h.click('Da Pulire'); await h.click('Scansiona Prodotto');
  // il link e subito dopo il prodotto nel cestino (con «Scrivi il codice» non c'è la pausa della fotocamera): il
  // messaggio del rifiuto deve restare, anche se quello della lettura prima scade nel frattempo
  await c.leggi(h, link);
  await c.leggi(h, 'PUZ-0012', { wait: 300 });
  out.cestino.tagging = /PUZ-0012 è nel cestino/.test(await c.testo(h));
  out.riconosciuto.tagging = ((await c.prodotto(h, 'VIS-0142', 500)).technicalNotes || '').includes('[Da Pulire]');
  // Spostamento rapido
  await h.go('automations/batch-move'); await h.click('Magazzino'); await h.click('Scansiona Prodotto');
  await c.leggi(h, link);
  await c.leggi(h, 'PUZ-0012', { wait: 300 });
  out.cestino.spostamento = /PUZ-0012 è nel cestino/.test(await c.testo(h));
  out.riconosciuto.spostamento = (await c.prodotto(h, 'VIS-0142', 500)).location === 'magazzino';
  // Audit (Magazzino: VIS-0142 ora è lì)
  await h.go('automations/audit'); await h.click('Magazzino'); await fab();
  await c.leggi(h, link, { wait: 1200 });
  out.riconosciuto.audit = /Trovati:\s*1/.test(await c.testo(h));
  if (!(await h.has('Scrivi il codice', true))) await fab(); // dopo un trovato il lettore si riapre da solo
  const prima = visti.length;
  await c.leggi(h, 'PUZ-0012', { wait: 800 });
  out.cestino.audit = visti.slice(prima).some((m) => /nel cestino/.test(m));
  // Esecuzione (automazione personale: Scansiona Prodotto, Tag «Visto»)
  await h.go('automations/custom-runner/auto_tag'); await c.ultima(h, 'Scansiona Prodotto');
  await c.leggi(h, 'PUZ-0012', { wait: 300 });
  out.cestino.esecuzione = /PUZ-0012 è nel cestino/.test(await c.testo(h));
  await page.waitForTimeout(2200);
  await c.leggi(h, link, { wait: 1200 });
  out.riconosciuto.esecuzione = ((await c.prodotto(h, 'VIS-0142', 800)).technicalNotes || '').includes('[Visto]');
  // Parte ESE: nell'esecuzione un rifiuto si dice e non si conta. Il cestino prima del link: 1 azione sola (il tag di
  // VIS-0142); un capo già venduto (VOL-0087) non apre la finestra del prezzo, il motivo si legge e il contatore resta 0
  const azioni = async () => (await c.testo(h)).match(/(\d+) azioni completate/)?.[1] ?? null;
  out.ese = { azioniDopoCestinoELink: await azioni() };
  await page.evaluate(([k]) => {
    const list = JSON.parse(localStorage.getItem(k) || '[]');
    list.push({ id: 'auto_vendi', name: 'auto_vendi', icon: 'sell', color: '#EF4444', description: '', qrValue: 'AUTO:auto_vendi', createdAt: '2026-11-23T00:00:00Z', usageCount: 0,
      steps: [{ id: 's1', order: 0, type: 'scan_product', config: {}, label: 'Scansiona Prodotto' }, { id: 's2', order: 1, type: 'mark_sold', config: { pricePrompt: true }, label: 'Vendi (con conferma prezzo)' }] });
    localStorage.setItem(k, JSON.stringify(list));
  }, [c.AK]);
  const vol0 = await c.prodotto(h, 'VOL-0087');
  await h.go('automations/custom-runner/auto_vendi'); await c.ultima(h, 'Scansiona Prodotto');
  await c.leggi(h, 'VOL-0087', { wait: 700 });
  out.ese.finestraPrezzo = (await page.getByPlaceholder('0.00').locator('visible=true').count()) > 0;
  out.ese.motivo = /VOL-0087 risulta già venduto/.test(await c.testo(h));
  out.ese.azioniDopoVenduto = await azioni();
  const vol = await c.prodotto(h, 'VOL-0087', 500);
  out.ese.volInvariato = vol.soldAt === vol0.soldAt && vol.sellPrice === vol0.sellPrice;
  const puz = await c.prodotto(h, 'PUZ-0012');
  out.puzInvariato = puz.technicalNotes === puz0.technicalNotes && puz.location === puz0.location && puz.status === puz0.status;
  const okEse = out.ese.azioniDopoCestinoELink === '1' && !out.ese.finestraPrezzo && out.ese.motivo && out.ese.azioniDopoVenduto === '0' && out.ese.volInvariato;
  const ok = Object.values(out.riconosciuto).every(Boolean) && Object.values(out.cestino).every(Boolean) && out.puzInvariato && okEse;
  return { ok, ...out };
}

// CF-F7 (ESE): un'automazione personale fatta dal costruttore come l'utente, [Scansiona Prodotto, Tag «Controllato»,
// Tag «Da Pulire», Imposta Campo Condizione = Buono, Vendi con conferma], eseguita su AST-0033 con il prezzo «1300,50»
// scritto con la virgola. Tre note presenti (la nota che AST-0033 aveva già e i due tag), Condizione in `customData` con
// la scheda del campo, prezzo 1300,5 nel prodotto e nell'evento «venduto», 4 azioni. Poi un'automazione che non inizia
// con una lettura non si salva («Flusso da correggere»).
async function cfF7(h) {
  const { page } = h;
  const visti = [];
  page.on('dialog', (d) => visti.push(d.message().replace(/\s+/g, ' ')));
  const nuovoPasso = async (tipo) => { await h.click('Aggiungi Step'); await c.ultima(h, tipo); };
  await h.tab('Automazioni');
  await h.click('Crea Nuova');
  await page.getByPlaceholder('Es. Scarico Merci').fill('Controllo e vendita');
  await nuovoPasso('Scansiona Prodotto');
  for (const tag of ['Controllato', 'Da Pulire']) {
    await nuovoPasso('Aggiungi Tag');
    await page.getByPlaceholder('Es. Da Pulire').fill(tag);
    await c.ultima(h, 'Aggiungi');
  }
  await nuovoPasso('Imposta Campo');
  await c.ultima(h, 'Condizione');
  await c.ultima(h, 'Buono');
  await c.ultima(h, 'Aggiungi');
  await nuovoPasso('Segna Venduto'); // «Chiedi conferma prezzo» già spuntata
  await c.ultima(h, 'Aggiungi');
  await h.click('Salva');
  const salvate = (await h.store(c.AK)) || [];
  const passi = (salvate[0]?.steps || []).map((s) => s.label);
  // Esecuzione su AST-0033 (In sartoria, con una nota)
  const ast0 = await c.prodotto(h, 'AST-0033');
  await h.click('Controllo e vendita');
  await h.click('Avvia Automazione');
  await c.ultima(h, 'Scansiona Prodotto');
  await c.leggi(h, 'AST-0033', { wait: 1500 });
  await page.getByPlaceholder('0.00').locator('visible=true').first().fill('1300,50');
  await h.click('CONFERMA');
  await page.waitForTimeout(1200);
  const azioni = (await c.testo(h)).match(/(\d+) azioni completate/)?.[1] ?? null;
  const ast = await c.prodotto(h, 'AST-0033', 600);
  const cond = (ast.customData || []).find((d) => d.fieldSnapshot?.id === 'field_cmp_cond');
  const venduto = (await c.eventi(h, ast.id, 'sold')).map((e) => e.details.finalPrice);
  const note = (ast.technicalNotes || '').split('\n');
  // Automazione senza lettura iniziale: non si salva
  await h.go('automations');
  await h.click('Crea Nuova');
  await page.getByPlaceholder('Es. Scarico Merci').fill('Senza lettura');
  await nuovoPasso('Aggiungi Tag');
  await page.getByPlaceholder('Es. Da Pulire').fill('Visto');
  await c.ultima(h, 'Aggiungi');
  await h.click('Salva');
  const dopo = ((await h.store(c.AK)) || []).map((a) => a.name);
  const out = {
    passi, note, condizione: cond?.value ?? null, schedaCondizione: cond?.fieldSnapshot?.name ?? null, sellPrice: ast.sellPrice,
    status: ast.status, venduto, azioni, salvateDopoSenzaLettura: dopo,
    flussoDaCorreggere: visti.some((m) => /Flusso da correggere Il primo passo deve essere una lettura/.test(m)),
  };
  const ok = passi.join('|') === 'Scansiona Prodotto|Aggiungi Tag: Controllato|Aggiungi Tag: Da Pulire|Imposta Condizione = Buono|Vendi (con conferma prezzo)'
    && note.length === 3 && note[0] === ast0.technicalNotes && note[1] === '[Controllato]' && note[2] === '[Da Pulire]'
    && out.condizione === 'opt_2' && out.schedaCondizione === 'Condizione' && ast.sellPrice === 1300.5 && ast.status === 'sold'
    && venduto.length === 1 && venduto[0] === 1300.5 && azioni === '4'
    && dopo.length === 1 && dopo[0] === 'Controllo e vendita' && out.flussoDaCorreggere;
  return { ok, ...out };
}

// CF-B3 (parte VAL): un'opzione usata e rinominata dall'editor dei valori (Campi › Taglia, «M» → «Media»): i prodotti
// che l'avevano non si riscrivono, mostrano «Media» nella Scheda e in Modifica resta scelta; gli id delle opzioni non
// cambiano. Restano a EDC «Colore» con pillole, colori e icona, «Larghezza» con la ruota, la compilazione veloce.
async function cfB3(h) {
  const prima = await h.products(0);
  await v.matita(h, 'Taglia');
  await v.rinomina(h, 'M', 'Media');
  await h.click('Aggiorna');
  const taglia = (await h.store(v.CF)).find((f) => f.id === 'field_cmp_taglia');
  const dopo = await h.products(0);
  const schede = {
    vis0142: (await v.scheda(h, 'cmp-1', [['Taglia', 5]])).Taglia,
    vis0098: (await v.scheda(h, 'cmp-5', [['Taglia', 5]])).Taglia,
  };
  await v.openEdit(h, 'VIS-0098');
  const inModifica = await v.scelti(h.page, ['XS', 'S', 'Media', 'L', 'XL']);
  const out = {
    opzioni: (taglia.options || []).map((o) => `${o.id}:${o.label}`).join(), prodottiUguali: JSON.stringify(dopo) === JSON.stringify(prima), schede, inModifica,
  };
  const ok = out.opzioni === 'opt_0:XS,opt_1:S,opt_2:Media,opt_3:L,opt_4:XL' && out.prodottiUguali && schede.vis0142 === 'Media' && schede.vis0098 === 'Media'
    && inModifica.join() === 'Media';
  return { ok, ...out, daFare: 'EDC: «Colore» con pillole, colori e icona, «Larghezza» con la ruota, compilazione veloce in Aggiungi, icone e colori nella Scheda' };
}

// ---- CF-D (parti S2, corsia B, 24/11): ripiano A1 con misure, riempimento a colori, barra da 15 grucce ----
// Il blocco del prodotto che non entra e del pezzo in più (CF-D3, CF-D4, il 16° capo di CF-D5) è di S3; codice ed
// etichetta di A1 con Stampa (CF-D1) di ETI.
const S2_SHELVES = 'furinventory_shelves:local';
const s2Label = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
const s2Barre = (h) => h.page.evaluate(() => [...document.querySelectorAll('[data-testid^="riempimento-"]')]
  .filter((e) => e.getClientRects().length > 0)
  .map((e) => ({ etichetta: e.getAttribute('aria-label'), fascia: e.getAttribute('data-testid').replace('riempimento-', ''), colore: getComputedStyle(e.firstElementChild.firstElementChild).backgroundColor })));
/** Scaffali salvati e VIS-0098 a quantità in Magazzino (1 pz, senza peso né misure: conta solo i pezzi), poi ricarica. */
async function s2Prepara(h, shelves) {
  await h.page.evaluate(([sk, shelves]) => {
    localStorage.setItem(sk, JSON.stringify(shelves));
    const pk = 'inventory:v1:local:products';
    const list = JSON.parse(localStorage.getItem(pk));
    const p = list.find((x) => x.sku === 'VIS-0098');
    Object.assign(p, { stock: { magazzino: 1 }, unit: 'pz', location: 'magazzino' });
    for (const k of ['shelfId', 'weight', 'length', 'width']) delete p[k];
    localStorage.setItem(pk, JSON.stringify(list));
  }, [S2_SHELVES, shelves]);
  await h.go('');
}
async function s2Carico(h, sku, posto, qty) {
  await h.go(''); await h.click(sku); await h.page.waitForTimeout(800);
  await s2Label(h, 'Movimenta').click(); await h.page.waitForTimeout(500);
  await s2Label(h, 'Tipo Carico').click();
  await s2Label(h, 'In Magazzino').click();
  await s2Label(h, `In Magazzino › ${posto}`).click();
  await h.page.locator('input[placeholder^="es. 2,5"]').locator('visible=true').first().fill(String(qty));
  await s2Label(h, 'Registra movimento').click(); await h.page.waitForTimeout(900);
}

// CF-D1 (parte S2): categoria Borse, poi dal modulo il ripiano «A1» 50×50×30 cm, 10 kg, 20 pezzi in Magazzino, categoria
// Borse: salvato con le misure e il codice creato da solo (SCAF-MAGAZZINO-A1), nell'elenco con le misure e la barra a 0%
async function cfD1(h) {
  await h.go('settings/folders');
  await h.page.getByPlaceholder('Nome categoria (es: Giacche)').fill('Borse');
  await h.click('Crea Categoria');
  await h.go('settings/shelves');
  await s2Label(h, 'Nome').fill('A1');
  await s2Label(h, 'Posizione Magazzino').click();
  await s2Label(h, 'Categoria dello scaffale').click(); await h.page.waitForTimeout(300); // tendina (UX0)
  await s2Label(h, 'Categoria Borse').click();
  await s2Label(h, 'Tipo Ripiano').click();
  for (const [campo, valore] of [['Lunghezza', '50'], ['Profondità', '50'], ['Altezza', '30'], ['Peso massimo', '10'], ['Pezzi massimi', '20']]) await s2Label(h, campo).fill(valore);
  await s2Label(h, 'Crea scaffale').click(); await h.page.waitForTimeout(800);
  const salvato = ((await h.store(S2_SHELVES)) || [])[0] || {};
  const categoria = ((await h.store('inventory:v1:local:libraries', 0)) || []).find((c) => c.name === 'Borse');
  const riga = await s2Label(h, 'Modifica scaffale A1').evaluate((e) => e.innerText);
  const barre = await s2Barre(h);
  const ok = salvato.name === 'A1' && salvato.locationId === 'magazzino' && !!categoria && salvato.libraryId === categoria.id
    && salvato.length === 50 && salvato.depth === 50 && salvato.height === 30 && salvato.maxWeight === 10 && salvato.maxPieces === 20 && !salvato.kind
    && salvato.barcode === 'SCAF-MAGAZZINO-A1' && riga.includes('Base 50 × 50 cm, alta 30 cm · fino a 10 kg · fino a 20 pezzi')
    && barre.length === 1 && barre[0].etichetta === 'Riempimento A1: 0%' && barre[0].fascia === 'verde';
  return { ok, salvato: { ...salvato, id: undefined, createdAt: undefined }, riga, barre, daFare: 'finestra «Codice ed etichetta» con Stampa dopo la creazione (ETI)' };
}

// CF-D2: su A1 (20 pezzi) si caricano con Movimenta 10, poi 6, poi 4 pezzi: 50% verde, 80% blu, «Pieno» rosso, ognuno col
// colore del suo ruolo del tema (tre colori diversi); la Scheda dice quanti ne entrano ancora
async function cfD2(h) {
  const a1 = { id: '1732300000000-cfd1', name: 'A1', locationId: 'magazzino', length: 50, depth: 50, height: 30, maxWeight: 10, maxPieces: 20 };
  await s2Prepara(h, [a1]);
  const passi = [];
  for (const qty of [10, 6, 4]) {
    await s2Carico(h, 'VIS-0098', 'A1', qty);
    const scheda = await h.page.evaluate(() => (document.body.innerText.match(/Su A1 [^\n]*/) || [null])[0]);
    await h.go('settings/shelves');
    const [b] = await s2Barre(h);
    passi.push({ ...b, scheda });
  }
  const stock = ((await h.products(0)).find((p) => p.sku === 'VIS-0098') || {}).stock;
  const atteso = [['Riempimento A1: 50%', 'verde'], ['Riempimento A1: 80%', 'blu'], ['Riempimento A1: Pieno', 'rosso']];
  const ok = passi.length === 3 && passi.every((p, i) => p.etichetta === atteso[i][0] && p.fascia === atteso[i][1])
    && new Set(passi.map((p) => p.colore)).size === 3 && passi[0].scheda === 'Su A1 ne entrano ancora 10 come questo'
    && passi[2].scheda === 'Su A1 non ne entrano altri: pezzi al massimo' && !!stock && stock[`magazzino/${a1.id}`] === 20;
  return { ok, passi, stock };
}

// CF-D5 (parte S2): dal modulo la barra appendiabiti da 15 grucce (Magazzino); 15 capi appesi con Movimenta: «Pieno», 0
// grucce libere, la Scheda dice che non ne entrano altri
async function cfD5(h) {
  await s2Prepara(h, []);
  await h.go('settings/shelves');
  await s2Label(h, 'Nome').fill('Barra giacche');
  await s2Label(h, 'Posizione Magazzino').click();
  await s2Label(h, 'Tipo Barra appendiabiti').click(); await h.page.waitForTimeout(300);
  const senzaLati = !(await h.page.getByLabel('Lunghezza', { exact: true }).locator('visible=true').count());
  await s2Label(h, 'Grucce massime').fill('15');
  await s2Label(h, 'Crea scaffale').click(); await h.page.waitForTimeout(800);
  const salvata = ((await h.store(S2_SHELVES)) || [])[0] || {};
  await s2Carico(h, 'VIS-0098', 'Barra giacche', 15);
  const scheda = await h.page.evaluate(() => (document.body.innerText.match(/Su Barra giacche [^\n]*/) || [null])[0]);
  await h.go('settings/shelves');
  const riga = await s2Label(h, 'Modifica scaffale Barra giacche').evaluate((e) => e.innerText);
  const [b] = await s2Barre(h);
  const ok = salvata.kind === 'barra' && salvata.maxPieces === 15 && senzaLati && !!b && b.etichetta === 'Riempimento Barra giacche: Pieno'
    && b.fascia === 'rosso' && riga.includes('Liberi: 0 grucce') && scheda === 'Su Barra giacche non ne entrano altri: pezzi al massimo';
  return { ok, salvata: { ...salvata, id: undefined, createdAt: undefined }, senzaLati, barra: b, riga, scheda, daFare: 'il 16° capo bloccato con la proposta di un altro scaffale (S3)' };
}

// ---- Tutti i passi del piano (collaudo-finale.md) ----
const PASSI = [
  ['CF-A1', 'Icone visibili nelle schermate principali, nei 5 stili', 'nessuna (controllo; d-icone.cjs)'],
  ['CF-A2', 'Ogni indirizzo di linking.ts dal menu, ricaricato, aperto direttamente: freccia, scheda madre, 0 GO_BACK; Team, Chat, Crea automazione senza NotFound', 'C2, IND', cfA2],
  ['CF-A3', 'Avvio a freddo e giro di tutte le schermate: 0 errori in console; nessuna voce «Prossimamente» senza decisione', 'IND, VOCI', cfA3],
  ['CF-B1', 'Categoria «Borse» con la sottocategoria «Borse › Zaini»', 'C1 (fatta, passo da scrivere)'],
  ['CF-B2', 'Modulo di «Borse» da un Modello di settore', 'MCAT'],
  ['CF-B3', 'Campo «Colore» (pillole, colori, icona) e «Larghezza» (ruota); rinomina di un\'opzione usata', 'VAL, EDC', cfB3],
  ['CF-B4', 'Modulo di «Borse»: nascondere, sezione, uscire senza salvare, salvare', 'MOD, MCAT'],
  ['CF-B5', 'Campi › «Tipo di pelle»: aggiungere e rinominare un valore; voce assente da Impostazioni; valore usato non eliminabile', 'C2', cfB5],
  ['CF-C1', 'Aggiungi con categoria in testa e 3 foto; Scheda con galleria e visore', 'MCAT, GAL', cfC1],
  ['CF-C2', 'Ricaricare la pagina: le 3 foto ci sono ancora', 'FOTO'],
  ['CF-C3', 'Modifica: foto principale, eliminare la foto 3', 'GAL', cfC3],
  ['CF-C4', 'Modifica senza cambiare nulla, poi cambio di un campo', 'COD, VAL, GAL', cfC4],
  ['CF-D1', 'Ripiano «A1» con misure, peso e pezzi', 'S1a, S2, ETI', cfD1],
  ['CF-D2', 'Riempimento al 50%, 80%, 100%', 'S2', cfD2],
  ['CF-D3', 'Prodotto troppo grande, troppo pesante, pezzo in più: blocco e proposta', 'S3'],
  ['CF-D4', 'Stesso carico da tutti i punti di carico', 'S3'],
  ['CF-D5', 'Barra appendiabiti da 15 grucce, 16° capo', 'S2, S3', cfD5],
  ['CF-E1', 'Scanner con SKU, SKU minuscolo, vecchio link GS1', 'COD', cfE1],
  ['CF-E2', 'Scanner con i codici di posizione, scaffale, categoria; nessun codice doppio', 'COD', cfE2],
  ['CF-E3', 'Le 5 automazioni con lo stesso codice di prodotto', 'COD, ESE', cfE3],
  ['CF-E4', '«Codice ed etichetta» di un prodotto e di A1: Stampa', 'ETI'],
  ['CF-E5', 'Impostazioni › Codici ed etichette, vuote e con una configurazione GS1 vecchia', 'GS1'],
  ['CF-E6', 'Impostazioni › Scanner e NFC sul web: «Non disponibile sul web»', 'N1'],
  ['CF-F1', 'Ricevimento da un fornitore: 3 articoli in Magazzino › A1', 'FLU1'],
  ['CF-F2', 'Uscita a un cliente con quantità e prezzo', 'FLU1'],
  ['CF-F3', 'Trasferimento di 2 pezzi su 5', 'FLU1'],
  ['CF-F4', 'Conta col lettore; Audit uscendo e rientrando', 'CON'],
  ['CF-F5', '«Da riordinare» › «Ricevi»', 'RIO'],
  ['CF-F6', 'Reso di un articolo a quantità e di un pezzo unico venduto', 'RES'],
  ['CF-F7', 'Automazione personale [Scansiona, Tag, Tag, Imposta campo, Vendi]', 'ESE', cfF7],
  ['CF-F8', 'Costruttore: passi Carico e «Chiedi conferma», riordino', 'FLU2, ESE'],
  ['CF-G1', 'Esporta inventario: BOM, una colonna per campo, avviso foto', 'EXP'],
  ['CF-G2', 'Import di un CSV «;» con abbinamento, «+ Crea campo», rifiutate', 'IMP'],
  ['CF-G3', 'Esportare e reimportare in uno spazio vuoto', 'EXP, IMP'],
  ['CF-H1', 'Home con Team e Chat; Chat senza colleghi; card giuste', 'CHAT1'],
  ['CF-H2', 'Selezione › «Invia» a un collega › «Ricevuto, sposta»', 'RIC1'],
  ['CF-H3', 'Automazioni «Invia a collega», «Ricevi», condivise', 'RIC2, RIC3'],
  ['CF-Z', 'La catena intera (Borse, modello, campo, foto, scaffale, etichetta, codice, export, import)', 'MCAT, EDC, GAL, FOTO, S3, ETI, COD, ESE, EXP, IMP'],
];
const TELEFONO = [
  ['CF-T1', 'Tasto Indietro di sistema, link syncroflow:// ad app chiusa, icone su APK in modalità aereo', 'C2, IND'],
  ['CF-T2', 'Fotocamera e NFC nello Scanner e nelle automazioni', 'COD, N1, N2'],
  ['CF-T3', 'Scaffale A1 con un tag NFC', 'ETI, N1'],
  ['CF-T4', 'Stampa di etichetta e PDF in modalità aereo', 'ETI, EDC'],
  ['CF-T5', 'Foto da galleria e fotocamera dopo «Svuota cache»', 'FOTO, GAL'],
  ['CF-T6', 'Due o tre telefoni sullo stesso modem senza internet', 'CHAT1, RETE1, RETE2, RIC1, RIC2'],
  ['CF-T7', 'Export CSV aperto in Excel; import da Excel sul telefono', 'EXP, IMP'],
  ['CF-T8', 'Login Google e passaggio dei dati locali', 'L1, L2'],
];

(async () => {
  const prefissi = process.argv.slice(2);
  const scelto = (id) => !prefissi.length || prefissi.some((p) => id.startsWith(p));
  const righe = [];
  let rossi = 0;
  for (const [id, cosa, fetta, fai] of PASSI.filter(([id]) => scelto(id))) {
    if (!fai) { righe.push(`${id}  da fare (${fetta}) — ${cosa}`); continue; }
    const r = await scenario(id, fai, { dialogs: Array(12).fill('ok') });
    const verde = r.result && r.result.ok === true && r.errors.length === 0;
    if (!verde) rossi += 1;
    righe.push(`${id}  ${verde ? 'VERDE' : 'ROSSO'} (${fetta}) — ${cosa}${verde ? '' : `\n        ${JSON.stringify(r.result).slice(0, 600)}${r.errors.length ? ` | console: ${JSON.stringify(r.errors).slice(0, 300)}` : ''}`}${r.result && r.result.daFare ? `\n        resta da fare: ${r.result.daFare}` : ''}`);
  }
  for (const [id, cosa, fetta] of TELEFONO.filter(([id]) => scelto(id))) righe.push(`${id}  non provato (telefono; ${fetta}) — ${cosa}`);
  const scritti = PASSI.filter(([id, , , f]) => f && scelto(id)).length;
  console.log(`\n${righe.join('\n')}\n\npassi scritti ${scritti}, rossi ${rossi}; da fare ${PASSI.filter(([id, , , f]) => !f && scelto(id)).length}; telefono ${TELEFONO.filter(([id]) => scelto(id)).length} non provati`);
  process.exit(rossi ? 1 : 0);
})();
