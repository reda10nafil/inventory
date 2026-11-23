// IND (ticket 28, IND-P4…P9): resto del tasto Indietro. Scenari del resoconto `verifica-indietro-icone.md` («Come si
// proverebbe» 8-9) e del piano di verifica del ticket: X dello Scanner, Conta col tasto Indietro di sistema (sul web
// il tasto del browser, `page.goBack()`), «Prodotto non trovato» con «Torna all'inventario» in Scheda e Modifica,
// etichetta della freccia nativa, database della Chat che non nasce più all'avvio (IND-P9).
// Nella Conta si entra dai menu (Home › Automazioni › Conta Magazzino), mai con `h.go`: una ricarica fa del documento
// la prima voce della storia del browser e `page.goBack()` uscirebbe dall'app senza provare nulla.
// Uso: node ind-indietro.cjs [nome-scenario]   (senza argomento li esegue tutti)
const { scenario } = require('./lib.cjs');
const u = require('./c2-util.cjs');

const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const goBacks = (page) => { const l = []; page.on('console', (m) => { if (/GO_BACK/.test(m.text())) l.push(m.text()); }); return l; };
const finestre = (page) => { const l = []; page.on('dialog', (d) => l.push(d.message().replace(/\n+/g, ' | '))); return l; };
const label = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
const vedo = async (h, name) => (await h.page.getByLabel(name, { exact: true }).locator('visible=true').count()) > 0;
const SCANNER = String.fromCodePoint(0xf206); // MaterialCommunityIcons qr-code-scan, icona dello Scanner in Automazioni

async function apriScanner(h) {
  await h.tab('Automazioni');
  await h.page.evaluate((g) => {
    const e = [...document.querySelectorAll('div')].find((d) => d.childElementCount === 0 && d.textContent === g && d.offsetParent);
    e.click();
  }, SCANNER);
  await h.page.waitForTimeout(1200);
}

// Un articolo a quantità in Magazzino (VIS-0098, 5 pz, con il carico iniziale in Cronologia), poi la Home
async function prepara(h) {
  await h.page.evaluate(() => {
    const pk = 'inventory:v1:local:products';
    const tk = 'inventory:v1:local:timeline';
    const list = JSON.parse(localStorage.getItem(pk));
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    const p = list.find((x) => x.sku === 'VIS-0098');
    Object.assign(p, { unit: 'pz', stock: { magazzino: 5 }, location: 'magazzino' });
    tl.unshift({ id: 'ind-VIS-0098', productId: p.id, type: 'stock', timestamp: '2026-11-23T08:00:00.000Z', details: { movement: 'carico', qty: 5, to: 'magazzino', reason: 'iniziale', before: 0, after: 5 } });
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  });
  await h.go('');
}

// Passo della Conta che si vede: scelta della posizione, elenco, riepilogo, esito; o fuori dalla Conta
async function passo(h) {
  if (await vedo(h, 'Conta Magazzino')) return 'posizione';
  if (await vedo(h, 'Contata VIS-0098')) return 'elenco';
  if (await vedo(h, 'Registra rettifiche')) return 'riepilogo';
  if (await h.has('Conta registrata', true)) return 'esito';
  return 'fuori';
}
const stato = async (h) => ({ passo: await passo(h), percorso: u.percorso(h.page), conta: await u.montate(h.page, 'Conta di magazzino') + await u.montate(h.page, 'Conta · Magazzino') });

(async () => {
  // 1. X dello Scanner (IND-P4, IND-3): dai menu e dall'indirizzo diretto torna ad Automazioni, Scanner smontato
  await run('ind-scanner-x', async (h) => {
    const gb = goBacks(h.page);
    const esiti = {};
    await apriScanner(h);
    let f = await u.frecce(h.page);
    esiti.daMenu = { percorso: u.percorso(h.page), x: f.x.length, freccia: f.freccia.length };
    esiti.daMenu.tocco = await u.toccaIndietro(h.page); await h.page.waitForTimeout(1200);
    esiti.daMenu.dopo = u.percorso(h.page);
    esiti.daMenu.scanner = await u.montate(h.page, 'Scanner QR/Barcode');
    await h.go('scanner');
    f = await u.frecce(h.page);
    esiti.diretto = { x: f.x.length, tocco: await u.toccaIndietro(h.page) }; await h.page.waitForTimeout(1200);
    esiti.diretto.dopo = u.percorso(h.page);
    esiti.diretto.scanner = await u.montate(h.page, 'Scanner QR/Barcode');
    const ok = Object.values(esiti).every((e) => e.x === 1 && e.tocco === 'X' && e.dopo === '/automations' && e.scanner === 0)
      && esiti.daMenu.percorso === '/scanner' && gb.length === 0;
    return { ok, ...esiti, goBack: gb.length };
  });

  // 2. Conta col tasto Indietro di sistema (IND-P5, IND-6): dal riepilogo all'elenco, dall'elenco alla posizione (le
  // quantità restano), dalla posizione con quantità scritte la domanda; «Annulla» resta, «OK» esce. Niente scritto.
  await run('ind-conta-indietro', async (h) => {
    const fin = finestre(h.page);
    await prepara(h);
    const prima = { prodotti: JSON.stringify(await h.products(0)), cronologia: (await h.timeline(0)).length };
    await h.tab('Automazioni');
    await h.click('Conta Magazzino');
    await label(h, 'Conta Magazzino').click(); await h.page.waitForTimeout(500);
    await label(h, 'Contata VIS-0098').fill('3');
    await label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(500);
    const riepilogo = await stato(h);
    const indietro = async () => { await h.page.goBack(); await h.page.waitForTimeout(1500); };
    const fermo = async (fin2, passi) => ({ ok: false, fermatoA: fin2, ...passi, nienteScritto: JSON.stringify(await h.products(0)) === prima.prodotti });
    await indietro();
    const dalRiepilogo = { ...(await stato(h)), scritto: await label(h, 'Contata VIS-0098').inputValue().catch(() => null) };
    if (dalRiepilogo.passo !== 'elenco') return fermo('dal riepilogo', { riepilogo, dalRiepilogo, finestre: [...fin] });
    await indietro();
    const dallElenco = { ...(await stato(h)), finestre: fin.length };
    if (dallElenco.passo !== 'posizione') return fermo('dall\'elenco', { riepilogo, dalRiepilogo, dallElenco });
    // Stessa posizione di nuovo: la quantità scritta c'è ancora
    await label(h, 'Conta Magazzino').click(); await h.page.waitForTimeout(500);
    const ripresa = await label(h, 'Contata VIS-0098').inputValue().catch(() => null);
    await indietro();
    // Dalla posizione con quantità scritte: domanda, «Annulla» (1a finestra) → si resta
    await indietro();
    const annulla = { ...(await stato(h)), finestre: [...fin] };
    if (annulla.passo !== 'posizione') return fermo('alla domanda', { riepilogo, dalRiepilogo, dallElenco, ripresa, annulla });
    // Di nuovo, con la X a video: domanda, «OK» (2a finestra) → Automazioni
    const tocco = await u.toccaIndietro(h.page); await h.page.waitForTimeout(1500);
    const esci = { tocco, ...(await stato(h)), finestre: [...fin] };
    const dopo = { prodotti: JSON.stringify(await h.products(0)), cronologia: (await h.timeline(0)).length };
    const DOMANDA = 'Uscire dalla conta? | Le quantità scritte si perdono. | Esci?';
    const ok = riepilogo.passo === 'riepilogo' && riepilogo.percorso === '/automations/count'
      && dalRiepilogo.passo === 'elenco' && dalRiepilogo.percorso === '/automations/count' && dalRiepilogo.scritto === '3'
      && dallElenco.passo === 'posizione' && dallElenco.percorso === '/automations/count' && dallElenco.finestre === 0
      && ripresa === '3'
      && annulla.passo === 'posizione' && annulla.percorso === '/automations/count' && annulla.finestre.join() === DOMANDA
      && esci.tocco === 'X' && esci.passo === 'fuori' && esci.percorso === '/automations' && esci.conta === 0 && esci.finestre.length === 2
      && esci.finestre[1] === DOMANDA && dopo.prodotti === prima.prodotti && dopo.cronologia === prima.cronologia;
    return { ok, riepilogo, dalRiepilogo, dallElenco, ripresa, annulla, esci, nienteScritto: dopo.prodotti === prima.prodotti && dopo.cronologia === prima.cronologia };
  }, { dialogs: ['cancel', 'ok'] });

  // 3. Conta senza quantità scritte e dopo una conta registrata: si esce senza domanda (tasto del browser e X)
  await run('ind-conta-senza-domanda', async (h) => {
    const fin = finestre(h.page);
    await prepara(h);
    await h.tab('Automazioni');
    await h.click('Conta Magazzino');
    await h.page.goBack(); await h.page.waitForTimeout(1500);
    const vuota = { ...(await stato(h)), finestre: fin.length };
    await h.click('Conta Magazzino');
    await label(h, 'Conta Magazzino').click(); await h.page.waitForTimeout(500);
    await label(h, 'Contata VIS-0098').fill('3');
    await label(h, 'Riepilogo della conta').click(); await h.page.waitForTimeout(500);
    await label(h, 'Registra rettifiche').click(); await h.page.waitForTimeout(800);
    const esito = await stato(h);
    await label(h, 'Nuova conta').click(); await h.page.waitForTimeout(500);
    const tocco = await u.toccaIndietro(h.page); await h.page.waitForTimeout(1500);
    const dopoNuova = { tocco, ...(await stato(h)), finestre: fin.length };
    const p = (await h.products(800)).find((x) => x.sku === 'VIS-0098');
    const ok = vuota.passo === 'fuori' && vuota.percorso === '/automations' && vuota.finestre === 0
      && esito.passo === 'esito' && dopoNuova.tocco === 'X' && dopoNuova.passo === 'fuori' && dopoNuova.percorso === '/automations'
      && dopoNuova.finestre === 0 && p.stock.magazzino === 3;
    return { ok, vuota, esito, dopoNuova, giacenza: p.stock };
  });

  // 4. «Prodotto non trovato» in Scheda e Modifica (IND-P6, IND-7): «Torna all'inventario» porta alla Home, una barra
  await run('ind-non-trovato', async (h) => {
    const gb = goBacks(h.page);
    const esiti = {};
    for (const indirizzo of ['product/inesistente', 'product/edit/inesistente']) {
      await h.go(indirizzo);
      const testo = await h.has('Prodotto non trovato', true);
      const pulsante = await h.has('Torna all\'inventario', true);
      if (pulsante) await h.click('Torna all\'inventario');
      await h.page.waitForTimeout(800);
      esiti[indirizzo] = { testo, pulsante, dopo: u.percorso(h.page), barre: await u.barre(h.page), home: await h.has('VIS-0142', true), nonTrovato: await u.montate(h.page, 'Prodotto non trovato') };
    }
    const ok = Object.values(esiti).every((e) => e.testo && e.pulsante && e.dopo === '/' && e.barre === 1 && e.home && e.nonTrovato === 0) && gb.length === 0;
    return { ok, ...esiti, goBack: gb.length };
  });

  // 5. Etichetta della freccia nativa (IND-P7, IND-8): «Indietro, back» invece di «(tabs), back» o «Scanner, back»
  await run('ind-etichetta', async (h) => {
    const etichette = {};
    await h.go('settings');
    await h.click('Categorie');
    etichette.categorieDaMenu = (await u.frecce(h.page)).nativa;
    await h.go('settings/folders');
    etichette.categorieDiretta = (await u.frecce(h.page)).nativa;
    await h.go('scanner-action?type=product&id=cmp-1');
    etichette.azioneRapida = (await u.frecce(h.page)).nativa;
    const ok = Object.values(etichette).every((l) => l.length === 1 && l[0] === 'Indietro, back');
    return { ok, ...etichette };
  });

  // 6. Database della Chat (IND-P9): all'avvio, nelle schede e in Team non nasce; nasce alla prima card di prodotti della
  // Chat. Ricarica durante il primo avvio (come g2-loki.cjs) senza «Deleting database failed» (lib.cjs lo filtra: qui si
  // guarda tutta la console)
  await run('ind-database-chat', async (h) => {
    const tutti = [];
    h.page.on('console', (m) => { if (/Deleting database|blocked/i.test(m.text())) tutti.push(m.text().slice(0, 120)); });
    const basi = () => h.page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name).sort());
    const dopoAvvio = await basi();
    for (const indirizzo of ['', 'automations', 'settings', 'settings/team']) await h.go(indirizzo);
    const dopoSchede = await basi();
    await h.page.evaluate(() => Promise.all(['syncroflow', 'WatermelonIDBChecker'].map((n) => new Promise((r) => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => r(); }))));
    await h.page.goto(require('./lib.cjs').APP); await h.page.waitForTimeout(300);
    await h.page.reload(); await h.page.waitForTimeout(4000);
    const ricarica = { messaggi: [...tutti], basi: await basi() };
    // La Chat senza card di prodotti non lo crea; con un messaggio di prodotti (come «Invia selezione») sì
    await h.go('chat');
    const chatSoloTesto = await basi();
    await h.page.evaluate(() => localStorage.setItem('chat_messages', JSON.stringify([
      { id: 'ind-1', payload: { skus: ['VIS-0142'], automationIds: [], text: 'Controlla questo articolo' }, createdAt: '2026-11-23T08:00:00.000Z', isOwn: false }])));
    await h.go('chat');
    const chatConCard = { basi: await basi(), card: await h.has('VIS-0142', true) };
    const ok = !dopoAvvio.length && !dopoSchede.length && !ricarica.messaggi.length && !ricarica.basi.length && !chatSoloTesto.length
      && chatConCard.basi.includes('syncroflow') && chatConCard.card;
    return { ok, dopoAvvio, dopoSchede, ricarica, chatSoloTesto, chatConCard };
  });

  // 7. Il modo più comune di uscire sul web: tasto del browser fino alla scelta della posizione, poi ancora, «OK» alla
  // domanda → Automazioni, Conta smontata, una finestra sola, niente scritto; l'indirizzo non torna alla Conta
  await run('ind-conta-browser-esci', async (h) => {
    const fin = finestre(h.page);
    await prepara(h);
    const prima = JSON.stringify(await h.products(0));
    await h.tab('Automazioni');
    await h.click('Conta Magazzino');
    await label(h, 'Conta Magazzino').click(); await h.page.waitForTimeout(500);
    await label(h, 'Contata VIS-0098').fill('3');
    await h.page.goBack(); await h.page.waitForTimeout(1500);
    const posizione = await stato(h);
    await h.page.goBack(); await h.page.waitForTimeout(1500);
    const uscita = { ...(await stato(h)), finestre: [...fin] };
    await h.page.waitForTimeout(1500);
    uscita.percorsoDopo = u.percorso(h.page);
    const nienteScritto = JSON.stringify(await h.products(0)) === prima;
    const ok = posizione.passo === 'posizione' && posizione.percorso === '/automations/count' && uscita.passo === 'fuori'
      && uscita.percorso === '/automations' && uscita.percorsoDopo === '/automations' && uscita.conta === 0 && uscita.finestre.length === 1 && nienteScritto;
    return { ok, posizione, uscita, nienteScritto };
  }, { dialogs: ['ok'] });

  // 8. Conta non in primo piano (Audit aperto dall'avviso dei pezzi unici) tolta da un salto indietro di due voci del
  // browser (`history.go(-2)`, come il menu del tasto Indietro): con quantità scritte si chiede (OK esce, Annulla resta
  // nella Conta con la quantità); senza quantità si esce senza domanda. Mai un passo indietro nascosto che blocca.
  const sottoAudit = async (h, scrivi) => {
    const fin = finestre(h.page);
    // VIS-0142 (pezzo unico) in Magazzino: nell'elenco compare l'avviso che apre l'Audit (una ricarica sola, in prepara)
    await h.page.evaluate(() => {
      const list = JSON.parse(localStorage.getItem('inventory:v1:local:products'));
      list.find((x) => x.sku === 'VIS-0142').location = 'magazzino';
      localStorage.setItem('inventory:v1:local:products', JSON.stringify(list));
    });
    await prepara(h);
    await h.tab('Automazioni');
    await h.click('Conta Magazzino');
    await label(h, 'Conta Magazzino').click(); await h.page.waitForTimeout(500);
    if (scrivi) await label(h, 'Contata VIS-0098').fill('3');
    await label(h, 'Apri Audit Posizione').click(); await h.page.waitForTimeout(1200);
    const audit = { percorso: u.percorso(h.page), visibile: await h.has('Inizia Inventario', true) };
    await h.page.evaluate(() => window.history.go(-2)); await h.page.waitForTimeout(2500);
    const dopo = {
      ...(await stato(h)), audit: await u.montate(h.page, 'Inizia Inventario'), finestre: [...fin],
      scritto: await label(h, 'Contata VIS-0098').inputValue().catch(() => null),
    };
    return { audit, dopo };
  };
  await run('ind-conta-sotto-esci', async (h) => {
    const r = await sottoAudit(h, true);
    const ok = r.audit.visibile && r.dopo.finestre.length === 1 && /Uscire dalla conta/.test(r.dopo.finestre[0])
      && r.dopo.passo === 'fuori' && r.dopo.percorso === '/automations' && r.dopo.conta === 0 && r.dopo.audit === 0;
    return { ok, ...r };
  }, { dialogs: ['ok'] });
  await run('ind-conta-sotto-annulla', async (h) => {
    const r = await sottoAudit(h, true);
    const ok = r.audit.visibile && r.dopo.finestre.length === 1 && r.dopo.passo === 'elenco' && r.dopo.scritto === '3'
      && r.dopo.percorso === '/automations/count' && r.dopo.audit === 0;
    return { ok, ...r };
  }, { dialogs: ['cancel'] });
  await run('ind-conta-sotto-vuota', async (h) => {
    const r = await sottoAudit(h, false);
    const ok = r.audit.visibile && r.dopo.finestre.length === 0 && r.dopo.passo === 'fuori' && r.dopo.percorso === '/automations' && r.dopo.conta === 0 && r.dopo.audit === 0;
    return { ok, ...r };
  });
})();
