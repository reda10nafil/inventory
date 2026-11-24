// CAT1 (ticket 33): Impostazioni › Categorie semplice. Casi 1-11 di cat0/proposta.md: in cima solo il nome, l'albero
// con la freccia, «+ Sottocategoria» sulla riga di una principale (CF-B1), la finestra della categoria nel punto dove
// si è («Dove sta», codice di prima, Elimina), Elimina che chiede dove spostare i prodotti («Sposta ed elimina», con la
// Cronologia; «Annulla» non cambia nulla), rifiuti con sottocategorie (l'albero si apre) e con uno scaffale.
// Ogni scenario legge lo stato salvato.
// Uso: node cat1-categorie.cjs [nome-scenario]   (senza argomento li esegue tutti)
const { scenario, apriTendinaCon } = require('./lib.cjs');
const { chiudiCodice } = require('./eti-util.cjs');

const L = 'inventory:v1:local:libraries';
const P = 'inventory:v1:local:products';
const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);

// Riga di una categoria (contiene «ID: x») ed elementi con un'etichetta esatta, solo quelli a video
const row = (h, id) => h.page.locator('[tabindex="0"]').filter({ hasText: new RegExp(`ID: ${id}(?![\\w-])`) }).first();
const label = (h, text) => h.page.getByLabel(text, { exact: true }).locator('visible=true').first();
const hasLabel = async (h, text) => (await h.page.getByLabel(text, { exact: true }).locator('visible=true').count()) > 0;
const pause = (h, ms = 500) => h.page.waitForTimeout(ms);
const box = async (loc) => { const b = await loc.boundingBox(); return b && { y: Math.round(b.y), x: Math.round(b.x) }; };
// Tutto lo stato salvato tranne gli avvisi (li rigenera l'app) e le chiavi della sessione del browser (come c1)
const snapshot = (h) => h.page.evaluate(() => Object.fromEntries(Object.keys(localStorage)
  .filter((k) => k !== 'inventory:v1:local:alerts' && !k.startsWith('loki') && !k.startsWith('expo'))
  .sort().map((k) => [k, localStorage.getItem(k)])));
const changedKeys = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
const ids = (libs) => (libs || []).map((l) => (l.parentId ? `${l.id}<${l.parentId}` : l.id));

// Sottocategoria «Visone» sotto «Pellicce», con VIS-0098 dentro (come c1-categorie)
async function conVisone(h) {
  await h.page.evaluate(([lk, pk]) => {
    const libs = JSON.parse(localStorage.getItem(lk));
    libs.push({ id: 'visone', name: 'Visone', icon: 'folder', createdAt: '2026-11-24T09:00:00.000Z', parentId: 'pellicce' });
    localStorage.setItem(lk, JSON.stringify(libs));
    const list = JSON.parse(localStorage.getItem(pk));
    list.find((p) => p.sku === 'VIS-0098').libraryId = 'visone';
    localStorage.setItem(pk, JSON.stringify(list));
  }, [L, P]);
}
const crea = async (h, nome) => {
  await h.page.getByPlaceholder('Nome categoria (es: Giacche)').fill(nome);
  await h.click('Crea Categoria');
  await chiudiCodice(h); // ETI: al «OK» si apre «Codice ed etichetta» della categoria nuova
};

(async () => {
  // 1. In cima solo il nome: «Borse» compare chiusa; niente icona, codice né avviso del barcode in cima
  await run('cat1-crea', async (h) => {
    await h.go('settings/folders');
    const cima = {
      codice: await h.page.getByPlaceholder('Scansiona o Genera...').count(),
      avviso: await h.has('Il barcode verrà salvato solo se modifichi'),
      sottocategoriaDi: await h.has('Sottocategoria di', true),
      piuAllApertura: await h.has('+ Sottocategoria', true),
    };
    await crea(h, 'Borse');
    const libs = await h.store(L);
    return {
      cima, borse: libs.find((l) => l.name === 'Borse'), elenco: await h.has(`Categorie esistenti (${libs.length})`, true),
      chiusa: await hasLabel(h, 'Apri Borse'), piuSottocategoria: await hasLabel(h, 'Aggiungi una sottocategoria a Borse'),
    };
  }, { dialogs: ['ok'] });

  // 2 (CF-B1) e 3. Apro Borse, «+ Sottocategoria», «Zaini»: sotto Borse. «zaini» di nuovo: rifiutato sotto il campo
  await run('cat1-sottocategoria', async (h) => {
    await h.go('settings/folders');
    await crea(h, 'Borse');
    await label(h, 'Apri Borse').click(); await pause(h);
    await label(h, 'Aggiungi una sottocategoria a Borse').click(); await pause(h);
    await label(h, 'Nome della sottocategoria di Borse').fill('Zaini');
    await label(h, 'Aggiungi la sottocategoria a Borse').click(); await pause(h, 700);
    const libs = await h.store(L);
    const zaini = libs.find((l) => l.name === 'Zaini');
    const riga = { borse: await box(row(h, 'borse')), zaini: await box(row(h, 'zaini')), testo: (await row(h, 'zaini').innerText()).replace(/\s+/g, ' ') };
    // Doppione sotto lo stesso genitore
    await label(h, 'Aggiungi una sottocategoria a Borse').click(); await pause(h);
    await label(h, 'Nome della sottocategoria di Borse').fill('zaini');
    await label(h, 'Aggiungi la sottocategoria a Borse').click(); await pause(h, 500);
    const erroreDoppione = await h.has('"Borse" ha già la sottocategoria "Zaini"', true);
    const dopoDoppione = ids(await h.store(L, 500));
    // Lo stesso nome sotto un'altra principale va bene
    await label(h, 'Apri Pellicce').click(); await pause(h);
    await label(h, 'Aggiungi una sottocategoria a Pellicce').click(); await pause(h);
    await label(h, 'Nome della sottocategoria di Pellicce').fill('Zaini');
    await h.page.keyboard.press('Enter'); await pause(h, 700);
    const finale = ids(await h.store(L));
    // In Aggiungi: Borse › Zaini si sceglie. Da EDC la Categoria in colonna è una tendina: le scelte si cercano
    // aprendola (`apriTendinaCon` di lib.cjs, come in s1-scaffali; Unione 1)
    await h.go('add');
    await apriTendinaCon(h.page, h.page.getByLabel('Categoria Borse', { exact: true }).locator('visible=true'));
    await label(h, 'Categoria Borse').click(); await pause(h, 300);
    await apriTendinaCon(h.page, h.page.getByLabel('Sottocategoria Zaini', { exact: true }).locator('visible=true'));
    const aggiungi = { zaini: await hasLabel(h, 'Sottocategoria Zaini') };
    return {
      zaini, sotto: !!riga.zaini && !!riga.borse && riga.zaini.y > riga.borse.y && riga.zaini.x > riga.borse.x, riga: riga.testo,
      erroreDoppione, dopoDoppione, finale, aggiungi,
    };
  }, { dialogs: ['ok'] });

  // 6, 4 e 5. «Dove sta»: Pellicce con sottocategorie resta principale; Visone dentro Usato e permute; poi principale
  await run('cat1-dove-sta', async (h) => {
    await conVisone(h);
    await h.go('settings/folders');
    await row(h, 'pellicce').click(); await pause(h);
    const pellicce = { frase: await h.has('Ha delle sottocategorie: resta principale.', true), doveSta: await h.has('Dove sta', true), titolo: await h.has('Modifica categoria', true) };
    await h.click('Annulla');
    const chiusa = !(await h.has('Modifica categoria', true));
    await row(h, 'visone').click(); await pause(h);
    const scelte = await h.page.getByLabel(/^Dove sta: /).locator('visible=true').evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label').replace('Dove sta: ', '')}${e.getAttribute('aria-checked') === 'true' ? ' *' : ''}`));
    await label(h, 'Dove sta: Dentro Usato e permute').click(); await pause(h, 300);
    await h.click('Salva Modifiche');
    const dopoSposta = { libs: ids(await h.store(L)), vis: (await h.products(0)).find((p) => p.sku === 'VIS-0098').libraryId };
    const sottoUsato = { usato: await box(row(h, 'usato-e-permute')), visone: await box(row(h, 'visone')) };
    await row(h, 'visone').click(); await pause(h);
    await label(h, 'Dove sta: Categoria principale').click(); await pause(h, 300);
    await h.click('Salva Modifiche');
    const visone = (await h.store(L)).find((l) => l.id === 'visone');
    return {
      pellicce, chiusa, scelte, dopoSposta, sottoUsato: !!sottoUsato.visone && sottoUsato.visone.y > sottoUsato.usato.y,
      principale: { parentId: visone.parentId ?? null, name: visone.name }, vis: (await h.products(0)).find((p) => p.sku === 'VIS-0098').libraryId,
    };
  }, { dialogs: ['ok', 'ok'] });

  // 7. Categoria vuota: conferma ed eliminata (dalla riga e dalla finestra)
  await run('cat1-elimina-vuota', async (h) => {
    await h.go('settings/folders');
    await crea(h, 'Temporanea');
    await crea(h, 'Seconda');
    await label(h, 'Elimina Temporanea').click(); await pause(h, 600);
    const dopoRiga = ids(await h.store(L));
    await row(h, 'seconda').click(); await pause(h);
    await h.click('Elimina categoria'); await pause(h, 600);
    const dopoFinestra = ids(await h.store(L));
    return { dopoRiga, dopoFinestra, finestraChiusa: !(await h.has('Modifica categoria', true)) };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok'] });

  // 8 con «Annulla»: «Dove li sposto?», nessuna scelta di partenza, senza scelta lo dice; Annulla non cambia nulla
  await run('cat1-sposta-annulla', async (h) => {
    await h.go('settings/folders');
    const prima = await snapshot(h);
    await label(h, 'Elimina Pellicce').click(); await pause(h);
    const finestra = {
      titolo: await h.has('Elimina Pellicce', true), domanda: await h.has('Pellicce ha 3 prodotti. Dove li sposto?', true),
      pillole: await h.page.getByLabel(/^Sposta in /).locator('visible=true').evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label').replace('Sposta in ', '')}${e.getAttribute('aria-checked') === 'true' ? ' *' : ''}`)),
    };
    await h.click('Sposta ed elimina');
    const senzaScelta = { messaggio: await h.has('Scegli dove spostare i prodotti.', true), libs: ids(await h.store(L, 600)) };
    await label(h, 'Sposta in Collezione Inverno').click(); await pause(h, 300);
    await h.click('Annulla'); await pause(h);
    const chiusa = !(await h.has('Dove li sposto?'));
    // Dalla finestra: Elimina, poi Annulla torna alla modifica
    await row(h, 'pellicce').click(); await pause(h);
    await h.click('Elimina categoria'); await pause(h);
    const dallaFinestra = await h.has('Pellicce ha 3 prodotti. Dove li sposto?', true);
    await h.click('Annulla'); await pause(h);
    const tornaAModifica = await h.has('Modifica categoria', true);
    await h.click('Annulla'); await pause(h);
    const dopo = await snapshot(h);
    return { finestra, senzaScelta, chiusa, dallaFinestra, tornaAModifica, chiaviCambiate: changedKeys(prima, dopo) };
  });

  // 8. «Sposta ed elimina»: i 3 prodotti di Pellicce (uno venduto) in Collezione Inverno, la Cronologia lo scrive,
  // Pellicce sparisce nello stesso tocco (deleteLibrary subito dopo gli updateProduct); gli altri prodotti uguali
  await run('cat1-sposta-elimina', async (h) => {
    const prodPrima = await h.products(0);
    const tlPrima = await h.timeline(0);
    await h.go('settings/folders');
    await label(h, 'Elimina Pellicce').click(); await pause(h);
    await label(h, 'Sposta in Collezione Inverno').click(); await pause(h, 300);
    await h.click('Sposta ed elimina'); await pause(h, 800);
    const libs = ids(await h.store(L));
    const prod = await h.products(0);
    const tl = await h.timeline(0);
    const nuovi = tl.filter((e) => !tlPrima.some((x) => x.id === e.id)).map((e) => `${prod.find((p) => p.id === e.productId)?.sku} ${e.type} ${(e.details?.changes || []).join(' | ')}`).sort();
    const spostati = prodPrima.filter((p) => p.libraryId === 'pellicce').map((p) => `${p.sku}:${prod.find((q) => q.id === p.id).libraryId}`);
    const altriUguali = prod.filter((p) => !prodPrima.find((q) => q.id === p.id && q.libraryId === 'pellicce'))
      .every((p) => JSON.stringify(p) === JSON.stringify(prodPrima.find((q) => q.id === p.id)));
    const riga = !(await h.has('ID: pellicce', true));
    await h.go('timeline');
    const cronologia = await h.has('VOL-0087 - Categoria: pellicce → collezione-inverno', true);
    await h.go('');
    await h.click('Collezione Inverno'); await pause(h);
    const inverno = await h.page.getByText(/^\d+ prodotti$/).first().innerText();
    return { libs, spostati, nuovi, altriUguali, rigaSparita: riga, cronologia, inverno };
  }, { dialogs: ['ok'] });

  // 8 bis. «Senza categoria»: AST-0033 resta senza categoria, Usato e permute sparisce
  await run('cat1-sposta-senza', async (h) => {
    await h.go('settings/folders');
    await label(h, 'Elimina Usato e permute').click(); await pause(h);
    const domanda = await h.has('Usato e permute ha 1 prodotto. Dove li sposto?', true);
    await label(h, 'Sposta in Senza categoria').click(); await pause(h, 300);
    await h.click('Sposta ed elimina'); await pause(h, 800);
    const ast = (await h.products()).find((p) => p.sku === 'AST-0033');
    const ev = (await h.timeline(0)).filter((e) => e.productId === ast.id && e.type === 'modified').map((e) => e.details.changes.join(' | '));
    return { domanda, libs: ids(await h.store(L, 0)), ast: ast.libraryId ?? null, cronologia: ev.slice(0, 1) };
  }, { dialogs: ['ok'] });

  // 9. Pellicce con Visone dentro: rifiutata come prima; l'albero (chiuso apposta) si apre e mostra Visone col suo Elimina
  await run('cat1-rifiuto-sotto', async (h) => {
    await conVisone(h);
    await h.go('settings/folders');
    const apertaAllInizio = await hasLabel(h, 'Chiudi Pellicce');
    await label(h, 'Chiudi Pellicce').click(); await pause(h);
    const nascosta = !(await h.has('ID: visone', true));
    await label(h, 'Elimina Pellicce').click(); await pause(h, 600);
    return {
      apertaAllInizio, nascosta, libs: ids(await h.store(L, 300)), visoneVisibile: await h.has('ID: visone', true),
      eliminaVisone: await hasLabel(h, 'Elimina Visone'), doveLiSposto: await h.has('Dove li sposto?'),
    };
  }, { dialogs: ['ok'] });

  // 10. Usata da uno scaffale: rifiutata come prima (anche con un prodotto dentro: lo spostamento non basterebbe)
  await run('cat1-rifiuto-scaffale', async (h) => {
    await h.page.evaluate(() => localStorage.setItem('furinventory_shelves:local', JSON.stringify([
      { id: '1732300000000-cat1', name: 'B1', locationId: 'sartoria', libraryId: 'usato-e-permute' },
    ])));
    await h.go('settings/folders');
    await label(h, 'Elimina Usato e permute').click(); await pause(h, 600);
    return { libs: ids(await h.store(L, 300)), doveLiSposto: await h.has('Dove li sposto?') };
  }, { dialogs: ['ok'] });

  // 11. Ultima riga di un elenco lungo: la finestra si apre dove si è, col titolo dentro lo schermo
  await run('cat1-riga-in-fondo', async (h) => {
    await h.page.evaluate((lk) => {
      const libs = JSON.parse(localStorage.getItem(lk));
      for (const n of ['Giacche', 'Cappotti', 'Stole', 'Cappelli', 'Guanti', 'Accessori', 'Pelli grezze', 'Su misura']) {
        libs.push({ id: n.toLowerCase().replace(/\s+/g, '-'), name: n, icon: 'folder', createdAt: '2026-11-24T09:00:00.000Z' });
      }
      localStorage.setItem(lk, JSON.stringify(libs));
    }, L);
    await h.go('settings/folders');
    const ultima = row(h, 'su-misura');
    await ultima.scrollIntoViewIfNeeded(); await pause(h, 300);
    const scorrimento = await h.page.evaluate(() => Math.max(...[...document.querySelectorAll('div')].map((d) => d.scrollTop)));
    await ultima.click(); await pause(h, 600);
    const titolo = await box(h.page.getByText('Modifica categoria', { exact: true }).first());
    const nome = await label(h, 'Nome della categoria').inputValue();
    const salva = await box(h.page.getByText('Salva Modifiche', { exact: true }).first());
    await h.shot('finestra');
    return { scorrimento: scorrimento > 0, titoloY: titolo?.y, dentro: !!titolo && titolo.y >= 0 && titolo.y < 812, nome, salvaDentro: !!salva && salva.y < 812 };
  });

  // Rilievo del revisore (6b54ab6): albero vecchio a tre livelli (Pellicce › Visone › Lungo, dati importati). Salvare
  // Lungo e Visone cambiando solo l'icona non li sposta; Visone dice «resta dentro Pellicce», Lungo ha la sua scelta
  await run('cat1-albero-vecchio', async (h) => {
    await h.page.evaluate((lk) => {
      const libs = JSON.parse(localStorage.getItem(lk));
      libs.push({ id: 'visone', name: 'Visone', icon: 'folder', createdAt: '2026-11-24T09:00:00.000Z', parentId: 'pellicce' });
      libs.push({ id: 'lungo', name: 'Lungo', icon: 'folder', createdAt: '2026-11-24T09:00:00.000Z', parentId: 'visone' });
      libs.push({ id: 'lungo-2', name: 'Lungo', icon: 'folder', createdAt: '2026-11-24T09:00:00.000Z' });
      localStorage.setItem(lk, JSON.stringify(libs));
    }, L);
    await h.go('settings/folders');
    const prima = ids(await h.store(L, 0));
    await row(h, 'lungo').click(); await pause(h);
    const sceltaLungo = await h.page.getByLabel(/^Dove sta: /).locator('visible=true').evaluateAll((els) => els.filter((e) => e.getAttribute('aria-checked') === 'true').map((e) => e.getAttribute('aria-label')));
    await label(h, 'Icona Magazzino').click();
    await h.click('Salva Modifiche');
    const dopoLungo = ids(await h.store(L));
    await row(h, 'visone').click(); await pause(h);
    const frase = await h.page.getByText(/^Ha delle sottocategorie/).first().innerText();
    await label(h, 'Icona Magazzino').click();
    await h.click('Salva Modifiche');
    const dopoVisone = ids(await h.store(L));
    return { prima, sceltaLungo, dopoLungo, frase, dopoVisone };
  }, { dialogs: ['ok', 'ok'] });

  // Rilievo del revisore: con il lettore aperto dentro la finestra, il tasto indietro (sul web Esc) chiude solo il lettore
  await run('cat1-lettore-indietro', async (h) => {
    await h.go('settings/folders');
    await row(h, 'pellicce').click(); await pause(h);
    await label(h, 'Nome della categoria').fill('Pellicce nuove');
    // ETI: il lettore del codice sta in «Codice ed etichetta» › Avanzate › «Cambia codice», accanto al campo di prima
    if (await hasLabel(h, 'Codice ed etichetta')) {
      await label(h, 'Codice ed etichetta').click(); await pause(h, 700);
      await label(h, 'Avanzate').click(); await pause(h, 400);
    }
    await h.page.getByPlaceholder('Scansiona o Genera...').locator('visible=true').last().locator('xpath=following-sibling::*[1]').click(); await pause(h, 800);
    const lettore = await h.has('Scrivi il codice', true);
    await h.page.keyboard.press('Escape'); await pause(h, 600);
    const finestra = await h.has('Modifica categoria', true);
    return { lettore, lettoreChiuso: !(await h.has('Scrivi il codice', true)), finestra, nome: finestra ? await label(h, 'Nome della categoria').inputValue() : null };
  });
})();
