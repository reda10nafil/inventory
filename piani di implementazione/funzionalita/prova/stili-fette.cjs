// Parti nuove delle fette M nei 5 stili (una schermata per riga, uno stile per colonna con foglio.py).
// Uso: FETTA=m01 OUT=<cartella> node stili-fette.cjs   (app su :8082, campionario su :8765)
// Stampa gli errori di console per stile; le schermate sono <OUT>/<stile>-<n>-<nome>.png.
const PW = process.env.PW || 'C:/Users/reda_/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright';
const { chromium } = require(PW);
const path = require('path');
const APP = process.env.APP || 'http://localhost:8082';
const OUT = process.env.OUT || require('os').tmpdir();
const STILI = ['attuale', 'babilonia', 'ishtar', 'ardesia', 'minimal'];

// Ogni fetta: preparazione dello stato salvato (nel browser, prima di aprire l'app) e schermate da fare.
const FETTE = {
  m01: {
    prepara: () => {
      const cats = [['visone', 'Visone'], ['volpe', 'Volpe'], ['altro', 'Altro'], ['viti', 'Viti e bulloni'], ['detersivi', 'Detersivi']];
      localStorage.setItem('furinventory_categories:local', JSON.stringify(cats.map(([id, label]) => ({ id, label }))));
      const list = JSON.parse(localStorage.getItem('inventory:v1:local:products'));
      list[2] = { ...list[2], furType: 'viti' }; // LIN-0021 → Viti e bulloni
      localStorage.setItem('inventory:v1:local:products', JSON.stringify(list));
    },
    schermate: [
      ['categorie', async (page) => { await page.goto(`${APP}/settings/categories`); await page.waitForTimeout(1800); }],
      ['rinomina', async (page) => { await page.getByText('Viti e bulloni', { exact: true }).first().click(); await page.waitForTimeout(600); }],
      ['aggiungi', async (page) => {
        await page.goto(`${APP}/add`); await page.waitForTimeout(1800);
        await page.getByText('Detersivi', { exact: true }).first().click(); await page.waitForTimeout(300);
        await page.getByText('Tipo di pelle', { exact: true }).first().scrollIntoViewIfNeeded(); // C1
      }],
      ['card', async (page) => { await page.goto(APP); await page.getByText('LIN-0021', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      // C2: la voce «Tipi di pelle» non c'è più (la lista è in Campi Personalizzati); si mostra dove era
      ['impostazioni', async (page) => { await page.goto(`${APP}/settings`); await page.waitForTimeout(1500); await page.getByText('Fornitori e clienti', { exact: true }).first().scrollIntoViewIfNeeded(); }],
    ],
  },
  // M03: articoli a quantità (card, esaurito, Scheda, Modifica in sola lettura, Magazzino in Aggiungi, Cronologia)
  m03: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const tk = 'inventory:v1:local:timeline';
      const list = JSON.parse(localStorage.getItem(pk));
      const tl = JSON.parse(localStorage.getItem(tk) || '[]');
      const at = '2026-11-22T08:00:00.000Z';
      const ev = (p, details) => tl.unshift({ id: `m03-${p.id}-${tl.length}`, productId: p.id, type: 'stock', timestamp: at, details });
      const vis = list.find((p) => p.sku === 'VIS-0098'); // Magazzino
      Object.assign(vis, { unit: 'pz', stock: { magazzino: 7, vetrina: 3, stand_a: 2 } });
      ev(vis, { movement: 'carico', qty: 12, to: 'magazzino', reason: 'iniziale', before: 0, after: 12 });
      ev(vis, { movement: 'trasferimento', qty: 3, from: 'magazzino', to: 'vetrina', before: 12, after: 12 });
      ev(vis, { movement: 'trasferimento', qty: 2, from: 'magazzino', to: 'stand_a', before: 12, after: 12 });
      const puz = list.find((p) => p.sku === 'PUZ-0012'); // Stand C, esaurito
      Object.assign(puz, { unit: 'kg', stock: { stand_c: 0 } });
      ev(puz, { movement: 'carico', qty: 2.5, to: 'stand_c', reason: 'iniziale', before: 0, after: 2.5 });
      ev(puz, { movement: 'scarico', qty: 2.5, from: 'stand_c', reason: 'vendita', finalPrice: 450, before: 2.5, after: 0 });
      localStorage.setItem(pk, JSON.stringify(list));
      localStorage.setItem(tk, JSON.stringify(tl));
    },
    schermate: [
      ['card', async (page) => { await page.goto(APP); await page.waitForTimeout(1500); await page.getByText('VIS-0098', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['scheda', async (page) => { await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800); await page.getByText('Giacenza', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['cronologia-scheda', async (page) => { await page.getByText('Cronologia dettagliata', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['esaurito', async (page) => { await page.goto(`${APP}/product/cmp-6`); await page.waitForTimeout(1800); await page.getByText('Giacenza', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['modifica', async (page) => { await page.goto(`${APP}/product/edit/cmp-5`); await page.waitForTimeout(1800); await page.getByText('Posizione e giacenza', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); }],
      ['aggiungi', async (page) => {
        await page.goto(`${APP}/add`); await page.waitForTimeout(1800);
        await page.getByPlaceholder('Vuota = pezzo unico').fill('12,5');
        await page.getByLabel('Unità kg').click(); await page.waitForTimeout(300);
        await page.getByText('Unità', { exact: true }).first().scrollIntoViewIfNeeded();
      }],
      ['cronologia', async (page) => { await page.goto(`${APP}/timeline`); await page.waitForTimeout(1800); }],
    ],
  },
  m04: {
    // Stesso stato di m03, più LIN-0021 articolo a quantità nel cestino
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      Object.assign(list.find((p) => p.sku === 'LIN-0021'), { unit: 'm', stock: { stand_b: 4.5 }, deletedAt: '2026-11-22T09:00:00.000Z' });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['scheda', async (page) => { await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800); await page.getByLabel('Movimenta', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['finestra', async (page) => { await page.getByLabel('Movimenta', { exact: true }).first().click(); await page.waitForTimeout(600); }],
      ['trasferimento', async (page) => {
        await page.getByLabel('Tipo Trasferimento', { exact: true }).click();
        await page.getByLabel('Da Magazzino', { exact: true }).click();
        await page.getByLabel('A Vetrina', { exact: true }).click();
        await page.locator('input[placeholder="es. 2,5"]').fill('2');
      }],
      ['rettifica', async (page) => { await page.getByLabel('Tipo Rettifica', { exact: true }).click(); await page.getByLabel('Causale Conta', { exact: true }).click(); }],
      ['cronologia-movimenti', async (page) => { await page.goto(`${APP}/timeline`); await page.waitForTimeout(1800); await page.getByText('Movimenti', { exact: true }).first().click(); }],
      ['pezzo-unico', async (page) => { await page.goto(`${APP}/product/cmp-1`); await page.waitForTimeout(1800); await page.getByLabel('Movimenta', { exact: true }).first().scrollIntoViewIfNeeded(); }],
      ['cestino', async (page) => { await page.goto(APP); await page.waitForTimeout(1500); await page.getByText('Cestino').locator('visible=true').first().click(); await page.waitForTimeout(800); }],
    ],
  },
  // M06: scorta minima in Aggiungi e Modifica, Scheda sotto scorta, filtro Attenzione (AST-0033 = cmp-4)
  m06: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      Object.assign(list.find((p) => p.sku === 'AST-0033'), { unit: 'pz', stock: { sartoria: 2 }, minStock: 5 });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['aggiungi', async (page) => {
        await page.goto(`${APP}/add`); await page.waitForTimeout(1800);
        await page.getByPlaceholder('Vuota = pezzo unico').fill('3');
        await page.getByPlaceholder('Vuota = nessun avviso').fill('5');
        await page.getByPlaceholder('Vuota = nessun avviso').evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['modifica', async (page) => {
        await page.goto(`${APP}/product/edit/cmp-4`); await page.waitForTimeout(1800);
        await page.getByPlaceholder('Vuota = nessun avviso').evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['scheda', async (page) => {
        await page.goto(`${APP}/product/cmp-4`); await page.waitForTimeout(1800);
        await page.getByText('Sotto la scorta minima', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['attenzione', async (page) => {
        await page.goto(APP); await page.waitForTimeout(1500);
        await page.getByText(/^Attenzione \d+$/).first().click(); await page.waitForTimeout(800);
      }],
    ],
  },
  // M08: le tre voci di export e l'import in Impostazioni › Dati e backup
  m08: {
    prepara: () => {},
    schermate: [
      ['dati-e-backup', async (page) => {
        await page.goto(`${APP}/settings`); await page.waitForTimeout(1800);
        await page.getByText('Esporta giacenze', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['import', async (page) => { await page.getByText('Importa prodotti CSV', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); }],
    ],
  },
  // M07: Conta da Automazioni (scelta della posizione, elenco con differenze, riepilogo, esito)
  m07: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      const set = (sku, extra) => Object.assign(list.find((p) => p.sku === sku), extra);
      set('VIS-0098', { unit: 'pz', stock: { magazzino: 5 } });
      set('PUZ-0012', { unit: 'kg', stock: { magazzino: 0 }, location: 'magazzino' });
      set('AST-0033', { unit: 'pz', stock: { sartoria: 3, magazzino: 2 } });
      set('LIN-0021', { unit: 'm', stock: { magazzino: 4 }, location: 'magazzino' });
      set('VIS-0142', { location: 'magazzino' });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['automazioni', async (page) => {
        await page.goto(`${APP}/automations`); await page.waitForTimeout(1800);
        await page.getByText('Conta Magazzino', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['posizioni', async (page) => { await page.goto(`${APP}/automations/count`); await page.waitForTimeout(1800); }],
      ['elenco', async (page) => {
        await page.getByLabel('Conta Magazzino', { exact: true }).click(); await page.waitForTimeout(500);
        await page.getByLabel('Contata VIS-0098', { exact: true }).fill('3');
        await page.getByLabel('Contata PUZ-0012', { exact: true }).fill('1,5');
        await page.getByLabel('Contata AST-0033', { exact: true }).fill('2');
      }],
      ['riepilogo', async (page) => { await page.getByLabel('Riepilogo della conta', { exact: true }).click(); }],
      ['esito', async (page) => { await page.getByLabel('Registra rettifiche', { exact: true }).click(); }],
    ],
  },
  // M09: Carico e Scarico nell'Azione rapida (VIS-0098 = cmp-5 a quantità, VIS-0142 = cmp-1 pezzo unico)
  m09: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      Object.assign(list.find((p) => p.sku === 'VIS-0098'), { unit: 'pz', stock: { magazzino: 5 } });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['azione', async (page) => {
        await page.goto(`${APP}/scanner-action?type=product&id=cmp-5`); await page.waitForTimeout(1800);
        await page.getByLabel('Carico', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['carico', async (page) => { await page.getByLabel('Carico', { exact: true }).first().click(); await page.waitForTimeout(600); }],
      ['scarico', async (page) => {
        await page.getByText('Annulla', { exact: true }).first().click(); await page.waitForTimeout(400);
        await page.getByLabel('Scarico', { exact: true }).first().click(); await page.waitForTimeout(600);
        await page.locator('input[placeholder="es. 2,5"]').fill('2');
      }],
      ['pezzo-unico', async (page) => { await page.goto(`${APP}/scanner-action?type=product&id=cmp-1`); await page.waitForTimeout(1800); }],
    ],
  },
  // M10: Fornitori e clienti (voce in Impostazioni, elenco, modulo, scheda del contatto, finestra Movimenta con
  // contatto e prezzo, nomi in Cronologia e nella Scheda). Nomi lunghi apposta. VIS-0098 = cmp-5.
  m10: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const tk = 'inventory:v1:local:timeline';
      localStorage.setItem('furinventory_contacts:local', JSON.stringify([
        { id: 'c-rossi', name: 'Conceria Rossi & Figli', kind: 'fornitore', phone: '333 1234567', email: 'ordini@conceriarossi.example', note: 'Consegna il martedì, bancali da 40 pezzi' },
        { id: 'c-nord', name: 'Pellami del Nord', kind: 'fornitore' },
        { id: 'c-bianchi', name: 'Boutique Bianchi', kind: 'cliente', phone: '02 5551234' },
        { id: 'c-verdi', name: 'Sartoria Verdi di Maria Antonietta Verdi', kind: 'cliente' },
      ]));
      const list = JSON.parse(localStorage.getItem(pk));
      const tl = JSON.parse(localStorage.getItem(tk) || '[]');
      const vis = list.find((p) => p.sku === 'VIS-0098');
      Object.assign(vis, { unit: 'pz', stock: { magazzino: 9 } });
      const ev = (n, details) => tl.unshift({ id: `m10-${n}`, productId: vis.id, type: 'stock', timestamp: `2026-11-22T${String(8 + n).padStart(2, '0')}:00:00.000Z`, details });
      ev(0, { movement: 'carico', qty: 5, to: 'magazzino', reason: 'iniziale', before: 0, after: 5 });
      ev(1, { movement: 'carico', qty: 6, to: 'magazzino', reason: 'acquisto', contactId: 'c-rossi', before: 5, after: 11 });
      ev(2, { movement: 'scarico', qty: 3, from: 'magazzino', reason: 'vendita', finalPrice: 120, contactId: 'c-bianchi', before: 11, after: 8 });
      ev(3, { movement: 'carico', qty: 1, to: 'magazzino', reason: 'reso', contactId: 'c-verdi', before: 8, after: 9 });
      localStorage.setItem(pk, JSON.stringify(list));
      localStorage.setItem(tk, JSON.stringify(tl));
    },
    schermate: [
      ['impostazioni', async (page) => {
        await page.goto(`${APP}/settings`); await page.waitForTimeout(1800);
        await page.getByText('Fornitori e clienti', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['contatti', async (page) => { await page.goto(`${APP}/settings/contacts`); await page.waitForTimeout(1800); }],
      ['modulo', async (page) => {
        await page.getByLabel('Nuovo contatto', { exact: true }).click(); await page.waitForTimeout(400);
        await page.getByLabel('Nome', { exact: true }).fill('Lavanderia Industriale Aurora');
        await page.getByLabel('Tipo Cliente', { exact: true }).click();
        await page.getByLabel('Telefono (facoltativo)', { exact: true }).fill('045 8001234');
        await page.getByLabel('Email (facoltativa)', { exact: true }).fill('amministrazione@lavanderia-aurora.example');
        await page.getByLabel('Nota (facoltativa)', { exact: true }).fill('Ritira il giovedì');
      }],
      ['scheda-contatto', async (page) => {
        await page.getByText('Annulla', { exact: true }).first().click(); await page.waitForTimeout(300);
        await page.getByLabel('Apri Fornitore Conceria Rossi & Figli', { exact: true }).click(); await page.waitForTimeout(500);
      }],
      ['movimenta-carico', async (page) => {
        await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800);
        await page.getByLabel('Movimenta', { exact: true }).first().click(); await page.waitForTimeout(600);
        await page.locator('input[placeholder="es. 2,5"]').fill('6');
        await page.getByLabel('Causale Acquisto', { exact: true }).click();
        await page.getByLabel('Contatto Fornitore Conceria Rossi & Figli', { exact: true }).click();
        await page.getByPlaceholder('es. fattura 124, bancale rotto').evaluate((e) => e.scrollIntoView({ block: 'end' }));
      }],
      ['movimenta-vendita', async (page) => {
        await page.getByLabel('Tipo Scarico', { exact: true }).click();
        await page.locator('input[placeholder="es. 2,5"]').fill('3');
        await page.getByLabel('Causale Vendita', { exact: true }).click();
        await page.getByLabel('Prezzo per unità', { exact: true }).fill('120');
        await page.getByLabel('Contatto Cliente Sartoria Verdi di Maria Antonietta Verdi', { exact: true }).click();
        await page.getByPlaceholder('es. fattura 124, bancale rotto').evaluate((e) => e.scrollIntoView({ block: 'end' }));
      }],
      ['cronologia-movimenti', async (page) => { await page.goto(`${APP}/timeline`); await page.waitForTimeout(1800); await page.getByText('Movimenti', { exact: true }).first().click(); }],
      ['scheda-prodotto', async (page) => {
        await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800);
        await page.getByText('Cronologia dettagliata', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
      }],
    ],
  },
  // C1: categorie = cartelle con sottocategorie (nomi lunghi apposta), tipo di pelle facoltativo
  c1: {
    prepara: () => {
      const lk = 'inventory:v1:local:libraries';
      const pk = 'inventory:v1:local:products';
      const libs = JSON.parse(localStorage.getItem(lk));
      libs.push({ id: 'visone', name: 'Visone', icon: 'folder', createdAt: '2026-11-22T20:00:00.000Z', parentId: 'pellicce' });
      libs.push({ id: 'volpe', name: 'Volpe', icon: 'folder', createdAt: '2026-11-22T20:00:00.000Z', parentId: 'pellicce' });
      libs.push({ id: 'cappotti', name: 'Cappotti lunghi e giacche da sera', icon: 'layers', createdAt: '2026-11-22T20:00:00.000Z', parentId: 'collezione-inverno' });
      localStorage.setItem(lk, JSON.stringify(libs));
      const list = JSON.parse(localStorage.getItem(pk));
      list.find((p) => p.sku === 'VIS-0098').libraryId = 'visone';
      Object.assign(list.find((p) => p.sku === 'LIN-0021'), { libraryId: 'cappotti' });
      list.find((p) => p.sku === 'PUZ-0012').furType = ''; // senza tipo di pelle
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['categorie', async (page) => {
        await page.goto(`${APP}/settings/folders`); await page.waitForTimeout(1800);
        await page.getByText('Categorie esistenti', { exact: false }).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
      }],
      ['sottocategoria', async (page) => {
        await page.getByText('Cappotti lunghi e giacche da sera', { exact: true }).first().click(); await page.waitForTimeout(500);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.getByText('Sottocategoria di', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['aggiungi', async (page) => {
        await page.goto(`${APP}/add`); await page.waitForTimeout(1800);
        await page.getByText('Collezione Inverno', { exact: true }).first().click(); await page.waitForTimeout(300);
        await page.getByText('Cappotti lunghi e giacche da sera', { exact: true }).first().click(); await page.waitForTimeout(300);
        await page.getByText('Tipo di pelle', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
      }],
      ['scheda', async (page) => { await page.goto(`${APP}/product/cmp-3`); await page.waitForTimeout(1800); await page.getByText('LIN-0021', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); }],
      ['inventario', async (page) => {
        await page.goto(APP); await page.waitForTimeout(1500);
        await page.getByText('Collezione Inverno', { exact: true }).first().click(); await page.waitForTimeout(600);
      }],
      ['tipi-di-pelle', async (page) => { await page.goto(`${APP}/settings/categories`); await page.waitForTimeout(1800); }], // C2: Campi con l'editor dei valori
    ],
  },
  // S1a: scaffali (Impostazioni › Scaffali per posizione, modulo, Aggiungi e Modifica di un pezzo unico con lo
  // scaffale, Scheda, card, scaffale letto dallo Scanner). Nomi e codici lunghi apposta, per vedere se vanno a capo.
  s1a: {
    prepara: () => {
      const lk = 'inventory:v1:local:libraries';
      const pk = 'inventory:v1:local:products';
      const libs = JSON.parse(localStorage.getItem(lk));
      libs.push({ id: 'visone', name: 'Visone', icon: 'folder', createdAt: '2026-11-22T20:00:00.000Z', parentId: 'pellicce' });
      localStorage.setItem(lk, JSON.stringify(libs));
      localStorage.setItem('furinventory_shelves:local', JSON.stringify([
        { id: '1732300000000-gen1', name: 'A1', locationId: 'magazzino', barcode: 'SCAF-MAGAZZINO-A1' },
        { id: '1732300000000-pel1', name: 'Ripiano pellicce lunghe', locationId: 'magazzino', libraryId: 'pellicce', barcode: 'SCAF-MAGAZZINO-RIPIANO-PELLICCE-LUNGHE', nfcTag: '04:A2:3B:1C:5D:6E:80' },
        { id: '1732300000000-vis1', name: 'V1', locationId: 'magazzino', libraryId: 'visone' },
        { id: '1732300000000-inv1', name: 'Collezione', locationId: 'vetrina', libraryId: 'collezione-inverno' },
        { id: '1732300000000-vet1', name: 'Vetrina alta', locationId: 'vetrina' },
      ]));
      const list = JSON.parse(localStorage.getItem(pk));
      Object.assign(list.find((p) => p.sku === 'VIS-0098'), { libraryId: 'visone', shelfId: '1732300000000-pel1' });
      Object.assign(list.find((p) => p.sku === 'VIS-0142'), { shelfId: '1732300000000-inv1' });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['scaffali', async (page) => {
        await page.goto(`${APP}/settings/shelves`); await page.waitForTimeout(1800);
        await page.getByText('Scaffali (5)', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
      }],
      ['modulo', async (page) => {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.getByLabel('Nuovo scaffale', { exact: true }).first().click(); await page.waitForTimeout(400);
        await page.getByLabel('Nome', { exact: true }).first().fill('Ripiano giacche da sera');
        await page.getByLabel('Posizione Magazzino', { exact: true }).first().click();
        await page.getByLabel('Categoria dello scaffale', { exact: true }).first().click(); await page.waitForTimeout(400); // S2: tendina
        await page.getByLabel('Categoria Pellicce', { exact: true }).first().click();
        await page.getByLabel('Genera il codice', { exact: true }).first().click(); await page.waitForTimeout(400);
        await page.getByText('Categoria', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['aggiungi', async (page) => {
        await page.goto(`${APP}/add`); await page.waitForTimeout(1800);
        await page.getByText('Visone', { exact: true }).first().click(); await page.waitForTimeout(200);
        await page.getByText('Magazzino', { exact: true }).first().click(); await page.waitForTimeout(200);
        await page.getByLabel('Categoria Pellicce', { exact: true }).first().click(); await page.waitForTimeout(200);
        await page.getByLabel('Sottocategoria Visone', { exact: true }).first().click(); await page.waitForTimeout(200);
        await page.getByLabel('Scaffale Ripiano pellicce lunghe', { exact: true }).first().click(); await page.waitForTimeout(300);
        await page.getByText('Scaffale', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['modifica', async (page) => {
        await page.goto(`${APP}/product/edit/cmp-5`); await page.waitForTimeout(2000);
        await page.getByText('Scaffale (facoltativo)', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['scheda', async (page) => {
        await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800);
        await page.getByText('Posizione attuale', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['card', async (page) => { await page.goto(APP); await page.waitForTimeout(1500); await page.getByText('VIS-0098', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); }],
      ['scanner', async (page) => { await page.goto(`${APP}/scanner-action?type=shelf&id=1732300000000-pel1`); await page.waitForTimeout(1800); }],
    ],
  },
  // C2: «Tipo di pelle» solo in Campi Personalizzati: card del campo Base con la matita e la riga dei valori, editor dei
  // valori aperto (elenco con l'uso, rinomina), Impostazioni senza la voce. Nomi lunghi apposta, per vedere se vanno a capo.
  c2: {
    prepara: () => {
      const tipi = [['visone', 'Visone'], ['volpe', 'Volpe argentata della Groenlandia, pelle extra lunga'], ['zibellino', 'Zibellino'],
        ['cincilla', 'Cincillà'], ['ermellino', 'Ermellino'], ['astrakan', 'Astrakan'], ['altro', 'Altro'],
        ['visone_black', 'Visone Black Glama per cappotti da sera e giacche corte']];
      localStorage.setItem('furinventory_categories:local', JSON.stringify(tipi.map(([id, label]) => ({ id, label }))));
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      list.find((p) => p.sku === 'VIS-0098').furType = 'visone_black';
      list.find((p) => p.sku === 'AST-0033').deletedAt = '2026-11-23T08:00:00.000Z'; // Astrakan solo nel cestino
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['campi', async (page) => {
        await page.goto(`${APP}/settings/fields`); await page.waitForTimeout(1800);
        await page.getByText('Tipo di pelle', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['valori', async (page) => {
        await page.locator('[aria-label="Modifica i valori di Tipo di pelle"]').locator('visible=true').first().click(); await page.waitForTimeout(900);
      }],
      ['elenco', async (page) => { await page.getByText('Valori (8)', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'start' })); }],
      ['fondo', async (page) => { await page.getByText('Tocca un valore per rinominarlo', { exact: false }).first().evaluate((e) => e.scrollIntoView({ block: 'end' })); }],
      ['rinomina', async (page) => {
        await page.locator('[aria-label="Rinomina Volpe argentata della Groenlandia, pelle extra lunga"]').first().click(); await page.waitForTimeout(500);
        await page.getByText('Aggiungi un valore', { exact: false }).or(page.getByText('Rinomina «', { exact: false })).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
      }],
      ['impostazioni', async (page) => { await page.goto(`${APP}/settings`); await page.waitForTimeout(1500); await page.getByText('Fornitori e clienti', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); }],
    ],
  },
  // GAL: galleria della Scheda con miniature e frecce (foto 2 scelta, così si vedono le due frecce), Modifica con i
  // comandi della foto scelta, visore, foto che non si carica, prezzo d'acquisto 0
  gal: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      const vol = list.find((p) => p.sku === 'VOL-0087');
      vol.images = ['data:image/jpeg;base64,QUJDRA==', vol.images[0]];
      list.find((p) => p.sku === 'VIS-0098').purchasePrice = 0;
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['scheda', async (page) => {
        await page.goto(`${APP}/product/cmp-1`); await page.waitForTimeout(1800);
        await page.locator('[aria-label="Mostra la foto 2"]').locator('visible=true').first().click(); await page.waitForTimeout(600);
      }],
      ['modifica', async (page) => {
        await page.locator('[tabindex="0"]').filter({ hasText: /^.?\s*Modifica$/ }).locator('visible=true').first().click(); await page.waitForTimeout(1500);
        await page.locator('[aria-label="Mostra la foto 2"]').locator('visible=true').first().click(); await page.waitForTimeout(500);
        await page.getByText('Metti come principale', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['modifica-prima', async (page) => {
        await page.locator('[aria-label="Mostra la foto 1"]').locator('visible=true').first().click(); await page.waitForTimeout(500);
        await page.getByText('Foto principale', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['visore', async (page) => {
        await page.goto(`${APP}/product/cmp-1`); await page.waitForTimeout(1800);
        await page.locator('[aria-label="Apri la foto 1 a tutto schermo"]').locator('visible=true').first().click(); await page.waitForTimeout(800);
        await page.locator('[aria-label="Foto successiva"]').locator('visible=true').last().click(); await page.waitForTimeout(600);
      }],
      ['rotta', async (page) => { await page.goto(`${APP}/product/cmp-2`); await page.waitForTimeout(1800); }],
      ['prezzo-zero', async (page) => {
        await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800);
        await page.getByText('Prezzi', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
    ],
  },
  // COD: Scanner con l'inserimento a mano (che ora trova anche posizioni, scaffali e categorie), una automazione con
  // «Scrivi il codice» (pulsante sul lettore, poi il campo con il link), l'avviso di un codice doppio nel modulo delle
  // Posizioni (doppione già salvato: si segnala; codice nuovo già usato: si rifiuta) e la scelta dello Scanner
  cod: {
    prepara: () => {
      const lk = 'furinventory_locations:local';
      localStorage.setItem(lk, JSON.stringify([
        { id: 'magazzino', label: 'Magazzino', color: '#3B82F6', barcode: 'LOC-MAGAZZINO' },
        { id: 'vetrina', label: 'Vetrina', color: '#D4AF37' },
        { id: 'banco_uno', label: 'Banco Uno', color: '#10B981', barcode: 'LOC-DOPPIO' },
        { id: 'banco_due', label: 'Banco Due', color: '#8B5CF6', barcode: 'LOC-DOPPIO' },
      ]));
    },
    schermate: [
      ['scanner-a-mano', async (page) => {
        await page.goto(`${APP}/scanner`); await page.waitForTimeout(1800);
        await page.getByText('Inserisci Manualmente', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(500);
        await page.getByPlaceholder('Es: SKU-001, 1234567890123').fill('https://syncroflow.app/id/01/VIS-0142/21/000142');
      }],
      ['lettore', async (page) => {
        await page.goto(`${APP}/automations/scan-sell`); await page.waitForTimeout(1800);
        await page.getByText('Scansiona Prodotto', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(1200);
      }],
      ['scrivi-il-codice', async (page) => {
        await page.getByText('Scrivi il codice', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(500);
        await page.getByPlaceholder('Codice, SKU o link').locator('visible=true').first().fill('vis-0142');
      }],
      ['doppione-salvato', async (page) => {
        await page.goto(`${APP}/settings/locations`); await page.waitForTimeout(1800);
        await page.getByText('Banco Uno', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(600);
      }],
      ['codice-gia-usato', async (page) => {
        await page.getByPlaceholder('Scansiona o Genera...').locator('visible=true').first().fill('LOC-MAGAZZINO'); await page.waitForTimeout(400);
      }],
    ],
  },
  // ESE (ticket 29): costruttore con le frecce dei passi e «Imposta Campo», un rifiuto nell'esecuzione, l'automazione
  // che non inizia con una lettura, l'Audit con 8 posizioni e la ricerca
  ese: {
    prepara: () => {
      const st = (id, type, config, label) => ({ id, order: 0, type, config, label });
      const auto = (id, name, steps) => ({ id, name, icon: 'flash-on', color: '#3B82F6', description: '', qrValue: `AUTO:${id}`, steps: steps.map((s, i) => ({ ...s, order: i })), createdAt: '2026-11-22T00:00:00Z', usageCount: 0 });
      localStorage.setItem('@furinventory_custom_automations:local', JSON.stringify([
        auto('auto_controllo', 'Controllo capi', [st('s1', 'scan_product', {}, 'Scansiona Prodotto'),
          st('s2', 'add_tag', { tag: 'Controllato' }, 'Aggiungi Tag: Controllato'),
          st('s3', 'set_field', { fieldId: 'field_cmp_cond', fieldName: 'Condizione', fieldValue: 'Buono' }, 'Imposta Condizione = Buono'),
          st('s4', 'mark_sold', { pricePrompt: true }, 'Vendi (con conferma prezzo)')]),
        auto('auto_fissa', 'Solo vetrina', [st('s1', 'move_to', { useLastScannedLocation: false, locationId: 'vetrina' }, 'Sposta in: Vetrina')]),
      ]));
      localStorage.setItem('furinventory_locations:local', JSON.stringify([
        { id: 'magazzino', label: 'Magazzino', color: '#3B82F6' }, { id: 'vetrina', label: 'Vetrina', color: '#D4AF37' },
        { id: 'stand_a', label: 'Stand A', color: '#10B981' }, { id: 'stand_b', label: 'Stand B', color: '#10B981' },
        { id: 'stand_c', label: 'Stand C', color: '#10B981' }, { id: 'sartoria', label: 'Sartoria', color: '#8B5CF6' },
        { id: 'deposito', label: 'Deposito', color: '#14B8A6' }, { id: 'ricevimento', label: 'Ricevimento', color: '#EC4899' },
      ]));
    },
    schermate: [
      ['costruttore', async (page) => {
        await page.goto(`${APP}/automations/automation-flow/auto_controllo`); await page.waitForTimeout(1800);
        // matita in alto (la seconda icona da sinistra nella barra), come in a3-builder
        const top = await page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; }).filter((r) => r.w > 0 && r.y < 90).sort((a, b) => a.x - b.x));
        await page.mouse.click(top[1].x, top[1].y); await page.waitForTimeout(1200);
        await page.getByText('Flusso di lavoro', { exact: true }).locator('visible=true').first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
      }],
      ['imposta-campo', async (page) => {
        await page.getByText('Imposta Condizione = Buono', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(800);
      }],
      ['rifiuto', async (page) => {
        await page.goto(`${APP}/automations/custom-runner/auto_controllo`); await page.waitForTimeout(1800);
        await page.getByText('Scansiona Prodotto', { exact: true }).locator('visible=true').last().click(); await page.waitForTimeout(1000);
        await page.getByText('Scrivi il codice', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(400);
        await page.getByPlaceholder('Codice, SKU o link').locator('visible=true').first().fill('VOL-0087');
        await page.getByText('Usa codice', { exact: true }).locator('visible=true').first().click(); // il rifiuto resta 2 s
      }],
      ['senza-lettura', async (page) => {
        await page.goto(`${APP}/automations/custom-runner/auto_fissa`); await page.waitForTimeout(1800);
      }],
      ['audit-ricerca', async (page) => {
        await page.goto(`${APP}/automations/audit`); await page.waitForTimeout(1800);
        await page.getByPlaceholder('Cerca posizione').locator('visible=true').first().fill('stand'); await page.waitForTimeout(400);
      }],
    ],
  },
  // VAL (ticket 23): Aggiungi con una scelta, una valuta e il contatore; Modifica che rifiuta la Taglia tolta; Scheda con
  // «12,50 €» e l'opzione rinominata («M» → «Media», id uguale); editor dei valori di Taglia (OptionsEditor)
  val: {
    prepara: () => {
      const cf = 'furinventory_custom_fields:local';
      const fields = JSON.parse(localStorage.getItem(cf));
      const taglia = fields.find((f) => f.id === 'field_cmp_taglia');
      taglia.options = taglia.options.map((o) => (o.id === 'opt_2' ? { ...o, label: 'Media' } : o));
      taglia.dataset = taglia.options.map((o) => o.label);
      localStorage.setItem(cf, JSON.stringify(fields));
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      const vis = list.find((p) => p.sku === 'VIS-0142'); // «12,50» scritto prima di VAL (testo), Taglia «M» com'era
      vis.customData.find((d) => d.fieldSnapshot.id === 'field_cmp_riparazione').value = '12,50';
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['aggiungi', async (page) => {
        await page.goto(`${APP}/add`); await page.waitForTimeout(1800);
        await page.getByText('Media', { exact: true }).locator('visible=true').first().click();
        await page.locator('xpath=//div[normalize-space()="Costo riparazione"]/following-sibling::div[1]//input').first().fill('12,50');
        await page.getByText('Pezzi', { exact: true }).locator('visible=true').first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
      }],
      ['modifica-obbligatorio', async (page) => {
        await page.goto(`${APP}/product/edit/cmp-1`); await page.waitForTimeout(1800);
        await page.getByText('Media', { exact: true }).locator('visible=true').first().click(); // toglie la Taglia
        await page.getByText('Salva Modifiche', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(800);
        await page.getByText('Taglia', { exact: false }).locator('visible=true').first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['scheda', async (page) => {
        await page.goto(`${APP}/product/cmp-1`); await page.waitForTimeout(1800);
        await page.getByText('Campi strutturati', { exact: true }).locator('visible=true').first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
      }],
      ['editor-valori', async (page) => {
        await page.goto(`${APP}/settings/fields`); await page.waitForTimeout(1800);
        const card = page.getByText('Taglia', { exact: true }).locator('visible=true').first().locator('xpath=ancestor::div[.//div[@tabindex="0"]][1]');
        await card.locator('div[tabindex="0"]').first().click(); await page.waitForTimeout(900);
        await page.getByText('Valori da scegliere', { exact: true }).locator('visible=true').first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
      }],
    ],
  },
  // IND (ticket 28): Scanner con la X; Conta dai menu con una quantità scritta, poi il tasto del browser (si resta in
  // Conta, al passo prima) e la domanda all'uscita (finestra del browser, che non entra nella schermata: il testo si
  // stampa con gli errori, la risposta è «Annulla» e la schermata mostra la Conta rimasta); «Prodotto non trovato» con
  // «Torna all'inventario» in Scheda e Modifica
  ind: {
    rifiuta: true,
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(pk));
      Object.assign(list.find((p) => p.sku === 'VIS-0098'), { unit: 'pz', stock: { magazzino: 5 }, location: 'magazzino' });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['scanner', async (page) => {
        await page.getByText('Automazioni', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(1200);
        await page.evaluate(() => {
          const g = String.fromCodePoint(0xf206);
          [...document.querySelectorAll('div')].find((d) => d.childElementCount === 0 && d.textContent === g && d.offsetParent).click();
        });
        await page.waitForTimeout(1500);
      }],
      ['conta-elenco', async (page) => {
        await page.goBack(); await page.waitForTimeout(1200); // X o tasto del browser: torna ad Automazioni
        await page.getByText('Conta Magazzino', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(800);
        await page.getByLabel('Conta Magazzino', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(500);
        await page.getByLabel('Contata VIS-0098', { exact: true }).locator('visible=true').first().fill('3');
      }],
      ['conta-tasto-indietro', async (page) => { await page.goBack(); await page.waitForTimeout(1500); }],
      ['conta-domanda-annullata', async (page) => { await page.goBack(); await page.waitForTimeout(1500); }],
      ['scheda-non-trovata', async (page) => { await page.goto(`${APP}/product/inesistente`); await page.waitForTimeout(1800); }],
      ['modifica-non-trovata', async (page) => { await page.goto(`${APP}/product/edit/inesistente`); await page.waitForTimeout(1800); }],
    ],
  },
  // S1b: giacenza sugli scaffali. VIS-0098 con 5 pezzi in Magazzino e 3 su A1: Scheda per scaffale, Movimenta con la
  // fila «Scaffale» in «Da» e in «A», eliminazione di A1 rifiutata (finestra del browser: il testo si stampa), Aggiungi
  // con la quantità e lo scaffale, Azione rapida dello scaffale con la quantità.
  s1b: {
    prepara: () => {
      const pk = 'inventory:v1:local:products';
      localStorage.setItem('furinventory_shelves:local', JSON.stringify([
        { id: '1732300000000-gen1', name: 'A1', locationId: 'magazzino', barcode: 'SCAF-MAG-A1' },
        { id: '1732300000000-gen2', name: 'Ripiano giacche lunghe', locationId: 'magazzino' },
      ]));
      const list = JSON.parse(localStorage.getItem(pk));
      Object.assign(list.find((p) => p.sku === 'VIS-0098'), { unit: 'pz', location: 'magazzino', stock: { magazzino: 5, 'magazzino/1732300000000-gen1': 3 } });
      localStorage.setItem(pk, JSON.stringify(list));
    },
    schermate: [
      ['scheda', async (page) => {
        await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800);
        await page.getByText('Giacenza', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
      }],
      ['movimenta', async (page) => {
        await page.getByLabel('Movimenta', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(500);
        await page.getByLabel('Tipo Trasferimento', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(200);
        await page.getByLabel('Da Magazzino › A1', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(200);
        await page.getByLabel('A Magazzino', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(300);
      }],
      ['scaffali-elimina-rifiutata', async (page) => {
        await page.goto(`${APP}/settings/shelves`); await page.waitForTimeout(1800);
        await page.getByLabel('Elimina scaffale A1', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(600);
      }],
      ['aggiungi-quantita', async (page) => {
        await page.goto(`${APP}/add`); await page.waitForTimeout(1800);
        await page.getByText('Visone', { exact: true }).first().click(); await page.waitForTimeout(200);
        await page.getByText('Magazzino', { exact: true }).first().click(); await page.waitForTimeout(200);
        await page.getByLabel('Quantità', { exact: true }).first().fill('4');
        await page.getByLabel('Scaffale A1', { exact: true }).first().click(); await page.waitForTimeout(300);
        await page.getByText('Scaffale', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      }],
      ['scaffale-azione-rapida', async (page) => { await page.goto(`${APP}/scanner-action?type=shelf&id=1732300000000-gen1`); await page.waitForTimeout(1800); }],
    ],
  },
};
// m04 parte dallo stato di m03 (le funzioni passano al browser una per volta)
FETTE.m04.prima = FETTE.m03.prepara;
// S2 (corsia B, 24/11): scaffali con le barre verde, blu e rossa, modulo di un ripiano e di una barra, «Quanti ne
// entrano», Scheda con il riempimento. Aggiunta qui sotto (non dentro l'oggetto) per non scontrarsi con le altre corsie.
FETTE.s2 = {
  prepara: () => {
    const pk = 'inventory:v1:local:products';
    localStorage.setItem('furinventory_shelves:local', JSON.stringify([
      { id: '1732300000000-s2a1', name: 'A1', locationId: 'magazzino', length: 50, depth: 50, height: 30, maxWeight: 10, maxPieces: 20 },
      { id: '1732300000000-s2a2', name: 'A2', locationId: 'magazzino', libraryId: 'pellicce', maxPieces: 10 },
      { id: '1732300000000-s2a3', name: 'A3', locationId: 'magazzino', maxPieces: 10, maxWeight: 25 },
      { id: '1732300000000-s2b1', name: 'Barra giacche', locationId: 'magazzino', kind: 'barra', height: 150, maxPieces: 15 },
    ]));
    const list = JSON.parse(localStorage.getItem(pk));
    const set = (sku, data, drop = []) => { const p = list.find((x) => x.sku === sku); Object.assign(p, data); for (const k of drop) delete p[k]; };
    set('VIS-0098', { unit: 'pz', location: 'magazzino', stock: { 'magazzino/1732300000000-s2a1': 8 } }, ['weight', 'length', 'width']); // 40%
    set('LIN-0021', { unit: 'pz', location: 'magazzino', stock: { 'magazzino/1732300000000-s2a2': 7 } }, ['weight']); // 70%
    set('PUZ-0012', { unit: 'pz', location: 'magazzino', stock: { 'magazzino/1732300000000-s2a3': 9 } }, ['weight']); // 90%
    set('VIS-0142', { location: 'magazzino', shelfId: '1732300000000-s2b1' });
    set('VOL-0087', { length: 40, width: 30, height: 20 });
    localStorage.setItem(pk, JSON.stringify(list));
  },
  schermate: [
    ['scaffali', async (page) => {
      await page.goto(`${APP}/settings/shelves`); await page.waitForTimeout(1800);
      await page.getByText('Scaffali (4)', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
    }],
    ['scaffali-barra', async (page) => {
      await page.getByLabel('Modifica scaffale Barra giacche', { exact: true }).locator('visible=true').first().evaluate((e) => e.scrollIntoView({ block: 'center' }));
    }],
    ['modulo-ripiano', async (page) => {
      await page.getByLabel('Modifica scaffale A1', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(600);
      await page.getByText('Tipo', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
    }],
    ['modulo-barra', async (page) => {
      await page.getByLabel('Modifica scaffale Barra giacche', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(600);
      await page.getByText('Tipo', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
    }],
    ['tendina-categoria', async (page) => {
      await page.getByLabel('Categoria dello scaffale', { exact: true }).locator('visible=true').first().click(); await page.waitForTimeout(700);
    }],
    ['quanti-ne-entrano', async (page) => {
      await page.goto(`${APP}/settings/shelves`); await page.waitForTimeout(1800);
      await page.getByLabel('Prodotto da provare', { exact: true }).first().fill('VOL'); await page.waitForTimeout(300);
      await page.getByLabel('Prova con VOL-0087', { exact: true }).first().click(); await page.waitForTimeout(400);
      await page.getByText('Quanti ne entrano', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
    }],
    ['scheda', async (page) => {
      await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800);
      await page.getByText('Spazio sullo scaffale', { exact: true }).first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
    }],
  ],
};

// S3 (corsia B, 24/11): avviso in linea in Movimenta («R2 sarà pieno»), finestra del blocco con la proposta, la
// destinazione «Magazzino › R2» dello Spostamento rapido col riempimento, l'informazione «oltre il limite» in Conta.
// Aggiunta qui sotto (non dentro l'oggetto) per non scontrarsi con le altre corsie.
FETTE.s3 = {
  prepara: () => {
    const pk = 'inventory:v1:local:products';
    const r2 = '1732400000000-r2';
    localStorage.setItem('furinventory_shelves:local', JSON.stringify([
      { id: r2, name: 'R2', locationId: 'magazzino', barcode: 'SCAF-MAG-R2', maxPieces: 2 },
      { id: '1732400000000-g1', name: 'G1', locationId: 'magazzino', maxPieces: 10 },
    ]));
    localStorage.setItem('furinventory_locations:local', JSON.stringify([
      { id: 'magazzino', label: 'Magazzino', color: '#3B82F6' },
      { id: 'vetrina', label: 'Vetrina', color: '#D4AF37', capacity: 2 },
      { id: 'stand_a', label: 'Stand A', color: '#10B981' },
      { id: 'stand_b', label: 'Stand B', color: '#10B981' },
      { id: 'stand_c', label: 'Stand C', color: '#10B981' },
      { id: 'sartoria', label: 'Sartoria', color: '#8B5CF6' },
    ]));
    const list = JSON.parse(localStorage.getItem(pk));
    const vis = list.find((x) => x.sku === 'VIS-0098');
    Object.assign(vis, { unit: 'pz', location: 'magazzino', stock: { [`magazzino/${r2}`]: 1, vetrina: 1 } });
    for (const key of ['weight', 'length', 'width', 'libraryId']) delete vis[key];
    localStorage.setItem(pk, JSON.stringify(list));
  },
  schermate: [
    ['avviso-movimenta', async (page) => {
      await page.goto(`${APP}/product/cmp-5`); await page.waitForTimeout(1800);
      await page.getByLabel('Movimenta', { exact: true }).first().click(); await page.waitForTimeout(500);
      await page.getByLabel('In Magazzino', { exact: true }).first().click(); await page.waitForTimeout(200);
      await page.getByLabel('In Magazzino › R2', { exact: true }).first().click(); await page.waitForTimeout(200);
      await page.locator('input[placeholder^="es. 2,5"]').first().fill('1'); await page.waitForTimeout(500);
    }],
    ['blocco-proposta', async (page) => {
      await page.locator('input[placeholder^="es. 2,5"]').first().fill('2'); await page.waitForTimeout(300);
      await page.getByLabel('Registra movimento', { exact: true }).first().click(); await page.waitForTimeout(900);
    }],
    ['spostamento-scaffale', async (page) => {
      await page.goto(`${APP}/automations/batch-move`); await page.waitForTimeout(1800);
      await page.getByText('Scansiona Posizione', { exact: true }).first().click(); await page.waitForTimeout(600);
      await page.getByText('Scrivi il codice', { exact: true }).first().click(); await page.waitForTimeout(300);
      await page.getByPlaceholder('Codice, SKU o link').first().fill('SCAF-MAG-R2');
      await page.getByText('Usa codice', { exact: true }).first().click(); await page.waitForTimeout(900);
    }],
    ['conta-informazione', async (page) => {
      await page.goto(`${APP}/automations/count`); await page.waitForTimeout(1800);
      await page.getByLabel('Conta Vetrina', { exact: true }).first().click(); await page.waitForTimeout(500);
      await page.getByLabel('Contata VIS-0098', { exact: true }).first().fill('3');
      await page.getByLabel('Riepilogo della conta', { exact: true }).first().click(); await page.waitForTimeout(600);
    }],
  ],
};

(async () => {
  const fetta = FETTE[process.env.FETTA];
  if (!fetta) throw new Error(`FETTA sconosciuta: ${process.env.FETTA} (note: ${Object.keys(FETTE).join(', ')})`);
  const browser = await chromium.launch({ headless: true });
  for (const stile of STILI) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/Deleting database failed/.test(m.text())) errors.push(m.text().slice(0, 120)); });
    page.on('pageerror', (e) => errors.push(`pageerror ${e.message.slice(0, 120)}`));
    // `rifiuta`: le finestre del browser si chiudono con «Annulla» (IND: la domanda della Conta lascia la Conta a video)
    const finestre = [];
    page.on('dialog', (d) => { finestre.push(d.message().replace(/\n+/g, ' | ').slice(0, 120)); return fetta.rifiuta ? d.dismiss() : d.accept(); });
    await page.goto(APP); await page.waitForTimeout(2500);
    await page.evaluate(async (stile) => {
      localStorage.setItem('@syncro/stile', stile);
      const seed = await (await fetch('http://localhost:8765/seed.json')).json();
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k.includes('{org}') ? k.replace('{org}', 'local') : `${k}:local`, JSON.stringify(v));
      localStorage.setItem('inventory:v1:local:alerts', '[]');
      localStorage.setItem('inventory:v1:local:deleted_product_ids', '[]');
    }, stile);
    if (fetta.prima) await page.evaluate(fetta.prima);
    await page.evaluate(fetta.prepara);
    await page.goto(APP); await page.getByText('VIS-0142', { exact: true }).first().waitFor();
    let n = 1;
    for (const [nome, fai] of fetta.schermate) {
      await fai(page);
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT, `${stile}-${n}-${nome}.png`) });
      n += 1;
    }
    console.log(stile, 'errori console:', errors.length ? errors : 0, ...(finestre.length ? ['| finestre:', JSON.stringify(finestre)] : []));
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
