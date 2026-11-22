// a4: esplorazione - elenco degli elementi premibili ([tabindex="0"]) con posizione e testo, per le schermate dell'area a4.
const { scenario } = require('./lib.cjs');
const route = process.argv[2] || 'settings/locations';
(async () => {
  await scenario('a4-esplora', async (h) => {
    await h.go(route);
    await h.shot(route.replace(/\//g, '_'));
    const els = await h.page.evaluate(() => [...document.querySelectorAll('[tabindex="0"], [role="switch"], input, textarea')].map((e) => {
      const r = e.getBoundingClientRect();
      return `${e.tagName}${e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.innerText || e.placeholder || e.value || '').replace(/\s+/g, ' ').slice(0, 50)}"`;
    }));
    return { url: h.page.url(), n: els.length, els };
  });
})();
