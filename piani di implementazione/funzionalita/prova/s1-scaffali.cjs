// S1a (ticket 13): scaffali, anagrafica e pezzi unici. Ogni scenario legge lo stato salvato:
// - i prodotti di oggi si vedono come prima e nessuna chiave salvata cambia aprendo le schermate;
// - Impostazioni › Scaffali: generici e di una categoria, con codice e tag; nome e codice doppioni rifiutati;
// - lo scaffale proposto e assegnato a un pezzo unico in Aggiungi e Modifica (anche per una sottocategoria), visto
//   nella Scheda e nella card; spostare il prodotto in un'altra posizione lo toglie (Modifica e Azione rapida);
// - eliminazioni rifiutate: posizione con scaffali, categoria usata da uno scaffale, scaffale con prodotti;
// - lo Scanner riconosce il codice (e l'id) di uno scaffale;
// - articolo a quantità: niente selettore e **nessuna chiave di `stock` è uno scaffale** dopo Aggiungi, Movimenta,
//   Conta, Spostamento rapido, Audit, Azione rapida e import (`invariante`, letto dallo stato salvato);
// - export e import del CSV con la colonna «Scaffale»; i CSV di prima (C1) si leggono come prima.
// Uso: node s1-scaffali.cjs [nome-scenario]   (senza argomento li esegue tutti)
const fs = require('fs');
const path = require('path');
const { scenario } = require('./lib.cjs');
const { press } = require('./a1-util.cjs');
const { scan } = require('./a3-util.cjs');

const P = 'inventory:v1:local:products';
const T = 'inventory:v1:local:timeline';
const L = 'inventory:v1:local:libraries';
const S = 'furinventory_shelves:local';
const LOC = 'furinventory_locations:local';
const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);

// Scaffali scritti come li scrive l'app (id opachi). Pellicce › Visone è una sottocategoria.
const SHELVES = [
  { id: '1732300000000-gen1', name: 'A1', locationId: 'magazzino', barcode: 'SCAF-MAG-A1' },
  { id: '1732300000000-pel1', name: 'P1', locationId: 'magazzino', libraryId: 'pellicce', barcode: 'SCAF-MAG-P1', nfcTag: '04:AA:BB:CC' },
  { id: '1732300000000-vis1', name: 'V1', locationId: 'magazzino', libraryId: 'visone' },
  { id: '1732300000000-inv1', name: 'I1', locationId: 'magazzino', libraryId: 'collezione-inverno' },
  { id: '1732300000000-vet1', name: 'Vetrina alta', locationId: 'vetrina' },
];
const ID = Object.fromEntries(SHELVES.map((s) => [s.name, s.id]));

/** Stato salvato prima di aprire l'app: scaffali, sottocategoria Visone, cambi ai prodotti ({ SKU: campi }). */
async function prepara(h, { shelves = SHELVES, products = {}, extra } = {}) {
  await h.page.evaluate(([pk, tk, lk, sk, shelves, products]) => {
    const libs = JSON.parse(localStorage.getItem(lk));
    if (!libs.some((l) => l.id === 'visone')) libs.push({ id: 'visone', name: 'Visone', icon: 'folder', createdAt: '2026-11-22T20:00:00.000Z', parentId: 'pellicce' });
    localStorage.setItem(lk, JSON.stringify(libs));
    if (shelves) localStorage.setItem(sk, JSON.stringify(shelves));
    const list = JSON.parse(localStorage.getItem(pk));
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    for (const [sku, change] of Object.entries(products)) {
      const p = list.find((x) => x.sku === sku);
      Object.assign(p, change);
      for (const [place, qty] of Object.entries(change.stock || {})) {
        if (qty > 0) tl.unshift({ id: `s1-${sku}-${place}`, productId: p.id, type: 'stock', timestamp: '2026-11-22T08:00:00.000Z', details: { movement: 'carico', qty, to: place, reason: 'iniziale', before: 0, after: qty } });
      }
    }
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  }, [P, T, L, S, shelves, products]);
  if (extra) await h.page.evaluate(extra);
  await h.go('');
}

/** Nessuna chiave di `stock` (né la posizione) è uno scaffale, per id o per codice; nessun articolo a quantità ha `shelfId`. */
async function invariante(h) {
  const products = await h.products(1500);
  const shelves = (await h.store(S, 0)) || [];
  const ids = new Set(shelves.flatMap((s) => [s.id, s.barcode].filter(Boolean)));
  return {
    chiaviScaffale: products.flatMap((p) => Object.keys(p.stock || {}).filter((k) => ids.has(k)).map((k) => `${p.sku}:${k}`)),
    posizioniScaffale: products.filter((p) => ids.has(p.location)).map((p) => p.sku),
    aQuantitaConScaffale: products.filter((p) => p.stock && p.shelfId).map((p) => p.sku),
  };
}

// Copia in JS di utils/csv.ts (solo per leggere il file scaricato)
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
const DROP = '[aria-label="Importa CSV trascinando un file qui"]';
async function drop(h, csv, name = 'prova.csv') {
  const dt = await h.page.evaluateHandle(([text, n]) => {
    const d = new DataTransfer(); d.items.add(new File([text], n, { type: 'text/csv' })); return d;
  }, [csv, name]);
  await h.page.locator(DROP).dispatchEvent('drop', { dataTransfer: dt });
  await h.page.waitForTimeout(1500);
}
async function scarica(h, voce) {
  const dl = h.page.waitForEvent('download', { timeout: 8000 });
  await h.click(voce);
  const d = await dl;
  return parseCsv(fs.readFileSync(await d.path(), 'utf8').replace(/^﻿/, ''));
}

const label = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
const hasLabel = async (h, name) => (await h.page.getByLabel(name, { exact: true }).locator('visible=true').count()) > 0;
/** Pillole degli scaffali proposte (nell'ordine sullo schermo); «*» = accesa. Sul web `aria-selected` non c'è per i
 *  pulsanti e in alcuni stili la pillola accesa non ha fondo sfumato: si riconosce dal colore dell'icona, diverso da
 *  quello di tutte le altre (con almeno tre pillole). */
const pillole = (h) => h.page.evaluate(() => {
  const chips = [...document.querySelectorAll('[aria-label]')]
    .filter((e) => /^(Scaffale |Nessuno scaffale$)/.test(e.getAttribute('aria-label')) && e.getClientRects().length > 0);
  const colors = chips.map((e) => getComputedStyle(e.querySelector('div[dir]') || e).color);
  const count = (c) => colors.filter((x) => x === c).length;
  return chips.map((e, i) => `${e.getAttribute('aria-label')}${chips.length >= 3 && count(colors[i]) === 1 ? ' *' : ''}`);
});
// Modifica aperta dalla Scheda, come fa l'utente (dopo il salvataggio si torna indietro: serve la cronologia)
const openEdit = async (h, sku) => {
  await h.go('');
  await h.click(sku); await h.page.waitForTimeout(800);
  await press(h.page, /^.?\s*Modifica$/); await h.page.waitForTimeout(800);
};
const card = (h, sku) => h.vis(sku).evaluate((e) => e.parentElement.innerText.replace(/\s+/g, ' ').trim());
const snapshot = (h) => h.page.evaluate(() => Object.fromEntries(Object.keys(localStorage)
  .filter((k) => k !== 'inventory:v1:local:alerts' && !k.startsWith('loki') && !k.startsWith('expo'))
  .sort().map((k) => [k, localStorage.getItem(k)])));
const changedKeys = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
const field = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
const of = (list, sku) => list.find((p) => p.sku === sku);

(async () => {
  // 1. Prodotti di oggi, senza scaffali: si vedono come prima, nessun selettore, nessuna chiave salvata cambia
  await run('s1-oggi', async (h) => {
    const prima = await snapshot(h);
    const cards = { 'VIS-0142': await card(h, 'VIS-0142'), 'VIS-0098': await card(h, 'VIS-0098') };
    await h.click('VIS-0098');
    const scheda = { posizione: await h.has('Posizione attuale', true), scaffale: await h.has('Scaffale', false) };
    await h.go('add');
    await h.click('Magazzino');
    const aggiungi = { scaffale: await h.has('Scaffale', true) };
    await openEdit(h, 'VIS-0098');
    const modifica = { scaffale: await h.has('Scaffale (facoltativo)', true) };
    await h.go('settings');
    const impostazioni = await h.has('Scaffali', true);
    await h.go('settings/shelves');
    const gestione = { vuota: await h.has('Nessuno scaffale: crea il primo qui sopra.', true), modulo: await h.has('Nuovo scaffale', true), elenco: await h.has('Scaffali (0)', true) };
    await h.go('settings/locations');
    const dopo = await snapshot(h);
    return { cards, scheda, aggiungi, modifica, impostazioni, gestione, chiaviCambiate: changedKeys(prima, dopo), chiaveScaffali: dopo[S] ?? null };
  });

  // 2. Impostazioni › Scaffali: generico con codice generato, di una categoria con codice e tag, stesso nome in
  //    un'altra posizione; nome doppio nella stessa posizione e codici già usati rifiutati; modifica (posizione fissa)
  await run('s1-anagrafica', async (h) => {
    await prepara(h, { shelves: null });
    await h.go('settings/shelves');
    await field(h, 'Nome').fill('A1');
    await label(h, 'Posizione Magazzino').click();
    await label(h, 'Genera il codice').click(); await h.page.waitForTimeout(300);
    const generato = await field(h, 'Codice dello scaffale').inputValue();
    await label(h, 'Crea scaffale').click(); await h.page.waitForTimeout(600);
    await label(h, 'Nuovo scaffale').click(); await h.page.waitForTimeout(300);
    await field(h, 'Nome').fill('Giacche');
    await label(h, 'Posizione Magazzino').click();
    await label(h, 'Categoria Pellicce').click();
    await field(h, 'Codice dello scaffale').fill('SCAF-GIACCHE');
    await field(h, 'Tag NFC (facoltativo)').fill('04:A2:3B:1C');
    await label(h, 'Crea scaffale').click(); await h.page.waitForTimeout(600);
    // stesso nome in un'altra posizione: va bene
    await label(h, 'Nuovo scaffale').click(); await h.page.waitForTimeout(300);
    await field(h, 'Nome').fill('A1');
    await label(h, 'Posizione Vetrina').click();
    await label(h, 'Crea scaffale').click(); await h.page.waitForTimeout(600);
    const dopoTre = (await h.store(S)) || [];
    // rifiutati: nome doppio in Magazzino, codice di un altro scaffale, SKU di un prodotto, id di una posizione
    await label(h, 'Nuovo scaffale').click(); await h.page.waitForTimeout(300);
    await field(h, 'Nome').fill(' a1 ');
    await label(h, 'Posizione Magazzino').click();
    await label(h, 'Crea scaffale').click(); await h.page.waitForTimeout(500);
    await field(h, 'Nome').fill('B1');
    for (const code of ['scaf-giacche', 'VIS-0142', 'vetrina']) {
      await field(h, 'Codice dello scaffale').fill(code);
      await label(h, 'Crea scaffale').click(); await h.page.waitForTimeout(500);
    }
    const dopoRifiuti = ((await h.store(S, 300)) || []).length;
    // modifica: nome e categoria; la posizione si vede ma non si cambia
    await h.click('Annulla');
    await label(h, 'Modifica scaffale Giacche').click(); await h.page.waitForTimeout(400);
    const modifica = { titolo: await h.has('Modifica scaffale', true), posizioneFissa: await h.has('La posizione si sceglie alla creazione e poi resta quella.', true), pilloleposizione: await hasLabel(h, 'Posizione Vetrina') };
    await field(h, 'Nome').fill('Giacche lunghe');
    await label(h, 'Categoria Collezione Inverno').click();
    await label(h, 'Salva scaffale').click(); await h.page.waitForTimeout(600);
    const finale = (await h.store(S)) || [];
    const giacchePrima = dopoTre.find((s) => s.name === 'Giacche');
    const giaccheDopo = finale.find((s) => s.id === giacchePrima?.id);
    // Posizioni e Categorie rifiutano un codice già usato da uno scaffale (lo Scanner aprirebbe l'altra cosa)
    const locPrima = await h.store(LOC, 0);
    const libPrima = await h.store(L, 0);
    await h.go('settings/locations');
    await h.page.getByPlaceholder('Es. Magazzino A, Scaffale 1').fill('Deposito');
    await h.page.getByPlaceholder('Scansiona o Genera...').fill('SCAF-GIACCHE');
    await h.click('Crea Posizione');
    await h.go('settings/folders');
    await h.page.getByPlaceholder('Nome categoria (es: Giacche)').fill('Borse');
    await h.page.getByPlaceholder('Scansiona o Genera...').fill('scaf-magazzino-a1');
    await h.click('Crea Categoria');
    const codiciAltrove = {
      posizioniUguali: JSON.stringify(await h.store(LOC, 500)) === JSON.stringify(locPrima),
      categorieUguali: JSON.stringify(await h.store(L, 0)) === JSON.stringify(libPrima),
    };
    await h.go('settings/shelves');
    const elenco = { magazzino: await h.has('Magazzino · 2', true), vetrina: await h.has('Vetrina · 1', true), generico: await h.has('Generico · Nessun prodotto', true) };
    return {
      generato,
      salvati: dopoTre.map((s) => ({ ...s, id: /^\d{13}-[a-z0-9]+$/.test(s.id) ? 'opaco' : s.id, createdAt: !!s.createdAt })),
      dopoRifiuti, modifica,
      giacche: giaccheDopo && { stessoId: !!giaccheDopo, name: giaccheDopo.name, libraryId: giaccheDopo.libraryId, locationId: giaccheDopo.locationId, barcode: giaccheDopo.barcode, nfcTag: giaccheDopo.nfcTag },
      elenco, codiciAltrove,
    };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'] });

  // 3. Pezzo unico: Aggiungi propone gli scaffali della posizione e della categoria (anche quella sopra la
  //    sottocategoria) più i generici; Scheda e card; Modifica assegna e poi cambia posizione (scaffale tolto);
  //    l'Azione rapida sposta il prodotto in un'altra posizione (scaffale tolto); i prodotti senza scaffale come prima
  await run('s1-pezzo-unico', async (h) => {
    await prepara(h, { products: { 'VIS-0098': { libraryId: 'visone' } } });
    const cardOggi = await card(h, 'VIS-0142'); // in Vetrina, che ha uno scaffale: senza shelfId resta «Vetrina»
    await h.go('add');
    await h.click('Visone'); // tipo di pelle
    await h.click('Magazzino');
    const soloGenerici = await pillole(h);
    await label(h, 'Categoria Pellicce').click();
    await label(h, 'Sottocategoria Visone').click();
    const proposte = await pillole(h);
    await label(h, 'Scaffale P1').click();
    await h.click('M'); // Taglia, obbligatoria nel campionario
    await h.page.getByPlaceholder('Auto: LOG-2026-001').fill('S1-NEW-1');
    await h.click("Aggiungi all'Inventario");
    const nuovo = of(await h.products(), 'S1-NEW-1');
    await h.go('');
    const cardNuovo = await card(h, 'S1-NEW-1');
    await h.click('S1-NEW-1');
    const schedaNuovo = await h.has('Scaffale P1', true);
    // Modifica di VIS-0098 (Magazzino, Pellicce › Visone): scaffale A1
    await openEdit(h, 'VIS-0098');
    const proposteModifica = await pillole(h);
    await label(h, 'Scaffale A1').click();
    await h.click('Salva Modifiche');
    const vis = of(await h.products(), 'VIS-0098');
    // Modifica: posizione Vetrina → le pillole cambiano, A1 non c'è più; salvato senza scaffale
    await openEdit(h, 'VIS-0098');
    const accesaPrima = await pillole(h);
    await h.click('Vetrina');
    const proposteVetrina = await pillole(h);
    await h.click('Salva Modifiche');
    const visVetrina = of(await h.products(), 'VIS-0098');
    const cronologia = (await h.timeline(0)).filter((e) => e.productId === vis.id && e.type === 'modified').map((e) => e.details.changes).reverse();
    // Azione rapida: S1-NEW-1 spostato in Stand A → scaffale tolto
    await h.go('scanner');
    await h.click('Inserisci Manualmente');
    await h.page.getByPlaceholder('Es: SKU-001, 1234567890123').fill('s1-new-1');
    await h.click('Cerca');
    await h.click('SPOSTATO');
    await h.click('Stand A');
    await h.click('Conferma Spostamento');
    const spostato = of(await h.products(), 'S1-NEW-1');
    const altriSenzaScaffale = (await h.products(0)).filter((p) => !['S1-NEW-1', 'VIS-0098'].includes(p.sku) && 'shelfId' in p).map((p) => p.sku);
    return {
      cardOggi, soloGenerici, proposte,
      nuovo: nuovo && { location: nuovo.location, libraryId: nuovo.libraryId, shelfId: nuovo.shelfId, stock: nuovo.stock ?? null },
      cardNuovo, schedaNuovo, proposteModifica,
      vis: { shelfId: vis.shelfId, location: vis.location },
      accesaPrima, proposteVetrina,
      visVetrina: { location: visVetrina.location, haShelfId: 'shelfId' in visVetrina },
      cronologia,
      spostato: { location: spostato.location, haShelfId: 'shelfId' in spostato },
      altriSenzaScaffale,
      invariante: await invariante(h),
    };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok'] });

  // 4. Eliminazioni rifiutate: posizione con scaffali (senza prodotti), categoria usata da uno scaffale (senza
  //    prodotti), scaffale con un prodotto, scaffale con un prodotto nel cestino; uno vuoto si elimina
  await run('s1-eliminazioni', async (h) => {
    await prepara(h, {
      shelves: [...SHELVES, { id: '1732300000000-dep1', name: 'D1', locationId: 'deposito', libraryId: 'borse' }],
      products: {
        'VIS-0098': { shelfId: ID.A1 },
        'AST-0033': { location: 'magazzino', shelfId: ID.P1, deletedAt: '2026-11-22T09:00:00.000Z' },
      },
      extra: () => {
        const locs = [
          { id: 'magazzino', label: 'Magazzino', color: '#3B82F6' }, { id: 'vetrina', label: 'Vetrina', color: '#D4AF37' },
          { id: 'stand_a', label: 'Stand A', color: '#10B981' }, { id: 'stand_b', label: 'Stand B', color: '#10B981' },
          { id: 'stand_c', label: 'Stand C', color: '#10B981' }, { id: 'sartoria', label: 'Sartoria', color: '#8B5CF6' },
          { id: 'deposito', label: 'Deposito', color: '#6B7280' },
        ];
        localStorage.setItem('furinventory_locations:local', JSON.stringify(locs));
        const lk = 'inventory:v1:local:libraries';
        const libs = JSON.parse(localStorage.getItem(lk));
        libs.push({ id: 'borse', name: 'Borse', icon: 'shopping-bag', createdAt: '2026-11-22T20:00:00.000Z' });
        localStorage.setItem(lk, JSON.stringify(libs));
      },
    });
    const prima = await snapshot(h);
    // posizione Deposito: nessun prodotto, uno scaffale
    await h.go('settings/locations');
    await h.page.locator('[tabindex="0"]').filter({ hasText: 'DepositoID:' }).first().locator('[tabindex="0"]').last().click();
    await h.page.waitForTimeout(600);
    // categoria Borse: nessun prodotto, uno scaffale
    await h.go('settings/folders');
    await h.page.locator('[aria-label="Elimina Borse"]').click(); await h.page.waitForTimeout(600);
    // scaffali: A1 con VIS-0098, P1 con AST-0033 nel cestino, V1 vuoto
    await h.go('settings/shelves');
    const righe = { a1: await h.has('Generico · 1 prodotto', true), p1: await h.has('Pellicce · 1 prodotto', true) };
    await label(h, 'Elimina scaffale A1').click(); await h.page.waitForTimeout(600);
    await label(h, 'Elimina scaffale P1').click(); await h.page.waitForTimeout(600);
    const intermedio = await snapshot(h);
    await label(h, 'Elimina scaffale V1').click(); await h.page.waitForTimeout(800);
    const dopo = await snapshot(h);
    const restano = JSON.parse(dopo[S]).map((s) => s.name);
    return {
      righe,
      chiaviCambiatePrimaDiV1: changedKeys(prima, intermedio),
      chiaviCambiateDopoV1: changedKeys(intermedio, dopo),
      posizioneDeposito: JSON.parse(dopo[LOC]).some((l) => l.id === 'deposito'),
      categoriaBorse: JSON.parse(dopo[L]).some((l) => l.id === 'borse'),
      restano,
    };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok'] });

  // 5. Scanner: codice e id di uno scaffale aprono la sua scheda con i pezzi unici che ci stanno; codice ignoto
  await run('s1-scanner', async (h) => {
    await prepara(h, { products: { 'VIS-0098': { shelfId: ID.P1 }, 'PUZ-0012': { location: 'magazzino', shelfId: ID.P1, deletedAt: '2026-11-22T09:00:00.000Z' } } });
    await h.go('scanner');
    const lettore = await scan(h, 'SCAF-MAG-P1', { wait: 1500 });
    const perCodice = {
      url: h.page.url().replace(/^https?:\/\/[^/]+/, ''), titolo: await h.has('SCAFFALE', true), nome: await h.has('P1', true),
      dove: await h.has('Magazzino · Pellicce', true), elenco: await h.has('Prodotti sullo scaffale (1)', true), vis: await h.has('VIS-0098', true),
      cestino: await h.has('PUZ-0012', true),
    };
    await h.click('VIS-0098');
    const apreScheda = await h.has('Scaffale P1', true);
    await h.go('scanner');
    await scan(h, ID['Vetrina alta'], { wait: 1500 });
    const perId = { titolo: await h.has('SCAFFALE', true), nome: await h.has('Vetrina alta', true), vuoto: await h.has('Nessun prodotto su questo scaffale.', true) };
    await h.go('scanner');
    await scan(h, 'SCAF-NON-ESISTE', { wait: 1200 });
    return { lettore, perCodice, apreScheda, perId };
  }, { dialogs: ['ok'] });

  // 6. Articoli a quantità: Aggiungi con quantità senza selettore; il primo movimento toglie lo scaffale; Conta,
  //    Spostamento rapido, Audit e Azione rapida con gli scaffali presenti: nessuna chiave di stock è uno scaffale
  await run('s1-quantita', async (h) => {
    await prepara(h, {
      products: {
        'VIS-0098': { unit: 'pz', stock: { magazzino: 5 } },
        'LIN-0021': { shelfId: ID['Vetrina alta'], location: 'vetrina' },
        'PUZ-0012': { location: 'magazzino', shelfId: ID.A1 },
      },
    });
    // Modifica di un articolo a quantità (VIS-0098, in Magazzino che ha scaffali): posizione in sola lettura, nessun selettore
    await openEdit(h, 'VIS-0098');
    const modificaAQuantita = { solaLettura: await h.has('Posizione e giacenza', true), etichetta: await h.has('Scaffale (facoltativo)', true), pillole: await pillole(h) };
    // Aggiungi: con la posizione Magazzino il selettore c'è; scritta una quantità sparisce
    await h.go('add');
    await h.click('Visone');
    await h.click('Magazzino');
    const conPosizione = await pillole(h);
    await label(h, 'Scaffale A1').click();
    await field(h, 'Quantità').fill('4');
    const conQuantita = await pillole(h);
    await h.click('M');
    await h.page.getByPlaceholder('Auto: LOG-2026-001').fill('S1-QTA-1');
    await h.click("Aggiungi all'Inventario");
    const qta = of(await h.products(), 'S1-QTA-1');
    // Movimenta su un pezzo unico sul suo scaffale (PUZ-0012 su A1): carico 2 → articolo a quantità senza scaffale
    await h.go('');
    await h.click('PUZ-0012'); await h.page.waitForTimeout(800);
    await label(h, 'Movimenta').click(); await h.page.waitForTimeout(500);
    const movimentaPillole = await pillole(h);
    await label(h, 'Tipo Carico').click();
    await h.page.locator('input[placeholder^="es. 2,5"]').locator('visible=true').first().fill('2');
    await label(h, 'Registra movimento').click(); await h.page.waitForTimeout(800);
    const puz = of(await h.products(), 'PUZ-0012');
    // Conta in Magazzino: VIS-0098 5 → 3
    await h.go('automations/count');
    await label(h, 'Conta Magazzino').click(); await h.page.waitForTimeout(500);
    await label(h, 'Contata VIS-0098').fill('3');
    await label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(500);
    await label(h, 'Registra rettifiche').click(); await h.page.waitForTimeout(600);
    // Spostamento rapido: S1-QTA-1 in Stand C
    await h.go('automations/batch-move');
    await h.click('Stand C');
    await h.click('Scansiona Prodotto');
    await scan(h, 'S1-QTA-1');
    // Codice di uno scaffale letto come destinazione: da COD (AU-V14) vale la sua posizione (Magazzino, con la conferma
    // «Cambio Destinazione»), lo scaffale non entra nei dati; l'invariante sotto lo controlla
    await scan(h, 'SCAF-MAG-A1', { wait: 1200 });
    // Azione rapida su LIN-0021 (pezzo unico su «Vetrina alta»): Carico 3 dalla finestra Movimenta
    await h.go('scanner');
    await h.click('Inserisci Manualmente');
    await h.page.getByPlaceholder('Es: SKU-001, 1234567890123').fill('LIN-0021');
    await h.click('Cerca');
    await label(h, 'Carico').click(); await h.page.waitForTimeout(500);
    await h.page.locator('input[placeholder^="es. 2,5"]').locator('visible=true').first().fill('3');
    await label(h, 'Registra movimento').click(); await h.page.waitForTimeout(800);
    // Audit di Stand C: VIS-0098 (in Magazzino) letto come intruso e spostato qui
    await h.go('automations/audit');
    await h.click('Stand C');
    const list = await h.page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; }).filter((r) => r.w > 0));
    const fab = list.sort((a, b) => b.y - a.y)[0];
    await h.page.mouse.click(fab.x, fab.y); await h.page.waitForTimeout(700);
    await scan(h, 'VIS-0098', { wait: 1500 });
    const finale = await h.products(1500);
    const pick = (sku) => { const p = of(finale, sku); return { location: p.location, stock: p.stock ?? null, haShelfId: 'shelfId' in p }; };
    return {
      modificaAQuantita, conPosizione, conQuantita,
      qta: qta && { stock: qta.stock, haShelfId: 'shelfId' in qta },
      movimentaPillole,
      puz: { stock: puz.stock, haShelfId: 'shelfId' in puz },
      dopo: { 'S1-QTA-1': pick('S1-QTA-1'), 'VIS-0098': pick('VIS-0098'), 'LIN-0021': pick('LIN-0021'), 'PUZ-0012': pick('PUZ-0012') },
      invariante: await invariante(h),
    };
  }, { dialogs: Array(20).fill('2') }); // «2» = Sposta qui nella domanda dell'Audit; le altre finestre si accettano

  // 7. CSV: export con «Scaffale» in fondo, reimport (lo scaffale torna), import per nome dentro la posizione,
  //    righe con la giacenza su uno scaffale saltate, i tre file di C1 come prima
  await run('s1-csv', async (h) => {
    await prepara(h, { products: { 'VIS-0098': { shelfId: ID.P1 }, 'VIS-0142': { shelfId: ID['Vetrina alta'] }, 'LIN-0021': { shelfId: ID.A1 } } });
    await h.tab('Impostazioni');
    const righe = await scarica(h, 'Esporta Inventario');
    const header = righe[0];
    const col = header.indexOf('Scaffale');
    const export_ = righe.slice(1).map((r) => `${r[0]}|${r[2]}|${r[col]}`);
    const rt = [header, ...righe.slice(1).map((r) => r.map((v, i) => (i === 0 ? `RT-${v}` : v)))];
    await drop(h, toCsv(rt), 'reimport.csv');
    let dopo = await h.products();
    // Atteso dopo il giro: lo scaffale che torna (LIN-0021 ha uno shelfId di un'altra posizione: si perde)
    const valido = (p) => { const s = SHELVES.find((x) => x.id === p.shelfId); return s && s.locationId === p.location && !p.stock ? s.id : undefined; };
    const giro = ['VIS-0098', 'VIS-0142', 'LIN-0021', 'AST-0033'].map((sku) => {
      const o = of(dopo, sku); const n = of(dopo, `RT-${sku}`);
      return `${sku}:${n ? (n.shelfId === valido(o) ? `uguale(${n.shelfId ? SHELVES.find((x) => x.id === n.shelfId).name : '-'})` : n.shelfId ?? '-') : 'assente'}`;
    });
    await drop(h, [
      'SKU,Tipo di pelle,Posizione,Giacenza,Scaffale',
      'S1-CSV-1,visone,magazzino,,a1',
      'S1-CSV-2,visone,vetrina,,A1',
      'S1-CSV-3,visone,magazzino,magazzino:2,P1',
      `S1-CSV-BAD-1,visone,magazzino,magazzino:1; ${ID.A1}:2,`,
      'S1-CSV-BAD-2,visone,magazzino,SCAF-MAG-P1:3,',
      `S1-CSV-BAD-3,visone,${ID.V1},,`,
    ].join('\r\n'), 'scaffali.csv');
    for (const f of ['pre-m01.csv', 'm01.csv', 'c1.csv']) await drop(h, fs.readFileSync(path.join(__dirname, 'c1-csv', f), 'utf8'), f);
    dopo = await h.products();
    const importati = dopo.filter((p) => /^S1-CSV|^C1-/.test(p.sku)).map((p) => `${p.sku}|${p.location}|${p.shelfId ? SHELVES.find((s) => s.id === p.shelfId)?.name : '-'}|${p.stock ? JSON.stringify(p.stock) : '-'}`).sort();
    return { colonne: header.length, ultima: header[header.length - 1], prima: header.slice(15, 19), export: export_, giro, importati, invariante: await invariante(h) };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'] });
})();
