// A2 - Impostazioni > Dati e backup: esporta CSV, importa CSV (pulsante e trascinamento), andata e ritorno, backup Drive.
const fs = require('fs');
const { scenario } = require('./lib.cjs');

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
  await h.page.waitForTimeout(1200);
}
async function esporta(h) {
  const dl = h.page.waitForEvent('download', { timeout: 8000 });
  await h.click('Esporta Inventario');
  const d = await dl;
  return { nome: d.suggestedFilename(), testo: fs.readFileSync(await d.path(), 'utf8') };
}

(async () => {
  // 1. Esporta, poi re-importa lo stesso file con SKU cambiati (RT-...): cosa si perde?
  await scenario('a2-csv-esporta-reimporta', async (h) => {
    await h.tab('Impostazioni');
    const originali = await h.products(0);
    const { nome, testo } = await esporta(h);
    const rows = parseCsv(testo);
    const header = rows[0];
    const rt = [header, ...rows.slice(1).map((r) => r.map((v, i) => (i === 0 ? `RT-${v}` : v)))];
    await drop(h, toCsv(rt), 'reimport.csv');
    const dopo = await h.products();
    const confronto = originali.map((o) => {
      const n = dopo.find((p) => p.sku === `RT-${o.sku}`);
      if (!n) return { sku: o.sku, importato: false };
      const diff = [];
      for (const k of ['furType', 'location', 'status', 'purchasePrice', 'sellPrice', 'length', 'width', 'weight', 'technicalNotes', 'libraryId', 'gs1DigitalLink']) {
        if (JSON.stringify(o[k] ?? null) !== JSON.stringify(n[k] ?? (k === 'technicalNotes' ? '' : null)) && !(o[k] == null && (n[k] === '' || n[k] == null))) diff.push(k);
      }
      if ((o.images || []).length !== (n.images || []).length) diff.push(`foto ${(o.images || []).length}->${(n.images || []).length}`);
      if ((o.customData || []).length !== (n.customData || []).length) diff.push('customData');
      return { sku: o.sku, persi: diff };
    });
    return { file: nome, righe: rows.length - 1, colonne: header.length, haCartella: header.some((c) => /cartella|folder|library/i.test(c)), prodottiDopo: dopo.length, confronto };
  });

  // 2. Importa col pulsante (scelta del file del browser)
  await scenario('a2-csv-importa-pulsante', async (h) => {
    await h.tab('Impostazioni');
    const chooser = h.page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
    await h.click('Importa prodotti CSV');
    const fc = await chooser;
    if (fc) await fc.setFiles({ name: 'nuovo.csv', mimeType: 'text/csv', buffer: Buffer.from('SKU,Tipo Pelle,Posizione\r\nA2-BTN-001,volpe,stand_a\r\n') });
    await h.page.waitForTimeout(2000);
    const p = (await h.products()).find((x) => x.sku === 'A2-BTN-001');
    return { filechooser: !!fc, importato: !!p };
  });

  // 3. Trascina un CSV: una riga nuova, uno SKU già presente, uno SKU vuoto
  await scenario('a2-csv-trascina', async (h) => {
    await h.tab('Impostazioni');
    const csv = 'SKU,Tipo Pelle,Posizione,Status,Prezzo Vendita,Note\r\nA2-CSV-001,volpe,stand_a,venduto,"1234,50","Nota con, virgola"\r\nVIS-0142,visone,vetrina,,,\r\n,visone,vetrina,,,\r\n';
    await drop(h, csv);
    const list = await h.products();
    const p = list.find((x) => x.sku === 'A2-CSV-001');
    const ev = p ? (await h.timeline(0)).filter((e) => e.productId === p.id).map((e) => e.type) : [];
    await drop(h, 'Codice,Nome\r\nX,Y\r\n', 'senza-sku.csv');
    await drop(h, 'qualcosa', 'foto.png');
    return { prodotti: list.length, nuovo: p && { furType: p.furType, location: p.location, status: p.status, sellPrice: p.sellPrice, note: p.technicalNotes, images: p.images }, eventi: ev };
  });

  // 4. Backup Google Drive (login disattivato)
  await scenario('a2-backup-drive', async (h) => {
    await h.tab('Impostazioni');
    const prima = await h.products(0);
    await h.click('Backup Google Drive');
    return { prodottiInvariati: (await h.products()).length === prima.length };
  });
})();
