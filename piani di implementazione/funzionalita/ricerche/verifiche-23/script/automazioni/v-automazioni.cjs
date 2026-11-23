// Verifica automazioni (23 novembre): scenari nuovi, sola lettura del codice dell'app.
// Lanciare da questa cartella con SHOTS=<questa cartella>. Usa lib.cjs e a3-util.cjs della prova per percorso assoluto.
const P = require('path').join(__dirname, '../../../../prova');
const { scenario } = require(`${P}/lib.cjs`);
const { scan, product, timelineIds, newEvents } = require(`${P}/a3-util.cjs`);

const KEY = '@furinventory_custom_automations:local';
const PK = 'inventory:v1:local:products';
const TK = 'inventory:v1:local:timeline';
const last = async (h, text) => { await h.page.getByText(text, { exact: true }).locator('visible=true').last().click(); await h.page.waitForTimeout(700); };
const auto = (id, steps) => ({ id, name: id, icon: 'flash-on', color: '#3B82F6', description: '', qrValue: `AUTO:${id}`, steps, createdAt: '2026-11-22T00:00:00Z', usageCount: 0 });
const st = (id, type, config = {}, label = type) => ({ id, order: 0, type, config, label });
const seedAutos = (h, list) => h.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, list]);
const patchProduct = (h, sku, patch) => h.page.evaluate(([pk, sku, patch]) => {
  const list = JSON.parse(localStorage.getItem(pk));
  Object.assign(list.find((x) => x.sku === sku), patch);
  localStorage.setItem(pk, JSON.stringify(list));
}, [PK, sku, patch]);
const body = (h) => h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const header = async (h) => (await body(h)).match(/(\d+) azioni completate/)?.[1];
const pick = (only) => !process.env.SOLO || process.env.SOLO.split(',').includes(only);

(async () => {
  // R1. Prezzo scritto con la virgola o col punto delle migliaia nella vendita del costruttore (parseFloat)
  if (pick('r1')) await scenario('v-runner-prezzo', async (h) => {
    await seedAutos(h, [auto('auto_vendi', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'), st('s2', 'mark_sold', { pricePrompt: true }, 'Vendi (con conferma prezzo)')])]);
    await h.go('automations/custom-runner/auto_vendi');
    await last(h, 'Scansiona Prodotto');
    await scan(h, 'AST-0033', { wait: 1200 });
    await h.page.getByPlaceholder('0.00').locator('visible=true').first().fill('1300,50');
    await h.click('CONFERMA');
    await h.page.waitForTimeout(800);
    await scan(h, 'LIN-0021', { wait: 1200 });
    await h.page.getByPlaceholder('0.00').locator('visible=true').first().fill('5.900');
    await h.click('CONFERMA');
    const a = await product(h, 'AST-0033');
    const b = await product(h, 'LIN-0021', 0);
    const ev = (await h.timeline(0)).filter((e) => e.type === 'sold').map((e) => `${e.productId}:${e.details.finalPrice}`);
    return { scritto1: '1300,50', salvatoAST: a.sellPrice, scritto2: '5.900', salvatoLIN: b.sellPrice, eventiSold: ev };
  });

  // R2. Vendita di un capo già venduto dal costruttore: che cosa dice e che cosa conta
  if (pick('r2')) await scenario('v-runner-gia-venduto', async (h) => {
    await seedAutos(h, [auto('auto_vendi', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'), st('s2', 'mark_sold', { pricePrompt: true }, 'Vendi (con conferma prezzo)')])]);
    await h.go('automations/custom-runner/auto_vendi');
    await last(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'VOL-0087', { wait: 1200 });
    const modale = await h.has('Prezzo Vendita', true);
    if (modale) await h.click('CONFERMA');
    await h.page.waitForTimeout(400);
    const testo = await body(h);
    const p = await product(h, 'VOL-0087');
    const ev = await newEvents(h, before, 0);
    return { modalePrezzoAperta: modale, messaggio: testo.match(/Venduto[^A-Z]{0,30}/)?.[0] ?? null, azioniCompletate: testo.match(/(\d+) azioni completate/)?.[1], soldAt: p.soldAt, eventiNuovi: ev };
  });

  // R3. Due passi che scrivono nelle note uno dopo l'altro (tag, tag, imposta campo): restano tutti?
  if (pick('r3')) await scenario('v-runner-note-in-fila', async (h) => {
    await seedAutos(h, [auto('auto_note', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'),
      st('s2', 'add_tag', { tag: 'Controllato' }, 'Aggiungi Tag: Controllato'),
      st('s3', 'add_tag', { tag: 'Da Pulire' }, 'Aggiungi Tag: Da Pulire'),
      st('s4', 'set_field', { fieldName: 'Stato', fieldValue: 'OK' }, 'Imposta Stato = OK')])]);
    await h.go('automations/custom-runner/auto_note');
    await last(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'LIN-0021', { wait: 1500 });
    const p = await product(h, 'LIN-0021');
    const ev = await newEvents(h, before, 0);
    return { atteso: '[Controllato] [Da Pulire] [Stato=OK]', noteSalvate: p.technicalNotes, azioniCompletate: await header(h), eventi: ev.map((e) => `${e.type}:${JSON.stringify(e.details.changes)}`) };
  });

  // R4. Prodotto nel cestino: costruttore (tag + sposta) e Tagging di massa
  if (pick('r4')) await scenario('v-cestino-tag', async (h) => {
    await patchProduct(h, 'VIS-0098', { deletedAt: '2026-11-21T10:00:00Z' });
    await seedAutos(h, [auto('auto_ts', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'),
      st('s2', 'add_tag', { tag: 'Controllato' }, 'Aggiungi Tag: Controllato'),
      st('s3', 'move_to', { useLastScannedLocation: false, locationId: 'vetrina' }, 'Sposta in: Vetrina')])]);
    await h.go('automations/custom-runner/auto_ts');
    await last(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'VIS-0098', { wait: 1500 });
    const dopoRunner = await product(h, 'VIS-0098');
    const azioni = await header(h);
    await h.go('automations/quick-tag');
    await h.click('Da Pulire');
    await h.click('Scansiona Prodotto');
    await scan(h, 'VIS-0098', { wait: 1000 });
    const dopoTag = await product(h, 'VIS-0098');
    const ev = await newEvents(h, before, 0);
    return { deletedAt: dopoTag.deletedAt, noteDopoRunner: dopoRunner.technicalNotes, posizioneDopoRunner: dopoRunner.location, azioniCompletate: azioni, noteDopoTagging: dopoTag.technicalNotes, eventi: ev.map((e) => e.type) };
  });

  // R5. Passo «Sposta in» con una posizione che non c'è più (posizione eliminata dopo aver creato l'automazione)
  if (pick('r5')) await scenario('v-runner-posizione-sparita', async (h) => {
    await seedAutos(h, [auto('auto_vecchia', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'),
      st('s2', 'move_to', { useLastScannedLocation: false, locationId: 'deposito_eliminato', locationName: 'Deposito' }, 'Sposta in: Deposito')])]);
    await h.go('automations/custom-runner/auto_vecchia');
    await last(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'PUZ-0012', { wait: 1500 });
    const p = await product(h, 'PUZ-0012');
    const ev = await newEvents(h, before, 0);
    const locs = JSON.parse(await h.page.evaluate(() => localStorage.getItem('furinventory_locations:local') || '[]')).map((l) => l.id);
    return { posizionePUZ: p.location, posizioneEsiste: locs.includes(p.location), eventi: ev.map((e) => `${e.type}:${e.details.from}>${e.details.to}`) };
  });

  // R6. «Sposta» con la scelta predefinita del costruttore («Usa l'ultima posizione scansionata») ma senza lettura di posizione
  if (pick('r6')) await scenario('v-runner-sposta-senza-posizione', async (h) => {
    await seedAutos(h, [auto('auto_def', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'),
      st('s2', 'move_to', { useLastScannedLocation: true }, 'Sposta nella Posizione Scansionata')])]);
    await h.go('automations/custom-runner/auto_def');
    await last(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'PUZ-0012', { wait: 400 });
    const messaggio = (await body(h)).match(/(Fatto[^.]*|Nessuna posizione[^.]*)/)?.[0] ?? null;
    await h.page.waitForTimeout(1000);
    const p = await product(h, 'PUZ-0012');
    const ev = await newEvents(h, before, 0);
    return { messaggio, posizionePUZ: p.location, eventi: ev.length, azioniCompletate: await header(h) };
  });

  // R7. Codici: link GS1 (QR della Scheda, contenuto del tag NFC) e SKU in minuscolo, nel costruttore e nello Scanner
  if (pick('r7')) await scenario('v-codici', async (h) => {
    const gs1 = (await product(h, 'VIS-0142', 0)).gs1DigitalLink;
    await seedAutos(h, [auto('auto_tag', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'), st('s2', 'add_tag', { tag: 'Visto' }, 'Aggiungi Tag: Visto')])]);
    await h.go('automations/custom-runner/auto_tag');
    await last(h, 'Scansiona Prodotto');
    await scan(h, gs1, { wait: 300 });
    await h.page.waitForTimeout(300);
    const runnerGs1 = (await body(h)).match(/(Non trovato[^\n]{0,20}|✅ [A-Z]{3}-\d{4})/)?.[0] ?? null;
    await h.page.waitForTimeout(2200);
    await scan(h, 'vis-0142', { wait: 300 });
    await h.page.waitForTimeout(300);
    const runnerMinuscolo = (await body(h)).match(/(Non trovato[^\n]{0,20}|✅ [A-Z]{3}-\d{4})/)?.[0] ?? null;
    const noteVis = (await product(h, 'VIS-0142', 1200)).technicalNotes;
    // Scanner: lettura (sim.) del link GS1
    await h.go('scanner');
    await scan(h, gs1, { wait: 1500 });
    const scannerLettura = (await h.has('Azione rapida', true)) ? 'Azione rapida' : 'non riconosciuto?';
    // Scanner: scritto a mano link GS1, codice di posizione, QR di automazione
    const manuale = {};
    for (const code of [gs1, 'stand_a', 'AUTO:auto_tag']) {
      await h.go('scanner');
      await h.click('Inserisci Manualmente');
      await h.page.getByPlaceholder('Es: SKU-001, 1234567890123').fill(code);
      await h.click('Cerca');
      manuale[code] = (await h.has('Azione rapida', true)) ? 'Azione rapida' : (await h.has('POSIZIONE', true)) ? 'posizione' : (await h.has('auto_tag', true)) ? 'automazione' : 'non trovato';
    }
    return { gs1, runnerGs1, runnerMinuscolo, noteVIS0142: noteVis ?? null, scannerLettura, manuale };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'] });

  // A1. Audit: intruso solo aggiunto, poi riletto
  if (pick('a1')) await scenario('v-audit-intruso-riletto', async (h) => {
    const stats = () => h.page.evaluate(() => {
      const t = document.body.innerText; const n = (k) => t.match(new RegExp(`${k}:\\s*(\\d+)`))?.[1];
      return { trovati: n('Trovati'), mancanti: n('Mancanti'), intrusi: n('Intrusi'), pct: t.match(/(\d+)%/)?.[1] };
    });
    await h.go('automations/audit');
    await h.click('Stand B');
    await h.page.getByText('INTRUSO').count();
    // lettore: pulsante tondo in basso
    const fab = async () => {
      const list = await h.page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; }).filter((r) => r.w > 0));
      const b = list.sort((a, c) => c.y - a.y)[0]; await h.page.mouse.click(b.x, b.y); await h.page.waitForTimeout(700);
    };
    await fab();
    await scan(h, 'PUZ-0012', { wait: 1200 }); // intruso -> 1 Aggiungi all'Audit
    const dopoAggiunta = await stats();
    await fab();
    await scan(h, 'PUZ-0012', { wait: 1200 }); // riletto
    const dopoRilettura = await stats();
    const intrusoScritto = await h.has('INTRUSO', true);
    const p = await product(h, 'PUZ-0012');
    return { dopoAggiunta, dopoRilettura, etichettaIntrusoAncora: intrusoScritto, posizionePUZ: p.location };
  }, { dialogs: ['1', 'ok', 'ok'] });

  // A2. Audit e Spostamento rapido con 8 posizioni: quali si scelgono senza fotocamera?
  if (pick('a2')) await scenario('v-audit-otto-posizioni', async (h) => {
    await h.page.evaluate(() => {
      const base = [
        { id: 'magazzino', label: 'Magazzino', color: '#3B82F6' }, { id: 'vetrina', label: 'Vetrina', color: '#D4AF37' },
        { id: 'stand_a', label: 'Stand A', color: '#10B981' }, { id: 'stand_b', label: 'Stand B', color: '#10B981' },
        { id: 'stand_c', label: 'Stand C', color: '#10B981' }, { id: 'sartoria', label: 'Sartoria', color: '#8B5CF6' },
        { id: 'deposito', label: 'Deposito', color: '#14B8A6' }, { id: 'ricevimento', label: 'Ricevimento', color: '#EC4899' }];
      localStorage.setItem('furinventory_locations:local', JSON.stringify(base));
    });
    await h.go('automations/audit');
    const audit = { Deposito: await h.has('Deposito', true), Ricevimento: await h.has('Ricevimento', true), Sartoria: await h.has('Sartoria', true) };
    await h.go('automations/batch-move');
    const batch = { Deposito: await h.has('Deposito', true), Ricevimento: await h.has('Ricevimento', true) };
    await h.go('automations/count');
    const conta = { Deposito: await h.has('Deposito', true), Ricevimento: await h.has('Ricevimento', true) };
    return { audit, spostamentoRapido: batch, conta };
  });

  // Q1. Articolo a quantità nel costruttore: vendita a prezzo di catalogo due volte, poi «Sposta in»
  if (pick('q1')) await scenario('v-runner-quantita', async (h) => {
    await h.page.evaluate(([pk, tk]) => {
      const list = JSON.parse(localStorage.getItem(pk)); const p = list.find((x) => x.sku === 'VIS-0098');
      Object.assign(p, { stock: { magazzino: 5, stand_a: 2 }, unit: 'pz' });
      const tl = JSON.parse(localStorage.getItem(tk) || '[]');
      tl.unshift({ id: 'v-q-1', productId: p.id, type: 'stock', timestamp: '2026-11-22T08:00:00.000Z', details: { movement: 'carico', qty: 5, to: 'magazzino', reason: 'iniziale', before: 0, after: 5 } });
      tl.unshift({ id: 'v-q-2', productId: p.id, type: 'stock', timestamp: '2026-11-22T08:00:01.000Z', details: { movement: 'carico', qty: 2, to: 'stand_a', reason: 'iniziale', before: 5, after: 7 } });
      localStorage.setItem(pk, JSON.stringify(list)); localStorage.setItem(tk, JSON.stringify(tl));
    }, [PK, TK]);
    await seedAutos(h, [auto('auto_q', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'), st('s2', 'mark_sold', { pricePrompt: false }, 'Vendi (prezzo catalogo)'),
      st('s3', 'move_to', { useLastScannedLocation: false, locationId: 'vetrina' }, 'Sposta in: Vetrina')])]);
    await h.go('automations/custom-runner/auto_q');
    await last(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    await scan(h, 'VIS-0098', { wait: 1500 });
    const p = await product(h, 'VIS-0098');
    const ev = await newEvents(h, before, 0);
    return { stockDopo: p.stock, location: p.location, status: p.status, eventi: ev.map((e) => `${e.details.movement}/${e.details.reason || '-'}/${e.details.qty}/${e.details.from || ''}>${e.details.to || ''}/${e.details.finalPrice ?? ''}`) };
  });

  // B1. Costruttore aperto dall'indirizzo (ricarica della pagina)
  if (pick('b1')) await scenario('v-builder-indirizzo', async (h) => {
    await seedAutos(h, [auto('auto_x', [st('s1', 'scan_product', {}, 'Scansiona Prodotto')])]);
    await h.go('settings/automation-builder');
    const nuovo = (await body(h)).slice(0, 120);
    await h.go('automations');
    await h.click('auto_x');
    const frecce = await h.page.locator('text=/arrow-upward|arrow-downward|drag/').count();
    return { daIndirizzo: nuovo };
  });

  // S1. P30: le tre voci «Prossimamente» e Condivisione
  if (pick('s1')) await scenario('v-p30', async (h) => {
    await h.tab('Impostazioni');
    const out = {};
    for (const label of ['Alert Prodotti Dormienti', 'Suggerimenti AI']) {
      await h.vis(label).scrollIntoViewIfNeeded();
      await h.click(label);
      out[label] = 'cliccato';
    }
    await h.vis('Configurazione Condivisione').scrollIntoViewIfNeeded();
    await h.click('Configurazione Condivisione');
    out.condivisione = (await body(h)).match(/Questa funzionalità[^.]*\./)?.[0] ?? null;
    return out;
  }, { dialogs: ['ok', 'ok'] });
})();
