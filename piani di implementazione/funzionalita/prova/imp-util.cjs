// Aiuti per l'import (IMP, fetta DATI): da IMP il riquadro per trascinare il file e la scelta del file sono nella
// schermata «Importa prodotti» (Impostazioni › Dati e backup › Importa prodotti CSV), con abbinamento e anteprima.
// Le prove di prima che trascinavano un CSV in Impostazioni passano da qui: si apre la schermata, si trascina il file,
// si tocca «Importa N prodotti» (l'abbinamento proposto, come un utente che non cambia nulla) e si torna con «Fatto».
const DROP = '[aria-label="Importa CSV trascinando un file qui"]';

async function apriImport(h) {
  if (await h.page.locator(DROP).isVisible().catch(() => false)) return;
  if (!(await h.has('Importa prodotti CSV', true))) await h.tab('Impostazioni');
  await h.click('Importa prodotti CSV');
  await h.page.locator(DROP).waitFor({ timeout: 8000 });
  await h.page.waitForTimeout(500);
}

/** Tocca «Importa N prodotti» se c'è qualcosa da importare; poi torna dov'era (Fatto, oppure Annulla e Indietro). */
async function chiudiImport(h, { importa = true } = {}) {
  const bottone = h.page.getByText(/^Importa \d+ prodott[oi]$/).locator('visible=true').first();
  let importati = 0;
  if (importa && await bottone.count()) {
    const testo = await bottone.innerText();
    importati = Number(/\d+/.exec(testo)[0]);
    if (importati > 0) { await bottone.click(); await h.page.waitForTimeout(1500); }
  }
  const fatto = h.page.getByText('Fatto', { exact: true }).locator('visible=true').first();
  if (importati > 0 && await fatto.count()) { await fatto.click(); await h.page.waitForTimeout(900); return importati; }
  const annulla = h.page.getByText('Annulla', { exact: true }).locator('visible=true').first();
  if (await annulla.count()) { await annulla.click(); await h.page.waitForTimeout(300); }
  await h.page.goBack(); await h.page.waitForTimeout(900);
  return 0;
}

/** Trascina un file (testo o byte) sul riquadro della schermata d'import, fino all'anteprima. */
async function trascina(h, contenuto, nome = 'prova.csv', tipo = 'text/csv') {
  await apriImport(h);
  const dati = typeof contenuto === 'string' ? { testo: contenuto } : { byte: Array.from(contenuto) };
  const dt = await h.page.evaluateHandle(([d, n, t]) => {
    const x = new DataTransfer();
    x.items.add(new File([d.testo !== undefined ? d.testo : new Uint8Array(d.byte)], n, { type: t }));
    return x;
  }, [dati, nome, tipo]);
  await h.page.locator(DROP).dispatchEvent('drop', { dataTransfer: dt });
  await h.page.waitForTimeout(1200);
}

/** Come il «drop» delle prove di prima: trascina, importa con l'abbinamento proposto, torna. Restituisce quanti. */
async function importaCsv(h, contenuto, nome = 'prova.csv', tipo = 'text/csv') {
  await trascina(h, contenuto, nome, tipo);
  return chiudiImport(h);
}

/** Col pulsante «Scegli file» (la finestra dei file del browser). */
async function importaConPulsante(h, buffer, nome = 'prova.csv', mimeType = 'text/csv') {
  await apriImport(h);
  const chooser = h.page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null);
  await h.click('Scegli file');
  const fc = await chooser;
  if (fc) await fc.setFiles({ name: nome, mimeType, buffer });
  await h.page.waitForTimeout(1500);
  const n = await chiudiImport(h);
  return { filechooser: !!fc, importati: n };
}

module.exports = { DROP, apriImport, chiudiImport, trascina, importaCsv, importaConPulsante };
