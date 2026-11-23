// Verifica (23/11), azioni del builder non ancora provate: X e CAMPO, rinomina ed elimina sezione, X su Posizione;
// P02 (campo nel cestino e Modifica); elenco dal basso (picker) in Aggiungi.
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');

const KEY = 'furinventory_custom_fields:local';
const LAYOUT = 'furinventory_layout_config:local';
const rowButtons = (h, text) => h.vis(text).locator('xpath=ancestor::div[.//div[@tabindex="0"]][1]').locator('div[tabindex="0"]');
const cardButtons = rowButtons;
const cf = (p, name) => (p.customData || []).find((c) => c.fieldSnapshot && c.fieldSnapshot.name === name);
// marca l'input di una sezione (testo nel value) o il suo pulsante elimina
const markSection = (page, label, what) => page.evaluate(([l, w]) => {
  const input = [...document.querySelectorAll('input')].find((i) => i.value === l);
  if (!input) return false;
  if (w === 'input') { input.setAttribute('data-v7', 'x'); return true; }
  const row = input.parentElement;
  const btns = [...row.querySelectorAll('div[tabindex="0"]')];
  if (!btns.length) return false;
  btns[btns.length - 1].setAttribute('data-v7', 'x');
  return true;
}, [label, what]);

(async () => {
  // 1. X su Fornitore, Salva; poi CAMPO > Fornitore, Salva
  await scenario('v7-x-e-campo', async (h) => {
    await h.go('settings/layout-builder');
    await rowButtons(h, 'Fornitore').nth(3).click();
    await h.page.waitForTimeout(500);
    await h.click('Salva Layout');
    const l1 = await h.store(LAYOUT);
    await h.go('add');
    const inAggiungiDopoX = await h.has('Fornitore', true);
    await h.go('settings/layout-builder');
    await h.click('CAMPO');
    const voci = await h.page.evaluate(() => document.body.innerText.includes('Campo Originale di Sistema'));
    await h.click('Fornitore');
    await h.click('Salva Layout');
    const l2 = await h.store(LAYOUT);
    await h.go('add');
    const inAggiungiDopoCampo = await h.has('Fornitore', true);
    const voce = l2.fields.find((f) => f.id === 'field_cmp_fornitore');
    return {
      nelLayoutDopoX: l1.fields.some((f) => f.id === 'field_cmp_fornitore'), inAggiungiDopoX,
      campoElencaAncheBase: voci, rimessoIn: `${l2.fields.indexOf(voce)}/${l2.fields.length - 1}`, voce, inAggiungiDopoCampo,
    };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 2. Rinomina «Dati economici» in «Prezzi V7», elimina la sezione «Misure», Salva; effetto in Aggiungi
  await scenario('v7-sezioni', async (h) => {
    await h.go('settings/layout-builder');
    const okRen = await markSection(h.page, 'Dati economici', 'input');
    if (okRen) { await h.page.locator('[data-v7="x"]').fill('Prezzi V7'); await h.page.waitForTimeout(300); }
    await h.page.evaluate(() => document.querySelectorAll('[data-v7]').forEach((e) => e.removeAttribute('data-v7')));
    const okDel = await markSection(h.page, 'Misure', 'del');
    if (okDel) { await h.page.locator('[data-v7="x"]').click(); await h.page.waitForTimeout(600); }
    await h.click('Salva Layout');
    const l = await h.store(LAYOUT);
    await h.go('add');
    const t = await h.page.evaluate(() => document.body.innerText);
    return {
      okRen, okDel, sezioni: l.fields.filter((f) => f.type === 'section').map((f) => f.label),
      aggiungiPrezziV7: t.includes('Prezzi V7'), aggiungiMisure: /\nMisure\n/.test(t), lunghezzaAncora: t.includes('Lunghezza'),
    };
  }, { dialogs: ['ok', 'ok'] });

  // 3. X su Posizione, Salva: Aggiungi si può salvare? CAMPO la propone di nuovo?
  await scenario('v7-x-posizione', async (h) => {
    await h.go('settings/layout-builder');
    await rowButtons(h, 'Posizione').nth(3).click();
    await h.page.waitForTimeout(500);
    await h.click('Salva Layout');
    const l = await h.store(LAYOUT);
    await h.go('add');
    const n0 = (await h.products(0)).length;
    await h.click('Visone'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(900);
    const n1 = (await h.products()).length;
    await h.go('settings/layout-builder');
    await h.click('CAMPO');
    const propostaPosizione = await h.has('Posizione', true);
    return { nelLayout: l.fields.some((f) => f.id === 'location'), prodottiPrima: n0, prodottiDopo: n1, campoProponePosizione: propostaPosizione };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 4. P02: «Spessore» nel cestino, poi Modifica VIS-0142 e Salva: il valore resta?
  await scenario('v7-p02-campo-nel-cestino', async (h) => {
    await h.go('settings/fields');
    await cardButtons(h, 'Spessore').nth(1).click();
    await h.page.waitForTimeout(700);
    const del = (await h.store(KEY)).find((f) => f.id === 'field_cmp_spessore').deletedAt;
    await h.go('product/edit/cmp-1');
    await h.page.getByText('Campi personalizzati', { exact: false }).first().waitFor().catch(() => {});
    await h.click('Salva', false);
    await h.page.waitForTimeout(1200);
    const p = (await h.products()).find((x) => x.sku === 'VIS-0142');
    return { nelCestino: !!del, spessoreDopo: cf(p, 'Spessore') ? cf(p, 'Spessore').value : 'ASSENTE' };
  }, { dialogs: ['ok', 'ok'] });

  // 5. Elenco dal basso (PICKER) in Aggiungi: Colore > Nero, poi salvataggio
  await scenario('v7-picker-aggiungi', async (h) => {
    await h.go('add');
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    const box = h.page.locator('xpath=//div[normalize-space()="Colore"]/following-sibling::div[1]');
    await box.click();
    await h.page.waitForTimeout(600);
    const foglio = await h.page.evaluate(() => document.body.innerText.includes('Grigio perla'));
    await h.click('Nero');
    const mostrato = (await box.innerText()).trim();
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1500);
    const p = (await h.products())[0];
    return { foglioAperto: foglio, mostrato, salvato: cf(p, 'Colore') ? cf(p, 'Colore').value : 'ASSENTE' };
  }, { dialogs: ['ok', 'ok'] });
})();
