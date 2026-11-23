// D. Icone sulle schermate principali (caricamento normale). E. Caratteri delle icone bloccati o in ritardo.
// F. «Server spento con la pagina aperta»: tutte le richieste a :8082 bloccate dopo il caricamento, poi riaperte.
// Uso: node d-icone.cjs [D|E1|E2|F]
const { open, arrows, icons, shot, log, APP } = require('./base.cjs');
const which = process.argv[2] || 'D';
const isIconFont = (u) => /Material(Community)?Icons\.ttf/.test(decodeURIComponent(u));
const brief = (i) => ({ n: i.n, fallback: i.fallback, ignoti: i.ignoti.length, faces: i.faces, check: i.check });
const vis = (page, t) => page.getByText(t, { exact: true }).locator('visible=true').first();
const click = async (page, t) => { await vis(page, t).click(); await page.waitForTimeout(1200); };

(async () => {
  if (which === 'D') {
    const { browser, page, net, consoleAll } = await open();
    const res = {};
    const visit = async (key, fn) => { try { await fn(); await page.waitForTimeout(800); res[key] = brief(await icons(page)); } catch (e) { res[key] = 'ERRORE ' + e.message.split('\n')[0]; } };
    await visit('home', async () => {});
    await visit('cronologia', () => click(page, 'Cronologia'));
    await visit('automazioni', () => click(page, 'Automazioni'));
    await visit('aggiungi', () => click(page, 'Aggiungi'));
    await visit('impostazioni', () => click(page, 'Impostazioni'));
    await visit('categorie', () => click(page, 'Categorie'));
    await visit('campi', async () => { await page.goBack(); await page.waitForTimeout(800); await click(page, 'Campi Personalizzati'); });
    await visit('scheda', async () => { await page.goto(APP); await page.waitForTimeout(2000); await click(page, 'VIS-0142'); });
    await visit('modifica', () => click(page, 'Modifica'));
    await visit('conta', async () => { await page.goto(APP); await page.waitForTimeout(2000); await click(page, 'Automazioni'); await click(page, 'Conta Magazzino'); });
    await visit('azione-rapida', async () => { await page.goto(`${APP}/scanner-action?type=product&id=cmp-1`); await page.waitForTimeout(2500); });
    await visit('scanner', async () => { await page.goto(`${APP}/scanner`); await page.waitForTimeout(2500); });
    for (const [k, v] of Object.entries(res)) log(k, JSON.stringify(v));
    log('rete ttf/png:', JSON.stringify(net));
    log('avvisi icone:', JSON.stringify(consoleAll.filter((c) => /not a valid icon|vector-icons|font/i.test(c.m)).map((c) => c.m).slice(0, 10)));
    await browser.close();
  }

  if (which === 'E1' || which === 'E2') {
    let blocked = true;
    const delay = which === 'E2';
    const { browser, page, ctx, net, consoleAll } = await open({
      before: async (p) => {
        await p.route((u) => isIconFont(u.toString()), async (route) => {
          if (!blocked) return route.continue();
          if (delay) { await new Promise((r) => setTimeout(r, 8000)); return route.continue().catch(() => {}); }
          return route.abort();
        });
      },
    });
    const r = {};
    r.homeSubito = brief(await icons(page));
    await shot(page, `${which}-home-subito`);
    await page.waitForTimeout(delay ? 9000 : 1000);
    r.homeDopoAttesa = brief(await icons(page));
    await shot(page, `${which}-home-dopo-attesa`);
    blocked = false; // «server riacceso»
    await click(page, 'Impostazioni');
    r.impostazioniDopoSblocco = brief(await icons(page));
    await click(page, 'Categorie');
    r.categorieDopoSblocco = brief(await icons(page));
    await shot(page, `${which}-categorie-dopo-sblocco`);
    await page.goto(APP); await page.waitForTimeout(800);
    r.homeTornandoSenzaRicarica = 'n/a';
    await page.reload(); await page.waitForTimeout(3000);
    r.homeDopoRicarica = brief(await icons(page));
    await shot(page, `${which}-home-dopo-ricarica`);
    for (const [k, v] of Object.entries(r)) log(which, k, JSON.stringify(v));
    log('rete:', JSON.stringify(net.filter((n) => /ttf/.test(n.u))));
    log('errori:', JSON.stringify([...new Set(consoleAll.filter((c) => c.t === 'error' || c.t === 'pageerror').map((c) => c.m.slice(0, 120)))].slice(0, 8)));
    await browser.close();
  }

  if (which === 'F') {
    const { browser, page, net, consoleAll } = await open();
    const r = {};
    r.homePrima = brief(await icons(page));
    // «server spento»: tutte le richieste a :8082 falliscono (la pagina resta aperta)
    await page.route((u) => u.toString().startsWith(APP), (route) => route.abort());
    r.netPrimaDelBlocco = net.length;
    await click(page, 'Impostazioni');
    r.impostazioniSpento = brief(await icons(page));
    await click(page, 'Categorie');
    const a1 = await arrows(page);
    r.categorieSpento = { icone: brief(await icons(page)), freccia: a1.nat };
    await shot(page, 'F-categorie-server-spento');
    await page.goBack(); await page.waitForTimeout(800);
    // «server riacceso» senza ricaricare
    await page.unroute((u) => true).catch(() => {});
    await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {});
    await click(page, 'Gestisci Posizioni');
    const a2 = await arrows(page);
    r.posizioniRiacceso = { icone: brief(await icons(page)), freccia: a2.nat };
    await shot(page, 'F-posizioni-server-riacceso');
    for (const [k, v] of Object.entries(r)) log('F', k, JSON.stringify(v));
    log('rete:', JSON.stringify(net));
    log('errori:', JSON.stringify([...new Set(consoleAll.filter((c) => c.t === 'error' || c.t === 'pageerror').map((c) => c.m.slice(0, 120)))].slice(0, 8)));
    await browser.close();
  }
})();
