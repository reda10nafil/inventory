// A3 - Chat operativa: come si raggiunge, messaggio di testo, card prodotti, Approva spostamento, Vendi dalla card.
const { scenario } = require('./lib.cjs');
const { iconAt, product, timelineIds, newEvents } = require('./a3-util.cjs');
(async () => {
  await scenario('a3-chat', async (h) => {
    await h.tab('Impostazioni');
    await h.click('Rete del negozio'); // ACC1: prima «Accesso Multi-Utente»
    await h.click('Apri la Chat'); // RETE0: prima «Apri Chat Team (placeholder router.push)»
    const aperta = await h.has('Chat Operativa', true);
    // messaggio di testo
    const input = h.page.getByPlaceholder('Messaggio team...');
    await input.fill('Prova messaggio A3');
    const box = await input.boundingBox();
    const row = (await iconAt(h)).filter((b) => Math.abs(b.y - (box.y + box.height / 2)) < 30 && b.x > box.x + box.width).sort((a, c) => a.x - c.x);
    const [cardBtn, sendBtn] = row;
    await h.page.mouse.click(sendBtn.x, sendBtn.y); await h.page.waitForTimeout(800);
    const salvati = await h.store('chat_messages', 800);
    const testoSalvato = (salvati || []).some((m) => m.payload && m.payload.text === 'Prova messaggio A3');
    const copieMessaggio = await h.page.getByText('Prova messaggio A3', { exact: true }).count();
    // card demo con 3 prodotti disponibili
    await h.page.mouse.click(cardBtn.x, cardBtn.y); await h.page.waitForTimeout(1000);
    await h.shot('card');
    const before = await timelineIds(h);
    const approva = h.page.getByText(/Approva Spostamento/).locator('visible=true').last();
    const etichetta = await approva.innerText();
    await approva.click(); await h.page.waitForTimeout(1000);
    const prods = await h.products();
    const pos = Object.fromEntries(['VIS-0142', 'LIN-0021', 'AST-0033'].map((s) => [s, prods.find((p) => p.sku === s).location]));
    const evApprova = await newEvents(h, before, 0);
    // «Vendi» sulla prima card: vende subito?
    const before2 = await timelineIds(h);
    // primo «Vendi» dentro lo schermo (le card scorrono in orizzontale)
    const vendi = await h.page.evaluate(() => [...document.querySelectorAll('*')]
      .filter((e) => e.childElementCount === 0 && (e.innerText || '').trim() === 'Vendi')
      .map((e) => e.getBoundingClientRect()).filter((r) => r.x > 0 && r.x + r.width < 375 && r.y > 0 && r.y < 760)
      .map((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }))[0]);
    await h.page.mouse.click(vendi.x, vendi.y); await h.page.waitForTimeout(1000);
    const venduti = (await h.products()).filter((p) => p.status === 'sold').map((p) => p.sku);
    const evVendi = await newEvents(h, before2, 0);
    return { aperta, testoSalvato, copieMessaggio, chiaveStorage: 'chat_messages', etichetta, posizioni: pos, eventiApprova: evApprova.map((e) => `${e.type} ${e.productId} ${JSON.stringify(e.details)}`), venduti, eventiVendi: evVendi };
  });
})();
