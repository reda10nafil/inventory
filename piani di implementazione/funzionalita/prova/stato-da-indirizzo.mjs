// C2 (ticket 21, IND-P1 e IND-P2), prova in Node con le funzioni vere di React Navigation: per ogni indirizzo di
// `src/navigation/linking.ts` lo stato costruito (con la scheda madre sotto la schermata) e l'azione per un link
// ricevuto ad app già aperta (deve restare NAVIGATE verso la schermata, così lo stack corrente non si azzera).
// Copiata da `ricerche/verifiche-23/script/indietro/stato-da-indirizzo.mjs` ed estesa: legge linking.ts della copia
// di lavoro (lo trascrive in JS con il TypeScript del progetto) e, per confronto, quello di un commit (`BASE`).
// Madre attesa dalla tabella dei menu di `c2-util.cjs`, non da linking.ts. Esce con 1 se una riga non torna.
// Uso (dalla cartella prova/): node stato-da-indirizzo.mjs [commit di confronto, predefinito 4674fbc]
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { MADRE, daAprire, REPO } = require('./c2-util.cjs');
const ts = require(join(REPO, 'node_modules/typescript'));
const BASE = process.argv[2] || '4674fbc';
const CORE = (f) => pathToFileURL(join(REPO, 'node_modules/@react-navigation/core/lib/module', f)).href;
const { getStateFromPath } = await import(CORE('getStateFromPath.js'));
const { getActionFromState } = await import(CORE('getActionFromState.js'));

// linking.ts → modulo JS: l'import da @react-navigation/native punta al file di @react-navigation/core che lo esporta
const dir = mkdtempSync(join(tmpdir(), 'c2-linking-'));
async function carica(src, nome) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
    .replace(/from '@react-navigation\/native'/g, `from '${CORE('getStateFromPath.js')}'`);
  const file = join(dir, `${nome}.mjs`);
  writeFileSync(file, js);
  return (await import(pathToFileURL(file).href)).linking;
}
// LINKING=<file> prova un linking.ts diverso da quello della copia di lavoro (per esempio una bozza)
const ora = await carica(readFileSync(process.env.LINKING || join(REPO, 'src/navigation/linking.ts'), 'utf8'), 'ora');
const prima = await carica(execFileSync('git', ['show', `${BASE}:src/navigation/linking.ts`], { cwd: REPO, encoding: 'utf8' }), 'prima');
const stato = (l, p) => (l.getStateFromPath || getStateFromPath)(p, l.config);
const breve = (s) => s && s.routes.map((r) => r.name + (r.params ? JSON.stringify(r.params) : '') + (r.state ? `{${breve(r.state)}}` : '')).join(' > ');

const righe = [];
let rossi = 0;
const schermate = Object.entries(ora.config.screens).filter(([n, v]) => n !== '(tabs)' && v !== '*');
for (const [nome, indirizzo] of schermate) {
  const p = daAprire(indirizzo) + (nome === 'SettingsAutomationBuilder' ? '?editId=x' : '');
  const s = stato(ora, p);
  const azione = getActionFromState(s, ora.config);
  const madre = MADRE[indirizzo];
  const [sotto, sopra] = s.routes;
  const ok = s.routes.length === 2 && sotto.name === '(tabs)' && sotto.state?.routes?.[0]?.name === madre && sopra.name === nome
    && azione?.type === 'NAVIGATE' && azione.payload.name === nome;
  if (!ok) rossi += 1;
  righe.push(`${ok ? 'ok   ' : 'ROSSO'} /${p}\n      ${BASE}: ${breve(stato(prima, p)) || '-'}\n      ora:     ${breve(s)}   (madre attesa ${madre})\n      link ad app aperta: ${azione ? `${azione.type} ${azione.payload?.name ?? ''}${azione.payload?.params ? ' ' + JSON.stringify(azione.payload.params) : ''}` : '-'}`);
}
// Le schede e la radice restano come prima (nessuna schermata aggiunta); un indirizzo sconosciuto dà NotFound sopra la Home
for (const [p, atteso] of [['', '(tabs){index}'], ['settings', '(tabs){settings}'], ['automations', '(tabs){automations}'], ['timeline', '(tabs){timeline}'],
  ['inesistente', '(tabs) > NotFound'], ['auth/callback?code=x', '(tabs) > NotFound']]) {
  const b = breve(stato(ora, p)).replace(/\{"[^}]*\}/g, '');
  const ok = b === atteso;
  if (!ok) rossi += 1;
  righe.push(`${ok ? 'ok   ' : 'ROSSO'} /${p}\n      ${BASE}: ${breve(stato(prima, p))}\n      ora:     ${b}   (atteso ${atteso})`);
}
// Ogni schermata di linking.ts ha la sua madre nella tabella dei menu e viceversa
const senza = schermate.filter(([, i]) => !MADRE[i]).map(([n]) => n);
const avanzano = Object.keys(MADRE).filter((i) => !schermate.some(([, x]) => x === i));
if (senza.length || avanzano.length) { rossi += 1; righe.push(`ROSSO tabella dei menu: senza madre ${JSON.stringify(senza)}, in più ${JSON.stringify(avanzano)}`); }
console.log(righe.join('\n'));
console.log(`\n${schermate.length} schermate, ${rossi ? `${rossi} ROSSE` : 'tutte ok'}`);
process.exit(rossi ? 1 : 0);
