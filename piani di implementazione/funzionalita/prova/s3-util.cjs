// Aiuti della fetta S3 (ticket 15, corsia B) per `s3-avvisi.cjs` e `collaudo.cjs`. Solo per le prove.
// - `prepara`: scaffali (A1 e B2 di Borse, G1 e R2 generici in Magazzino; due barre in Sartoria), posizioni (anche con
//   `capacity`), categoria Borse, l'automazione «Scansiona Posizione → Scansiona Prodotto → Sposta nella posizione
//   letta», campi dei prodotti e articoli a quantità coi carichi «iniziale», prima di aprire l'app;
// - `avviso`, `usa`, `blocco`, `proposta`, `annulla`, `etichette`: l'avviso in linea, la finestra del blocco e
//   l'etichetta «oltre il limite»;
// - `stato`: dove sta un prodotto (scaffale per nome), la giacenza leggibile e «giacenza salvata = eventi rigiocati»;
// - `movimenta`, `leggiQui`, `apri`: Movimenta della Scheda, un codice nel lettore (riaperto se serve), la Scheda.
const { leggi, ultima } = require('./cod-util.cjs');

const P = 'inventory:v1:local:products';
const T = 'inventory:v1:local:timeline';
const S = 'furinventory_shelves:local';
const LOC = 'furinventory_locations:local';
const LK = 'inventory:v1:local:libraries';
const AK = '@furinventory_custom_automations:local';

// Scaffali come li scrive l'app dopo S2 (id opachi)
const A1 = { id: '1732400000000-a1', name: 'A1', locationId: 'magazzino', libraryId: 'borse', barcode: 'SCAF-MAG-A1', length: 50, depth: 50, height: 30, maxWeight: 10, maxPieces: 20 };
const B2 = { id: '1732400000000-b2', name: 'B2', locationId: 'magazzino', libraryId: 'borse', barcode: 'SCAF-MAG-B2', length: 100, depth: 100, height: 100, maxWeight: 50, maxPieces: 20 };
const G1 = { id: '1732400000000-g1', name: 'G1', locationId: 'magazzino', barcode: 'SCAF-MAG-G1', maxPieces: 10 };
const R2 = { id: '1732400000000-r2', name: 'R2', locationId: 'magazzino', barcode: 'SCAF-MAG-R2', maxPieces: 2 };
const BARRA = { id: '1732400000000-ba', name: 'Barra giacche', locationId: 'sartoria', kind: 'barra', maxPieces: 15, height: 150 };
const BARRA2 = { id: '1732400000000-bb', name: 'Barra cappotti', locationId: 'sartoria', kind: 'barra', maxPieces: 15, height: 150 };
const SHELVES = [A1, B2, G1, R2, BARRA, BARRA2];
const NOME = Object.fromEntries(SHELVES.map((s) => [s.id, s.name]));
const k = (shelf) => `${shelf.locationId}/${shelf.id}`;
const LOCATIONS = [
  { id: 'magazzino', label: 'Magazzino', color: '#3B82F6' },
  { id: 'vetrina', label: 'Vetrina', color: '#D4AF37' },
  { id: 'stand_a', label: 'Stand A', color: '#10B981' },
  { id: 'stand_b', label: 'Stand B', color: '#10B981' },
  { id: 'stand_c', label: 'Stand C', color: '#10B981' },
  { id: 'sartoria', label: 'Sartoria', color: '#8B5CF6' },
];
/** Le posizioni con la capienza di Vetrina. */
const conVetrina = (capacity) => LOCATIONS.map((l) => (l.id === 'vetrina' ? { ...l, capacity } : l));
const st = (id, type, config = {}, label = type) => ({ id, order: 0, type, config, label });
const AUTO = {
  id: 'auto_scaf', name: 'auto_scaf', icon: 'flash-on', color: '#3B82F6', description: '', qrValue: 'AUTO:auto_scaf', createdAt: '2026-11-22T00:00:00Z', usageCount: 0,
  steps: [st('s1', 'scan_location', {}, 'Scansiona Posizione'), st('s2', 'scan_product', {}, 'Scansiona Prodotto'),
    st('s3', 'move_to', { useLastScannedLocation: true }, 'Sposta nella Posizione Scansionata')],
};
// Senza misure né peso: i prodotti del campionario hanno lunghezza 98-120 cm e il peso, che qui non servono
const SENZA = { length: null, width: null, weight: null, height: null };

/**
 * Stato salvato e ricarica. `campi`: { SKU: campi } (`null` toglie un campo); `giacenze`: { SKU: stock }. `daCapo`:
 * prima rimette il campionario (per ripartire pulito più volte nello stesso scenario, come in CF-D4).
 */
async function prepara(h, { locations = LOCATIONS, shelves = SHELVES, campi = {}, giacenze = {}, daCapo = false } = {}) {
  if (daCapo) {
    await h.page.evaluate(async () => {
      const seed = await (await fetch('http://localhost:8765/seed.json')).json();
      for (const [key, value] of Object.entries(seed)) {
        localStorage.setItem(key.includes('{org}') ? key.replace('{org}', 'local') : `${key}:local`, JSON.stringify(value));
      }
      localStorage.setItem('inventory:v1:local:alerts', '[]');
      localStorage.setItem('inventory:v1:local:deleted_product_ids', '[]');
    });
  }
  await h.page.evaluate(([keys, shelves, locations, auto, campi, giacenze]) => {
    localStorage.setItem(keys.S, JSON.stringify(shelves));
    localStorage.setItem(keys.LOC, JSON.stringify(locations));
    localStorage.setItem(keys.AK, JSON.stringify([auto]));
    const libs = JSON.parse(localStorage.getItem(keys.LK));
    if (!libs.some((l) => l.id === 'borse')) libs.push({ id: 'borse', name: 'Borse', icon: 'shopping-bag', createdAt: '2026-11-24T08:00:00.000Z' });
    localStorage.setItem(keys.LK, JSON.stringify(libs));
    const list = JSON.parse(localStorage.getItem(keys.P));
    const tl = JSON.parse(localStorage.getItem(keys.T) || '[]');
    for (const [sku, c] of Object.entries(campi)) {
      const p = list.find((x) => x.sku === sku);
      for (const [key, v] of Object.entries(c)) { if (v === null) delete p[key]; else p[key] = v; }
    }
    for (const [sku, stock] of Object.entries(giacenze)) {
      const p = list.find((x) => x.sku === sku);
      Object.assign(p, { stock, unit: p.unit || 'pz', location: Object.keys(stock)[0].split('/')[0], status: 'available' });
      delete p.shelfId;
      let after = 0;
      for (const [place, qty] of Object.entries(stock)) {
        if (qty <= 0) continue;
        tl.unshift({ id: `s3-${sku}-${place}`, productId: p.id, type: 'stock', timestamp: '2026-11-24T08:00:00.000Z', details: { movement: 'carico', qty, to: place, reason: 'iniziale', before: after, after: after + qty } });
        after += qty;
      }
    }
    localStorage.setItem(keys.P, JSON.stringify(list));
    localStorage.setItem(keys.T, JSON.stringify(tl));
  }, [{ S, LOC, AK, LK, P, T }, shelves, locations, AUTO, campi, giacenze]);
  await h.go('');
  await h.page.getByText('VIS-0142', { exact: true }).first().waitFor();
}

function replay(events) {
  const m = {};
  for (const e of events) {
    if (e.type !== 'stock' || typeof e.details.qty !== 'number') continue;
    const q = Math.round(e.details.qty * 1000);
    if (e.details.from) m[e.details.from] = (m[e.details.from] || 0) - q;
    if (e.details.to) m[e.details.to] = (m[e.details.to] || 0) + q;
  }
  return Object.fromEntries(Object.entries(m).filter(([, v]) => v !== 0).map(([key, v]) => [key, v / 1000]));
}
const positive = (stock) => Object.fromEntries(Object.entries(stock || {}).filter(([, q]) => q > 0));
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
const leggibile = (stock) => stock && Object.fromEntries(Object.entries(stock).map(([key, q]) => {
  const at = key.lastIndexOf('/');
  return [at > 0 ? `${key.slice(0, at)}/${NOME[key.slice(at + 1)] ?? '?'}` : key, q];
}));
/** Dove sta un prodotto (scaffale col nome), la giacenza leggibile e «giacenza salvata = eventi rigiocati». */
async function stato(h, sku, wait = 1200) {
  const list = await h.products(wait);
  const p = list.find((x) => x.sku === sku);
  if (!p) return null;
  const ev = (await h.timeline(0)).filter((e) => e.productId === p.id);
  return {
    location: p.location,
    ...(p.shelfId && { scaffale: NOME[p.shelfId] ?? '?' }),
    ...(p.stock && { stock: leggibile(p.stock), coincide: same(positive(p.stock), replay(ev)) }),
  };
}
const quantiEventi = async (h) => (await h.timeline(0)).length;
const label = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
/** Avviso in linea visibile (il testo, dall'etichetta accessibile «Avviso: …»), o null. */
const avviso = (h) => h.page.evaluate(() => {
  const el = [...document.querySelectorAll('[data-testid="avviso-carico"]')].find((e) => e.getClientRects().length > 0);
  return el ? (el.getAttribute('aria-label') || '').replace(/^Avviso: /, '') : null;
});
/** «Usa G1» accanto all'avviso, se c'è. */
const usa = (h) => h.page.evaluate(() => [...document.querySelectorAll('[data-testid="avviso-carico"] [aria-label^="Usa "]')]
  .filter((e) => e.getClientRects().length > 0).map((e) => e.getAttribute('aria-label'))[0] ?? null);
/** Finestra del blocco visibile: righe di testo (titolo, motivo, perché) e pulsante della proposta, o null. */
const blocco = (h) => h.page.evaluate(() => {
  const el = [...document.querySelectorAll('[data-testid="blocco-carico"]')].find((e) => e.getClientRects().length > 0);
  if (!el) return null;
  const primario = [...el.querySelectorAll('[aria-label^="Metti in "]')].map((e) => e.getAttribute('aria-label'))[0] ?? null;
  // senza i glifi delle icone (caratteri privati del carattere delle icone)
  const righe = el.innerText.split('\n').map((s) => s.replace(/[-]|[\uDB80-\uDBBF][\uDC00-\uDFFF]/g, '').trim())
    .filter((s) => s && s !== 'Annulla' && s !== primario);
  return { righe, primario };
});
const proposta = async (h) => { await h.page.locator('[data-testid="blocco-carico"] [aria-label^="Metti in "]').locator('visible=true').first().click(); await h.page.waitForTimeout(900); };
const annulla = async (h) => { await h.page.locator('[data-testid="blocco-carico"] [aria-label="Annulla"]').locator('visible=true').first().click(); await h.page.waitForTimeout(700); };
const etichette = (h) => h.page.evaluate(() => [...document.querySelectorAll('[data-testid="oltre-il-limite"]')]
  .filter((e) => e.getClientRects().length > 0).map((e) => `${e.innerText.trim()} | ${e.getAttribute('aria-label')}`));
const testo = (h) => h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
/** Messaggi delle finestre del browser (lib.cjs risponde). */
const finestre = (h) => { const list = []; h.page.on('dialog', (d) => list.push(d.message().replace(/\n+/g, ' | '))); return list; };

async function apri(h, sku) {
  await h.go('');
  await h.click(sku); await h.page.waitForTimeout(800);
}
/** Movimenta (dalla Scheda già aperta): tipo, pillole (etichette) e quantità; l'avviso letto prima di Registra. */
async function movimenta(h, { tipo = 'Carico', pillole = [], qty, apri: aprila = true }) {
  if (aprila) { await label(h, 'Movimenta').click(); await h.page.waitForTimeout(500); }
  await label(h, `Tipo ${tipo}`).click();
  for (const name of pillole) { await label(h, name).click(); await h.page.waitForTimeout(150); }
  await h.page.locator('input[placeholder^="es. 2,5"], input[placeholder^="Registrata"]').locator('visible=true').first().fill(qty);
  await h.page.waitForTimeout(400);
  const letto = await avviso(h);
  await label(h, 'Registra movimento').click();
  await h.page.waitForTimeout(800);
  return letto;
}
/** Un codice nel lettore: se il lettore è chiuso lo riapre col pulsante (`pulsante`). */
async function leggiQui(h, code, pulsante, wait = 1000) {
  const aperto = (await h.page.getByPlaceholder('Codice, SKU o link').locator('visible=true').count())
    || (await h.page.getByText('Scrivi il codice', { exact: true }).locator('visible=true').count());
  if (!aperto && pulsante) await ultima(h, pulsante);
  return leggi(h, code, { wait });
}

module.exports = {
  A1, B2, G1, R2, BARRA, BARRA2, SHELVES, LOCATIONS, SENZA, k, conVetrina,
  prepara, stato, quantiEventi, label, avviso, usa, blocco, proposta, annulla, etichette, testo, finestre, apri, movimenta, leggiQui,
};
