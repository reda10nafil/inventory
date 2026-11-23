// Aiuti della fetta COD (ticket 22, lettore unico dei codici) per `cod-lettore.cjs` e `collaudo.cjs`. Solo per le prove.
// - `leggi`: un codice in un lettore (`BarcodeScanner`) come lo darebbe l'utente: «Scrivi il codice» se c'è (COD),
//   altrimenti la lettura simulata della fotocamera (`scan` di a3-util, su HEAD prima di COD). Dice quale ha usato.
// - `aMano`: Scanner › Inserisci Manualmente › codice › Cerca (strada che c'era già).
// - `aperto`: che cosa ha aperto lo Scanner (Azione rapida di un prodotto, posizione, scaffale, categoria, esecuzione).
// - `prepara`: codici di posizioni, scaffale A1 (con tag NFC), categoria Pellicce e due automazioni, scritti come li
//   scrive l'app, prima di aprirla; `cestino` mette PUZ-0012 nel cestino.
const { scan } = require('./a3-util.cjs');

const PK = 'inventory:v1:local:products';
const LK = 'inventory:v1:local:libraries';
const LOC = 'furinventory_locations:local';
const SK = 'furinventory_shelves:local';
const AK = '@furinventory_custom_automations:local';
const GS1 = 'furinventory_gs1_config:local';
const SKUS = ['VIS-0142', 'VOL-0087', 'LIN-0021', 'AST-0033', 'VIS-0098', 'PUZ-0012', 'VIS-0143'];
const SEGNAPOSTO = 'Codice, SKU o link';
const PH_SCANNER = 'Es: SKU-001, 1234567890123';

const LOCATIONS = [
  { id: 'magazzino', label: 'Magazzino', color: '#3B82F6', barcode: 'LOC-MAGAZZINO' },
  { id: 'vetrina', label: 'Vetrina', color: '#D4AF37', barcode: 'LOC-VETRINA' },
  { id: 'stand_a', label: 'Stand A', color: '#10B981' },
  { id: 'stand_b', label: 'Stand B', color: '#10B981' },
  { id: 'stand_c', label: 'Stand C', color: '#10B981' },
  { id: 'sartoria', label: 'Sartoria', color: '#8B5CF6' },
];
const SHELVES = [{ id: '1732300000000-gen1', name: 'A1', locationId: 'magazzino', barcode: 'SCAF-MAG-A1', nfcTag: '04:A2:3B:1C' }];
const st = (id, type, config = {}, label = type) => ({ id, order: 0, type, config, label });
const auto = (id, steps) => ({ id, name: id, icon: 'flash-on', color: '#3B82F6', description: '', qrValue: `AUTO:${id}`, steps, createdAt: '2026-11-22T00:00:00Z', usageCount: 0 });
const AUTOMAZIONI = [
  auto('auto_tag', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'), st('s2', 'add_tag', { tag: 'Visto' }, 'Aggiungi Tag: Visto')]),
  auto('auto_scaf', [st('s1', 'scan_location', {}, 'Scansiona Posizione'), st('s2', 'scan_product', {}, 'Scansiona Prodotto'),
    st('s3', 'move_to', { useLastScannedLocation: true }, 'Sposta nella Posizione Scansionata')]),
];

/** Stato salvato prima di aprire l'app. `locations`/`libraries` sostituiscono o aggiungono; `products` = { SKU: campi }. */
async function prepara(h, { cestino = false, locations = LOCATIONS, libraries = [], products = {}, gs1, extra } = {}) {
  await h.page.evaluate(([keys, locations, shelves, autos, libraries, products, cestino, gs1]) => {
    localStorage.setItem(keys.LOC, JSON.stringify(locations));
    localStorage.setItem(keys.SK, JSON.stringify(shelves));
    localStorage.setItem(keys.AK, JSON.stringify(autos));
    const libs = JSON.parse(localStorage.getItem(keys.LK));
    libs.find((l) => l.id === 'pellicce').barcode = 'LIB-PELLICCE';
    for (const l of libraries) libs.push(l);
    localStorage.setItem(keys.LK, JSON.stringify(libs));
    const list = JSON.parse(localStorage.getItem(keys.PK));
    for (const [sku, change] of Object.entries(products)) Object.assign(list.find((x) => x.sku === sku), change);
    if (cestino) list.find((x) => x.sku === 'PUZ-0012').deletedAt = '2026-11-22T10:00:00.000Z';
    localStorage.setItem(keys.PK, JSON.stringify(list));
    if (gs1) localStorage.setItem(keys.GS1, JSON.stringify(gs1));
  }, [{ LOC, SK, AK, LK, PK, GS1 }, locations, SHELVES, AUTOMAZIONI, libraries, products, cestino, gs1 || null]);
  if (extra) await h.page.evaluate(extra);
  await h.go('');
  await h.page.getByText('VIS-0142', { exact: true }).first().waitFor();
}

/** Un codice nel lettore aperto: «Scrivi il codice» (COD) o, se non c'è, la lettura simulata. `invio`: Invio invece del pulsante. */
async function leggi(h, code, { wait = 900, invio = false } = {}) {
  const { page } = h;
  let input = page.getByPlaceholder(SEGNAPOSTO).locator('visible=true');
  if (!(await input.count())) {
    const apri = page.getByText('Scrivi il codice', { exact: true }).locator('visible=true');
    if (!(await apri.count())) return `simulata:${await scan(h, code, { wait })}`;
    await apri.first().click();
    await page.waitForTimeout(300);
    input = page.getByPlaceholder(SEGNAPOSTO).locator('visible=true');
  }
  await input.first().fill(code);
  if (invio) await input.first().press('Enter');
  else await page.getByText('Usa codice', { exact: true }).locator('visible=true').first().click();
  await page.waitForTimeout(wait);
  return 'a mano';
}

/** Scanner › Inserisci Manualmente › codice › Cerca. */
async function aMano(h, code) {
  await h.go('scanner');
  await h.click('Inserisci Manualmente');
  await h.page.getByPlaceholder(PH_SCANNER).fill(code);
  await h.click('Cerca');
  await h.page.waitForTimeout(600);
}

// Testo dopo l'intestazione visibile («POSIZIONE» → «Magazzino»)
async function dopo(h, titolo) {
  const t = h.page.getByText(titolo, { exact: true }).locator('visible=true');
  if (!(await t.count())) return null;
  return (await t.first().locator('xpath=following-sibling::*[1]').innerText().catch(() => '')).trim();
}

/** Che cosa si vede dopo una lettura dello Scanner. */
async function aperto(h) {
  if (await h.has('Azione rapida', true)) {
    for (const sku of SKUS) if ((await h.page.getByText(sku, { exact: true }).locator('visible=true').count()) > 0) return `prodotto ${sku}`;
    return 'prodotto ?';
  }
  for (const [titolo, nome] of [['POSIZIONE', 'posizione'], ['SCAFFALE', 'scaffale'], ['CATEGORIA', 'categoria']]) {
    const v = await dopo(h, titolo);
    if (v != null) return `${nome} ${v}`;
  }
  for (const a of AUTOMAZIONI) if (await h.has(a.name, true)) return `esecuzione ${a.name}`;
  return 'niente';
}

const prodotto = async (h, sku, wait = 0) => (await h.products(wait)).find((p) => p.sku === sku);
const eventi = async (h, id, type, wait = 0) => (await h.timeline(wait)).filter((e) => e.productId === id && (!type || e.type === type));
const ultima = async (h, text) => { await h.page.getByText(text, { exact: true }).locator('visible=true').last().click(); await h.page.waitForTimeout(700); };
const testo = (h) => h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

module.exports = { PK, LK, LOC, SK, AK, GS1, LOCATIONS, SHELVES, AUTOMAZIONI, SEGNAPOSTO, prepara, leggi, aMano, aperto, prodotto, eventi, ultima, testo };
