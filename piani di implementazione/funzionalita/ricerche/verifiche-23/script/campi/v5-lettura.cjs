// Verifica lettura dei campi (23/11): numeri personalizzati con la virgola nella Scheda, card dell'Inventario, CSV.
const fs = require('fs');
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');

const fillByLabel = async (h, label, value) => {
  await h.page.locator(`xpath=//div[normalize-space()="${label}"]/following-sibling::div[1]//input`).first().fill(value);
};
const cf = (p, name) => (p.customData || []).find((c) => c.fieldSnapshot && c.fieldSnapshot.name === name);

(async () => {
  // 1. Aggiungi con «Costo riparazione» 12,50 e «Spessore» 2,5: che cosa si salva e che cosa mostra la Scheda?
  await scenario('v5-numeri-personalizzati', async (h) => {
    await h.go('add');
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await fillByLabel(h, 'Spessore', '2,5');
    await fillByLabel(h, 'Costo riparazione', '12,50');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1500);
    const p = (await h.products())[0];
    await h.go(`product/${p.id}`);
    await h.page.getByText('Campi strutturati', { exact: false }).first().waitFor().catch(() => {});
    const t = await h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const at = (w) => { const i = t.indexOf(w); return i >= 0 ? t.slice(i, i + 32) : null; };
    return {
      salvatoSpessore: cf(p, 'Spessore') && cf(p, 'Spessore').value, salvatoCosto: cf(p, 'Costo riparazione') && cf(p, 'Costo riparazione').value,
      schedaSpessore: at('Spessore'), schedaCosto: at('Costo riparazione'),
    };
  }, { dialogs: ['ok', 'ok'] });

  // 2. Card dell'Inventario (valori dei campi personalizzati?) ed export CSV (colonne dei campi?)
  await scenario('v5-card-csv', async (h) => {
    const home = await h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const valoriCampiInCard = ['Grigio perla', 'Lasciata fuori', 'Pellicceria Bianchi'].filter((v) => home.includes(v));
    await h.tab('Impostazioni');
    const dl = h.page.waitForEvent('download', { timeout: 8000 });
    await h.click('Esporta Inventario');
    const d = await dl;
    const testo = fs.readFileSync(await d.path(), 'utf8');
    const header = testo.split(/\r?\n/)[0];
    return { valoriCampiInCard, header, contieneTaglia: /Taglia/.test(header), jsonCampiNelFile: /fieldSnapshot/.test(testo) };
  });
})();
