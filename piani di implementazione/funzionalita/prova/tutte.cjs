// Tutte le prove della cartella (regressioni di una fetta): lancia ogni prova di `prova/` (escluse `lib.cjs`, gli
// `*-util.cjs`, gli `stili-*.cjs`, `collaudo.cjs` e `tutte.cjs`) e scrive UNA RIGA NORMALIZZATA PER SCENARIO, così
// due giri (prima e dopo le modifiche di una fetta) si confrontano riga per riga. Nato con C2 (ticket 21).
//
// Uso (dalla cartella `prova/`, app su :8082 e campionario su :8765):
//   node tutte.cjs <cartella>                    tutte le prove, PARALLELI=3 alla volta (predefinito)
//   node tutte.cjs <cartella> a4-posizioni c1-   solo le prove il cui nome contiene uno dei filtri
//   node tutte.cjs --confronta <base> <dopo>     righe diverse, mancanti o nuove tra due giri
// In <cartella>: `grezzo/<prova>.txt` (uscita intera), `esiti.txt` (una riga per scenario, ordinate per prova e
// per ordine di esecuzione), `riepilogo.txt`. Schermate degli errori in `<cartella>/shots`.
//
// Normalizzazione (solo nelle righe di `esiti.txt`): ora del registro, date e ore, numeri lunghi (Date.now, id
// generati), id con suffisso casuale, indirizzi `blob:` e percorsi temporanei diventano segnaposto.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const ESCLUSE = (f) => f === 'lib.cjs' || f === 'collaudo.cjs' || f === 'tutte.cjs' || /-util\.cjs$/.test(f) || /^stili-/.test(f);
const TEMPO_MAX = Number(process.env.TEMPO_MAX || 20 * 60 * 1000); // per prova

function normalizza(testo) {
  return testo
    .replace(/blob:[^"'\s,\]]+/g, '<blob>')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '<data>')
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}(,?\s*\d{1,2}:\d{2}(:\d{2})?)?/g, '<data>')
    .replace(/\b\d{1,2} (gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)[a-z]*\.? \d{4}/gi, '<data>')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '<ora>')
    .replace(/\b\d{12,}[-_][a-z0-9]{2,16}\b/gi, '<id>')
    .replace(/\b[a-z]+_\d{12,}(_[a-z0-9]+)?\b/gi, '<id>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>')
    .replace(/\b\d{12,}\b/g, '<n>')
    .replace(/[A-Za-z]:\\\\?[^"'\s,]*(Temp|tmp)[^"'\s,]*/g, '<tmp>')
    .replace(/\/tmp\/[^"'\s,]*/g, '<tmp>');
}

// Righe dello scenario scritte da lib.cjs: «HH:MM:SS [nome] {...} | finestre: [...] | errori console: …»
const RIGA = /^\d{2}:\d{2}:\d{2} \[([^\]]+)\] (.*)$/;

function esitiDi(prova, uscita, codice, stderr) {
  const righe = [];
  const visti = {};
  for (const r of uscita.split(/\r?\n/)) {
    const m = r.match(RIGA);
    if (!m) continue;
    visti[m[1]] = (visti[m[1]] || 0) + 1;
    const nome = visti[m[1]] > 1 ? `${m[1]}#${visti[m[1]]}` : m[1];
    righe.push(`${prova} | ${nome} | ${normalizza(m[2])}`);
  }
  if (codice !== 0 || !righe.length) {
    const primo = (stderr.split(/\r?\n/).find((l) => l.trim()) || '').slice(0, 200);
    righe.push(`${prova} | (processo) | uscita ${codice}${primo ? `: ${normalizza(primo)}` : ''}`);
  }
  return righe;
}

function lancia(prova, out) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const env = { ...process.env, SHOTS: path.join(out, 'shots') };
    const p = spawn(process.execPath, [prova], { cwd: DIR, env });
    let so = '';
    let se = '';
    p.stdout.on('data', (d) => { so += d; });
    p.stderr.on('data', (d) => { se += d; });
    const timer = setTimeout(() => { se += `\nTEMPO SCADUTO dopo ${TEMPO_MAX} ms`; p.kill(); }, TEMPO_MAX);
    p.on('close', (codice) => {
      clearTimeout(timer);
      fs.writeFileSync(path.join(out, 'grezzo', prova.replace(/\.cjs$/, '.txt')), `${so}\n--- stderr ---\n${se}`);
      resolve({ prova, codice: codice ?? -1, righe: esitiDi(prova, so, codice ?? -1, se), secondi: Math.round((Date.now() - t0) / 1000) });
    });
  });
}

function leggiEsiti(dir) {
  const mappa = new Map();
  for (const r of fs.readFileSync(path.join(dir, 'esiti.txt'), 'utf8').split(/\r?\n/).filter(Boolean)) {
    const [prova, nome] = r.split(' | ');
    mappa.set(`${prova} | ${nome}`, r);
  }
  return mappa;
}

function confronta(a, b) {
  const A = leggiEsiti(a);
  const B = leggiEsiti(b);
  let uguali = 0;
  const diverse = [];
  for (const [k, r] of A) {
    if (!B.has(k)) diverse.push(`MANCA DOPO  ${r}`);
    else if (B.get(k) !== r) diverse.push(`DIVERSA\n  prima: ${r}\n  dopo:  ${B.get(k)}`);
    else uguali += 1;
  }
  for (const [k, r] of B) if (!A.has(k)) diverse.push(`NUOVA       ${r}`);
  console.log(diverse.join('\n'));
  console.log(`\nuguali ${uguali}, diverse o mancanti/nuove ${diverse.length} (prima ${A.size}, dopo ${B.size})`);
}

(async () => {
  if (process.argv[2] === '--confronta') return confronta(process.argv[3], process.argv[4]);
  const out = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'prova-tutte'));
  const filtri = process.argv.slice(3);
  fs.mkdirSync(path.join(out, 'grezzo'), { recursive: true });
  fs.mkdirSync(path.join(out, 'shots'), { recursive: true });
  const prove = fs.readdirSync(DIR).filter((f) => f.endsWith('.cjs') && !ESCLUSE(f))
    .filter((f) => !filtri.length || filtri.some((x) => f.includes(x))).sort();
  const paralleli = Math.max(1, Number(process.env.PARALLELI || 3));
  const t0 = Date.now();
  const esiti = new Array(prove.length);
  let prossima = 0;
  const lavoratore = async () => {
    while (prossima < prove.length) {
      const i = prossima++;
      esiti[i] = await lancia(prove[i], out);
      console.log(`${esiti[i].prova}: ${esiti[i].righe.length} righe, uscita ${esiti[i].codice}, ${esiti[i].secondi} s`);
    }
  };
  await Promise.all(Array.from({ length: paralleli }, lavoratore));
  const righe = esiti.flatMap((e) => e.righe);
  fs.writeFileSync(path.join(out, 'esiti.txt'), `${righe.join('\n')}\n`);
  const conErrori = righe.filter((r) => !/errori console: 0$/.test(r));
  const script = righe.filter((r) => /ERRORE SCRIPT|\(processo\)/.test(r));
  const goBack = righe.filter((r) => /GO_BACK/.test(r));
  const riepilogo = [
    `prove ${prove.length}, scenari ${righe.length}, ${Math.round((Date.now() - t0) / 60000)} min (PARALLELI=${paralleli})`,
    `con errori in console ${conErrori.length}, con GO_BACK ${goBack.length}, errori dello script o del processo ${script.length}`,
    '', 'Scenari con errori in console:', ...conErrori.map((r) => `  ${r.slice(0, 300)}`),
    '', 'Errori dello script o del processo:', ...script.map((r) => `  ${r.slice(0, 300)}`),
  ].join('\n');
  fs.writeFileSync(path.join(out, 'riepilogo.txt'), `${riepilogo}\n`);
  console.log(`\n${riepilogo.split('\n').slice(0, 2).join('\n')}\nesiti in ${path.join(out, 'esiti.txt')}`);
})();
