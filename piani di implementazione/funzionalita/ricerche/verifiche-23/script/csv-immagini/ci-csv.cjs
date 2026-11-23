// Verifica CSV (23 novembre): export (colonne, BOM, immagini), import da altro gestionale, righe errate, link delle immagini.
// Solo lettura dell'app: tutto avviene nel browser di prova (localStorage del campionario). File letti da questa cartella.
const fs = require('fs');
const path = require('path');
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');

const DIR = __dirname;
const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');

function parseCsv(input) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) { if (c === '"' && input[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"' && field.length === 0) quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && input[i + 1] === '\n') i++; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  return rows;
}
const DROP = '[aria-label="Importa CSV trascinando un file qui"]';
async function drop(h, csv, name = 'prova.csv') {
  const dt = await h.page.evaluateHandle(([text, n]) => {
    const d = new DataTransfer(); d.items.add(new File([text], n, { type: 'text/csv' })); return d;
  }, [csv, name]);
  await h.page.locator(DROP).dispatchEvent('drop', { dataTransfer: dt });
  await h.page.waitForTimeout(1500);
}
async function esporta(h) {
  const dl = h.page.waitForEvent('download', { timeout: 8000 });
  await h.click('Esporta Inventario');
  const d = await dl;
  return { nome: d.suggestedFilename(), testo: fs.readFileSync(await d.path(), 'utf8') };
}
// Registra i testi delle finestre (lib.cjs le accetta)
const recordDialogs = (page) => { const seen = []; page.on('dialog', (d) => seen.push(d.message().replace(/\n+/g, ' | '))); return seen; };
const fixture = (name) => fs.readFileSync(path.join(DIR, name), 'utf8');
const brief = (p) => p && ({ sku: p.sku, furType: p.furType, location: p.location, status: p.status, sellPrice: p.sellPrice, libraryId: p.libraryId, unit: p.unit, stock: p.stock, images: p.images, backupImageLinks: p.backupImageLinks, customData: (p.customData || []).map((c) => `${c.fieldSnapshot && c.fieldSnapshot.name}=${JSON.stringify(c.value)}`) });
const imgs = (page) => page.evaluate(() => [...document.querySelectorAll('img')].map((i) => ({ src: i.src.slice(0, 50), ok: i.complete && i.naturalWidth > 0, w: Math.round(i.getBoundingClientRect().width) })));
const openDetail = async (h, sku) => { await h.go(''); await h.page.getByText(sku, { exact: true }).first().click(); await h.page.waitForTimeout(1500); };

(async () => {
  // 1. Export: colonne, BOM, cella delle immagini per le foto data: del campionario, campi personalizzati
  await run('ci-export', async (h) => {
    await h.tab('Impostazioni');
    const { nome, testo } = await esporta(h);
    const rows = parseCsv(testo.replace(/^\uFEFF/, ''));
    const header = rows[0];
    const col = (n) => header.indexOf(n);
    const vis = rows.find((r) => r[0] === 'VIS-0142');
    const originali = await h.products(0);
    return {
      file: nome, bom: testo.charCodeAt(0) === 0xFEFF, separatore: testo.split(/\r?\n/)[0].includes(';') ? ';' : ',',
      righe: rows.length - 1, colonne: header.length, header,
      visImmagini: vis[col('Immagini URL')], visFotoSalvate: originali.find((p) => p.sku === 'VIS-0142').images.map((u) => u.slice(0, 22)),
      visCategoria: vis[col('Categoria')], visTipo: vis[col('Tipo di pelle')], visPosizione: vis[col('Posizione')],
      visDatiPersonalizzatiCaratteri: (vis[col('Dati Personalizzati JSON')] || '').length,
      visDatiPersonalizzatiNomi: JSON.parse(vis[col('Dati Personalizzati JSON')] || '[]').map((c) => c.fieldSnapshot && c.fieldSnapshot.name),
      fotoDettagliNelJSON: (vis[col('Dati Personalizzati JSON')] || '').includes('data:image'),
      colonnePerCampo: header.filter((x) => ['Taglia', 'Colore', 'Fornitore'].includes(x)),
    };
  });

  // 2. CSV di un altro gestionale col punto e virgola (Excel in italiano)
  await run('ci-import-pv', async (h) => {
    const seen = recordDialogs(h.page);
    await h.tab('Impostazioni');
    const prima = (await h.products(0)).length;
    await drop(h, '\uFEFF' + fixture('altro-gestionale-pv.csv'), 'altro-gestionale-pv.csv');
    return { finestre: seen, prodottiPrima: prima, prodottiDopo: (await h.products()).length };
  });

  // 3. CSV di un altro gestionale con la virgola: colonne con nomi diversi, campi esistenti (Taglia, Colore), campo che non c'è (Materiale), foto
  await run('ci-import-virgola', async (h) => {
    const seen = recordDialogs(h.page);
    await h.page.route('https://img.prova.test/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
    await h.tab('Impostazioni');
    await drop(h, fixture('altro-gestionale-virgola.csv'), 'altro-gestionale-virgola.csv');
    const list = await h.products();
    const a1 = list.find((p) => p.sku === 'ALT-001');
    const a2 = list.find((p) => p.sku === 'ALT-002');
    let scheda = null;
    if (a1) { await openDetail(h, 'ALT-001'); scheda = { immagini: await imgs(h.page), testo: (await h.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 400) }; }
    return { finestre: seen, ALT001: brief(a1), ALT002: brief(a2), scheda };
  });

  // 4. Righe sbagliate: doppioni, SKU vuoto, giacenza e prezzo illeggibili, posizione vuota o sconosciuta, categoria sconosciuta, stato sconosciuto
  await run('ci-import-righe-errate', async (h) => {
    const seen = recordDialogs(h.page);
    await h.tab('Impostazioni');
    const prima = await h.products(0);
    await drop(h, fixture('righe-errate.csv'), 'righe-errate.csv');
    const dopo = await h.products();
    const nuovi = dopo.filter((p) => !prima.some((o) => o.id === p.id)).map(brief);
    const vis = dopo.find((p) => p.sku === 'VIS-0142');
    const out = { finestre: seen, nuovi, VIS0142prezzoInvariato: vis.sellPrice };
    await openDetail(h, 'ERR-POSX');
    out.schedaPosX = (await h.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 500);
    await openDetail(h, 'ERR-NOPOS');
    out.schedaNoPos = (await h.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 500);
    await h.shot('scheda-senza-posizione');
    return out;
  });

  // 5. Link delle immagini: JSON con link http e Drive, elenco con «;», link rotto, indirizzi locali; poi Scheda ed export
  await run('ci-import-immagini', async (h) => {
    const seen = recordDialogs(h.page);
    await h.page.route('https://img.prova.test/**', (r) => (r.request().url().includes('manca')
      ? r.fulfill({ status: 404, body: 'no' })
      : r.fulfill({ status: 200, contentType: 'image/png', body: PNG })));
    await h.tab('Impostazioni');
    await drop(h, fixture('immagini-link.csv'), 'immagini-link.csv');
    const list = await h.products();
    const out = { finestre: seen };
    for (const sku of ['IMG-JSON', 'IMG-PV', 'IMG-ROTTO', 'IMG-LOCALE']) {
      const p = list.find((x) => x.sku === sku);
      out[sku] = p && { images: p.images.map((u) => u.slice(0, 50)), backupImageLinks: (p.backupImageLinks || []).map((u) => u.slice(0, 50)) };
    }
    await openDetail(h, 'IMG-JSON');
    out.schedaJSON = { immagini: await imgs(h.page), contatore: await h.has('1/2') };
    await h.shot('scheda-img-json');
    await openDetail(h, 'IMG-ROTTO');
    out.schedaRotto = await imgs(h.page);
    await h.shot('scheda-img-rotto');
    // l'export di ritorno: che cosa resta nella colonna delle immagini?
    await h.go(''); await h.tab('Impostazioni');
    const { testo } = await esporta(h);
    const rows = parseCsv(testo.replace(/^\uFEFF/, ''));
    const ci = rows[0].indexOf('Immagini URL');
    out.export = Object.fromEntries(rows.filter((r) => r[0].startsWith('IMG-')).map((r) => [r[0], r[ci]]));
    return out;
  });

  // 6. Pulsante «Importa prodotti CSV» sul web (P18 corretto in C06): un CSV col formato dell'app
  await run('ci-import-pulsante', async (h) => {
    const seen = recordDialogs(h.page);
    await h.tab('Impostazioni');
    const chooser = h.page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
    await h.click('Importa prodotti CSV');
    const fc = await chooser;
    if (fc) await fc.setFiles({ name: 'nuovo.csv', mimeType: 'text/csv', buffer: Buffer.from('SKU,Tipo di pelle,Posizione\r\nCI-BTN-001,volpe,stand_a\r\n') });
    await h.page.waitForTimeout(2000);
    return { filechooser: !!fc, finestre: seen, importato: !!(await h.products()).find((x) => x.sku === 'CI-BTN-001') };
  });
})();
