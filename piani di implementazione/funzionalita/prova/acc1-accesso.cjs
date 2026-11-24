// ACC1 (ticket 32): «Accesso» rifatto. Verifica di ACC1 del ticket: Impostazioni con «Persone e telefoni» (Accesso e
// Rete del negozio) senza «Team e spazi di lavoro»; `settings/access` dall'indirizzo con la freccia verso Impostazioni;
// nome, telefono e nome del telefono salvati e riletti dopo una ricarica; foto nel cerchio dopo una ricarica; «Spazio
// locale», «Titolare», «Backup Google Drive» spento col motivo; ruoli e permessi applicati (spenti col motivo, mai
// nascosti); autore negli eventi nuovi e «—» nei vecchi; nessuna richiesta a supabase.co; aprire non scrive nulla.
// Uso: APP=http://localhost:8083 node acc1-accesso.cjs [nome-scenario]
const { scenario } = require('./lib.cjs');

const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const PK = 'device:v1:profile';
const TK = 'device:v1:permissions';
const percorso = (h) => new URL(h.page.url()).pathname;
const testo = async (h) => (await h.page.locator('body').innerText()).replace(/\s+/g, ' ');
const leggi = (h, k) => h.page.evaluate((key) => localStorage.getItem(key), k);
/** Richieste a supabase.co durante lo scenario (attese: 0). */
const supabase = (h) => { const l = []; h.page.on('request', (r) => { if (/supabase\.co/.test(r.url())) l.push(r.url().slice(0, 50)); }); return l; };
/** Freccia nativa in alto (aria-label «…, back») */
const freccia = (h) => h.page.locator('[aria-label$=", back"], [aria-label="Go back"]').locator('visible=true').first();
const scrivi = async (h, label, valore) => { await h.page.getByLabel(label, { exact: true }).fill(valore); await h.page.waitForTimeout(300); };
const ruolo = async (h, nome) => { await h.go('settings/access'); await h.page.getByRole('radio', { name: `Ruolo ${nome}` }).click(); await h.page.waitForTimeout(500); };
// testo della riga del motivo, senza il glifo del lucchetto
const nota = async (h) => (await h.page.locator('[data-testid="permesso-negato"]').locator('visible=true').allInnerTexts())
  .map((s) => s.replace(/[-]/g, '').trim());
/** Home › pressione lunga sul prodotto › Elimina della barra (con la finestra di conferma accettata). */
const eliminaDallaHome = async (h, sku) => {
  await h.go('');
  await h.longPress(sku);
  await h.page.locator('[aria-label="Elimina"]').locator('visible=true').first().click(); await h.page.waitForTimeout(800);
};

(async () => {
  // 1. Impostazioni e indirizzi: due voci con lo stato, niente testi falsi, Backup spento col motivo; nulla scritto
  await run('acc1-impostazioni', async (h) => {
    const sb = supabase(h);
    const finestre = [];
    h.page.on('dialog', (d) => finestre.push(d.message().slice(0, 80)));
    await h.go('settings');
    const t = await testo(h);
    const out = {
      persone: t.includes('Persone e telefoni'),
      accesso: t.includes('Accesso Titolare · nome da scrivere'),
      reteSottotitolo: t.includes('Rete del negozio Non collegato'),
      via: ['Team e spazi di lavoro', 'owner · attiva', 'Mesh LAN', 'Accesso Multi-Utente', 'avviene con Supabase', 'Unisciti a un team'].filter((s) => t.includes(s)),
      backup: t.includes("Backup Google Drive Spento: serve l’accesso con Google, che oggi non c’è"),
      info: t.includes('Dove stanno i dati Prodotti e impostazioni restano su questo telefono'),
    };
    await h.click('Backup Google Drive');
    out.backupFinestre = finestre.length;
    out.backupResta = percorso(h);
    await h.click('Accesso');
    out.dalMenu = percorso(h);
    await freccia(h).click(); await h.page.waitForTimeout(1200);
    out.frecciaMenu = percorso(h);
    await h.click('Rete del negozio');
    out.rete = `${percorso(h)} ${await h.has('Rete del negozio', true)}`;
    await h.go('settings/access');
    out.diretto = { notFound: await h.has('Page Not Found', true), titolo: await h.has('Il tuo profilo', true) };
    await freccia(h).click(); await h.page.waitForTimeout(1200);
    out.frecciaDiretto = percorso(h);
    await h.go('settings/access');
    const a = await testo(h);
    out.account = ['Spazio locale', 'Nessun accesso: i dati restano su questo telefono.', "Backup Google Drive Spento: serve l'accesso con Google, che oggi non c'è.",
      'Titolare Può tutto', 'I ruoli diventano sicuri con gli account: oggi valgono su questo telefono'].filter((s) => !a.includes(s));
    out.chiaviScritte = [await leggi(h, PK), await leggi(h, TK)].filter(Boolean).length;
    out.supabase = sb.length;
    out.ok = out.persone && out.accesso && out.reteSottotitolo && out.rete.startsWith('/settings/team true') && !out.via.length && out.backup && out.info
      && out.backupFinestre === 0 && out.backupResta === '/settings' && out.dalMenu === '/settings/access' && out.frecciaMenu === '/settings'
      && !out.diretto.notFound && out.diretto.titolo && out.frecciaDiretto === '/settings' && !out.account.length && out.chiaviScritte === 0 && out.supabase === 0;
    return out;
  });

  // 2. Profilo: nome, telefono, nome del telefono e foto salvati e riletti dopo una ricarica; foto tolta
  await run('acc1-profilo', async (h) => {
    const sb = supabase(h);
    await h.go('settings/access');
    await scrivi(h, "Nome dell'operatore", 'Mario Rossi');
    await scrivi(h, "Numero di telefono dell'operatore", '333 123 4567');
    await scrivi(h, 'Nome del telefono', 'Banco 1');
    // foto: un'immagine 300×200 (una schermata del browser) dalla finestra di scelta del file
    const png = await h.page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 200 } });
    const [chooser] = await Promise.all([h.page.waitForEvent('filechooser'), h.click('Scegli una foto')]);
    await chooser.setFiles({ name: 'mario.png', mimeType: 'image/png', buffer: png });
    await h.page.waitForTimeout(1200);
    await h.page.reload(); await h.page.waitForTimeout(2500);
    const p = JSON.parse(await leggi(h, PK));
    const foto = await h.page.evaluate(() => {
      const img = [...document.querySelectorAll('img')].find((i) => i.src.startsWith('data:image/jpeg') && i.offsetParent !== null);
      return img ? { larga: img.naturalWidth, alta: img.naturalHeight } : null;
    });
    const out = {
      riletti: {
        nome: await h.page.getByLabel("Nome dell'operatore", { exact: true }).inputValue(),
        telefono: await h.page.getByLabel("Numero di telefono dell'operatore", { exact: true }).inputValue(),
        nomeTelefono: await h.page.getByLabel('Nome del telefono', { exact: true }).inputValue(),
      },
      salvato: { id: /^tel-[a-z0-9]+-[a-z0-9]+$/.test(p.id), ruolo: p.role, foto: p.photo.startsWith('data:image/jpeg;base64,'), fotoKB: Math.round(p.photo.length / 1024) },
      fotoNelCerchio: foto,
      etichettaFoto: await h.page.getByLabel('Cambia la foto del profilo', { exact: true }).count(),
    };
    await h.go('settings');
    out.sottotitolo = await h.has('Mario Rossi · Titolare', true);
    await h.go('settings/access');
    await h.click('Togli la foto');
    out.fotoTolta = JSON.parse(await leggi(h, PK)).photo === '';
    out.supabase = sb.length;
    out.ok = out.riletti.nome === 'Mario Rossi' && out.riletti.telefono === '333 123 4567' && out.riletti.nomeTelefono === 'Banco 1'
      && out.salvato.id && out.salvato.ruolo === 'titolare' && out.salvato.foto && out.salvato.fotoKB < 150
      && !!foto && foto.larga === 160 && foto.alta === 160 && out.etichettaFoto === 1 && out.sottotitolo && out.fotoTolta && out.supabase === 0;
    return out;
  });

  // 3. Ruoli e permessi: il Titolare cambia la tabella; Operatore e Solo lettura vedono le azioni spente col motivo
  await run('acc1-ruoli', async (h) => {
    const sb = supabase(h);
    const finestre = [];
    h.page.on('dialog', (d) => finestre.push(d.message().slice(0, 60)));
    // un prodotto nel cestino (da Titolare), per vedere il Cestino con un ruolo che non elimina
    await eliminaDallaHome(h, 'VOL-0087');
    const nelCestino = (await h.products(0)).filter((p) => p.deletedAt).length;
    await h.go('settings/access');
    const sw = () => h.page.getByRole('switch', { name: 'Eliminare: Operatore' });
    const out = { titolare: { interruttori: await h.page.getByRole('switch').count(), eliminaOperatore: await sw().isChecked() } };
    await sw().click(); await h.page.waitForTimeout(400);
    out.titolare.dopoTocco = JSON.parse(await leggi(h, TK)).operatore.eliminare;
    await sw().click(); await h.page.waitForTimeout(400);
    out.titolare.tornato = JSON.parse(await leggi(h, TK)).operatore.eliminare;
    // Operatore
    await ruolo(h, 'Operatore');
    out.operatore = { interruttori: await h.page.getByRole('switch').count(), nota: await nota(h) };
    await h.go('settings');
    out.operatore.impostazioni = await nota(h);
    await h.click('Categorie');
    out.operatore.categorie = percorso(h);
    out.operatore.sottotitolo = await h.has('Titolare · nome da scrivere', true) ? 'titolare' : (await h.has('Operatore · nome da scrivere', true) ? 'operatore' : '?');
    await h.go('');
    await h.longPress('VIS-0142');
    out.operatore.home = await nota(h);
    await h.page.locator('[aria-label="Elimina"]').locator('visible=true').first().click(); await h.page.waitForTimeout(600);
    out.operatore.eliminati = (await h.products(0)).filter((p) => p.deletedAt).length - nelCestino;
    out.nelCestino = nelCestino;
    await h.go('settings/trash');
    out.operatore.cestino = await nota(h);
    await h.page.locator('text=Svuota').locator('visible=true').first().click(); await h.page.waitForTimeout(600);
    out.operatore.cestinoDopoSvuota = (await h.products(0)).filter((p) => p.deletedAt).length;
    await h.go('add');
    out.operatore.aggiungi = await nota(h);
    // Solo lettura
    await ruolo(h, 'Solo lettura');
    const prima = (await h.products(0)).length;
    await h.go('add');
    out.lettura = { aggiungi: await nota(h) };
    await h.click("Aggiungi all'Inventario"); await h.page.waitForTimeout(800);
    out.lettura.prodotti = (await h.products()).length - prima;
    out.lettura.restaInAggiungi = percorso(h);
    await h.go('scanner-action?type=product&id=cmp-1');
    out.lettura.venduto = await h.has('Il ruolo Solo lettura non può vendere. Lo decide il Titolare in Accesso.', true);
    await h.click('VENDUTO');
    out.lettura.confermaVendita = await h.has('Conferma Vendita', true);
    await h.go('product/cmp-1');
    out.lettura.scheda = await nota(h);
    await h.click('Modifica');
    out.lettura.modifica = percorso(h);
    // di nuovo Titolare: niente più spento
    await ruolo(h, 'Titolare');
    await h.go('settings');
    out.titolareDiNuovo = { note: (await nota(h)).length };
    await h.click('Categorie');
    out.titolareDiNuovo.categorie = percorso(h);
    out.finestre = finestre;
    out.supabase = sb.length;
    const OP = 'Il ruolo Operatore non può';
    out.ok = out.titolare.interruttori === 5 && out.titolare.eliminaOperatore === false && out.titolare.dopoTocco === true && out.titolare.tornato === false
      && out.operatore.interruttori === 0 && out.operatore.nota.join() === 'Solo il Titolare cambia i permessi.'
      && out.operatore.impostazioni.length === 3 && out.operatore.impostazioni.every((s) => s.startsWith(`${OP} cambiare le impostazioni`))
      && out.operatore.categorie === '/settings' && out.operatore.sottotitolo === 'operatore'
      && out.operatore.home.join().startsWith(`${OP} eliminare`) && out.operatore.eliminati === 0
      && out.operatore.cestino.join().startsWith(`${OP} eliminare`) && out.nelCestino === 1 && out.operatore.cestinoDopoSvuota === 1 && out.operatore.aggiungi.length === 0
      && out.lettura.aggiungi.join().startsWith('Il ruolo Solo lettura non può aggiungere prodotti') && out.lettura.prodotti === 0 && out.lettura.restaInAggiungi === '/add'
      && out.lettura.venduto && !out.lettura.confermaVendita
      && out.lettura.scheda.join().startsWith('Il ruolo Solo lettura non può modificare i prodotti') && out.lettura.modifica === '/product/cmp-1'
      && out.titolareDiNuovo.note === 0 && out.titolareDiNuovo.categorie === '/settings/folders' && finestre.length === 1 && out.supabase === 0;
    return out;
  });

  // 4. Autore: eventi vecchi «—»; il primo evento nuovo dà un id al profilo («Questo telefono»); con nome e telefono
  // scritti «Mario · Banco 1»; l'evento di prima resta com'era (istantanea, nessuna riscrittura)
  await run('acc1-autore', async (h) => {
    const sb = supabase(h);
    const vecchi = (await h.timeline(0)).length;
    await h.tab('Cronologia');
    const trattini = await h.page.getByText(/^— · /).locator('visible=true').count();
    const prima = await leggi(h, PK);
    // primo evento: VIS-0142 nel cestino dalla Home
    await eliminaDallaHome(h, 'VIS-0142');
    const tl1 = await h.timeline();
    const p1 = JSON.parse(await leggi(h, PK) || 'null');
    // nome e nome del telefono, poi un secondo evento: LIN-0021 nel cestino
    await h.go('settings/access');
    await scrivi(h, "Nome dell'operatore", 'Mario');
    await scrivi(h, 'Nome del telefono', 'Banco 1');
    await eliminaDallaHome(h, 'LIN-0021');
    const tl2 = await h.timeline();
    const nuovi = tl2.slice(0, tl2.length - vecchi);
    await h.tab('Cronologia');
    const righe = {
      mario: await h.page.getByText(/^Mario · Banco 1 · /).locator('visible=true').count(),
      questoTelefono: await h.page.getByText(/^Questo telefono · /).locator('visible=true').count(),
      trattini: await h.page.getByText(/^— · /).locator('visible=true').count(),
    };
    await h.shot('cronologia');
    const out = {
      vecchi, trattiniPrima: trattini, profiloPrima: prima,
      primoEvento: { autore: tl1[0].author && Object.keys(tl1[0].author).join(','), stessoId: !!p1 && tl1[0].author && tl1[0].author.id === p1.id },
      nuovi: nuovi.map((e) => `${e.type} ${e.productId} ${e.author ? [e.author.name || '', e.author.device || ''].join('|') : 'senza'}`),
      vecchiSenzaAutore: tl2.slice(tl2.length - vecchi).every((e) => !e.author),
      righe,
      supabase: sb.length,
    };
    out.ok = trattini === vecchi && prima === null && out.primoEvento.autore === 'id' && out.primoEvento.stessoId
      && JSON.stringify(out.nuovi) === JSON.stringify(['deleted cmp-3 Mario|Banco 1', 'deleted cmp-1 |']) && out.vecchiSenzaAutore
      && righe.mario === 1 && righe.questoTelefono === 1 && righe.trattini === vecchi && out.supabase === 0;
    return out;
  }, { dialogs: ['ok', 'ok'] });

  // 5. Dal revisore (fe5fd1f): con «Vendere» spento per Operatore la causale «Vendita» di Movimenta è spenta col motivo
  // e non vende; da Solo lettura la riga del motivo sopra la barra della Scheda non copre «Stampa scheda PDF»
  await run('acc1-revisore', async (h) => {
    const sb = supabase(h);
    await h.go('settings/access');
    await h.page.getByRole('switch', { name: 'Vendere: Operatore' }).click(); await h.page.waitForTimeout(400);
    const tabella = JSON.parse(await leggi(h, TK)).operatore.vendere;
    await ruolo(h, 'Operatore');
    const prima = (await h.timeline(0)).length;
    await h.go('product/cmp-1');
    const lab = (l) => h.page.locator(`[aria-label="${l}"]`).locator('visible=true').first();
    await lab('Movimenta').click(); await h.page.waitForTimeout(600);
    await lab('Tipo Scarico').click(); await h.page.waitForTimeout(300);
    await h.page.getByPlaceholder('es. 2,5').locator('visible=true').first().fill('1'); await h.page.waitForTimeout(200);
    const motivo = (await nota(h)).filter((t) => t.includes('non può vendere'));
    await lab('Causale Vendita').click(); await h.page.waitForTimeout(300);
    const prezzo = await h.has('Prezzo per unità (facoltativo)', true);
    await lab('Registra movimento').click(); await h.page.waitForTimeout(1200);
    // Solo lettura: fondo della Scheda
    await ruolo(h, 'Solo lettura');
    await h.go('product/cmp-1');
    for (let i = 0; i < 12; i += 1) { await h.page.mouse.move(187, 400); await h.page.mouse.wheel(0, 2000); await h.page.waitForTimeout(150); }
    await h.page.waitForTimeout(500);
    const pdf = await h.page.evaluate(() => {
      const t = [...document.querySelectorAll('div')].find((d) => d.innerText === 'Stampa scheda PDF' && d.offsetParent !== null);
      const btn = t && t.closest('[tabindex]');
      if (!btn) return 'manca';
      const b = btn.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return hit && btn.contains(hit) ? 'pulsante PDF' : 'coperto';
    });
    // la pillola «Vendita» non si accende: lo scarico resta senza causale (permesso a Operatore), nessuna vendita
    const tl = await h.timeline(1200);
    const nuovi = tl.slice(0, tl.length - prima).map((e) => `${e.type}${e.details && e.details.movement ? ` ${e.details.movement}` : ''}${e.details && e.details.reason ? ` ${e.details.reason}` : ''}`);
    const out = { tabella, motivo, prezzo, nuovi, pdf, supabase: sb.length };
    out.ok = tabella === false && motivo.length === 1 && !prezzo && !nuovi.some((e) => / vendita$|^sold/.test(e)) && pdf === 'pulsante PDF' && out.supabase === 0;
    return out;
  });
})();
