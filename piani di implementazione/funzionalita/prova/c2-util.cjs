// Aiuti delle prove C2 (ticket 21): indirizzi letti da `src/navigation/linking.ts` e tabella ATTESA indirizzo →
// scheda madre. La tabella è scritta dai chiamanti nei menu (grep di `router.push` a 4674fbc), NON copiata da
// `linking.ts`: la prova confronta le due. Scheda madre = la scheda da cui la schermata si apre nei menu, non il
// prefisso dell'indirizzo (Crea automazione è sotto `settings/` ma si apre da Automazioni).
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '../../..');

const MADRE = {
  scanner: 'automations', // AutomationsScreen.tsx:93 (icona dello scanner)
  'scanner-action': 'automations', // ScannerScreen.tsx:70-229 (dopo una lettura; lo Scanner sta in Automazioni)
  'product/:id': 'index', // HomeScreen.tsx:110 (card); anche TimelineScreen.tsx:149
  'product/edit/:id': 'index', // DetailScreen.tsx:1293 (Scheda › Modifica, la Scheda si apre dalla Home)
  'settings/locations': 'settings', // SettingsScreen.tsx:401
  'settings/categories': 'settings', // SettingsScreen.tsx:438 a 4674fbc (voce Tipi di pelle); da C2 apre Campi Personalizzati
  'settings/contacts': 'settings', // SettingsScreen.tsx:456
  'settings/shelves': 'settings', // SettingsScreen.tsx:420
  'settings/fields': 'settings', // SettingsScreen.tsx:328
  'settings/folders': 'settings', // SettingsScreen.tsx:310
  'settings/layout-builder': 'settings', // SettingsScreen.tsx:346
  'settings/gs1-config': 'settings', // SettingsScreen.tsx:271
  'settings/hardware': 'settings', // SettingsScreen.tsx:289
  'settings/trash': 'settings', // SettingsScreen.tsx:383
  'settings/share': 'settings', // SettingsScreen.tsx:478
  'settings/appearance': 'settings', // SettingsScreen.tsx:250
  'settings/sector-templates': 'settings', // SettingsScreen.tsx:365
  'settings/team': 'settings', // SettingsScreen.tsx (Persone e telefoni › Rete del negozio, da ACC1; prima Accesso Multi-Utente)
  'settings/access': 'settings', // SettingsScreen.tsx (Persone e telefoni › Accesso, ACC1)
  chat: 'settings', // TeamScreen.tsx:261 (Team sta in Impostazioni)
  'settings/automation-builder': 'automations', // AutomationsScreen.tsx:103, :115; AutomationFlowScreen.tsx:77
  'automations/audit': 'automations', // AutomationsScreen.tsx:38 e :67 (modelli); CountScreen.tsx:137
  'automations/batch-move': 'automations', // AutomationsScreen.tsx:22
  'automations/scan-sell': 'automations', // AutomationsScreen.tsx:30
  'automations/quick-tag': 'automations', // AutomationsScreen.tsx:54
  'automations/count': 'automations', // AutomationsScreen.tsx:46
  'automations/automation-flow/:id': 'automations', // AutomationsScreen.tsx:74
  'automations/custom-runner/:id': 'automations', // AutomationFlowScreen.tsx:65, ScannerScreen.tsx:123
};

// Indirizzo della scheda madre nel browser
const PERCORSO_MADRE = { index: '/', settings: '/settings', automations: '/automations', timeline: '/timeline', add: '/add' };

/** Schermate e indirizzi di linking.ts (righe «Nome: 'indirizzo',» di `screens`, fuori dalle schede), letti dal file. */
function indirizzi(file = path.join(REPO, 'src/navigation/linking.ts')) {
  const tutto = fs.readFileSync(file, 'utf8');
  const src = tutto.slice(tutto.indexOf('screens: {'), tutto.indexOf("NotFound: '*'"));
  const fuori = src.slice(src.indexOf("'(tabs)'"));
  const schede = fuori.slice(0, fuori.indexOf('},', fuori.indexOf('screens: {')) + 2);
  return [...src.replace(schede, '').matchAll(/^\s+(\w+): '([^']*)',\s*$/gm)]
    .map(([, nome, indirizzo]) => ({ nome, indirizzo }))
    .filter((r) => r.indirizzo !== '*');
}

/** Indirizzo da aprire nel browser: parametri `:id` con un id del campionario. */
const daAprire = (indirizzo) => indirizzo.replace('product/:id', 'product/cmp-1').replace('product/edit/:id', 'product/edit/cmp-1').replace(':id', 'x');

// Frecce in alto: nativa (aria-label «…, back» o «Go back») e disegnate (glifi arrow-back e close nelle prime 140 righe).
const GLIFI = { back: 0xe5c4, close: 0xe5cd }; // MaterialIcons arrow-back, close
async function frecce(page) {
  return page.evaluate(({ back, close }) => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.offsetParent !== null; };
    const nativa = [...document.querySelectorAll('[aria-label]')]
      .filter((e) => /^(Go back|.*, back)$/.test(e.getAttribute('aria-label')) && vis(e)).map((e) => e.getAttribute('aria-label'));
    const glifo = (ch) => [...document.querySelectorAll('div,span')]
      .filter((e) => e.childElementCount === 0 && e.textContent === ch && vis(e) && /material/.test(getComputedStyle(e).fontFamily))
      .map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })
      .filter((g) => g.y < 140);
    const testo = (document.body.innerText || '').replace(/\s+/g, ' ');
    return { nativa, freccia: glifo(String.fromCodePoint(back)), x: glifo(String.fromCodePoint(close)), notFound: /Page Not Found/.test(testo) };
  }, GLIFI);
}

/** Tocca la freccia in alto (nativa, poi disegnata, poi X); restituisce che cosa ha toccato o null. */
async function toccaIndietro(page) {
  const f = await frecce(page);
  if (f.nativa.length) { await page.locator(`[aria-label="${f.nativa[0]}"]`).locator('visible=true').first().click(); return 'nativa'; }
  const g = f.freccia[0] || f.x[0];
  if (g) { await page.mouse.click(g.x, g.y); return f.freccia[0] ? 'freccia' : 'X'; }
  return null;
}

/** Quante Home montate (titolo «Syncro Flow» della Home, anche nascoste) e quante schermate con un testo. */
const montate = (page, testo) => page.evaluate((t) => [...document.querySelectorAll('div')]
  .filter((e) => e.childElementCount === 0 && e.textContent === t).length, testo);

// Barre delle schede montate (la barra ha role="tablist", TabBar.tsx:37), anche nascoste: una sola = una sola (tabs)
const barre = (page) => page.locator('[role="tablist"]').count();

const percorso = (page) => new URL(page.url()).pathname;

// Stato salvato tranne gli avvisi (li rigenera l'app a ogni avvio) e le chiavi del browser (come c1-categorie.cjs)
const snapshot = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage)
  .filter((k) => k !== 'inventory:v1:local:alerts' && !k.startsWith('loki') && !k.startsWith('expo'))
  .sort().map((k) => [k, localStorage.getItem(k)])));
const changedKeys = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);

module.exports = { MADRE, PERCORSO_MADRE, indirizzi, daAprire, frecce, toccaIndietro, montate, barre, percorso, snapshot, changedKeys, REPO };
