// S1b (ticket 13): giacenza degli articoli a quantità sugli scaffali. Chiavi di `stock` nella forma 2:
// `magazzino` (posizione) e `magazzino/<idScaffale>` (scaffale di quella posizione). Ogni scenario legge lo stato
// salvato e controlla che la giacenza salvata sia quella degli eventi `stock` rigiocati (`check`, come m03-giacenza)
// e l'`invariante`: ogni chiave è una posizione oppure posizione/scaffale di quella posizione, nessuna posizione del
// prodotto è composta, nessun articolo a quantità ha `shelfId`.
// - Scheda: VIS-0098 con 5 pezzi in Magazzino e 3 su A1 → totale 8, Magazzino 8, A1 3; la Conta lo aspetta a 8;
// - Movimenta da A1 a Stand B e dalla posizione allo scaffale (Magazzino → Magazzino › A1);
// - Conta di Magazzino: la differenza va prima sulla posizione senza scaffale, poi sugli scaffali;
// - Vendi da A1 (Scarico con causale Vendita) e Vendita flash di un articolo che sta solo su uno scaffale;
// - Spostamento rapido (tutta la posizione principale, scaffali compresi) e Scanner sul codice dello scaffale;
// - export e reimport del CSV con lo scaffale; scaffale per nome e per codice; scaffale sconosciuto rifiutato;
// - eliminazione di A1 rifiutata finché ha giacenza, poi accettata.
// Uso: node s1b-giacenza.cjs [nome-scenario]   (senza argomento li esegue tutti)
const fs = require('fs');
const { scenario } = require('./lib.cjs');
const { scan } = require('./a3-util.cjs');

const P = 'inventory:v1:local:products';
const T = 'inventory:v1:local:timeline';
const S = 'furinventory_shelves:local';
const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);

// Scaffali come li scrive l'app (id opachi), come in s1-scaffali
const SHELVES = [
  { id: '1732300000000-gen1', name: 'A1', locationId: 'magazzino', barcode: 'SCAF-MAG-A1' },
  { id: '1732300000000-gen2', name: 'A2', locationId: 'magazzino' },
  { id: '1732300000000-vet1', name: 'Vetrina alta', locationId: 'vetrina' },
];
const A1 = SHELVES[0].id;
const KA1 = `magazzino/${A1}`;
const NOME = Object.fromEntries(SHELVES.map((s) => [s.id, s.name]));
/** Chiave leggibile per i risultati: `magazzino/1732…-gen1` → `magazzino/A1`. */
const leggibile = (stock) => stock && Object.fromEntries(Object.entries(stock).map(([k, q]) => {
  const at = k.lastIndexOf('/');
  return [at > 0 ? `${k.slice(0, at)}/${NOME[k.slice(at + 1)] ?? '?'}` : k, q];
}));

/** Stato salvato: scaffali e articoli a quantità ({ SKU: stock }) con i loro carichi «iniziale», poi ricarica. */
async function prepara(h, products) {
  await h.page.evaluate(([pk, tk, sk, shelves, products]) => {
    localStorage.setItem(sk, JSON.stringify(shelves));
    const list = JSON.parse(localStorage.getItem(pk));
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    for (const [sku, stock] of Object.entries(products)) {
      const p = list.find((x) => x.sku === sku);
      Object.assign(p, { stock, unit: 'pz', location: 'magazzino' });
      delete p.shelfId;
      let after = 0;
      for (const [place, qty] of Object.entries(stock)) {
        if (qty <= 0) continue;
        tl.unshift({ id: `s1b-${sku}-${place}`, productId: p.id, type: 'stock', timestamp: '2026-11-24T08:00:00.000Z', details: { movement: 'carico', qty, to: place, reason: 'iniziale', before: after, after: after + qty } });
        after += qty;
      }
    }
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  }, [P, T, S, SHELVES, products]);
  await h.go('');
}

function replay(events) {
  const m = {};
  for (const e of events) {
    if (e.type !== 'stock' || typeof e.details.qty !== 'number') continue;
    const q = Math.round(e.details.qty * 1000);
    if (e.details.from) m[e.details.from] = (m[e.details.from] || 0) - q;
    if (e.details.to) m[e.details.to] = (m[e.details.to] || 0) + q;
  }
  return Object.fromEntries(Object.entries(m).filter(([, v]) => v !== 0).map(([k, v]) => [k, v / 1000]));
}
const positive = (stock) => Object.fromEntries(Object.entries(stock || {}).filter(([, q]) => q > 0));
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
/** Giacenza salvata (chiavi leggibili), posizione principale e «giacenza salvata = eventi rigiocati». */
async function check(h, sku, wait = 1500) {
  const list = await h.products(wait);
  const p = list.find((x) => x.sku === sku);
  const ev = (await h.timeline(0)).filter((e) => e.productId === p.id);
  return { location: p.location, stock: leggibile(p.stock), coincide: same(positive(p.stock), replay(ev)) };
}

/** Ogni chiave è una posizione o posizione/scaffale di quella posizione; posizione mai composta; nessun shelfId a quantità. */
async function invariante(h) {
  const products = await h.products(0);
  const shelves = (await h.store(S, 0)) || [];
  const bad = [];
  for (const p of products) {
    for (const k of Object.keys(p.stock || {})) {
      const at = k.lastIndexOf('/');
      if (at <= 0) { if (shelves.some((s) => s.id === k || s.barcode === k)) bad.push(`${p.sku}:${k}`); continue; }
      const s = shelves.find((x) => x.id === k.slice(at + 1));
      if (!s || s.locationId !== k.slice(0, at)) bad.push(`${p.sku}:${k}`);
    }
  }
  return {
    chiaviNonValide: bad,
    posizioniComposte: products.filter((p) => (p.location || '').includes('/') || shelves.some((s) => s.id === p.location)).map((p) => p.sku),
    aQuantitaConScaffale: products.filter((p) => p.stock && p.shelfId).map((p) => p.sku),
  };
}

const label = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
/** Testo del riquadro «Giacenza» della Scheda, riga per riga. */
const giacenza = (h) => h.page.evaluate(() => {
  const title = [...document.querySelectorAll('div')].find((e) => e.textContent.trim() === 'Giacenza' && e.offsetParent);
  const card = title?.nextElementSibling;
  return card ? card.innerText.split('\n').map((s) => s.trim()).filter(Boolean) : null;
});
async function apri(h, sku) {
  await h.go('');
  await h.click(sku); await h.page.waitForTimeout(800);
}
async function movimento(h, { tipo, da, a, qty, causale }) {
  await label(h, 'Movimenta').click(); await h.page.waitForTimeout(500);
  await label(h, `Tipo ${tipo}`).click();
  for (const name of [].concat(da || [])) await label(h, name).click();
  for (const name of [].concat(a || [])) await label(h, name).click();
  await h.page.locator('input[placeholder^="es. 2,5"], input[placeholder^="Registrata"]').locator('visible=true').first().fill(qty);
  if (causale) await label(h, `Causale ${causale}`).click();
  await label(h, 'Registra movimento').click();
  await h.page.waitForTimeout(700);
}
/** Pillole degli scaffali nella finestra Movimenta (etichetta accessibile e testo). */
const pilloleScaffale = (h) => h.page.evaluate(() => [...document.querySelectorAll('[aria-label]')]
  .filter((e) => / › /.test(e.getAttribute('aria-label')) && e.getClientRects().length > 0)
  .map((e) => `${e.getAttribute('aria-label')} = ${e.innerText.replace(/\s+/g, ' ').trim()}`));

// Copia in JS di utils/csv.ts (solo per leggere il file scaricato), come in s1-scaffali
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
const toCsv = (rows) => rows.map((r) => r.map((v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\r\n');
async function drop(h, csv, name = 'prova.csv') {
  const dt = await h.page.evaluateHandle(([text, n]) => {
    const d = new DataTransfer(); d.items.add(new File([text], n, { type: 'text/csv' })); return d;
  }, [csv, name]);
  await h.page.locator('[aria-label="Importa CSV trascinando un file qui"]').dispatchEvent('drop', { dataTransfer: dt });
  await h.page.waitForTimeout(1500);
}
async function scarica(h, voce) {
  const dl = h.page.waitForEvent('download', { timeout: 8000 });
  await h.click(voce);
  const d = await dl;
  return parseCsv(fs.readFileSync(await d.path(), 'utf8').replace(/^﻿/, ''));
}

(async () => {
  // 1. Scheda e letture: 5 in Magazzino e 3 su A1 → totale 8, Magazzino 8 (con A1 3 e senza scaffale 5); la Conta
  //    di Magazzino lo aspetta a 8; la card dice 8 pz
  await run('s1b-scheda', async (h) => {
    await prepara(h, { 'VIS-0098': { magazzino: 5, [KA1]: 3 } });
    const card = await h.vis('VIS-0098').evaluate((e) => e.parentElement.innerText.replace(/\s+/g, ' ').trim());
    await apri(h, 'VIS-0098');
    const scheda = await giacenza(h);
    await h.go('automations/count');
    const contaVoce = await h.page.evaluate(() => [...document.querySelectorAll('[aria-label^="Conta Magazzino"]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim())[0]);
    await label(h, 'Conta Magazzino').click(); await h.page.waitForTimeout(500);
    const riga = await h.has('Registrata: 8 pz');
    return { card, scheda, contaVoce, conta: { registrata8: riga }, ...(await check(h, 'VIS-0098')), invariante: await invariante(h) };
  });

  // 2. Movimenta: le pillole degli scaffali; da A1 a Stand B (2); dalla posizione allo scaffale A2 (1)
  await run('s1b-movimenta', async (h) => {
    await prepara(h, { 'VIS-0098': { magazzino: 5, [KA1]: 3 } });
    await apri(h, 'VIS-0098');
    await label(h, 'Movimenta').click(); await h.page.waitForTimeout(500);
    await label(h, 'Tipo Trasferimento').click();
    const pillole = await pilloleScaffale(h);
    await label(h, 'Chiudi').click();
    await h.page.waitForTimeout(400);
    await movimento(h, { tipo: 'Trasferimento', da: 'Da Magazzino › A1', a: 'A Stand B', qty: '2' });
    const dopoA1 = await check(h, 'VIS-0098');
    await movimento(h, { tipo: 'Trasferimento', da: 'Da Magazzino › Nessuno scaffale', a: ['A Magazzino', 'A Magazzino › A2'], qty: '1' });
    const dopoA2 = await check(h, 'VIS-0098');
    const scheda = await giacenza(h);
    await h.go('');
    await h.tab('Cronologia');
    const cronologia = await h.page.evaluate(() => (document.body.innerText.match(/VIS-0098 - Trasferimento:[^\n]*/g) || []).slice(0, 2));
    return { pillole, dopoA1, dopoA2, scheda, cronologia, invariante: await invariante(h) };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 3. Conta di Magazzino: contati 2 su 8 → −5 senza scaffale e −1 su A1; la Scheda e gli eventi tornano
  await run('s1b-conta', async (h) => {
    await prepara(h, { 'VIS-0098': { magazzino: 5, [KA1]: 3 } });
    await h.go('automations/count');
    await label(h, 'Conta Magazzino').click(); await h.page.waitForTimeout(500);
    await label(h, 'Contata VIS-0098').fill('2');
    await label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(500);
    const riepilogo = await h.page.evaluate(() => (document.body.innerText.match(/8 → 2 pz/) || [])[0] || null);
    await label(h, 'Registra rettifiche').click(); await h.page.waitForTimeout(800);
    const esito = await h.page.evaluate(() => (document.body.innerText.match(/\d+ rettific[ah][^\n]*/) || [])[0] || null);
    const dopo = await check(h, 'VIS-0098');
    const rettifiche = (await h.timeline(0)).filter((e) => e.type === 'stock' && e.details.movement === 'rettifica')
      .map((e) => `${Object.keys(leggibile({ [e.details.from || e.details.to]: 0 }))[0]} ${e.details.from ? '-' : '+'}${e.details.qty} (${e.details.before}→${e.details.after})`).reverse();
    return { riepilogo, esito, dopo, rettifiche, invariante: await invariante(h) };
  });

  // 4. Vendi da A1 (Scarico, causale Vendita, prezzo di listino) e Vendita flash di LIN-0021, che sta solo su A1
  await run('s1b-vendi', async (h) => {
    await prepara(h, { 'VIS-0098': { magazzino: 5, [KA1]: 3 }, 'LIN-0021': { [KA1]: 2 } });
    await apri(h, 'VIS-0098');
    await movimento(h, { tipo: 'Scarico', da: 'Da Magazzino › A1', qty: '1', causale: 'Vendita' });
    const vis = await check(h, 'VIS-0098');
    const vendita = (await h.timeline(0)).find((e) => e.type === 'stock' && e.details.reason === 'vendita');
    await h.go('automations/scan-sell');
    await h.click('Scansiona Prodotto');
    await scan(h, 'LIN-0021');
    await h.click('CONFERMA VENDITA');
    const lin = await check(h, 'LIN-0021');
    const flash = (await h.timeline(0)).filter((e) => e.type === 'stock' && e.details.reason === 'vendita').map((e) => Object.keys(leggibile({ [e.details.from]: 0 }))[0]);
    return { vis, venditaDa: Object.keys(leggibile({ [vendita.details.from]: 0 }))[0], prezzo: vendita.details.finalPrice != null, lin, flash, invariante: await invariante(h) };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 5. Spostamento rapido di VIS-0098 in Stand C: tutta la posizione principale, scaffale compreso (due eventi);
  //    Scanner sul codice di A1: lo scaffale elenca LIN-0021 con la sua quantità
  await run('s1b-sposta', async (h) => {
    await prepara(h, { 'VIS-0098': { magazzino: 5, [KA1]: 3 }, 'LIN-0021': { [KA1]: 2 } });
    await h.go('scanner');
    await scan(h, 'SCAF-MAG-A1', { wait: 1500 });
    const scaffale = await h.page.evaluate(() => (document.body.innerText.match(/Prodotti sullo scaffale[\s\S]*?(?=Chiudi)/) || [''])[0].split('\n').map((s) => s.trim()).filter(Boolean));
    await h.go('automations/batch-move');
    await h.click('Stand C');
    await h.click('Scansiona Prodotto');
    await scan(h, 'VIS-0098', { wait: 1500 });
    const vis = await check(h, 'VIS-0098');
    const eventi = (await h.timeline(0)).filter((e) => e.type === 'stock' && e.details.movement === 'trasferimento').map((e) => `${Object.keys(leggibile({ [e.details.from]: 0 }))[0]}→${e.details.to} ${e.details.qty}`).reverse();
    return { scaffale, vis, eventi, invariante: await invariante(h) };
  }, { dialogs: Array(6).fill('ok') });

  // 6. CSV: export con lo scaffale nella Giacenza, reimport uguale; scaffale per nome e per codice; scaffale
  //    sconosciuto e posizione con «/» rifiutati
  await run('s1b-csv', async (h) => {
    await prepara(h, { 'VIS-0098': { magazzino: 5, [KA1]: 3 } });
    await h.tab('Impostazioni');
    const righe = await scarica(h, 'Esporta Inventario');
    const header = righe[0];
    const g = header.indexOf('Giacenza');
    const riga = righe.find((r) => r[0] === 'VIS-0098');
    const cella = riga[g].replace(A1, '<A1>');
    await drop(h, toCsv([header, riga.map((v, i) => (i === 0 ? 'RT-VIS-0098' : v))]), 'reimport.csv');
    await drop(h, [
      'SKU,Tipo di pelle,Posizione,Giacenza',
      'S1B-NOME,visone,magazzino,magazzino/a2:4',
      'S1B-CODICE,visone,vetrina,SCAF-MAG-A1:2; vetrina:1',
      'S1B-IGNOTO,visone,magazzino,magazzino/zz:1',
      'S1B-BARRA,visone,mag/azzino,mag/azzino:1',
    ].join('\r\n'), 'scaffali.csv');
    const list = await h.products();
    const importati = list.filter((p) => /^S1B-|^RT-VIS/.test(p.sku)).map((p) => `${p.sku}|${p.location}|${JSON.stringify(leggibile(p.stock))}`).sort();
    const rt = await check(h, 'RT-VIS-0098', 0);
    return { cella, importati, rt, invariante: await invariante(h) };
  }, { dialogs: Array(6).fill('ok') });

  // 7. Eliminazione di A1: rifiutata finché ha giacenza (anche di un articolo nel cestino), poi accettata
  await run('s1b-elimina', async (h) => {
    await prepara(h, { 'VIS-0098': { magazzino: 5, [KA1]: 3 } });
    await h.go('settings/shelves');
    const riga = await h.has('Generico · 1 prodotto', true);
    await label(h, 'Elimina scaffale A1').click(); await h.page.waitForTimeout(600);
    const restaA1 = (await h.store(S, 0)).some((s) => s.id === A1);
    // Si toglie la giacenza da A1 (Movimenta → Magazzino senza scaffale), poi si elimina
    await apri(h, 'VIS-0098');
    await movimento(h, { tipo: 'Trasferimento', da: 'Da Magazzino › A1', a: ['A Magazzino', 'A Magazzino › Nessuno scaffale'], qty: '3' });
    const vis = await check(h, 'VIS-0098');
    await h.go('settings/shelves');
    await label(h, 'Elimina scaffale A1').click(); await h.page.waitForTimeout(800);
    const restano = (await h.store(S, 0)).map((s) => s.name);
    return { riga, restaA1, vis, restano, invariante: await invariante(h) };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });
})();
