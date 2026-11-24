// UX1-0 (ticket 34): binario a tutta riga in Aggiungi, finestra dal basso unica, binario comune, bordo di Minimal.
// Richiesta dell'utente del 24: Tipo di pelle, Posizione e Categoria in Aggiungi tornano un binario orizzontale.
// - ux10-binari: in Aggiungi Tipo di pelle, Posizione e Categoria (con la sottocategoria) sono binari a tutta riga
//   (larghezza letta dal DOM), nessuna tendina; i prezzi restano affiancati; il prodotto si salva come prima; il
//   layout salvato è identico (testo della chiave) prima e dopo;
// - ux10-tendina: con «Menu a tendina» scelto in Campi Posizione torna tendina nella sua colonna; la Categoria resta
//   binario; il layout salvato non cambia;
// - ux10-finestra-ruota: la ruota di Larghezza a 1/3 si apre in una finestra dal basso (entro il 90% dello schermo, con
//   la velatura che chiude) e si chiude con la X, con Esc e con Indietro del browser (resta Aggiungi, il codice scritto
//   resta); dopo, un Indietro va a Home: nessuna voce in più nella storia;
// - ux10-finestra-categoria: la categoria dello scaffale (Impostazioni › Scaffali) nella stessa finestra, con la X, Esc
//   e Indietro;
// - ux10-binario-apertura: l'ultima pillola a vista di ogni binario è tagliata (dal 25 al 75% dentro); toccare una
//   pillola non fa scorrere il binario; in Modifica la scelta (posizione e categoria in fondo ai binari) è a vista
//   all'apertura, con la spunta;
// - ux10-minimal: in Minimal il bordo dei campi e delle pillole è #E7E6E3 (prima uguale al fondo #F4F4F2).
// Ogni scenario restituisce `ok` e i dettagli. Uso: node ux10-scelte.cjs [nome-scenario]
const { scenario } = require('./lib.cjs');
const e = require('./edc-util.cjs');
const v = require('./val-util.cjs');

const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const LAYOUT = 'furinventory_layout_config:local';
const LIBS = 'inventory:v1:local:libraries';
const layoutGrezzo = (h) => h.page.evaluate((k) => localStorage.getItem(k), LAYOUT);

/** Binari visibili: larghezza, riga (top) e se scorrono. */
const binari = (page, nomi) => page.evaluate((ls) => Object.fromEntries(ls.map((l) => {
  const el = [...document.querySelectorAll(`[aria-label="${l}"]`)].find((x) => x.offsetParent);
  if (!el) return [l, null];
  const r = el.getBoundingClientRect();
  return [l, { larghezza: Math.round(r.width), top: Math.round(r.top + window.scrollY), scorre: el.scrollWidth > el.clientWidth }];
})), nomi);
/** Tendine visibili il cui nome comincia con «Nome: ». */
const tendine = (page) => page.evaluate(() => [...document.querySelectorAll('[aria-expanded]')]
  .filter((x) => x.offsetParent).map((x) => ({ label: x.getAttribute('aria-label'), larghezza: Math.round(x.getBoundingClientRect().width) })));

/** Ultima pillola a vista di un binario: quanta parte sta dentro (0-1) e lo scorrimento del binario. */
const taglio = (page, nome) => page.evaluate((l) => {
  const el = [...document.querySelectorAll(`[aria-label="${l}"]`)].find((x) => x.offsetParent);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const pills = [...el.querySelectorAll('[tabindex="0"]')].map((p) => p.getBoundingClientRect());
  const aVista = pills.filter((p) => p.left < r.right - 0.5);
  const ultima = aVista[aVista.length - 1];
  return {
    scorre: el.scrollWidth > el.clientWidth,
    dentro: ultima ? Math.round(((r.right - ultima.left) / ultima.width) * 100) / 100 : null,
    scrollLeft: Math.round(el.scrollLeft),
  };
}, nome);

/** Finestra dal basso aperta: quanta parte dello schermo occupa (velatura = il resto) e il titolo a vista. */
const finestra = (page, velatura) => page.evaluate((vl) => {
  const s = [...document.querySelectorAll(`[aria-label="${vl}"]`)].find((x) => x.getClientRects().length > 0);
  if (!s) return null;
  return { altezza: Math.round((1 - s.getBoundingClientRect().height / window.innerHeight) * 100) / 100 };
}, velatura);

(async () => {
  // 1. Binari a tutta riga in Aggiungi, salvataggio come prima, layout identico
  await run('ux10-binari', async (h) => {
    // Sottocategoria «Giacche lunghe» sotto «Pellicce»
    await h.page.evaluate((lk) => {
      const libs = JSON.parse(localStorage.getItem(lk));
      libs.push({ id: 'giacche-lunghe', name: 'Giacche lunghe', icon: 'folder', createdAt: '2026-11-24T09:00:00.000Z', parentId: 'pellicce' });
      localStorage.setItem(lk, JSON.stringify(libs));
    }, LIBS);
    await h.go('add');
    const prima = await layoutGrezzo(h);
    const nomi = ['Scelte di Tipo di pelle', 'Scelte di Posizione', 'Categorie'];
    const aperti = await binari(h.page, nomi);
    const tendineAperte = (await tendine(h.page)).filter((t) => /^(Posizione|Categoria): /.test(t.label));
    const prezzi = await h.page.evaluate(() => ['Prezzo Acquisto', 'Prezzo Vendita'].map((t) => {
      const el = [...document.querySelectorAll('div')].find((d) => d.offsetParent && d.children.length === 0 && d.innerText === t);
      const r = el && el.parentElement.getBoundingClientRect();
      return r ? { top: Math.round(r.top + window.scrollY), larghezza: Math.round(r.width) } : null;
    }));
    await h.click('Visone');
    await h.click('Vetrina');
    await h.page.getByLabel('Categoria Pellicce', { exact: true }).locator('visible=true').first().click(); await h.page.waitForTimeout(500);
    const sotto = (await binari(h.page, ['Sottocategorie']))['Sottocategorie'];
    await h.page.getByLabel('Sottocategoria Giacche lunghe', { exact: true }).locator('visible=true').first().click(); await h.page.waitForTimeout(400);
    await h.click('M');
    const p = await e.salvaNuovo(h);
    const dopo = await layoutGrezzo(h);
    const versione = JSON.parse(dopo).version;
    const out = {
      aperti, tendine: tendineAperte, sotto, prezzi,
      salvato: { furType: p.furType, location: p.location, libraryId: p.libraryId, taglia: v.valore(p, 'field_cmp_taglia') },
      layoutUguale: prima === dopo, versione,
    };
    const interi = [...nomi.map((n) => aperti[n]), sotto].every((b) => b && b.larghezza >= 340);
    const ok = interi && tendineAperte.length === 0
      && aperti['Scelte di Posizione'].top < aperti['Categorie'].top
      && prezzi.every(Boolean) && prezzi[0].top === prezzi[1].top && prezzi[0].larghezza < 200
      && p.furType === 'visone' && p.location === 'vetrina' && p.libraryId === 'giacche-lunghe'
      && prima === dopo && versione === 4;
    return { ok, ...out };
  });

  // 2. «Menu a tendina» scelto in Campi: Posizione torna tendina nella colonna, la Categoria resta binario
  await run('ux10-tendina', async (h) => {
    await h.go('add');
    const prima = await layoutGrezzo(h);
    await h.go('settings/fields');
    await e.visibile(h, '[aria-label="Come si vede Posizione"]').click(); await h.page.waitForTimeout(500);
    await h.click('Menu a tendina');
    await h.click('Aggiorna');
    await h.go('add');
    const tend = (await tendine(h.page)).filter((t) => /^(Posizione|Categoria): /.test(t.label));
    const b = await binari(h.page, ['Scelte di Posizione', 'Categorie']);
    await e.visibile(h, '[aria-label="Posizione: Seleziona..."]').click(); await h.page.waitForTimeout(300);
    await h.click('Sartoria');
    await h.click('Visone'); await h.click('M');
    const p = await e.salvaNuovo(h);
    const dopo = await layoutGrezzo(h);
    const ok = tend.length === 1 && tend[0].label === 'Posizione: Seleziona...' && tend[0].larghezza < 200
      && !b['Scelte di Posizione'] && b.Categorie && b.Categorie.larghezza >= 340
      && p.location === 'sartoria' && prima === dopo;
    return { ok, tendine: tend, binari: b, location: p.location, layoutUguale: prima === dopo };
  });

  // 3. Finestra della ruota (Larghezza a 1/3): X, Esc, Indietro del browser; nessuna voce in più nella storia
  await run('ux10-finestra-ruota', async (h) => {
    await h.page.evaluate(() => {
      const k = 'furinventory_custom_fields:local';
      const fields = JSON.parse(localStorage.getItem(k));
      Object.assign(fields.find((f) => f.id === 'width'), { input: 'wheel', dataset: { min: 40, max: 120, step: 10 } });
      localStorage.setItem(k, JSON.stringify(fields));
    });
    await h.go('');
    await h.tab('Aggiungi'); // dalle schede, come l'utente (la storia ha Home prima di Aggiungi)
    await h.page.locator('input[placeholder^="Auto"]').locator('visible=true').first().fill('UX10-PROVA');
    const aperta = () => h.page.locator('[aria-label="Ruota Larghezza"]').locator('visible=true').count();
    const apri = async () => { await e.apriRuota(h, 'Larghezza'); return { aperta: await aperta(), finestra: await finestra(h.page, 'Chiudi la finestra') }; };
    const stato = async () => ({
      aperta: await aperta(),
      url: await h.page.evaluate(() => location.pathname),
      codice: await h.page.locator('input[placeholder^="Auto"]').locator('visible=true').first().inputValue(),
    });
    const conX = await apri();
    await e.visibile(h, '[aria-label="Chiudi"]').click(); await h.page.waitForTimeout(600);
    const dopoX = await stato();
    const conEsc = await apri();
    await h.page.keyboard.press('Escape'); await h.page.waitForTimeout(600);
    const dopoEsc = await stato();
    const conIndietro = await apri();
    await h.page.goBack(); await h.page.waitForTimeout(900);
    const dopoIndietro = await stato();
    await h.page.goBack(); await h.page.waitForTimeout(1200);
    const home = await h.page.evaluate(() => location.pathname);
    const aperte = [conX, conEsc, conIndietro];
    const chiuse = [dopoX, dopoEsc, dopoIndietro];
    const ok = aperte.every((a) => a.aperta === 1 && a.finestra && a.finestra.altezza <= 0.9)
      && chiuse.every((c) => c.aperta === 0 && c.url === '/add' && c.codice === 'UX10-PROVA') && home === '/';
    return { ok, aperte, chiuse, home };
  });

  // 4. Finestra della categoria dello scaffale: stessa finestra, X, Esc, Indietro
  await run('ux10-finestra-categoria', async (h) => {
    await h.go('settings/shelves');
    const url = await h.page.evaluate(() => location.pathname);
    const campo = () => e.visibile(h, '[aria-label="Categoria dello scaffale"]');
    const aperta = () => h.page.locator('[aria-label="Categoria Pellicce"]').locator('visible=true').count();
    const apri = async () => { await campo().click(); await h.page.waitForTimeout(600); return { aperta: await aperta(), finestra: await finestra(h.page, 'Chiudi la scelta della categoria') }; };
    const stato = async () => ({ aperta: await aperta(), url: await h.page.evaluate(() => location.pathname) });
    const conX = await apri();
    await e.visibile(h, '[aria-label="Chiudi"]').click(); await h.page.waitForTimeout(600);
    const dopoX = await stato();
    const conEsc = await apri();
    await h.page.keyboard.press('Escape'); await h.page.waitForTimeout(600);
    const dopoEsc = await stato();
    const conIndietro = await apri();
    await h.page.goBack(); await h.page.waitForTimeout(900);
    const dopoIndietro = await stato();
    // la scelta funziona come prima
    await apri();
    await e.visibile(h, '[aria-label="Categoria Collezione Inverno"]').click(); await h.page.waitForTimeout(500);
    const valore = await campo().innerText();
    const aperte = [conX, conEsc, conIndietro];
    const chiuse = [dopoX, dopoEsc, dopoIndietro];
    const ok = aperte.every((a) => a.aperta === 1 && a.finestra && a.finestra.altezza <= 0.9)
      && chiuse.every((c) => c.aperta === 0 && c.url === url) && /Collezione Inverno/.test(valore);
    return { ok, url, aperte, chiuse, valore };
  });

  // 5. Binario: ultima pillola tagliata all'apertura, nessuno scorrere al tocco, la scelta a vista in Modifica
  await run('ux10-binario-apertura', async (h) => {
    await h.go('add');
    const nomi = ['Scelte di Tipo di pelle', 'Scelte di Posizione', 'Categorie'];
    const tagli = {};
    for (const n of nomi) tagli[n] = await taglio(h.page, n);
    await h.click('Vetrina');
    const dopoTocco = await taglio(h.page, 'Scelte di Posizione');
    // In Modifica: VIS-0142 in «Stand C» (in fondo alle posizioni) e in «Usato e permute» (l'ultima categoria)
    await h.page.evaluate(() => {
      const k = 'inventory:v1:local:products';
      const list = JSON.parse(localStorage.getItem(k));
      Object.assign(list.find((p) => p.sku === 'VIS-0142'), { location: 'stand_c', libraryId: 'usato-e-permute' });
      localStorage.setItem(k, JSON.stringify(list));
    });
    await v.openEdit(h, 'VIS-0142');
    const inVista = await h.page.evaluate(() => Object.fromEntries([['Scelte di Posizione', 'Stand C'], ['Categorie', 'Usato e permute']].map(([l, t]) => {
      const rail = [...document.querySelectorAll(`[aria-label="${l}"]`)].find((x) => x.offsetParent);
      const pill = rail && [...rail.querySelectorAll('[tabindex="0"]')].find((b) => (b.innerText || '').includes(t));
      if (!pill) return [l, null];
      const r = rail.getBoundingClientRect(); const p = pill.getBoundingClientRect();
      return [l, { dentro: p.left >= r.left - 1 && p.right <= r.right + 1, spunta: /[-]/.test(pill.innerText), altezza: Math.round(p.height), scrollLeft: Math.round(rail.scrollLeft) }];
    })));
    const tagliate = Object.values(tagli).filter((t) => t && t.scorre);
    const ok = tagliate.length === nomi.length && tagliate.every((t) => t.dentro >= 0.25 && t.dentro <= 0.75 && t.scrollLeft === 0)
      && dopoTocco.scrollLeft === 0
      && Object.values(inVista).every((x) => x && x.dentro && x.spunta && x.altezza === 36 && x.scrollLeft > 0);
    return { ok, tagli, dopoTocco, inVista };
  });

  // 6. Minimal: bordo di campi e pillole #E7E6E3
  await run('ux10-minimal', async (h) => {
    await h.page.evaluate(() => localStorage.setItem('@syncro/stile', 'minimal'));
    await h.go('add');
    const colori = await h.page.evaluate(() => {
      const input = [...document.querySelectorAll('input')].find((i) => i.offsetParent && /^Auto/.test(i.placeholder || ''));
      const pill = [...document.querySelectorAll('[tabindex="0"]')].find((b) => b.offsetParent && (b.innerText || '').trim() === 'Volpe');
      const bordo = (el) => (el ? getComputedStyle(el).borderTopColor : null);
      return { campo: bordo(input && input.parentElement), pillola: bordo(pill), fondoCampo: input && getComputedStyle(input.parentElement).backgroundColor };
    });
    const ok = colori.campo === 'rgb(231, 230, 227)' && colori.pillola === 'rgb(231, 230, 227)' && colori.fondoCampo === 'rgb(244, 244, 242)';
    return { ok, ...colori };
  });
})();
