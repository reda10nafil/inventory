// Verifica «selettori» (23/11): i campi di Aggiungi cambiano con la categoria? `Library.fields` letto? Modelli oggi.
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');

const KEY = 'furinventory_custom_fields:local';
const LAYOUT = 'furinventory_layout_config:local';
const LIBS = 'inventory:v1:local:libraries';

const formLines = (page) => page.evaluate(() => document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean));

(async () => {
  // 1. Aggiungi senza categoria, con «Pellicce», con «Usato e permute»; poi `fields` scritto a mano su Pellicce
  await scenario('v4-categoria-cambia-campi', async (h) => {
    await h.go('add');
    const nessuna = await formLines(h.page);
    await h.click('Pellicce');
    const pellicce = await formLines(h.page);
    await h.click('Usato e permute');
    const usato = await formLines(h.page);
    const diff = (a, b) => a.filter((x) => !b.includes(x));
    // categoria con un campo proprio scritto nel dato (forma di types/index.ts:86-92)
    await h.page.evaluate((k) => {
      const libs = JSON.parse(localStorage.getItem(k));
      libs[0].fields = [{ id: 'field_solo_pellicce', name: 'Solo per Pellicce', type: 'text_short', uiType: 'text', required: false, order: 99 }];
      localStorage.setItem(k, JSON.stringify(libs));
    }, LIBS);
    await h.go('add');
    await h.click('Pellicce');
    const conFields = await h.has('Solo per Pellicce', true);
    const libsDopo = await h.store(LIBS, 300);
    return {
      righe: nessuna.length, pellicceInPiu: diff(pellicce, nessuna), pellicceInMeno: diff(nessuna, pellicce),
      usatoInPiu: diff(usato, pellicce), usatoInMeno: diff(pellicce, usato),
      campoDiCategoriaMostrato: conFields, fieldsRestaNelDato: !!(libsDopo[0] && libsDopo[0].fields),
    };
  });

  // 2. Layout builder > MODELLI > Elettronica & Tech (riprova D12 dopo C07): tutti i campi? obbligatori per tutti?
  await scenario('v4-modello-builder', async (h) => {
    await h.go('settings/layout-builder');
    const prima = (await h.store(KEY, 0)).map((f) => f.id);
    await h.click('MODELLI');
    await h.click('Elettronica & Tech');
    await h.page.waitForTimeout(1500);
    const reg = await h.store(KEY);
    const nuovi = reg.filter((f) => !prima.includes(f.id));
    const l = await h.store(LAYOUT, 0);
    await h.go('add');
    const n0 = (await h.products(0)).length;
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    await h.page.waitForTimeout(800);
    return {
      nuovi: nuovi.map((f) => `${f.name}${f.required ? ' (obbl.)' : ''}`),
      tuttiNelLayout: nuovi.every((f) => l.fields.some((x) => x.id === f.id)),
      prodottiPrima: n0, prodottiDopo: (await h.products()).length,
    };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok'] });

  // 3. MODELLI > Abbigliamento: «Taglia» e «Colore» esistono già con altre opzioni/tipo. Che cosa resta?
  await scenario('v4-modello-nome-esistente', async (h) => {
    await h.go('settings/layout-builder');
    const prima = await h.store(KEY, 0);
    const t0 = prima.find((f) => f.name === 'Taglia'); const c0 = prima.find((f) => f.name === 'Colore');
    await h.click('MODELLI');
    await h.click('Abbigliamento');
    await h.page.waitForTimeout(1500);
    const dopo = await h.store(KEY);
    const t1 = dopo.find((f) => f.name === 'Taglia'); const c1 = dopo.find((f) => f.name === 'Colore');
    return {
      tagliaPrima: t0.dataset.join(','), tagliaDopo: t1.dataset.join(','), coloreTipoPrima: `${c0.type}/${c0.uiType}`, coloreTipoDopo: `${c1.type}/${c1.uiType}`,
      nuovi: dopo.filter((f) => !prima.some((p) => p.id === f.id)).map((f) => f.name),
    };
  }, { dialogs: ['ok', 'ok'] });

  // 4. Modelli di settore: raggiungibile, import «Pellicce & Pellicceria», «Salva campi attuali come modello» sul web
  await scenario('v4-modelli-settore', async (h) => {
    await h.tab('Impostazioni');
    const voce = await h.has('Modelli di settore', true);
    await h.click('Modelli di settore');
    const titolo = await h.has('Modelli Settore', true);
    const prima = await h.store(KEY, 0);
    await h.click('Pellicce & Pellicceria');
    await h.click('Importa', true);
    await h.page.waitForTimeout(1200);
    const dopo = await h.store(KEY);
    const l = await h.store(LAYOUT, 0);
    const nuovi = dopo.filter((f) => !prima.some((p) => p.id === f.id));
    await h.click('Salva Campi Attuali come Modello');
    await h.page.waitForTimeout(800);
    const chiavi = await h.page.evaluate(() => Object.keys(localStorage).filter((k) => /template/i.test(k)));
    return { voce, titolo, nuovi: nuovi.map((f) => f.name), tuttiNelLayout: nuovi.every((f) => l.fields.some((x) => x.id === f.id)), chiaviModelli: chiavi };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok'] });
})();
