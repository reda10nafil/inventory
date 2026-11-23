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
const { textOf } = require('./a1-util.cjs');

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

// CF-C4 (parte GAL): prezzo d'acquisto 0 (VIS-0098) mostrato bene nella Scheda, prima e dopo una Modifica senza
// cambiare nulla (resta 0, nessuna riga «Prezzo acquisto» in Cronologia). Restano a COD il codice e il link, a VAL gli
// obbligatori.
async function cfC4(h) {
  const { page } = h;
  await g.prepara(h, "list.find((p) => p.id === 'cmp-5').purchasePrice = 0;");
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
  const ok = out.prima === zero && out.dopo === zero && out.campo === '0' && out.salvato === 0 && !out.righe.some((r) => /Prezzo acquisto/.test(r));
  return { ok, ...out, daFare: 'COD: codice e link del prodotto invariati; VAL: obbligatori controllati' };
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
  ['CF-E1', 'Scanner con SKU, SKU minuscolo, vecchio link GS1', 'COD'],
  ['CF-E2', 'Scanner con i codici di posizione, scaffale, categoria; nessun codice doppio', 'COD'],
  ['CF-E3', 'Le 5 automazioni con lo stesso codice di prodotto', 'COD, ESE'],
  ['CF-E4', '«Codice ed etichetta» di un prodotto e di A1: Stampa', 'ETI'],
  ['CF-E5', 'Impostazioni › Codici ed etichette, vuote e con una configurazione GS1 vecchia', 'GS1'],
  ['CF-E6', 'Impostazioni › Scanner e NFC sul web: «Non disponibile sul web»', 'N1'],
  ['CF-F1', 'Ricevimento da un fornitore: 3 articoli in Magazzino › A1', 'FLU1'],
  ['CF-F2', 'Uscita a un cliente con quantità e prezzo', 'FLU1'],
  ['CF-F3', 'Trasferimento di 2 pezzi su 5', 'FLU1'],
  ['CF-F4', 'Conta col lettore; Audit uscendo e rientrando', 'CON'],
  ['CF-F5', '«Da riordinare» › «Ricevi»', 'RIO'],
  ['CF-F6', 'Reso di un articolo a quantità e di un pezzo unico venduto', 'RES'],
  ['CF-F7', 'Automazione personale [Scansiona, Tag, Tag, Imposta campo, Vendi]', 'ESE'],
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
