// RETE0 (ticket 32): «Rete del negozio» rifatta al posto di Team. Verifica di RETE0 del ticket, sul web, col centro
// finto `centro-finto.mjs` (server WebSocket in Node su 127.0.0.1, avviato e spento da questa prova):
// - all'entrata nessuna scelta, nessuna richiesta esterna, nessun WebSocket, nessuna chiave, nessuna finestra; «Fai da
//   centro» spento sul web col motivo; `settings/team` porta alla schermata nuova;
// - codici sbagliati rifiutati prima della domanda, in parole;
// - porta chiusa: messaggio in parole, nessun segno verde, niente salvato, nessun tentativo da solo;
// - aggancio al centro finto: domanda in pagina, stato in una riga, telefoni con «online dalle…» e «visto alle…», nome
//   dato in Accesso, messaggio della Chat in arrivo, centro spento («non risponde»), riacceso (ricollegato da solo),
//   ricarica (ricollegato da solo), «Scollegati»;
// - battito vero: centro acceso ma muto → «non risponde» dopo 30 s, poi ricollegato.
// Le righe sono fatte per ripetersi uguali: booleani, testi senza ore variabili (le ore le normalizza tutte.cjs), porte
// e codici fissi (così l'errore del browser per un collegamento fallito ha sempre lo stesso testo).
// Il centro vero (server sul telefono) non si prova sul web: resta al telefono (RETE1).
// Uso: APP=http://localhost:8083 node rete0-rete.cjs [nome-scenario]
const path = require('path');
const { pathToFileURL } = require('url');
const { scenario } = require('./lib.cjs');
const u = require('./c2-util.cjs');
const { iconAt } = require('./a3-util.cjs');

const SOLO = process.argv[2];
const run = (name, fn, opts) => (!SOLO || name.includes(SOLO) ? scenario(name, fn, opts) : null);
const centroFinto = () => import(pathToFileURL(path.join(__dirname, 'centro-finto.mjs')).href);
const NK = 'network:v1:local:settings';
const PK = 'device:v1:profile';
// Porte e codici fissi (vedi in cima); la porta chiusa è una porta su cui nessuno ascolta
const PORTA_CHIUSA = 'ws://127.0.0.1:59998?token=RETE0CHIUSA00001&name=Magazzino';
const PORTA_AGGANCIO = 47311;
const PORTA_BATTITO = 47312;

const testo = (h) => h.page.evaluate(() => (document.body.innerText || '').replace(/[ \t]+/g, ' '));
const stato = async (h) => ((await h.page.locator('[data-testid="rete-stato"]').locator('visible=true').first().innerText()) || '').replace(/\s+/g, ' ').trim();
const righe = (h) => h.page.locator('[data-testid="rete-telefono"]').locator('visible=true').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
const leggi = (h, k) => h.page.evaluate((key) => localStorage.getItem(key), k);
const GERGO = ['Host', 'payload', 'Mercusys', 'LAN', 'ROOM', 'Sync', 'Heartbeat', 'placeholder', 'adb', 'token', 'ws://'];

function spia(page) {
  const s = { esterne: [], ws: [], finestre: [], ipify: 0 };
  page.on('request', (r) => {
    const x = new URL(r.url());
    if (!/^(localhost|127\.0\.0\.1)$/.test(x.hostname)) s.esterne.push(`${x.hostname}${x.pathname}`);
  });
  page.on('websocket', (w) => { if (!/:8083|:8082|:8084/.test(w.url())) s.ws.push(w.url().replace(/token=[^&]+/, 'token=…')); });
  page.on('dialog', (d) => s.finestre.push(d.message().slice(0, 80)));
  return page.route(/api\.ipify\.org/, (r) => { s.ipify += 1; return r.abort(); }).then(() => s);
}

async function apriRete(h) {
  await h.go('settings');
  await h.click('Rete del negozio');
  await h.page.waitForTimeout(1200);
}

async function scriviCodice(h, codice) {
  await h.page.getByLabel('Codice del centro', { exact: true }).fill(codice);
  await h.click('Continua');
}

/** Aspetta finché lo stato non soddisfa `re` (al massimo `ms`); restituisce lo stato e i secondi passati. */
async function aspettaStato(h, re, ms) {
  const t0 = Date.now();
  let s = await stato(h);
  while (!re.test(s) && Date.now() - t0 < ms) { await h.page.waitForTimeout(500); s = await stato(h); }
  return { s, secondi: (Date.now() - t0) / 1000 };
}

(async () => {
  // 1. Entrata: niente di scelto, niente di esterno, niente di scritto
  await run('rete0-entrata', async (h) => {
    const s = await spia(h.page);
    await h.page.reload(); await h.page.getByText('VIS-0142', { exact: true }).first().waitFor(); await h.page.waitForTimeout(1500);
    const avvio = [...new Set(s.esterne)].sort();
    await h.go('settings');
    const sottotitolo = (await testo(h)).includes('Rete del negozio\nNon collegato');
    const n0 = s.esterne.length;
    await h.click('Rete del negozio');
    await h.page.waitForTimeout(3000);
    const out = {
      indirizzo: u.percorso(h.page),
      titolo: await h.page.title(),
      stato: await stato(h),
      esterneEntrando: s.esterne.slice(n0),
      ipify: s.ipify,
      ws: s.ws.length,
      scelte: [await h.has('Fai da centro del negozio', true), await h.has('Collegati a un centro', true)],
      motivo: await h.has('Sul computer non si può: usa un telefono che resta acceso in negozio.', true),
      chePassa: await h.has("Per ora passano solo i messaggi della Chat; l'inventario non passa ancora.", true),
    };
    const t = await testo(h);
    out.gergo = GERGO.filter((w) => t.includes(w));
    await h.shot('entrata');
    // «Fai da centro» spento: il tocco non fa nulla
    await h.click('Fai da centro del negozio'); await h.page.waitForTimeout(1500);
    out.dopoTocco = await stato(h);
    out.chiavi = [await leggi(h, NK), await leggi(h, PK)].filter(Boolean).length;
    // indirizzo vecchio
    await h.go('settings/team');
    out.vecchio = { indirizzo: u.percorso(h.page), notFound: (await u.frecce(h.page)).notFound, stato: await stato(h), scelte: await h.has('Collegati a un centro', true) };
    out.vecchio.freccia = await u.toccaIndietro(h.page); await h.page.waitForTimeout(1200);
    out.vecchio.dopo = u.percorso(h.page);
    out.finestre = s.finestre.length;
    out.avvio = avvio;
    out.ok = sottotitolo && out.indirizzo === '/settings/network' && out.titolo === 'Rete del negozio' && out.stato === 'Non collegato'
      && !out.esterneEntrando.length && out.ipify === 0 && out.ws === 0 && out.scelte.every(Boolean) && out.motivo && out.chePassa
      && !out.gergo.length && out.dopoTocco === 'Non collegato' && out.chiavi === 0 && out.vecchio.indirizzo === '/settings/team'
      && !out.vecchio.notFound && out.vecchio.stato === 'Non collegato' && out.vecchio.scelte && out.vecchio.dopo === '/settings' && out.finestre === 0;
    return out;
  });

  // 2. Codici sbagliati: rifiutati prima della domanda, in parole sotto il campo
  await run('rete0-codice', async (h) => {
    const s = await spia(h.page);
    await apriRete(h);
    await h.click('Collegati a un centro');
    const esiti = {};
    for (const codice of ['', 'abc', 'http://192.168.1.50:8080?token=0123456789ABCDEF', 'ws://203.0.113.7:8080?token=0123456789ABCDEF', 'ws://192.168.1.50:8080']) {
      await scriviCodice(h, codice);
      const errore = await h.page.locator('[data-testid="rete-errore-codice"]').locator('visible=true').allInnerTexts();
      const domanda = await h.page.locator('[data-testid="rete-domanda"]').locator('visible=true').count();
      esiti[codice || '(vuoto)'] = `${errore.join(' ')}${domanda ? ' + DOMANDA' : ''}`;
    }
    await h.shot('codice');
    const out = { esiti, ws: s.ws.length, finestre: s.finestre.length, stato: await stato(h), chiave: !!(await leggi(h, NK)) };
    out.ok = Object.values(esiti).every((e) => e && !e.includes('DOMANDA')) && out.ws === 0 && out.finestre === 0 && out.stato === 'Non collegato' && !out.chiave;
    return out;
  });

  // 3. Porta chiusa: messaggio in parole, nessun segno verde, niente salvato, nessun nuovo tentativo da solo
  await run('rete0-porta-chiusa', async (h) => {
    const s = await spia(h.page);
    await apriRete(h);
    await h.click('Collegati a un centro');
    await scriviCodice(h, PORTA_CHIUSA);
    const domanda = await h.page.locator('[data-testid="rete-domanda"]').locator('visible=true').first().innerText();
    await h.click('Collegati');
    await h.page.waitForTimeout(3000);
    const errore = await h.page.locator('[data-testid="rete-errore"]').locator('visible=true').allInnerTexts();
    const t = await testo(h);
    await h.shot('porta-chiusa');
    await h.page.waitForTimeout(6000); // nessun ritentativo da solo per un centro mai raggiunto
    const out = {
      domanda: domanda.split('\n')[0],
      errore: errore.join(' '),
      stato: await stato(h),
      verde: /Collegato al centro|Online/.test(t),
      indirizzoAVideo: /127\.0\.0\.1|59998|RETE0CHIUSA/.test(t),
      chiave: await leggi(h, NK),
      tentativi: s.ws.length,
      finestre: s.finestre.length,
    };
    // Dopo il collegamento fallito non resta nulla in memoria: un messaggio scritto in Chat non parte verso l'indirizzo
    // mai raggiunto (prima: POST …/chat/push col codice nell'intestazione, dal ripiego HTTP di sendLightPayload)
    const versoIlCentro = [];
    h.page.on('request', (r) => { if (/:59998/.test(r.url())) versoIlCentro.push(r.method()); });
    await h.click('Apri la Chat');
    await h.page.waitForTimeout(800);
    const input = h.page.getByPlaceholder('Messaggio team...');
    await input.fill('Prova dopo la porta chiusa');
    const box = await input.boundingBox();
    const invia = (await iconAt(h)).filter((b) => Math.abs(b.y - (box.y + box.height / 2)) < 30 && b.x > box.x + box.width).sort((a, c) => a.x - c.x)[1];
    await h.page.mouse.click(invia.x, invia.y); await h.page.waitForTimeout(2000);
    out.messaggioScritto = await h.page.getByText('Prova dopo la porta chiusa', { exact: true }).locator('visible=true').count() > 0;
    out.chatVersoIlCentro = versoIlCentro.length;
    out.ok = out.domanda === 'Collegarti al centro "Magazzino"?' && out.errore === 'Il centro non risponde: controlla che sia acceso e sulla stessa rete Wi-Fi.'
      && out.stato === 'Non collegato' && !out.verde && !out.indirizzoAVideo && out.chiave === null && out.tentativi === 1 && out.finestre === 0
      && out.messaggioScritto && out.chatVersoIlCentro === 0;
    return out;
  });

  // 4. Aggancio al centro finto, presenza, messaggio, centro spento e riacceso, ricarica, Scollegati
  await run('rete0-aggancio', async (h) => {
    const { avviaCentro } = await centroFinto();
    const ora = Date.now();
    const c = await avviaCentro({
      porta: PORTA_AGGANCIO, token: 'RETE0AGGANCIO001', nome: 'Magazzino',
      altri: [
        { id: 'banco-2', name: 'Banco 2', since: ora - 10 * 60_000, lastSeen: ora, online: true },
        { id: 'cassa', name: 'Cassa', since: ora - 2 * 3600_000, lastSeen: ora - 5 * 60_000, online: false },
      ],
    });
    try {
      const s = await spia(h.page);
      // il nome con cui gli altri vedono questo telefono viene da Accesso
      await h.go('settings/access');
      await h.page.getByLabel("Nome dell'operatore", { exact: true }).fill('Mario');
      await h.page.getByLabel('Nome del telefono', { exact: true }).fill('Banco 1');
      await h.page.waitForTimeout(600);
      await apriRete(h);
      await h.click('Collegati a un centro');
      await scriviCodice(h, c.codice);
      const domanda = (await h.page.locator('[data-testid="rete-domanda"]').locator('visible=true').first().innerText()).replace(/\s+/g, ' ');
      await h.click('Collegati');
      const collegato = await aspettaStato(h, /^Collegato/, 8000);
      await h.page.waitForTimeout(800);
      const out = { domanda, collegato: collegato.s, telefoni: await righe(h), ilCentroVede: c.connessi() };
      const salvato = JSON.parse((await leggi(h, NK)) || 'null');
      out.salvato = salvato ? `${salvato.role} ${salvato.center && salvato.center.name}` : null;
      out.profiloConId = !!(JSON.parse((await leggi(h, PK)) || '{}').id);
      out.codiceAVideo = /RETE0AGGANCIO001|47311|127\.0\.0\.1/.test(await testo(h));
      await h.shot('collegato');
      // messaggio della Chat dal centro: arriva in Chat e la Rete lo dice
      await h.click('Apri la Chat');
      await h.page.waitForTimeout(800);
      c.invia('Ciao dal centro');
      await h.page.waitForTimeout(1500);
      out.messaggioInChat = await h.page.getByText('Ciao dal centro', { exact: true }).locator('visible=true').count();
      await u.toccaIndietro(h.page); await h.page.waitForTimeout(1200);
      out.ultimoMessaggio = await h.has('Ultimo messaggio arrivato alle', false);
      // centro spento: «non risponde», tutti «visto alle…»
      await c.spegni();
      await h.page.waitForTimeout(1200);
      out.spento = { stato: await stato(h), telefoni: await righe(h) };
      await h.shot('spento');
      // riacceso dopo il primo ritentativo (a 2 s), prima del secondo (5 s dopo): si ricollega da solo
      await h.page.waitForTimeout(2300);
      await c.riaccendi();
      const ricollegato = await aspettaStato(h, /^Collegato/, 10000);
      out.riacceso = { stato: ricollegato.s, entro10s: ricollegato.secondi < 10 };
      // ricarica: ci si ricollega da soli al centro ricordato
      await h.page.reload(); await h.page.waitForTimeout(2500);
      await h.go('settings/network');
      const dopoRicarica = await aspettaStato(h, /^Collegato/, 8000);
      out.ricarica = { stato: dopoRicarica.s, telefoni: (await righe(h)).length, ilCentroVede: c.connessi() };
      // Scollegati
      await h.click('Scollegati'); await h.page.waitForTimeout(1500);
      const dopo = JSON.parse((await leggi(h, NK)) || 'null');
      out.scollegato = { stato: await stato(h), ruolo: dopo && dopo.role, centro: !!(dopo && dopo.center), ilCentroVede: c.connessi() };
      out.tentativi = s.ws.length;
      out.finestre = s.finestre.length;
      // a ogni caricamento della pagina l'app chiede il lettore di QR (quello di sempre, come in rete0-entrata): non conta
      out.esterne = s.esterne.filter((x) => !x.startsWith('cdn.jsdelivr.net/npm/jsqr')).length;
      const nomi = out.telefoni.join(' | ');
      out.ok = out.domanda.startsWith('Collegarti al centro "Magazzino"? Gli altri telefoni ti vedranno come «Mario · Banco 1».')
        && out.collegato === 'Collegato al centro "Magazzino" · 3 telefoni online'
        && out.telefoni.length === 4 && /^Magazzino, Centro · online dalle \d\d:\d\d, Online$/.test(out.telefoni[0])
        && /Mario · Banco 1, Questo telefono · online dalle \d\d:\d\d, Online/.test(nomi) && /Banco 2, online dalle \d\d:\d\d, Online/.test(nomi)
        && /Cassa, visto alle \d\d:\d\d, Non in linea/.test(nomi) && out.ilCentroVede.join() === 'Mario · Banco 1'
        && out.salvato === 'client Magazzino' && out.profiloConId && !out.codiceAVideo
        && out.messaggioInChat === 1 && out.ultimoMessaggio
        && out.spento.stato === 'Il centro "Magazzino" non risponde da meno di un minuto'
        && out.spento.telefoni.length === 4 && out.spento.telefoni.every((r) => /visto alle \d\d:\d\d, Non in linea$/.test(r))
        && out.riacceso.stato.startsWith('Collegato al centro "Magazzino"') && out.riacceso.entro10s
        && out.ricarica.stato.startsWith('Collegato al centro "Magazzino"') && out.ricarica.telefoni === 4 && out.ricarica.ilCentroVede.join() === 'Mario · Banco 1'
        && out.scollegato.stato === 'Non collegato' && out.scollegato.ruolo === 'none' && !out.scollegato.centro && out.scollegato.ilCentroVede.length === 0
        && out.finestre === 0 && out.esterne === 0;
      return out;
    } finally { await c.spegni(); }
  });

  // 5. Battito vero (CT14): il centro resta acceso ma non risponde più → «non risponde» dopo 30 s, poi ricollegato
  await run('rete0-battito', async (h) => {
    const { avviaCentro } = await centroFinto();
    const c = await avviaCentro({ porta: PORTA_BATTITO, token: 'RETE0BATTITO0001', nome: 'Magazzino' });
    try {
      const s = await spia(h.page);
      await apriRete(h);
      await h.click('Collegati a un centro');
      await scriviCodice(h, c.codice);
      await h.click('Collegati');
      const prima = await aspettaStato(h, /^Collegato/, 8000);
      c.muto(true);
      const muto = await aspettaStato(h, /non risponde/, 50000);
      c.muto(false);
      const dopo = await aspettaStato(h, /^Collegato/, 12000);
      const out = {
        prima: prima.s,
        muto: muto.s,
        // un segnale ogni 10 s, «non risponde» dopo 30 s senza notizie: tra 20 e 40 s dal silenzio
        dopo20s: muto.secondi >= 20,
        entro40s: muto.secondi <= 40,
        dopo: dopo.s,
        finestre: s.finestre.length,
      };
      out.ok = out.prima.startsWith('Collegato al centro "Magazzino"') && out.muto === 'Il centro "Magazzino" non risponde da meno di un minuto'
        && out.dopo20s && out.entro40s && out.dopo.startsWith('Collegato al centro "Magazzino"') && out.finestre === 0;
      return out;
    } finally { await c.spegni(); }
  });
})();
