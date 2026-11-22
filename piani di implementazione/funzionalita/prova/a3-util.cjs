// Aiuti dell'area A3 (Automazioni, Scanner, Chat) - solo per le prove, NON fanno parte dell'app.
// scan(): sul web la fotocamera non c'è. Si chiama direttamente il gestore che il componente fotocamera
// riceve dalla schermata (BarcodeScanner.onScan o CameraView.onBarcodeScanned), come farebbe una lettura vera.
// Così si prova la logica dell'app dopo la lettura; la fotocamera in sé resta non verificata.

async function scan(h, data, { wait = 900 } = {}) {
  const used = await h.page.evaluate((code) => {
    const host = document.getElementById('root') || document.body;
    const all = [host, ...host.querySelectorAll('*')];
    let fiber = null;
    for (const el of all) {
      const k = Object.keys(el).find((x) => x.startsWith('__reactContainer$') || x.startsWith('__reactFiber$'));
      if (k) { fiber = el[k]; break; }
    }
    if (!fiber) return 'nessuna radice React';
    while (fiber.return) fiber = fiber.return;
    const root = fiber.stateNode && fiber.stateNode.current ? fiber.stateNode.current : fiber;
    const hits = [];
    const stack = [[root, 0]];
    while (stack.length) {
      const [n, d] = stack.pop();
      const p = n.memoizedProps;
      if (p && typeof p === 'object') {
        for (const name of ['onScan', 'onBarcodeScanned']) {
          if (typeof p[name] === 'function') hits.push({ n, d, name });
        }
      }
      if (n.sibling) stack.push([n.sibling, d]);
      if (n.child) stack.push([n.child, d + 1]);
    }
    // Le schermate sotto (pila di navigazione) restano montate ma nascoste: si tiene solo il lettore visibile.
    const hostOf = (f) => {
      const s = [f];
      while (s.length) { const n = s.shift(); if (n.stateNode instanceof HTMLElement) return n.stateNode; if (n.child) s.push(n.child); }
      return null;
    };
    const visible = hits.filter((x) => { const el = hostOf(x.n); return el && el.getClientRects().length > 0; });
    if (!visible.length) return 'nessun lettore visibile';
    visible.sort((a, b) => a.d - b.d);
    const top = visible[0];
    top.n.memoizedProps[top.name]({ type: 'qr', data: code });
    return top.name;
  }, data);
  await h.page.waitForTimeout(wait);
  return used;
}

// Clic sull'elemento premibile (tabindex=0) più vicino a un punto, per i pulsanti con sola icona.
async function iconAt(h, x, y) {
  const list = await h.page.evaluate(() => [...document.querySelectorAll('[tabindex="0"]')].map((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, t: (e.innerText || '').slice(0, 30) };
  }).filter((r) => r.w > 0 && r.h > 0));
  return list;
}

async function product(h, sku, wait) {
  return (await h.products(wait)).find((p) => p.sku === sku);
}

async function events(h, productId, wait = 0) {
  return (await h.timeline(wait)).filter((e) => e.productId === productId);
}

// Eventi di cronologia comparsi dopo `before` (elenco di id preso prima dell'azione).
async function timelineIds(h) { return (await h.timeline(0)).map((e) => e.id); }
async function newEvents(h, before, wait = 1500) {
  const set = new Set(before);
  return (await h.timeline(wait)).filter((e) => !set.has(e.id)).map((e) => ({ type: e.type, productId: e.productId, details: e.details }));
}

module.exports = { scan, iconAt, product, events, timelineIds, newEvents };
