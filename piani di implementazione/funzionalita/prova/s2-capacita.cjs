// S2 (ticket 14 e 15, corsia B): misure e limiti degli scaffali, controllo del singolo prodotto, riempimento a colori,
// «quanti ne entrano», Altezza del prodotto. Ogni scenario legge lo stato salvato.
// - ripiano A1 50×50×30 cm, 10 kg, 20 pezzi creato dal modulo; modificato (peso 12,5); un numero sbagliato rifiutato;
// - barra appendiabiti da 15 grucce con altezza libera 150 cm; per la barra lunghezza e profondità non ci sono;
// - riempimento a 0, 50, 80 e 100%: verde, verde, blu, rosso («Pieno»), con il colore del ruolo del tema;
// - un prodotto 60×40×20 «non entra» su A1 vuoto; uno 40×30×20 «circa 3»; uno scaffale senza limiti «nessun limite»;
// - gli scaffali di prima (senza misure) si leggono e si risalvano uguali; aprire le schermate non riscrive nulla;
// - Altezza del prodotto in Aggiungi, Scheda, Modifica (con l'evento), CSV; layout salvato non riscritto;
// - Scheda: «Spazio sullo scaffale» col riempimento e «ne entrano ancora N come questo».
// Uso: node s2-capacita.cjs [nome-scenario]   (senza argomento li esegue tutti)
const fs = require('fs');
const { scenario } = require('./lib.cjs');
const { press } = require('./a1-util.cjs');

const P = 'inventory:v1:local:products';
const T = 'inventory:v1:local:timeline';
const S = 'furinventory_shelves:local';
const LAYOUT = 'furinventory_layout_config:local';
const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);

// A1 come lo scrive l'app dopo S2; A2 senza limiti (come gli scaffali di S1a e S1b)
const A1 = { id: '1732300000000-cap1', name: 'A1', locationId: 'magazzino', length: 50, depth: 50, height: 30, maxWeight: 10, maxPieces: 20 };
const A2 = { id: '1732300000000-gen2', name: 'A2', locationId: 'magazzino' };
const KA1 = `magazzino/${A1.id}`;

/** Stato salvato: scaffali, misure dei prodotti ({ SKU: {...} }) e articoli a quantità ({ SKU: stock }), poi ricarica. */
async function prepara(h, { shelves = [A1, A2], misure = {}, giacenze = {} } = {}) {
  await h.page.evaluate(([pk, tk, sk, shelves, misure, giacenze]) => {
    if (shelves) localStorage.setItem(sk, JSON.stringify(shelves)); else localStorage.removeItem(sk);
    const list = JSON.parse(localStorage.getItem(pk));
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    // null = campo tolto (i prodotti del campionario hanno tutti lunghezza, larghezza e peso)
    for (const [sku, m] of Object.entries(misure)) {
      const p = list.find((x) => x.sku === sku);
      for (const [k, v] of Object.entries(m)) { if (v === null) delete p[k]; else p[k] = v; }
    }
    for (const [sku, stock] of Object.entries(giacenze)) {
      const p = list.find((x) => x.sku === sku);
      Object.assign(p, { stock, unit: 'pz', location: 'magazzino' });
      delete p.shelfId;
      let after = 0;
      for (const [place, qty] of Object.entries(stock)) {
        if (qty <= 0) continue;
        tl.unshift({ id: `s2-${sku}-${place}`, productId: p.id, type: 'stock', timestamp: '2026-11-24T08:00:00.000Z', details: { movement: 'carico', qty, to: place, reason: 'iniziale', before: after, after: after + qty } });
        after += qty;
      }
    }
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  }, [P, T, S, shelves, misure, giacenze]);
  await h.go('');
}

const field = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
const label = field;
const hasLabel = async (h, name) => (await h.page.getByLabel(name, { exact: true }).locator('visible=true').count()) > 0;
/** Righe di uno scaffale nell'elenco (testo, riga per riga). */
const riga = (h, name) => label(h, `Modifica scaffale ${name}`).evaluate((e) => e.innerText.split('\n').map((s) => s.trim()).filter(Boolean));
/** Barre del riempimento a video: etichetta, fascia e colore della barra. */
const barre = (h) => h.page.evaluate(() => [...document.querySelectorAll('[data-testid^="riempimento-"]')]
  .filter((e) => e.getClientRects().length > 0)
  .map((e) => ({
    etichetta: e.getAttribute('aria-label'),
    fascia: e.getAttribute('data-testid').replace('riempimento-', ''),
    colore: getComputedStyle(e.firstElementChild.firstElementChild).backgroundColor,
    testo: getComputedStyle(e.lastElementChild).color,
    larghezza: e.firstElementChild.firstElementChild.style.width,
  })));
// Come in s1-scaffali: gli avvisi si rigenerano all'avvio, LokiJS ed Expo hanno chiavi loro
const snapshot = (h) => h.page.evaluate(() => Object.fromEntries(Object.keys(localStorage)
  .filter((k) => k !== 'inventory:v1:local:alerts' && !k.startsWith('loki') && !k.startsWith('expo'))
  .sort().map((k) => [k, localStorage.getItem(k)])));
const changedKeys = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
const senzaId = (s) => s && { ...s, id: /^\d{13}-[a-z0-9]+$/.test(s.id) ? 'opaco' : s.id, createdAt: !!s.createdAt };
async function openEdit(h, sku) {
  await h.go('');
  await h.click(sku); await h.page.waitForTimeout(800);
  await press(h.page, /^.?\s*Modifica$/); await h.page.waitForTimeout(800);
}
/** Testo del riquadro «Spazio sullo scaffale» della Scheda. */
const spazio = (h) => h.page.evaluate(() => {
  const title = [...document.querySelectorAll('div')].find((e) => e.textContent.trim() === 'Spazio sullo scaffale' && e.offsetParent);
  return title ? title.parentElement.innerText.split('\n').map((s) => s.trim()).filter(Boolean) : null;
});
// Copia in JS di utils/csv.ts (solo per leggere il file scaricato), come in s1-scaffali
function parseCsv(input) {
  const rows = []; let row = []; let f = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) { if (c === '"' && input[i + 1] === '"') { f += '"'; i++; } else if (c === '"') quoted = false; else f += c; }
    else if (c === '"' && f.length === 0) quoted = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && input[i + 1] === '\n') i++; row.push(f); if (row.some(Boolean)) rows.push(row); row = []; f = ''; }
    else f += c;
  }
  row.push(f); if (row.some(Boolean)) rows.push(row);
  return rows;
}
async function scarica(h, voce) {
  const dl = h.page.waitForEvent('download', { timeout: 8000 });
  await h.click(voce);
  const d = await dl;
  return parseCsv(fs.readFileSync(await d.path(), 'utf8').replace(/^﻿/, ''));
}

(async () => {
  // 1. Ripiano A1 dal modulo: 50×50×30 cm, 10 kg, 20 pezzi, in Magazzino, categoria Pellicce; poi peso 12,5; poi un
  //    peso sbagliato (rifiutato, niente salvato); poi solo il nome (le misure restano). UX0: misure in una riga
  //    (Lunghezza, Altezza, Profondità), peso e pezzi affiancati, categoria a tendina con «Generico» per primo e la
  //    spiegazione solo per «Generico», «Codice» che si crea da solo se resta vuoto
  await run('s2-ripiano', async (h) => {
    await prepara(h, { shelves: null });
    await h.go('settings/shelves');
    const modulo = await h.page.evaluate(() => {
      const box = (name) => { const e = document.querySelector(`input[aria-label="${name}"]`); const r = e && e.getBoundingClientRect(); return r ? Math.round(r.top) : null; };
      const codice = document.querySelector('input[aria-label="Codice dello scaffale"]');
      return { righe: ['Lunghezza', 'Altezza', 'Profondità', 'Peso massimo', 'Pezzi massimi'].map((n) => `${n}@${box(n)}`), segnaposto: codice && codice.placeholder };
    });
    const genericoPrima = await h.has('Generico: per prodotti di ogni categoria.', true);
    await field(h, 'Nome').fill('A1');
    await label(h, 'Posizione Magazzino').click();
    await label(h, 'Categoria dello scaffale').click(); // tendina (UX0)
    const voci = await h.page.evaluate(() => [...document.querySelectorAll('[aria-label^="Categoria "]')].filter((e) => e.getClientRects().length > 0 && e.getAttribute('aria-label') !== 'Categoria dello scaffale').map((e) => e.getAttribute('aria-label')));
    await label(h, 'Categoria Pellicce').click();
    const tendina = { voci, valore: await label(h, 'Categoria dello scaffale').innerText(), genericoPrima, genericoDopo: await h.has('Generico: per prodotti di ogni categoria.', true) };
    const campiRipiano = { lunghezza: await hasLabel(h, 'Lunghezza'), profondita: await hasLabel(h, 'Profondità'), altezza: await hasLabel(h, 'Altezza'), peso: await hasLabel(h, 'Peso massimo'), pezzi: await hasLabel(h, 'Pezzi massimi') };
    await field(h, 'Lunghezza').fill('50');
    await field(h, 'Profondità').fill('50');
    await field(h, 'Altezza').fill('30');
    await field(h, 'Peso massimo').fill('10');
    await field(h, 'Pezzi massimi').fill('20');
    await label(h, 'Crea scaffale').click(); await h.page.waitForTimeout(700);
    const creato = senzaId(((await h.store(S)) || [])[0]);
    const elenco = await riga(h, 'A1');
    const barra = await barre(h);
    // Modifica: peso con la virgola
    await label(h, 'Modifica scaffale A1').click(); await h.page.waitForTimeout(400);
    const nelModulo = { lunghezza: await field(h, 'Lunghezza').inputValue(), peso: await field(h, 'Peso massimo').inputValue() };
    await field(h, 'Peso massimo').fill('12,5');
    await label(h, 'Salva scaffale').click(); await h.page.waitForTimeout(700);
    const dopoPeso = senzaId(((await h.store(S)) || [])[0]);
    // Un numero sbagliato: si dice, non si salva nulla
    await label(h, 'Modifica scaffale A1').click(); await h.page.waitForTimeout(400);
    await field(h, 'Peso massimo').fill('-1');
    await label(h, 'Salva scaffale').click(); await h.page.waitForTimeout(700);
    const dopoSbagliato = JSON.stringify(senzaId(((await h.store(S)) || [])[0])) === JSON.stringify(dopoPeso);
    // Solo il nome: le misure restano
    await field(h, 'Peso massimo').fill('12,5');
    await field(h, 'Nome').fill('A1 alto');
    await label(h, 'Salva scaffale').click(); await h.page.waitForTimeout(700);
    const dopoNome = senzaId(((await h.store(S)) || [])[0]);
    return { modulo, tendina, campiRipiano, creato, elenco, barra, nelModulo, dopoPeso, dopoSbagliato, dopoNome };
  }, { dialogs: Array(6).fill('ok') });

  // 2. Barra appendiabiti da 15 grucce, altezza libera 150 cm: lunghezza e profondità spariscono; salvata con kind
  await run('s2-barra', async (h) => {
    await prepara(h, { shelves: null });
    await h.go('settings/shelves');
    await field(h, 'Nome').fill('Barra giacche');
    await label(h, 'Posizione Magazzino').click();
    await label(h, 'Tipo Barra appendiabiti').click(); await h.page.waitForTimeout(300);
    const campiBarra = { lunghezza: await hasLabel(h, 'Lunghezza'), profondita: await hasLabel(h, 'Profondità'), grucce: await hasLabel(h, 'Grucce massime'), altezzaLibera: await hasLabel(h, 'Altezza libera'), peso: await hasLabel(h, 'Peso massimo') };
    await field(h, 'Grucce massime').fill('15');
    await field(h, 'Altezza libera').fill('150');
    await label(h, 'Crea scaffale').click(); await h.page.waitForTimeout(700);
    const salvata = senzaId(((await h.store(S)) || [])[0]);
    const elenco = await riga(h, 'Barra giacche');
    // Grucce non intere: rifiutate
    await label(h, 'Modifica scaffale Barra giacche').click(); await h.page.waitForTimeout(400);
    const tipoNelModulo = await field(h, 'Grucce massime').inputValue();
    await field(h, 'Grucce massime').fill('15,5');
    await label(h, 'Salva scaffale').click(); await h.page.waitForTimeout(600);
    const dopoSbagliato = JSON.stringify(senzaId(((await h.store(S)) || [])[0])) === JSON.stringify(salvata);
    return { campiBarra, salvata, elenco, tipoNelModulo, dopoSbagliato };
  }, { dialogs: Array(4).fill('ok') });

  // 3. Riempimento a 0, 50, 80, 100% (VIS-0098 a quantità su A1 da 20 pezzi): verde, verde, blu, rosso e «Pieno»;
  //    la Scheda dice quanti ne entrano ancora
  await run('s2-riempimento', async (h) => {
    const passi = {};
    for (const qty of [0, 10, 16, 20]) {
      // Senza peso né misure VIS-0098 conta solo per i pezzi (20 al massimo)
      await prepara(h, { misure: { 'VIS-0098': { weight: null, length: null, width: null } }, giacenze: { 'VIS-0098': qty ? { magazzino: 1, [KA1]: qty } : { magazzino: 1 } } });
      await h.go('settings/shelves');
      const [b] = (await barre(h)).filter((x) => x.etichetta.startsWith('Riempimento A1:'));
      passi[`${qty * 5}%`] = { ...b, liberi: (await riga(h, 'A1')).find((s) => s.startsWith('Liberi')) };
      if (qty === 10) {
        await h.go('');
        await h.click('VIS-0098'); await h.page.waitForTimeout(800);
        passi.scheda = await spazio(h);
      }
    }
    const colori = new Set(Object.values(passi).filter((p) => p.colore).map((p) => p.colore)).size;
    return { ...passi, coloriDiversi: colori, testoComeBarra: Object.values(passi).filter((p) => p.colore).every((p) => p.colore === p.testo) };
  });

  // 4. Quanti ne entrano: prodotto di prova 60×40×20 «non entra» su A1 vuoto; 40×30×20 da 1,6 kg «circa 3» (volume);
  //    A2 senza limiti «nessun limite»; un prodotto senza misure conta i pezzi
  await run('s2-quanti', async (h) => {
    await prepara(h, { misure: { 'VIS-0142': { length: 60, width: 40, height: 20 }, 'VOL-0087': { length: 40, width: 30, height: 20, weight: 1.6 }, 'AST-0033': { length: null, width: null, weight: null } } });
    await h.go('settings/shelves');
    const prova = async (sku) => {
      await field(h, 'Prodotto da provare').fill(sku.slice(0, 5)); await h.page.waitForTimeout(300);
      await label(h, `Prova con ${sku}`).click(); await h.page.waitForTimeout(300);
      const out = await h.page.evaluate(() => [...document.querySelectorAll('[aria-label^="Quanti ne entrano: "]')]
        .filter((e) => e.getClientRects().length > 0).map((e) => e.textContent.trim()));
      await label(h, 'Togli il prodotto di prova').click(); await h.page.waitForTimeout(300);
      return out;
    };
    return { grande: await prova('VIS-0142'), scatola: await prova('VOL-0087'), senzaMisure: await prova('AST-0033') };
  });

  // 5. Dati di prima: scaffali senza misure letti e risalvati uguali; aprire Scaffali, Aggiungi e Scheda non scrive nulla
  await run('s2-dati', async (h) => {
    const vecchi = [
      { id: '1732300000000-gen1', name: 'A1', locationId: 'magazzino', barcode: 'SCAF-MAG-A1', createdAt: '2026-11-23T10:00:00.000Z' },
      { id: '1732300000000-pel1', name: 'P1', locationId: 'magazzino', libraryId: 'pellicce', nfcTag: '04:AA:BB:CC' },
    ];
    await prepara(h, { shelves: vecchi });
    const prima = await snapshot(h);
    await h.go('settings/shelves');
    const righe = { a1: await riga(h, 'A1'), p1: await riga(h, 'P1'), barre: (await barre(h)).length };
    await h.go('add'); await h.page.waitForTimeout(500);
    await h.go(''); await h.click('VIS-0142'); await h.page.waitForTimeout(800);
    const nessunaChiaveCambiata = changedKeys(prima, await snapshot(h));
    // Risalvare A1 senza toccare nulla: identico
    await h.go('settings/shelves');
    await label(h, 'Modifica scaffale A1').click(); await h.page.waitForTimeout(400);
    await label(h, 'Salva scaffale').click(); await h.page.waitForTimeout(700);
    const dopo = await h.store(S);
    return { righe, nessunaChiaveCambiata, risalvatiUguali: JSON.stringify(dopo) === JSON.stringify(vecchi) };
  }, { dialogs: ['ok'] });

  // 6. Altezza del prodotto: Aggiungi (layout salvato del campionario, senza Altezza: compare lo stesso), Scheda, Modifica
  //    con l'evento, CSV in fondo; il layout salvato non si riscrive
  await run('s2-altezza', async (h) => {
    const layoutPrima = await h.store(LAYOUT, 0);
    await h.go('add');
    const etichetta = await h.has('Altezza', true);
    await h.click('Visone');
    await h.click('Vetrina');
    await h.click('M');
    await h.page.getByPlaceholder('85').fill('90');
    await h.page.getByPlaceholder('40').fill('42,5');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1500);
    const nuovo = (await h.products())[0];
    await h.go(`product/${nuovo.id}`);
    const scheda = await h.page.evaluate(() => {
      const title = [...document.querySelectorAll('div')].find((e) => e.textContent.trim() === 'Misure' && e.offsetParent);
      return title ? title.parentElement.innerText.split('\n').map((s) => s.trim()).filter(Boolean) : null;
    });
    await press(h.page, /^.?\s*Modifica$/); await h.page.waitForTimeout(800);
    const inModifica = await h.page.getByPlaceholder('40').inputValue();
    await h.page.getByPlaceholder('40').fill('45');
    await press(h.page, /Salva Modifiche$/);
    const dopo = (await h.products()).find((p) => p.id === nuovo.id);
    const evento = (await h.timeline(0)).filter((e) => e.productId === nuovo.id && e.type === 'modified').map((e) => (e.details.changes || []).join(' | '));
    await h.go('settings');
    const righe = await scarica(h, 'Esporta Inventario');
    const header = righe[0];
    const col = header.indexOf('Altezza');
    const layoutDopo = await h.store(LAYOUT, 0);
    return {
      etichetta, salvata: { length: nuovo.length, height: nuovo.height }, scheda, inModifica, dopo: dopo.height, evento,
      csv: { colonne: header.length, ultima: header[header.length - 1], altezza: righe.find((r) => r[0] === nuovo.sku)?.[col], vuotaPerGliAltri: righe.filter((r) => r[0] !== nuovo.sku && r !== header).every((r) => !r[col]) },
      layoutUguale: JSON.stringify(layoutPrima) === JSON.stringify(layoutDopo),
      layoutSenzaAltezza: !(layoutDopo.fields || []).some((f) => f.id === 'height'),
    };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 7. Scheda di un pezzo unico su A1 (40×30×20, 2 kg) con 4 pezzi di VIS-0098 (senza peso) su A1: 5 pezzi su 20, 2 kg
  //    su 10, 24.000 cm³ su 75.000 → 32% verde; ne entrano ancora circa 2 (volume). VOL-0087, su nessuno scaffale, non
  //    ha il riquadro
  await run('s2-scheda', async (h) => {
    await prepara(h, {
      misure: { 'VIS-0142': { location: 'magazzino', shelfId: A1.id, length: 40, width: 30, height: 20, weight: 2 }, 'VIS-0098': { weight: null } },
      giacenze: { 'VIS-0098': { [KA1]: 4 } },
    });
    await h.go('');
    await h.click('VIS-0142'); await h.page.waitForTimeout(800);
    const suA1 = await spazio(h);
    const barra = (await barre(h)).map((b) => `${b.etichetta} (${b.fascia})`);
    await h.go(''); await h.click('VOL-0087'); await h.page.waitForTimeout(800);
    const senzaScaffale = await spazio(h);
    return { suA1, barra, senzaScaffale };
  });
})();
