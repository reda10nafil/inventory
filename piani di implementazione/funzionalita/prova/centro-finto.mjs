// Centro finto della «Rete del negozio» (RETE0, ticket 32): SOLO PER LE PROVE, non fa parte dell'app.
// Un server WebSocket minimo in Node (solo `http` e `crypto`, nessun pacchetto) che parla come il centro del telefono
// (`src/services/meshServer.ts`): indirizzo `ws://127.0.0.1:<porta>?token=<codice>`, `hello` → `hello_ack` col nome del
// centro, `ping` → `pong`, elenco dei telefoni (`presence`), messaggi della Chat (`chat`). Lo avvia e lo spegne la prova
// stessa, su una porta libera di questo computer (127.0.0.1: niente rete, niente internet).
//
// Uso dalla prova:  const { avviaCentro } = await import('./centro-finto.mjs');
//                   const c = await avviaCentro({ nome: 'Magazzino', altri: [...] });  c.codice, c.invia(...), c.spegni()
// A mano:           node centro-finto.mjs   (scrive il codice da incollare in «Scrivi il codice», Ctrl+C per fermarlo)
import http from 'node:http';
import crypto from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function cornice(testo, opcode = 1) {
  const dati = Buffer.from(testo);
  const n = dati.length;
  const testa = n < 126 ? Buffer.from([0x80 | opcode, n])
    : n < 65536 ? Buffer.from([0x80 | opcode, 126, n >> 8, n & 255])
      : Buffer.concat([Buffer.from([0x80 | opcode, 127]), (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; })()]);
  return Buffer.concat([testa, dati]);
}

// Cornici del browser (mascherate). Restituisce i messaggi completi e il resto del buffer.
function leggiCornici(buf) {
  const out = [];
  let i = 0;
  while (buf.length - i >= 2) {
    const op = buf[i] & 0x0f;
    const mascherata = (buf[i + 1] & 0x80) !== 0;
    let n = buf[i + 1] & 0x7f;
    let p = i + 2;
    if (n === 126) { if (buf.length - p < 2) break; n = buf.readUInt16BE(p); p += 2; }
    else if (n === 127) { if (buf.length - p < 8) break; n = Number(buf.readBigUInt64BE(p)); p += 8; }
    const chiave = mascherata ? buf.subarray(p, p + 4) : null;
    if (mascherata) p += 4;
    if (buf.length - p < n) break;
    const dati = Buffer.from(buf.subarray(p, p + n));
    if (chiave) for (let k = 0; k < dati.length; k += 1) dati[k] ^= chiave[k % 4];
    out.push({ op, testo: dati.toString('utf8') });
    i = p + n;
  }
  return { messaggi: out, resto: buf.subarray(i) };
}

/**
 * @param {{ porta?: number, token?: string, nome?: string, altri?: Array<{ id: string, name: string, since: number, lastSeen: number, online: boolean }> }} o
 */
export async function avviaCentro(o = {}) {
  const token = o.token || crypto.randomBytes(8).toString('hex').toUpperCase();
  const nome = o.nome ?? 'Magazzino';
  const altri = o.altri ?? [];
  const avviatoAlle = Date.now();
  const stato = { muto: false, richieste: [], ricevuti: [], rifiutati: 0 };
  /** @type {Map<import('node:net').Socket, { id: string, name: string, since: number, lastSeen: number, autenticato: boolean }>} */
  const telefoni = new Map();
  let server = null;
  let porta = o.porta ?? 0;

  const scrivi = (s, obj) => { try { s.write(cornice(JSON.stringify(obj))); } catch { /* chiuso */ } };
  const presenza = () => ({
    type: 'presence',
    ts: Date.now(),
    center: { name: nome, since: avviatoAlle },
    phones: [
      ...[...telefoni.values()].filter((t) => t.autenticato).map(({ id, name, since, lastSeen }) => ({ id, name, since, lastSeen, online: true })),
      ...altri,
    ],
  });
  const aTutti = (obj) => { for (const [s, t] of telefoni) if (t.autenticato) scrivi(s, obj); };

  const crea = () => http.createServer((req, res) => {
    // Richieste normali (per esempio `/pull` della «sincronizzazione» di prima): si registrano e basta
    stato.richieste.push(`${req.method} ${req.url.replace(/token=[^&]+/, 'token=…')}`);
    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end('{"error":"centro finto"}');
  });

  const avvia = () => new Promise((resolve, reject) => {
    server = crea();
    server.on('upgrade', (req, socket) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.searchParams.get('token') !== token) {
        stato.rifiutati += 1;
        socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
        return;
      }
      const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + GUID).digest('base64');
      socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
      const t = { id: '', name: '', since: 0, lastSeen: 0, autenticato: false };
      telefoni.set(socket, t);
      let buf = Buffer.alloc(0);
      socket.on('data', (d) => {
        const { messaggi, resto } = leggiCornici(Buffer.concat([buf, d]));
        buf = Buffer.from(resto);
        for (const { op, testo } of messaggi) {
          if (op === 8) { socket.end(cornice('', 8)); return; }
          if (op === 9) { if (!stato.muto) socket.write(cornice(testo, 10)); continue; }
          if (op !== 1) continue;
          let m;
          try { m = JSON.parse(testo); } catch { continue; }
          stato.ricevuti.push(m.type);
          if (stato.muto) continue; // centro «acceso ma muto»: legge e non risponde
          if (m.type === 'hello') {
            if (m.token !== token) { scrivi(socket, { type: 'error', error: 'unauthorized' }); socket.end(); return; }
            Object.assign(t, {
              autenticato: true,
              id: String(m.phone?.id || `anonimo-${telefoni.size}`),
              name: String(m.phone?.name || ''),
              since: Date.now(),
              lastSeen: Date.now(),
            });
            scrivi(socket, { type: 'hello_ack', token, center: { name: nome }, ts: Date.now() });
            aTutti(presenza());
            continue;
          }
          if (!t.autenticato) { socket.end(); return; }
          t.lastSeen = Date.now();
          if (m.type === 'ping') scrivi(socket, { type: 'pong', ts: Date.now() });
        }
      });
      const via = () => { if (telefoni.delete(socket)) aTutti(presenza()); };
      socket.on('close', via);
      socket.on('error', via);
    });
    server.once('error', reject);
    server.listen(porta, '127.0.0.1', () => { porta = server.address().port; resolve(); });
  });

  await avvia();
  const codice = `ws://127.0.0.1:${porta}?token=${token}&name=${encodeURIComponent(nome)}`;
  return {
    token,
    nome,
    get porta() { return porta; },
    codice,
    stato,
    /** telefoni agganciati adesso (nomi) */
    connessi: () => [...telefoni.values()].filter((t) => t.autenticato).map((t) => t.name || t.id),
    /** un messaggio della Chat come lo manda il centro vero (`broadcastWs` di meshServer) */
    invia: (testo) => aTutti({ type: 'chat', skus: [], automationIds: [], text: testo, ts: Date.now() }),
    presenza: () => aTutti(presenza()),
    muto: (v = true) => { stato.muto = v; },
    /** spegne il centro: chiude i collegamenti e smette di ascoltare */
    spegni: () => new Promise((resolve) => {
      for (const s of telefoni.keys()) { try { s.destroy(); } catch { /* già chiuso */ } }
      telefoni.clear();
      if (!server) return resolve();
      server.close(() => resolve());
      server = null;
    }),
    /** riaccende il centro sulla stessa porta e con lo stesso codice */
    riaccendi: () => avvia(),
  };
}

// A mano: `node centro-finto.mjs` scrive il codice e resta acceso
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('centro-finto.mjs')) {
  const c = await avviaCentro({ nome: process.env.NOME || 'Magazzino' });
  console.log(`centro finto acceso. Codice da scrivere nell'app:\n${c.codice}`);
  setInterval(() => c.invia(`Messaggio di prova delle ${new Date().toLocaleTimeString('it-IT')}`), 30000);
}
