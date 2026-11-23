// GAL (ticket 27): galleria delle foto in Scheda, visore, Modifica e Aggiungi; prezzo 0, note vuote e foto rotte nella
// Scheda. VIS-0142 (cmp-1) ha 3 foto data: di lunghezza diversa: la foto che si vede si riconosce dal suo indirizzo,
// confrontato con l'elenco salvato (come `ci-galleria.cjs` delle verifiche del 23).
// Su HEAD (prima di GAL) i comandi nuovi non ci sono: gli scenari dicono che cosa manca (`manca`) e restano rossi;
// «gal-modifica-elimina» usa allora il cestino sulla foto che si vede, per riprodurre CSV-G1 e CSV-G6.
// Uso dalla cartella prova/: SHOTS=<cartella> node gal-galleria.cjs [parte del nome di uno scenario]
const { scenario } = require('./lib.cjs');
const { dump, press, textOf, clickAt } = require('./a1-util.cjs');
const { PERCORSI, CON_PERCORSI, fotoIn, quale, centro, tocca, conta, prepara, prezziScheda, openEdit } = require('./gal-util.cjs');

const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const ROTTA = 'data:image/jpeg;base64,QUJDRA=='; // non è un JPEG: il browser non la decodifica (come un link rotto)
const salvato = async (h, id = 'cmp-1') => (await h.products()).find((p) => p.id === id);

(async () => {
  const seed = await (await fetch('http://localhost:8765/seed.json')).json();
  const vis = seed['inventory:v1:{org}:products'].find((p) => p.sku === 'VIS-0142');
  const FOTO = vis.images;
  const DETT = vis.customData.find((c) => c.fieldSnapshot.type === 'images').value;
  const nome = (src) => quale(src, FOTO);

  // 1. Scheda: miniature (CSV-G2). La 3 porta alla foto 3, la 1 torna alla 1.
  await run('gal-scheda-miniature', async (h) => {
    const { page } = h;
    await h.click('VIS-0142'); await page.waitForTimeout(1200);
    const c = await centro(page);
    const stato = async () => `${await textOf(page, /^\d\/3$/)} ${nome(await fotoIn(page, c.x, c.y))}`;
    const out = { miniature: 0, inizio: await stato() };
    for (let i = 1; i <= 3; i += 1) out.miniature += await conta(page, `Mostra la foto ${i}`);
    if (!(await tocca(page, 'Mostra la foto 3'))) return { ok: false, ...out, manca: 'miniature nella Scheda' };
    out.dopo3 = await stato();
    await tocca(page, 'Mostra la foto 1');
    out.dopo1 = await stato();
    await h.shot('miniature');
    return { ok: out.miniature === 3 && out.inizio === '1/3 foto 1' && out.dopo3 === '3/3 foto 3' && out.dopo1 === '1/3 foto 1', ...out };
  });

  // 2. Scheda: frecce ‹ ›, puntini e tastiera ←/→ (CSV-G2)
  await run('gal-scheda-frecce', async (h) => {
    const { page } = h;
    await h.click('VIS-0142'); await page.waitForTimeout(1200);
    const c = await centro(page);
    const stato = async () => `${await textOf(page, /^\d\/3$/)} ${nome(await fotoIn(page, c.x, c.y))}`;
    const out = { precedenteAllInizio: await conta(page, 'Foto precedente') };
    if (!(await tocca(page, 'Foto successiva'))) return { ok: false, ...out, manca: 'frecce nella Scheda' };
    out.avanti1 = await stato();
    await tocca(page, 'Foto successiva');
    out.avanti2 = await stato();
    out.successivaAllaFine = await conta(page, 'Foto successiva');
    await tocca(page, 'Foto precedente');
    out.indietro = await stato();
    await tocca(page, 'Vai alla foto 1');
    out.puntino1 = await stato();
    await h.vis('VIS-0142').click(); await page.waitForTimeout(300); // fuoco fuori dalla foto (nessun campo di testo)
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(700);
    out.destra = await stato();
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(700);
    out.destra2 = await stato();
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(700);
    out.sinistra = await stato();
    const ok = out.precedenteAllInizio === 0 && out.avanti1 === '2/3 foto 2' && out.avanti2 === '3/3 foto 3' && out.successivaAllaFine === 0
      && out.indietro === '2/3 foto 2' && out.puntino1 === '1/3 foto 1' && out.destra === '2/3 foto 2' && out.destra2 === '3/3 foto 3' && out.sinistra === '2/3 foto 2';
    return { ok, ...out };
  });

  // 2b. Tastiera solo con la Scheda in primo piano: sotto Modifica la Scheda resta montata e non deve muoversi
  await run('gal-tastiera-nascosta', async (h) => {
    const { page } = h;
    await h.click('VIS-0142'); await page.waitForTimeout(1200);
    const c = await centro(page);
    await press(page, /^.?\s*Modifica$/); await page.waitForTimeout(1200);
    await page.getByText('Modifica prodotto', { exact: true }).first().click(); await page.waitForTimeout(300);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(500);
    const modulo = await textOf(page, /^\d \/ \d$/);
    await press(page, /^.?\s*Annulla$|^.?\s*Indietro$/).catch(() => page.goBack());
    await page.waitForTimeout(1200);
    const scheda = `${await textOf(page, /^\d\/3$/)} ${quale(await fotoIn(page, c.x, c.y), (await salvato(h)).images)}`;
    return { ok: modulo === '1 / 3' && scheda === '1/3 foto 1', modulo, scheda };
  });

  // 3. Visore: frecce, ←/→ ed Esc (CSV-G3); la Scheda resta sulla foto vista per ultima; le foto del campo «Foto
  //    dettagli» si aprono nello stesso visore
  await run('gal-visore', async (h) => {
    const { page } = h;
    await h.click('VIS-0142'); await page.waitForTimeout(1200);
    const out = {};
    if (!(await tocca(page, 'Mostra la foto 2'))) return { ok: false, manca: 'miniature nella Scheda' };
    const c = await centro(page);
    await clickAt(page, c.x, c.y, 1300);
    const v = async (re = /^\d \/ 3$/) => { const cv = await centro(page, true); return `${await textOf(page, re)} ${nome(await fotoIn(page, cv.x, cv.y))}`; };
    out.aperto = await v();
    out.frecceVisore = await page.locator('[aria-label="Foto successiva"]').locator('visible=true').count();
    if (!(await tocca(page, 'Foto successiva', true))) return { ok: false, ...out, manca: 'frecce nel visore' };
    out.freccia = await v();
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(700);
    out.sinistra = await v();
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(700);
    out.sinistra2 = await v();
    await h.shot('visore');
    await page.keyboard.press('Escape'); await page.waitForTimeout(900);
    out.chiusoConEsc = !(await textOf(page, /^\d \/ 3$/));
    out.schedaDopo = `${await textOf(page, /^\d\/3$/)} ${nome(await fotoIn(page, c.x, c.y))}`;
    // Foto dettagli (campo «immagini», 2 foto)
    const det = page.locator('[aria-label="Apri la foto 2 di Foto dettagli"]').locator('visible=true');
    if (await det.count()) {
      await det.first().scrollIntoViewIfNeeded(); await det.first().click(); await page.waitForTimeout(1300);
      const cv = await centro(page, true);
      out.dettagli = `${await textOf(page, /^\d \/ 2$/)} ${quale(await fotoIn(page, cv.x, cv.y), DETT)}`;
      await page.keyboard.press('Escape'); await page.waitForTimeout(900);
      out.dettagliChiuso = !(await textOf(page, /^\d \/ 2$/));
    }
    const ok = out.aperto === '2 / 3 foto 2' && out.freccia === '3 / 3 foto 3' && out.sinistra === '2 / 3 foto 2' && out.sinistra2 === '1 / 3 foto 1'
      && out.chiusoConEsc && out.schedaDopo === '1/3 foto 1' && out.dettagli === '2 / 2 foto 2' && out.dettagliChiuso;
    return { ok, ...out };
  });

  // 4. Modifica: sceglie la 3 ed elimina (CSV-G1) → restano la 1 e la 2, con `storageImagePaths` allineati (CSV-G6)
  await run('gal-modifica-elimina', async (h) => {
    const { page } = h;
    const bloccate = await prepara(h, CON_PERCORSI, PERCORSI, { cloud: true });
    await openEdit(h);
    const c = await centro(page);
    const stato = async () => `${await textOf(page, /^\d \/ \d$/)} ${nome(await fotoIn(page, c.x, c.y))}`;
    const out = { inizio: await stato() };
    let elimina = `Elimina la foto 3`;
    if (await tocca(page, 'Mostra la foto 3')) {
      out.dopo3 = await stato();
      out.elimina = await tocca(page, elimina);
    } else {
      // HEAD: miniatura senza nome (riquadri quadrati sotto la foto) e un cestino su ogni foto
      const box = await page.evaluate(([x, y]) => { const r = document.elementsFromPoint(x, y).find((e) => e.getBoundingClientRect().width > 250).getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }, [c.x, c.y]);
      const th = (await dump(page)).filter((b) => !b.text && b.y > box.bottom && b.y < box.bottom + 150 && Math.abs(b.w - b.h) < 8 && b.w > 40);
      if (th[2]) { await clickAt(page, th[2].x, th[2].y, 900); out.dopo3 = await stato(); }
      const del = (await dump(page)).filter((b) => b.y > box.top && b.y < box.top + 80 && b.x > 250 && b.x < 375 && b.w < 60);
      elimina = 'cestino sulla foto che si vede (HEAD)';
      if (del[0]) { await clickAt(page, del[0].x, del[0].y, 900); out.elimina = elimina; }
    }
    out.dopoElimina = await stato();
    await press(page, /Salva Modifiche/); await page.waitForTimeout(1200);
    const p = await salvato(h);
    out.salvate = p.images.map(nome);
    out.percorsi = p.storageImagePaths;
    out.richiesteSupabaseBloccate = bloccate.n;
    const ok = out.dopo3 === '3 / 3 foto 3' && out.dopoElimina === '2 / 2 foto 2' && out.salvate.join() === 'foto 1,foto 2'
      && JSON.stringify(out.percorsi) === JSON.stringify(PERCORSI.slice(0, 2));
    return { ok, ...out };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 4b. Modifica: la foto 2 portata con la rotella (non con la miniatura): il cestino è quello della 2 e toglie la 2
  await run('gal-modifica-rotella', async (h) => {
    const { page } = h;
    const bloccate = await prepara(h, CON_PERCORSI, PERCORSI, { cloud: true });
    await openEdit(h);
    const c = await centro(page);
    const stato = async () => `${await textOf(page, /^\d \/ \d$/)} ${nome(await fotoIn(page, c.x, c.y))}`;
    await page.mouse.move(c.x, c.y); await page.mouse.wheel(343, 0); await page.waitForTimeout(1000);
    const out = { dopoRotella: await stato(), cestino2: await conta(page, 'Elimina la foto 2') };
    out.elimina = await tocca(page, 'Elimina la foto 2');
    out.dopoElimina = await stato();
    await press(page, /Salva Modifiche/); await page.waitForTimeout(1200);
    const p = await salvato(h);
    out.salvate = p.images.map(nome);
    out.percorsi = p.storageImagePaths;
    out.richiesteSupabaseBloccate = bloccate.n;
    const ok = out.dopoRotella === '2 / 3 foto 2' && out.cestino2 === 1 && out.dopoElimina === '2 / 2 foto 3'
      && out.salvate.join() === 'foto 1,foto 3' && JSON.stringify(out.percorsi) === JSON.stringify([PERCORSI[0], PERCORSI[2]]);
    return { ok, ...out };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 5. Modifica: «Metti come principale» sulla 3 → images[0] = foto 3, percorsi spostati insieme; la Scheda parte dalla 3
  await run('gal-principale', async (h) => {
    const { page } = h;
    const bloccate = await prepara(h, CON_PERCORSI, PERCORSI, { cloud: true });
    await openEdit(h);
    const c = await centro(page);
    const stato = async () => `${await textOf(page, /^\d \/ \d$/)} ${nome(await fotoIn(page, c.x, c.y))}`;
    const out = { principaleAllaPrima: await h.has('Metti come principale', true) };
    if (!(await tocca(page, 'Mostra la foto 3'))) return { ok: false, ...out, manca: 'miniature con nome in Modifica' };
    if (!(await h.has('Metti come principale', true))) return { ok: false, ...out, manca: '«Metti come principale»' };
    await h.click('Metti come principale');
    out.dopo = await stato();
    await press(page, /Salva Modifiche/); await page.waitForTimeout(1200);
    const p = await salvato(h);
    out.salvate = p.images.map(nome);
    out.percorsi = p.storageImagePaths;
    out.cronologia = (await h.timeline(0)).filter((e) => e.productId === 'cmp-1' && e.type === 'modified').map((e) => e.details.changes.join(' | '))[0];
    await h.go('product/cmp-1');
    const cs = await centro(page);
    out.scheda = `${await textOf(page, /^\d\/3$/)} ${nome(await fotoIn(page, cs.x, cs.y))}`;
    out.richiesteSupabaseBloccate = bloccate.n;
    const ok = !out.principaleAllaPrima && out.dopo === '1 / 3 foto 3' && out.salvate.join() === 'foto 3,foto 1,foto 2'
      && JSON.stringify(out.percorsi) === JSON.stringify([PERCORSI[2], PERCORSI[0], PERCORSI[1]]) && out.scheda === '1/3 foto 3';
    return { ok, ...out };
  }, { dialogs: ['ok', 'ok'] });

  // 6. Modifica: «Sposta ›» due volte e «‹ Sposta» una: la foto 1 va in seconda posizione, il contatore la segue
  await run('gal-sposta', async (h) => {
    const { page } = h;
    const bloccate = await prepara(h, CON_PERCORSI, PERCORSI, { cloud: true });
    await openEdit(h);
    const c = await centro(page);
    const stato = async () => `${await textOf(page, /^\d \/ \d$/)} ${nome(await fotoIn(page, c.x, c.y))}`;
    if (!(await h.has('Sposta ›', true))) return { ok: false, manca: '«Sposta ›»' };
    const out = {};
    await h.click('Sposta ›'); out.destra = await stato();
    await h.click('Sposta ›'); out.destra2 = await stato();
    await h.click('‹ Sposta'); out.sinistra = await stato();
    await press(page, /Salva Modifiche/); await page.waitForTimeout(1200);
    const p = await salvato(h);
    out.salvate = p.images.map(nome);
    out.percorsi = p.storageImagePaths;
    out.richiesteSupabaseBloccate = bloccate.n;
    const ok = out.destra === '2 / 3 foto 1' && out.destra2 === '3 / 3 foto 1' && out.sinistra === '2 / 3 foto 1'
      && out.salvate.join() === 'foto 2,foto 1,foto 3' && JSON.stringify(out.percorsi) === JSON.stringify([PERCORSI[1], PERCORSI[0], PERCORSI[2]]);
    return { ok, ...out };
  }, { dialogs: ['ok', 'ok'] });

  // 7. Aggiungi: 3 foto dalla scelta file; la miniatura 3 porta alla foto 3; il cestino toglie la foto scelta (CSV-G1)
  await run('gal-aggiungi', async (h) => {
    const { page } = h;
    await h.go('add');
    const chooser = page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
    await h.click('Importa');
    const fc = await chooser;
    if (!fc) return { ok: false, filechooser: false };
    await fc.setFiles(FOTO.map((u, i) => ({ name: `foto${i + 1}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(u.split(',')[1], 'base64') })));
    await page.waitForTimeout(1500);
    const c = await centro(page);
    // indirizzi delle tre foto, nell'ordine delle miniature
    const miniature = [];
    for (let i = 1; i <= 3; i += 1) {
      const l = page.locator(`[aria-label="Mostra la foto ${i}"]`).locator('visible=true');
      if (!(await l.count())) return { ok: false, manca: 'miniature con nome in Aggiungi' };
      const b = await l.first().boundingBox();
      miniature.push(await fotoIn(page, b.x + b.width / 2, b.y + b.height / 2));
    }
    const out = { etichetta: await textOf(page, /^Foto prodotto/) };
    await tocca(page, 'Mostra la foto 3');
    out.dopo3 = `${await textOf(page, /^\d \/ \d$/)} ${quale(await fotoIn(page, c.x, c.y), miniature)}`;
    out.elimina = await tocca(page, 'Elimina la foto 3');
    out.dopoElimina = `${await textOf(page, /^\d \/ \d$/)} ${quale(await fotoIn(page, c.x, c.y), miniature)}`;
    await h.click('Visone'); await h.click('Vetrina'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    await page.waitForTimeout(1500);
    const p = (await h.products())[0];
    out.salvate = (p.images || []).map((u) => quale(u, miniature));
    const ok = out.dopo3 === '3 / 3 foto 3' && out.dopoElimina === '2 / 2 foto 2' && out.salvate.join() === 'foto 1,foto 2';
    return { ok, ...out };
  }, { dialogs: ['1', 'ok', 'ok', 'ok'] });

  // 8. Scheda: prezzo d'acquisto 0 (CSV-I6) e note vuote (CSV-I7): nessuno «0» isolato, nessun avviso in console
  await run('gal-prezzo-zero', async (h) => {
    const { page } = h;
    await prepara(h, "Object.assign(list.find((p) => p.id === 'cmp-5'), { purchasePrice: 0, technicalNotes: '' }); Object.assign(list.find((p) => p.id === 'cmp-6'), { purchasePrice: 0, sellPrice: 0 });");
    const prezzi = () => prezziScheda(page);
    await h.go('product/cmp-5');
    const out = { vis0098: await prezzi(), noteTecniche: await h.has('Note tecniche', true) };
    await h.go('product/cmp-6');
    out.puz0012 = await prezzi();
    const ok = out.vis0098 === 'Prezzi Acquisto 0 € Vendita 3.800 €' && !out.noteTecniche && out.puz0012 === 'Prezzi Acquisto 0 € Vendita 0 €';
    return { ok, ...out };
  });

  // 9. Scheda: foto che non si carica (link rotto, CSV-I8) → riquadro «Foto non disponibile»; la foto buona si vede
  await run('gal-foto-rotta', async (h) => {
    const { page } = h;
    await prepara(h, "list.find((p) => p.id === 'cmp-2').images = [a, list.find((p) => p.id === 'cmp-2').images[0]];", ROTTA);
    await h.go('product/cmp-2');
    await page.waitForTimeout(800);
    const out = { riquadro: await conta(page, 'Foto non disponibile'), testo: await h.has('Foto non disponibile', true) };
    await h.shot('rotta');
    if (await tocca(page, 'Foto successiva')) {
      const c = await centro(page);
      const src = await fotoIn(page, c.x, c.y);
      out.seconda = `${await textOf(page, /^\d\/2$/)} ${src && src.length > 1000 ? 'foto buona' : src}`;
    }
    return { ok: out.riquadro >= 1 && out.testo && out.seconda === '2/2 foto buona', ...out };
  });
})();
