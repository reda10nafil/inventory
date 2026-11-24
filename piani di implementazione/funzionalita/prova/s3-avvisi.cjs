// S3 (ticket 15, corsia B): avviso, blocco e proposta al carico degli scaffali; capienza delle posizioni in pezzi
// (AU-V13); lo scaffale come destinazione nello Spostamento rapido e in «Sposta in» dell'esecuzione (preso da FLU1).
// Ogni scenario legge lo stato salvato: con il blocco nessun evento è scritto, e la giacenza salvata è quella degli
// eventi `stock` rigiocati (`coincide`).
// - R2, ripiano da 2 pezzi: il 2° pezzo dà l'avviso «R2 sarà pieno», il 3° il blocco con la proposta G1; il tocco lo
//   posa su G1 (Movimenta, Aggiungi, Modifica);
// - A1 (Borse, 50×50×30 cm, 10 kg, 20 pezzi): un prodotto 60×40×20 non entra, uno da 12 kg nemmeno; la proposta è B2
//   (Borse) prima dei generici; «Annulla» non scrive nulla;
// - Azione rapida: il Carico (finestra di Movimenta) e «Spostato» verso una posizione piena;
// - Spostamento rapido: il codice di R2 è la destinazione «Magazzino › R2» (pezzo unico con `shelfId`, articolo a
//   quantità sulla chiave `magazzino/<R2>`), avviso, blocco e proposta; capienza di Vetrina in pezzi, non in prodotti;
// - esecuzione: «Scansiona Posizione» sul codice di R2, poi «Sposta nella posizione letta» porta su R2; il 3° bloccato;
// - Conta, Audit «Sposta qui» e import CSV: solo l'informazione «oltre il limite», nessun blocco;
// - barra appendiabiti da 15 grucce: il 16° capo bloccato con la proposta (CF-D5).
// Uso: node s3-avvisi.cjs [nome-scenario]   (senza argomento li esegue tutti)
const { scenario } = require('./lib.cjs');
const { leggi, ultima } = require('./cod-util.cjs');
const { iconAt } = require('./a3-util.cjs');
const { press } = require('./a1-util.cjs');
const {
  A1, BARRA, G1, R2, LOCATIONS, SENZA, k, prepara, stato, quantiEventi, label, avviso, usa, blocco, proposta, annulla, etichette, testo, finestre,
  apri, movimenta, leggiQui,
} = require('./s3-util.cjs');

const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const OK = Array(12).fill('ok');

(async () => {
  // 1. Movimenta su R2 (2 pezzi): 1° pezzo senza avviso, 2° con l'avviso «R2 sarà pieno», 3° bloccato con la proposta
  //    G1 (generico, libero al 90%); finché la finestra è aperta nessun evento; il tocco registra su G1
  await run('s3-ripiano-due', async (h) => {
    await prepara(h, { campi: { 'VIS-0098': { ...SENZA, libraryId: null } }, giacenze: { 'VIS-0098': { magazzino: 5 } } });
    const dove = ['In Magazzino', 'In Magazzino › R2'];
    await apri(h, 'VIS-0098');
    const primo = await movimenta(h, { pillole: dove, qty: '1' });
    const secondo = await movimenta(h, { pillole: dove, qty: '1' });
    const dopoDue = await stato(h, 'VIS-0098', 600);
    const eventiPrima = await quantiEventi(h);
    const terzo = await movimenta(h, { pillole: dove, qty: '1' });
    const finestra = await blocco(h);
    const eventiConFinestra = (await quantiEventi(h)) - eventiPrima;
    await proposta(h);
    const fine = await stato(h, 'VIS-0098');
    return {
      ok: primo === null && secondo === 'R2 sarà pieno' && !!finestra && eventiConFinestra === 0 && fine.stock['magazzino/G1'] === 1 && fine.coincide,
      avvisi: { primo, secondo, terzo }, dopoDue: dopoDue.stock, finestra, eventiConFinestra, fine,
    };
  }, { dialogs: OK });

  // 2. A1 (Borse): 60×40×20 «non entra» a scaffale vuoto, proposta B2 (Borse) prima di G1; «Annulla» non scrive. Un
  //    prodotto da 12 kg (10×10×10) non entra; il tocco su B2 lo posa lì
  await run('s3-lato-peso', async (h) => {
    await prepara(h, {
      campi: { 'VIS-0098': { ...SENZA, length: 60, width: 40, height: 20, libraryId: 'borse' }, 'PUZ-0012': { ...SENZA, length: 10, width: 10, height: 10, weight: 12, libraryId: 'borse' } },
      giacenze: { 'VIS-0098': { magazzino: 3 }, 'PUZ-0012': { magazzino: 2 } },
    });
    const dove = ['In Magazzino', 'In Magazzino › A1'];
    await apri(h, 'VIS-0098');
    const eventi0 = await quantiEventi(h);
    await movimenta(h, { pillole: dove, qty: '1' });
    const lato = await blocco(h);
    await annulla(h);
    const dopoAnnulla = { eventi: (await quantiEventi(h)) - eventi0, vis: await stato(h, 'VIS-0098', 600), finestraAncoraAperta: (await h.page.getByLabel('Registra movimento', { exact: true }).locator('visible=true').count()) > 0 };
    await h.page.keyboard.press('Escape').catch(() => {});
    await apri(h, 'PUZ-0012');
    await movimenta(h, { pillole: dove, qty: '1' });
    const peso = await blocco(h);
    await proposta(h);
    const puz = await stato(h, 'PUZ-0012');
    return {
      ok: !!lato && lato.righe.includes('Un lato di 60 cm è più grande di 50 cm') && lato.primario === 'Metti in B2 (libero al 95%)'
        && dopoAnnulla.eventi === 0 && !!peso && peso.righe.includes('Pesa 12 kg, lo scaffale ne regge 10') && puz.stock['magazzino/B2'] === 1 && puz.coincide,
      lato, dopoAnnulla, peso, puz,
    };
  }, { dialogs: OK });

  // 3. Aggiungi: R2 con un pezzo unico; il 2° pezzo unico su R2 dà l'avviso in linea e si salva; il 3° è bloccato
  //    (nessun prodotto creato), il tocco su «Metti in G1» lo salva su G1
  await run('s3-aggiungi', async (h) => {
    await prepara(h, { campi: { 'VIS-0142': { ...SENZA, location: 'magazzino', shelfId: R2.id } } });
    const aggiungi = async (sku) => {
      await h.go('add');
      await h.click('Magazzino');
      await label(h, 'Scaffale R2').click();
      await h.click('M'); // Taglia, obbligatoria nel campionario
      await h.page.getByPlaceholder('Auto: LOG-2026-001').fill(sku);
      await h.page.waitForTimeout(300);
      const letto = await avviso(h);
      const link = await usa(h);
      await h.click("Aggiungi all'Inventario");
      await h.page.waitForTimeout(800);
      return letto && `${letto} · ${link}`;
    };
    const secondo = await aggiungi('S3-ADD-2');
    const due = await stato(h, 'S3-ADD-2', 600);
    const prodottiPrima = (await h.products(0)).length;
    const terzo = await aggiungi('S3-ADD-3');
    const finestra = await blocco(h);
    const prodottiConFinestra = (await h.products(0)).length - prodottiPrima;
    await proposta(h);
    const tre = await stato(h, 'S3-ADD-3', 1500);
    return {
      ok: secondo === 'R2 sarà pieno · Usa G1' && due?.scaffale === 'R2' && !!finestra && prodottiConFinestra === 0 && tre?.scaffale === 'G1',
      secondo, due, terzo, finestra, prodottiConFinestra, tre,
    };
  }, { dialogs: OK });

  // 4. Modifica: R2 pieno (2 pezzi unici); LIN-0021 (Stand B) messo su R2 → blocco al salvataggio; «Annulla» non salva;
  //    il tocco su G1 salva lì. Un prodotto che resta su R2 (pieno) si salva sempre (solo cambiando scaffale)
  await run('s3-modifica', async (h) => {
    await prepara(h, { campi: {
      'VIS-0142': { ...SENZA, location: 'magazzino', shelfId: R2.id }, 'AST-0033': { ...SENZA, location: 'magazzino', shelfId: R2.id },
      'LIN-0021': { ...SENZA, libraryId: null },
    } });
    const modifica = async (sku) => {
      await apri(h, sku);
      await press(h.page, /^.?\s*Modifica$/); await h.page.waitForTimeout(800);
    };
    await modifica('LIN-0021');
    await h.click('Magazzino');
    await label(h, 'Scaffale R2').click();
    await h.page.waitForTimeout(300);
    const inLinea = await avviso(h);
    await h.click('Salva Modifiche');
    const finestra = await blocco(h);
    await annulla(h);
    const dopoAnnulla = await stato(h, 'LIN-0021', 600);
    await h.click('Salva Modifiche');
    await proposta(h);
    const lin = await stato(h, 'LIN-0021', 1200);
    // VIS-0142 resta su R2 (pieno): si salva senza finestra
    await modifica('VIS-0142');
    await h.click('Salva Modifiche');
    const restaSenzaFinestra = (await blocco(h)) === null;
    const vis = await stato(h, 'VIS-0142', 800);
    return {
      ok: !!finestra && dopoAnnulla.location === 'stand_b' && !dopoAnnulla.scaffale && lin.location === 'magazzino' && lin.scaffale === 'G1' && restaSenzaFinestra && vis.scaffale === 'R2',
      inLinea, finestra, dopoAnnulla, lin, restaSenzaFinestra, vis,
    };
  }, { dialogs: OK });

  // 5. Azione rapida: Carico del 21° pezzo su A1 (20 pezzi): blocco «21 pezzi, il massimo è 20» e proposta; «Spostato»
  //    verso Vetrina piena (capienza 1, già VIS-0142): blocco con la proposta Stand A, il tocco sposta lì
  await run('s3-azione-rapida', async (h) => {
    const locations = LOCATIONS.map((l) => (l.id === 'vetrina' ? { ...l, capacity: 1 } : l));
    await prepara(h, { locations, campi: { 'VIS-0098': { ...SENZA, libraryId: 'borse' }, 'PUZ-0012': SENZA }, giacenze: { 'VIS-0098': { [k(A1)]: 20 } } });
    await h.go('scanner-action?type=product&id=cmp-5');
    await label(h, 'Carico').click(); await h.page.waitForTimeout(500);
    await label(h, 'In Magazzino').click();
    await label(h, 'In Magazzino › A1').click();
    await h.page.locator('input[placeholder^="es. 2,5"]').locator('visible=true').first().fill('1');
    await label(h, 'Registra movimento').click(); await h.page.waitForTimeout(800);
    const carico = await blocco(h);
    await proposta(h);
    const vis = await stato(h, 'VIS-0098', 800);
    await h.go('scanner-action?type=product&id=cmp-6');
    await h.click('SPOSTATO');
    await h.click('Vetrina');
    await h.click('Conferma Spostamento');
    const spostato = await blocco(h);
    const puzPrima = await stato(h, 'PUZ-0012', 300);
    await proposta(h);
    const puz = await stato(h, 'PUZ-0012', 800);
    return {
      ok: !!carico && carico.righe.includes('21 pezzi, il massimo è 20') && vis.stock['magazzino/B2'] === 1 && vis.coincide
        && !!spostato && spostato.righe.includes('2 pezzi, il massimo è 1') && spostato.primario === 'Metti in Stand A' && puzPrima.location === 'stand_c' && puz.location === 'stand_a',
      carico, vis, spostato, puzPrima, puz,
    };
  }, { dialogs: OK });

  // 6. Spostamento rapido sullo scaffale: il codice di R2 è la destinazione «Magazzino › R2» (nessuna finestra
  //    «vale la sua posizione»); VIS-0142 (pezzo unico) va su R2 con `shelfId`; LIN-0021 (articolo a quantità, 3 pz in
  //    Stand B) non entra (4 pezzi su 2): blocco, il tocco su G1 lo trasferisce; AST-0033 entra con l'avviso
  await run('s3-spostamento-scaffale', async (h) => {
    await prepara(h, { campi: { 'VIS-0142': SENZA, 'AST-0033': SENZA, 'LIN-0021': SENZA }, giacenze: { 'LIN-0021': { stand_b: 3 } } });
    const visti = finestre(h);
    await h.go('automations/batch-move');
    await h.click('Scansiona Posizione');
    await leggi(h, 'SCAF-MAG-R2');
    const destinazione = (await testo(h)).match(/Destinazione Attuale: (.+?) (\d+%|Pieno|Cambia)/)?.[1] ?? null;
    await leggiQui(h, 'VIS-0142', 'Scansiona Prodotto');
    const vis = await stato(h, 'VIS-0142', 400);
    const eventi0 = await quantiEventi(h);
    await leggiQui(h, 'LIN-0021', 'Scansiona Prodotto');
    const finestra = await blocco(h);
    const eventiConFinestra = (await quantiEventi(h)) - eventi0;
    await proposta(h);
    const lin = await stato(h, 'LIN-0021', 600);
    await leggiQui(h, 'AST-0033', 'Scansiona Prodotto', 300);
    const messaggio = (await testo(h)).match(/AST-0033 Spostato![^|]{0,30}/)?.[0]?.trim() ?? null;
    const ast = await stato(h, 'AST-0033', 800);
    const spostati = (await testo(h)).match(/(\d+) Spostati/)?.[1] ?? null;
    return {
      ok: destinazione === 'Magazzino › R2' && vis.location === 'magazzino' && vis.scaffale === 'R2' && !!finestra && eventiConFinestra === 0
        && lin.stock['magazzino/G1'] === 3 && lin.coincide && ast.scaffale === 'R2' && !visti.some((m) => m.includes('vale') || m.includes('scaffale di')),
      destinazione, vis, finestra, eventiConFinestra, lin, messaggio, ast, spostati, finestre: visti,
    };
  }, { dialogs: OK });

  // 7. Capienza di Vetrina in pezzi (AU-V13): capienza 4, dentro VIS-0142 (1) e VIS-0098 (2 pz) = 3 pezzi su 2
  //    prodotti. PUZ-0012 entra con l'avviso (4 su 4); AST-0033 è bloccato con la proposta Stand A. Poi Vetrina piena:
  //    sceglierla blocca subito (niente «Usa comunque»)
  await run('s3-spostamento-posizione', async (h) => {
    const locations = LOCATIONS.map((l) => (l.id === 'vetrina' ? { ...l, capacity: 4 } : l));
    await prepara(h, { locations, giacenze: { 'VIS-0098': { vetrina: 2 } } });
    const visti = finestre(h);
    await h.go('automations/batch-move');
    await h.click('Vetrina');
    const destinazione = (await testo(h)).match(/Destinazione Attuale: (.+?) (\d+%|Pieno|Cambia)/)?.[1] ?? null;
    const barra = await h.page.evaluate(() => [...document.querySelectorAll('[data-testid^="riempimento-"]')].filter((e) => e.getClientRects().length > 0).map((e) => e.getAttribute('aria-label')));
    await leggiQui(h, 'PUZ-0012', 'Scansiona Prodotto', 300);
    const messaggio = (await testo(h)).match(/PUZ-0012 Spostato![^|]{0,40}/)?.[0]?.trim() ?? null;
    const puz = await stato(h, 'PUZ-0012', 600);
    await leggiQui(h, 'AST-0033', 'Scansiona Prodotto');
    const finestra = await blocco(h);
    await proposta(h);
    const ast = await stato(h, 'AST-0033', 600);
    await h.go('automations/batch-move');
    await h.click('Vetrina');
    const piena = await blocco(h);
    return {
      ok: destinazione === 'Vetrina' && puz.location === 'vetrina' && !!finestra && finestra.righe.includes('5 pezzi, il massimo è 4') && ast.location === 'stand_a'
        && !!piena && !visti.some((m) => m.includes('comunque')),
      destinazione, barra, messaggio, puz, finestra, ast, piena, finestre: visti,
    };
  }, { dialogs: OK });

  // 8. Esecuzione: «Scansiona Posizione» sul codice di R2, poi VIS-0142 va su R2; AST-0033 entra con l'avviso (R2 pieno);
  //    LIN-0021 bloccato: «Annulla» = rifiuto, niente scritto; riletto, il tocco su G1 lo posa lì
  await run('s3-esecuzione', async (h) => {
    await prepara(h, { campi: { 'VIS-0142': SENZA, 'AST-0033': SENZA, 'LIN-0021': SENZA } });
    await h.go('automations/custom-runner/auto_scaf'); await ultima(h, 'Scansiona Posizione');
    await leggi(h, 'SCAF-MAG-R2', { wait: 300 });
    const letta = (await testo(h)).match(/📍 [^|]{0,30}?R2/)?.[0] ?? null;
    await h.page.waitForTimeout(800);
    await leggiQui(h, 'VIS-0142', 'Scansiona Prodotto', 1200);
    const vis = await stato(h, 'VIS-0142', 300);
    await leggiQui(h, 'AST-0033', 'Scansiona Prodotto', 500);
    const fatto = (await testo(h)).match(/✅ Fatto![^|]{0,40}/)?.[0]?.trim() ?? null;
    const ast = await stato(h, 'AST-0033', 800);
    const eventi0 = await quantiEventi(h);
    await leggiQui(h, 'LIN-0021', 'Scansiona Prodotto', 1200);
    const finestra = await blocco(h);
    await annulla(h);
    const rifiuto = (await testo(h)).match(/❌ Non entra in R2[^|]{0,40}/)?.[0]?.trim() ?? null;
    const dopoAnnulla = { eventi: (await quantiEventi(h)) - eventi0, lin: await stato(h, 'LIN-0021', 300) };
    await h.page.waitForTimeout(1500);
    await leggiQui(h, 'LIN-0021', 'Scansiona Prodotto', 1200);
    await proposta(h);
    const lin = await stato(h, 'LIN-0021', 800);
    const azioni = (await testo(h)).match(/(\d+) azioni completate/)?.[1] ?? null;
    return {
      ok: !!letta && vis.scaffale === 'R2' && ast.scaffale === 'R2' && !!finestra && dopoAnnulla.eventi === 0 && dopoAnnulla.lin.location === 'stand_b' && lin.scaffale === 'G1' && azioni === '3',
      letta, vis, fatto, ast, finestra, rifiuto, dopoAnnulla, lin, azioni,
    };
  }, { dialogs: OK });

  // 9. Solo informazione: Conta di Vetrina (capienza 2, già VIS-0142 e VIS-0098 1 pz) con VIS-0098 contato 3: nel
  //    riepilogo «oltre il limite» sulla riga, la rettifica si registra; Audit di Vetrina con PUZ-0012 intruso «Sposta
  //    qui»: spostato, con l'informazione nella conferma
  await run('s3-conta-audit', async (h) => {
    const locations = LOCATIONS.map((l) => (l.id === 'vetrina' ? { ...l, capacity: 2 } : l));
    await prepara(h, { locations, giacenze: { 'VIS-0098': { vetrina: 1 } } });
    const visti = finestre(h);
    await h.go('automations/count');
    await label(h, 'Conta Vetrina').click(); await h.page.waitForTimeout(500);
    await label(h, 'Contata VIS-0098').fill('3');
    await label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(500);
    const riepilogo = { etichette: await etichette(h), frase: (await testo(h)).match(/Vetrina è oltre il limite[^.]*/)?.[0] ?? null, finestra: await blocco(h) };
    await label(h, 'Registra rettifiche').click(); await h.page.waitForTimeout(800);
    const conta = await stato(h, 'VIS-0098', 600);
    await h.go('automations/audit');
    await h.click('Vetrina');
    const list = await iconAt(h);
    const b = list.sort((a, c) => c.y - a.y)[0];
    await h.page.mouse.click(b.x, b.y); await h.page.waitForTimeout(700);
    await leggi(h, 'PUZ-0012', { wait: 1500 });
    const puz = await stato(h, 'PUZ-0012', 600);
    return {
      ok: riepilogo.etichette.length === 1 && riepilogo.finestra === null && conta.stock.vetrina === 3 && conta.coincide && puz.location === 'vetrina'
        && visti.some((m) => m.includes('Posizione aggiornata. Vetrina è oltre il limite')),
      riepilogo, conta, puz, finestre: visti,
    };
  }, { dialogs: ['2', 'ok', 'ok', 'ok'] });

  // 10. Import CSV: una riga porta A1 oltre il limite (25 pezzi su 20): importata, con l'informazione nel messaggio
  //     finale; un CSV che non supera nulla dà il messaggio di prima
  await run('s3-import', async (h) => {
    await prepara(h);
    const visti = finestre(h);
    await h.tab('Impostazioni');
    const drop = async (csv, name) => {
      const dt = await h.page.evaluateHandle(([text, n]) => { const d = new DataTransfer(); d.items.add(new File([text], n, { type: 'text/csv' })); return d; }, [csv, name]);
      await h.page.locator('[aria-label="Importa CSV trascinando un file qui"]').dispatchEvent('drop', { dataTransfer: dt });
      await h.page.waitForTimeout(1500);
    };
    await drop(['SKU,Tipo di pelle,Posizione,Unità,Giacenza', 'S3-IMP-1,visone,magazzino,pz,SCAF-MAG-A1:25'].join('\r\n'), 'oltre.csv');
    await drop(['SKU,Tipo di pelle,Posizione,Unità,Giacenza', 'S3-IMP-2,visone,magazzino,pz,SCAF-MAG-G1:3'].join('\r\n'), 'dentro.csv');
    const uno = await stato(h, 'S3-IMP-1', 600);
    const due = await stato(h, 'S3-IMP-2', 0);
    return {
      ok: uno?.stock['magazzino/A1'] === 25 && uno.coincide && due?.stock['magazzino/G1'] === 3
        && visti[0] === 'Importazione completata | 1 prodotti importati. 0 saltati (SKU vuoto o già presente, o giacenza non valida). A1 è oltre il limite: 25 pezzi, il massimo è 20.'
        && visti[1] === 'Importazione completata | 1 prodotti importati. 0 saltati (SKU vuoto o già presente, o giacenza non valida).',
      uno, due, finestre: visti,
    };
  }, { dialogs: OK });

  // 11. Barra appendiabiti da 15 grucce piena: il 16° capo (Movimenta, Carico) è bloccato «16 grucce, il massimo è
  //     15» con la proposta dell'altra barra; il tocco lo appende lì (CF-D5)
  await run('s3-barra', async (h) => {
    await prepara(h, { campi: { 'VIS-0098': { ...SENZA, libraryId: null } }, giacenze: { 'VIS-0098': { [k(BARRA)]: 15 } } });
    await apri(h, 'VIS-0098');
    await movimenta(h, { pillole: ['In Sartoria', 'In Sartoria › Barra giacche'], qty: '1' });
    const finestra = await blocco(h);
    await proposta(h);
    const vis = await stato(h, 'VIS-0098');
    return {
      ok: !!finestra && finestra.righe.includes('16 grucce, il massimo è 15') && finestra.primario === 'Metti in Barra cappotti (libero al 94%)' && vis.stock['sartoria/Barra cappotti'] === 1 && vis.coincide,
      finestra, vis,
    };
  }, { dialogs: OK });
})();
