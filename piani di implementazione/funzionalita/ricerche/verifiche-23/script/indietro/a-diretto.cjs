// A. Ogni schermata aperta dall'indirizzo (= ricarica): freccia nativa o disegnata, clic, dove si arriva, GO_BACK.
const { open, arrows, tapBack, log, APP } = require('./base.cjs');
const ROUTES = [
  '', 'timeline', 'automations', 'add', 'settings',
  'scanner', 'scanner-action?type=product&id=cmp-1', 'scanner-action?type=library&id=pellicce', 'scanner-action?type=location&id=vetrina',
  'product/cmp-1', 'product/edit/cmp-1', 'product/inesistente',
  'settings/locations', 'settings/categories', 'settings/contacts', 'settings/fields', 'settings/folders',
  'settings/layout-builder', 'settings/gs1-config', 'settings/hardware', 'settings/trash', 'settings/share',
  'settings/appearance', 'settings/sector-templates', 'settings/shelves',
  'automations/audit', 'automations/batch-move', 'automations/scan-sell', 'automations/quick-tag', 'automations/count',
  'automations/automation-flow/x', 'automations/custom-runner/x',
  'SettingsTeam', 'Chat', 'SettingsAutomationBuilder', 'settings/team', 'chat', 'settings/automation-builder',
];
(async () => {
  const { browser, page, consoleAll } = await open();
  const rows = [];
  for (const r of ROUTES) {
    try {
      await page.goto(`${APP}/${r}`);
      await page.waitForTimeout(2200);
      const before = consoleAll.length;
      const a = await arrows(page);
      const tipo = await tapBack(page);
      await page.waitForTimeout(1200);
      const dopo = tipo ? (await arrows(page)).testo.slice(0, 40) : '';
      const goBack = consoleAll.slice(before).filter((c) => /GO_BACK/.test(c.m)).length;
      const row = { r, url: new URL(page.url()).pathname, nativa: a.nat.map((n) => `${n.label}|img${n.img}`).join(';') || '-', disegnata: a.own.filter((g) => g.y < 140).length ? 'freccia' : a.close.filter((g) => g.y < 140).length ? 'X' : '-', notFound: a.notFound, clic: tipo || '-', dopo, goBack, testo: a.testo.slice(0, 45) };
      rows.push(row);
      log(JSON.stringify(row));
    } catch (e) {
      log(`[${r}] ERRORE ${e.message.split('\n')[0]}`);
    }
  }
  const errs = consoleAll.filter((c) => c.t === 'error' || c.t === 'pageerror').map((c) => `${new URL(c.url).pathname} ${c.m.slice(0, 110)}`);
  log('errori console:', JSON.stringify([...new Set(errs)].slice(0, 30)));
  await browser.close();
})();
