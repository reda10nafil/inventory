// a4: Impostazioni - ogni voce: dove porta (indirizzo e titolo della pagina) e quali finestre apre.
// Poi Condivisione (cosa si può fare) e Team (Rete del negozio, prima Accesso Multi-Utente) sul web.
// RETE0: «Rete del negozio» è la schermata nuova (`settings/network`): a4-imp-team riscritto per quella (nessuna scelta
// all'entrata, «Fai da centro» spento sul web col motivo, «Apri la Chat»); prima toccava «Genera QR Host».
// ACC1: «Spazio locale» e «Accesso Multi-Utente» diventano «Accesso» e «Rete del negozio»; «Backup Google Drive» è
// spento col motivo (nessuna finestra).
// Uso: node a4-impostazioni.cjs [nome-scenario]
const { scenario } = require('./lib.cjs');
const solo = process.argv[2];
const run = (name, fn, opts) => (!solo || name.includes(solo) ? scenario(name, fn, opts) : null);

const VOCI = [
  ['Stile:', false], ['GS1 Digital Link'], ['Scanner & NFC'], ['Categorie'], ['Campi Personalizzati'], // C1: «Gestisci Cartelle» → «Categorie»
  ['Configura Layout Aggiungi'], ['Cestino'], ['Gestisci Posizioni'], ['Configurazione Condivisione'],
  ['Alert Prodotti Dormienti'], ['Suggerimenti AI'], ['Backup Google Drive'], ['Accesso'], ['Rete del negozio'],
];

(async () => {
  await run('a4-imp-voci', async (h) => {
    const visti = [];
    h.page.on('dialog', (d) => visti.push(d.message().replace(/\n+/g, ' | ').slice(0, 90)));
    const esiti = {};
    for (const [voce, exact = true] of VOCI) {
      await h.go('settings');
      const n = visti.length;
      await h.click(voce, exact);
      await h.page.waitForTimeout(800);
      const path = new URL(h.page.url()).pathname;
      esiti[voce] = `${path} · «${await h.page.title()}»${visti.length > n ? ' · finestra: ' + visti.slice(n).join(' / ') : ''}`;
    }
    await h.go('settings');
    esiti.modelliDiSettoreInElenco = await h.has('Modelli');
    esiti.esciAccountVisibile = await h.has('Esci da questo profilo');
    esiti.infoTitolo = await h.has('Syncro Flow', true);
    return esiti;
  });

  await run('a4-imp-condivisione', async (h) => {
    await h.go('settings/share');
    const premibili = await h.page.locator('[tabindex="0"]:visible').count();
    const interruttori = await h.page.getByRole('switch').locator('visible=true').count();
    const campi = await h.page.locator('input:visible').count();
    return { premibili, interruttori, campi, avviso: await h.has('verrà completata nella prossima versione') };
  });

  await run('a4-imp-team', async (h) => {
    await h.go('settings');
    await h.click('Rete del negozio');
    await h.page.waitForTimeout(2500);
    const url = h.page.url();
    await h.shot('team');
    const testo = (await h.page.locator('body').innerText()).replace(/\s+/g, ' ');
    const stato = {
      url: new URL(url).pathname,
      erroreHost: /Impossibile|non disponibile|errore/i.test(testo),
      stato: (testo.match(/Non collegato|Host pronto[^•]*|Collegato al centro/) || [])[0],
      scelte: [await h.has('Fai da centro del negozio', true), await h.has('Collegati a un centro', true)],
      estratto: testo.slice(0, 260),
    };
    // RETE0: «Fai da centro» spento sul web col motivo; il tocco non fa nulla (nessuna finestra, stato invariato)
    const visti = []; h.page.on('dialog', (d) => visti.push(d.message().replace(/\n+/g, ' | ').slice(0, 90)));
    stato.motivoCentro = await h.has('Sul computer non si può: usa un telefono che resta acceso in negozio.', true);
    await h.click('Fai da centro del negozio'); await h.page.waitForTimeout(1500);
    stato.toccoCentro = visti.slice();
    stato.bannerDopo = ((await h.page.locator('body').innerText()).match(/(Non collegato|Questo telefono è il centro[^\n]*|Collegato al centro[^\n]*)/) || [])[0];
    // Chat (fino a CHAT1 si apre da qui)
    const chat = await h.has('Apri la Chat', true);
    if (chat) { await h.click('Apri la Chat'); await h.page.waitForTimeout(1500); stato.chat = `${new URL(h.page.url()).pathname} «${await h.page.title()}»`; }
    // l'indirizzo della schermata Team riaperto direttamente
    await h.page.goto(url); await h.page.waitForTimeout(2500);
    stato.riaperturaIndirizzo = `${new URL(h.page.url()).pathname} «${await h.page.title()}»`;
    // l'inventario resta intatto
    await h.go('');
    stato.prodotti = (await h.products(0)).length;
    stato.homeOk = await h.has('VIS-0142', true);
    return stato;
  });
})();
