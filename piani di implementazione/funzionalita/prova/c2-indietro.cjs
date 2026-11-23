// C2 (ticket 21, IND-P1 IND-P2 IND-P3): freccia Indietro dopo un indirizzo aperto o ricaricato. Scenari del
// resoconto `verifica-indietro-icone.md` («Come si proverebbe» 1-7). Tutti partono da `h.go`, cioè da una ricarica.
// Indirizzi letti da `src/navigation/linking.ts`; scheda madre attesa dalla tabella dei menu di `c2-util.cjs`.
// Ogni scenario restituisce `ok` (vero se tutto torna) e le righe che non tornano in `rosse`.
// Uso: node c2-indietro.cjs [nome-scenario]   (senza argomento li esegue tutti)
const { scenario } = require('./lib.cjs');
const u = require('./c2-util.cjs');
const { scan } = require('./a3-util.cjs');

const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
// Messaggi GO_BACK in console (azione Indietro senza una schermata sotto)
const goBacks = (page) => { const l = []; page.on('console', (m) => { if (/GO_BACK/.test(m.text())) l.push(m.text()); }); return l; };
// Pulsanti di ritorno in basso quando in alto non c'è nulla (Scheda, Modifica, automazione non trovata)
const IN_BASSO = ['Indietro', 'Annulla', 'Torna Indietro', 'Chiudi'];
const apri = (indirizzo) => (indirizzo === 'scanner-action' ? 'scanner-action?type=product&id=cmp-1' : u.daAprire(indirizzo));

async function torna(h) {
  // Campi Personalizzati da `settings/categories` si apre con l'editor dei valori sopra: prima si chiude quello
  const chiudi = h.page.locator('[aria-label="Chiudi i valori di Tipo di pelle"]').locator('visible=true');
  if (await chiudi.count()) { await chiudi.first().click(); await h.page.waitForTimeout(500); }
  let tocco = await u.toccaIndietro(h.page);
  if (!tocco) {
    for (const t of IN_BASSO) {
      if (await h.has(t, true)) { await h.vis(t).click(); tocco = t; break; }
    }
  }
  await h.page.waitForTimeout(1200);
  return tocco;
}

(async () => {
  // 1. Ogni indirizzo interno aperto direttamente: freccia presente, il tocco porta alla scheda madre, 0 GO_BACK.
  // Lo Scanner non ha freccia (IND-3, fetta IND): si controlla solo che sotto ci sia Automazioni.
  await run('c2-ind-diretto', async (h) => {
    const gb = goBacks(h.page);
    const righe = [];
    const rosse = [];
    for (const { nome, indirizzo } of u.indirizzi()) {
      const madre = u.MADRE[indirizzo];
      const atteso = u.PERCORSO_MADRE[madre];
      const g0 = gb.length;
      await h.go(apri(indirizzo));
      const f = await u.frecce(h.page);
      if (nome === 'Scanner') {
        // «Centro Automazioni» è nel documento (scheda montata) ma non a video (nascosta sotto lo Scanner)
        const sotto = await h.page.evaluate(() => document.body.textContent.includes('Centro Automazioni') && !document.body.innerText.includes('Centro Automazioni'));
        const riga = `${indirizzo}: senza freccia (IND-P4), Automazioni montata sotto ${sotto}`;
        righe.push(riga);
        if (!sotto) rosse.push(riga);
        continue;
      }
      const tocco = await torna(h);
      const dopo = u.percorso(h.page);
      const riga = `${indirizzo}: ${tocco || 'nessuna freccia'} → ${dopo} (madre ${atteso})${gb.length - g0 ? ` GO_BACK ${gb.length - g0}` : ''}${f.notFound ? ' NotFound' : ''}`;
      righe.push(riga);
      if (!tocco || dopo !== atteso || gb.length > g0 || f.notFound) rosse.push(riga);
    }
    return { ok: rosse.length === 0, indirizzi: righe.length, rosse, righe };
  }, { dialogs: Array(10).fill('ok') });

  // 2. Impostazioni › Categorie dal menu, poi ricarica: la freccia c'è ancora e porta a Impostazioni
  await run('c2-ind-ricarica', async (h) => {
    const gb = goBacks(h.page);
    await h.go('settings');
    await h.click('Categorie');
    const dalMenu = { percorso: u.percorso(h.page), freccia: (await u.frecce(h.page)).nativa.length };
    await h.page.reload(); await h.page.waitForTimeout(2200);
    const dopoRicarica = { percorso: u.percorso(h.page), freccia: (await u.frecce(h.page)).nativa.length };
    const tocco = await torna(h);
    const dopo = u.percorso(h.page);
    const ok = dalMenu.percorso === '/settings/folders' && dopoRicarica.freccia === 1 && tocco === 'nativa' && dopo === '/settings' && gb.length === 0;
    return { ok, dalMenu, dopoRicarica, tocco, dopo, goBack: gb.length };
  });

  // 3. Team, Chat e Crea automazione ricaricati: niente «Page Not Found» (P29, AU-V11)
  await run('c2-ind-p29', async (h) => {
    const titoli = { 'settings/team': 'Team & Accesso', chat: 'Chat Operativa', 'settings/automation-builder': 'Nuova Automazione' };
    const esiti = {};
    for (const [indirizzo, titolo] of Object.entries(titoli)) {
      await h.go(indirizzo);
      await h.page.reload(); await h.page.waitForTimeout(2200);
      esiti[indirizzo] = { notFound: await h.has('Page Not Found', true), titolo: await h.has(titolo, true), percorso: u.percorso(h.page) };
    }
    // Crea automazione da un indirizzo con editId (come lo apre AutomationFlowScreen): il parametro arriva
    await h.go('settings/automation-builder?editId=inesistente');
    esiti.editId = { notFound: await h.has('Page Not Found', true), titolo: await h.has('Nuova Automazione', true) };
    const ok = Object.values(esiti).every((e) => !e.notFound && e.titolo);
    return { ok, esiti };
  });

  // 4. Azione rapida aperta dall'indirizzo: «SPOSTATO» › «Conferma» › «OK» e «Chiudi» senza GO_BACK
  await run('c2-ind-azione-rapida', async (h) => {
    const gb = goBacks(h.page);
    await h.go('scanner-action?type=product&id=cmp-1');
    await h.click('SPOSTATO');
    await h.click('Magazzino');
    await h.click('Conferma Spostamento');
    await h.page.waitForTimeout(800);
    const p = (await h.products()).find((x) => x.id === 'cmp-1');
    const dopoSposta = u.percorso(h.page);
    const g1 = gb.length;
    await h.go('scanner-action?type=library&id=pellicce');
    await h.click('Chiudi');
    const dopoChiudi = u.percorso(h.page);
    const ok = p.location === 'magazzino' && dopoSposta === '/automations' && dopoChiudi === '/automations' && gb.length === 0;
    return { ok, posizione: p.location, dopoSposta, goBackSposta: g1, dopoChiudi, goBack: gb.length };
  });

  // 5. Modifica aperta dall'indirizzo: «Salva Modifiche» › «OK» lascia la Modifica senza GO_BACK
  await run('c2-ind-modifica', async (h) => {
    const gb = goBacks(h.page);
    await h.go('product/edit/cmp-1');
    await h.click('Salva Modifiche');
    await h.page.waitForTimeout(1000);
    const dopo = u.percorso(h.page);
    const ancoraInModifica = await h.has('Salva Modifiche', true);
    return { ok: dopo === '/' && !ancoraInModifica && gb.length === 0, dopo, ancoraInModifica, goBack: gb.length };
  }, { dialogs: ['ok'] });

  // 6. Scanner › lettura «pellicce» › «VEDI PRODOTTI»: una sola barra delle schede, Scanner e Azione rapida non più montati,
  // Home filtrata su Pellicce (IND-P3, IND-5). Anche dall'indirizzo diretto dell'Azione rapida.
  await run('c2-ind-vedi-prodotti', async (h) => {
    // Lettura simulata (`scan` di a3-util): l'inserimento a mano dello Scanner trova solo i prodotti
    await h.go('scanner');
    await scan(h, 'pellicce', { wait: 1500 });
    const azione = await h.has('VEDI PRODOTTI', true);
    await h.click('VEDI PRODOTTI');
    await h.page.waitForTimeout(800);
    const visibili = () => h.page.evaluate(() => [...document.querySelectorAll('div')]
      .filter((d) => d.childElementCount === 0 && /^[A-Z]{3}-\d{4}$/.test(d.textContent || '') && d.offsetParent).map((d) => d.textContent).sort());
    const skus = await visibili();
    const dalloScanner = {
      azione, percorso: u.percorso(h.page), barre: await u.barre(h.page),
      scanner: await u.montate(h.page, 'Scanner QR/Barcode'), azioneRapida: await u.montate(h.page, 'VEDI PRODOTTI'), skus,
    };
    await h.go('scanner-action?type=library&id=pellicce');
    await h.click('VEDI PRODOTTI');
    await h.page.waitForTimeout(800);
    const diretto = { percorso: u.percorso(h.page), barre: await u.barre(h.page), azioneRapida: await u.montate(h.page, 'VEDI PRODOTTI'), skus: await visibili() };
    // Seconda volta, senza ricaricare: con `popTo` la Home è la stessa di prima. Si sceglie un'altra categoria, si torna
    // allo Scanner dall'icona di Automazioni e si rilegge «pellicce»: la Home deve tornare su Pellicce
    await h.click('Collezione Inverno');
    const dopoChip = await visibili();
    await h.tab('Automazioni');
    await h.page.evaluate(() => {
      const g = [...document.querySelectorAll('div')].find((d) => d.childElementCount === 0 && d.textContent === String.fromCodePoint(0xf206) && d.offsetParent);
      g.click();
    });
    await h.page.waitForTimeout(1200);
    await scan(h, 'pellicce', { wait: 1500 });
    await h.click('VEDI PRODOTTI');
    await h.page.waitForTimeout(800);
    const secondaVolta = { chipPrima: dopoChip, skus: await visibili(), barre: await u.barre(h.page), scanner: await u.montate(h.page, 'Scanner QR/Barcode') };
    const pellicce = JSON.stringify(['PUZ-0012', 'VIS-0098', 'VOL-0087']);
    const ok = dalloScanner.barre === 1 && dalloScanner.scanner === 0 && dalloScanner.azioneRapida === 0
      && JSON.stringify(skus) === pellicce && diretto.barre === 1 && diretto.azioneRapida === 0 && JSON.stringify(diretto.skus) === pellicce
      && JSON.stringify(dopoChip) !== pellicce && JSON.stringify(secondaVolta.skus) === pellicce && secondaVolta.barre === 1 && secondaVolta.scanner === 0;
    return { ok, dalloScanner, diretto, secondaVolta };
  });

  // 7. Indirizzo sconosciuto › «Return Home»: una sola barra delle schede montata, NotFound tolta (IND-P3)
  await run('c2-ind-notfound', async (h) => {
    await h.go('inesistente');
    const prima = await h.has('Page Not Found', true);
    await h.click('Return Home');
    const dopo = { percorso: u.percorso(h.page), barre: await u.barre(h.page), notFound: await u.montate(h.page, 'Page Not Found') };
    return { ok: prima && dopo.percorso === '/' && dopo.barre === 1 && dopo.notFound === 0, prima, dopo };
  });

  // 8. Aprire direttamente ogni indirizzo (la Home o la scheda madre montata sotto) non scrive nessuna chiave salvata.
  // Eccezione attesa: la Chat salva il suo storico (`chat_messages`) appena si apre, anche dal menu (ChatScreen.tsx:68-71).
  await run('c2-ind-nessuna-scrittura', async (h) => {
    const cambiate = {};
    let prima = await u.snapshot(h.page);
    for (const indirizzo of ['', 'settings', 'automations', ...u.indirizzi().map((r) => r.indirizzo)]) {
      await h.go(apri(indirizzo));
      await h.page.waitForTimeout(800);
      const dopo = await u.snapshot(h.page);
      const k = u.changedKeys(prima, dopo);
      if (k.length) cambiate[indirizzo || '/'] = k;
      prima = dopo;
    }
    const inattese = Object.entries(cambiate).filter(([i, k]) => !(i === 'chat' && k.join() === 'chat_messages'));
    return { ok: inattese.length === 0, cambiate };
  });
})();
