// A2 - Modelli di settore (D13): c'è una voce in Impostazioni? L'indirizzo /settings/sector-templates apre la schermata?
const { scenario } = require('./lib.cjs');

(async () => {
  await scenario('a2-modelli-settore', async (h) => {
    await h.go('settings'); // pagina caricata direttamente: nel DOM c'è solo Impostazioni
    const voceLayout = await h.has('Configura Layout Aggiungi', true); // controllo che la lettura funzioni
    const testoImpostazioni = await h.page.evaluate(() => document.body.innerText);
    const voceModelli = testoImpostazioni.split('\n').map((s) => s.trim()).filter((s) => /modell|settore|template/i.test(s));
    await h.go('settings/sector-templates');
    const schermataModelli = await h.has('Modelli Settore', true);
    const testo = (await h.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 120);
    await h.shot('indirizzo');
    return { voceLayout, voceModelli, schermataModelli, url: h.page.url(), testo };
  });
})();
