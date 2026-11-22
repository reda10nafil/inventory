// a4: Impostazioni › Aspetto - cambio stile: salvato in `@syncro/stile` (testo semplice, non JSON), applicato subito e dopo la ricarica.
const { scenario } = require('./lib.cjs');
const stile = (h) => h.page.evaluate(() => localStorage.getItem('@syncro/stile'));
// colore di fondo della schermata (primo elemento grande con sfondo pieno)
const fondo = (h) => h.page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => d.getBoundingClientRect().width >= 370 && d.getBoundingClientRect().height >= 700 && getComputedStyle(d).backgroundColor !== 'rgba(0, 0, 0, 0)');
  return el ? getComputedStyle(el).backgroundColor : null;
});
(async () => {
  await scenario('a4-aspetto', async (h) => {
    await h.go('settings/appearance');
    const prima = { stile: await stile(h), fondo: await fondo(h) };
    await h.click('Minimal');
    await h.page.waitForTimeout(1500);
    const subito = { stile: await stile(h), fondo: await fondo(h) };
    await h.go('settings');
    const descrizione = await h.has('Stile: Minimal');
    await h.go('');
    const homeDopoRicarica = { stile: await stile(h), fondo: await fondo(h) };
    await h.shot('home-minimal');
    return { prima, subito, voceImpostazioni: descrizione, homeDopoRicarica };
  });
})();
