// ESE (ticket 29): esecuzione corretta delle automazioni. Gli scenari `v-runner-*`, `v-cestino-tag` e `v-audit-*` delle
// verifiche del 23 (`ricerche/verifiche-23/script/automazioni/v-automazioni.cjs`) passano da «difetto» ad «atteso»,
// con il codice scritto nel lettore («Scrivi il codice», `leggi` di cod-util) come lo darebbe l'utente:
// - prezzo «1300,50» e «5.900» nella vendita con conferma, prezzo sbagliato che non vende, «Annulla» (AU-V01);
// - capo già venduto: rifiuto detto, finestra del prezzo chiusa, nessuna azione contata (AU-V03);
// - tre tag e un campo in fila sullo stesso prodotto, tutti presenti (AU-V02, P17);
// - prodotto nel cestino: nessuna nota, nessuno spostamento, nel costruttore e nel Tagging (AU-V04);
// - passo verso una posizione eliminata, «Sposta nella posizione letta» senza lettura (AU-V05, AU-V06);
// - costruttore: flusso senza lettura che non si salva, frecce, modifica di un passo, «Imposta Campo» (P16, AU-V12, P17);
// - automazione salvata senza lettura iniziale: «Modifica»; tipo di passo sconosciuto che non fa cadere (P16);
// - Audit: intruso riletto «già segnato», 8 posizioni con la ricerca, posizione dall'Azione rapida (AU-V08, V09, N17);
// - uso contato aprendo l'esecuzione dall'indirizzo (AU-N13); avviso eliminando una posizione usata (AU-V05).
// - (dopo il revisore) prodotto già nella posizione del passo: la catena continua; valuta con la virgola nella Scheda.
// Ogni scenario dà `ok` (true se il comportamento è quello atteso) e i valori letti dallo stato salvato.
// Uso (dalla cartella prova/, app su :8082 e campionario su :8765): node ese-automazioni.cjs [filtro…]
const { scenario } = require('./lib.cjs');
const { iconAt, timelineIds, newEvents } = require('./a3-util.cjs');
const c = require('./cod-util.cjs');

const AK = c.AK;
const LOC = c.LOC;
const st = (id, type, config = {}, label = type) => ({ id, order: 0, type, config, label });
const auto = (id, steps, extra = {}) => ({ id, name: id, icon: 'flash-on', color: '#3B82F6', description: '', qrValue: `AUTO:${id}`, steps: steps.map((s, i) => ({ ...s, order: i })), createdAt: '2026-11-22T00:00:00Z', usageCount: 0, ...extra });
const SP = st('s1', 'scan_product', {}, 'Scansiona Prodotto');
const salva = (h, list) => h.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [AK, list]);
const cestino = (h, sku) => h.page.evaluate(([pk, sku]) => {
  const list = JSON.parse(localStorage.getItem(pk));
  list.find((x) => x.sku === sku).deletedAt = '2026-11-21T10:00:00.000Z';
  localStorage.setItem(pk, JSON.stringify(list));
}, [c.PK, sku]);
const azioni = async (h) => (await c.testo(h)).match(/(\d+) azioni completate/)?.[1] ?? null;
const prezzo = (h) => h.page.getByPlaceholder('0.00').locator('visible=true');
const OTTO = [
  { id: 'magazzino', label: 'Magazzino', color: '#3B82F6' }, { id: 'vetrina', label: 'Vetrina', color: '#D4AF37' },
  { id: 'stand_a', label: 'Stand A', color: '#10B981' }, { id: 'stand_b', label: 'Stand B', color: '#10B981' },
  { id: 'stand_c', label: 'Stand C', color: '#10B981' }, { id: 'sartoria', label: 'Sartoria', color: '#8B5CF6' },
  { id: 'deposito', label: 'Deposito', color: '#14B8A6' }, { id: 'ricevimento', label: 'Ricevimento', color: '#EC4899' },
];
// Il pulsante tondo del lettore in basso (Audit)
const fab = async (h) => { const b = (await iconAt(h)).sort((a, z) => z.y - a.y)[0]; await h.page.mouse.click(b.x, b.y); await h.page.waitForTimeout(700); };
const filtri = process.argv.slice(2);
const run = (name, fn, opts) => (!filtri.length || filtri.some((f) => name.includes(f)) ? scenario(name, fn, opts) : null);

(async () => {
  // 1. Prezzo con la virgola e col punto delle migliaia; prezzo sbagliato; «Annulla» (AU-V01)
  await run('ese-prezzo', async (h) => {
    await salva(h, [auto('auto_vendi', [SP, st('s2', 'mark_sold', { pricePrompt: true }, 'Vendi (con conferma prezzo)')])]);
    await h.go('automations/custom-runner/auto_vendi');
    await c.ultima(h, 'Scansiona Prodotto');
    await c.leggi(h, 'AST-0033', { wait: 1200 });
    const proposta = await prezzo(h).first().inputValue().catch(() => null);
    await prezzo(h).first().fill('1300,50');
    await h.click('CONFERMA');
    await h.page.waitForTimeout(800);
    await c.leggi(h, 'LIN-0021', { wait: 1200 });
    await prezzo(h).first().fill('5.900');
    await h.click('CONFERMA');
    await h.page.waitForTimeout(800);
    // prezzo che non è un numero: la finestra resta aperta e non vende; «Annulla» torna alla lettura
    await c.leggi(h, 'VIS-0142', { wait: 1200 });
    await prezzo(h).first().fill('abc');
    await h.click('CONFERMA');
    const sbagliato = { finestraAperta: (await prezzo(h).count()) > 0, messaggio: (await c.testo(h)).match(/Scrivi un prezzo valido[^.]*\./)?.[0] ?? null };
    if (await h.has('Annulla', true)) await h.click('Annulla');
    const dopoAnnulla = { finestraAperta: (await prezzo(h).count()) > 0, passo: (await c.testo(h)).match(/Step \d+ di \d+/)?.[0] ?? null };
    const a = await c.prodotto(h, 'AST-0033', 600);
    const b = await c.prodotto(h, 'LIN-0021');
    const v = await c.prodotto(h, 'VIS-0142');
    const sold = (await h.timeline(0)).filter((e) => e.type === 'sold').map((e) => `${e.productId}:${e.details.finalPrice}`);
    const out = { proposta, AST: a.sellPrice, LIN: b.sellPrice, eventiSold: sold.slice(0, 2), sbagliato, dopoAnnulla, VIS: v.status, azioni: await azioni(h) };
    const ok = a.sellPrice === 1300.5 && b.sellPrice === 5900 && sold.includes('cmp-4:1300.5') && sold.includes('cmp-3:5900')
      && sbagliato.finestraAperta && !!sbagliato.messaggio && !dopoAnnulla.finestraAperta && v.status === 'available' && out.azioni === '2';
    return { ok, ...out };
  });

  // 2. Capo già venduto: rifiuto detto prima della finestra del prezzo, contatore fermo (AU-V03)
  await run('ese-gia-venduto', async (h) => {
    await salva(h, [auto('auto_vendi', [SP, st('s2', 'mark_sold', { pricePrompt: true }, 'Vendi (con conferma prezzo)')])]);
    await h.go('automations/custom-runner/auto_vendi');
    await c.ultima(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    await c.leggi(h, 'VOL-0087', { wait: 700 });
    const finestra = (await prezzo(h).count()) > 0;
    const messaggio = (await c.testo(h)).match(/VOL-0087 risulta già venduto\./)?.[0] ?? null;
    if (finestra) await h.click('CONFERMA');
    const ev = await newEvents(h, before, 600);
    const out = { finestraPrezzo: finestra, messaggio, azioni: await azioni(h), eventiNuovi: ev.length };
    return { ok: !finestra && !!messaggio && out.azioni === '0' && ev.length === 0, ...out };
  });

  // 3. Tre tag e un campo in fila sullo stesso prodotto: restano tutti (AU-V02, P17)
  await run('ese-note-in-fila', async (h) => {
    await salva(h, [auto('auto_note', [SP,
      st('s2', 'add_tag', { tag: 'Controllato' }, 'Aggiungi Tag: Controllato'),
      st('s3', 'add_tag', { tag: 'Da Pulire' }, 'Aggiungi Tag: Da Pulire'),
      st('s4', 'set_field', { fieldId: 'field_cmp_cond', fieldName: 'Condizione', fieldValue: 'Buono' }, 'Imposta Condizione = Buono'),
      st('s5', 'add_tag', { tag: 'Stirato' }, 'Aggiungi Tag: Stirato')])]);
    await h.go('automations/custom-runner/auto_note');
    await c.ultima(h, 'Scansiona Prodotto');
    const p0 = await c.prodotto(h, 'AST-0033');
    const before = await timelineIds(h);
    await c.leggi(h, 'AST-0033', { wait: 1500 });
    const p = await c.prodotto(h, 'AST-0033', 600);
    const ev = await newEvents(h, before, 0);
    const cond = (p.customData || []).find((d) => d.fieldSnapshot?.id === 'field_cmp_cond');
    const atteso = `${p0.technicalNotes}\n[Controllato]\n[Da Pulire]\n[Stirato]`;
    const out = { note: p.technicalNotes, condizione: cond?.value ?? null, schedaCampo: cond?.fieldSnapshot?.name ?? null, altriCampi: (p.customData || []).length, azioni: await azioni(h), eventi: ev.map((e) => `${e.type}:${JSON.stringify(e.details.changes)}`) };
    const ok = p.technicalNotes === atteso && out.condizione === 'Buono' && out.altriCampi === (p0.customData || []).length + 1 && out.azioni === '4' && ev.length === 4;
    return { ok, ...out };
  });

  // 4. Prodotto nel cestino: nessuna nota e nessuno spostamento, nel costruttore e nel Tagging (AU-V04)
  await run('ese-cestino', async (h) => {
    await cestino(h, 'VIS-0098');
    await salva(h, [auto('auto_ts', [SP, st('s2', 'add_tag', { tag: 'Controllato' }, 'Aggiungi Tag: Controllato'),
      st('s3', 'move_to', { useLastScannedLocation: false, locationId: 'vetrina', locationName: 'Vetrina' }, 'Sposta in: Vetrina')])]);
    await h.go('automations/custom-runner/auto_ts');
    await c.ultima(h, 'Scansiona Prodotto');
    const p0 = await c.prodotto(h, 'VIS-0098');
    const before = await timelineIds(h);
    await c.leggi(h, 'VIS-0098', { wait: 500 });
    const messaggioEsecuzione = /VIS-0098 è nel cestino/.test(await c.testo(h));
    const azioniEsecuzione = await azioni(h);
    await h.go('automations/quick-tag');
    await h.click('Da Pulire');
    await h.click('Scansiona Prodotto');
    await c.leggi(h, 'VIS-0098', { wait: 500 });
    const messaggioTagging = /VIS-0098 è nel cestino/.test(await c.testo(h));
    const p = await c.prodotto(h, 'VIS-0098', 600);
    const ev = await newEvents(h, before, 0);
    const out = { messaggioEsecuzione, messaggioTagging, azioniEsecuzione, note: p.technicalNotes ?? null, posizione: p.location, eventi: ev.map((e) => e.type) };
    return { ok: messaggioEsecuzione && messaggioTagging && azioniEsecuzione === '0' && p.technicalNotes === p0.technicalNotes && p.location === 'magazzino' && ev.length === 0, ...out };
  });

  // 5. Passo verso una posizione eliminata; «Sposta nella posizione letta» senza lettura (AU-V05, AU-V06)
  await run('ese-posizione-sparita', async (h) => {
    await salva(h, [
      auto('auto_vecchia', [SP, st('s2', 'move_to', { useLastScannedLocation: false, locationId: 'deposito_eliminato', locationName: 'Deposito' }, 'Sposta in: Deposito')]),
      auto('auto_def', [SP, st('s2', 'move_to', { useLastScannedLocation: true }, 'Sposta nella Posizione Scansionata')]),
    ]);
    const before = await timelineIds(h);
    await h.go('automations/custom-runner/auto_vecchia');
    await c.ultima(h, 'Scansiona Prodotto');
    await c.leggi(h, 'PUZ-0012', { wait: 500 });
    const sparita = { messaggio: (await c.testo(h)).match(/La posizione di questo passo non esiste più[^.]*\./)?.[0] ?? null, azioni: await azioni(h) };
    await h.go('automations/custom-runner/auto_def');
    await c.ultima(h, 'Scansiona Prodotto');
    await c.leggi(h, 'PUZ-0012', { wait: 500 });
    const senzaLettura = { messaggio: (await c.testo(h)).match(/Nessuna posizione letta[^.]*\./)?.[0] ?? null, azioni: await azioni(h), passo: (await c.testo(h)).match(/Step \d+ di \d+/)?.[0] ?? null };
    const p = await c.prodotto(h, 'PUZ-0012', 600);
    const ev = await newEvents(h, before, 0);
    const out = { sparita, senzaLettura, posizionePUZ: p.location, eventi: ev.length };
    return { ok: !!sparita.messaggio && sparita.azioni === '0' && !!senzaLettura.messaggio && senzaLettura.azioni === '0' && p.location === 'stand_c' && ev.length === 0, ...out };
  });

  // 6. Costruttore: un flusso che non inizia con una lettura non si salva; frecce; modifica di un passo; «Imposta
  //    Campo» con la scelta del campo; poi l'automazione salvata si esegue (P16, AU-V06, AU-V12, P17)
  await run('ese-costruttore', async (h) => {
    await h.tab('Automazioni');
    await h.click('Crea Nuova');
    await h.page.getByPlaceholder('Es. Scarico Merci').fill('Controllo');
    await h.click('Aggiungi Step');
    await h.click('Sposta Prodotto');
    const avviso = await h.has('Serve prima un passo «Scansiona Posizione».', true);
    await h.click("Usa l'ultima posizione scansionata"); // senza lettura di posizione prima non si accende
    await c.ultima(h, 'Vetrina');
    await c.ultima(h, 'Aggiungi');
    await h.click('Salva');
    const nonSalvata = ((await h.store(AK, 600)) || []).length === 0;
    await h.click('Aggiungi Step');
    await c.ultima(h, 'Scansiona Prodotto');
    await h.page.locator('[aria-label="Sposta su il passo 2"]').locator('visible=true').first().click();
    await h.page.waitForTimeout(400);
    await h.click('Aggiungi Step');
    await h.click('Aggiungi Tag');
    await h.page.getByPlaceholder('Es. Da Pulire').fill('Controllato');
    await c.ultima(h, 'Aggiungi');
    await h.click('Aggiungi Tag: Controllato'); // tocco sul passo: si modifica
    await h.page.getByPlaceholder('Es. Da Pulire').fill('Verificato');
    await c.ultima(h, 'Aggiorna');
    await h.click('Aggiungi Step');
    await h.click('Imposta Campo');
    await c.ultima(h, 'Condizione');
    await c.ultima(h, 'Buono');
    await c.ultima(h, 'Aggiungi');
    await h.click('Salva');
    const salvate = (await h.store(AK)) || [];
    const a = salvate[0] || { steps: [] };
    const passi = a.steps.map((s) => `${s.order}:${s.type}:${s.label}`);
    const campo = (a.steps.find((s) => s.type === 'set_field') || {}).config || null;
    // eseguita: PUZ-0012 in Vetrina, nota «[Verificato]», Condizione = Buono
    await h.click('Controllo');
    await h.click('Avvia Automazione');
    await c.ultima(h, 'Scansiona Prodotto');
    await c.leggi(h, 'PUZ-0012', { wait: 1500 });
    const p = await c.prodotto(h, 'PUZ-0012', 600);
    const cond = (p.customData || []).find((d) => d.fieldSnapshot?.id === 'field_cmp_cond');
    const out = { avviso, nonSalvata, passi, campo, eseguita: { posizione: p.location, note: p.technicalNotes ?? null, condizione: cond?.value ?? null } };
    const ok = avviso && nonSalvata && salvate.length === 1
      && passi.join('|') === '0:scan_product:Scansiona Prodotto|1:move_to:Sposta in: Vetrina|2:add_tag:Aggiungi Tag: Verificato|3:set_field:Imposta Condizione = Buono'
      && campo && campo.fieldId === 'field_cmp_cond' && campo.fieldValue === 'Buono'
      && p.location === 'vetrina' && p.technicalNotes === '[Verificato]' && out.eseguita.condizione === 'Buono';
    return { ok, ...out };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 7. Automazione salvata che non inizia con una lettura: messaggio e «Modifica» (P16); tipo di passo sconosciuto
  await run('ese-senza-lettura', async (h) => {
    await salva(h, [
      auto('auto_fissa', [st('s1', 'move_to', { useLastScannedLocation: false, locationId: 'vetrina' }, 'Sposta in: Vetrina')]),
      auto('auto_nuova', [SP, st('s2', 'carico', { qty: 2 }, 'Carico 2 pz'), st('s3', 'add_tag', { tag: 'Visto' }, 'Aggiungi Tag: Visto')]),
    ]);
    await h.go('automations');
    await h.click('auto_fissa');
    await h.click('Avvia Automazione');
    const messaggio = await h.has('Questa automazione non inizia con una lettura.', true);
    const pulsante = await h.has('Modifica', true);
    if (pulsante) await h.click('Modifica');
    const costruttore = await h.has('Modifica Automazione', true) && await h.has('Sposta in: Vetrina', true);
    // tipo sconosciuto (da una versione più nuova): la scheda e l'esecuzione si aprono, la lettura dà il messaggio
    await h.go('automations');
    await h.click('auto_nuova');
    const scheda = await h.has('Carico 2 pz', true);
    await h.click('Avvia Automazione');
    await c.ultima(h, 'Scansiona Prodotto');
    const v0 = await c.prodotto(h, 'VIS-0142');
    await c.leggi(h, 'VIS-0142', { wait: 500 });
    const sconosciuto = (await c.testo(h)).match(/Passo sconosciuto \(«carico»\)/)?.[0] ?? null;
    const v = await c.prodotto(h, 'VIS-0142', 600);
    const out = { messaggio, pulsante, costruttore, scheda, sconosciuto, noteInvariate: v.technicalNotes === v0.technicalNotes, azioni: await azioni(h) };
    return { ok: messaggio && pulsante && costruttore && scheda && !!sconosciuto && out.noteInvariate && out.azioni === '0', ...out };
  });

  // 8. Audit: un intruso aggiunto e poi riletto resta intruso (AU-V08)
  await run('ese-audit-intruso', async (h) => {
    const stats = () => h.page.evaluate(() => {
      const t = document.body.innerText; const n = (k) => t.match(new RegExp(`${k}:\\s*(\\d+)`))?.[1];
      return { trovati: n('Trovati'), mancanti: n('Mancanti'), intrusi: n('Intrusi'), pct: t.match(/(\d+)%/)?.[1] };
    });
    const visti = [];
    h.page.on('dialog', (d) => visti.push(d.message().replace(/\s+/g, ' ')));
    await h.go('automations/audit');
    await h.click('Stand B');
    await fab(h);
    await c.leggi(h, 'PUZ-0012', { wait: 1200 }); // intruso → «Aggiungi all'Audit»
    const dopoAggiunta = await stats();
    await fab(h);
    await c.leggi(h, 'PUZ-0012', { wait: 1200 }); // riletto
    const dopoRilettura = await stats();
    const messaggio = visti.find((m) => /già segnato come intruso/.test(m)) ?? null;
    const out = { dopoAggiunta, dopoRilettura, messaggio, etichettaIntruso: await h.has('INTRUSO', true) };
    const ok = dopoRilettura.trovati === '0' && dopoRilettura.mancanti === '1' && dopoRilettura.intrusi === '1' && dopoRilettura.pct === '0' && !!messaggio && out.etichettaIntruso;
    return { ok, ...out };
  }, { dialogs: ['1', 'ok', 'ok'] });

  // 9. Audit con 8 posizioni: tutte sceglibili, con la ricerca (AU-V09)
  await run('ese-audit-posizioni', async (h) => {
    await h.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [LOC, OTTO]);
    await h.go('automations/audit');
    const tutte = {};
    for (const l of OTTO) tutte[l.label] = await h.has(l.label, true);
    const ricerca = h.page.getByPlaceholder('Cerca posizione').locator('visible=true');
    const conRicerca = (await ricerca.count()) > 0;
    if (conRicerca) await ricerca.first().fill('ric');
    await h.page.waitForTimeout(300);
    const filtrate = { Ricevimento: await h.has('Ricevimento', true), Deposito: await h.has('Deposito', true) };
    if (filtrate.Ricevimento) await h.click('Ricevimento');
    const avviato = await h.has('AUDIT IN CORSO', true) && await h.has('Ricevimento', true);
    const out = { tutte, conRicerca, filtrate, avviato };
    return { ok: Object.values(tutte).every(Boolean) && conRicerca && filtrate.Ricevimento && !filtrate.Deposito && avviato, ...out };
  });

  // 10. Dall'Azione rapida di una posizione Audit e Spostamento rapido partono da quella posizione (AU-N17)
  await run('ese-azione-posizione', async (h) => {
    await h.go('scanner-action?type=location&id=stand_b');
    await h.click('INVENTARIO / AUDIT');
    const audit = { chiedePosizione: await h.has('Inizia Inventario', true), inCorso: await h.has('AUDIT IN CORSO', true) && await h.has('Stand B', true) };
    await h.go('scanner-action?type=location&id=stand_b');
    await h.click('SPOSTAMENTO DI MASSA');
    const spostamento = { chiedePosizione: await h.has('Fase 1: Scannerizza Posizione', true), destinazione: (await c.testo(h)).includes('Stand B') };
    const out = { audit, spostamento };
    return { ok: !audit.chiedePosizione && audit.inCorso && !spostamento.chiedePosizione && spostamento.destinazione, ...out };
  });

  // 11. Uso contato aprendo l'esecuzione dall'indirizzo, una volta per apertura (AU-N13)
  await run('ese-uso-da-indirizzo', async (h) => {
    await salva(h, [auto('auto_tag', [SP, st('s2', 'add_tag', { tag: 'Visto' }, 'Aggiungi Tag: Visto')])]);
    await h.go('automations/custom-runner/auto_tag');
    const prima = ((await h.store(AK, 1200)) || [])[0];
    await h.go('automations/custom-runner/auto_tag');
    const seconda = ((await h.store(AK, 1200)) || [])[0];
    const out = { usoDopoPrimaApertura: prima?.usageCount ?? null, usoDopoSeconda: seconda?.usageCount ?? null, ultimoUso: !!seconda?.lastUsedAt };
    return { ok: out.usoDopoPrimaApertura === 1 && out.usoDopoSeconda === 2 && out.ultimoUso, ...out };
  });

  // 13. (Parere del revisore) Prodotto già nella posizione del passo: niente spostamento e la catena continua; dopo
  //     «Annulla» nella finestra del prezzo il capo si può rileggere e vendere; una valuta scritta con la virgola si
  //     legge giusta nella Scheda (non «NaN €»)
  await run('ese-gia-in-posizione', async (h) => {
    await salva(h, [auto('auto_vetrina', [SP,
      st('s2', 'move_to', { useLastScannedLocation: false, locationId: 'vetrina', locationName: 'Vetrina' }, 'Sposta in: Vetrina'),
      st('s3', 'add_tag', { tag: 'Visto' }, 'Aggiungi Tag: Visto'),
      st('s4', 'set_field', { fieldId: 'field_cmp_riparazione', fieldName: 'Costo riparazione', fieldValue: '12,5' }, 'Imposta Costo riparazione = 12,5'),
      st('s5', 'mark_sold', { pricePrompt: true }, 'Vendi (con conferma prezzo)')])]);
    await h.go('automations/custom-runner/auto_vetrina');
    await c.ultima(h, 'Scansiona Prodotto');
    const before = await timelineIds(h);
    await c.leggi(h, 'VIS-0142', { wait: 1500 }); // VIS-0142 è già in Vetrina
    const primaFinestra = (await prezzo(h).count()) > 0;
    if (primaFinestra) await h.click('Annulla');
    await c.leggi(h, 'VIS-0142', { wait: 1500 });
    const secondaFinestra = (await prezzo(h).count()) > 0;
    if (secondaFinestra) { await prezzo(h).first().fill('4000'); await h.click('CONFERMA'); await h.page.waitForTimeout(800); }
    const p = await c.prodotto(h, 'VIS-0142', 600);
    const costo = (p.customData || []).find((d) => d.fieldSnapshot?.id === 'field_cmp_riparazione');
    const ev = await newEvents(h, before, 0);
    await h.go(`product/${p.id}`);
    const scheda = await c.testo(h);
    const out = {
      primaFinestra, secondaFinestra, posizione: p.location, nota: (p.technicalNotes || '').endsWith('[Visto]'), costo: costo?.value ?? null,
      status: p.status, sellPrice: p.sellPrice, eventi: ev.map((e) => e.type), schedaCosto: scheda.includes('12,50 €'), schedaNaN: scheda.includes('NaN'),
    };
    const ok = primaFinestra && secondaFinestra && p.location === 'vetrina' && out.nota && out.costo === '12.5' && p.status === 'sold'
      && p.sellPrice === 4000 && !out.eventi.includes('moved') && out.schedaCosto && !out.schedaNaN;
    return { ok, ...out };
  });

  // 12. Eliminando una posizione usata da un passo «Sposta in» si avvisa; poi il passo si rifiuta (AU-V05)
  await run('ese-elimina-posizione', async (h) => {
    await h.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [LOC, OTTO]);
    await salva(h, [auto('auto_dep', [SP, st('s2', 'move_to', { useLastScannedLocation: false, locationId: 'deposito', locationName: 'Deposito' }, 'Sposta in: Deposito')], { name: 'Scarico Deposito' })]);
    const visti = [];
    h.page.on('dialog', (d) => visti.push(d.message().replace(/\s+/g, ' ')));
    await h.go('settings/locations');
    await h.page.locator('[tabindex="0"]').filter({ hasText: 'DepositoID:' }).first().locator('[tabindex="0"]').last().click();
    await h.page.waitForTimeout(800);
    const avviso = visti.find((m) => /Scarico Deposito/.test(m)) ?? null;
    const restanti = ((await h.store(LOC)) || []).map((l) => l.id);
    await h.go('automations/custom-runner/auto_dep');
    await c.ultima(h, 'Scansiona Prodotto');
    await c.leggi(h, 'PUZ-0012', { wait: 500 });
    const rifiuto = /La posizione di questo passo non esiste più/.test(await c.testo(h));
    const p = await c.prodotto(h, 'PUZ-0012', 600);
    const out = { avviso, depositoEliminato: !restanti.includes('deposito'), rifiuto, posizionePUZ: p.location };
    return { ok: !!avviso && out.depositoEliminato && rifiuto && p.location === 'stand_c', ...out };
  }, { dialogs: ['ok', 'ok'] });
})();
