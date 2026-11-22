// M10 - Fornitori e clienti (ticket 07): anagrafica in Impostazioni, contatto e prezzo nella finestra «Movimenta»
// (Scheda e Azione rapida), nome del contatto in Cronologia e nel report dei movimenti, contatto usato non
// eliminabile. Per ogni scenario si legge lo stato salvato: chiave dei contatti, `contactId` negli eventi,
// giacenza salvata = eventi `stock` rigiocati.
const fs = require('fs');
const { scenario } = require('./lib.cjs');

const P = 'inventory:v1:local:products';
const T = 'inventory:v1:local:timeline';
const C = 'furinventory_contacts:local';

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
function replay(events) {
  const m = {};
  for (const e of events) {
    if (e.type !== 'stock' || typeof e.details.qty !== 'number') continue;
    const q = Math.round(e.details.qty * 1000);
    if (e.details.from) m[e.details.from] = (m[e.details.from] || 0) - q;
    if (e.details.to) m[e.details.to] = (m[e.details.to] || 0) + q;
  }
  return Object.fromEntries(Object.entries(m).filter(([, v]) => v !== 0).map(([k, v]) => [k, v / 1000]));
}
const positive = (stock) => Object.fromEntries(Object.entries(stock || {}).filter(([, q]) => q > 0));
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

const ROSSI = { id: 'c-rossi', name: 'Conceria Rossi', kind: 'fornitore', phone: '333 1234567' };
const BIANCHI = { id: 'c-bianchi', name: 'Bianchi', kind: 'cliente' };
const NERI = { id: 'c-neri', name: 'Neri', kind: 'cliente', note: 'paga a 30 giorni' };

// Stato di partenza scritto nel browser: contatti e VIS-0098 articolo a quantità, con gli eventi che lo spiegano
async function prepara(h, { contatti = [], stock = { magazzino: 5 }, eventi = [], extra = {} } = {}) {
  await h.page.evaluate(([pk, tk, ck, contatti, stock, eventi, extra]) => {
    if (contatti.length) localStorage.setItem(ck, JSON.stringify(contatti));
    const list = JSON.parse(localStorage.getItem(pk));
    const p = list.find((x) => x.sku === 'VIS-0098');
    const tl = JSON.parse(localStorage.getItem(tk) || '[]');
    const ev = (n, details) => tl.unshift({ id: `m10-${n}`, productId: p.id, type: 'stock', timestamp: `2026-11-22T${String(8 + n).padStart(2, '0')}:00:00.000Z`, details });
    ev(0, { movement: 'carico', qty: stock.magazzino, to: 'magazzino', reason: 'iniziale', before: 0, after: stock.magazzino });
    let total = stock.magazzino;
    eventi.forEach((d, i) => {
      const after = total + (d.to ? d.qty : -d.qty);
      ev(i + 1, { ...d, before: total, after });
      total = after;
    });
    Object.assign(p, { stock: { magazzino: total }, unit: 'pz', ...extra });
    localStorage.setItem(pk, JSON.stringify(list));
    localStorage.setItem(tk, JSON.stringify(tl));
  }, [P, T, C, contatti, stock, eventi, extra]);
  await h.go('');
}
// Tre movimenti già registrati: acquisto da Rossi, vendita a Bianchi, carico con un contatto che non è in elenco
const EVENTI = [
  { movement: 'carico', qty: 3, to: 'magazzino', reason: 'acquisto', contactId: 'c-rossi' },
  { movement: 'scarico', qty: 2, from: 'magazzino', reason: 'vendita', finalPrice: 120, contactId: 'c-bianchi' },
  { movement: 'carico', qty: 1, to: 'magazzino', contactId: 'c-sparito' },
];

async function check(h, sku = 'VIS-0098') {
  const p = (await h.products(1500)).find((x) => x.sku === sku);
  const ev = (await h.timeline(0)).filter((e) => e.productId === p.id && e.type === 'stock');
  return { p, ev, coincide: same(positive(p.stock), replay(ev)) };
}
const label = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').first();
const quanti = (h, name) => h.page.getByLabel(name, { exact: true }).locator('visible=true').count();
// Pillole dei contatti nella finestra, nell'ordine in cui si vedono
const pillole = (h) => h.page.locator('[aria-label^="Contatto "]').locator('visible=true').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label').replace('Contatto ', '')));
const riga = (e) => `${e.details.movement}/${e.details.reason || '-'}/${e.details.qty}/${e.details.from || ''}>${e.details.to || ''}/${e.details.contactId || '-'}/${e.details.finalPrice ?? '-'}`;

async function apriScheda(h, sku = 'VIS-0098') {
  await h.click(sku); await h.page.waitForTimeout(800);
  await label(h, 'Movimenta').click(); await h.page.waitForTimeout(500);
}
async function movimento(h, { tipo, qty, causale, prezzo, contatto }) {
  if (tipo) await label(h, `Tipo ${tipo}`).click();
  await h.page.locator('input[placeholder^="es. 2,5"]').locator('visible=true').first().fill(qty);
  if (causale) await label(h, `Causale ${causale}`).click();
  if (prezzo != null) await label(h, 'Prezzo per unità').fill(prezzo);
  if (contatto) await label(h, `Contatto ${contatto}`).click();
  await label(h, 'Registra movimento').click();
  await h.page.waitForTimeout(800);
}
const again = async (h) => { await label(h, 'Movimenta').click(); await h.page.waitForTimeout(400); };
async function creaContatto(h, { nome, tipo, telefono, email, nota }) {
  if (await quanti(h, 'Nuovo contatto')) { await label(h, 'Nuovo contatto').click(); await h.page.waitForTimeout(300); }
  await label(h, 'Nome').fill(nome);
  if (tipo) await label(h, `Tipo ${tipo}`).click();
  if (telefono) await label(h, 'Telefono (facoltativo)').fill(telefono);
  if (email) await label(h, 'Email (facoltativa)').fill(email);
  if (nota) await label(h, 'Nota (facoltativa)').fill(nota);
  await label(h, 'Crea contatto').click();
  await h.page.waitForTimeout(700);
}
async function scarica(h, voce) {
  const dl = h.page.waitForEvent('download', { timeout: 8000 });
  await h.click(voce);
  const d = await dl;
  return parseCsv(fs.readFileSync(await d.path(), 'utf8').replace(/^﻿/, ''));
}
// Scanner › Inserisci Manualmente › codice › Cerca: si apre l'Azione rapida
async function leggi(h, codice) {
  await h.go('scanner');
  await h.click('Inserisci Manualmente');
  await h.page.getByPlaceholder('Es: SKU-001, 1234567890123').fill(codice);
  await h.click('Cerca');
}

(async () => {
  // 1. Anagrafica da Impostazioni: la chiave nasce col primo contatto; doppione per tipo; filtro; modifica; elimina
  await scenario('m10-anagrafica', async (h) => {
    const chiaveAllInizio = await h.store(C, 0);
    await h.tab('Impostazioni');
    await h.click('Fornitori e clienti'); await h.page.waitForTimeout(800);
    const indirizzo = `${new URL(h.page.url()).pathname} «${await h.page.title()}»`;
    const chiaveDopoApertura = await h.store(C, 800);
    const moduloGiaAperto = (await quanti(h, 'Crea contatto')) === 1;
    await label(h, 'Crea contatto').click(); await h.page.waitForTimeout(500); // nome vuoto: rifiutato
    await creaContatto(h, { nome: 'Conceria Rossi', telefono: '333 1234567', email: 'ordini@rossi.example', nota: 'consegna il martedì' });
    const dopoIlPrimo = await h.store(C);
    await creaContatto(h, { nome: 'Bianchi', tipo: 'Cliente' });
    await creaContatto(h, { nome: ' conceria ROSSI ', tipo: 'Fornitore' }); // doppione dello stesso tipo: rifiutato
    await label(h, 'Tipo Cliente').click();
    await label(h, 'Crea contatto').click(); await h.page.waitForTimeout(700); // la stessa ditta come cliente: va bene
    const tre = await h.store(C);
    await label(h, 'Filtro Fornitori').click(); await h.page.waitForTimeout(300);
    const soloFornitori = await h.page.locator('[aria-label^="Apri "]').locator('visible=true').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label').replace('Apri ', '')));
    await label(h, 'Filtro Clienti').click(); await h.page.waitForTimeout(300);
    const soloClienti = await h.page.locator('[aria-label^="Apri "]').locator('visible=true').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label').replace('Apri ', '')));
    const conteggi = [await h.has('Tutti · 3', true), await h.has('Fornitori · 1', true), await h.has('Clienti · 2', true)];
    // Modifica dalla scheda: l'id resta lo stesso
    await label(h, 'Apri Cliente Bianchi').click(); await h.page.waitForTimeout(500);
    const schedaVuota = await h.has('Nessun movimento registrato con questo contatto.', true);
    await label(h, 'Modifica contatto').click(); await h.page.waitForTimeout(400);
    await label(h, 'Nome').fill('Bianchi Moda');
    await label(h, 'Telefono (facoltativo)').fill('02 555');
    await label(h, 'Salva contatto').click(); await h.page.waitForTimeout(700);
    const dopoModifica = await h.store(C);
    // Elimina un contatto mai usato (conferma)
    await label(h, 'Filtro Tutti').click(); await h.page.waitForTimeout(300);
    await label(h, 'Elimina Cliente conceria ROSSI').click(); await h.page.waitForTimeout(700);
    const fine = await h.store(C);
    const bianchiPrima = tre.find((c) => c.name === 'Bianchi');
    return {
      chiaveAllInizio, chiaveDopoApertura, moduloGiaAperto, indirizzo,
      primo: dopoIlPrimo.map(({ id, ...rest }) => rest),
      idOpachi: tre.every((c) => /^\d{13}-[a-z0-9]+$/.test(c.id)) && new Set(tre.map((c) => c.id)).size === 3,
      tre: tre.map((c) => `${c.kind}:${c.name}`),
      soloFornitori, soloClienti, conteggi, schedaVuota,
      modificaStessoId: dopoModifica.find((c) => c.name === 'Bianchi Moda')?.id === bianchiPrima.id,
      modificato: (({ id, ...rest }) => rest)(dopoModifica.find((c) => c.name === 'Bianchi Moda')),
      fine: fine.map((c) => `${c.kind}:${c.name}`),
      schedaChiusaDopoElimina: (await quanti(h, 'Chiudi scheda')) === 0,
    };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'] });

  // 2. Movimenta dalla Scheda: ordine delle pillole, contatto solo per carico e scarico, prezzo solo con Vendita
  await scenario('m10-movimenta', async (h) => {
    await prepara(h, { contatti: [NERI, ROSSI, BIANCHI] });
    await apriScheda(h);
    const carico = await pillole(h);
    const prezzoSenzaVendita = await quanti(h, 'Prezzo per unità');
    await label(h, 'Tipo Trasferimento').click(); const trasferimento = await pillole(h);
    await label(h, 'Tipo Rettifica').click(); const rettifica = await pillole(h);
    await label(h, 'Tipo Scarico').click(); const scarico = await pillole(h);
    await label(h, 'Causale Vendita').click(); const prezzoConVendita = await quanti(h, 'Prezzo per unità');
    const listino = await h.page.getByPlaceholder('Vuoto = listino 3.800').count();
    await label(h, 'Causale Danno').click(); const prezzoConDanno = await quanti(h, 'Prezzo per unità');
    // Carico 3 da un fornitore; il contatto scelto e poi il cambio di tipo: non resta scelto
    await label(h, 'Tipo Carico').click();
    await label(h, 'Contatto Fornitore Conceria Rossi').click();
    await label(h, 'Tipo Scarico').click(); await label(h, 'Tipo Carico').click();
    await movimento(h, { qty: '3', causale: 'Acquisto' });
    const { ev: senza } = await check(h);
    await again(h); await movimento(h, { qty: '3', causale: 'Acquisto', contatto: 'Fornitore Conceria Rossi' });
    const schedaConNome = await h.has('Acquisto: +3 pz in Magazzino · Fornitore Conceria Rossi', true);
    await again(h); await movimento(h, { tipo: 'Scarico', qty: '2', causale: 'Vendita', prezzo: '120', contatto: 'Cliente Bianchi' });
    await again(h); await movimento(h, { qty: '1', causale: 'Reso', contatto: 'Cliente Neri' }); // reso in carico da un cliente
    await again(h); await movimento(h, { tipo: 'Scarico', qty: '1', causale: 'Vendita' }); // senza prezzo: listino
    await again(h); await movimento(h, { tipo: 'Scarico', qty: '1', causale: 'Vendita', prezzo: 'abc' }); // rifiutato
    const restaAperta = await h.has('Movimenta VIS-0098', true);
    await h.click('Annulla');
    const { p, ev, coincide } = await check(h);
    await h.go('');
    await h.tab('Cronologia');
    await h.click('Movimenti');
    const cronologia = await h.page.getByText(/^VIS-0098 - /).locator('visible=true').allInnerTexts();
    return {
      carico, trasferimento, rettifica, scarico, prezzoSenzaVendita, prezzoConVendita, listino, prezzoConDanno,
      contattoPersoAlCambioTipo: senza[0].details.contactId === undefined,
      schedaConNome, restaAperta, stock: p.stock, coincide, eventi: ev.map(riga), cronologia,
    };
  }, { dialogs: ['ok'] });

  // 3. Report dei movimenti con il nome; scheda del contatto; contatto usato non eliminabile; rinomina; elimina
  await scenario('m10-report-e-scheda', async (h) => {
    await prepara(h, { contatti: [ROSSI, BIANCHI, NERI], eventi: EVENTI });
    await h.tab('Impostazioni');
    const righe = await scarica(h, 'Esporta movimenti');
    const col = (name) => righe[0].indexOf(name);
    const report = righe.slice(1).map((r) => [r[col('SKU')], r[col('Tipo')], r[col('Quantità')], r[col('Prezzo')], r[col('Contatto')]].join('|'));
    await h.go('settings/contacts');
    const elenco = await h.page.locator('[aria-label^="Apri "]').locator('visible=true').allInnerTexts();
    await label(h, 'Apri Fornitore Conceria Rossi').click(); await h.page.waitForTimeout(500);
    const scheda = {
      telefono: await h.has('333 1234567', true),
      titolo: await h.has('Movimenti (1)', true),
      movimento: await h.has('VIS-0098 · Acquisto: +3 pz in Magazzino', true),
    };
    await label(h, 'Chiudi scheda').click(); await h.page.waitForTimeout(300);
    // Usato: l'eliminazione è rifiutata, la chiave non cambia e la scheda non si apre
    await label(h, 'Elimina Fornitore Conceria Rossi').click(); await h.page.waitForTimeout(700);
    const dopoRifiuto = (await h.store(C)).map((c) => c.id);
    const schedaChiusa = (await quanti(h, 'Chiudi scheda')) === 0;
    // Rinomina: gli eventi tengono l'id, la Cronologia mostra il nome nuovo
    await label(h, 'Apri Fornitore Conceria Rossi').click(); await h.page.waitForTimeout(400);
    await label(h, 'Modifica contatto').click(); await h.page.waitForTimeout(400);
    await label(h, 'Nome').fill('Rossi Pellami');
    await label(h, 'Salva contatto').click(); await h.page.waitForTimeout(700);
    // Mai usato: si elimina
    await label(h, 'Elimina Cliente Neri').click(); await h.page.waitForTimeout(700);
    const fine = (await h.store(C)).map((c) => `${c.id}:${c.name}`);
    const idNegliEventi = (await h.timeline(0)).filter((e) => e.type === 'stock').map((e) => e.details.contactId || '-');
    await h.go('');
    await h.tab('Cronologia');
    await h.click('Movimenti');
    const cronologia = await h.page.getByText(/^VIS-0098 - /).locator('visible=true').allInnerTexts();
    return { intestazione: righe[0].join('|'), report, elenco: elenco.map((t) => t.replace(/\s+/g, ' ').trim()), scheda, dopoRifiuto, schedaChiusa, fine, idNegliEventi, cronologia };
  }, { dialogs: ['ok', 'ok', 'ok'] });

  // 4. Prodotto eliminato per sempre dal Cestino: i suoi movimenti restano, il contatto resta non eliminabile
  await scenario('m10-prodotto-eliminato', async (h) => {
    await prepara(h, { contatti: [ROSSI, BIANCHI], eventi: EVENTI, extra: { deletedAt: '2026-11-22T12:00:00.000Z' } });
    await h.go('settings/trash');
    await h.click('Svuota');
    const prodotti = (await h.products()).map((p) => p.sku);
    const eventiRimasti = (await h.timeline(0)).filter((e) => e.productId === 'cmp-5' && e.type === 'stock').length;
    await h.go('settings/contacts');
    const elenco = await h.page.locator('[aria-label^="Apri "]').locator('visible=true').allInnerTexts();
    await label(h, 'Apri Fornitore Conceria Rossi').click(); await h.page.waitForTimeout(500);
    const scheda = { titolo: await h.has('Movimenti (1)', true), movimento: await h.has('Prodotto eliminato · Acquisto: +3 pz in Magazzino', true) };
    await label(h, 'Chiudi scheda').click(); await h.page.waitForTimeout(300);
    await label(h, 'Elimina Fornitore Conceria Rossi').click(); await h.page.waitForTimeout(700);
    const contatti = (await h.store(C)).map((c) => c.id);
    await h.go('');
    await h.tab('Impostazioni');
    const righe = await scarica(h, 'Esporta movimenti');
    const col = (name) => righe[0].indexOf(name);
    await h.go('');
    await h.tab('Cronologia');
    await h.click('Movimenti');
    const cronologia = await h.page.getByText(/^Prodotto eliminato - /).locator('visible=true').allInnerTexts();
    return {
      prodotti, eventiRimasti, elenco: elenco.map((t) => t.replace(/\s+/g, ' ').trim()), scheda, contatti,
      report: righe.slice(1).map((r) => [r[col('SKU')], r[col('Tipo')], r[col('Contatto')]].join('|')),
      cronologia,
    };
  }, { dialogs: ['ok', 'ok'] });

  // 5. Azione rapida: Carico e Scarico con contatto e prezzo; l'avviso dice chi
  await scenario('m10-azione-rapida', async (h) => {
    await prepara(h, { contatti: [ROSSI, BIANCHI] });
    await leggi(h, 'VIS-0098');
    await label(h, 'Carico').click(); await h.page.waitForTimeout(500);
    const carico = await pillole(h);
    await movimento(h, { qty: '3', causale: 'Acquisto', contatto: 'Fornitore Conceria Rossi' });
    const scannerDopoCarico = await h.has('Scanner QR/Barcode', true);
    await leggi(h, 'VIS-0098');
    await label(h, 'Scarico').click(); await h.page.waitForTimeout(500);
    const scarico = await pillole(h);
    await movimento(h, { qty: '2', causale: 'Vendita', prezzo: '50', contatto: 'Cliente Bianchi' });
    const { p, ev, coincide } = await check(h);
    return { carico, scarico, scannerDopoCarico, stock: p.stock, coincide, eventi: ev.map(riga) };
  }, { dialogs: ['ok', 'ok'] });

  // 6. Senza contatti la finestra è quella di prima e nessuno scrive la chiave
  await scenario('m10-senza-contatti', async (h) => {
    await prepara(h);
    await apriScheda(h);
    const etichetta = (await h.has('Fornitore o cliente (facoltativo)', true)) || (await h.has('Cliente o fornitore (facoltativo)', true));
    const numeroPillole = (await pillole(h)).length;
    await movimento(h, { qty: '2', causale: 'Acquisto' });
    await again(h);
    await label(h, 'Tipo Scarico').click();
    const etichettaScarico = await h.has('Cliente o fornitore (facoltativo)', true);
    await movimento(h, { qty: '1' });
    const { p, ev, coincide } = await check(h);
    await h.go('settings/contacts');
    const vuoto = await h.has('Nessun contatto: crea il primo qui sopra.', true);
    return { etichetta, numeroPillole, etichettaScarico, stock: p.stock, coincide, eventi: ev.map(riga), vuoto, chiave: await h.store(C, 800) };
  });

  // 7. Tanti contatti: la finestra ne propone 6 e «Altri N» mostra i restanti, senza una seconda finestra
  await scenario('m10-molti-contatti', async (h) => {
    const tanti = Array.from({ length: 9 }, (_, i) => ({ id: `c-${i}`, name: `Ditta ${i + 1}`, kind: i < 5 ? 'fornitore' : 'cliente' }));
    await prepara(h, { contatti: tanti });
    await apriScheda(h);
    const subito = await pillole(h);
    const altri = await h.has('Altri 3', true);
    await label(h, 'Mostra tutti i contatti').click(); await h.page.waitForTimeout(300);
    const tutti = await pillole(h);
    await movimento(h, { qty: '1', contatto: 'Cliente Ditta 9' });
    const { ev, coincide } = await check(h);
    return { subito: subito.length, altri, tutti: tutti.length, ultimo: tutti[tutti.length - 1], coincide, evento: riga(ev[0]) };
  });
})();
