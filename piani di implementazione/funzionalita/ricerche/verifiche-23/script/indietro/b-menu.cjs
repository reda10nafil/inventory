// B. Ingresso dai menu: freccia presente? il clic torna alla schermata di partenza? poi ricarica della stessa pagina.
const { open, arrows, tapBack, icons, shot, log, APP } = require('./base.cjs');
const SETTINGS = ['Stile: Attuale', 'GS1 Digital Link', 'Scanner & NFC', 'Categorie', 'Campi Personalizzati', 'Configura Layout Aggiungi',
  'Modelli di settore', 'Cestino', 'Gestisci Posizioni', 'Scaffali', 'Tipi di pelle', 'Fornitori e clienti', 'Configurazione Condivisione', 'Accesso Multi-Utente'];
const AUTOM = ['Spostamento Rapido', 'Vendita Flash', 'Audit Posizione', 'Conta Magazzino', 'Tagging di Massa', 'Crea Nuova'];
(async () => {
  const { browser, page, consoleAll } = await open();
  const vis = (t) => page.getByText(t, { exact: true }).locator('visible=true').first();
  const tab = async (label) => { await vis(label).click(); await page.waitForTimeout(1000); };
  const rows = [];
  const probe = async (gruppo, voce, tornaSu) => {
    const before = consoleAll.length;
    const url = new URL(page.url()).pathname;
    const a = await arrows(page);
    const tipo = await tapBack(page);
    await page.waitForTimeout(1000);
    const back = (await arrows(page)).testo;
    const urlDopo = new URL(page.url()).pathname;
    const ok = tornaSu ? urlDopo === tornaSu : null;
    const goBack = consoleAll.slice(before).filter((c) => /GO_BACK/.test(c.m)).length;
    const row = { gruppo, voce, url, nativa: a.nat.map((n) => `${n.label}|img${n.img}`).join(';') || '-', disegnata: a.own.filter((g) => g.y < 140).length ? 'freccia' : a.close.filter((g) => g.y < 140).length ? 'X' : '-', clic: tipo || '-', tornato: ok, urlDopo, dopo: back.slice(0, 30), goBack };
    rows.push(row); log(JSON.stringify(row));
    return row;
  };
  // Impostazioni
  await tab('Impostazioni');
  for (const v of SETTINGS) {
    try {
      if (new URL(page.url()).pathname !== '/settings') { await page.goto(APP); await page.waitForTimeout(2000); await tab('Impostazioni'); }
      await vis(v).click(); await page.waitForTimeout(1300);
      if (v === 'Categorie') await shot(page, 'b-categorie-da-menu');
      await probe('Impostazioni', v, '/settings');
    } catch (e) { log(`[${v}] ERRORE ${e.message.split('\n')[0]}`); }
  }
  // Team -> Chat
  try {
    await tab('Impostazioni'); await vis('Accesso Multi-Utente').click(); await page.waitForTimeout(1300);
    await page.getByText('Apri Chat Team', { exact: false }).locator('visible=true').first().click(); await page.waitForTimeout(1300);
    await probe('Team', 'Chat', '/SettingsTeam');
  } catch (e) { log(`[Chat] ERRORE ${e.message.split('\n')[0]}`); }
  // Automazioni
  for (const v of AUTOM) {
    try {
      await page.goto(APP + '/automations'); await page.waitForTimeout(2000);
      await tab('Home'); await tab('Automazioni');
      await vis(v).click(); await page.waitForTimeout(1300);
      await probe('Automazioni', v, '/automations');
    } catch (e) { log(`[${v}] ERRORE ${e.message.split('\n')[0]}`); }
  }
  await page.goto(APP); await page.waitForTimeout(2000);
  // Home -> Scheda -> Modifica -> Annulla -> Indietro
  try {
    await tab('Home');
    await vis('VIS-0142').click(); await page.waitForTimeout(1300);
    const scheda = await arrows(page);
    await vis('Modifica').click(); await page.waitForTimeout(1300);
    const modifica = await arrows(page);
    await vis('Annulla').click(); await page.waitForTimeout(1000);
    const dopoAnnulla = new URL(page.url()).pathname;
    await vis('Indietro').click(); await page.waitForTimeout(1000);
    const dopoIndietro = new URL(page.url()).pathname;
    log(JSON.stringify({ gruppo: 'Home', scheda: { nat: scheda.nat.length, own: scheda.own.map((g) => g.y) }, modifica: { nat: modifica.nat.length, own: modifica.own.map((g) => g.y) }, dopoAnnulla, dopoIndietro }));
  } catch (e) { log(`[Home] ERRORE ${e.message.split('\n')[0]}`); }
  await page.goto(APP); await page.waitForTimeout(2000);
  // Ricarica su una pagina con intestazione nativa aperta dal menu
  try {
    await tab('Impostazioni'); await vis('Gestisci Posizioni').click(); await page.waitForTimeout(1300);
    const prima = await arrows(page);
    await page.reload(); await page.waitForTimeout(2500);
    const dopo = await arrows(page);
    await shot(page, 'b-posizioni-dopo-ricarica');
    log(JSON.stringify({ gruppo: 'ricarica', url: new URL(page.url()).pathname, prima: prima.nat.map((n) => n.label), dopo: dopo.nat.map((n) => n.label), testo: dopo.testo.slice(0, 30) }));
  } catch (e) { log(`[ricarica] ERRORE ${e.message.split('\n')[0]}`); }
  await browser.close();
})();
