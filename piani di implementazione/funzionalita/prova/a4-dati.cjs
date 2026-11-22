// a4: Impostazioni › Dati e backup - Esporta CSV, Importa CSV (pulsante e trascinamento), Backup Google Drive.
// Uso: node a4-dati.cjs [nome-scenario]
const { scenario } = require('./lib.cjs');
const fs = require('fs');
const solo = process.argv[2];
const run = (name, fn, opts) => (!solo || name.includes(solo) ? scenario(name, fn, opts) : null);

const HEADER = 'SKU,Tipo Pelle,Posizione,Status,Prezzo Acquisto,Prezzo Vendita,Lunghezza,Larghezza,Peso,Note,Data Produzione,Immagini URL,Dati Personalizzati JSON,GS1 Digital Link,Link allegati Drive JSON';
const CSV = [HEADER,
  'NEW-001,Visone,magazzino,available,1000,2500,110,50,3,Prova import,,,,,',
  'NEW-002,Volpe,sartoria,venduto,800,1900,,,,,,,,,',
  'VIS-0142,Visone,vetrina,available,,,,,,,,,,,'].join('\n');

(async () => {
  // Si mette AST-0033 nel cestino, poi si esporta: si guarda cosa contiene il file.
  await run('a4-dati-esporta', async (h) => {
    await h.vis('AST-0033').evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await h.page.waitForTimeout(500);
    await h.longPress('AST-0033');
    await h.page.mouse.click(256, 675);
    const cestino = (await h.products()).filter((p) => p.deletedAt).map((p) => p.sku);
    await h.go('settings');
    const [dl] = await Promise.all([h.page.waitForEvent('download', { timeout: 8000 }), h.click('Esporta Inventario')]);
    const file = await dl.path();
    const testo = fs.readFileSync(file, 'utf8');
    const righe = testo.trim().split(/\r?\n/);
    return {
      nomeFile: dl.suggestedFilename(), righeDati: righe.length - 1, intestazione: righe[0].slice(0, 80) + '…',
      prodottiNelCestino: cestino, cestinoNelFile: righe.some((r) => r.startsWith('AST-0033')),
      colonnaCartella: /cartella|library|folder/i.test(righe[0]), colonnaEliminato: /elimin|deleted|cestino/i.test(righe[0]),
    };
  }, { dialogs: ['ok'] });

  await run('a4-dati-importa-trascina', async (h) => {
    await h.go('settings');
    await h.page.evaluate((csv) => {
      const zone = document.querySelector('[aria-label="Importa CSV trascinando un file qui"]');
      const dt = new DataTransfer();
      dt.items.add(new File([csv], 'prova.csv', { type: 'text/csv' }));
      zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    }, CSV);
    await h.page.waitForTimeout(800);
    const prods = await h.products();
    const n1 = prods.find((p) => p.sku === 'NEW-001');
    const n2 = prods.find((p) => p.sku === 'NEW-002');
    return {
      totale: prods.length,
      'NEW-001': n1 && { location: n1.location, status: n1.status, sellPrice: n1.sellPrice, libraryId: n1.libraryId, gs1: n1.gs1DigitalLink, images: n1.images },
      'NEW-002': n2 && { location: n2.location, status: n2.status },
      vis0142Copie: prods.filter((p) => p.sku === 'VIS-0142').length,
    };
  });

  await run('a4-dati-importa-pulsante', async (h) => {
    await h.go('settings');
    let scelta = 'nessuna finestra file';
    try {
      const [chooser] = await Promise.all([h.page.waitForEvent('filechooser', { timeout: 5000 }), h.click('Importa prodotti CSV')]);
      await chooser.setFiles({ name: 'prova.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) });
      scelta = 'file scelto';
    } catch (e) { scelta = 'nessuna finestra file: ' + e.message.split('\n')[0]; }
    await h.page.waitForTimeout(1500);
    const prods = await h.products();
    return { scelta, totale: prods.length, importato: prods.some((p) => p.sku === 'NEW-001') };
  });
})();
