// A3 - Tagging di massa (QuickTag): tag comune e tag personalizzato scritti nelle note (lettura simulata).
const { scenario } = require('./lib.cjs');
const { scan, iconAt, product, timelineIds, newEvents } = require('./a3-util.cjs');
(async () => {
  // 1. Tag «Da Pulire» su LIN-0021 (note vuote) e su AST-0033 (note già presenti); seconda lettura: niente doppioni
  await scenario('a3-tag-comune', async (h) => {
    await h.go('automations/quick-tag');
    await h.click('Da Pulire');
    const attivo = await h.has('MODALITÀ TAGGING ATTIVA');
    await h.click('Scansiona Prodotto');
    const before = await timelineIds(h);
    const used = await scan(h, 'LIN-0021');
    await scan(h, 'AST-0033');
    await scan(h, 'LIN-0021'); // già taggato
    const lin = await product(h, 'LIN-0021');
    const ast = await product(h, 'AST-0033', 0);
    const ev = await newEvents(h, before, 0);
    const conteggio = await h.page.evaluate(() => document.body.innerText.match(/(\d+) prodotti taggati/)?.[1]);
    return { attivo, lettore: used, noteLIN: lin.technicalNotes, noteAST: ast.technicalNotes, eventiNuovi: ev, conteggio };
  });

  // 2. Tag personalizzato scritto nel campo, avvio con la freccia (sola icona)
  await scenario('a3-tag-personale', async (h) => {
    await h.go('automations/quick-tag');
    const input = h.page.getByPlaceholder('Es. Collezione 2024');
    await input.fill('Collezione 2026');
    const box = await input.boundingBox();
    const list = await iconAt(h);
    const go = list.filter((b) => Math.abs(b.y - (box.y + box.height / 2)) < 30 && b.x > box.x + box.width).sort((a, c) => a.x - c.x)[0];
    await h.page.mouse.click(go.x, go.y);
    await h.page.waitForTimeout(700);
    const attivo = await h.has('Collezione 2026', true);
    await h.click('Scansiona Prodotto');
    await scan(h, 'PUZ-0012');
    const p = await product(h, 'PUZ-0012');
    return { attivo, notePUZ: p.technicalNotes };
  });
})();
