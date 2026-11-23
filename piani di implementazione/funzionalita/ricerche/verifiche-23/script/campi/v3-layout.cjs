// Verifica layout builder (23/11): sezione, dimensione, icona, Posizione nascosta, P12 trascinato da un campo nuovo, Modifica.
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');

const LAYOUT = 'furinventory_layout_config:local';
const rowButtons = (h, text) => h.vis(text).locator('xpath=ancestor::div[.//div[@tabindex="0"]][1]').locator('div[tabindex="0"]');
const NAME_PH = 'Es: Taglia Pantalone, PDF Manuale';

async function widthOf(page, name) {
  return page.evaluate((n) => {
    const el = [...document.querySelectorAll('div')].find((d) => d.offsetParent && ((d.innerText || '').trim() === n || (d.innerText || '').trim() === `${n} *`) && d.children.length <= 1);
    return el ? Math.round(el.parentElement.getBoundingClientRect().width) : null;
  }, name);
}
// Codice del glifo dell'icona nel riquadro del campo (Aggiungi: dentro il campo; Scheda: nella card)
async function glyph(page, name, where) {
  return page.evaluate(([n, w]) => {
    const el = [...document.querySelectorAll('div')].find((d) => d.offsetParent && (d.innerText || '').trim() === n && d.children.length === 0);
    if (!el) return null;
    const box = w === 'add' ? el.parentElement : el.parentElement.parentElement;
    const icon = [...box.querySelectorAll('div,span')].find((s) => s.children.length === 0 && /[\uE000-\uF8FF]/.test(s.textContent || ''));
    return icon ? icon.textContent.codePointAt(0).toString(16) : null;
  }, [name, where]);
}

(async () => {
  // 1. Che cosa offre il builder; SEZIONE (dove finisce), Taglia a 1/3, icona di Fornitore; poi Aggiungi e Scheda
  await scenario('v3-sezione-dimensione-icona', async (h) => {
    await h.go('settings/layout-builder');
    const testo = await h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const offre = ['Anteprima', 'Annulla', 'Obbligatori', 'Ripristina', 'Trascina'].filter((w) => testo.includes(w));
    await h.click('SEZIONE');
    await h.click('Taglia');
    await h.click('1/3');
    await h.click('Fornitore');
    await h.page.locator('xpath=//div[normalize-space()="Icona:"]/following-sibling::div[1]//div[@tabindex="0"]').first().click();
    await h.page.waitForTimeout(400);
    await h.click('Salva Layout');
    const l = await h.store(LAYOUT);
    await h.go('add');
    const larghezzaTaglia = await widthOf(h.page, 'Taglia');
    const larghezzaPezzi = await widthOf(h.page, 'Pezzi');
    const primaEtichetta = await h.page.evaluate(() => document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 4));
    const iconaAggiungi = await glyph(h.page, 'Fornitore', 'add');
    await h.go('product/cmp-1');
    await h.page.getByText('Campi strutturati', { exact: false }).first().waitFor().catch(() => {});
    const iconaScheda = await glyph(h.page, 'Fornitore', 'scheda');
    return {
      offreNelBuilder: offre, posizioneSezioneNuova: l.fields.findIndex((f) => f.type === 'section' && /Nuova/.test(f.label || '')),
      primoCampo: l.fields[0], tagliaSalvata: l.fields.find((f) => f.id === 'field_cmp_taglia'), larghezzaTaglia, larghezzaPezzi,
      iconaLayoutFornitore: (l.fields.find((f) => f.id === 'field_cmp_fornitore') || {}).icon, iconaAggiungi, iconaScheda, primaEtichetta,
    };
  }, { dialogs: ['ok'] });

  // 2. Posizione nascosta e salvata: Aggiungi si può ancora salvare?
  await scenario('v3-posizione-nascosta', async (h) => {
    await h.go('settings/layout-builder');
    await rowButtons(h, 'Posizione').nth(2).click();
    await h.page.waitForTimeout(400);
    await h.click('Salva Layout');
    await h.go('add');
    const prima = (await h.products(0)).length;
    const posizioneVisibile = await h.has('Vetrina', true);
    await h.click('Visone'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1000);
    return { posizioneVisibile, prima, dopo: (await h.products()).length };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 3. P12 aggravato: Peso nascosto SENZA salvare, poi si crea un campo (navigazione interna): il layout salvato?
  await scenario('v3-p12-campo-nuovo-salva-tutto', async (h) => {
    await h.tab('Impostazioni');
    await h.click('Configura Layout Aggiungi');
    await rowButtons(h, 'Peso').nth(2).click();
    await h.page.waitForTimeout(400);
    const salvatoPrima = (await h.store(LAYOUT, 300)).fields.find((f) => f.id === 'weight').visible;
    await h.page.goBack(); await h.page.waitForTimeout(1200);
    await h.click('Campi Personalizzati');
    await h.click('Crea Nuovo Campo');
    await h.click('Max 100 caratteri');
    await h.page.getByPlaceholder(NAME_PH).fill('V P12');
    await h.click('Salva Campo');
    const salvatoDopo = (await h.store(LAYOUT)).fields.find((f) => f.id === 'weight').visible;
    return { pesoVisibileSalvatoPrima: salvatoPrima, pesoVisibileSalvatoDopoCampoNuovo: salvatoDopo };
  }, { dialogs: ['ok'] });

  // 4. Peso nascosto e salvato: Modifica lo mostra ancora?
  await scenario('v3-modifica-ignora-layout', async (h) => {
    await h.go('settings/layout-builder');
    await rowButtons(h, 'Peso').nth(2).click();
    await h.page.waitForTimeout(400);
    await h.click('Salva Layout');
    await h.go('add');
    const pesoInAggiungi = await h.has('Peso', true);
    await h.go('product/edit/cmp-1');
    await h.page.getByText('Campi personalizzati', { exact: false }).first().waitFor().catch(() => {});
    const pesoInModifica = await h.has('Peso', true);
    return { pesoInAggiungi, pesoInModifica };
  }, { dialogs: ['ok'] });
})();
