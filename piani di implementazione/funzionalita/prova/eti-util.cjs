// Aiuti della fetta ETI (ticket 22: finestra «Codice ed etichetta», etichette locali) per `eti-etichette.cjs`, le prove
// che creano posizioni, categorie e scaffali e `collaudo.cjs`. Solo per le prove.
// - `chiudiCodice`: chiude la finestra del codice se è aperta (dopo «Crea …» si apre da sola al «OK»).
// - `apri`: tocca un elemento per la sua etichetta (`aria-label`) esatta, il primo a video.
// - `cambiaCodice`: «Avanzate» › «Cambia codice» › codice › «Salva codice».
// - `guardaStampe`: conta le finestre nuove (la stampa sul web), le richieste fuori da localhost e le `print` di ogni
//   pagina (finta, per non aprire la finestra del sistema), dal contesto: la finestra nuova non passa da `page`.
// - `qrSchermo`, `qrHtml`, `qrAtteso`: la matrice del QR a video (letta dall'SVG), quella dell'etichetta (dal percorso
//   SVG dell'HTML) e quella della libreria `qrcode` per un testo, per dire che portano lo stesso codice.
const path = require('path');
const QRCode = require(path.join(__dirname, '..', '..', '..', 'node_modules', 'qrcode'));

const CHIUDI = 'Chiudi Codice ed etichetta';
const vis = (h, label) => h.page.getByLabel(label, { exact: true }).locator('visible=true');

async function chiudiCodice(h) {
  const x = vis(h, CHIUDI);
  if (await x.count()) { await x.last().click(); await h.page.waitForTimeout(400); return true; }
  return false;
}

async function apri(h, label, wait = 700) {
  await vis(h, label).first().click();
  await h.page.waitForTimeout(wait);
}

const aperta = async (h) => (await vis(h, CHIUDI).count()) > 0;

async function cambiaCodice(h, code) {
  if (!(await vis(h, 'Nuovo codice').count())) await apri(h, 'Avanzate', 400);
  await vis(h, 'Nuovo codice').last().fill(code);
  await apri(h, 'Salva codice', 700);
}

/** Da chiamare appena aperto lo scenario: guarda finestre, richieste e stampe di tutto il contesto. */
async function guardaStampe(h) {
  const ctx = h.page.context();
  const stato = { finestre: [], esterne: [] };
  ctx.on('page', (p) => stato.finestre.push(p));
  ctx.on('request', (r) => { if (!/^(http:\/\/localhost|data:|blob:|about:)/.test(r.url())) stato.esterne.push(r.url().slice(0, 80)); });
  await ctx.addInitScript(() => { window.__prints = 0; window.print = () => { window.__prints += 1; }; });
  await h.page.evaluate(() => { window.__prints = 0; window.print = () => { window.__prints += 1; }; });
  return stato;
}

/** Ultima finestra di stampa aperta: HTML, titolo e quante volte è stata stampata. */
async function ultimaStampa(stato) {
  const pop = stato.finestre[stato.finestre.length - 1];
  if (!pop) return null;
  await pop.waitForLoadState().catch(() => {});
  return { html: await pop.content(), titolo: await pop.title(), stampe: await pop.evaluate(() => window.__prints).catch(() => null) };
}

/** Matrice del QR di un testo secondo `qrcode` (livello M, come a video e nell'etichetta), in righe di 0 e 1. */
function qrAtteso(text) {
  const { size, data } = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (__, c) => (data[r * size + c] ? 1 : 0)).join(''));
}

/** Matrice del primo QR di un HTML d'etichetta (percorso «M x y h n v1 h-n z», margine di 4 moduli). */
function qrHtml(html) {
  const view = html.match(/<svg class="qr-svg" viewBox="0 0 (\d+) \d+"/);
  const d = html.match(/<svg class="qr-svg"[^>]*>.*?<path fill="#000" d="([^"]*)"/)?.[1];
  if (!view || d == null) return null;
  const n = Number(view[1]) - 8;
  const rows = Array.from({ length: n }, () => Array(n).fill('0'));
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(m[3]); i += 1) rows[Number(m[2]) - 4][Number(m[1]) - 4 + i] = '1';
  }
  return rows.map((r) => r.join(''));
}

/** Matrice del QR a video nella finestra (react-native-qrcode-svg: righe disegnate col tratto), `n` moduli per lato. */
async function qrSchermo(h, n) {
  return h.page.evaluate((n) => {
    const box = [...document.querySelectorAll('[data-testid="codice-qr"]')].filter((e) => e.offsetParent).pop();
    const svg = box && box.querySelector('svg');
    const paths = svg ? [...svg.querySelectorAll('path')] : [];
    if (!paths.length) return null;
    const size = svg.viewBox?.baseVal?.width || svg.getBoundingClientRect().width;
    const cell = size / n;
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (__, c) => {
      const p = new DOMPoint((c + 0.5) * cell, (r + 0.5) * cell);
      return paths.some((el) => el.isPointInStroke(p) || el.isPointInFill(p)) ? '1' : '0';
    }).join(''));
  }, n);
}

module.exports = { CHIUDI, chiudiCodice, apri, aperta, cambiaCodice, guardaStampe, ultimaStampa, qrAtteso, qrHtml, qrSchermo };
