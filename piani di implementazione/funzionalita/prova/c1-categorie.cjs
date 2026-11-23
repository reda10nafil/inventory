// C1 (ticket 19): categorie = cartelle, con sottocategorie; «Tipo di pelle» campo facoltativo; CSV con le due colonne.
// Ogni scenario legge lo stato salvato: i prodotti di oggi si vedono come prima con le etichette nuove e nessun dato
// viene riscritto (stato salvato prima e dopo confrontato chiave per chiave), una sottocategoria creata e assegnata,
// un prodotto senza tipo di pelle, export e import del CSV nuovo, import dei CSV di M01 e di prima di M01 (gli
// stessi file dei test jest, in `c1-csv/`), filtro per categoria nell'Inventario che include le sottocategorie.
// Uso: node c1-categorie.cjs [nome-scenario]   (senza argomento li esegue tutti)
const fs = require('fs');
const path = require('path');
const { scenario } = require('./lib.cjs');
const { press } = require('./a1-util.cjs');

const P = 'inventory:v1:local:products';
const L = 'inventory:v1:local:libraries';
const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);

// Copia in JS di utils/csv.ts (solo per leggere il file scaricato)
function parseCsv(input) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) { if (c === '"' && input[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"' && field.length === 0) quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && input[i + 1] === '\n') i++; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  return rows;
}
const toCsv = (rows) => rows.map((r) => r.map((v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\r\n');
const DROP = '[aria-label="Importa CSV trascinando un file qui"]';
async function drop(h, csv, name = 'prova.csv') {
  const dt = await h.page.evaluateHandle(([text, n]) => {
    const d = new DataTransfer(); d.items.add(new File([text], n, { type: 'text/csv' })); return d;
  }, [csv, name]);
  await h.page.locator(DROP).dispatchEvent('drop', { dataTransfer: dt });
  await h.page.waitForTimeout(1500);
}
async function scarica(h, voce) {
  const dl = h.page.waitForEvent('download', { timeout: 8000 });
  await h.click(voce);
  const d = await dl;
  return parseCsv(fs.readFileSync(await d.path(), 'utf8').replace(/^﻿/, ''));
}
// Modifica aperta dalla Scheda, come fa l'utente (dopo il salvataggio si torna indietro: serve la cronologia)
const openEdit = async (h, sku) => {
  await h.go('');
  await h.click(sku); await h.page.waitForTimeout(800);
  await press(h.page, /^.?\s*Modifica$/); await h.page.waitForTimeout(800);
};
const fixture = (name) => fs.readFileSync(path.join(__dirname, 'c1-csv', name), 'utf8');

// Tutto lo stato salvato tranne gli avvisi (li rigenera l'app a ogni avvio) e le chiavi della sessione del browser
const snapshot = (h) => h.page.evaluate(() => Object.fromEntries(Object.keys(localStorage)
  .filter((k) => k !== 'inventory:v1:local:alerts' && !k.startsWith('loki') && !k.startsWith('expo'))
  .sort().map((k) => [k, localStorage.getItem(k)])));
const changedKeys = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
// Testo visibile della card di un prodotto (SKU e righe sotto)
const card = (h, sku) => h.vis(sku).evaluate((e) => e.parentElement.innerText.replace(/\s+/g, ' ').trim());
const visibleSkus = (h) => h.page.evaluate(() => [...document.querySelectorAll('div')]
  .filter((d) => d.childElementCount === 0 && /^[A-Z]{3}-\d{4}$/.test(d.textContent || '') && d.offsetParent)
  .map((d) => d.textContent));

// Sottocategoria «Visone» sotto «Pellicce» scritta come la scrive l'app (id dal nome), VIS-0098 dentro
async function conSottocategoria(h) {
  await h.page.evaluate(([lk, pk]) => {
    const libs = JSON.parse(localStorage.getItem(lk));
    libs.push({ id: 'visone', name: 'Visone', icon: 'folder', createdAt: '2026-11-22T20:00:00.000Z', parentId: 'pellicce' });
    localStorage.setItem(lk, JSON.stringify(libs));
    const list = JSON.parse(localStorage.getItem(pk));
    list.find((p) => p.sku === 'VIS-0098').libraryId = 'visone';
    localStorage.setItem(pk, JSON.stringify(list));
  }, [L, P]);
  await h.go('');
}

(async () => {
  // 1. Prodotti di oggi: stesse cose di prima con le etichette nuove, e nessuna chiave salvata cambia aprendo le schermate
  await run('c1-oggi', async (h) => {
    const prima = await snapshot(h);
    const cards = { 'VIS-0142': await card(h, 'VIS-0142'), 'VOL-0087': await card(h, 'VOL-0087'), 'LIN-0021': await card(h, 'LIN-0021') };
    const chip = { pellicce: await h.has('Pellicce', true), inverno: await h.has('Collezione Inverno', true), usato: await h.has('Usato e permute', true) };
    await h.click('VIS-0142');
    const scheda = { categoria: await h.has('Collezione Inverno', true), tipo: await h.has('Tipo di pelle: Visone', true) };
    await h.go('add');
    const aggiungi = {
      tipo: await h.has('Tipo di pelle', true), tipoObbligatorio: await h.has('Tipo di pelle *', true), categoria: await h.has('Categoria', true),
      vecchie: (await h.has('Cartella', true)) || (await h.has('Tipo Pelle')), nota: await h.has('Campi obbligatori: Posizione', false),
    };
    await h.go('product/edit/cmp-1');
    const modifica = { tipo: await h.has('Tipo di pelle', true), categoria: await h.has('Categoria', true), cartella: await h.has('Cartella', true) };
    await h.go('settings/folders');
    const gestione = { titolo: await h.has('Crea nuova categoria', true), elenco: await h.has('Categorie esistenti (3)', true) };
    // C2: l'indirizzo apre Campi Personalizzati con l'editor dei valori di «Tipo di pelle» (OptionsEditor)
    await h.go('settings/categories');
    const tipi = { titolo: await h.has('Aggiungi un valore', true), elenco: await h.has('Valori (7)', true) };
    await h.go('settings');
    const impostazioni = { categorie: await h.has('Categorie', true), tipi: await h.has('Tipi di pelle', true), cartelle: await h.has('Gestisci Cartelle', true) };
    await h.go('automations/count');
    const dopo = await snapshot(h);
    return { cards, chip, scheda, aggiungi, modifica, gestione, tipi, impostazioni, chiaviCambiate: changedKeys(prima, dopo) };
  });

  // 2. Sottocategoria creata dalla gestione, assegnata in Modifica; eliminazioni rifiutate (sottocategorie, prodotti)
  await run('c1-sottocategoria', async (h) => {
    const libsPrima = await h.store(L, 0);
    const prodPrima = await h.products(0);
    await h.go('settings/folders');
    await h.page.getByPlaceholder('Nome categoria (es: Giacche)').fill('Visone');
    await h.click('Pellicce');
    await h.click('Crea Categoria');
    const libs = await h.store(L);
    const nuova = libs.find((l) => l.name === 'Visone');
    const vecchieUguali = JSON.stringify(libs.filter((l) => l !== nuova)) === JSON.stringify(libsPrima);
    // Doppione sotto lo stesso genitore: rifiutato
    await h.page.getByPlaceholder('Nome categoria (es: Giacche)').fill('visone');
    await h.click('Pellicce');
    await h.click('Crea Categoria');
    const dopoDoppione = (await h.store(L, 500)).length;
    const riga = await h.page.locator('[tabindex="0"]').filter({ hasText: 'ID: visone' }).first().innerText();
    // Pellicce ha una sottocategoria e prodotti: non si elimina
    await h.page.locator('[aria-label="Elimina Pellicce"]').click(); await h.page.waitForTimeout(600);
    const pellicceResta = (await h.store(L, 300)).some((l) => l.id === 'pellicce');
    // Modifica di VIS-0098 (Pellicce): sottocategoria Visone
    await openEdit(h, 'VIS-0098');
    await h.page.getByLabel('Sottocategoria Visone', { exact: true }).click(); await h.page.waitForTimeout(400);
    await h.click('Salva Modifiche');
    const prodDopo = await h.products();
    const vis = prodDopo.find((p) => p.sku === 'VIS-0098');
    const visPrima = prodPrima.find((p) => p.sku === 'VIS-0098');
    const cambiati = Object.keys({ ...vis, ...visPrima }).filter((k) => JSON.stringify(vis[k]) !== JSON.stringify(visPrima[k]));
    const altriUguali = prodDopo.filter((p) => p.sku !== 'VIS-0098').every((p) => JSON.stringify(p) === JSON.stringify(prodPrima.find((q) => q.id === p.id)));
    await h.go('');
    const cardVis = await card(h, 'VIS-0098');
    await h.click('VIS-0098');
    const schedaVis = await h.has('Pellicce › Visone', true);
    // Visone ha un prodotto: non si elimina
    await h.go('settings/folders');
    await h.page.locator('[aria-label="Elimina Visone"]').click(); await h.page.waitForTimeout(600);
    const visoneResta = (await h.store(L, 300)).some((l) => l.id === nuova.id);
    return { nuova, vecchieUguali, dopoDoppione, riga: riga.replace(/\s+/g, ' '), pellicceResta, libraryId: vis.libraryId, furType: vis.furType, cambiati, altriUguali, cardVis, schedaVis, visoneResta };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'] });

  // 3. Prodotto senza tipo di pelle: Aggiungi lo salva (secondo tocco toglie la scelta), Modifica lo toglie con «Nessuno»
  await run('c1-senza-tipo', async (h) => {
    await h.go('add');
    await h.click('Volpe'); await h.click('Volpe'); // scelto e tolto
    await h.click('Vetrina');
    await h.click('Collezione Inverno');
    await h.click('M');
    await h.click("Aggiungi all'Inventario");
    const nuovo = (await h.products()).find((x) => x.sku === 'LOG-2026-001');
    await h.go('');
    const cardNuovo = await card(h, 'LOG-2026-001');
    await h.click('LOG-2026-001');
    const schedaTipo = await h.has('Tipo di pelle', false);
    const schedaCategoria = await h.has('Collezione Inverno', true);
    // Modifica di PUZ-0012 (Altro): «Nessuno»
    await openEdit(h, 'PUZ-0012');
    await h.click('Nessuno');
    await h.click('Salva Modifiche');
    const puz = (await h.products()).find((x) => x.sku === 'PUZ-0012');
    const tl = (await h.timeline(0)).filter((e) => e.productId === puz.id && e.type === 'modified').map((e) => e.details?.changes);
    await h.go('');
    const cardPuz = await card(h, 'PUZ-0012');
    return {
      nuovo: nuovo && { furType: nuovo.furType, libraryId: nuovo.libraryId, location: nuovo.location },
      cardNuovo, schedaTipo, schedaCategoria, puz: { furType: puz.furType, libraryId: puz.libraryId }, cronologia: tl.slice(0, 1), cardPuz,
    };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok'] });

  // 4. CSV: export con le due colonne e la sottocategoria, reimport uguale, import dei tre formati, report giacenze
  await run('c1-csv', async (h) => {
    await conSottocategoria(h);
    // PUZ-0012 senza tipo di pelle
    await h.page.evaluate((pk) => {
      const list = JSON.parse(localStorage.getItem(pk));
      list.find((p) => p.sku === 'PUZ-0012').furType = '';
      localStorage.setItem(pk, JSON.stringify(list));
    }, P);
    await h.go('');
    await h.tab('Impostazioni');
    const prima = await h.products(0);
    const righe = await scarica(h, 'Esporta Inventario');
    const header = righe[0];
    const col = (n) => header.indexOf(n);
    const export_ = righe.slice(1).map((r) => `${r[0]}|${r[col('Tipo di pelle')]}|${r[col('Categoria')]}`);
    const rt = [header, ...righe.slice(1).map((r) => r.map((v, i) => (i === 0 ? `RT-${v}` : v)))];
    await drop(h, toCsv(rt), 'reimport.csv');
    let dopo = await h.products();
    const giro = prima.filter((o) => !o.deletedAt).map((o) => {
      const n = dopo.find((p) => p.sku === `RT-${o.sku}`);
      return n ? `${o.sku}:${n.furType === o.furType && n.libraryId === o.libraryId ? 'uguale' : `${n.furType}/${n.libraryId}`}` : `${o.sku}:assente`;
    });
    await drop(h, fixture('pre-m01.csv'), 'pre-m01.csv');
    await drop(h, fixture('m01.csv'), 'm01.csv');
    await drop(h, fixture('c1.csv'), 'c1.csv');
    dopo = await h.products();
    const importati = dopo.filter((p) => p.sku.startsWith('C1-')).map((p) => `${p.sku}|${p.furType}|${p.libraryId ?? '-'}|${p.status}|${p.stock ? JSON.stringify(p.stock) : '-'}`);
    const giacenze = await scarica(h, 'Esporta giacenze');
    return {
      intestazione: { tipo: col('Tipo di pelle'), categoria: col('Categoria'), cartella: col('Cartella'), colonne: header.length },
      export: export_, giro, importati,
      giacenze: { intestazione: giacenze[0].slice(0, 4), righe: giacenze.slice(1).filter((r) => ['VIS-0098', 'PUZ-0012', 'VIS-0142'].includes(r[0])).map((r) => r.slice(0, 4).join('|')) },
    };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'] });

  // 6. Righe corte nelle altre schermate: Azione rapida, Conta, Audit, Cestino. VIS-0098 in «Collezione Inverno» (tipo
  // Visone), PUZ-0012 in «Pellicce» senza tipo di pelle, tutti e due articoli a quantità in Magazzino; AST-0033 nel cestino.
  // Nessun « · » appeso quando manca il tipo di pelle.
  await run('c1-righe-corte', async (h) => {
    await h.page.evaluate(([pk, tk]) => {
      const list = JSON.parse(localStorage.getItem(pk));
      const tl = JSON.parse(localStorage.getItem(tk) || '[]');
      const aQuantita = (sku, extra, qty) => {
        const p = list.find((x) => x.sku === sku);
        Object.assign(p, { location: 'magazzino', unit: 'pz', stock: { magazzino: qty }, ...extra });
        tl.unshift({ id: `c1-${sku}`, productId: p.id, type: 'stock', timestamp: '2026-11-22T08:00:00.000Z', details: { movement: 'carico', qty, to: 'magazzino', reason: 'iniziale', before: 0, after: qty } });
      };
      aQuantita('VIS-0098', { libraryId: 'collezione-inverno' }, 5);
      aQuantita('PUZ-0012', { furType: '', libraryId: 'pellicce' }, 2);
      list.find((x) => x.sku === 'AST-0033').deletedAt = '2026-11-22T09:00:00.000Z';
      localStorage.setItem(pk, JSON.stringify(list));
      localStorage.setItem(tk, JSON.stringify(tl));
    }, [P, 'inventory:v1:local:timeline']);
    await h.go('');
    const testi = () => h.page.evaluate(() => [...document.querySelectorAll('div')]
      .filter((d) => d.childElementCount === 0 && d.offsetParent && (d.textContent || '').includes('·'))
      .map((d) => d.textContent.trim()));
    const appesi = (list) => list.filter((t) => /(^·|·$|·\s*·|·\s*-)/.test(t.trim()));
    const leggi = async (codice) => {
      await h.go('scanner');
      await h.click('Inserisci Manualmente');
      await h.page.getByPlaceholder('Es: SKU-001, 1234567890123').fill(codice);
      await h.click('Cerca');
    };
    await leggi('VIS-0098');
    const azioneVis = { riga: await h.has('Collezione Inverno · Visone', true), testi: await testi() };
    await leggi('PUZ-0012');
    const azionePuz = { riga: await h.has('Pellicce', true), testi: await testi() };
    await h.go('automations/count');
    await h.page.getByLabel('Conta Magazzino', { exact: true }).locator('visible=true').first().click(); await h.page.waitForTimeout(500);
    const conta = await h.page.evaluate(() => [...document.querySelectorAll('div')]
      .filter((d) => d.childElementCount === 0 && d.offsetParent && /Registrata:/.test(d.textContent || ''))
      .map((d) => d.textContent.trim()));
    await h.go('automations/audit');
    await h.click('Magazzino');
    const audit = { vis: await h.has('Collezione Inverno · Visone', true), puz: await h.has('Pellicce', true), testi: await testi() };
    await h.go('settings/trash');
    const cestino = await testi();
    return { azioneVis, azionePuz, conta, audit, cestino, appesi: appesi([...azioneVis.testi, ...azionePuz.testi, ...conta, ...audit.testi, ...cestino]) };
  });

  // 5. Filtro per categoria nell'Inventario: la principale include le sottocategorie; seconda fila; codice letto (?library=)
  await run('c1-filtro-home', async (h) => {
    await conSottocategoria(h);
    const tutti = (await visibleSkus(h)).sort();
    await h.click('Pellicce');
    const pellicce = (await visibleSkus(h)).sort();
    const secondaFila = { tutte: await h.has('Tutte', true), visone: await h.has('Visone', true) };
    const contatore = await h.page.getByText(/^\d+ prodotti$/).first().innerText();
    await h.click('Visone');
    const soloVisone = (await visibleSkus(h)).sort();
    await h.click('Tutte');
    const ancoraPellicce = (await visibleSkus(h)).sort();
    await h.click('Collezione Inverno');
    const inverno = (await visibleSkus(h)).sort();
    const senzaSecondaFila = !(await h.has('Tutte', true));
    // Codice di una sottocategoria letto dallo scanner: Inventario filtrato
    await h.go('?library=visone');
    const daCodice = (await visibleSkus(h)).sort();
    return { tutti, pellicce, secondaFila, contatore, soloVisone, ancoraPellicce, inverno, senzaSecondaFila, daCodice };
  });
})();
