// Verifica galleria (23 novembre): Scheda (scorrere, selezionare, visore), Modifica (miniature, elimina), Aggiungi (più foto, P20).
// VIS-0142 del campionario ha 3 foto data: di lunghezza diversa (82087, 88759, 113215): la lunghezza dice quale si vede.
const http = require('http');
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');
const { dump, press, textOf, clickAt } = require(__dirname + '/../../../../prova/a1-util.cjs');

const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);

// Foto in primo piano in un punto: lunghezza della data-URI, o l'indirizzo se non è data:
const topImg = (page, x, y) => page.evaluate(([x, y]) => {
  for (const e of document.elementsFromPoint(x, y)) {
    const bg = getComputedStyle(e).backgroundImage;
    if (bg && bg.includes('data:')) return bg.length - 7;
    if (e.tagName === 'IMG') return e.src.startsWith('data:') ? e.src.length : e.src.slice(0, 40);
  }
  return null;
}, [x, y]);
// Scorrevoli orizzontali visibili (galleria, miniature): misure e posizione
const scrollers = (page) => page.evaluate(() => [...document.querySelectorAll('div')]
  .filter((d) => d.scrollWidth > d.clientWidth + 10 && ['auto', 'scroll'].includes(getComputedStyle(d).overflowX))
  .map((d, i) => { const r = d.getBoundingClientRect(); return { i, top: Math.round(r.top), h: Math.round(r.height), cw: d.clientWidth, sw: d.scrollWidth, left: Math.round(d.scrollLeft), snap: getComputedStyle(d).scrollSnapType }; })
  .filter((s) => s.h > 0));
const setScroll = (page, i, x) => page.evaluate(([i, x]) => {
  const d = [...document.querySelectorAll('div')].filter((d) => d.scrollWidth > d.clientWidth + 10 && ['auto', 'scroll'].includes(getComputedStyle(d).overflowX))[i];
  d.scrollLeft = x;
}, [i, x]);
const pageScrollTop = (page) => page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 10 && ['auto', 'scroll'].includes(getComputedStyle(d).overflowY)).map((d) => d.scrollTop)));
const resetVertical = (page) => page.evaluate(() => [...document.querySelectorAll('div')].forEach((d) => { if (d.scrollTop) d.scrollTop = 0; }));

function fetchSeed() {
  return new Promise((resolve, reject) => http.get('http://localhost:8765/seed.json', (res) => {
    let s = ''; res.setEncoding('utf8'); res.on('data', (d) => { s += d; }); res.on('end', () => resolve(JSON.parse(s)));
  }).on('error', reject));
}

(async () => {
  const seed = await fetchSeed();
  const seedImgs = seed['inventory:v1:{org}:products'].find((p) => p.sku === 'VIS-0142').images;
  const lens = seedImgs.map((x) => x.length);
  const n = (v) => (typeof v === 'number' ? `foto ${lens.indexOf(v) + 1}` : String(v));

  // 1. Scheda: la galleria in alto si scorre con rotella, rotella orizzontale, trascinamento, dito, puntini, tastiera?
  await run('gal-scheda', async (h) => {
    const { page } = h;
    await page.getByText('VIS-0142', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    const out = { inizio: { scorrevoli: await scrollers(page), contatore: await textOf(page, /^\d\/3$/), foto: n(await topImg(page, 188, 160)) } };
    const hero = 0;
    const stato = async () => ({ left: (await scrollers(page))[hero]?.left, contatore: await textOf(page, /^\d\/3$/), foto: n(await topImg(page, 188, 160)), visoreAperto: !!(await textOf(page, /^\d \/ 3$/)) });
    // a) rotella verticale (mouse normale)
    await page.mouse.move(188, 160); await page.mouse.wheel(0, 300); await page.waitForTimeout(800);
    out.rotellaVerticale = { ...(await stato()), paginaScesaDi: await pageScrollTop(page) };
    await resetVertical(page); await setScroll(page, hero, 0); await page.waitForTimeout(500);
    // b) rotella orizzontale (touchpad o Maiusc+rotella)
    await page.mouse.move(188, 160); await page.mouse.wheel(375, 0); await page.waitForTimeout(900);
    out.rotellaOrizzontale = await stato();
    await setScroll(page, hero, 0); await page.waitForTimeout(500);
    // c) trascinamento col mouse
    await page.mouse.move(320, 160); await page.mouse.down();
    for (let x = 300; x >= 40; x -= 20) await page.mouse.move(x, 160);
    await page.mouse.up(); await page.waitForTimeout(900);
    out.trascinamentoMouse = await stato();
    if (out.trascinamentoMouse.visoreAperto) { const close = (await dump(page)).filter((b) => b.y < 120).pop(); await clickAt(page, close.x, close.y, 900); }
    await setScroll(page, hero, 0); await page.waitForTimeout(500);
    // d) dito (gesto di scorrimento sintetico del browser)
    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send('Input.synthesizeScrollGesture', { x: 300, y: 160, xDistance: -300, yDistance: 0, gestureSourceType: 'touch', speed: 1200 });
      await page.waitForTimeout(1200);
      out.dito = await stato();
    } catch (e) { out.dito = 'non concludente: ' + e.message.slice(0, 80); }
    await setScroll(page, hero, 0); await page.waitForTimeout(500);
    // e) puntini e pulsanti sopra la galleria
    out.pulsantiSopraGalleria = (await dump(page)).filter((b) => b.y < 320).map((b) => `${b.x},${b.y} ${b.w}x${b.h} «${b.text}»`);
    const dots = await page.evaluate(() => [...document.querySelectorAll('div')].map((d) => { const r = d.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((r) => r.w >= 4 && r.w <= 30 && r.h >= 4 && r.h <= 12 && r.y > 200 && r.y < 330));
    out.puntini = dots.length;
    if (dots.length >= 2) { await clickAt(page, dots[dots.length - 1].x, dots[dots.length - 1].y, 900); out.toccoUltimoPuntino = await stato(); if (out.toccoUltimoPuntino.visoreAperto) { const close = (await dump(page)).filter((b) => b.y < 120).pop(); await clickAt(page, close.x, close.y, 900); } }
    await setScroll(page, hero, 0); await page.waitForTimeout(500);
    // f) tastiera (freccia destra dopo un clic fuori dalla foto)
    await clickAt(page, 188, 420, 500);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800);
    out.frecciaDestra = await stato();
    await h.shot('galleria');
    return out;
  });

  // 2. Visore a tutto schermo: parte dalla foto giusta? si scorre? frecce, zoom?
  await run('gal-visore', async (h) => {
    const { page } = h;
    await page.getByText('VIS-0142', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    const out = {};
    const v = async () => ({ contatore: await textOf(page, /^\d \/ 3$/), foto: n(await topImg(page, 188, 400)) });
    await setScroll(page, 0, 2 * 375); await page.waitForTimeout(900);
    out.schedaPrima = { contatore: await textOf(page, /^\d\/3$/), foto: n(await topImg(page, 188, 160)) };
    await clickAt(page, 188, 160, 1500);
    out.apertoDaFoto3 = await v();
    out.pulsantiVisore = (await dump(page)).map((b) => `${b.x},${b.y} ${b.w}x${b.h} «${b.text}»`);
    await page.mouse.move(188, 400); await page.mouse.wheel(0, 300); await page.waitForTimeout(900);
    out.rotellaVerticale = await v();
    await page.mouse.wheel(-375, 0); await page.waitForTimeout(900);
    out.rotellaOrizzontaleIndietro = await v();
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(800);
    out.frecciaSinistra = await v();
    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send('Input.synthesizeScrollGesture', { x: 100, y: 400, xDistance: 300, yDistance: 0, gestureSourceType: 'touch', speed: 1200 });
      await page.waitForTimeout(1200);
      out.ditoVersoSinistra = await v();
    } catch (e) { out.ditoVersoSinistra = 'non concludente: ' + e.message.slice(0, 80); }
    const misura = () => page.evaluate(() => { const e = document.elementsFromPoint(188, 400).find((x) => x.tagName === 'IMG' || getComputedStyle(x).backgroundImage.includes('data:')); if (!e) return null; const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)} ${getComputedStyle(e).transform}`; });
    out.primaDoppioClic = await misura();
    await page.mouse.dblclick(188, 400); await page.waitForTimeout(800);
    out.dopoDoppioClic = await misura();
    await h.shot('visore');
    return out;
  });

  // 3. Modifica: tocco sulla miniatura 3, poi «elimina» sulla foto grande: quale foto si cancella?
  await run('gal-modifica', async (h) => {
    const { page } = h;
    await page.getByText('VIS-0142', { exact: true }).first().click();
    await page.waitForTimeout(1200);
    await press(page, /^.?\s*Modifica$/); await page.waitForTimeout(1500);
    const sc = await scrollers(page);
    const out = { scorrevoli: sc };
    const main = sc.find((s) => s.sw >= 3 * s.cw - 5);
    const mainIdx = main ? main.i : 0;
    const mainBox = main || { top: 100, h: 300 };
    const cy = mainBox.top + Math.round(mainBox.h / 2);
    const stato = async () => ({ contatore: await textOf(page, /^\d \/ \d$/), etichetta: await textOf(page, /^\d+\/10$/), left: (await scrollers(page)).find((s) => s.i === mainIdx)?.left, fotoGrande: n(await topImg(page, 188, cy)) });
    out.inizio = await stato();
    // miniature: pulsanti quadrati sotto la foto grande, senza testo
    const thumbs = (await dump(page)).filter((b) => !b.text && b.y > mainBox.top + mainBox.h && b.y < mainBox.top + mainBox.h + 150 && Math.abs(b.w - b.h) < 8 && b.w > 40);
    out.miniature = thumbs.map((b) => `${b.x},${b.y} ${b.w}x${b.h}`);
    if (thumbs[2]) { await clickAt(page, thumbs[2].x, thumbs[2].y, 900); out.dopoToccoMiniatura3 = await stato(); }
    await h.shot('dopo-miniatura-3');
    // pulsante elimina sulla foto grande visibile (in alto a destra dentro la foto)
    const del = (await dump(page)).filter((b) => b.y > mainBox.top && b.y < mainBox.top + 80 && b.x > 250 && b.x < 375 && b.w < 60);
    out.pulsantiElimina = del.map((b) => `${b.x},${b.y} ${b.w}x${b.h}`);
    if (del[0]) { await clickAt(page, del[0].x, del[0].y, 900); out.dopoElimina = await stato(); }
    out.controlliOrdine = { principale: await h.has('rincipale'), copertina: await h.has('opertina'), sposta: await h.has('Sposta') };
    await press(page, /Salva Modifiche/); await page.waitForTimeout(1500);
    const p = (await h.products()).find((x) => x.sku === 'VIS-0142');
    out.salvate = p.images.map((u) => n(u.length));
    return out;
  }, { dialogs: ['ok', 'ok'] });

  // 4. Aggiungi: 3 foto dalla «Galleria Foto» (scelta file del browser), miniatura 3, salvataggio, ricarica (P20)
  await run('gal-aggiungi', async (h) => {
    const { page } = h;
    await h.go('add');
    const chooser = page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
    await h.click('Importa');
    const fc = await chooser;
    if (!fc) return { filechooser: false };
    const files = seedImgs.map((u, i) => ({ name: `foto${i + 1}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(u.split(',')[1], 'base64') }));
    await fc.setFiles(fc.isMultiple() ? files : files[0]);
    await page.waitForTimeout(1500);
    const out = { multiple: fc.isMultiple(), etichetta: await textOf(page, /^Foto prodotto/), scorrevoli: await scrollers(page) };
    const sc = out.scorrevoli;
    const main = sc.find((s) => s.sw >= 2 * s.cw - 5);
    if (main) {
      const thumbs = (await dump(page)).filter((b) => !b.text && b.y > main.top + main.h && b.y < main.top + main.h + 150 && Math.abs(b.w - b.h) < 8 && b.w > 40);
      out.miniature = thumbs.length;
      if (thumbs[2]) { await clickAt(page, thumbs[2].x, thumbs[2].y, 900); out.dopoToccoMiniatura3 = { left: (await scrollers(page)).find((s) => s.i === main.i)?.left }; }
    }
    // modulo minimo come a2-aggiungi (tipo, posizione, taglia obbligatoria)
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    await page.waitForTimeout(1500);
    const p = (await h.products())[0];
    out.salvato = { sku: p.sku, immagini: (p.images || []).map((u) => u.slice(0, 30)) };
    await h.go('');
    out.dopoRicarica = await page.evaluate(async (uris) => Promise.all(uris.map(async (u) => { try { const r = await fetch(u); return r.ok; } catch (e) { return 'errore: ' + e.message.slice(0, 40); } })), p.images || []);
    return out;
  }, { dialogs: ['1', 'ok', 'ok'] });
})();
