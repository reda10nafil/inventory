// Server minimo, solo per sviluppo: espone seed.json a http://localhost:8765 con CORS per la pagina su 8081.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url !== '/seed.json') { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(await readFile(join(here, 'seed.json')));
}).listen(8765, '127.0.0.1', () => console.log('seed su http://localhost:8765/seed.json'));
