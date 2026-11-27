// DATI (EXP + IMP, ticket 26): export leggibile, «Esporta con le foto» (ZIP), schermata «Importa prodotti» con
// abbinamento delle colonne, righe rifiutate, «+ Crea campo» con andata e ritorno, bozza, ZIP reimportato in uno
// spazio vuoto. App su :8083 (APP) o :8082, campionario su :8765.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { scenario } = require('./lib.cjs');
const { DROP, apriImport, chiudiImport, trascina } = require('./imp-util.cjs');

const CSV_DIR = path.join(__dirname, 'imp-csv');
const fixture = (n) => fs.readFileSync(path.join(CSV_DIR, n), 'utf8');

// CSV con virgola (copia di utils/csv.ts, solo per leggere i file scaricati)
function parseCsv(input, sep = ',') {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) { if (c === '"' && input[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"' && field.length === 0) quoted = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && input[i + 1] === '\n') i++; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  return rows;
}

// ZIP letto dalla directory centrale (come utils/zip.ts), con il CRC controllato da zlib
function leggiZip(buf) {
  let end = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error('non è uno ZIP');
  const n = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  const out = [];
  for (let k = 0; k < n; k++) {
    const metodo = buf.readUInt16LE(at + 10); const crc = buf.readUInt32LE(at + 16); const size = buf.readUInt32LE(at + 20);
    const nl = buf.readUInt16LE(at + 28); const el = buf.readUInt16LE(at + 30); const cl = buf.readUInt16LE(at + 32); const local = buf.readUInt32LE(at + 42);
    const name = buf.slice(at + 46, at + 46 + nl).toString('utf8');
    at += 46 + nl + el + cl;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.slice(start, start + size);
    out.push({ name, metodo, crcOk: (zlib.crc32 ? zlib.crc32(data) : crc) === crc, data });
  }
  return out;
}

async function scarica(h, voce) {
  const dl = h.page.waitForEvent('download', { timeout: 15000 });
  await h.click(voce);
  const d = await dl;
  return { nome: d.suggestedFilename(), buf: fs.readFileSync(await d.path()) };
}

const tuttoLoStorage = (h) => h.page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => !/import_draft/.test(k)).map((k) => [k, localStorage.getItem(k)])));
const stessoStorage = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

(async () => {
  // 1. «Esporta Inventario»: BOM, colonne dei campi in fondo col valore leggibile, JSON senza foto locali, avviso foto
  await scenario('dati-export-csv', async (h) => {
    await h.tab('Impostazioni');
    const prodotti = await h.products(0);
    const locali = prodotti.filter((p) => !p.deletedAt).reduce((n, p) => n + (p.images || []).filter((u) => !/^https?:/i.test(u)).length
      + (p.customData || []).filter((c) => c.fieldSnapshot?.type === 'images').reduce((m, c) => m + (Array.isArray(c.value) ? c.value : [c.value]).filter((u) => u && !/^https?:/i.test(u)).length, 0), 0);
    const { nome, buf } = await scarica(h, 'Esporta Inventario');
    const testo = buf.toString('utf8');
    const righe = parseCsv(testo.replace(/^﻿/, ''));
    const [testa, ...dati] = righe;
    const vis = dati.find((r) => r[0] === 'VIS-0142');
    const val = (col) => vis[testa.indexOf(col)];
    const json = testa.indexOf('Dati Personalizzati JSON');
    await h.page.waitForTimeout(600);
    return {
      nome: nome.replace(/\d{10,}/, '<n>'),
      bom: testo.charCodeAt(0) === 0xfeff,
      colonne: testa.length,
      dopoAltezza: testa.slice(testa.indexOf('Altezza') + 1),
      vis0142: { Taglia: val('Taglia'), Colore: val('Colore'), Fornitore: val('Fornitore'), Dettagli: val('Dettagli'), Pezzi: val('Pezzi'), 'Foto dettagli': val('Foto dettagli'), 'Posizione di consegna': val('Posizione di consegna') },
      jsonSenzaBase64: dati.every((r) => !/data:image/.test(r[json])),
      fotoLocaliAttese: locali,
    };
  });

  // 2. «Esporta con le foto»: ZIP con inventario.csv e immagini/<SKU>-<n>.jpg, colonna «Immagini file» uguale
  await scenario('dati-export-zip', async (h) => {
    await h.tab('Impostazioni');
    const prodotti = await h.products(0);
    const { nome, buf } = await scarica(h, 'Esporta con le foto');
    const voci = leggiZip(buf);
    const csv = voci.find((v) => v.name === 'inventario.csv');
    const righe = parseCsv(csv.data.toString('utf8').replace(/^﻿/, ''));
    const col = righe[0].indexOf('Immagini file');
    const nomiNelCsv = righe.slice(1).flatMap((r) => r[col].split(';').map((x) => x.trim()).filter(Boolean)).sort();
    const nomiNelloZip = voci.filter((v) => v.name.startsWith('immagini/')).map((v) => v.name.slice(9)).sort();
    const vis = prodotti.find((p) => p.sku === 'VIS-0142');
    const prima = voci.find((v) => v.name === 'immagini/VIS-0142-1.jpg');
    return {
      nome: nome.replace(/\d{10,}/, '<n>'),
      voci: voci.length,
      metodi: [...new Set(voci.map((v) => v.metodo))],
      crc: voci.every((v) => v.crcOk),
      ultimaColonna: righe[0][righe[0].length - 1],
      uguali: JSON.stringify(nomiNelCsv) === JSON.stringify(nomiNelloZip),
      vis0142: righe.find((r) => r[0] === 'VIS-0142')[col],
      primaFotoUguale: !!prima && prima.data.toString('base64') === vis.images[0].split(',')[1],
    };
  });

  // 3. CSV «;» di un altro gestionale: abbinamento proposto, nulla scritto prima di «Importa», valore per le righe
  //    vuote (Posizione), Categoria sconosciuta «Crea», poi Importa
  await scenario('dati-import-pv', async (h) => {
    await h.tab('Impostazioni');
    const prima = await tuttoLoStorage(h);
    await trascina(h, fixture('altro-gestionale-pv.csv'), 'altro-gestionale-pv.csv');
    const colonne = await h.page.locator('[aria-label^="Colonna "]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const anteprima1 = (await h.page.locator('[data-testid="import-anteprima"]').innerText()).split('\n')[0];
    await h.page.waitForTimeout(1500);
    const intatto = stessoStorage(prima, await tuttoLoStorage(h));
    await h.click('Posizione'); // valore per le righe vuote
    await h.page.locator('[role="dialog"], [aria-modal="true"]').last().getByText('Magazzino', { exact: true }).first().click();
    await h.page.waitForTimeout(500);
    const anteprima2 = (await h.page.locator('[data-testid="import-anteprima"]').innerText()).split('\n')[0];
    const avvisi = await h.page.getByText(/^Categoria sconosciuta|^Colore:/).allInnerTexts();
    const n = await chiudiImport(h);
    const list = await h.products();
    const b = list.find((p) => p.sku === 'BOR-001');
    return {
      colonne, anteprima1, intatto, anteprima2, avvisi, importati: n,
      'BOR-001': b && { location: b.location, stock: b.stock, unit: b.unit, sellPrice: b.sellPrice, note: b.technicalNotes, images: b.images, colore: (b.customData || []).map((c) => `${c.fieldSnapshot.name}=${c.value}`) },
    };
  });

  // 4. righe-errate.csv: rifiutate col motivo, «Scarica righe rifiutate»
  await scenario('dati-import-rifiutate', async (h) => {
    await h.tab('Impostazioni');
    await trascina(h, fixture('righe-errate.csv'), 'righe-errate.csv');
    const rifiutate = await h.page.getByText(/^Riga \d+ · /).allInnerTexts();
    const bottone = h.page.getByText(/^Importa \d+ prodott[oi]$/).first();
    await bottone.click(); await h.page.waitForTimeout(1500);
    const { buf } = await scarica(h, 'Scarica righe rifiutate');
    const righe = parseCsv(buf.toString('utf8').replace(/^﻿/, ''));
    await h.click('Fatto');
    const list = await h.products();
    return {
      rifiutate,
      fileRifiutate: righe.map((r) => `${r[0]} | ${r[r.length - 1]}`),
      importati: ['ERR-OK', 'ERR-PREZZO', 'ERR-STATO'].map((s) => !!list.find((p) => p.sku === s)),
      errOk: (() => { const p = list.find((x) => x.sku === 'ERR-OK'); return p && { location: p.location, libraryId: p.libraryId, sellPrice: p.sellPrice, note: p.technicalNotes ?? null }; })(),
    };
  });

  // 5. «+ Crea campo» Materiale: Campi Personalizzati con l'editor compilato, Salva, ritorno con la colonna abbinata,
  //    ricarica (bozza ritrovata), Importa: ALT-001 ha Materiale = Montone
  await scenario('dati-crea-campo', async (h) => {
    await h.tab('Impostazioni');
    await trascina(h, fixture('altro-gestionale-virgola.csv'), 'altro-gestionale-virgola.csv');
    await h.page.locator('[aria-label^="Colonna Materiale:"]').click(); await h.page.waitForTimeout(500);
    await h.click('+ Crea campo'); await h.page.waitForTimeout(1500);
    const editor = { indirizzo: new URL(h.page.url()).pathname, titolo: await h.has('Campo nuovo', true), nome: await h.page.locator('input').evaluateAll((els) => els.map((e) => e.value).filter(Boolean).slice(0, 3)) };
    await h.click('Salva Campo'); await h.page.waitForTimeout(1800);
    const tornato = { indirizzo: new URL(h.page.url()).pathname, colonna: await h.page.locator('[aria-label^="Colonna Materiale:"]').getAttribute('aria-label').catch(() => null) };
    await h.page.reload(); await h.page.waitForTimeout(3000);
    const dopoRicarica = {
      file: await h.page.locator('[data-testid="import-file"]').innerText().catch(() => null),
      colonna: await h.page.locator('[aria-label^="Colonna Materiale:"]').getAttribute('aria-label').catch(() => null),
      nota: await h.has('il campo creato resta anche se annulli l\'import'),
    };
    await h.click('Posizione');
    await h.page.locator('[role="dialog"], [aria-modal="true"]').last().getByText('Vetrina', { exact: true }).first().click();
    await h.page.waitForTimeout(500);
    const n = await chiudiImport(h);
    const campi = await h.store('furinventory_custom_fields:local', 0);
    const layout = await h.store('furinventory_layout_config:local', 0);
    const materiale = (campi || []).find((f) => f.name === 'Materiale');
    const a = (await h.products()).find((p) => p.sku === 'ALT-001');
    const val = a && (a.customData || []).find((c) => c.fieldSnapshot.name === 'Materiale');
    const etichetta = val && (materiale.options || []).find((o) => o.id === val.value)?.label;
    return { editor, tornato, dopoRicarica, importati: n, campo: materiale && { tipo: materiale.type, opzioni: (materiale.options || []).map((o) => o.label), nelLayout: layout.fields.some((f) => f.id === materiale.id) }, 'ALT-001 Materiale': etichetta ?? val?.value };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 6. Andata e ritorno: «Esporta con le foto», spazio vuoto, import dello ZIP: stessi prodotti, foto uguali nella Scheda
  await scenario('dati-zip-reimporta', async (h) => {
    await h.tab('Impostazioni');
    const originali = (await h.products(0)).filter((p) => !p.deletedAt);
    const { buf } = await scarica(h, 'Esporta con le foto');
    await h.page.evaluate(() => {
      localStorage.setItem('inventory:v1:local:products', '[]');
      localStorage.setItem('inventory:v1:local:timeline', '[]');
    });
    await h.go('settings'); await h.page.waitForTimeout(800);
    await apriImport(h);
    const prima = await tuttoLoStorage(h);
    await trascina(h, buf, 'inventario.zip', 'application/zip');
    await h.page.waitForTimeout(800);
    const intatto = stessoStorage(prima, await tuttoLoStorage(h));
    const file = await h.page.locator('[data-testid="import-file"]').innerText().catch(() => null);
    const n = await chiudiImport(h);
    const dopo = await h.products();
    const confronto = originali.map((o) => {
      const p = dopo.find((x) => x.sku === o.sku);
      if (!p) return `${o.sku}: manca`;
      const diff = ['furType', 'location', 'status', 'sellPrice', 'purchasePrice', 'libraryId', 'gs1DigitalLink', 'unit', 'minStock', 'shelfId', 'height']
        .filter((k) => JSON.stringify(o[k] ?? null) !== JSON.stringify(p[k] ?? null));
      if (JSON.stringify(o.images) !== JSON.stringify(p.images)) diff.push('foto');
      if (JSON.stringify(o.stock ?? null) !== JSON.stringify(p.stock ?? null)) diff.push('giacenza');
      const campi = (x) => JSON.stringify((x.customData || []).filter((c) => !['images', 'document'].includes(c.fieldSnapshot.type)).map((c) => [c.fieldSnapshot.id, c.value]));
      if (campi(o) !== campi(p)) diff.push('campi');
      return `${o.sku}: ${diff.length ? diff.join(',') : 'uguale'}`;
    });
    const vis = dopo.find((p) => p.sku === 'VIS-0142');
    await h.go(`product/${vis.id}`); await h.page.waitForTimeout(1500);
    const fotoScheda = await h.page.locator('img').evaluateAll((els, uno) => els.filter((e) => e.src === uno).length, vis.images[0]);
    return { file, intatto, importati: n, confronto, fotoSchedaUguale: fotoScheda > 0 };
  });
})();
