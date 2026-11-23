// COD (ticket 22 e 29): lettore unico dei codici (`utils/codes.ts`) e codici che non si rovinano. Segue il piano di
// verifica del ticket 22 (riga «COD»):
// - il link GS1 di VIS-0142 (anche con un altro dominio, con `?10=` o con il lotto nel percorso), lo SKU in minuscolo,
//   i codici di posizione, scaffale (anche dal tag NFC, UID senza «:»), categoria e automazione dallo Scanner a mano;
// - la lettura della fotocamera registra «scansionato» come quella a mano (P26);
// - il link e lo SKU in minuscolo nelle 5 automazioni (Vendita flash, Tagging, Spostamento rapido, Audit, Esecuzione),
//   con «Scrivi il codice» del lettore (`BarcodeScanner`) e con la lettura simulata;
// - il codice di uno scaffale in «Scansiona Posizione» e nello Spostamento rapido (AU-V14);
// - un prodotto nel cestino rifiutato dallo Scanner e dalle 5 automazioni, senza toccarne i dati;
// - NG24 rifatto passo per passo (Posizioni e Categorie) → nessun doppione; NG25: codice già usato rifiutato;
//   doppioni già salvati: lo Scanner chiede quale, la Modifica di un altro campo si salva con l'avviso;
// - Modifica di un prodotto senza link → resta senza (NG02); lotto acceso o SKU cambiato → link invariato (NG27) e il
//   link vecchio apre ancora il prodotto.
// Su HEAD (prima di COD) «Scrivi il codice» non c'è: `leggi` usa la lettura simulata e gli scenari restano rossi.
// Ogni scenario dice `ok` e i valori letti dallo stato salvato.
// Uso dalla cartella prova/: SHOTS=<cartella> node cod-lettore.cjs [parte del nome di uno scenario]
const { scenario } = require('./lib.cjs');
const { scan, iconAt } = require('./a3-util.cjs');
const { press } = require('./a1-util.cjs');
const { LOC, LK, LOCATIONS, prepara, leggi, aMano, aperto, prodotto, eventi, ultima, testo } = require('./cod-util.cjs');

const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const OK = Array(30).fill('ok');

// Audit: contatori e pulsante tondo del lettore (come a3-audit.cjs)
const stats = (h) => h.page.evaluate(() => {
  const t = document.body.innerText;
  const n = (k) => t.match(new RegExp(`${k}:\\s*(\\d+)`))?.[1];
  return { trovati: n('Trovati'), mancanti: n('Mancanti'), intrusi: n('Intrusi') };
});
async function fab(h) {
  const list = await iconAt(h);
  const b = list.sort((a, c) => c.y - a.y)[0];
  await h.page.mouse.click(b.x, b.y);
  await h.page.waitForTimeout(700);
}
// Messaggi delle finestre del browser, registrati dalla prova (lib.cjs risponde)
const finestre = (h) => { const list = []; h.page.on('dialog', (d) => list.push(d.message().replace(/\n+/g, ' | '))); return list; };
const salvaModifica = async (h) => { await h.click('Salva Modifiche'); await h.page.waitForTimeout(1200); };
const apriModifica = async (h, sku) => { await h.click(sku); await h.page.waitForTimeout(800); await press(h.page, /^.?\s*Modifica$/); await h.page.waitForTimeout(1200); };

(async () => {
  // 1. Scanner a mano: tutti i formati e tutte le cose (NG01, V07, resti di S1a)
  await run('cod-scanner-mano', async (h) => {
    await prepara(h);
    const link = (await prodotto(h, 'VIS-0142')).gs1DigitalLink;
    const codici = {
      link,
      minuscolo: 'vis-0142',
      altroDominio: 'https://esempio.it/negozio/01/VIS-0142/21/000142',
      lottoQuery: `${link}?10=Pellicceria%20Bianchi%2C%20Milano`,
      lottoPercorso: 'https://syncroflow.app/id/01/VIS-0142/10/L1/21/000142',
      posizione: 'loc-magazzino',
      idPosizione: 'stand_a',
      scaffale: 'scaf-mag-a1',
      tagScaffale: '04A23B1C',
      categoria: 'LIB-PELLICCE',
      automazione: 'AUTO:auto_tag',
      sconosciuto: 'XYZ-9999',
    };
    const atteso = {
      link: 'prodotto VIS-0142', minuscolo: 'prodotto VIS-0142', altroDominio: 'prodotto VIS-0142', lottoQuery: 'prodotto VIS-0142',
      lottoPercorso: 'prodotto VIS-0142', posizione: 'posizione Magazzino', idPosizione: 'posizione Stand A', scaffale: 'scaffale A1',
      tagScaffale: 'scaffale A1', categoria: 'categoria Pellicce', automazione: 'esecuzione auto_tag', sconosciuto: 'niente',
    };
    const visti = finestre(h);
    const out = {};
    for (const [k, c] of Object.entries(codici)) { await aMano(h, c); out[k] = await aperto(h); }
    const scansionati = (await eventi(h, 'cmp-1', 'scanned', 800)).length;
    const sconosciutoDetto = visti.some((m) => /^Codice Non Riconosciuto/.test(m) && m.includes('XYZ-9999'));
    const diversi = Object.keys(atteso).filter((k) => out[k] !== atteso[k]);
    return { ok: !diversi.length && scansionati === 5 && sconosciutoDetto, diversi, ...out, scansionati, sconosciutoDetto };
  }, { dialogs: OK });

  // 2. Fotocamera (lettura simulata): link e minuscolo aprono il prodotto e registrano «scansionato» (P26)
  await run('cod-scanner-fotocamera', async (h) => {
    await prepara(h);
    const link = (await prodotto(h, 'VIS-0142')).gs1DigitalLink;
    const out = {};
    await h.go('scanner'); out.lettore = await scan(h, link, { wait: 1500 }); out.link = await aperto(h);
    await h.go('scanner'); await scan(h, 'vis-0142', { wait: 1500 }); out.minuscolo = await aperto(h);
    await h.go('scanner'); await scan(h, '04:a2:3b:1c', { wait: 1500 }); out.tagScaffale = await aperto(h);
    out.scansionati = (await eventi(h, 'cmp-1', 'scanned', 800)).length;
    out.lastScannedAt = !!(await prodotto(h, 'VIS-0142')).lastScannedAt;
    return { ok: out.link === 'prodotto VIS-0142' && out.minuscolo === 'prodotto VIS-0142' && out.tagScaffale === 'scaffale A1' && out.scansionati === 2 && out.lastScannedAt, ...out };
  }, { dialogs: OK });

  // 3. Le 5 automazioni con il link di VIS-0142 scritto nel lettore («Scrivi il codice»; Invio come un lettore a pistola)
  await run('cod-automazioni-link', async (h) => {
    await prepara(h);
    const link = (await prodotto(h, 'VIS-0142')).gs1DigitalLink;
    const out = {};
    await h.go('automations/scan-sell'); await h.click('Scansiona Prodotto');
    out.lettore = await leggi(h, link);
    out.venditaFlash = (await h.page.getByPlaceholder('0.00').locator('visible=true').count()) > 0 && (await h.has('VIS-0142', true));
    await h.go('automations/quick-tag'); await h.click('Da Pulire'); await h.click('Scansiona Prodotto');
    await leggi(h, link, { invio: true });
    await h.go('automations/batch-move'); await h.click('Magazzino'); await h.click('Scansiona Prodotto');
    await leggi(h, link);
    out.spostamento = (await prodotto(h, 'VIS-0142', 500)).location;
    await h.go('automations/audit'); await h.click('Magazzino'); await fab(h);
    await leggi(h, link, { wait: 1200 });
    out.audit = await stats(h);
    await h.go('automations/custom-runner/auto_tag'); await ultima(h, 'Scansiona Prodotto');
    await leggi(h, link, { wait: 1200 });
    const note = (await prodotto(h, 'VIS-0142', 800)).technicalNotes || '';
    out.tagging = note.includes('[Da Pulire]');
    out.esecuzione = note.includes('[Visto]');
    return { ok: out.venditaFlash && out.tagging && out.spostamento === 'magazzino' && out.audit.trovati === '1' && out.esecuzione, ...out };
  }, { dialogs: OK });

  // 4. Le 5 automazioni con lo SKU in minuscolo dalla fotocamera (lettura simulata, V07)
  await run('cod-automazioni-minuscolo', async (h) => {
    await prepara(h);
    const out = {};
    await h.go('automations/scan-sell'); await h.click('Scansiona Prodotto');
    out.lettore = await scan(h, 'vis-0098');
    out.venditaFlash = (await h.page.getByPlaceholder('0.00').locator('visible=true').count()) > 0 && (await h.has('VIS-0098', true));
    await h.go('automations/quick-tag'); await h.click('Da Pulire'); await h.click('Scansiona Prodotto');
    await scan(h, 'lin-0021');
    out.tagging = ((await prodotto(h, 'LIN-0021', 500)).technicalNotes || '').includes('[Da Pulire]');
    await h.go('automations/batch-move'); await h.click('Vetrina'); await h.click('Scansiona Prodotto');
    await scan(h, 'puz-0012');
    out.spostamento = (await prodotto(h, 'PUZ-0012', 500)).location;
    await h.go('automations/audit'); await h.click('Stand B'); await fab(h);
    await scan(h, 'lin-0021', { wait: 1200 });
    out.audit = await stats(h);
    await h.go('automations/custom-runner/auto_tag'); await ultima(h, 'Scansiona Prodotto');
    await scan(h, 'ast-0033', { wait: 1200 });
    out.esecuzione = ((await prodotto(h, 'AST-0033', 800)).technicalNotes || '').includes('[Visto]');
    return { ok: out.venditaFlash && out.tagging && out.spostamento === 'vetrina' && out.audit.trovati === '1' && out.esecuzione, ...out };
  }, { dialogs: OK });

  // 5. Codice dello scaffale A1 in «Scansiona Posizione» e nello Spostamento rapido (AU-V14): vale la sua posizione
  await run('cod-scaffale-automazioni', async (h) => {
    await prepara(h);
    const visti = finestre(h);
    const out = {};
    await h.go('automations/custom-runner/auto_scaf'); await ultima(h, 'Scansiona Posizione');
    await leggi(h, 'SCAF-MAG-A1', { wait: 400 });
    out.esecuzione = (await testo(h)).match(/(Posizione non trovata|📍 [^|]{0,40}?\))/)?.[0] ?? null;
    await h.page.waitForTimeout(800);
    await ultima(h, 'Scansiona Prodotto');
    await leggi(h, 'VIS-0142', { wait: 1200 });
    out.spostatoDaEsecuzione = (await prodotto(h, 'VIS-0142', 500)).location;
    await h.go('automations/batch-move'); await h.click('Scansiona Posizione');
    await leggi(h, 'SCAF-MAG-A1');
    out.destinazioneFase1 = await h.has('Destinazione Attuale:') ? (await testo(h)).match(/Destinazione Attuale: (\S+)/)?.[1] : null;
    await h.go('automations/batch-move'); await h.click('Vetrina'); await h.click('Scansiona Prodotto');
    await leggi(h, 'SCAF-MAG-A1');
    out.cambio = visti.some((m) => m.startsWith('Cambio Destinazione'));
    if (!(await h.page.getByPlaceholder('Codice, SKU o link').locator('visible=true').count())) await h.click('Scansiona Prodotto').catch(() => {});
    await leggi(h, 'PUZ-0012');
    out.spostatoDaRapido = (await prodotto(h, 'PUZ-0012', 500)).location;
    out.scaffaleDetto = visti.filter((m) => m.includes('scaffale di Magazzino')).length;
    return { ok: !!out.esecuzione && out.esecuzione.includes('Magazzino') && out.spostatoDaEsecuzione === 'magazzino' && out.destinazioneFase1 === 'Magazzino' && out.cambio && out.spostatoDaRapido === 'magazzino', ...out };
  }, { dialogs: OK });

  // 6. Prodotto nel cestino (PUZ-0012): rifiutato dallo Scanner (a mano e fotocamera) e dalle 5 automazioni
  await run('cod-cestino', async (h) => {
    await prepara(h, { cestino: true });
    const visti = finestre(h);
    const prima = await prodotto(h, 'PUZ-0012');
    const eventiPrima = (await eventi(h, 'cmp-6')).length;
    const out = {};
    await aMano(h, 'PUZ-0012'); out.scannerMano = await aperto(h);
    await h.go('scanner'); await scan(h, 'PUZ-0012', { wait: 1500 }); out.scannerFotocamera = await aperto(h);
    await h.go('automations/scan-sell'); await h.click('Scansiona Prodotto');
    await leggi(h, 'PUZ-0012');
    out.venditaModulo = await h.page.getByPlaceholder('0.00').locator('visible=true').count();
    const detto = {};
    await h.go('automations/quick-tag'); await h.click('Da Pulire'); await h.click('Scansiona Prodotto');
    await leggi(h, 'PUZ-0012', { wait: 300 }); detto.tagging = /PUZ-0012 è nel cestino/.test(await testo(h));
    await h.go('automations/batch-move'); await h.click('Vetrina'); await h.click('Scansiona Prodotto');
    await leggi(h, 'PUZ-0012', { wait: 300 }); detto.spostamento = /PUZ-0012 è nel cestino/.test(await testo(h));
    await h.go('automations/audit'); await h.click('Stand C'); await fab(h);
    await leggi(h, 'PUZ-0012', { wait: 1000 });
    out.audit = await stats(h);
    await h.go('automations/custom-runner/auto_tag'); await ultima(h, 'Scansiona Prodotto');
    await leggi(h, 'PUZ-0012', { wait: 300 }); detto.esecuzione = /PUZ-0012 è nel cestino/.test(await testo(h));
    const dopo = await prodotto(h, 'PUZ-0012', 800);
    out.invariato = dopo.technicalNotes === prima.technicalNotes && dopo.location === prima.location && dopo.status === prima.status;
    out.eventiNuovi = (await eventi(h, 'cmp-6')).length - eventiPrima;
    out.finestreCestino = visti.filter((m) => /nel cestino/.test(m)).length; // Scanner ×2, Vendita flash, Audit
    out.detto = detto;
    return { ok: out.scannerMano === 'niente' && out.scannerFotocamera === 'niente' && out.venditaModulo === 0 && out.audit.intrusi === '0' && out.invariato && out.eventiNuovi === 0 && out.finestreCestino >= 4 && detto.tagging && detto.spostamento && detto.esecuzione, ...out };
  }, { dialogs: OK });

  // 7. NG24 rifatto passo per passo (Posizioni) e NG25: un codice già usato si rifiuta, chiunque lo usi
  await run('cod-posizioni-doppioni', async (h) => {
    const locs = [...LOCATIONS, { id: 'banco_uno', label: 'Banco Uno', color: '#3B82F6', barcode: 'LOC-UNO' }, { id: 'banco_due', label: 'Banco Due', color: '#3B82F6', barcode: 'LOC-DUE' }];
    await prepara(h, { locations: locs });
    const visti = finestre(h);
    const campo = () => h.page.getByPlaceholder('Scansiona o Genera...').locator('visible=true').first();
    await h.go('settings/locations');
    await h.click('Banco Uno');
    const out = { campoA: await campo().inputValue() };
    const rigaB = h.page.locator('[tabindex="0"]').filter({ hasText: 'Banco DueID:' }).locator('visible=true').first();
    await rigaB.locator('[tabindex="0"]').first().click();
    await h.page.waitForTimeout(700);
    out.finestraB = await h.has('LOC-DUE', true);
    await h.page.mouse.click(10, 10);
    await h.page.waitForTimeout(500);
    out.campoDopoQR = await campo().inputValue();
    await h.click('Salva Modifiche');
    const salvate = async () => Object.fromEntries(((await h.store(LOC, 600)) || []).filter((l) => /banco/.test(l.id)).map((l) => [l.id, l.barcode]));
    out.dopoSalva = await salvate();
    const rifiuti = {};
    for (const [nome, codice] of [['posizione', 'LOC-DUE'], ['categoria', 'LIB-PELLICCE'], ['scaffale', 'SCAF-MAG-A1'], ['prodotto', 'vis-0142'], ['tag', '04A23B1C']]) {
      await h.click('Banco Uno'); await campo().fill(codice); await h.click('Salva Modifiche');
      rifiuti[nome] = visti.some((m) => m.includes('è già usato') && m.toLowerCase().includes(codice.toLowerCase()));
      await h.go('settings/locations');
    }
    out.rifiuti = rifiuti;
    out.fine = await salvate();
    return { ok: out.campoDopoQR === 'LOC-UNO' && out.dopoSalva.banco_uno === 'LOC-UNO' && out.dopoSalva.banco_due === 'LOC-DUE' && Object.values(rifiuti).every(Boolean) && out.fine.banco_uno === 'LOC-UNO', ...out };
  }, { dialogs: OK });

  // 8. NG24 e NG25 nelle Categorie
  await run('cod-categorie-doppioni', async (h) => {
    const libraries = [
      { id: 'cat_uno', name: 'Cat Uno', icon: 'folder', createdAt: '2026-11-22T10:00:00.000Z', barcode: 'LIB-UNO' },
      { id: 'cat_due', name: 'Cat Due', icon: 'folder', createdAt: '2026-11-22T10:00:00.000Z', barcode: 'LIB-DUE' },
    ];
    await prepara(h, { libraries });
    const visti = finestre(h);
    const campo = () => h.page.getByPlaceholder('Scansiona o Genera...').locator('visible=true').first();
    const riga = (id) => h.page.locator('[tabindex="0"]').filter({ hasText: `ID: ${id}` }).locator('visible=true').first();
    await h.go('settings/folders');
    await riga('cat_uno').click(); await h.page.waitForTimeout(400);
    const out = { campoA: await campo().inputValue() };
    await riga('cat_due').locator('[tabindex="0"]').first().click();
    await h.page.waitForTimeout(700);
    out.finestraB = await h.has('LIB-DUE', true);
    await h.page.mouse.click(10, 10);
    await h.page.waitForTimeout(500);
    out.campoDopoQR = await campo().inputValue();
    await h.click('Salva Modifiche');
    const salvate = async () => Object.fromEntries(((await h.store(LK, 600)) || []).filter((l) => /cat_/.test(l.id)).map((l) => [l.id, l.barcode]));
    out.dopoSalva = await salvate();
    const rifiuti = {};
    for (const [nome, codice] of [['categoria', 'LIB-DUE'], ['posizione', 'LOC-MAGAZZINO'], ['scaffale', 'SCAF-MAG-A1'], ['prodotto', 'VIS-0142']]) {
      await riga('cat_uno').click(); await h.page.waitForTimeout(400);
      await campo().fill(codice); await h.click('Salva Modifiche');
      rifiuti[nome] = visti.some((m) => m.includes('è già usato') && m.toLowerCase().includes(codice.toLowerCase()));
      await h.go('settings/folders');
    }
    out.rifiuti = rifiuti;
    out.fine = await salvate();
    return { ok: out.campoDopoQR === 'LIB-UNO' && out.dopoSalva.cat_uno === 'LIB-UNO' && out.dopoSalva.cat_due === 'LIB-DUE' && Object.values(rifiuti).every(Boolean) && out.fine.cat_uno === 'LIB-UNO', ...out };
  }, { dialogs: OK });

  // 9. Doppioni già salvati (come dopo NG24): lo Scanner chiede quale, mai il primo a caso; un altro campo si salva con l'avviso
  await run('cod-doppioni-esistenti', async (h) => {
    const locs = [...LOCATIONS, { id: 'banco_uno', label: 'Banco Uno', color: '#3B82F6', barcode: 'LOC-DOPPIO' }, { id: 'banco_due', label: 'Banco Due', color: '#3B82F6', barcode: 'LOC-DOPPIO' }];
    await prepara(h, { locations: locs });
    const visti = finestre(h);
    await aMano(h, 'LOC-DOPPIO');
    const out = { scelta: visti.find((m) => m.includes('Banco Uno') && m.includes('Banco Due')) ?? null, aperto: await aperto(h) };
    await h.go('settings/locations');
    await h.click('Banco Uno');
    await h.page.locator('[tabindex="0"]:visible:not(a)').nth(3).click(); // viola
    await h.click('Salva Modifiche');
    const uno = ((await h.store(LOC, 600)) || []).find((l) => l.id === 'banco_uno');
    out.salvata = { color: uno.color, barcode: uno.barcode };
    out.avviso = visti.some((m) => m.includes('LOC-DOPPIO') && /usato anche/.test(m));
    return { ok: !!out.scelta && out.aperto === 'posizione Banco Due' && uno.color === '#8B5CF6' && out.avviso, ...out };
  }, { dialogs: ['2', ...OK] });

  // 10. NG02: la Modifica di un prodotto senza link non lo crea; l'etichetta (Mostra SKU QR) resta
  await run('cod-modifica-senza-link', async (h) => {
    await prepara(h);
    await h.click('PUZ-0012'); await h.page.waitForTimeout(800);
    const out = { etichettaPrima: await h.has('Mostra SKU QR'), testoVecchio: await h.has('Modifica e salva il prodotto per generarlo') };
    await press(h.page, /^.?\s*Modifica$/); await h.page.waitForTimeout(1200);
    await salvaModifica(h);
    out.link = (await prodotto(h, 'PUZ-0012', 500)).gs1DigitalLink ?? null;
    out.etichettaDopo = await h.has('Mostra SKU QR');
    return { ok: out.link === null && out.etichettaDopo && !out.testoVecchio, ...out };
  }, { dialogs: OK });

  // 11. NG27: lotto acceso con un campo scelto, poi cambio di SKU: il link salvato non cambia e il link vecchio apre il prodotto
  await run('cod-modifica-lotto-sku', async (h) => {
    await prepara(h, { gs1: { baseUrl: 'https://syncroflow.app/id', enableSerial: true, serialMode: 'uuid', enableLotto: true, lottoFieldId: 'field_cmp_fornitore' } });
    const prima = (await prodotto(h, 'VIS-0142')).gs1DigitalLink;
    await apriModifica(h, 'VIS-0142');
    await salvaModifica(h);
    const out = { conLotto: (await prodotto(h, 'VIS-0142', 500)).gs1DigitalLink };
    await h.go('');
    await h.page.getByText('VIS-0142', { exact: true }).first().waitFor();
    await apriModifica(h, 'VIS-0142');
    await h.page.getByPlaceholder('es: VIS-001-2024').locator('visible=true').first().fill('VIS-0143');
    await salvaModifica(h);
    const p = await prodotto(h, 'VIS-0143', 500);
    out.sku = p && p.sku;
    out.dopoSku = p && p.gs1DigitalLink;
    await aMano(h, prima); out.linkVecchio = await aperto(h);
    await aMano(h, 'vis-0143'); out.skuNuovo = await aperto(h);
    return { ok: out.conLotto === prima && out.dopoSku === prima && out.linkVecchio === 'prodotto VIS-0143' && out.skuNuovo === 'prodotto VIS-0143', prima, ...out };
  }, { dialogs: OK });
})();
