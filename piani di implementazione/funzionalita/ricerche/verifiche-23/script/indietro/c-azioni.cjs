// C. Dopo azioni che sostituiscono o rimettono una schermata: replace, navigate verso una schermata già nello stack,
// salvataggio con OK, Conta con il tasto Indietro del browser (analogo web del tasto di sistema).
const { open, arrows, tapBack, shot, log, APP, MI } = require('./base.cjs');
const { scan } = require(__dirname + '/../../../../prova/a3-util.cjs');
(async () => {
  const { browser, page, consoleAll } = await open();
  const h = { page };
  const vis = (t, exact = true) => page.getByText(t, { exact }).locator('visible=true').first();
  const click = async (t, exact = true) => { await vis(t, exact).click(); await page.waitForTimeout(1000); };
  const path = () => new URL(page.url()).pathname + new URL(page.url()).search;
  const goBackErr = () => consoleAll.filter((c) => /GO_BACK/.test(c.m)).length;
  const glyphClick = async (name) => {
    const pos = await page.evaluate((ch) => {
      const e = [...document.querySelectorAll('div,span')].find((x) => x.childElementCount === 0 && x.textContent === ch && x.offsetParent !== null);
      if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, String.fromCodePoint(MI[name]));
    if (pos) { await page.mouse.click(pos.x, pos.y); await page.waitForTimeout(1200); }
    return !!pos;
  };
  const out = {};
  // C1: Automazioni -> Scanner -> manuale -> Azione rapida -> Vai ai Dettagli (replace) -> Indietro
  try {
    await click('Automazioni');
    out.c1_scanner = await glyphClick('qr-code-scanner');
    out.c1_scannerFreccia = await arrows(page).then((a) => ({ nat: a.nat.length, own: a.own.filter((g) => g.y < 140).length }));
    await click('Inserisci Manualmente');
    await page.getByPlaceholder('Es: SKU-001, 1234567890123').fill('vis-0142');
    await click('Cerca');
    const az = await arrows(page);
    out.c1_azione = { url: path(), nat: az.nat.map((n) => n.label + '|img' + n.img) };
    await shot(page, 'c1-azione-rapida-da-scanner');
    await click('DETTAGLI/MODIFICA');
    await click('Vai ai Dettagli');
    out.c1_dopoReplace = path();
    await click('Indietro');
    out.c1_dopoIndietro = { url: path(), scanner: await vis('Scanner QR/Barcode').isVisible().catch(() => false) };
  } catch (e) { out.c1_errore = e.message.split('\n')[0]; }
  log('C1', JSON.stringify(out));

  // C2: Scanner -> lettura cartella -> Vedi prodotti (navigate verso (tabs), già in fondo allo stack) -> Indietro del browser
  const o2 = {};
  try {
    await page.goto(APP); await page.waitForTimeout(2000);
    await click('Automazioni'); await glyphClick('qr-code-scanner');
    o2.lettore = await scan(h, 'pellicce', { wait: 1500 });
    o2.azione = path();
    await click('VEDI PRODOTTI');
    o2.dopoVedi = path();
    const len = await page.evaluate(() => history.length);
    await page.goBack(); await page.waitForTimeout(1500);
    o2.dopoIndietroBrowser = { url: path(), cartella: await vis('CATEGORIA').isVisible().catch(() => false), historyLength: len };
  } catch (e) { o2.errore = e.message.split('\n')[0]; }
  log('C2', JSON.stringify(o2));

  // C3: Modifica aperta dall'indirizzo -> Salva -> OK (router.back senza schermata sotto)
  const o3 = {};
  try {
    const g0 = goBackErr();
    await page.goto(`${APP}/product/edit/cmp-1`); await page.waitForTimeout(2500);
    await click('Salva Modifiche');
    await page.waitForTimeout(1200);
    o3.url = path(); o3.goBack = goBackErr() - g0;
    o3.restaInModifica = await vis('Modifica prodotto').isVisible().catch(() => false);
  } catch (e) { o3.errore = e.message.split('\n')[0]; }
  log('C3', JSON.stringify(o3));

  // C4: NotFound raggiunta dall'app (Team ricaricato) -> Return Home -> Indietro del browser
  const o4 = {};
  try {
    await page.goto(APP); await page.waitForTimeout(2000);
    await click('Impostazioni'); await click('Accesso Multi-Utente');
    await page.reload(); await page.waitForTimeout(2500);
    o4.dopoRicarica = { url: path(), notFound: await vis('Page Not Found').isVisible().catch(() => false) };
    await click('Return Home');
    o4.dopoHome = path();
    await page.goBack(); await page.waitForTimeout(1500);
    o4.dopoIndietroBrowser = { url: path(), notFound: await vis('Page Not Found').isVisible().catch(() => false) };
  } catch (e) { o4.errore = e.message.split('\n')[0]; }
  log('C4', JSON.stringify(o4));

  // C5: Conta dal menu, posizione scelta, quantità scritta, poi Indietro del browser (analogo del tasto di sistema)
  const o5 = {};
  try {
    await page.goto(APP); await page.waitForTimeout(2000);
    await click('Automazioni'); await click('Conta Magazzino');
    const posti = await page.evaluate(() => (document.body.innerText || '').slice(0, 300));
    o5.testo = posti.replace(/\s+/g, ' ').slice(0, 160);
    await click('Magazzino');
    o5.passo = (await arrows(page)).testo.slice(0, 40);
    const inp = page.locator('input').locator('visible=true').first();
    if (await inp.count()) { await inp.fill('3'); o5.scritto = true; }
    const dialogsBefore = consoleAll.filter((c) => c.t === 'dialog').length;
    await page.goBack(); await page.waitForTimeout(1500);
    o5.dopoIndietroBrowser = { url: path(), finestre: consoleAll.filter((c) => c.t === 'dialog').length - dialogsBefore, testo: (await arrows(page)).testo.slice(0, 40) };
  } catch (e) { o5.errore = e.message.split('\n')[0]; }
  log('C5', JSON.stringify(o5));

  // C6: Azione rapida dall'indirizzo -> Chiudi
  const o6 = {};
  try {
    const g0 = goBackErr();
    await page.goto(`${APP}/scanner-action?type=library&id=pellicce`); await page.waitForTimeout(2500);
    await click('Chiudi');
    o6.url = path(); o6.goBack = goBackErr() - g0;
  } catch (e) { o6.errore = e.message.split('\n')[0]; }
  log('C6', JSON.stringify(o6));
  await browser.close();
})();
