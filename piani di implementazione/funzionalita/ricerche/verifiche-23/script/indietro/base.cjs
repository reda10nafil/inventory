// Lanciatore per le prove Indietro/icone (copia ridotta di prova/lib.cjs): console e page.route attaccati PRIMA
// del primo goto, nessun filtro sui messaggi. Scrive solo in SHOTS (questa cartella).
const PW = process.env.PW || 'playwright' // come in prova/lib.cjs: passare PW;
const { chromium } = require(PW);
const path = require('path');
const fs = require('fs');
const APP = 'http://localhost:8082';
const SHOTS = process.env.SHOTS || __dirname;
const GM = require('path').join(__dirname, '../../../../../..') + '/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/';
const MI = JSON.parse(fs.readFileSync(GM + 'MaterialIcons.json', 'utf8'));
const MCI = JSON.parse(fs.readFileSync(GM + 'MaterialCommunityIcons.json', 'utf8'));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function open({ seed = true, before } = {}) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const consoleAll = [];
  const net = [];
  page.on('pageerror', (e) => consoleAll.push({ t: 'pageerror', m: e.message.slice(0, 200), url: page.url() }));
  page.on('console', (m) => consoleAll.push({ t: m.type(), m: m.text().slice(0, 200), url: page.url() }));
  page.on('dialog', async (d) => { consoleAll.push({ t: 'dialog', m: d.message().slice(0, 120), url: page.url() }); await d.accept(); });
  page.on('requestfinished', async (r) => { if (/\.(ttf|png)/.test(r.url())) { const res = await r.response(); net.push({ u: short(r.url()), s: res && res.status() }); } });
  page.on('requestfailed', (r) => { if (/\.(ttf|png)/.test(r.url())) net.push({ u: short(r.url()), s: 'FALLITA ' + (r.failure() || {}).errorText }); });
  if (before) await before(page, ctx);
  await page.goto(APP);
  await page.waitForTimeout(2500);
  if (seed) {
    await page.evaluate(async () => {
      const s = await (await fetch('http://localhost:8765/seed.json')).json();
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k.includes('{org}') ? k.replace('{org}', 'local') : `${k}:local`, JSON.stringify(v));
      localStorage.setItem('inventory:v1:local:alerts', '[]');
      localStorage.setItem('inventory:v1:local:deleted_product_ids', '[]');
    });
    await page.goto(APP);
    await page.getByText('VIS-0142', { exact: true }).first().waitFor();
    await page.waitForTimeout(800);
  }
  return { browser, ctx, page, consoleAll, net };
}

function short(u) {
  const m = decodeURIComponent(u).match(/([^/?=]+\.(ttf|png))/);
  return m ? m[1] : u.slice(0, 80);
}

// Freccia nativa (aria-label «Go back» o «…, back») e freccia/chiusura disegnate (glifo arrow-back o close).
async function arrows(page) {
  return page.evaluate(({ back, close }) => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.offsetParent !== null; };
    const nat = [...document.querySelectorAll('[aria-label]')]
      .filter((e) => /^(Go back|.*, back)$/.test(e.getAttribute('aria-label')) && vis(e))
      .map((e) => { const img = e.querySelector('img'); return { label: e.getAttribute('aria-label'), img: img ? img.naturalWidth : null, tag: e.tagName, href: e.getAttribute('href') }; });
    const glyph = (ch) => [...document.querySelectorAll('div,span')]
      .filter((e) => e.childElementCount === 0 && e.textContent === ch && vis(e) && /material/.test(getComputedStyle(e).fontFamily))
      .map((e) => { const r = e.getBoundingClientRect(); return { y: Math.round(r.y), x: Math.round(r.x) }; });
    const own = glyph(String.fromCodePoint(back));
    const x = glyph(String.fromCodePoint(close));
    const txt = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
    return { nat, own, close: x, notFound: /Page Not Found/.test(txt), testo: txt.slice(0, 70) };
  }, { back: MI['arrow-back'], close: MI['close'] });
}

// Clic sulla freccia trovata: nativa per prima, poi disegnata in alto (y < 140).
async function tapBack(page) {
  const a = await arrows(page);
  if (a.nat.length) { await page.locator('[aria-label="' + a.nat[0].label + '"]').locator('visible=true').first().click(); return 'nativa'; }
  const top = a.own.find((g) => g.y < 140) || a.close.find((g) => g.y < 140);
  if (top) { await page.mouse.click(top.x + 10, top.y + 10); return 'disegnata'; }
  return null;
}

// Icone visibili: glifi per famiglia, nomi ricavati dai codici, stato dei FontFace.
async function icons(page) {
  const r = await page.evaluate(() => {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && e.offsetParent !== null; };
    const out = [];
    for (const e of document.querySelectorAll('div,span')) {
      if (e.childElementCount) continue;
      const ff = getComputedStyle(e).fontFamily;
      if (!/material/.test(ff) || !vis(e)) continue;
      const cp = e.textContent.codePointAt(0);
      const b = e.getBoundingClientRect();
      out.push({ fam: /community/.test(ff) ? 'mci' : 'mi', cp, w: Math.round(b.width), y: Math.round(b.y) });
    }
    const faces = [...document.fonts].filter((f) => /material/.test(f.family)).map((f) => `${f.family}:${f.status}`);
    const check = { mi: document.fonts.check('24px "material"'), mci: document.fonts.check('24px "material-community"') };
    return { out, faces, check };
  });
  const rev = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
  const rMI = rev(MI), rMCI = rev(MCI);
  const names = r.out.map((g) => (g.fam === 'mci' ? rMCI[g.cp] : rMI[g.cp]) || `?${g.cp}`);
  return { n: r.out.length, fallback: names.filter((n) => n === 'label-outline').length, ignoti: names.filter((n) => n.startsWith('?')), faces: [...new Set(r.faces)], check: r.check, nomi: names };
}

const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name + '.png') }).catch(() => {});

module.exports = { open, arrows, tapBack, icons, shot, log, APP, SHOTS, MI, MCI };
