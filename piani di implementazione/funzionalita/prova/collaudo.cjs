// Collaudo finale della mappa 3 (`../collaudo-finale.md`): un passo `CF-…` per riga del piano, gruppi A-H e Z sul
// web, gruppo T (telefono) solo come elenco «non provato». Nato con C2: ogni fetta, alla chiusura, scrive qui i suoi
// passi (funzione `fai`); i passi senza `fai` stampano «da fare» con la fetta che li rende verdi.
// Un passo è verde se l'azione riesce, lo stato salvato è quello atteso (letto da localStorage) e la console non ha
// errori (lib.cjs). Esce con 1 solo se un passo scritto è rosso.
// Uso (dalla cartella prova/, app su :8082 e campionario su :8765):
//   node collaudo.cjs              tutti i passi
//   node collaudo.cjs CF-A CF-B5   solo i passi che cominciano con uno dei prefissi
const { scenario } = require('./lib.cjs');
const u = require('./c2-util.cjs');
const g = require('./gal-util.cjs');
const { textOf, press } = require('./a1-util.cjs');
const c = require('./cod-util.cjs');
const { scan, iconAt } = require('./a3-util.cjs');

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

// CF-A2 (parte C2): ogni indirizzo di linking.ts aperto direttamente (= ricaricato) ha la freccia che porta alla scheda
// madre senza GO_BACK; tre voci del menu aperte e poi ricaricate; Team, Chat, Crea automazione senza NotFound.
// Restano alla fetta IND: la X dello Scanner (IND-P4) e la Conta col tasto di sistema (IND-P5).
async function cfA2(h) {
  const gb = goBacks(h.page);
  const rosse = [];
  let n = 0;
  for (const { nome, indirizzo } of u.indirizzi()) {
    if (nome === 'Scanner') continue; // IND-P4
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
  return { ok: rosse.length === 0, controlli: n, goBack: gb.length, rosse, daFare: 'IND: X dello Scanner (IND-P4), Conta col tasto di sistema (IND-P5)' };
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

// CF-C4 (parti GAL e COD): prezzo d'acquisto 0 (VIS-0098) mostrato bene nella Scheda, prima e dopo una Modifica senza
// cambiare nulla (resta 0, nessuna riga «Prezzo acquisto» in Cronologia); COD: dopo quella Modifica VIS-0098 resta
// senza link GS1 (NG02) e con lo stesso SKU; VIS-0142 con il lotto acceso in Impostazioni › GS1, Modifica senza
// cambiare nulla e poi con il peso cambiato: SKU e link identici (NG27). Restano a VAL gli obbligatori.
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
  return { ok: okGal && okCod, ...out, daFare: 'VAL: obbligatori controllati' };
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
    && out.condizione === 'Buono' && out.schedaCondizione === 'Condizione' && ast.sellPrice === 1300.5 && ast.status === 'sold'
    && venduto.length === 1 && venduto[0] === 1300.5 && azioni === '4'
    && dopo.length === 1 && dopo[0] === 'Controllo e vendita' && out.flussoDaCorreggere;
  return { ok, ...out };
}

// ---- Tutti i passi del piano (collaudo-finale.md) ----
const PASSI = [
  ['CF-A1', 'Icone visibili nelle schermate principali, nei 5 stili', 'nessuna (controllo; d-icone.cjs)'],
  ['CF-A2', 'Ogni indirizzo di linking.ts dal menu, ricaricato, aperto direttamente: freccia, scheda madre, 0 GO_BACK; Team, Chat, Crea automazione senza NotFound', 'C2, IND', cfA2],
  ['CF-A3', 'Avvio a freddo e giro di tutte le schermate: 0 errori in console; nessuna voce «Prossimamente» senza decisione', 'IND, VOCI'],
  ['CF-B1', 'Categoria «Borse» con la sottocategoria «Borse › Zaini»', 'C1 (fatta, passo da scrivere)'],
  ['CF-B2', 'Modulo di «Borse» da un Modello di settore', 'MCAT'],
  ['CF-B3', 'Campo «Colore» (pillole, colori, icona) e «Larghezza» (ruota); rinomina di un\'opzione usata', 'VAL, EDC'],
  ['CF-B4', 'Modulo di «Borse»: nascondere, sezione, uscire senza salvare, salvare', 'MOD, MCAT'],
  ['CF-B5', 'Campi › «Tipo di pelle»: aggiungere e rinominare un valore; voce assente da Impostazioni; valore usato non eliminabile', 'C2', cfB5],
  ['CF-C1', 'Aggiungi con categoria in testa e 3 foto; Scheda con galleria e visore', 'MCAT, GAL', cfC1],
  ['CF-C2', 'Ricaricare la pagina: le 3 foto ci sono ancora', 'FOTO'],
  ['CF-C3', 'Modifica: foto principale, eliminare la foto 3', 'GAL', cfC3],
  ['CF-C4', 'Modifica senza cambiare nulla, poi cambio di un campo', 'COD, VAL, GAL', cfC4],
  ['CF-D1', 'Ripiano «A1» con misure, peso e pezzi', 'S1a, S2, ETI'],
  ['CF-D2', 'Riempimento al 50%, 80%, 100%', 'S2'],
  ['CF-D3', 'Prodotto troppo grande, troppo pesante, pezzo in più: blocco e proposta', 'S3'],
  ['CF-D4', 'Stesso carico da tutti i punti di carico', 'S3'],
  ['CF-D5', 'Barra appendiabiti da 15 grucce, 16° capo', 'S2, S3'],
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
