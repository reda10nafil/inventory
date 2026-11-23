// G. Messaggio di LokiJS al primo avvio: browser pulito, tutti i messaggi di console (anche log), poi ricarica.
// Uso: node g-loki.cjs [n]  (n = numero di prove con browser nuovo, predefinito 3)
const { open, log, APP } = require('./base.cjs');
const N = Number(process.argv[2] || 3);
(async () => {
  for (let i = 1; i <= N; i++) {
    const { browser, page, consoleAll } = await open({ seed: false });
    await page.waitForTimeout(4000);
    const primo = consoleAll.filter((c) => /Loki|Deleting database|IndexedDB|\[DB\]/i.test(c.m)).map((c) => `${c.t}: ${c.m.slice(0, 90)}`);
    const dbs = await page.evaluate(async () => (indexedDB.databases ? (await indexedDB.databases()).map((d) => `${d.name}@${d.version}`) : 'n/a'));
    const n0 = consoleAll.length;
    await page.reload(); await page.waitForTimeout(4000);
    const dopo = consoleAll.slice(n0).filter((c) => /Loki|Deleting database|IndexedDB|\[DB\]/i.test(c.m)).map((c) => `${c.t}: ${c.m.slice(0, 90)}`);
    log(`prova ${i}`, JSON.stringify({ primoAvvio: primo, database: dbs, dopoRicarica: dopo }));
    await browser.close();
  }
})();
