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
const e = require('./edc-util.cjs');

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
  // RETE0: in più `settings/network`, l'indirizzo nuovo della Rete del negozio (`settings/team` è quello vecchio)
  for (const indirizzo of ['settings/team', 'settings/network', 'chat', 'settings/automation-builder']) {
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

// CF-B1 (C1, CAT1): «Borse» creata in cima a Impostazioni › Categorie, «Zaini» con «+ Sottocategoria» sulla riga di
// Borse (come l'utente, niente scritto a mano nello storage): albero giusto (Zaini rientrata sotto Borse); VIS-0142
// messo in «Borse › Zaini» da Modifica; nome completo nella Scheda; nell'Inventario «Borse» apre la seconda fila e
// «Zaini» filtra solo VIS-0142.
async function cfB1(h) {
  const L = 'inventory:v1:local:libraries';
  const lab = (t) => h.page.getByLabel(t, { exact: true }).locator('visible=true').first();
  const riga = async (id) => {
    const b = await h.page.locator('[tabindex="0"]').filter({ hasText: new RegExp(`ID: ${id}(?![\\w-])`) }).first().boundingBox();
    return b && { x: Math.round(b.x), y: Math.round(b.y) };
  };
  await h.go('settings/folders');
  await h.page.getByPlaceholder('Nome categoria (es: Giacche)').fill('Borse');
  await h.click('Crea Categoria');
  await eti.chiudiCodice(h); // ETI: al «OK» si apre «Codice ed etichetta» della categoria nuova
  await lab('Apri Borse').click(); await h.page.waitForTimeout(400);
  await lab('Aggiungi una sottocategoria a Borse').click(); await h.page.waitForTimeout(400);
  await lab('Nome della sottocategoria di Borse').fill('Zaini');
  await lab('Aggiungi la sottocategoria a Borse').click(); await h.page.waitForTimeout(600);
  const libs = await h.store(L);
  const borse = libs.find((l) => l.name === 'Borse');
  const zaini = libs.find((l) => l.name === 'Zaini');
  const albero = { borse: await riga('borse'), zaini: await riga('zaini') };
  const rientrata = !!albero.borse && !!albero.zaini && albero.zaini.y > albero.borse.y && albero.zaini.x > albero.borse.x;
  await v.openEdit(h, 'VIS-0142');
  await lab('Categoria Borse').click(); await h.page.waitForTimeout(300);
  await lab('Sottocategoria Zaini').click(); await h.page.waitForTimeout(300);
  await h.click('Salva Modifiche');
  const vis = (await h.products()).find((p) => p.sku === 'VIS-0142');
  await h.go('product/cmp-1');
  const scheda = await h.has('Borse › Zaini', true);
  await h.go('');
  await h.click('Borse');
  const secondaFila = await h.has('Zaini', true);
  await h.click('Zaini');
  const filtrati = await h.page.evaluate(() => [...document.querySelectorAll('div')]
    .filter((d) => d.childElementCount === 0 && /^[A-Z]{3}-\d{4}$/.test(d.textContent || '') && d.offsetParent).map((d) => d.textContent));
  const ok = !!borse && !borse.parentId && !!zaini && zaini.parentId === borse.id && rientrata && vis.libraryId === zaini.id
    && scheda && secondaFila && filtrati.join() === 'VIS-0142';
  return { ok, categorie: libs.map((l) => (l.parentId ? `${l.id}<${l.parentId}` : l.id)), rientrata, libraryId: vis.libraryId, scheda, secondaFila, filtrati };
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
  // ETI: il codice di una categoria si cambia in «Codice ed etichetta» › Avanzate › «Cambia codice» (stesso controllo)
  await eti.apri(h, 'Codice ed etichetta');
  await eti.cambiaCodice(h, 'LOC-MAGAZZINO');
  await eti.chiudiCodice(h);
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

// ---- ETI (ticket 22, corsia C, 24/11): «Codice ed etichetta» ed etichette fatte in locale ----
const eti = require('./eti-util.cjs');
const etiPulita = (html) => !/<script|https?:|qrserver|barcodeapi|jsdelivr|rawgit/i.test(html);

// CF-E4 (ETI): «Codice ed etichetta» di VIS-0142 (col link GS1, P27) e dello scaffale A1: «Stampa etichetta» apre una
// finestra sua con l'etichetta fatta in locale (il QR porta il codice, nessuno script né indirizzo esterno, nessuna
// richiesta fuori da localhost); la pagina dell'app non si stampa
async function cfE4(h) {
  await c.prepara(h);
  const st = await eti.guardaStampe(h);
  await h.click('VIS-0142'); await h.page.waitForTimeout(900);
  await eti.apri(h, 'Codice ed etichetta', 900);
  st.esterne.length = 0;
  await eti.apri(h, 'Stampa etichetta', 1500);
  const p = await eti.ultimaStampa(st);
  const prodotto = p && { qr: JSON.stringify(eti.qrHtml(p.html)) === JSON.stringify(eti.qrAtteso('VIS-0142')), pulita: etiPulita(p.html), stampata: p.stampe };
  const paginaApp = [await h.page.evaluate(() => window.__prints)];
  await h.go('settings/shelves');
  await eti.apri(h, 'Codice QR di A1');
  // le richieste della stampa: aprendo Scaffali lo Scanner web di expo-camera scarica jsQR (lettura, non etichetta)
  st.esterne.length = 0;
  await eti.apri(h, 'Stampa etichetta', 1500);
  const a = await eti.ultimaStampa(st);
  const scaffale = a && { qr: JSON.stringify(eti.qrHtml(a.html)) === JSON.stringify(eti.qrAtteso('SCAF-MAG-A1')), pulita: etiPulita(a.html), stampata: a.stampe, nome: a.html.includes('Magazzino › A1') };
  paginaApp.push(await h.page.evaluate(() => window.__prints));
  const ok = !!prodotto && prodotto.qr && prodotto.pulita && prodotto.stampata === 1 && !!scaffale && scaffale.qr && scaffale.pulita
    && scaffale.stampata === 1 && scaffale.nome && st.finestre.length === 2 && paginaApp.every((n) => n === 0) && st.esterne.length === 0;
  return { ok, prodotto, scaffale, finestre: st.finestre.length, paginaApp, esterne: st.esterne };
}

// CF-D1 (parte ETI): il ripiano «A1» creato dal modulo (Magazzino): al «OK» si apre «Codice ed etichetta» con il codice
// SCAF-MAGAZZINO-A1 e «Stampa etichetta» lo stampa in una finestra sua. Il codice nasce al salvataggio con S2 (corsia B,
// unita con l'Unione 2): se la finestra chiedesse ancora «Crea il codice» il passo è rosso
async function cfD1Eti(h) {
  const st = await eti.guardaStampe(h);
  await h.go('settings/shelves');
  await h.page.getByLabel('Nome', { exact: true }).locator('visible=true').first().fill('A1');
  await eti.apri(h, 'Posizione Magazzino', 200);
  await eti.apri(h, 'Crea scaffale', 900);
  const finestra = await eti.aperta(h);
  const daCreare = await h.has('Questo scaffale non ha ancora un codice.', true);
  if (daCreare) await eti.apri(h, 'Crea il codice', 800);
  const salvato = (((await h.store('furinventory_shelves:local', 400)) || [])[0] || {}).barcode;
  const aVideo = await h.has('SCAF-MAGAZZINO-A1', true);
  st.esterne.length = 0;
  await eti.apri(h, 'Stampa etichetta', 1500);
  const s = await eti.ultimaStampa(st);
  const stampa = s && { qr: JSON.stringify(eti.qrHtml(s.html)) === JSON.stringify(eti.qrAtteso('SCAF-MAGAZZINO-A1')), pulita: etiPulita(s.html), stampata: s.stampe };
  const paginaApp = await h.page.evaluate(() => window.__prints);
  const ok = finestra && !daCreare && salvato === 'SCAF-MAGAZZINO-A1' && aVideo && !!stampa && stampa.qr && stampa.pulita && stampa.stampata === 1 && paginaApp === 0 && st.esterne.length === 0;
  return { ok, finestra, codiceDa: daCreare ? 'Crea il codice' : 'salvataggio', salvato, aVideo, stampa, paginaApp, esterne: st.esterne };
}

// CF-E6 (N1): Impostazioni › Scanner e NFC sul web, con una configurazione salvata prima («NFC», proponi il tag): una
// riga «L'NFC si usa dal telefono», nessuna scelta NFC, nessun interruttore, nessun «Errore» (NG12); la chiave resta
// uguale; nella finestra «Codice ed etichetta» di VIS-0142 la stessa riga e niente «Programma tag» (NG19)
async function cfE6(h) {
  const KEY = 'furinventory_hardware_config:local';
  const salvata = { scanMode: 'nfc_only', autoWriteNfcOnSave: true };
  await h.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, salvata]);
  await h.go('settings/hardware');
  const t = await c.testo(h);
  const impostazioni = {
    riga: await h.has('L\'NFC si usa dal telefono', true),
    scelte: await h.page.getByLabel(/^Leggi con /).locator('visible=true').count(),
    interruttori: await h.page.getByRole('switch').locator('visible=true').count(),
    errore: /errore/i.test(t),
  };
  const chiave = await h.store(KEY);
  await h.go('');
  await h.click('VIS-0142'); await h.page.waitForTimeout(900);
  await eti.apri(h, 'Codice ed etichetta', 900);
  await eti.apri(h, 'Avanzate', 400);
  const finestra = {
    // Unione 2 (richiesta dell'utente del 25/11): in «Codice ed etichetta» «Scrivi tag NFC» c'è, spenta, con sotto «Funziona dal telefono»
    riga: await h.page.getByLabel('Scrivi tag NFC: funziona dal telefono', { exact: true }).locator('visible=true').count(),
    motivo: await h.page.getByText('Funziona dal telefono', { exact: true }).locator('visible=true').count(),
    programma: await h.page.getByText('Programma tag', { exact: true }).locator('visible=true').count(),
    scrivi: await h.page.getByLabel('Scrivi tag NFC', { exact: true }).locator('visible=true').count(),
  };
  const ok = impostazioni.riga && !impostazioni.scelte && !impostazioni.interruttori && !impostazioni.errore
    && JSON.stringify(chiave) === JSON.stringify(salvata) && finestra.riga === 1 && finestra.motivo === 1 && !finestra.programma && !finestra.scrivi;
  return { ok, impostazioni, chiaveUguale: JSON.stringify(chiave) === JSON.stringify(salvata), finestra };
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

// CF-B3. Parte VAL: un'opzione usata e rinominata dall'editor dei valori (Campi › Taglia, «M» → «Media»): i prodotti
// che l'avevano non si riscrivono, mostrano «Media» nella Scheda e in Modifica resta scelta; gli id delle opzioni non
// cambiano. Parte EDC: campo «Colore del capo» creato dall'interfaccia (scelta da un elenco a binario orizzontale, «Mostra nella
// card»), colore e icona dati ai valori; Larghezza Base con la ruota; Aggiungi compilato coi tocchi (pillola e ruota);
// Scheda con l'icona e il pallino del colore, card dell'Inventario col valore. («Colore» c'è già nel campionario: il
// campo nuovo ha un altro nome, così le etichette non si confondono.)
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

  // EDC: «Colore del capo» a pillole con colore e icona dei valori, nella card
  await e.crea(h, { tipo: 'scelta', nome: 'Colore del capo', valori: ['Nero lucido', 'Cammello'], aspetto: 'Binario orizzontale', card: true });
  await v.matita(h, 'Colore del capo');
  await e.visibile(h, '[aria-label="Rinomina Cammello"]').click(); await h.page.waitForTimeout(300);
  await e.visibile(h, '[aria-label="Colore Marrone"]').click();
  await e.visibile(h, '[aria-label="Icona star"]').click();
  await e.visibile(h, '[aria-label="Rinomina Nero lucido"]').click(); await h.page.waitForTimeout(300);
  await e.visibile(h, '[aria-label="Colore Nero"]').click();
  await h.click('Aggiorna');
  const colore = await e.campo(h, 'Colore del capo');
  // Larghezza Base con la ruota, da 40 a 120 cm, passo 10
  await h.go('settings/fields');
  await e.visibile(h, '[aria-label="Come si compila Larghezza"]').click(); await h.page.waitForTimeout(500);
  await h.click('Ruota');
  await e.visibile(h, '[aria-label="Da della ruota"]').fill('40');
  await e.visibile(h, '[aria-label="A della ruota"]').fill('120');
  await e.visibile(h, '[aria-label="Passo della ruota"]').fill('10');
  await h.click('Aggiorna');
  // Aggiungi compilato coi tocchi
  await e.prepara(h, 'Media');
  await h.click('Cammello'); // a 1/2 il binario è una tendina: si apre e si sceglie
  await e.ruota(h, 'Larghezza', '90 cm'); // a 1/3 il campo apre la ruota in una finestra dal basso
  const nuovo = await e.salvaNuovo(h);
  const cammello = (colore.options || []).find((o) => o.label === 'Cammello');
  // davanti al nome c'è la stella del valore (un glifo): si cerca il nome nel testo
  const schedaColore = (await v.scheda(h, nuovo.id, [['Colore del capo', 14]]))['Colore del capo'];
  const pallinoScheda = await e.puntoColore(h.page, 'Cammello', 'rgb(141, 110, 99)');
  await h.go('');
  await h.page.getByText(nuovo.sku, { exact: true }).first().waitFor();
  const cardNuovo = await e.card(h.page, nuovo.sku);
  const pallinoCard = await e.puntoColore(h.page, 'Cammello', 'rgb(141, 110, 99)');

  const out = {
    opzioni: (taglia.options || []).map((o) => `${o.id}:${o.label}`).join(), prodottiUguali: JSON.stringify(dopo) === JSON.stringify(prima), schede, inModifica,
    colore: { look: colore.look, showInCard: colore.showInCard, cammello },
    nuovo: { colore: v.valore(nuovo, colore.id), larghezza: nuovo.width }, schedaColore, pallinoScheda, cardNuovo, pallinoCard,
  };
  const ok = out.opzioni === 'opt_0:XS,opt_1:S,opt_2:Media,opt_3:L,opt_4:XL' && out.prodottiUguali && schede.vis0142 === 'Media' && schede.vis0098 === 'Media'
    && inModifica.join() === 'Media'
    && colore.look === 'chips' && colore.showInCard === true && cammello && cammello.color === '#8D6E63' && cammello.icon === 'star'
    && out.nuovo.colore === cammello.id && nuovo.width === 90 && /Cammello/.test(schedaColore || '') && pallinoScheda && /Cammello/.test(cardNuovo || '') && pallinoCard;
  return { ok, ...out };
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
  // Unione 2: la finestra «Codice ed etichetta» con Stampa dopo la creazione è il passo CF-D1-ETI (`cfD1Eti`)
  return { ok, salvato: { ...salvato, id: undefined, createdAt: undefined }, riga, barre };
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

// ---- CF-D (parti S3, corsia B, 24/11): blocco e proposta, stesso carico da tutti i punti, il 16° capo ----
// Aiuti in `s3-util.cjs` (gli stessi di `s3-avvisi.cjs`).
const s3 = require('./s3-util.cjs');

// CF-D3: A1 (Borse, 50×50×30 cm, 10 kg, 20 pezzi, già 20 pezzi di AST-0033); B2 di Borse 40×40×40 cm e 20 kg; G1
// generico. Su A1 con Movimenta: un prodotto 60×40×20 (Borse) → blocco «Un lato di 60 cm…», B2 non basta (lato) e la
// proposta è il generico G1; uno da 12 kg → blocco «Pesa 12 kg…», proposta B2 (prima Borse); il 21° pezzo → blocco
// «21 pezzi, il massimo è 20», proposta B2. Finché la finestra è aperta nessun evento; il tocco lo posa lì.
async function cfD3(h) {
  const b2 = { ...s3.B2, length: 40, depth: 40, height: 40, maxWeight: 20 };
  await s3.prepara(h, {
    shelves: [s3.A1, b2, s3.G1],
    campi: {
      'VIS-0098': { ...s3.SENZA, length: 60, width: 40, height: 20, libraryId: 'borse' },
      'PUZ-0012': { ...s3.SENZA, length: 10, width: 10, height: 10, weight: 12, libraryId: 'borse' },
      'AST-0033': { ...s3.SENZA, libraryId: 'borse' },
    },
    giacenze: { 'VIS-0098': { magazzino: 1 }, 'PUZ-0012': { magazzino: 1 }, 'AST-0033': { [s3.k(s3.A1)]: 20 } },
  });
  const passo = async (sku) => {
    await s3.apri(h, sku);
    const prima = await s3.quantiEventi(h);
    await s3.movimenta(h, { pillole: ['In Magazzino', 'In Magazzino › A1'], qty: '1' });
    const finestra = await s3.blocco(h);
    const eventiConFinestra = (await s3.quantiEventi(h)) - prima;
    await s3.proposta(h);
    return { finestra, eventiConFinestra, dopo: await s3.stato(h, sku) };
  };
  const lato = await passo('VIS-0098');
  const peso = await passo('PUZ-0012');
  const pezzo = await passo('AST-0033');
  const ok = !!lato.finestra && lato.finestra.righe.includes('Un lato di 60 cm è più grande di 50 cm') && lato.finestra.primario === 'Metti in G1 (libero al 90%)'
    && lato.dopo.stock['magazzino/G1'] === 1
    && !!peso.finestra && peso.finestra.righe.includes('Pesa 12 kg, lo scaffale ne regge 10') && /^Metti in B2 /.test(peso.finestra.primario) && peso.dopo.stock['magazzino/B2'] === 1
    && !!pezzo.finestra && pezzo.finestra.righe.includes('21 pezzi, il massimo è 20') && /^Metti in B2 /.test(pezzo.finestra.primario) && pezzo.dopo.stock['magazzino/A1'] === 20
    && pezzo.dopo.stock['magazzino/B2'] === 1 && [lato, peso, pezzo].every((p) => p.eventiConFinestra === 0 && p.dopo.coincide);
  return { ok, lato, peso, pezzo };
}

// CF-D4: lo stesso carico su R2 (2 pezzi, già VIS-0142) da Aggiungi, Movimenta, Azione rapida, Spostamento rapido ed
// esecuzione di un'automazione: il 2° pezzo dà l'avviso «R2 sarà pieno», il 3° la stessa finestra («3 pezzi, il
// massimo è 2», «Metti in G1 (libero al 90%)») ovunque; «Annulla» non scrive nulla. In Conta e Audit (Vetrina con
// capienza 2) solo l'informazione «oltre il limite», niente finestra.
async function cfD4(h) {
  const campi = { 'VIS-0142': { ...s3.SENZA, location: 'magazzino', shelfId: s3.R2.id }, 'AST-0033': s3.SENZA, 'LIN-0021': { ...s3.SENZA, libraryId: null } };
  const punti = {};
  const blocco = async () => {
    const prima = await s3.quantiEventi(h);
    const finestra = await s3.blocco(h);
    await s3.annulla(h);
    return { finestra, eventi: (await s3.quantiEventi(h)) - prima };
  };
  // Aggiungi
  await s3.prepara(h, { campi, daCapo: true });
  const aggiungi = async (sku) => {
    await h.go('add');
    await h.click('Magazzino');
    await s3.label(h, 'Scaffale R2').click();
    await h.click('M'); // Taglia, obbligatoria nel campionario
    await h.page.getByPlaceholder('Auto: LOG-2026-001').fill(sku);
    await h.page.waitForTimeout(300);
    const letto = await s3.avviso(h);
    await h.click("Aggiungi all'Inventario"); await h.page.waitForTimeout(800);
    return letto;
  };
  punti.aggiungi = { avviso: await aggiungi('CF-D4-1') };
  await aggiungi('CF-D4-2');
  Object.assign(punti.aggiungi, await blocco(), { creato: !!(await s3.stato(h, 'CF-D4-2', 0)) });
  // Movimenta (dalla Scheda) e Azione rapida (stessa finestra), Carico di 1 pezzo su R2
  const carico = async (aprire) => {
    await s3.prepara(h, { campi, daCapo: true });
    await aprire('AST-0033');
    const avviso = await s3.movimenta(h, { pillole: ['In Magazzino', 'In Magazzino › R2'], qty: '1', apri: false });
    await aprire('LIN-0021');
    await s3.movimenta(h, { pillole: ['In Magazzino', 'In Magazzino › R2'], qty: '1', apri: false });
    return { avviso, ...(await blocco()) };
  };
  punti.movimenta = await carico(async (sku) => { await s3.apri(h, sku); await s3.label(h, 'Movimenta').click(); await h.page.waitForTimeout(500); });
  punti.azioneRapida = await carico(async (sku) => {
    await h.go(`scanner-action?type=product&id=${sku === 'AST-0033' ? 'cmp-4' : 'cmp-3'}`);
    await s3.label(h, 'Carico').click(); await h.page.waitForTimeout(500);
  });
  // Spostamento rapido: destinazione letta col codice di R2
  await s3.prepara(h, { campi, daCapo: true });
  await h.go('automations/batch-move'); await h.click('Scansiona Posizione');
  await c.leggi(h, 'SCAF-MAG-R2');
  await s3.leggiQui(h, 'AST-0033', 'Scansiona Prodotto', 300);
  const rapido = (await s3.testo(h)).match(/AST-0033 Spostato! [^|]*?\./)?.[0] ?? null;
  await s3.leggiQui(h, 'LIN-0021', 'Scansiona Prodotto');
  punti.spostamentoRapido = { avviso: rapido, ...(await blocco()) };
  // Esecuzione: «Scansiona Posizione» su R2, poi «Sposta nella posizione letta»
  await s3.prepara(h, { campi, daCapo: true });
  await h.go('automations/custom-runner/auto_scaf'); await c.ultima(h, 'Scansiona Posizione');
  await c.leggi(h, 'SCAF-MAG-R2', { wait: 1100 });
  await s3.leggiQui(h, 'AST-0033', 'Scansiona Prodotto', 500);
  const fatto = (await s3.testo(h)).match(/✅ Fatto! [^|]*?\./)?.[0] ?? null;
  await h.page.waitForTimeout(1200);
  await s3.leggiQui(h, 'LIN-0021', 'Scansiona Prodotto', 1200);
  punti.esecuzione = { avviso: fatto, ...(await blocco()) };
  // Conta e Audit: solo informazione
  await s3.prepara(h, { locations: s3.conVetrina(2), giacenze: { 'VIS-0098': { vetrina: 1 } }, daCapo: true });
  const visti = s3.finestre(h);
  await h.go('automations/count');
  await s3.label(h, 'Conta Vetrina').click(); await h.page.waitForTimeout(500);
  await s3.label(h, 'Contata VIS-0098').fill('3');
  await s3.label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(500);
  const conta = { etichette: await s3.etichette(h), finestra: await s3.blocco(h) };
  await s3.label(h, 'Registra rettifiche').click(); await h.page.waitForTimeout(800);
  conta.registrata = (await s3.stato(h, 'VIS-0098', 600)).stock.vetrina === 3;
  await h.go('automations/audit'); await h.click('Vetrina');
  const lista = await iconAt(h);
  const fab = lista.sort((a, b) => b.y - a.y)[0];
  await h.page.mouse.click(fab.x, fab.y); await h.page.waitForTimeout(700);
  // La scelta dell'intruso è una finestra a più voci (window.prompt sul web): qui «2. Sposta Qui & Aggiungi"
  await h.page.evaluate(() => { window.prompt = () => '2'; });
  await c.leggi(h, 'PUZ-0012', { wait: 1500 });
  const audit = { spostato: (await s3.stato(h, 'PUZ-0012', 600)).location === 'vetrina', informazione: visti.find((m) => m.includes('oltre il limite')) ?? null };
  const stessaFinestra = JSON.stringify(punti.aggiungi.finestra);
  const ok = Object.values(punti).every((p) => p.finestra && JSON.stringify(p.finestra) === stessaFinestra && p.eventi === 0)
    && punti.aggiungi.finestra.righe.includes('3 pezzi, il massimo è 2') && punti.aggiungi.finestra.primario === 'Metti in G1 (libero al 90%)'
    && !punti.aggiungi.creato
    && [punti.aggiungi.avviso, punti.movimenta.avviso, punti.azioneRapida.avviso].every((a) => a === 'R2 sarà pieno')
    && punti.spostamentoRapido.avviso === 'AST-0033 Spostato! R2 sarà pieno.' && punti.esecuzione.avviso === '✅ Fatto! R2 sarà pieno.'
    && conta.etichette.length === 1 && conta.finestra === null && conta.registrata && audit.spostato && !!audit.informazione;
  return { ok, punti, conta, audit };
}

// CF-D5 (parte S3): dopo la parte S2 (barra «Barra giacche» da 15 grucce con 15 capi), dal modulo una seconda barra
// «Barra cappotti»; il 16° capo su «Barra giacche» è bloccato «16 grucce, il massimo è 15» con la proposta della
// seconda barra, e il tocco lo appende lì
async function cfD5Tutto(h) {
  const s2 = await cfD5(h);
  await h.go('settings/shelves');
  // Con uno scaffale già creato il modulo è chiuso: si apre con «Nuovo scaffale»
  if (!(await h.page.getByLabel('Nome', { exact: true }).locator('visible=true').count())) await s2Label(h, 'Nuovo scaffale').click();
  await h.page.waitForTimeout(400);
  await s2Label(h, 'Nome').fill('Barra cappotti');
  await s2Label(h, 'Posizione Magazzino').click();
  await s2Label(h, 'Tipo Barra appendiabiti').click(); await h.page.waitForTimeout(300);
  await s2Label(h, 'Grucce massime').fill('15');
  await s2Label(h, 'Crea scaffale').click(); await h.page.waitForTimeout(800);
  await s2Carico(h, 'VIS-0098', 'Barra giacche', 1);
  const finestra = await s3.blocco(h);
  await s3.proposta(h);
  const shelves = (await h.store(S2_SHELVES, 0)) || [];
  const cappotti = shelves.find((s) => s.name === 'Barra cappotti');
  const stock = ((await h.products(800)).find((p) => p.sku === 'VIS-0098') || {}).stock || {};
  const ok = s2.ok && !!finestra && finestra.righe.includes('16 grucce, il massimo è 15') && finestra.primario === 'Metti in Barra cappotti (libero al 94%)'
    && !!cappotti && stock[`magazzino/${cappotti.id}`] === 1;
  return { ...s2, ok, s3: { finestra, sullaSeconda: cappotti ? stock[`magazzino/${cappotti.id}`] : null }, daFare: undefined };
}

// CF-H4 (ACC1, ticket 32): Impostazioni › Persone e telefoni › Accesso; nome e nome del telefono scritti e riletti dopo
// una ricarica; un Operatore vede le voci di Impostazioni spente col motivo (il tocco non apre nulla); di nuovo Titolare;
// un evento nuovo porta l'autore «Mario · Banco 1» in Cronologia, i vecchi «—»; nessuna richiesta a supabase.co
async function cfH4(h) {
  const sb = [];
  h.page.on('request', (r) => { if (/supabase\.co/.test(r.url())) sb.push(r.url().slice(0, 50)); });
  const scrivi = async (label, valore) => { await h.page.getByLabel(label, { exact: true }).fill(valore); await h.page.waitForTimeout(300); };
  const ruolo = async (nome) => { await h.go('settings/access'); await h.page.getByRole('radio', { name: `Ruolo ${nome}` }).click(); await h.page.waitForTimeout(500); };
  const vecchi = (await h.timeline(0)).length;
  await h.go('settings');
  await h.click('Accesso');
  const indirizzo = new URL(h.page.url()).pathname;
  await scrivi("Nome dell'operatore", 'Mario');
  await scrivi('Nome del telefono', 'Banco 1');
  await h.page.reload(); await h.page.waitForTimeout(2500);
  const riletti = [await h.page.getByLabel("Nome dell'operatore", { exact: true }).inputValue(), await h.page.getByLabel('Nome del telefono', { exact: true }).inputValue()];
  await ruolo('Operatore');
  await h.go('settings');
  const motivi = await h.page.getByText('Il ruolo Operatore non può cambiare le impostazioni. Lo decide il Titolare in Accesso.', { exact: true }).locator('visible=true').count();
  await h.click('Campi Personalizzati');
  const restaInImpostazioni = new URL(h.page.url()).pathname === '/settings';
  await ruolo('Titolare');
  // evento nuovo: VIS-0142 nel cestino dalla Home
  await h.go('');
  await h.longPress('VIS-0142');
  await h.page.locator('[aria-label="Elimina"]').locator('visible=true').first().click(); await h.page.waitForTimeout(800);
  const tl = await h.timeline();
  await h.tab('Cronologia');
  const righe = {
    mario: await h.page.getByText(/^Mario · Banco 1 · /).locator('visible=true').count(),
    trattini: await h.page.getByText(/^— · /).locator('visible=true').count(),
  };
  const autore = tl[0] && tl[0].author ? `${tl[0].author.name}|${tl[0].author.device}` : null;
  const ok = indirizzo === '/settings/access' && riletti.join('|') === 'Mario|Banco 1' && motivi === 3 && restaInImpostazioni
    && autore === 'Mario|Banco 1' && tl.length === vecchi + 1 && righe.mario === 1 && righe.trattini === vecchi && sb.length === 0;
  return { ok, indirizzo, riletti, motivi, restaInImpostazioni, autore, righe, supabase: sb.length };
}

// CF-H5 (RETE0, ticket 32): Impostazioni › Persone e telefoni › Rete del negozio col centro finto delle prove
// (`centro-finto.mjs`, su questo computer): all'entrata «Non collegato» e nessuna scelta fatta, «Fai da centro» spento
// col motivo; il codice del centro scritto, la domanda in pagina, «Collegato al centro "Magazzino" · 3 telefoni online»,
// le righe dei telefoni con «online dalle…» e «visto alle…», la voce di Impostazioni con lo stato vero; il centro tace
// (acceso ma muto: così la console resta pulita) → «non risponde» e tutti «visto alle…»; «Scollegati» → «Non collegato».
// Il centro vero sul telefono resta a CF-T6.
async function cfH5(h) {
  const { pathToFileURL } = require('url');
  const { avviaCentro } = await import(pathToFileURL(require('path').join(__dirname, 'centro-finto.mjs')).href);
  const ora = Date.now();
  const centro = await avviaCentro({
    porta: 47331, token: 'RETE0COLLAUDO001', nome: 'Magazzino',
    altri: [
      { id: 'banco-2', name: 'Banco 2', since: ora - 10 * 60_000, lastSeen: ora, online: true },
      { id: 'cassa', name: 'Cassa', since: ora - 2 * 3600_000, lastSeen: ora - 5 * 60_000, online: false },
    ],
  });
  const stato = async () => ((await h.page.locator('[data-testid="rete-stato"]').locator('visible=true').first().innerText()) || '').replace(/\s+/g, ' ').trim();
  const righe = () => h.page.locator('[data-testid="rete-telefono"]').locator('visible=true').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const aspetta = async (re, ms) => { const t0 = Date.now(); let s = await stato(); while (!re.test(s) && Date.now() - t0 < ms) { await h.page.waitForTimeout(500); s = await stato(); } return s; };
  try {
    const esterne = [];
    // richieste verso fuori (non `data:` o `blob:`; il lettore di QR di sempre, jsqr, non conta)
    h.page.on('request', (r) => { const x = new URL(r.url()); if (/^https?:$/.test(x.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(x.hostname) && !/jsdelivr/.test(x.hostname)) esterne.push(x.hostname); });
    await h.go('settings');
    await h.click('Rete del negozio');
    await h.page.waitForTimeout(1200);
    const entrata = { indirizzo: u.percorso(h.page), stato: await stato(), motivo: await h.has('Sul computer non si può: usa un telefono che resta acceso in negozio.', true) };
    await h.click('Collegati a un centro');
    await h.page.getByLabel('Codice del centro', { exact: true }).fill(centro.codice);
    await h.click('Continua');
    const domanda = await h.has('Collegarti al centro "Magazzino"?', true);
    await h.click('Collegati');
    const collegato = await aspetta(/^Collegato/, 8000);
    await h.page.waitForTimeout(800);
    const telefoni = await righe();
    await u.toccaIndietro(h.page); await h.page.waitForTimeout(1200);
    const voce = await h.has('Collegato al centro "Magazzino"', true);
    await h.click('Rete del negozio'); await h.page.waitForTimeout(1000);
    centro.muto(true);
    const tace = await aspetta(/non risponde/, 50000);
    const visti = await righe();
    await h.click('Scollegati'); await h.page.waitForTimeout(1200);
    const scollegato = await stato();
    const nomi = telefoni.join(' | ');
    const ok = entrata.indirizzo === '/settings/network' && entrata.stato === 'Non collegato' && entrata.motivo && domanda
      && collegato === 'Collegato al centro "Magazzino" · 3 telefoni online' && telefoni.length === 4
      && /^Magazzino, Centro · online dalle \d\d:\d\d, Online$/.test(telefoni[0]) && /Banco 2, online dalle \d\d:\d\d, Online/.test(nomi)
      && /Cassa, visto alle \d\d:\d\d, Non in linea/.test(nomi) && voce
      && tace.startsWith('Il centro "Magazzino" non risponde') && visti.length === 4 && visti.every((r) => /visto alle \d\d:\d\d, Non in linea$/.test(r))
      && scollegato === 'Non collegato' && esterne.length === 0;
    return { ok, entrata, domanda, collegato, voce, tace, scollegato, esterne, telefoni, visti };
  } finally { await centro.spegni(); }
}

// DATI (EXP + IMP, corsia B, 25/11): CF-G1 export, CF-G2 import d'altri con «+ Crea campo», CF-G3 andata e ritorno
const imp = require('./imp-util.cjs');
const datiCsv = (n) => require('fs').readFileSync(require('path').join(__dirname, 'imp-csv', n), 'utf8');
async function datiScarica(h, voce) {
  const dl = h.page.waitForEvent('download', { timeout: 15000 });
  await h.click(voce);
  return require('fs').readFileSync(await (await dl).path());
}
function datiRighe(testo) {
  const rows = []; let row = []; let f = ''; let q = false;
  for (let i = 0; i < testo.length; i++) {
    const ch = testo[i];
    if (q) { if (ch === '"' && testo[i + 1] === '"') { f += '"'; i++; } else if (ch === '"') q = false; else f += ch; }
    else if (ch === '"' && !f) q = true; else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && testo[i + 1] === '\n') i++; row.push(f); if (row.some(Boolean)) rows.push(row); row = []; f = ''; } else f += ch;
  }
  row.push(f); if (row.some(Boolean)) rows.push(row);
  return rows;
}
async function cfG1(h) {
  await h.tab('Impostazioni');
  const testo = (await datiScarica(h, 'Esporta Inventario')).toString('utf8');
  const [testa, ...dati] = datiRighe(testo.replace(/^﻿/, ''));
  const vis = dati.find((r) => r[0] === 'VIS-0142');
  const val = (c) => vis[testa.indexOf(c)];
  await h.page.waitForTimeout(500);
  const avviso = await h.page.locator('[data-testid="export-avviso"]').innerText().catch(() => '');
  const cloud = await h.has('Per avere i link delle foto serve il cloud (in arrivo)', true);
  const r = { bom: testo.charCodeAt(0) === 0xfeff, taglia: val('Taglia'), colore: val('Colore'), dettagli: val('Dettagli'), giacenza: testa.includes('Giacenza'), scaffale: testa.includes('Scaffale'), avviso, cloud };
  return { ok: r.bom && r.taglia === 'M' && r.colore === 'Grigio perla' && /; /.test(r.dettagli) && r.giacenza && r.scaffale && /^\d+ foto non esportate: sono solo su questo dispositivo/.test(avviso) && cloud, ...r };
}
async function cfG2(h) {
  await h.tab('Impostazioni');
  const prima = await h.page.evaluate(() => JSON.stringify(Object.keys(localStorage).filter((k) => !/import_draft/.test(k)).sort().map((k) => [k, localStorage.getItem(k)])));
  await imp.trascina(h, datiCsv('altro-gestionale-pv.csv'), 'altro-gestionale-pv.csv');
  const abbinate = await h.page.locator('[aria-label^="Colonna "]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const intatto = prima === await h.page.evaluate(() => JSON.stringify(Object.keys(localStorage).filter((k) => !/import_draft/.test(k)).sort().map((k) => [k, localStorage.getItem(k)])));
  await h.page.locator('[aria-label^="Colonna Materiale:"]').click(); await h.page.waitForTimeout(500);
  await h.click('+ Crea campo'); await h.page.waitForTimeout(1500);
  await h.click('Salva Campo'); await h.page.waitForTimeout(1800);
  const ritorno = await h.page.locator('[aria-label^="Colonna Materiale:"]').getAttribute('aria-label').catch(() => null);
  const fileAncora = await h.page.locator('[data-testid="import-file"]').innerText().catch(() => null);
  await h.click('Posizione');
  await h.page.locator('[aria-modal="true"]').last().getByText('Magazzino', { exact: true }).first().click();
  await h.page.waitForTimeout(500);
  const rifiutate = await h.page.getByText(/^Riga \d+ · /).count();
  const n = await imp.chiudiImport(h);
  const campi = await h.store('furinventory_custom_fields:local', 0);
  const materiale = campi.find((f) => f.name === 'Materiale');
  const b = (await h.products()).find((p) => p.sku === 'BOR-001');
  const mat = b && b.customData.find((c) => c.fieldSnapshot.id === materiale?.id);
  const r = { abbinate: abbinate.slice(0, 3), intatto, ritorno, fileAncora, rifiutate, importati: n, materiale: mat && (materiale.options || []).find((o) => o.id === mat.value)?.label, foto: b && b.images, giacenza: b && b.stock };
  return { ok: abbinate[0] === 'Colonna Codice articolo: SKU' && intatto && ritorno === 'Colonna Materiale: Materiale' && fileAncora === 'altro-gestionale-pv.csv' && rifiutate === 0 && n === 2
    && r.materiale === 'Pelle' && JSON.stringify(r.foto) === '["https://img.prova.test/borsa1.png"]' && r.giacenza?.magazzino === 3, ...r };
}
async function cfG3(h) {
  await h.tab('Impostazioni');
  const originali = (await h.products(0)).filter((p) => !p.deletedAt);
  const zip = await datiScarica(h, 'Esporta con le foto');
  await h.page.evaluate(() => { localStorage.setItem('inventory:v1:local:products', '[]'); localStorage.setItem('inventory:v1:local:timeline', '[]'); });
  await h.go('settings'); await h.page.waitForTimeout(800);
  await imp.trascina(h, zip, 'inventario.zip', 'application/zip');
  const n = await imp.chiudiImport(h);
  const dopo = await h.products();
  const diversi = originali.filter((o) => {
    const p = dopo.find((x) => x.sku === o.sku);
    if (!p) return true;
    const campi = (x) => JSON.stringify((x.customData || []).filter((c) => !['images', 'document'].includes(c.fieldSnapshot.type)).map((c) => [c.fieldSnapshot.id, c.value]));
    return ['furType', 'location', 'status', 'sellPrice', 'libraryId', 'unit', 'shelfId'].some((k) => JSON.stringify(o[k] ?? null) !== JSON.stringify(p[k] ?? null))
      || JSON.stringify(o.images) !== JSON.stringify(p.images) || JSON.stringify(o.stock ?? null) !== JSON.stringify(p.stock ?? null) || campi(o) !== campi(p);
  }).map((o) => o.sku);
  return { ok: n === originali.length && diversi.length === 0, importati: n, prodotti: originali.length, diversi };
}

// ---- Tutti i passi del piano (collaudo-finale.md) ----
const PASSI = [
  ['CF-A1', 'Icone visibili nelle schermate principali, nei 5 stili', 'nessuna (controllo; d-icone.cjs)'],
  ['CF-A2', 'Ogni indirizzo di linking.ts dal menu, ricaricato, aperto direttamente: freccia, scheda madre, 0 GO_BACK; Team, Chat, Crea automazione senza NotFound', 'C2, IND', cfA2],
  ['CF-A3', 'Avvio a freddo e giro di tutte le schermate: 0 errori in console; nessuna voce «Prossimamente» senza decisione', 'IND, VOCI', cfA3],
  ['CF-B1', 'Categoria «Borse» con la sottocategoria «Borse › Zaini»', 'C1, CAT1', cfB1],
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
  ['CF-D3', 'Prodotto troppo grande, troppo pesante, pezzo in più: blocco e proposta', 'S3', cfD3],
  ['CF-D4', 'Stesso carico da tutti i punti di carico', 'S3', cfD4],
  ['CF-D5', 'Barra appendiabiti da 15 grucce, 16° capo', 'S2, S3', cfD5Tutto],
  ['CF-E1', 'Scanner con SKU, SKU minuscolo, vecchio link GS1', 'COD', cfE1],
  ['CF-E2', 'Scanner con i codici di posizione, scaffale, categoria; nessun codice doppio', 'COD', cfE2],
  ['CF-E3', 'Le 5 automazioni con lo stesso codice di prodotto', 'COD, ESE', cfE3],
  ['CF-E4', '«Codice ed etichetta» di un prodotto e di A1: Stampa', 'ETI', cfE4],
  ['CF-E5', 'Impostazioni › Codici ed etichette, vuote e con una configurazione GS1 vecchia', 'GS1'],
  ['CF-E6', 'Impostazioni › Scanner e NFC sul web: «L\'NFC si usa dal telefono»', 'N1', cfE6],
  ['CF-F1', 'Ricevimento da un fornitore: 3 articoli in Magazzino › A1', 'FLU1'],
  ['CF-F2', 'Uscita a un cliente con quantità e prezzo', 'FLU1'],
  ['CF-F3', 'Trasferimento di 2 pezzi su 5', 'FLU1'],
  ['CF-F4', 'Conta col lettore; Audit uscendo e rientrando', 'CON'],
  ['CF-F5', '«Da riordinare» › «Ricevi»', 'RIO'],
  ['CF-F6', 'Reso di un articolo a quantità e di un pezzo unico venduto', 'RES'],
  ['CF-F7', 'Automazione personale [Scansiona, Tag, Tag, Imposta campo, Vendi]', 'ESE', cfF7],
  ['CF-F8', 'Costruttore: passi Carico e «Chiedi conferma», riordino', 'FLU2, ESE'],
  ['CF-G1', 'Esporta inventario: BOM, una colonna per campo, avviso foto', 'EXP', cfG1],
  ['CF-G2', 'Import di un CSV «;» con abbinamento, «+ Crea campo», rifiutate', 'IMP', cfG2],
  ['CF-G3', 'Esportare e reimportare in uno spazio vuoto (ZIP con le foto)', 'EXP, IMP', cfG3],
  ['CF-H1', 'Home con Team e Chat; Chat senza colleghi; card giuste', 'CHAT1'],
  ['CF-H2', 'Selezione › «Invia» a un collega › «Ricevuto, sposta»', 'RIC1'],
  ['CF-H3', 'Automazioni «Invia a collega», «Ricevi», condivise', 'RIC2, RIC3'],
  ['CF-Z', 'La catena intera (Borse, modello, campo, foto, scaffale, etichetta, codice, export, import)', 'MCAT, EDC, GAL, FOTO, S3, ETI, COD, ESE, EXP, IMP'],
  // ACC1 (corsia B): passo nuovo, in fondo alla tabella per non scontrarsi con le altre corsie
  ['CF-H4', 'Accesso: profilo riletto, Operatore con le voci spente col motivo, autore in Cronologia', 'ACC1', cfH4],
  // RETE0 (corsia B): passo nuovo, in fondo alla tabella
  ['CF-H5', 'Rete del negozio col centro finto: nessuna scelta all\'entrata, collegato con i telefoni «online dalle…» e «visto alle…», centro che tace, Scollegati', 'RETE0', cfH5],
  // ETI (corsia C, 24/11): parte ETI di CF-D1 (la riga CF-D1 sopra è di S2): codice e «Codice ed etichetta» con Stampa
  ['CF-D1-ETI', 'Ripiano «A1» creato: codice e finestra «Codice ed etichetta» con Stampa', 'ETI', cfD1Eti],
];
const TELEFONO = [
  ['CF-T1', 'Tasto Indietro di sistema, link syncroflow:// ad app chiusa, icone su APK in modalità aereo', 'C2, IND'],
  ['CF-T2', 'Fotocamera e NFC nello Scanner e nelle automazioni', 'COD, N1, N2'],
  ['CF-T3', 'Scaffale A1 con un tag NFC', 'ETI, N1'],
  ['CF-T4', 'Stampa di etichetta e PDF in modalità aereo', 'ETI (il PDF con i campi, lasciato da EDC)'],
  ['CF-T5', 'Foto da galleria e fotocamera dopo «Svuota cache»', 'FOTO, GAL'],
  ['CF-T6', 'Due o tre telefoni sullo stesso modem senza internet', 'CHAT1, RETE1, RETE2, RIC1, RIC2'],
  ['CF-T7', 'Export CSV aperto in Excel; import da Excel sul telefono', 'EXP, IMP'],
  ['CF-T8', 'Login Google e passaggio dei dati locali', 'L1, L2'],
  ['CF-T9', 'Ruota a scatti col dito, binari, menu a tendina e tastiera nei campi di Aggiungi e Modifica', 'EDC'],
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
