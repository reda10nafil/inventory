// C2 (ticket 21): «Tipo di pelle» solo in Campi Personalizzati. La voce Impostazioni › Tipi di pelle non c'è più; il
// campo Base «Tipo di pelle» ha la matita, che apre solo l'editor dei valori (OptionsEditor a id stabili);
// `settings/categories` apre Campi Personalizzati con quell'editor aperto. Dati invariati: chiave
// `furinventory_categories:local` con la forma `[{id,label}]`, stessi id, `Product.furType` mai riscritto.
// Ogni scenario restituisce `ok` e i dettagli; le finestre del browser (Alert) sono nel registro di lib.cjs.
// Abbinamenti con le prove della vecchia schermata: m01-predefinite ↔ c2-tp-voce-e-matita, m01-crea-usa-rinomina ↔
// c2-tp-aggiungi + c2-tp-rinomina, m01-elimina ↔ c2-tp-elimina (vedi CRONOLOGIA, voce C2).
// Uso: node c2-tipo-pelle.cjs [nome-scenario]
const fs = require('fs');
const { scenario } = require('./lib.cjs');
const u = require('./c2-util.cjs');

const KEY = 'furinventory_categories:local';
const P = 'inventory:v1:local:products';
const CF = 'furinventory_custom_fields:local';
const PH = 'Es. Lapin, Castoro, Montone';
const MATITA = '[aria-label="Modifica i valori di Tipo di pelle"]';
const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const DEFAULT_IDS = ['visone', 'volpe', 'zibellino', 'cincilla', 'ermellino', 'astrakan', 'altro'];

async function apriValori(h) {
  await h.go('settings/fields');
  await h.page.locator(MATITA).locator('visible=true').first().click();
  await h.page.waitForTimeout(600);
}
// Nomi dei valori nell'editor (dai pulsanti «Elimina …», come m01-categorie)
const valori = (h) => h.page.evaluate(() => [...document.querySelectorAll('[aria-label^="Elimina "]')]
  .filter((e) => e.offsetParent).map((e) => e.getAttribute('aria-label').slice(8)));
// Testi delle finestre (Alert) dello scenario, per controllare i messaggi oltre allo stato salvato
const finestre = (page) => { const l = []; page.on('dialog', (d) => l.push(d.message().replace(/\n+/g, ' | '))); return l; };
const detto = (l, testo) => l.some((m) => m.includes(testo));
const forma = (list) => Array.isArray(list) && list.every((e) => Object.keys(e).sort().join() === 'id,label');
// Testo visibile della card di un prodotto (come c1-categorie)
const card = (h, sku) => h.vis(sku).evaluate((e) => e.parentElement.innerText.replace(/\s+/g, ' ').trim());
// Copia in JS di utils/csv.ts (solo per leggere il file scaricato), come c1-categorie
function parseCsv(input) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) { if (c === '"' && input[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"' && field.length === 0) quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && input[i + 1] === '\n') i++; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  return rows;
}

(async () => {
  // 1. Voce tolta da Impostazioni; matita solo su «Tipo di pelle» tra i campi Base; la matita apre solo i valori
  await run('c2-tp-voce-e-matita', async (h) => {
    const prima = await u.snapshot(h.page);
    await h.go('settings');
    const impostazioni = { tipiDiPelle: await h.has('Tipi di pelle', true), campi: await h.has('Campi Personalizzati', true) };
    await h.click('Campi Personalizzati');
    const matite = await h.page.locator(`${MATITA}:visible`).count();
    // Da EDC: matite «Come si compila» delle misure Base e «Come si vede» di Posizione (Unione 1: con l'Altezza di S2
    // le misure sono quattro)
    const misure = await h.page.locator('[aria-label^="Come si compila "]:visible, [aria-label^="Come si vede "]:visible').count();
    // Matite e cestini a video (glifi MaterialIcons edit e delete): una coppia per ogni campo personalizzato attivo
    // (16 nel campionario) più la matita di «Tipo di pelle» e, da EDC, quelle delle quattro misure Base (Lunghezza,
    // Larghezza, Peso, Altezza: «Come si compila») e di Posizione («Come si vede»); gli altri campi Base non ne hanno
    const glifi = await h.page.evaluate(() => {
      const n = (cp) => [...document.querySelectorAll('div')]
        .filter((d) => d.childElementCount === 0 && d.textContent === String.fromCodePoint(cp) && d.offsetParent).length;
      return { matite: n(0xe3c9), cestini: n(0xe872) };
    });
    const personali = (await h.store(CF, 0)).filter((f) => !f.isSystem && !f.deletedAt).length;
    const rigaValori = await h.has('Valori: Visone, Volpe, Zibellino, Cincillà, Ermellino, Astrakan, Altro', true);
    // Su HEAD la matita non c'è: lo scenario lo dice invece di fermarsi
    if (matite) { await h.page.locator(MATITA).locator('visible=true').first().click(); await h.page.waitForTimeout(600); }
    const editor = {
      elenco: await valori(h), titolo: await h.has('Valori (7)', true),
      nome: await h.has('Nome del Campo *', true), cambia: await h.has('Cambia', true), icona: await h.has("Scegli un'icona", true),
    };
    const chiavi = u.changedKeys(prima, await u.snapshot(h.page));
    const ok = !impostazioni.tipiDiPelle && impostazioni.campi && matite === 1 && glifi.matite === personali + 1 + misure && misure === 5 && glifi.cestini === personali && rigaValori
      && JSON.stringify(editor.elenco) === JSON.stringify(['Visone', 'Volpe', 'Zibellino', 'Cincillà', 'Ermellino', 'Astrakan', 'Altro'])
      && editor.titolo && !editor.nome && !editor.cambia && !editor.icona && chiavi.length === 0;
    return { ok, impostazioni, matite, misure, glifi, personali, rigaValori, editor, chiaviCambiate: chiavi };
  });

  // 2. `settings/categories` (indirizzo di M01) apre Campi Personalizzati con l'editor dei valori aperto; nulla salvato
  await run('c2-tp-indirizzo', async (h) => {
    const prima = await u.snapshot(h.page);
    await h.go('settings/categories');
    const aperto = { percorso: u.percorso(h.page), editor: await h.has('Valori (7)', true), titolo: await h.has('Campi Personalizzati', true) };
    await h.page.locator('[aria-label="Chiudi i valori di Tipo di pelle"]').locator('visible=true').first().click(); await h.page.waitForTimeout(500);
    const chiuso = { campi: await h.has('Campi attivi', false), editor: await h.has('Valori (7)', true) };
    const chiavi = u.changedKeys(prima, await u.snapshot(h.page));
    const ok = aperto.percorso === '/settings/categories' && aperto.editor && aperto.titolo && chiuso.campi && !chiuso.editor && chiavi.length === 0;
    return { ok, aperto, chiuso, chiaviCambiate: chiavi };
  });

  // 3. Aggiunta: «Lapin» in fondo con l'id dal nome, gli altri uguali; compare in Aggiungi e si salva sul prodotto
  await run('c2-tp-aggiungi', async (h) => {
    const f = finestre(h.page);
    await apriValori(h);
    await h.page.getByPlaceholder(PH).fill('Lapin');
    await h.click('Aggiungi valore');
    const salvata = await h.store(KEY, 800);
    const elenco = await valori(h);
    await h.go('add');
    const inAggiungi = await h.has('Lapin', true);
    await h.click('Lapin'); await h.click('Vetrina'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    const nuovo = (await h.products()).find((x) => x.sku === 'LOG-2026-001');
    const ok = forma(salvata) && JSON.stringify(salvata.map((c) => c.id)) === JSON.stringify([...DEFAULT_IDS, 'lapin'])
      && salvata[7].label === 'Lapin' && elenco.includes('Lapin') && inAggiungi && nuovo && nuovo.furType === 'lapin'
      && detto(f, '«Lapin» aggiunto ai tipi di pelle');
    return { ok, salvata, inAggiungi, furTypeProdotto: nuovo && nuovo.furType };
  }, { dialogs: ['ok', 'ok'] });

  // 4. Rinomina di un valore usato: Visone → «Visone Black». L'id resta, i prodotti non si toccano e mostrano il nome
  // nuovo in Scheda, card, CSV e Aggiungi; il messaggio avvisa del campo con «Sorgente Dati: Tipi di pelle».
  await run('c2-tp-rinomina', async (h) => {
    await h.page.evaluate((cf) => {
      const fields = JSON.parse(localStorage.getItem(cf));
      const pelle = { id: 'field_c2_pelle', name: 'Pelle interna', type: 'single_choice', uiType: 'grid', dataset: null, required: false, icon: 'layers', order: 40, isSystem: false, linkTo: 'furType' };
      fields.push(pelle);
      localStorage.setItem(cf, JSON.stringify(fields));
      // VAL (ticket 23, punto 7): VIS-0098 ha il campo compilato prima di VAL, col nome «Visone» scritto
      const list = JSON.parse(localStorage.getItem('inventory:v1:local:products'));
      list.find((p) => p.sku === 'VIS-0098').customData.push({ value: 'Visone', fieldSnapshot: pelle });
      localStorage.setItem('inventory:v1:local:products', JSON.stringify(list));
    }, CF);
    const prodPrima = await h.products(0);
    const f = finestre(h.page);
    await apriValori(h);
    await h.click('Visone');
    const inRinomina = await h.has('Rinomina «Visone»', true);
    await h.page.getByPlaceholder(PH).fill('Visone Black');
    await h.click('Salva nome');
    const salvata = await h.store(KEY, 800);
    const prodDopo = await h.products(0);
    await h.go('');
    const cardVis = await card(h, 'VIS-0142');
    await h.click('VIS-0142');
    const scheda = await h.has('Tipo di pelle: Visone Black', true);
    // CSV: il report delle giacenze mostra il nome; il CSV dei prodotti (giro esporta-reimporta) tiene l'id stabile
    await h.go('settings');
    const scarica = async (voce) => {
      const dl = h.page.waitForEvent('download', { timeout: 8000 });
      await h.click(voce);
      const righe = parseCsv(fs.readFileSync(await (await dl).path(), 'utf8').replace(/^﻿/, ''));
      const col = righe[0].indexOf('Tipo di pelle');
      return righe.slice(1).filter((r) => ['VIS-0142', 'VIS-0098'].includes(r[0])).map((r) => `${r[0]}|${r[col]}`).join();
    };
    const csv = { giacenze: await scarica('Esporta giacenze'), prodotti: await scarica('Esporta Inventario') };
    await h.go('add');
    const aggiungi = { nuovo: await h.has('Visone Black', true), vecchio: await h.has('Visone', true) };
    const ok = inRinomina && forma(salvata) && JSON.stringify(salvata.map((c) => c.id)) === JSON.stringify(DEFAULT_IDS)
      && salvata[0].label === 'Visone Black' && JSON.stringify(prodDopo) === JSON.stringify(prodPrima)
      && /Visone Black/.test(cardVis) && scheda && csv.giacenze === 'VIS-0142|Visone Black,VIS-0098|Visone Black' && csv.prodotti === 'VIS-0142|visone,VIS-0098|visone' && aggiungi.nuovo && !aggiungi.vecchio
      && detto(f, '«Visone» ora si chiama «Visone Black». I 2 prodotti che lo usano mostrano il nome nuovo.')
      && detto(f, 'Nel campo «Pelle interna» 1 prodotto compilato prima ha il nome scritto: lì resta «Visone».');
    return { ok, salvata: salvata.slice(0, 2), prodottiUguali: JSON.stringify(prodDopo) === JSON.stringify(prodPrima), cardVis, scheda, csv, aggiungi };
  }, { dialogs: ['ok', 'ok'] });

  // 5. Eliminazioni: usato (Visone, 2 prodotti) rifiutato col conteggio; usato solo dal cestino (Astrakan) rifiutato e
  // detto; doppione «visóne» rifiutato; libero (Ermellino) eliminato dopo la conferma; ultimo valore non eliminabile.
  await run('c2-tp-elimina', async (h) => {
    await h.page.evaluate((pk) => {
      const ps = JSON.parse(localStorage.getItem(pk));
      ps.find((p) => p.sku === 'AST-0033').deletedAt = '2026-11-23T08:00:00.000Z';
      localStorage.setItem(pk, JSON.stringify(ps));
    }, P);
    const f = finestre(h.page);
    await apriValori(h);
    await h.page.locator('[aria-label="Elimina Visone"]').locator('visible=true').first().click(); await h.page.waitForTimeout(600);
    await h.page.locator('[aria-label="Elimina Astrakan"]').locator('visible=true').first().click(); await h.page.waitForTimeout(600);
    const dopoUsati = await h.store(KEY, 500);
    await h.page.getByPlaceholder(PH).fill('visóne');
    await h.click('Aggiungi valore');
    const dopoDoppione = await h.store(KEY, 500);
    await h.page.locator('[aria-label="Elimina Ermellino"]').locator('visible=true').first().click(); await h.page.waitForTimeout(800);
    const dopoLibero = await h.store(KEY, 800);
    await h.page.evaluate((k) => localStorage.setItem(k, JSON.stringify([{ id: 'solo', label: 'Solo' }])), KEY);
    await apriValori(h);
    await h.page.locator('[aria-label="Elimina Solo"]').locator('visible=true').first().click(); await h.page.waitForTimeout(600);
    const dopoUltimo = await h.store(KEY, 500);
    const ok = dopoUsati === null && dopoDoppione === null && forma(dopoLibero)
      && JSON.stringify(dopoLibero.map((c) => c.id)) === JSON.stringify(DEFAULT_IDS.filter((i) => i !== 'ermellino'))
      && JSON.stringify(dopoUltimo) === JSON.stringify([{ id: 'solo', label: 'Solo' }])
      && detto(f, 'Il tipo di pelle "Visone" è usato da 2 prodotti.') && detto(f, 'Il tipo di pelle "Astrakan" è usato da 1 prodotto nel cestino.')
      && detto(f, 'Esiste già il tipo di pelle "visóne"') && detto(f, 'Eliminare il valore "Ermellino"?') && detto(f, 'Deve restare almeno un tipo di pelle.');
    return { ok, dopoUsati, dopoDoppione, dopoLibero: dopoLibero && dopoLibero.map((c) => c.id), dopoUltimo };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok'] });
})();
