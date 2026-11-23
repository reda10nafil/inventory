// Confronta i nomi di icone usati nel codice (commit 4b94e4c) con le mappe dei glifi di @expo/vector-icons.
// Solo lettura: git show / git ls-tree nel worktree, nessun file scritto fuori da questa cartella.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const REPO = require('path').join(__dirname, '../../../../../..');
const REV = process.env.REV || '4b94e4c';
const GM = path.join(REPO, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps');
const MI = JSON.parse(fs.readFileSync(path.join(GM, 'MaterialIcons.json'), 'utf8'));
const MCI = JSON.parse(fs.readFileSync(path.join(GM, 'MaterialCommunityIcons.json'), 'utf8'));
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const files = git('ls-tree', '-r', '--name-only', REV)
  .split('\n')
  .filter((f) => /\.(tsx?|jsx?)$/.test(f))
  .filter((f) => !/^(app|syncro_flow_flutter|graphify-out|node_modules|template|__tests__|android|ios|onspace|piani di implementazione)\//.test(f))
  .filter((f) => !/\.d\.ts$/.test(f));

const found = []; // {file, line, name, ctx}
const strRe = /'([a-z0-9-]+)'|"([a-z0-9-]+)"/g;
for (const f of files) {
  let src;
  try { src = git('show', `${REV}:${f}`); } catch { continue; }
  const lines = src.split('\n');
  lines.forEach((ln, i) => {
    const contexts = [];
    // <AppIcon ... name=... /> o <MaterialIcons name=...> sulla stessa riga
    if (/<(AppIcon|MaterialIcons|MaterialCommunityIcons)\b/.test(ln) || /^\s*name=/.test(ln)) {
      const m = ln.match(/name=(\{[^}]*\}|"[^"]*"|'[^']*')/);
      if (m) contexts.push(['name', m[1]]);
    }
    // proprietà icona nei dati: icon: 'x', icon="x", buttonIcon, activeName, iconName = 'x', FALLBACK
    const props = ln.matchAll(/\b(icon|Icon|buttonIcon|activeName|iconName|defaultIcon|FALLBACK)\b\s*[:=]\s*(\{[^}]*\}|[^,;)]+)/g);
    for (const p of props) contexts.push([p[1], p[2]]);
    // liste di icone: ICONS = ['a','b'] / *_ICONS
    if (/ICONS\b.*[=:]\s*[\[{]/.test(ln) || /ICONS\b.*Record/.test(ln)) contexts.push(['ICONS', ln]);
    for (const [ctx, text] of contexts) {
      for (const s of text.matchAll(strRe)) {
        const name = s[1] || s[2];
        if (!name || name.length < 2) continue;
        found.push({ file: f, line: i + 1, name, ctx });
      }
    }
  });
}

// liste multilinea di icone (array dopo «ICONS = [» fino a «]»)
for (const f of files) {
  let src;
  try { src = git('show', `${REV}:${f}`); } catch { continue; }
  const re = /([A-Z_]*ICON[A-Z_]*)\s*(?::[^=]*)?=\s*([\[{])/g;
  let m;
  while ((m = re.exec(src))) {
    const open = m[2]; const close = open === '[' ? ']' : '}';
    let depth = 0, j = m.index + m[0].length - 1;
    for (; j < src.length; j++) { if (src[j] === open) depth++; else if (src[j] === close) { depth--; if (!depth) break; } }
    const body = src.slice(m.index, j + 1);
    const startLine = src.slice(0, m.index).split('\n').length;
    body.split('\n').forEach((ln, k) => {
      for (const s of ln.matchAll(strRe)) {
        const name = s[1] || s[2];
        // nelle mappe {chiave: 'valore'} prende i valori
        found.push({ file: f, line: startLine + k, name, ctx: m[1] });
      }
    });
  }
}

const REPL = {
  'grid-view': 1, timeline: 1, 'account-tree': 1, 'add-circle': 1, settings: 1,
  'fitness-center': 1, straighten: 1, 'width-wide': 1, apps: 1,
};
const uniq = new Map();
for (const x of found) {
  const k = `${x.file}:${x.line}:${x.name}`;
  if (!uniq.has(k)) uniq.set(k, x);
}
const all = [...uniq.values()];
const names = new Set(all.map((x) => x.name));
const miss = all.filter((x) => !(x.name in MI) && !(x.name in MCI) && !REPL[x.name]);
const onlyMci = all.filter((x) => !(x.name in MI) && (x.name in MCI) && !REPL[x.name]);
console.log('file letti:', files.length, '| occorrenze:', all.length, '| nomi distinti:', names.size);
console.log('fallback label-outline in MI:', 'label-outline' in MI);
console.log('\n== nomi assenti da MaterialIcons e da MaterialCommunityIcons ==');
for (const x of miss) console.log(`${x.file}:${x.line}\t${x.name}\t(${x.ctx})`);
console.log('\n== nomi solo in MaterialCommunityIcons (con AppIcon diventano label-outline, se non sono sostituiti) ==');
for (const x of onlyMci) console.log(`${x.file}:${x.line}\t${x.name}\t(${x.ctx})`);
console.log('\n== tutti i nomi distinti ==');
console.log([...names].sort().map((n) => `${n}${n in MI ? '' : n in MCI ? '[MCI]' : REPL[n] ? '[sost]' : '[NO]'}`).join(' '));
