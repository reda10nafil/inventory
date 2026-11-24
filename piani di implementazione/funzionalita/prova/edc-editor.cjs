// EDC (ticket 23): editor del campo in tre domande e lettura veloce. Campi creati dall'interfaccia e compilati in
// Aggiungi, come l'utente.
// - edc-testi-numeri: testo (scritto e col lettore), testo lungo, numero scritto, contatore col passo, ruota, prezzo,
//   Sì/No: forma salvata nel registro, valori salvati in Aggiungi, testi nella Scheda;
// - edc-scelte: una scelta per aspetto (riquadri, pillole scorrevoli, menu a tendina in linea, elenco dal basso) e più
//   scelte a pillole: id salvati, etichette nella Scheda;
// - edc-predefinito: testo, numero, Sì/No e scelta con il valore predefinito, salvati in Aggiungi senza toccarli; in
//   Modifica un prodotto di prima non li riceve;
// - edc-scelgo-o-scrivo: un valore scritto resta testo (nessuna opzione nuova), un nome già presente sceglie l'opzione,
//   «Aggiungi ai valori» con la conferma crea l'opzione (id nuovo, gli altri uguali) e il prodotto ne salva l'id;
// - edc-icona-colore: colore e icona di un'opzione, pillole, «Mostra nella card»: pallino nella Scheda, nella card e in
//   Aggiungi; un terzo campo nella card rifiutato;
// - edc-rinomina-icona (CAM-F6, CAM-F7): campo rinominato col nome nuovo nella Scheda di un prodotto non modificato,
//   icona del modulo uguale in Aggiungi e nella Scheda;
// - edc-ricerca: l'Inventario trova un prodotto per il valore di un campo (testo e scelta), non per l'id;
// - edc-cambio-tipo (CAM-F10): testo breve → lungo permesso con un valore salvato, verso numero rifiutato e spiegato;
// - edc-larghezza-ruota (punto 4): Larghezza Base con la ruota in Aggiungi e in Modifica;
// - edc-testi-semplici (CAM-F9): niente testi tecnici o in inglese nell'editor, «Passo» nel contatore, testo breve
//   fermo a 100 caratteri.
// Richieste dell'utente del 24 (orchestratore 5):
// - edc-binario: in Aggiungi Tipo di pelle, Posizione, Categoria e un campo a scelta nuovo sono un binario orizzontale
//   (una riga sola, `scrollWidth > clientWidth`);
// - edc-aspetto-base: aspetto di Posizione (menu a tendina) e di Tipo di pelle (ruota) scelto in Campi, salvato e
//   applicato in Aggiungi e in Modifica;
// - edc-gruppi: Campi Personalizzati raggruppati per tipo, col numero dei campi;
// - edc-ruota-scorre: la ruota si ferma da sola sul valore al centro dopo la rotella del mouse.
// Ogni scenario restituisce `ok` e i dettagli. Uso: node edc-editor.cjs [nome-scenario]
const { scenario } = require('./lib.cjs');
const { clickAt, skus } = require('./a1-util.cjs');
const v = require('./val-util.cjs');
const e = require('./edc-util.cjs');

const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const finestre = (page) => { const l = []; page.on('dialog', (d) => l.push(d.message().replace(/\n+/g, ' | '))); return l; };
const detto = (l, testo) => l.some((m) => m.includes(testo));
const BLU = 'rgb(59, 130, 246)';
const forma = (f) => f && { type: f.type, uiType: f.uiType, input: f.input, look: f.look, dataset: f.dataset, isBarcode: f.isBarcode, unit: f.unit };

(async () => {
  // 1. Testi e numeri: ogni modo di compilare, salvato e letto
  await run('edc-testi-numeri', async (h) => {
    const nota = await e.crea(h, { tipo: 'testo', nome: 'EDC Nota' });
    const codice = await e.crea(h, { tipo: 'testo', nome: 'EDC Codice', compila: 'Lo leggo col lettore o lo scrivo' });
    const storia = await e.crea(h, { tipo: 'testoLungo', nome: 'EDC Storia' });
    const spess = await e.crea(h, { tipo: 'numero', nome: 'EDC Spessore', unita: 'mm' });
    const strati = await e.crea(h, { tipo: 'numero', nome: 'EDC Strati', compila: 'Contatore + e −', limiti: { 'Minimo del contatore': '1', 'Massimo del contatore': '9', 'Passo del contatore': '2' } });
    const giro = await e.crea(h, { tipo: 'numero', nome: 'EDC Giro', unita: 'cm', compila: 'Ruota', limiti: { 'Da della ruota': '80', 'A della ruota': '120', 'Passo della ruota': '10' } });
    const costo = await e.crea(h, { tipo: 'prezzo', nome: 'EDC Costo' });
    const fodera = await e.crea(h, { tipo: 'sino', nome: 'EDC Fodera' });
    await e.prepara(h);
    await v.scrivi(h, 'EDC Nota', 'Nota di prova');
    await v.scrivi(h, 'EDC Codice', 'COD-123');
    await h.page.locator('xpath=//div[normalize-space()="EDC Storia"]/following-sibling::div[1]//textarea').locator('visible=true').first().fill('Riga uno\nRiga due');
    await v.scrivi(h, 'EDC Spessore', '2,5');
    const stratiPrima = await v.contatore(h.page, 'EDC Strati');
    await e.visibile(h, '[aria-label="Aumenta EDC Strati"]').click(); await e.visibile(h, '[aria-label="Aumenta EDC Strati"]').click();
    const stratiDopo = await v.contatore(h.page, 'EDC Strati');
    await e.apriRuota(h, 'EDC Giro'); // a 1/2: campo che apre la ruota in una finestra dal basso (R3 di UX0)
    const valoriRuota = await h.page.locator('[aria-label^="EDC Giro "]').locator('visible=true').count();
    await e.visibile(h, '[aria-label="EDC Giro 100 cm"]').click(); await h.page.waitForTimeout(400);
    await h.click('Fatto');
    await v.scrivi(h, 'EDC Costo', '12,50');
    await e.visibile(h, '[aria-label="EDC Fodera: No"]').click();
    const p = await e.salvaNuovo(h);
    const salvati = Object.fromEntries([nota, codice, storia, spess, strati, giro, costo, fodera].map((f) => [f.name, v.valore(p, f.id)]));
    const scheda = await v.scheda(h, p.id, [['EDC Spessore', 6], ['EDC Strati', 2], ['EDC Giro', 6], ['EDC Costo', 7], ['EDC Fodera', 2], ['EDC Codice', 7]]);
    const out = {
      forme: { codice: forma(codice), strati: forma(strati), giro: forma(giro), fodera: forma(fodera), storia: forma(storia) },
      contatore: [stratiPrima, stratiDopo], valoriRuota, salvati, scheda,
    };
    const ok = codice.isBarcode === true && strati.uiType === 'stepper' && JSON.stringify(strati.dataset) === '{"min":1,"max":9,"step":2}'
      && giro.input === 'wheel' && giro.uiType === 'text' && fodera.type === 'boolean' && storia.type === 'text_long'
      && stratiPrima === '1' && stratiDopo === '5' && valoriRuota === 6 // 5 valori più «–» (nessuno)
      && JSON.stringify(salvati) === JSON.stringify({ 'EDC Nota': 'Nota di prova', 'EDC Codice': 'COD-123', 'EDC Storia': 'Riga uno\nRiga due', 'EDC Spessore': 2.5, 'EDC Strati': 5, 'EDC Giro': 100, 'EDC Costo': 12.5, 'EDC Fodera': false })
      && scheda['EDC Spessore'] === '2,5 mm' && scheda['EDC Strati'] === '5' && scheda['EDC Giro'] === '100 cm' && scheda['EDC Costo'] === '12,50 €' && scheda['EDC Fodera'] === 'No';
    return { ok, ...out };
  }, { dialogs: [] });

  // 2. Scelte: un campo per aspetto, compilato in Aggiungi
  await run('edc-scelte', async (h) => {
    const riq = await e.crea(h, { tipo: 'scelta', nome: 'EDC Taglio', valori: ['Taglio dritto', 'Taglio sbieco'], aspetto: 'Riquadri' });
    const pil = await e.crea(h, { tipo: 'scelta', nome: 'EDC Tinta', valori: ['Tinta chiara', 'Tinta scura'] }); // binario: predefinito
    const cap = await e.crea(h, { tipo: 'scelta', nome: 'EDC Bordo', valori: ['Bordo liscio', 'Bordo frangiato'], aspetto: 'A capo' });
    const ver = await e.crea(h, { tipo: 'scelta', nome: 'EDC Lucido', valori: ['Lucido pieno', 'Lucido opaco'], aspetto: 'Elenco verticale' });
    const ruo = await e.crea(h, { tipo: 'scelta', nome: 'EDC Pellame', valori: ['Pellame primo', 'Pellame secondo', 'Pellame terzo'], aspetto: 'Ruota' });
    const ten = await e.crea(h, { tipo: 'scelta', nome: 'EDC Stagione', valori: ['Inverno EDC', 'Estate EDC'], aspetto: 'Menu a tendina' });
    const ele = await e.crea(h, { tipo: 'scelta', nome: 'EDC Pelo', valori: ['Pelo corto', 'Pelo lungo'], aspetto: 'Elenco dal basso' });
    const piu = await e.crea(h, { tipo: 'scelte', nome: 'EDC Extra', valori: ['Extra cappuccio', 'Extra cintura', 'Extra tasche'], aspetto: 'Binario orizzontale' });
    await e.prepara(h);
    await h.click('Taglio sbieco');
    await h.click('Tinta scura');
    // tendina in linea: si apre sotto la casella, senza finestra
    await e.visibile(h, '[aria-label="EDC Stagione: Seleziona..."]').click(); await h.page.waitForTimeout(400);
    const tendinaAperta = await h.has('Estate EDC', true);
    const finestraTendina = await h.page.locator('[aria-modal="true"]').count();
    await h.click('Estate EDC');
    const tendinaChiusa = !(await h.has('Inverno EDC', true));
    await e.apriScelte(h, 'EDC Pelo');
    await h.click('Pelo lungo');
    await h.click('Extra cappuccio'); await h.click('Extra tasche');
    await h.click('Bordo frangiato');
    await h.click('Lucido opaco');
    await h.click('Pellame terzo'); // a 1/2 la ruota è una tendina (R1 di UX0)
    const p = await e.salvaNuovo(h);
    const id = (f, l) => (f.options || []).find((o) => o.label === l).id;
    const salvati = {
      riq: v.valore(p, riq.id), pil: v.valore(p, pil.id), ten: v.valore(p, ten.id), ele: v.valore(p, ele.id), piu: v.valore(p, piu.id),
      cap: v.valore(p, cap.id), ver: v.valore(p, ver.id), ruo: v.valore(p, ruo.id),
    };
    const scheda = await v.scheda(h, p.id, [['EDC Taglio', 13], ['EDC Tinta', 11], ['EDC Stagione', 10], ['EDC Pelo', 10], ['EDC Extra', 32]]);
    const out = { forme: [riq, pil, ten, ele, piu, cap, ver, ruo].map((f) => `${f.name}:${f.uiType}:${f.look || '-'}`), tendinaAperta, finestraTendina, tendinaChiusa, salvati, scheda };
    const ok = out.forme.join() === 'EDC Taglio:grid:-,EDC Tinta:grid:chips,EDC Stagione:picker:dropdown,EDC Pelo:picker:-,EDC Extra:grid:chips,EDC Bordo:grid:wrap,EDC Lucido:grid:list,EDC Pellame:picker:wheel'
      && salvati.cap === id(cap, 'Bordo frangiato') && salvati.ver === id(ver, 'Lucido opaco') && salvati.ruo === id(ruo, 'Pellame terzo')
      && tendinaAperta && tendinaChiusa
      && salvati.riq === id(riq, 'Taglio sbieco') && salvati.pil === id(pil, 'Tinta scura') && salvati.ten === id(ten, 'Estate EDC')
      && salvati.ele === id(ele, 'Pelo lungo') && JSON.stringify(salvati.piu) === JSON.stringify([id(piu, 'Extra cappuccio'), id(piu, 'Extra tasche')])
      && scheda['EDC Taglio'] === 'Taglio sbieco' && scheda['EDC Tinta'] === 'Tinta scura' && scheda['EDC Stagione'] === 'Estate EDC'
      && scheda['EDC Pelo'] === 'Pelo lungo' && /^Extra cappuccio Extra tasche/.test(scheda['EDC Extra']);
    return { ok, ...out };
  });

  // 3. Valore predefinito: in Aggiungi si salva senza toccarlo; in Modifica un prodotto di prima non lo riceve
  await run('edc-predefinito', async (h) => {
    const t = await e.crea(h, { tipo: 'testo', nome: 'EDC Laboratorio', predefinito: 'Pellicceria Bianchi' });
    const n = await e.crea(h, { tipo: 'numero', nome: 'EDC Pelli', predefinito: '2,5' });
    const b = await e.crea(h, { tipo: 'sino', nome: 'EDC Etichettato', predefinito: '=Sì' });
    const c = await e.crea(h, { tipo: 'scelta', nome: 'EDC Finitura', valori: ['Finitura lucida', 'Finitura opaca'], predefinito: '=Finitura opaca' });
    await e.prepara(h);
    const mostrato = {
      testo: await h.page.locator('xpath=//div[normalize-space()="EDC Laboratorio"]/following-sibling::div[1]//input').locator('visible=true').first().inputValue(),
      numero: await h.page.locator('xpath=//div[normalize-space()="EDC Pelli"]/following-sibling::div[1]//input').locator('visible=true').first().inputValue(),
    };
    const p = await e.salvaNuovo(h);
    const salvati = { testo: v.valore(p, t.id), numero: v.valore(p, n.id), sino: v.valore(p, b.id), scelta: v.valore(p, c.id) };
    const prima = (await h.products(0)).find((x) => x.id === 'cmp-1');
    await v.openEdit(h, 'VIS-0142');
    await e.salvaModifica(h);
    const dopo = (await h.products()).find((x) => x.id === 'cmp-1');
    const nuoviInModifica = (dopo.customData || []).filter((d) => [t.id, n.id, b.id, c.id].includes(d.fieldSnapshot.id)).length;
    const out = {
      registro: { testo: t.defaultValue, numero: n.defaultValue, sino: b.defaultValue, scelta: c.defaultValue === (c.options || [])[1]?.id },
      mostrato, salvati, nuoviInModifica, customDataUguale: JSON.stringify(dopo.customData) === JSON.stringify(prima.customData),
    };
    const ok = t.defaultValue === 'Pellicceria Bianchi' && n.defaultValue === 2.5 && b.defaultValue === true && out.registro.scelta
      && mostrato.testo === 'Pellicceria Bianchi' && mostrato.numero === '2,5'
      && salvati.testo === 'Pellicceria Bianchi' && salvati.numero === 2.5 && salvati.sino === true && salvati.scelta === c.options[1].id
      && nuoviInModifica === 0 && out.customDataUguale;
    return { ok, ...out };
  });

  // 4. «Scelgo o scrivo» su Colore (campionario): il valore nuovo diventa un'opzione solo dopo la conferma
  await run('edc-scelgo-o-scrivo', async (h) => {
    const f = finestre(h.page);
    await v.matita(h, 'Colore');
    await h.click('Scelgo o scrivo');
    await h.click('Aggiorna');
    const colore = await e.campo(h, 'Colore');
    const altro = '[aria-label="Altro valore di Colore"]';
    // a. scritto e non confermato: resta testo
    await e.prepara(h);
    await e.visibile(h, altro).fill('Blu notte');
    const proposta = await h.has('Aggiungi «Blu notte» ai valori', true);
    const p1 = await e.salvaNuovo(h);
    const dopoUno = await e.campo(h, 'Colore', 0);
    // b. nome già presente (maiuscole diverse): sceglie l'opzione
    await e.prepara(h);
    await e.visibile(h, altro).fill('grigio PERLA');
    const p2 = await e.salvaNuovo(h);
    // c. nuovo e confermato: opzione nuova, il prodotto ne salva l'id
    await e.prepara(h);
    await e.visibile(h, altro).fill('Verde bosco');
    await e.visibile(h, '[aria-label="Aggiungi Verde bosco ai valori di Colore"]').click(); await h.page.waitForTimeout(800);
    const p3 = await e.salvaNuovo(h);
    const dopo = await e.campo(h, 'Colore', 0);
    const nuova = (dopo.options || []).find((o) => o.label === 'Verde bosco');
    const scheda = await v.scheda(h, p3.id, [['Colore', 11]]);
    const scheda1 = await v.scheda(h, p1.id, [['Colore', 9]]);
    const out = {
      input: colore.input, proposta, v1: v.valore(p1, colore.id), opzioniDopoUno: (dopoUno.options || []).length,
      v2: v.valore(p2, colore.id), idPrima: (colore.options || []).map((o) => o.id), idDopo: (dopo.options || []).map((o) => o.id),
      nuova: nuova && nuova.id !== `opt_${(colore.options || []).length}` && /^opt_\d{12,}_/.test(nuova.id), v3giusto: !!nuova && v.valore(p3, colore.id) === nuova.id,
      scheda: scheda.Colore, scheda1: scheda1.Colore, conferma: detto(f, 'Aggiungere «Verde bosco» ai valori di «Colore»?'),
    };
    const ok = out.input === 'choose_or_write' && proposta && out.v1 === 'Blu notte' && out.opzioniDopoUno === 5 && out.v2 === 'opt_2'
      && JSON.stringify(out.idDopo.slice(0, 5)) === JSON.stringify(out.idPrima) && out.idDopo.length === 6 && out.nuova && out.v3giusto
      && out.scheda === 'Verde bosco' && out.scheda1 === 'Blu notte' && out.conferma;
    return { ok, ...out };
  });

  // 5. Colore e icona di un'opzione, pillole, card (al massimo 2 campi)
  await run('edc-icona-colore', async (h) => {
    const f = finestre(h.page);
    await v.matita(h, 'Colore');
    await e.visibile(h, '[aria-label="Rinomina Grigio perla"]').click(); await h.page.waitForTimeout(300);
    await e.visibile(h, '[aria-label="Colore Blu"]').click();
    await e.visibile(h, '[aria-label="Icona star"]').click();
    await h.click('Binario orizzontale');
    await h.click('Mostra nella card dell\'Inventario');
    await h.click('Aggiorna');
    const colore = await e.campo(h, 'Colore');
    await v.matita(h, 'Fornitore');
    await h.click('Mostra nella card dell\'Inventario');
    await h.click('Aggiorna');
    await v.matita(h, 'Taglia');
    await h.click('Mostra nella card dell\'Inventario');
    const rifiuto = detto(f, 'Nella card ci stanno al massimo 2 campi');
    await h.click('Aggiorna');
    const registro = (await h.store(v.CF)).filter((x) => x.showInCard).map((x) => x.name);
    await h.go('product/cmp-1');
    await h.page.getByText('Campi strutturati', { exact: true }).locator('visible=true').first().waitFor().catch(() => {});
    const scheda = await e.puntoColore(h.page, 'Grigio perla', BLU);
    await h.go('');
    await h.page.getByText('VIS-0142', { exact: true }).first().waitFor();
    const cardVis = await e.card(h.page, 'VIS-0142');
    const cardVol = await e.card(h.page, 'VOL-0087');
    const puntoCard = await e.puntoColore(h.page, 'Grigio perla', BLU);
    await e.prepara(h);
    await e.visibile(h, '[aria-label="Colore: Seleziona..."]').click(); await h.page.waitForTimeout(400);
    const pilloleAggiungi = await e.puntoColore(h.page, 'Grigio perla', BLU);
    const out = {
      opzione: (colore.options || []).find((o) => o.label === 'Grigio perla'), look: colore.look, uiType: colore.uiType, registro, rifiuto,
      scheda, cardVis, cardVol, puntoCard, pilloleAggiungi,
    };
    // pillole: `uiType` diventa `grid` (l'aspetto vecchio più vicino, per tornare indietro), `look` dice le pillole
    const ok = out.opzione.color === '#3B82F6' && out.opzione.icon === 'star' && out.look === 'chips' && out.uiType === 'grid'
      && registro.join() === 'Fornitore,Colore' && rifiuto && scheda && puntoCard && pilloleAggiungi
      && /Grigio perla/.test(cardVis) && /Pellicceria Bianchi/.test(cardVis) && /Naturale/.test(cardVol);
    return { ok, ...out };
  });

  // 6. CAM-F6 e CAM-F7: nome dal registro e icona del modulo nella Scheda di un prodotto non modificato
  await run('edc-rinomina-icona', async (h) => {
    const prima = (await h.products(0)).find((x) => x.id === 'cmp-1');
    await v.matita(h, 'Fornitore');
    await h.page.getByPlaceholder(e.NOME_PH).locator('visible=true').first().fill('Fornitore principale');
    await h.click('Aggiorna');
    await h.go('settings/layout-builder');
    await h.click('Fornitore principale');
    await h.page.locator('xpath=//div[normalize-space()="Icona:"]/following-sibling::div[1]//div[@tabindex="0"]').first().click();
    await h.page.waitForTimeout(400);
    await h.click('Salva Layout');
    const glifo = (where) => h.page.evaluate(([n, w]) => {
      const el = [...document.querySelectorAll('div')].find((d) => d.offsetParent && (d.innerText || '').trim() === n && d.children.length === 0);
      if (!el) return null;
      const box = w === 'add' ? el.parentElement : el.parentElement.parentElement;
      const icon = [...box.querySelectorAll('div,span')].find((s) => s.children.length === 0 && /[-\u{F0000}-\u{FFFFD}]/u.test(s.textContent || ''));
      return icon ? icon.textContent.codePointAt(0).toString(16) : null;
    }, ['Fornitore principale', where]);
    await h.go('add');
    const iconaAggiungi = await glifo('add');
    const scheda = await v.scheda(h, 'cmp-1', [['Fornitore principale', 27]]);
    const iconaScheda = await glifo('scheda');
    const dopo = (await h.products(0)).find((x) => x.id === 'cmp-1');
    const out = { scheda: scheda['Fornitore principale'], iconaAggiungi, iconaScheda, prodottoUguale: JSON.stringify(dopo) === JSON.stringify(prima) };
    const ok = out.scheda === 'Pellicceria Bianchi, Milano' && !!iconaAggiungi && iconaAggiungi === iconaScheda && out.prodottoUguale;
    return { ok, ...out };
  });

  // 7. Ricerca dell'Inventario per il valore di un campo
  await run('edc-ricerca', async (h) => {
    await clickAt(h.page, 337, 43); // lente
    const box = h.page.getByPlaceholder('Cerca SKU', { exact: false });
    const out = {};
    for (const q of ['Pellicceria', 'grigio perla', 'CITES-2026', 'opt_2', 'Naturale']) {
      await box.fill(q); await h.page.waitForTimeout(500);
      out[q] = await skus(h.page);
    }
    const ok = out.Pellicceria.join() === 'VIS-0142' && out['grigio perla'].join() === 'VIS-0142' && out['CITES-2026'].join() === 'VIS-0142'
      && out.opt_2.length === 0 && out.Naturale.join() === 'VOL-0087';
    return { ok, ...out };
  });

  // 8. CAM-F10: cambio di tipo con un valore salvato
  await run('edc-cambio-tipo', async (h) => {
    await v.matita(h, 'Fornitore');
    await h.click('Cambia tipo');
    const spiegato = await h.has('si leggerebbe in un altro modo', false);
    const numeroBloccato = await h.page.getByText('Con l\'unità che vuoi: cm, kg, pezzi', { exact: true }).count() === 0;
    await h.click('Note su più righe');
    const avviso = await h.has('Era Testo breve', false);
    await h.click('Aggiorna');
    const fornitore = await e.campo(h, 'Fornitore');
    await v.matita(h, 'Spessore');
    await h.click('Cambia tipo');
    await h.click('Prezzi e costi in euro');
    await h.click('Aggiorna');
    const spessore = await e.campo(h, 'Spessore');
    const scheda = await v.scheda(h, 'cmp-1', [['Fornitore', 27], ['Spessore', 3]]);
    const vis = (await h.products(0)).find((x) => x.id === 'cmp-1');
    const out = {
      spiegato, numeroBloccato, avviso, fornitore: forma(fornitore), spessore: forma(spessore), scheda,
      valoriUguali: v.valore(vis, 'field_cmp_fornitore') === 'Pellicceria Bianchi, Milano' && v.valore(vis, 'field_cmp_spessore') === '3',
    };
    // da numero a prezzo l'unità «mm» non resta (il prezzo è in euro)
    const ok = spiegato && numeroBloccato && avviso && fornitore.type === 'text_long' && !fornitore.isBarcode && spessore.type === 'currency' && !spessore.unit
      && scheda.Fornitore === 'Pellicceria Bianchi, Milano' && scheda.Spessore === '3 €' && out.valoriUguali;
    return { ok, ...out };
  });

  // 9. Punto 4: Larghezza Base con la ruota (da 40 a 120, passo 10) in Aggiungi e in Modifica
  await run('edc-larghezza-ruota', async (h) => {
    await h.go('settings/fields');
    await e.visibile(h, '[aria-label="Come si compila Larghezza"]').click(); await h.page.waitForTimeout(500);
    await h.click('Ruota');
    await e.visibile(h, '[aria-label="Da della ruota"]').fill('40');
    await e.visibile(h, '[aria-label="A della ruota"]').fill('120');
    await e.visibile(h, '[aria-label="Passo della ruota"]').fill('10');
    await h.click('Aggiorna');
    const larghezza = (await h.store(v.CF)).find((x) => x.id === 'width');
    await e.prepara(h);
    const campoVuoto = await h.page.locator('[aria-label="Larghezza: nessun valore"]').locator('visible=true').count();
    await e.apriRuota(h, 'Larghezza');
    const valori = await h.page.locator('[aria-label^="Larghezza "]').locator('visible=true').count();
    await e.visibile(h, '[aria-label="Larghezza 90 cm"]').click(); await h.page.waitForTimeout(400);
    await h.click('Fatto');
    const campoDopo = await h.page.locator('[aria-label="Larghezza: 90 cm"]').locator('visible=true').count();
    const p = await e.salvaNuovo(h);
    await v.openEdit(h, 'VIS-0142');
    const acceso = { sessanta: await h.page.locator('[aria-label="Larghezza: 60 cm"]').locator('visible=true').count(), settanta: 0 };
    await e.ruota(h, 'Larghezza', '70 cm');
    acceso.settanta = await h.page.locator('[aria-label="Larghezza: 70 cm"]').locator('visible=true').count();
    await e.salvaModifica(h);
    const vis = (await h.products()).find((x) => x.id === 'cmp-1');
    const out = { forma: forma(larghezza), campoVuoto, valori, campoDopo, nuovo: p.width, modifica: acceso, vis: vis.width };
    const ok = larghezza.input === 'wheel' && JSON.stringify(larghezza.dataset) === '{"min":40,"max":120,"step":10}' && valori === 10 // 9 più «–»
      && campoVuoto === 1 && campoDopo === 1 && p.width === 90 && acceso.sessanta === 1 && acceso.settanta === 1 && vis.width === 70;
    return { ok, ...out };
  });

  // 10. CAM-F9: testi in italiano semplice, passo del contatore, testo breve fermo a 100
  await run('edc-testi-semplici', async (h) => {
    const PAROLE = ['Field Builder', '(UI:', 'GRID', 'SEGMENTED', 'PICKER', 'MODAL_LIST', 'STEPPER', 'Intelligenza Avanzata', 'Dropdown', 'Aspetto UI', 'Contatore UI', 'Dataset', 'Libreria', 'Immutabilità'];
    const testo = () => h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    await h.go('settings/fields');
    const visti = [await testo()];
    await h.click('Crea Nuovo Campo');
    visti.push(await testo());
    await h.click(e.TIPI.scelta);
    visti.push(await testo());
    await h.click('Cambia');
    await h.click(e.TIPI.numero);
    await h.click('Contatore + e −');
    const conPasso = await h.page.locator('[aria-label="Passo del contatore"]').count() > 0;
    visti.push(await testo());
    const tutto = visti.join(' ');
    await e.prepara(h);
    await v.scrivi(h, 'Fornitore', 'A'.repeat(150));
    const nelCampo = (await h.page.locator('xpath=//div[normalize-space()="Fornitore"]/following-sibling::div[1]//input').locator('visible=true').first().inputValue()).length;
    const p = await e.salvaNuovo(h);
    const out = { trovate: PAROLE.filter((w) => tutto.includes(w)), conPasso, nelCampo, salvati: String(v.valore(p, 'field_cmp_fornitore') || '').length };
    const ok = out.trovate.length === 0 && conPasso && nelCampo === 100 && out.salvati === 100;
    return { ok, ...out };
  });

  // 11. Binario orizzontale (richiesta del 24, R1 di UX0): solo a larghezza intera, una riga sola che scorre, con la
  // spunta sulla scelta che entra in vista all'apertura; in una colonna (Posizione e Categoria a 1/2 nel campionario, un
  // campo nuovo a 1/2) è una tendina, mai un binario stretto né pillole a capo
  await run('edc-binario', async (h) => {
    await e.crea(h, { tipo: 'scelta', nome: 'EDC Finiture', valori: ['Finitura uno', 'Finitura due', 'Finitura tre', 'Finitura quattro', 'Finitura cinque'] });
    const finiture = await e.campo(h, 'EDC Finiture', 0);
    const binari = (page) => page.evaluate(() => Object.fromEntries(['Scelte di Tipo di pelle', 'Scelte di Posizione', 'Categorie', 'Scelte di EDC Finiture'].map((l) => {
      const el = [...document.querySelectorAll(`[aria-label="${l}"]`)].find((x) => x.offsetParent);
      if (!el) return [l, null];
      const tops = new Set([...el.querySelectorAll('[tabindex="0"]')].map((b) => Math.round(b.getBoundingClientRect().top)));
      return [l, { scorre: el.scrollWidth > el.clientWidth, righe: tops.size, larghezza: Math.round(el.getBoundingClientRect().width) }];
    })));
    const tendine = (page) => page.evaluate(() => ['Posizione', 'Categoria', 'EDC Finiture'].filter((n) => [...document.querySelectorAll('[aria-expanded]')]
      .some((x) => x.offsetParent && (x.getAttribute('aria-label') || '').startsWith(`${n}: `))));
    await h.go('add');
    const inColonna = { binari: await binari(h.page), tendine: await tendine(h.page) };
    // Posizione, Categoria ed EDC Finiture a tutta larghezza nel modulo
    await h.page.evaluate((id) => {
      const k = 'furinventory_layout_config:local';
      const l = JSON.parse(localStorage.getItem(k));
      for (const f of l.fields) if (['location', 'folder', id].includes(f.id)) f.size = 'full';
      localStorage.setItem(k, JSON.stringify(l));
    }, finiture.id);
    await h.go('add');
    const intera = { binari: await binari(h.page), tendine: await tendine(h.page) };
    // La scelta entra in vista: VIS-0142 in «Stand C» (in fondo al binario delle posizioni), Modifica a larghezza intera
    await h.page.evaluate(() => {
      const k = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(k));
      list.find((p) => p.sku === 'VIS-0142').location = 'stand_c';
      localStorage.setItem(k, JSON.stringify(list));
    });
    await v.openEdit(h, 'VIS-0142');
    const inVista = await h.page.evaluate(() => {
      const rail = [...document.querySelectorAll('[aria-label="Scelte di Posizione"]')].find((x) => x.offsetParent);
      const pill = rail && [...rail.querySelectorAll('[tabindex="0"]')].find((b) => (b.innerText || '').includes('Stand C'));
      if (!pill) return null;
      const r = rail.getBoundingClientRect(); const p = pill.getBoundingClientRect();
      return { dentro: p.left >= r.left - 1 && p.right <= r.right + 1, spunta: /[\uE000-\uF8FF]/.test(pill.innerText), altezza: Math.round(p.height) };
    });
    const out = { look: finiture.look, inColonna, intera, inVista };
    const ok = finiture.look === 'chips'
      && Object.values(inColonna.binari).filter(Boolean).length === 1 && !!inColonna.binari['Scelte di Tipo di pelle']
      && inColonna.tendine.join() === 'Posizione,Categoria,EDC Finiture'
      && Object.values(intera.binari).every((b) => b && b.scorre && b.righe === 1 && b.larghezza >= 300) && intera.tendine.length === 0
      && inVista && inVista.dentro && inVista.spunta && inVista.altezza === 36;
    return { ok, ...out };
  });

  // 12. Aspetto di Posizione (menu a tendina) e di Tipo di pelle (ruota) scelto in Campi, applicato in Aggiungi e Modifica
  await run('edc-aspetto-base', async (h) => {
    await h.go('settings/fields');
    await e.visibile(h, '[aria-label="Come si vede Posizione"]').click(); await h.page.waitForTimeout(500);
    await h.click('Menu a tendina');
    await h.click('Aggiorna');
    await e.visibile(h, '[aria-label="Modifica i valori di Tipo di pelle"]').click(); await h.page.waitForTimeout(500);
    await e.visibile(h, '[aria-label="Tipo di pelle: Ruota"]').click(); await h.page.waitForTimeout(600);
    const registro = Object.fromEntries((await h.store(v.CF)).filter((f) => ['location', 'furType'].includes(f.id)).map((f) => [f.id, f.look]));
    await h.go('add');
    const ruota = await h.page.locator('[aria-label="Ruota Tipo di pelle"]').locator('visible=true').count();
    await e.visibile(h, '[aria-label="Tipo di pelle Volpe"]').click(); await h.page.waitForTimeout(600);
    await e.visibile(h, '[aria-label="Posizione: Seleziona..."]').click(); await h.page.waitForTimeout(300);
    await h.click('Sartoria');
    await h.click('M');
    const p = await e.salvaNuovo(h);
    await v.openEdit(h, 'VIS-0142');
    const modifica = {
      ruota: await h.page.locator('[aria-label="Ruota Tipo di pelle"]').locator('visible=true').count(),
      tendina: await h.page.locator('[aria-label="Posizione: Vetrina"]').locator('visible=true').count(),
    };
    const out = { registro, ruota, nuovo: { furType: p.furType, location: p.location }, modifica };
    const ok = registro.location === 'dropdown' && registro.furType === 'wheel' && ruota === 1 && p.furType === 'volpe' && p.location === 'sartoria'
      && modifica.ruota === 1 && modifica.tendina === 1;
    return { ok, ...out };
  });

  // 13. Campi Personalizzati raggruppati per tipo, col numero dei campi
  await run('edc-gruppi', async (h) => {
    await e.crea(h, { tipo: 'sino', nome: 'EDC Restaurato' });
    await h.go('settings/fields');
    const gruppi = await h.page.evaluate(() => [...document.querySelectorAll('[aria-label^="Gruppo "]')].filter((g) => g.offsetParent)
      .map((g) => (g.innerText || '').split('\n')[0].trim()));
    const nelGruppo = await h.page.evaluate(() => {
      const g = [...document.querySelectorAll('[aria-label="Gruppo Sì/No"]')].find((x) => x.offsetParent);
      return g ? g.innerText.includes('EDC Restaurato') : false;
    });
    const ok = gruppi.join() === 'Testo breve (3),Testo lungo (2),Numero (1),Misura (4),Valuta (3),Data (1),Scelta (10),Sì/No (1),Immagini (2),Documenti (1)' && nelGruppo;
    return { ok, gruppi, nelGruppo };
  });

  // 14. La ruota si ferma da sola sul valore al centro (rotella del mouse), senza toccare un valore
  await run('edc-ruota-scorre', async (h) => {
    await h.go('settings/fields');
    await e.visibile(h, '[aria-label="Come si compila Larghezza"]').click(); await h.page.waitForTimeout(500);
    await h.click('Ruota');
    await e.visibile(h, '[aria-label="Da della ruota"]').fill('40');
    await e.visibile(h, '[aria-label="A della ruota"]').fill('120');
    await e.visibile(h, '[aria-label="Passo della ruota"]').fill('10');
    await h.click('Aggiorna');
    await e.prepara(h);
    await e.apriRuota(h, 'Larghezza');
    const ruota = h.page.locator('[aria-label="Ruota Larghezza"]').locator('visible=true').first();
    const box = await ruota.boundingBox();
    await h.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await h.page.mouse.wheel(0, 36 * 3 + 12); // tre scatti e un po': «–», 40, 50, 60 → si ferma su 60
    await h.page.waitForTimeout(1000);
    const nellaFascia = await h.page.evaluate(() => {
      const w = [...document.querySelectorAll('[aria-label="Ruota Larghezza"]')].find((x) => x.offsetParent);
      const r = w.getBoundingClientRect(); const mid = r.top + r.height / 2;
      const row = [...w.querySelectorAll('[aria-label^="Larghezza "]')].find((x) => { const b = x.getBoundingClientRect(); return b.top <= mid && b.bottom >= mid; });
      return row ? row.getAttribute('aria-label') : null;
    });
    await h.click('Fatto');
    const p = await e.salvaNuovo(h);
    const ok = p.width === 60 && nellaFascia === 'Larghezza 60 cm';
    return { ok, larghezza: p.width, nellaFascia };
  });
})();
