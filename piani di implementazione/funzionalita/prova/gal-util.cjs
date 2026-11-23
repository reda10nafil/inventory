// Aiuti delle prove GAL (ticket 27), usati da `gal-galleria.cjs` e dai passi CF-C1, CF-C3, CF-C4 di `collaudo.cjs`.
// La foto che si vede si riconosce dal suo indirizzo (data-URI o `blob:`), confrontato con l'elenco salvato.
const { press } = require('./a1-util.cjs');

const PK = 'inventory:v1:local:products';
// Percorsi cloud finti per VIS-0142 (cmp-1): con questi la Scheda chiede i link firmati a Supabase all'avvio
const PERCORSI = ['org/cmp-1/foto-1', 'org/cmp-1/foto-2', 'org/cmp-1/foto-3'];
const CON_PERCORSI = "list.find((p) => p.id === 'cmp-1').storageImagePaths = a;";

/** Indirizzo della foto in primo piano in un punto (sfondo o <img>). */
const fotoIn = (page, x, y) => page.evaluate(([x, y]) => {
  for (const e of document.elementsFromPoint(x, y)) {
    const m = (getComputedStyle(e).backgroundImage || '').match(/^url\("?([\s\S]*?)"?\)$/);
    if (m && m[1]) return m[1];
    if (e.tagName === 'IMG' && e.src) return e.src;
  }
  return null;
}, [x, y]);
/** «foto N» (posizione in `images`, da 1), «altra» o «nessuna». */
const quale = (src, images) => { const i = images.indexOf(src); return i >= 0 ? `foto ${i + 1}` : src ? 'altra' : 'nessuna'; };

/** Centro della galleria (testID «galleria-foto»; `ultima` = quella del visore, in fondo al documento). Senza testID
 *  (prima di GAL): il primo scorrevole visibile largo almeno due foto, o (188, 160). */
async function centro(page, ultima = false) {
  const l = page.locator('[data-testid="galleria-foto"]').locator('visible=true');
  if (await l.count()) {
    const b = await (ultima ? l.last() : l.first()).boundingBox();
    return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
  }
  const s = await page.evaluate(() => [...document.querySelectorAll('div')]
    .filter((d) => d.offsetParent !== null && d.scrollWidth >= 2 * d.clientWidth - 5 && ['auto', 'scroll'].includes(getComputedStyle(d).overflowX))
    .map((d) => { const r = d.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })[0]);
  return s || { x: 188, y: 160 };
}

/** Tocca il comando con quell'aria-label (visibile; `ultimo` per il visore) e dice se c'era. */
async function tocca(page, label, ultimo = false) {
  const l = page.locator(`[aria-label="${label}"]`).locator('visible=true');
  if (!(await l.count())) return false;
  await (ultimo ? l.last() : l.first()).click();
  await page.waitForTimeout(700);
  return true;
}
const conta = (page, label) => page.locator(`[aria-label="${label}"]`).locator('visible=true').count();

/** Blocca nel browser ogni richiesta a Supabase con una risposta finta (non esce nulla; nessuna immagine cambia).
 *  Restituisce il contatore delle richieste bloccate. */
async function bloccaSupabase(page) {
  const bloccate = { n: 0 };
  await page.route((u) => u.hostname.endsWith('.supabase.co'), (r) => { bloccate.n += 1; r.fulfill({ status: 200, contentType: 'text/plain', body: 'prova: nessuna rete' }); });
  return bloccate;
}

/** Cambia i prodotti salvati (`fn`: corpo di funzione con `list` e `a`) e riapre l'app. Con `cloud` blocca prima le
 *  richieste a Supabase (i percorsi cloud le fanno partire all'avvio). */
async function prepara(h, fn, arg, { cloud = false } = {}) {
  const bloccate = cloud ? await bloccaSupabase(h.page) : { n: 0 };
  await h.page.evaluate(([k, src, a]) => {
    const list = JSON.parse(localStorage.getItem(k));
    new Function('list', 'a', src)(list, a); // il corpo arriva come testo: page.evaluate non passa funzioni
    localStorage.setItem(k, JSON.stringify(list));
  }, [PK, fn, arg]);
  await h.go('');
  await h.page.getByText('VIS-0142', { exact: true }).first().waitFor();
  return bloccate;
}

/** Testo della sezione Prezzi della Scheda («Prezzi Acquisto 0 € Vendita 3.800 €»), fino alla sezione dopo. */
async function prezziScheda(page) {
  const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const i = t.indexOf('Prezzi');
  if (i < 0) return null;
  const fine = t.slice(i).search(/ (Misure|Note tecniche|Campi strutturati|Cronologia)/);
  return t.slice(i, fine > 0 ? i + fine : i + 40);
}

/** Modifica aperta dalla Scheda, come l'utente. */
async function openEdit(h, sku = 'VIS-0142') {
  await h.click(sku); await h.page.waitForTimeout(800);
  await press(h.page, /^.?\s*Modifica$/); await h.page.waitForTimeout(1200);
}

module.exports = { PK, PERCORSI, CON_PERCORSI, fotoIn, quale, centro, tocca, conta, bloccaSupabase, prepara, prezziScheda, openEdit };
