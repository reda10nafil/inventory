// Verifica campi (23/11): opzione rinominata (valori dei prodotti), stepper non salvato, Modifica (ordine, obbligatori, stepper).
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');

const KEY = 'furinventory_custom_fields:local';
const cardButtons = (h, text) => h.vis(text).locator('xpath=ancestor::div[.//div[@tabindex="0"]][1]').locator('div[tabindex="0"]');
const cf = (p, name) => (p.customData || []).find((c) => c.fieldSnapshot && c.fieldSnapshot.name === name);

// Stile dei riquadri di una scelta (selezionato = sfondo diverso dagli altri)
async function tiles(page, labels) {
  return page.evaluate((ls) => ls.map((l) => {
    const el = [...document.querySelectorAll('div')].find((d) => d.offsetParent && (d.innerText || '').trim() === l && d.children.length === 0);
    if (!el) return [l, null];
    const tile = el.parentElement;
    return [l, getComputedStyle(tile).backgroundColor + ' ' + getComputedStyle(tile).borderTopColor];
  }), labels);
}
// Etichette visibili in ordine verticale
async function labelOrder(page, names) {
  return page.evaluate((ns) => ns.map((n) => {
    const el = [...document.querySelectorAll('div')].find((d) => d.offsetParent && ((d.innerText || '').trim() === n || (d.innerText || '').trim() === `${n} *`) && d.children.length <= 1);
    return [n, el ? Math.round(el.getBoundingClientRect().top + window.scrollY + (el.closest('[data-testid]') ? 0 : 0)) : null];
  }).filter(([, y]) => y !== null), names);
}

(async () => {
  // 1. Rinomina l'opzione «M» di Taglia in «Media»: che cosa succede a VIS-0142 (Taglia = M)?
  await scenario('v2-opzione-rinomina', async (h) => {
    await h.go('settings/fields');
    await cardButtons(h, 'Taglia').nth(0).click();
    await h.page.waitForTimeout(700);
    await h.page.getByPlaceholder('Valore 3').fill('Media');
    await h.click('Aggiorna');
    const taglia = (await h.store(KEY)).find((f) => f.id === 'field_cmp_taglia');
    const p = (await h.products(0)).find((x) => x.sku === 'VIS-0142');
    await h.go('product/edit/cmp-1');
    await h.page.getByText('Taglia', { exact: false }).first().waitFor().catch(() => {});
    await h.vis('Media').scrollIntoViewIfNeeded().catch(() => {});
    const stiliModifica = await tiles(h.page, ['XS', 'S', 'Media', 'L', 'XL']);
    await h.shot('modifica-taglia');
    await h.go('product/cmp-1');
    const schedaTesto = await h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const i = schedaTesto.indexOf('Taglia');
    return {
      opzioni: taglia.options, dataset: taglia.dataset,
      valoreSalvato: cf(p, 'Taglia').value, snapshotOpzioni: cf(p, 'Taglia').fieldSnapshot.options.map((o) => o.label).join(','),
      stiliModifica, schedaTaglia: i >= 0 ? schedaTesto.slice(i, i + 20) : null,
    };
  }, { dialogs: ['ok'] });

  // 2. Stepper «Pezzi» (min 1): mostra 1, ma se non lo si tocca il valore non si salva
  await scenario('v2-stepper-non-toccato', async (h) => {
    await h.go('add');
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(1500);
    const p = (await h.products())[0];
    return { sku: p.sku, pezzi: cf(p, 'Pezzi') ? cf(p, 'Pezzi').value : 'ASSENTE', campiSalvati: (p.customData || []).map((c) => c.fieldSnapshot.name) };
  }, { dialogs: ['ok', 'ok'] });

  // 3. Modifica VIS-0142: ordine dei campi rispetto al layout, stepper, togliere Taglia (obbligatoria) e salvare
  await scenario('v2-modifica-obbligatorio', async (h) => {
    await h.go('product/edit/cmp-1');
    await h.page.getByText('Campi personalizzati', { exact: false }).first().waitFor().catch(() => {});
    const ordine = await labelOrder(h.page, ['Pezzi', 'Data di arrivo in negozio', 'Spessore', 'Colore', 'Lavorazione', 'Fornitore', 'Costo riparazione', 'Taglia', 'Condizione', 'Codice CITES', 'Dettagli', 'Trattamenti eseguiti', 'Posizione di consegna', 'Foto dettagli', 'Certificato di origine e autenticità', 'Storia, provenienza e lavorazioni precedenti del capo']);
    const pezzi = await h.page.evaluate(() => {
      const el = [...document.querySelectorAll('div')].find((d) => d.offsetParent && (d.innerText || '').trim() === 'Pezzi');
      const box = el && el.parentElement;
      return box ? { testo: box.innerText.replace(/\s+/g, ' '), inputs: [...box.querySelectorAll('input')].map((i) => i.value) } : null;
    });
    await h.vis('M').scrollIntoViewIfNeeded();
    await h.click('M'); // toglie la Taglia
    await h.click('Salva', false);
    await h.page.waitForTimeout(1200);
    const p = (await h.products()).find((x) => x.sku === 'VIS-0142');
    return {
      ordineModifica: ordine.sort((a, b) => a[1] - b[1]).map(([n]) => n),
      pezziInModifica: pezzi, tagliaDopo: cf(p, 'Taglia') ? cf(p, 'Taglia').value : 'ASSENTE',
    };
  }, { dialogs: ['ok', 'ok'] });
})();
