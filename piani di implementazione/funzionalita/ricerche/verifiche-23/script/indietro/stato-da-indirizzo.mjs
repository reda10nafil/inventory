// Che stato costruisce React Navigation da un indirizzo, con la config di linking.ts a 4b94e4c, senza e con
// initialRouteName: '(tabs)'. E che azione usa per un link ricevuto ad app aperta. Solo lettura di node_modules.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const REPO = decodeURIComponent(new URL('../../../../../..', import.meta.url).pathname).replace(/^\/(\w:)/, '$1');
const core = (f) => import(pathToFileURL(`${REPO}/node_modules/@react-navigation/core/lib/module/${f}`).href);
const { getStateFromPath } = await core('getStateFromPath.js');
const { getActionFromState } = await core('getActionFromState.js');

const src = execFileSync('git', ['show', '4b94e4c:src/navigation/linking.ts'], { cwd: REPO, encoding: 'utf8' });
const linking = eval('(' + src.replace(/^export const linking = /, '').replace(/;\s*$/, '') + ')');
const base = linking.config;
const conInit = { initialRouteName: '(tabs)', ...base };

const paths = ['settings/folders', 'settings/share', 'automations/count', 'product/cmp-1', 'product/edit/cmp-1',
  'scanner-action?type=product&id=cmp-1', 'SettingsTeam', 'Chat', 'auth/callback?code=x', 'settings', '', 'timeline'];
const brief = (s) => s && s.routes.map((r) => r.name + (r.params ? JSON.stringify(r.params) : '') + (r.state ? '{' + brief(r.state) + '}' : '')).join(' > ');
for (const p of paths) {
  const a = getStateFromPath(p, base);
  const b = getStateFromPath(p, conInit);
  const act = b ? getActionFromState(b, conInit) : undefined;
  console.log(`/${p}\n   oggi:      ${brief(a)}\n   con init:  ${brief(b)}\n   link ad app aperta (con init): ${act ? act.type + ' ' + (act.payload?.name ?? '') : '-'}`);
}
