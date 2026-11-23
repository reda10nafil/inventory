// Verifica Chat e Team (23 novembre) - solo per le prove, NON fa parte dell'app.
// Scrive solo schermate in SHOTS (lib.cjs). Uso, da questa cartella:
//   SHOTS=<questa cartella> node ct-chat-team.cjs [nome-scenario]
// Richiede l'app su :8082 e il campionario su :8765 (non li avvia).
const P = require('path').join(__dirname, '../../../../prova') + '/';
const { scenario, APP, log } = require(P + 'lib.cjs');
const { iconAt, timelineIds, newEvents } = require(P + 'a3-util.cjs');
const solo = process.argv[2];
const run = (name, fn, opts) => (!solo || name.includes(solo) ? scenario(name, fn, opts) : null);

// Chat: oggi si apre solo da Impostazioni › Accesso Multi-Utente › link (unico ingresso).
async function apriChat(h) {
  await h.tab('Impostazioni');
  await h.click('Accesso Multi-Utente');
  await h.click('Apri Chat Team (placeholder router.push)');
  return h.has('Chat Operativa', true);
}
async function bottoniChat(h) {
  const input = h.page.getByPlaceholder('Messaggio team...');
  const box = await input.boundingBox();
  const row = (await iconAt(h)).filter((b) => Math.abs(b.y - (box.y + box.height / 2)) < 30 && b.x > box.x + box.width).sort((a, c) => a.x - c.x);
  return { input, card: row[0], send: row[1] };
}
// Primo pulsante con quel testo dentro lo schermo (le card scorrono in orizzontale)
async function clicTesto(h, testo) {
  const p = await h.page.evaluate((t) => [...document.querySelectorAll('*')]
    .filter((e) => e.childElementCount === 0 && (e.innerText || '').trim() === t)
    .map((e) => e.getBoundingClientRect()).filter((r) => r.x > 0 && r.x + r.width < 375 && r.y > 0 && r.y < 760)
    .map((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }))[0], testo);
  if (!p) return false;
  await h.page.mouse.click(p.x, p.y); await h.page.waitForTimeout(1000);
  return true;
}
const loc = async (h, sku) => ((await h.products()).find((p) => p.sku === sku) || {}).location;

(async () => {
  // CT: «Sposta» della card singola sposta tra vetrina e magazzino, scritto nel codice, e dice sempre «eseguito»
  await run('ct-chat-sposta-card', async (h) => {
    await apriChat(h);
    const b = await bottoniChat(h);
    await h.page.mouse.click(b.card.x, b.card.y); await h.page.waitForTimeout(1000);
    const prima = { 'VIS-0142': await loc(h, 'VIS-0142'), 'LIN-0021': await loc(h, 'LIN-0021') };
    const before = await timelineIds(h);
    const cliccato = await clicTesto(h, 'Sposta'); // prima card visibile: VIS-0142 (in vetrina)
    const dopo = { 'VIS-0142': await loc(h, 'VIS-0142'), 'LIN-0021': await loc(h, 'LIN-0021') };
    return { cliccato, prima, dopo, eventi: (await newEvents(h, before, 0)).map((e) => `${e.type} ${e.productId} ${JSON.stringify(e.details)}`) };
  });

  // CT: messaggio «ricevuto» con uno SKU che questo telefono non ha (simulato nello storico)
  await run('ct-chat-sku-sconosciuto', async (h) => {
    await h.page.evaluate(() => localStorage.setItem('chat_messages', JSON.stringify([
      { id: 'ct1', payload: { skus: ['ZZZ-0001'], automationIds: ['auto-audit-vetrina'], text: 'Da altro telefono' }, createdAt: new Date().toISOString(), isOwn: false },
    ])));
    await h.page.reload(); await h.page.getByText('VIS-0142', { exact: true }).first().waitFor(); await h.page.waitForTimeout(800);
    await apriChat(h);
    const attesa = await h.has('In sincronizzazione', false);
    const before = await timelineIds(h);
    const approva = h.page.getByText(/Approva Spostamento/).locator('visible=true').last();
    const c = await approva.count();
    if (c) { await approva.click(); await h.page.waitForTimeout(1000); }
    await h.shot('sku-sconosciuto');
    return { cardInAttesa: attesa, approvaPresente: c > 0, eventi: (await newEvents(h, before, 0)).length };
  });

  // P28 (a) e (d) + P29 (b): copie del messaggio, chiave dello storico, riapertura e indirizzo /Chat
  await run('ct-chat-ricarica', async (h) => {
    await apriChat(h);
    const b = await bottoniChat(h);
    await b.input.fill('CT messaggio unico');
    await h.page.mouse.click(b.send.x, b.send.y); await h.page.waitForTimeout(800);
    const copieSchermo = await h.page.getByText('CT messaggio unico', { exact: true }).count();
    const salvati = (await h.store('chat_messages', 800)) || [];
    const copieSalvate = salvati.filter((m) => m.payload && m.payload.text === 'CT messaggio unico').length;
    const chiavi = await h.page.evaluate(() => Object.keys(localStorage).filter((k) => /chat/i.test(k)));
    const url = h.page.url();
    await h.page.goto(url); await h.page.waitForTimeout(2500);
    const riapertura = `${new URL(h.page.url()).pathname} notFound=${await h.has('Page Not Found', false)}`;
    return { copieSchermo, copieSalvate, chiavi, riapertura };
  });

  // Home: quali pulsanti ci sono in alto (atteso: solo la ricerca)
  await run('ct-home-icone', async (h) => {
    const testa = (await iconAt(h)).filter((b) => b.y < 90).map((b) => `${Math.round(b.x)},${Math.round(b.y)} «${b.t}»`);
    await h.shot('home');
    return { pulsantiInAlto: testa };
  });

  // WatermelonDB/LokiJS sul web: le tabelle della mesh contengono l'inventario o la chat?
  await run('ct-indexeddb', async (h) => {
    await apriChat(h);
    const b = await bottoniChat(h);
    await b.input.fill('CT-MARCA-IDB');
    await h.page.mouse.click(b.send.x, b.send.y); await h.page.waitForTimeout(1500);
    const idb = await h.page.evaluate(async () => {
      const out = {};
      const dbs = indexedDB.databases ? await indexedDB.databases() : [];
      for (const { name } of dbs) {
        const db = await new Promise((res, rej) => { const r = indexedDB.open(name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        let text = '';
        const stores = [...db.objectStoreNames];
        for (const s of stores) {
          text += await new Promise((res) => { try { const rq = db.transaction(s, 'readonly').objectStore(s).getAll(); rq.onsuccess = () => res(JSON.stringify(rq.result)); rq.onerror = () => res(''); } catch { res(''); } });
        }
        out[name] = { stores, lunghezza: text.length, haVIS0142: text.includes('VIS-0142'), haMessaggio: text.includes('CT-MARCA-IDB') };
        db.close();
      }
      return out;
    });
    const prodotti = (await h.products(0)).length;
    return { prodottiInventario: prodotti, indexedDB: idb };
  });

  // Due operatori sul web: due contesti del browser, A scrive, B guarda; B prova a unirsi come Client
  if (!solo || 'ct-due-contesti'.includes(solo)) {
    const PW = process.env.PW || 'playwright' /* come prova/lib.cjs: impostare PW */;
    const { chromium } = require(PW);
    const browser = await chromium.launch({ headless: true });
    const dialoghi = { A: [], B: [] };
    const apri = async (who) => {
      const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
      const page = await ctx.newPage();
      page.on('dialog', async (d) => { dialoghi[who].push(d.message().replace(/\n+/g, ' | ').slice(0, 120)); await d.accept(); });
      await page.goto(APP); await page.waitForTimeout(2500);
      await page.evaluate(async () => {
        const seed = await (await fetch('http://localhost:8765/seed.json')).json();
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k.includes('{org}') ? k.replace('{org}', 'local') : `${k}:local`, JSON.stringify(v));
      });
      await page.goto(APP); await page.getByText('VIS-0142', { exact: true }).first().waitFor(); await page.waitForTimeout(800);
      return page;
    };
    let esito;
    try {
      const A = await apri('A'); const B = await apri('B');
      const vis = (p, t) => p.getByText(t, { exact: true }).locator('visible=true').first();
      for (const p of [A, B]) {
        await vis(p, 'Impostazioni').click(); await p.waitForTimeout(1200);
        await vis(p, 'Accesso Multi-Utente').click(); await p.waitForTimeout(4000);
      }
      // B: Client, indirizzo scritto a mano verso una porta chiusa del computer (nessun server avviato)
      await vis(B, 'Client (Scansiona)').click(); await B.waitForTimeout(800);
      // porta alta chiusa (la 9 è bloccata da Chromium e darebbe un errore diverso)
      await B.getByPlaceholder('ws://192.168.1.50:8080?token=0123456789ABCDEF').fill('ws://127.0.0.1:59999?token=CTPROVA');
      const go = await B.evaluate(() => { const i = [...document.querySelectorAll('input')].find((e) => (e.placeholder || '').startsWith('ws://')); const r = i.getBoundingClientRect(); return { x: r.right + 30, y: r.y + r.height / 2 }; });
      await B.mouse.click(go.x, go.y); await B.waitForTimeout(9000);
      // A: chat, messaggio
      await vis(A, 'Apri Chat Team (placeholder router.push)').click(); await A.waitForTimeout(1200);
      await A.getByPlaceholder('Messaggio team...').fill('CT da A a B');
      await A.keyboard.press('Tab');
      const hA = { page: A }; const row = (await iconAt(hA)).filter((b) => b.y > 700).sort((a, c) => c.x - a.x);
      await A.mouse.click(row[0].x, row[0].y); await A.waitForTimeout(1000);
      await vis(B, 'Apri Chat Team (placeholder router.push)').click(); await B.waitForTimeout(1500);
      esito = {
        A_vede: await A.getByText('CT da A a B', { exact: true }).count(),
        B_vede: await B.getByText('CT da A a B', { exact: true }).count(),
        dialoghi,
      };
    } catch (e) { esito = { esito: 'ERRORE SCRIPT', nota: e.message.split('\n')[0], dialoghi }; }
    log('[ct-due-contesti]', JSON.stringify(esito));
    await browser.close();
  }
})();
