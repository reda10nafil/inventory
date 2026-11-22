// Aiuti in più per le prove A1 (solo sviluppo, non fanno parte dell'app). Non tocca lib.cjs, che è condiviso.

// Pulsanti visibili [tabindex=0] con centro, misure e testo
const dump = (page) => page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].map((e) => {
  const r = e.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height), text: (e.innerText || '').replace(/\s+/g, ' ').trim() };
}).filter(Boolean));

// Pulsante con testo (regex o stringa); `last` per le finestre modali, che stanno in fondo al documento
const btn = (page, re, last = false) => {
  const l = page.locator('[tabindex="0"]').filter({ hasText: re }).locator('visible=true');
  return last ? l.last() : l.first();
};
const press = async (page, re, last = false) => { await btn(page, re, last).click(); await page.waitForTimeout(700); };

// SKU delle card visibili nell'Inventario (in ordine)
const skus = (page) => page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')]
  .map((e) => (e.innerText || '').match(/\b[A-Z]{3}-\d{4}\b/))
  .filter(Boolean).map((m) => m[0])
  .filter((v, i, a) => a.indexOf(v) === i));

// Testo che corrisponde a una regex (primo visibile), o null
const textOf = async (page, re) => {
  const l = page.getByText(re).locator('visible=true');
  return (await l.count()) ? (await l.first().innerText()).trim() : null;
};

const clickAt = async (page, x, y, wait = 700) => { await page.mouse.click(x, y); await page.waitForTimeout(wait); };

// Prodotti in forma breve
const brief = (p) => p && ({ sku: p.sku, location: p.location, libraryId: p.libraryId, status: p.status, deletedAt: !!p.deletedAt, weight: p.weight, sellPrice: p.sellPrice });

module.exports = { dump, btn, press, skus, textOf, clickAt, brief };
