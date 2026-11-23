// H. Correzione C2 simulata senza toccare il worktree: il bundle servito da Metro viene intercettato e nella config di
// linking si aggiunge initialRouteName: '(tabs)'. Uso: node h-correzione.cjs [con|senza]
const { open, arrows, tapBack, shot, log, APP } = require('./base.cjs');
const mode = process.argv[2] || 'con';
const RE = /(prefixes: \['syncroflow:\/\/', 'exp\+syncro-flow:\/\/'\],\s*config: \{)/g;
(async () => {
  let replaced = null;
  const { browser, page, consoleAll } = await open({
    before: async (p) => {
      if (mode !== 'con') return;
      await p.route(/index\.bundle/, async (route) => {
        const res = await route.fetch();
        const body = await res.text();
        const n = (body.match(RE) || []).length;
        replaced = n;
        await route.fulfill({ response: res, body: n === 1 ? body.replace(RE, "$1 initialRouteName: '(tabs)',") : body });
      });
    },
  });
  log('sostituzioni nel bundle:', replaced);
  const path = () => new URL(page.url()).pathname + new URL(page.url()).search;
  const goBacks = () => consoleAll.filter((c) => /GO_BACK/.test(c.m)).length;
  const vis = (t) => page.getByText(t, { exact: true }).locator('visible=true').first();
  const count = (t) => page.evaluate((x) => [...document.querySelectorAll('div')].filter((e) => e.childElementCount === 0 && e.textContent === x).length, t);
  const rows = [];
  for (const r of ['settings/folders', 'settings/share', 'automations/count', 'product/cmp-1', 'scanner-action?type=library&id=pellicce', 'SettingsTeam', 'auth/callback?code=x']) {
    const g0 = goBacks();
    await page.goto(`${APP}/${r}`); await page.waitForTimeout(2500);
    const a = await arrows(page);
    const homeMontata = await count('Syncro Flow');
    let tipo = await tapBack(page);
    if (!tipo && r.startsWith('scanner-action')) { await vis('Chiudi').click(); tipo = 'Chiudi'; }
    if (!tipo && r.startsWith('product/')) { await vis('Indietro').click(); tipo = 'Indietro (in basso)'; }
    await page.waitForTimeout(1200);
    rows.push({ r, nativa: a.nat.map((n) => n.label).join(';') || '-', disegnata: a.own.filter((g) => g.y < 140).length + a.close.filter((g) => g.y < 140).length, notFound: a.notFound, homeMontata, clic: tipo || '-', dopo: path(), goBack: goBacks() - g0 });
  }
  for (const x of rows) log(mode, JSON.stringify(x));
  // Modifica ricaricata -> Salva -> OK
  {
    const g0 = goBacks();
    await page.goto(`${APP}/product/edit/cmp-1`); await page.waitForTimeout(2500);
    await vis('Salva Modifiche').click(); await page.waitForTimeout(1500);
    log(mode, 'modifica-salva', JSON.stringify({ dopo: path(), goBack: goBacks() - g0 }));
  }
  // NotFound -> Return Home: quante barre delle schede montate?
  {
    await page.goto(`${APP}/SettingsTeam`); await page.waitForTimeout(2500);
    await vis('Return Home').click(); await page.waitForTimeout(1500);
    log(mode, 'notfound-home', JSON.stringify({ dopo: path(), copieHome: await count('Syncro Flow'), notFoundMontata: await count('Page Not Found') }));
  }
  // prova esistente a4-imp-condivisione: elementi premibili contati senza filtro di visibilità
  {
    await page.goto(`${APP}/settings/share`); await page.waitForTimeout(2000);
    const premibili = await page.locator('[tabindex="0"]').count();
    const premibiliVisibili = await page.locator('[tabindex="0"]:visible').count();
    log(mode, 'a4-imp-condivisione', JSON.stringify({ premibili, premibiliVisibili }));
  }
  await shot(page, `H-${mode}-share`);
  await browser.close();
})();
