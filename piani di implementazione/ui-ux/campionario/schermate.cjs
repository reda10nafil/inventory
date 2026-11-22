// Schermate del campionario a 375 px (ticket 03) - solo per sviluppo, NON fa parte dell'app.
// Uso: node schermate.cjs <percorso di playwright> [stile] [cartella]   (app web e serve-seed.mjs su 8765 accesi)
//   stile: attuale | babilonia | ishtar | ardesia | minimal (scritto in AsyncStorage prima di caricare; vuoto = predefinito)
//   cartella: dove salvare (predefinito ../schermate-attuali); APP=http://localhost:8082 per un'altra porta
//   EXTRA=1 aggiunge le schermate raggiungibili da indirizzo (posizioni, cartelle, GS1, hardware, cestino, condivisione, automazioni, azione rapida, aspetto)
//   SOLO=inventario,venduto,10-  limita ai passi indicati (nomi: inventario scheda modifica aggiungi cronologia automazioni
//   impostazioni campi layout venduto; per le schermate in più il nome del file); FONT=<famiglia> controlla il carattere
const { chromium } = require(process.argv[2] || 'playwright');
const path = require('path');

const STILE = process.argv[3] || '';
const DIR = path.resolve(process.argv[4] || path.join(__dirname, '..', 'schermate-attuali'));
const APP = process.env.APP || 'http://localhost:8081';
const W = 375, H = 812;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  // errori della pagina e della console (richiesti verdi per chiudere un lavoro); una riga per messaggio diverso
  const visti = new Set();
  const errore = (testo) => { const k = testo.slice(0, 160); if (!visti.has(k)) { visti.add(k); log('CONSOLE', k); } };
  page.on('pageerror', (e) => errore(`pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errore(m.text()); });

  const extra = () => page.evaluate(() => {
    let m = 0;
    document.querySelectorAll('div').forEach((d) => {
      const s = getComputedStyle(d);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && d.offsetParent !== null && d.scrollHeight > d.clientHeight)
        m = Math.max(m, d.scrollHeight - d.clientHeight);
    });
    return m;
  });
  // FONT=Inter (o Outfit, Urbanist, Manrope): dopo ogni schermata controlla che ogni testo usi un file di quella
  // famiglia con peso normale (un file per peso: un peso diverso da 400 sarebbe un finto grassetto del browser).
  const fontAudit = async (name) => {
    if (!process.env.FONT) return;
    const bad = await page.evaluate((fam) => {
      const out = {};
      document.querySelectorAll('body *').forEach((el) => {
        if (el.offsetParent === null) return;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!own) return;
        const s = getComputedStyle(el);
        const f = s.fontFamily.replace(/"/g, '');
        if (/material|monospace|ionicons|fontawesome|feather/i.test(f)) return;
        if (f.startsWith(fam + '_') && s.fontWeight === '400') return;
        const k = `${f.split(',')[0]} ${s.fontWeight}`;
        if (!out[k]) out[k] = el.textContent.trim().slice(0, 30);
      });
      return out;
    }, process.env.FONT);
    const keys = Object.keys(bad);
    log(keys.length ? 'CARATTERE' : 'carattere ok', name, keys.map((k) => `${k} «${bad[k]}»`).join(' | '));
  };
  const shot = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: path.join(DIR, name) }); log('ok', name); await fontAudit(name); };
  const tall = async (name) => {
    let h = await extra();
    if (h > 0) { await page.setViewportSize({ width: W, height: H + h }); await page.waitForTimeout(900); const h2 = await extra(); if (h2 > 0) { h += h2; await page.setViewportSize({ width: W, height: H + h }); await page.waitForTimeout(700); } }
    await page.screenshot({ path: path.join(DIR, name) });
    await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(500);
    log('ok', name, 'altezza', H + h);
  };
  const vis = (text, exact = true) => page.getByText(text, { exact }).locator('visible=true').first();
  const home = async () => { await page.goto(APP); await vis('VIS-0142').waitFor(); await page.waitForTimeout(800); };
  const tab = async (name) => { await vis(name).click(); await page.waitForTimeout(1500); };
  // SOLO=inventario,scheda,10-  fa solo i passi il cui nome (o file, per le schermate in più) comincia così
  const SOLO = (process.env.SOLO || '').split(',').filter(Boolean);
  const step = async (label, fn) => {
    if (SOLO.length && !SOLO.some((s) => label.startsWith(s))) return;
    try { await fn(); } catch (e) { log('ERRORE', label, e.message.split('\n')[0]); }
  };

  await page.goto(APP);
  await page.waitForTimeout(4000);
  const seeded = await page.evaluate(async (stile) => {
    if (stile) localStorage.setItem('@syncro/stile', stile);
    const org = 'local';
    if (JSON.parse(localStorage.getItem(`inventory:v1:${org}:products`) || '[]').length) return 'già presente';
    const seed = await (await fetch('http://localhost:8765/seed.json')).json();
    for (const [key, value] of Object.entries(seed)) {
      localStorage.setItem(key.includes('{org}') ? key.replace('{org}', org) : `${key}:${org}`, JSON.stringify(value));
    }
    localStorage.setItem(`inventory:v1:${org}:alerts`, '[]');
    localStorage.setItem(`inventory:v1:${org}:deleted_product_ids`, '[]');
    return 'caricato';
  }, STILE);
  log('campionario', seeded, STILE ? `stile ${STILE}` : 'stile predefinito');

  await step('inventario', async () => { await home(); await shot('01-inventario.png'); await tall('01b-inventario-intero.png'); });
  await step('scheda', async () => { await home(); await vis('VIS-0142').click(); await page.getByText(/campi strutturati/i).locator('visible=true').first().waitFor(); await shot('02-scheda.png'); await tall('02b-scheda-intera.png'); });
  await step('modifica', async () => { await vis('Modifica').click(); await page.waitForTimeout(1500); await shot('05-modifica.png'); await tall('05b-modifica-intera.png'); });
  await step('aggiungi', async () => { await home(); await tab('Aggiungi'); await shot('03-aggiungi.png'); await tall('03b-aggiungi-intera.png'); });
  await step('cronologia', async () => { await home(); await tab('Cronologia'); await shot('04-cronologia.png'); });
  await step('automazioni', async () => { await home(); await tab('Automazioni'); await shot('09-automazioni.png'); await tall('09b-automazioni-intera.png'); });
  await step('impostazioni', async () => { await home(); await tab('Impostazioni'); await shot('06-impostazioni.png'); await tall('06b-impostazioni-intera.png'); });
  await step('campi', async () => { await home(); await tab('Impostazioni'); await vis('Campi Personalizzati').click(); await page.waitForTimeout(1500); await shot('07-campi.png'); await tall('07b-campi-intera.png'); });
  await step('layout', async () => { await home(); await tab('Impostazioni'); await vis('Configura Layout Aggiungi').click(); await page.waitForTimeout(1500); await shot('08-layout-builder.png'); await tall('08b-layout-builder-intera.png'); });
  await step('venduto', async () => { await home(); await vis('VOL-0087').click(); await page.waitForTimeout(1500); await shot('02c-scheda-venduto.png'); });

  if (process.env.EXTRA) {
    const extra = [
      ['10-posizioni.png', 'settings/locations'], ['11-cartelle.png', 'settings/folders'], ['12-gs1.png', 'settings/gs1-config'],
      ['13-hardware.png', 'settings/hardware'], ['14-cestino.png', 'settings/trash'], ['15-condivisione.png', 'settings/share'],
      ['16-audit.png', 'automations/audit'], ['17-spostamento.png', 'automations/batch-move'], ['18-vendita.png', 'automations/scan-sell'],
      ['19-tag-rapidi.png', 'automations/quick-tag'], ['20-azione-rapida.png', 'scanner-action'], ['21-non-trovato.png', 'pagina-che-non-esiste'],
      ['22-aspetto.png', 'settings/appearance'],
    ];
    for (const [name, route] of extra) {
      await step(name, async () => { await page.goto(`${APP}/${route}`); await page.waitForTimeout(2500); await shot(name); });
    }
  }

  await browser.close();
  log('fine');
})().catch((e) => { console.error(e); process.exit(1); });
