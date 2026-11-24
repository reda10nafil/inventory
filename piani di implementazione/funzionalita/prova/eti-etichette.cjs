// ETI (ticket 22, AU-A8, AU-V16): finestra «Codice ed etichetta» ed etichette fatte in locale, sul web.
// - prodotto col link (VIS-0142, P27) e senza (PUZ-0012): la finestra c'è per tutti e due, il QR a video, quello
//   dell'etichetta e quello del PDF portano lo SKU (NG23, matrice confrontata con la libreria `qrcode`);
// - la stampa apre una finestra sua e stampa quella, mai la pagina dell'app; 0 errori, 0 richieste fuori da localhost;
// - PDF: «Syncro Flow», «Fornitore» e il valore, codici locali, niente «Impossibile generare il PDF» (D16, D07);
// - posizione (con «tutte le etichette di questa posizione»), categoria, scaffale (formato Etichettatrice ricordato);
// - posizione, categoria e scaffale nuovi: il codice nasce da solo (lo scaffale con S2, qui con «Genera» o «Crea il
//   codice») e al «OK» si apre la finestra; «Cambia codice» con un codice già usato si rifiuta;
// - etichette in serie dalla selezione dell'Inventario («3 etichette», foglio A4); «Condividi» sul web scarica l'HTML.
// Uso (dalla cartella prova/): APP=http://localhost:8084 node eti-etichette.cjs [nome-scenario]
const { scenario } = require('./lib.cjs');
const { prepara, LOC, LK, SK } = require('./cod-util.cjs');
const e = require('./eti-util.cjs');

const solo = process.argv[2];
const run = (name, fn, opts) => (!solo || name.includes(solo) ? scenario(name, fn, opts) : null);
const OK = Array(12).fill('ok');
const FORMATO = 'furinventory_label_format:local';
const senzaScriptNeHttp = (html) => !/<script|https?:|qrserver|barcodeapi|jsdelivr|rawgit/i.test(html);
const etichette = (html) => [...html.matchAll(/<div class="code">([^<]*)<\/div>/g)].map((m) => m[1]);
const scheda = async (h, sku) => { await h.click(sku); await h.page.waitForTimeout(900); };

// Finestra di un prodotto e stampa della sua etichetta
async function prodotto(h, sku) {
  const st = await e.guardaStampe(h);
  await scheda(h, sku);
  const out = { vecchie: { mostraSkuQr: await h.has('Mostra SKU QR'), identitaGs1: await h.has('Identità digitale GS1', true) } };
  await e.apri(h, 'Codice ed etichetta', 900);
  out.finestra = { titolo: await h.has('Codice ed etichetta', true), codice: await h.has(sku, true) };
  const atteso = e.qrAtteso(sku);
  out.qrSchermoUgualeSku = JSON.stringify(await e.qrSchermo(h, atteso.length)) === JSON.stringify(atteso);
  await e.apri(h, 'Avanzate', 400);
  out.avanzate = {
    cambiaSku: await h.has('Cambia lo SKU in Modifica', true), link: await h.has('Link al sito', true),
    copiaLink: await h.has('Copia link', true), programmaTag: await h.has('Programma tag', true), cambiaCodice: await h.has('Cambia codice', true),
  };
  st.esterne.length = 0; // da qui le richieste della stampa (l'apertura dello Scanner web di expo-camera ha le sue)
  await e.apri(h, 'Stampa etichetta', 1500);
  const s = await e.ultimaStampa(st);
  out.stampa = s && {
    finestre: st.finestre.length, stampata: s.stampe, titolo: s.titolo, pulita: senzaScriptNeHttp(s.html),
    qrEtichettaUgualeSku: JSON.stringify(e.qrHtml(s.html)) === JSON.stringify(atteso), codici: etichette(s.html),
  };
  out.paginaAppStampata = await h.page.evaluate(() => window.__prints);
  out.esterne = st.esterne;
  return out;
}

(async () => {
  // 1. P27: VIS-0142 ha il link GS1, e ora ha la finestra e l'etichetta come gli altri; il link sotto «Avanzate»
  await run('eti-prodotto-link', async (h) => {
    const out = await prodotto(h, 'VIS-0142');
    const link = (await h.products(0)).find((p) => p.sku === 'VIS-0142').gs1DigitalLink;
    out.linkAVideo = await h.has(link, true);
    out.linkSalvatoUguale = link === 'https://syncroflow.app/id/01/VIS-0142/21/000142';
    return out;
  });

  // 2. PUZ-0012 senza link: stessa finestra, senza il link
  await run('eti-prodotto-senza-link', async (h) => prodotto(h, 'PUZ-0012'));

  // 3. PDF della Scheda sul web: una finestra sua con l'HTML, mai la pagina dell'app (NG21, D16, D07)
  await run('eti-pdf', async (h) => {
    const st = await e.guardaStampe(h);
    await scheda(h, 'VIS-0142');
    st.esterne.length = 0;
    await h.page.locator('[tabindex="0"]').filter({ hasText: 'Stampa scheda PDF' }).locator('visible=true').first().click();
    await h.page.waitForTimeout(3000);
    const s = await e.ultimaStampa(st);
    const html = s ? s.html : '';
    return {
      finestre: st.finestre.length, stampata: s && s.stampe, paginaAppStampata: await h.page.evaluate(() => window.__prints),
      titolo: /<h1>Syncro Flow<\/h1>/.test(html), vecchioTitolo: html.includes('FurInventory'),
      fornitore: html.includes('<td>Fornitore</td><td>Pellicceria Bianchi, Milano</td>'),
      pulito: senzaScriptNeHttp(html), qrUgualeSku: JSON.stringify(e.qrHtml(html)) === JSON.stringify(e.qrAtteso('VIS-0142')),
      foto: (html.match(/<img src="data:image\/jpeg;base64,/g) || []).length, esterne: st.esterne,
    };
  }, { dialogs: OK });

  // 4. Posizione Magazzino: finestra dalla riga, «tutte le etichette di questa posizione» (lei, A1, i prodotti)
  await run('eti-posizione-serie', async (h) => {
    await prepara(h);
    const st = await e.guardaStampe(h);
    await h.go('settings/locations');
    await e.apri(h, 'Codice ed etichetta di Magazzino');
    const out = { codice: await h.has('LOC-MAGAZZINO', true), qr: JSON.stringify(await e.qrSchermo(h, e.qrAtteso('LOC-MAGAZZINO').length)) === JSON.stringify(e.qrAtteso('LOC-MAGAZZINO')) };
    await e.apri(h, 'Stampa tutte le etichette di questa posizione', 500);
    out.contatore = await h.page.getByText(/^\d+ etichette$/).locator('visible=true').first().innerText();
    st.esterne.length = 0;
    await e.apri(h, 'Stampa etichette', 1500);
    const s = await e.ultimaStampa(st);
    out.stampa = s && { stampata: s.stampe, titolo: s.titolo, codici: etichette(s.html), pulita: senzaScriptNeHttp(s.html) };
    out.paginaAppStampata = await h.page.evaluate(() => window.__prints);
    out.esterne = st.esterne;
    return out;
  });

  // 5. Categoria Pellicce: dalla riga e dalla finestra della categoria (riga «Codice ed etichetta» al posto del blocco)
  await run('eti-categoria', async (h) => {
    await prepara(h);
    const st = await e.guardaStampe(h);
    await h.go('settings/folders');
    await e.apri(h, 'Codice di Pellicce');
    const out = { dallaRiga: await h.has('LIB-PELLICCE', true) };
    st.esterne.length = 0;
    await e.apri(h, 'Stampa etichetta', 1500);
    const s = await e.ultimaStampa(st);
    out.stampa = s && { codici: etichette(s.html), qr: JSON.stringify(e.qrHtml(s.html)) === JSON.stringify(e.qrAtteso('LIB-PELLICCE')) };
    await e.chiudiCodice(h);
    await h.page.locator('[tabindex="0"]').filter({ hasText: /ID: pellicce(?![\w-])/ }).locator('visible=true').first().click(); await h.page.waitForTimeout(500);
    out.finestraCategoria = { bloccoVecchio: await h.has('Barcode / NFC (Opzionale)', true), riga: await h.has('Codice ed etichetta', true) };
    await e.apri(h, 'Codice ed etichetta');
    out.dallaFinestra = { codice: await h.has('LIB-PELLICCE', true), sottoLaFinestra: await h.has('Modifica categoria', true) };
    await e.chiudiCodice(h);
    out.restaLaFinestra = await h.has('Modifica categoria', true);
    out.esterne = st.esterne;
    return out;
  });

  // 6. Scaffale A1: «Magazzino › A1», formato Etichettatrice (62 × 29 mm) ricordato; la chiave nasce solo alla scelta
  await run('eti-scaffale-formato', async (h) => {
    await prepara(h);
    const st = await e.guardaStampe(h);
    await h.go('settings/shelves');
    await e.apri(h, 'Codice QR di A1');
    const out = { nome: await h.has('Magazzino › A1', true), codice: await h.has('SCAF-MAG-A1', true), chiavePrima: await h.store(FORMATO, 300) };
    await e.apri(h, 'Formato Etichettatrice', 400);
    out.chiaveDopo = await h.store(FORMATO, 500);
    await e.apri(h, 'Stampa etichetta', 1500);
    const s = await e.ultimaStampa(st);
    out.stampa = s && { rotolo: s.html.includes('@page{size:62mm 29mm;margin:0mm}'), codici: etichette(s.html) };
    await h.go('settings/shelves');
    await e.apri(h, 'Codice QR di A1');
    out.ricordato = await h.page.getByLabel('Formato Etichettatrice', { exact: true }).locator('visible=true').first().getAttribute('aria-checked');
    return out;
  });

  // 7. Posizione, categoria, sottocategoria e scaffali nuovi: codice che nasce da solo e finestra al «OK»
  await run('eti-crea', async (h) => {
    await prepara(h);
    const out = {};
    await h.go('settings/locations');
    await h.page.getByPlaceholder('Es. Magazzino A, Scaffale 1').fill('Deposito Nord');
    await h.click('Crea Posizione');
    out.posizione = { finestra: await e.aperta(h), avviso: await h.has('Posizione "Deposito Nord" creata.', true), codice: await h.has('LOC-DEPOSITO-NORD', true),
      salvato: ((await h.store(LOC, 300)) || []).find((l) => l.id === 'deposito_nord')?.barcode };
    await e.chiudiCodice(h);
    await h.go('settings/folders');
    await h.page.getByPlaceholder('Nome categoria (es: Giacche)').fill('Borse');
    await h.click('Crea Categoria');
    out.categoria = { finestra: await e.aperta(h), codice: await h.has('LIB-BORSE', true) };
    await e.chiudiCodice(h);
    await e.apri(h, 'Apri Borse', 300);
    await e.apri(h, 'Aggiungi una sottocategoria a Borse', 300);
    await h.page.getByLabel('Nome della sottocategoria di Borse', { exact: true }).fill('Zaini');
    await e.apri(h, 'Aggiungi la sottocategoria a Borse', 600);
    out.sottocategoria = { finestra: await e.aperta(h) };
    const libs = (await h.store(LK, 300)) || [];
    out.codiciCategorie = libs.filter((l) => ['Borse', 'Zaini'].includes(l.name)).map((l) => `${l.name}:${l.barcode}`);
    // Scaffale con «Genera il codice», poi uno senza codice (su questo branch: «Crea il codice» nella finestra; con S2
    // il codice nasce già al salvataggio) e con la categoria Pellicce, che resta dopo il codice
    await h.go('settings/shelves');
    await e.apri(h, 'Nuovo scaffale', 300);
    await h.page.getByLabel('Nome', { exact: true }).locator('visible=true').first().fill('B1');
    await e.apri(h, 'Posizione Magazzino', 200);
    await e.apri(h, 'Genera il codice', 300);
    await e.apri(h, 'Crea scaffale', 700);
    out.scaffaleGenerato = { finestra: await e.aperta(h), codice: await h.has('SCAF-MAGAZZINO-B1', true) };
    await e.chiudiCodice(h);
    await e.apri(h, 'Nuovo scaffale', 300);
    await h.page.getByLabel('Nome', { exact: true }).locator('visible=true').first().fill('B2');
    await e.apri(h, 'Posizione Magazzino', 200);
    await e.apri(h, 'Categoria Pellicce', 200);
    await e.apri(h, 'Crea scaffale', 700);
    const conCodice = await h.has('SCAF-MAGAZZINO-B2', true);
    out.scaffaleSenzaCodice = { finestra: await e.aperta(h), vuoto: await h.has('Questo scaffale non ha ancora un codice.', true), codiceGiaNato: conCodice };
    if (!conCodice) await e.apri(h, 'Crea il codice', 700);
    const b2 = ((await h.store(SK, 400)) || []).find((s) => s.name === 'B2');
    out.scaffaleSenzaCodice.dopo = { codice: await h.has('SCAF-MAGAZZINO-B2', true), salvato: b2 && b2.barcode, categoria: b2 && b2.libraryId, posizione: b2 && b2.locationId };
    return out;
  }, { dialogs: OK });

  // 8. «Cambia codice»: un codice già usato si rifiuta (posizione e categoria), uno libero si salva e si vede
  await run('eti-cambia-codice', async (h) => {
    await prepara(h);
    const visti = [];
    h.page.on('dialog', (d) => visti.push(d.message().replace(/\n+/g, ' | ')));
    await h.go('settings/locations');
    await e.apri(h, 'Codice ed etichetta di Magazzino');
    await e.cambiaCodice(h, 'LIB-PELLICCE');
    const out = { rifiutoPosizione: visti.some((m) => m.includes('è già usato dalla categoria "Pellicce"')), salvatoDopoRifiuto: ((await h.store(LOC, 300)) || []).find((l) => l.id === 'magazzino').barcode };
    await e.cambiaCodice(h, 'LOC-MAG-NUOVO');
    out.nuovo = { salvato: ((await h.store(LOC, 300)) || []).find((l) => l.id === 'magazzino').barcode, aVideo: await h.has('LOC-MAG-NUOVO', true), avviso: await h.has('Codice salvato: LOC-MAG-NUOVO.', true) };
    await h.go('settings/folders');
    await e.apri(h, 'Codice di Pellicce');
    await e.cambiaCodice(h, 'scaf-mag-a1');
    out.rifiutoCategoria = visti.some((m) => m.includes('è già usato dallo scaffale "Magazzino › A1"'));
    out.categoriaDopoRifiuto = ((await h.store(LK, 300)) || []).find((l) => l.id === 'pellicce').barcode;
    out.finestre = visti.length;
    return out;
  }, { dialogs: OK });

  // 9. AU-A8: etichette in serie dalla selezione dell'Inventario, foglio A4; «Condividi» sul web scarica l'HTML
  await run('eti-serie-inventario', async (h) => {
    const st = await e.guardaStampe(h);
    await h.longPress('VIS-0142');
    await h.click('LIN-0021'); await h.click('PUZ-0012');
    await e.apri(h, 'Stampa le etichette');
    const out = { contatore: await h.has('3 etichette', true), titolo: await h.has('Etichette', true) };
    await e.apri(h, 'Formato Foglio A4', 300);
    st.esterne.length = 0;
    await e.apri(h, 'Stampa etichette', 1500);
    const s = await e.ultimaStampa(st);
    out.stampa = s && { codici: etichette(s.html), pagine: (s.html.match(/<div class="page">/g) || []).length, a4: s.html.includes('@page{size:A4;margin:0mm}') };
    const [dl] = await Promise.all([h.page.waitForEvent('download', { timeout: 8000 }), e.apri(h, 'Condividi', 800)]);
    out.condividi = { file: dl.suggestedFilename() };
    out.paginaAppStampata = await h.page.evaluate(() => window.__prints);
    out.esterne = st.esterne;
    return out;
  });
})();
