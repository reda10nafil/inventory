// A3 - Audit posizione: attesi, trovati, mancanti, intrusi (lettura simulata), D15 su «Sposta qui».
const { scenario } = require('./lib.cjs');
const { scan, iconAt, product, timelineIds, newEvents } = require('./a3-util.cjs');

const stats = (h) => h.page.evaluate(() => {
  const t = document.body.innerText;
  const n = (k) => t.match(new RegExp(`${k}:\\s*(\\d+)`))?.[1];
  return { trovati: n('Trovati'), mancanti: n('Mancanti'), intrusi: n('Intrusi'), pct: t.match(/(\d+)%/)?.[1] };
});
// pulsante tondo del lettore in basso (sola icona): l'elemento premibile più in basso
async function fab(h) {
  const list = await iconAt(h);
  const b = list.sort((a, c) => c.y - a.y)[0];
  await h.page.mouse.click(b.x, b.y);
  await h.page.waitForTimeout(700);
}

(async () => {
  // 1. Stand B: atteso LIN-0021. Si legge LIN-0021 (trovato), poi VIS-0142 (in vetrina: intruso) con «Sposta qui»
  await scenario('a3-audit-intruso-sposta', async (h) => {
    await h.go('automations/audit');
    await h.click('Stand B');
    const inizio = await stats(h);
    await fab(h);
    const used = await scan(h, 'LIN-0021', { wait: 1500 });
    const dopoTrovato = await stats(h);
    // il lettore si riapre da solo dopo 1 s
    const before = await timelineIds(h);
    await scan(h, 'VIS-0142', { wait: 1200 });
    const fine = await stats(h);
    const p = await product(h, 'VIS-0142');
    const ev = await newEvents(h, before, 0);
    return { lettore: used, inizio, dopoTrovato, fine, posizioneVIS0142: p.location, eventiNuovi: ev };
  }, { dialogs: ['2', 'ok'] });

  // 2. Intruso solo aggiunto (scelta 1), poi codice sconosciuto: nessuna modifica ai dati
  await scenario('a3-audit-intruso-aggiungi', async (h) => {
    await h.go('automations/audit');
    await h.click('Stand B');
    await fab(h);
    const before = await timelineIds(h);
    await scan(h, 'PUZ-0012', { wait: 1000 });
    const dopo = await stats(h);
    await fab(h);
    await scan(h, 'NON-ESISTE', { wait: 1000 });
    const p = await product(h, 'PUZ-0012');
    const ev = await newEvents(h, before, 0);
    // uscita e rientro: l'audit è perso?
    await h.go('automations/audit');
    const ricominciato = await h.has('Inizia Inventario');
    return { dopo, posizionePUZ0012: p.location, eventiNuovi: ev, dopoUscitaRicomincia: ricominciato };
  }, { dialogs: ['1', 'ok'] });
})();
