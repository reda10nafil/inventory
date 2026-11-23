// G2. Quando compare «Deleting database failed … blocked»? Ricarica subito durante il primo avvio, e due schede.
const { open, log, APP } = require('./base.cjs');
const pick = (arr) => arr.filter((c) => /Deleting database|blocked|Empty database|reset/i.test(c.m)).map((c) => `${c.t}: ${c.m.slice(0, 70)}`);
(async () => {
  for (const ms of [300, 1200]) {
    const { browser, page, consoleAll } = await open({ seed: false });
    // open() ha già aspettato 2,5 s: si pulisce e si ricomincia per avere un primo avvio vero
    await page.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('syncroflow'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
    consoleAll.length = 0;
    await page.goto(APP); await page.waitForTimeout(ms);
    await page.reload(); await page.waitForTimeout(4000);
    log(`ricarica dopo ${ms} ms`, JSON.stringify(pick(consoleAll)));
    await browser.close();
  }
  // due schede nello stesso profilo, la seconda aperta mentre la prima prepara il database
  const { browser, ctx, page, consoleAll } = await open({ seed: false });
  await page.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('syncroflow'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await page.goto('about:blank');
  const p1 = await ctx.newPage(); const p2 = await ctx.newPage();
  const c = [];
  for (const [n, p] of [['A', p1], ['B', p2]]) p.on('console', (m) => c.push({ t: `${n}/${m.type()}`, m: m.text() }));
  await Promise.all([p1.goto(APP), p2.goto(APP)]);
  await p1.waitForTimeout(5000);
  log('due schede', JSON.stringify(pick(c)));
  await browser.close();
})();
