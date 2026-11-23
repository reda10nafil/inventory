// COD (ticket 22): lettore unico dei codici e codici già usati (`utils/codes.ts`).
import {
  codeCheck, codeChoiceLabel, codeError, codeIsText, codeName, codeOwner, gs1ElementParts, gs1LinkParts, placeRead,
  productRead, resolveCode, shelfAsLocationText, type CodeSources,
} from '../utils/codes';

const LINK = 'https://syncroflow.app/id/01/VIS-0142/21/000142';
const products = [
  { id: 'cmp-1', sku: 'VIS-0142', location: 'vetrina', gs1DigitalLink: LINK },
  { id: 'cmp-5', sku: 'VIS-0098', location: 'magazzino' },
  { id: 'cmp-6', sku: 'PUZ-0012', location: 'stand_c', deletedAt: '2026-11-22T10:00:00Z' },
  { id: 'cmp-9', sku: '8001234567897', location: 'magazzino' },
];
const locations = [
  { id: 'magazzino', label: 'Magazzino', barcode: 'LOC-MAGAZZINO' },
  { id: 'vetrina', label: 'Vetrina' },
  { id: 'stand_a', label: 'Stand A', nfcTag: '04:11:22:33' },
];
const categories = [
  { id: 'pellicce', name: 'Pellicce', barcode: 'LIB-PELLICCE' },
  { id: 'visone', name: 'Visone', parentId: 'pellicce' },
];
const shelves = [{ id: '1732300000000-gen1', name: 'A1', locationId: 'magazzino', barcode: 'SCAF-MAG-A1', nfcTag: '04:A2:3B:1C' }];
const automations = [{ id: 'auto_tag', name: 'Tag veloce', qrValue: 'AUTO:auto_tag' }];
const sources: CodeSources = { products, locations, categories, shelves, automations };
const found = (kind: string, id: string) => ({ status: 'found', kind, id });

describe('resolveCode: prodotti', () => {
  it('link salvato identico, con un altro dominio, con il lotto in ?10= o nel percorso (NG01, AU-V07)', () => {
    expect(resolveCode(LINK, sources)).toEqual(found('product', 'cmp-1'));
    expect(resolveCode(` ${LINK} `, sources)).toEqual(found('product', 'cmp-1'));
    expect(resolveCode('https://esempio.it/negozio/01/VIS-0142/21/000142', sources)).toEqual(found('product', 'cmp-1'));
    expect(resolveCode(`${LINK}?10=Pellicceria%20Bianchi%2C%20Milano`, sources)).toEqual(found('product', 'cmp-1'));
    expect(resolveCode('https://syncroflow.app/id/01/VIS-0142/10/L1/21/000142', sources)).toEqual(found('product', 'cmp-1'));
    expect(resolveCode('HTTPS://SYNCROFLOW.APP/id/01/vis-0142/21/000142', sources)).toEqual(found('product', 'cmp-1'));
  });

  it('link di un prodotto senza link salvato: vale lo SKU nel posto del GTIN', () => {
    expect(resolveCode('https://syncroflow.app/id/01/VIS-0098/21/XYZ', sources)).toEqual(found('product', 'cmp-5'));
    expect(resolveCode('https://syncroflow.app/id/01/NON-ESISTE/21/XYZ', sources)).toEqual({ status: 'unknown' });
  });

  it('SKU e id senza maiuscole; GTIN con o senza gli zeri davanti', () => {
    expect(resolveCode('vis-0142', sources)).toEqual(found('product', 'cmp-1'));
    expect(resolveCode('Vis-0098', sources)).toEqual(found('product', 'cmp-5'));
    expect(resolveCode('cmp-5', sources)).toEqual(found('product', 'cmp-5'));
    expect(resolveCode('CMP-5', sources)).toEqual(found('product', 'cmp-5'));
    expect(resolveCode('08001234567897', sources)).toEqual(found('product', 'cmp-9'));
    expect(resolveCode('https://x.it/01/08001234567897', sources)).toEqual(found('product', 'cmp-9'));
  });

  it('stringhe GS1 di GS1-128, DataMatrix e QR GS1', () => {
    expect(resolveCode('(01)08001234567897(21)A1', sources)).toEqual(found('product', 'cmp-9'));
    expect(resolveCode(']C10108001234567897', sources)).toEqual(found('product', 'cmp-9'));
    expect(resolveCode(']d201080012345678972100014\u001d10LOTTO', sources)).toEqual(found('product', 'cmp-9'));
    expect(resolveCode('0108001234567897\u001d21A1', sources)).toEqual(found('product', 'cmp-9'));
  });

  it('seriale doppio (NG03): GTIN e seriale insieme; il seriale da solo con due prodotti → ambiguo, mai il primo', () => {
    const doppi = [
      { id: 'a', sku: 'PUZ-0012', gs1DigitalLink: 'https://syncroflow.app/id/01/PUZ-0012/21/000007' },
      { id: 'b', sku: 'LOG-2026-001', gs1DigitalLink: 'https://syncroflow.app/id/01/LOG-2026-001/21/000007' },
    ];
    expect(resolveCode('https://altro.it/01/PUZ-0012/21/000007', { products: doppi })).toEqual(found('product', 'a'));
    expect(resolveCode('https://altro.it/01/LOG-2026-001/21/000007', { products: doppi })).toEqual(found('product', 'b'));
    expect(resolveCode('https://altro.it/01/VECCHIO/21/000007', { products: doppi })).toEqual({
      status: 'ambiguous', candidates: [{ kind: 'product', id: 'a' }, { kind: 'product', id: 'b' }],
    });
    // il seriale di un prodotto solo basta (SKU cambiato dopo la stampa)
    expect(resolveCode('https://altro.it/01/VECCHIO/21/000142', sources)).toEqual(found('product', 'cmp-1'));
  });

  it('stesso SKU con maiuscole diverse: quello scritto uguale, altrimenti ambiguo', () => {
    const due = [{ id: 'x', sku: 'ABC-1' }, { id: 'y', sku: 'abc-1' }];
    expect(resolveCode('ABC-1', { products: due })).toEqual(found('product', 'x'));
    expect(resolveCode('abc-1', { products: due })).toEqual(found('product', 'y'));
    expect(resolveCode('Abc-1', { products: due })).toEqual({ status: 'ambiguous', candidates: [{ kind: 'product', id: 'x' }, { kind: 'product', id: 'y' }] });
  });

  it('cestino: rifiutato; se c\'è anche un prodotto attivo con lo stesso codice vale quello', () => {
    expect(resolveCode('PUZ-0012', sources)).toEqual({ status: 'trashed', kind: 'product', id: 'cmp-6' });
    const conNuovo = [...products, { id: 'cmp-7', sku: 'puz-0012' }];
    expect(resolveCode('PUZ-0012', { products: conNuovo })).toEqual(found('product', 'cmp-7'));
  });

  it('una cosa trovata più volte (per id, SKU e link) non è ambigua', () => {
    const uno = [{ id: 'VIS-0142', sku: 'VIS-0142', gs1DigitalLink: LINK }];
    expect(resolveCode('VIS-0142', { products: uno })).toEqual(found('product', 'VIS-0142'));
  });

  it('i prodotti vengono prima dei posti (come nello Scanner di prima)', () => {
    const conDoppio = { ...sources, locations: [...locations, { id: 'deposito', label: 'Deposito', barcode: 'VIS-0098' }] };
    expect(resolveCode('VIS-0098', conDoppio)).toEqual(found('product', 'cmp-5'));
  });
});

describe('resolveCode: posizioni, scaffali, categorie, automazioni', () => {
  it('codice, id e nome di una posizione; codice e id di scaffali e categorie, senza maiuscole', () => {
    expect(resolveCode('loc-magazzino', sources)).toEqual(found('location', 'magazzino'));
    expect(resolveCode('stand_a', sources)).toEqual(found('location', 'stand_a'));
    expect(resolveCode('Vetrina', sources)).toEqual(found('location', 'vetrina'));
    expect(resolveCode('scaf-mag-a1', sources)).toEqual(found('shelf', '1732300000000-gen1'));
    expect(resolveCode('1732300000000-gen1', sources)).toEqual(found('shelf', '1732300000000-gen1'));
    expect(resolveCode('LIB-PELLICCE', sources)).toEqual(found('category', 'pellicce'));
    expect(resolveCode('visone', sources)).toEqual(found('category', 'visone'));
  });

  it('tag NFC: il testo o l\'UID, con o senza separatori', () => {
    expect(resolveCode('04A23B1C', sources)).toEqual(found('shelf', '1732300000000-gen1'));
    expect(resolveCode('04-a2-3b-1c', sources)).toEqual(found('shelf', '1732300000000-gen1'));
    expect(resolveCode('04 11 22 33', sources)).toEqual(found('location', 'stand_a'));
  });

  it('due posti con lo stesso codice (come dopo NG24): ambiguo con tutti e due, mai il primo', () => {
    const doppi = [...locations, { id: 'banco_uno', label: 'Banco Uno', barcode: 'LOC-DOPPIO' }, { id: 'banco_due', label: 'Banco Due', barcode: 'loc-doppio' }];
    expect(resolveCode('LOC-DOPPIO', { ...sources, locations: doppi })).toEqual({
      status: 'ambiguous', candidates: [{ kind: 'location', id: 'banco_uno' }, { kind: 'location', id: 'banco_due' }],
    });
    const conScaffale = { ...sources, categories: [...categories, { id: 'scaf', name: 'Scaf', barcode: 'SCAF-MAG-A1' }] };
    expect(resolveCode('SCAF-MAG-A1', conScaffale)).toEqual({
      status: 'ambiguous', candidates: [{ kind: 'shelf', id: '1732300000000-gen1' }, { kind: 'category', id: 'scaf' }],
    });
  });

  it('AUTO: e indirizzi syncroflow://', () => {
    expect(resolveCode('AUTO:auto_tag', sources)).toEqual(found('automation', 'auto_tag'));
    expect(resolveCode('auto:auto_tag', sources)).toEqual(found('automation', 'auto_tag'));
    expect(resolveCode('AUTO:sparita', sources)).toEqual({ status: 'unknown' });
    expect(resolveCode('syncroflow://product/cmp-1', sources)).toEqual(found('product', 'cmp-1'));
    expect(resolveCode('syncroflow://product/cmp-6', sources)).toEqual({ status: 'trashed', kind: 'product', id: 'cmp-6' });
    expect(resolveCode('syncroflow://automations/custom-runner/auto_tag', sources)).toEqual(found('automation', 'auto_tag'));
    expect(resolveCode('syncroflow://product/nessuno', sources)).toEqual({ status: 'unknown' });
  });

  it('non lancia mai errori e dice «sconosciuto»', () => {
    expect(resolveCode('', sources)).toEqual({ status: 'unknown' });
    expect(resolveCode('   ', sources)).toEqual({ status: 'unknown' });
    expect(resolveCode(undefined as unknown as string, sources)).toEqual({ status: 'unknown' });
    expect(resolveCode('https://x.it/01/%E0%A4%A/21/%', sources)).toEqual({ status: 'unknown' });
    expect(resolveCode('syncroflow://product/%E0%A4%A', sources)).toEqual({ status: 'unknown' });
    expect(resolveCode('XYZ-9999', {})).toEqual({ status: 'unknown' });
    expect(resolveCode('XYZ-9999', sources)).toEqual({ status: 'unknown' });
  });
});

describe('parti GS1', () => {
  it('gs1ElementParts: solo con parentesi, simbologia o FNC1 (uno SKU che comincia con 01 non lo è)', () => {
    expect(gs1ElementParts('(01)08001234567897(10)L 1(21)S1')).toEqual({ gtin: '08001234567897', lot: 'L 1', serial: 'S1' });
    expect(gs1ElementParts(']C10108001234567897172612311OL1')).toEqual({ gtin: '08001234567897' });
    expect(gs1ElementParts('0108001234567897')).toBeNull();
    expect(gs1ElementParts('VIS-0142')).toBeNull();
  });
  it('gs1LinkParts: null per un testo che non è un link con /01/', () => {
    expect(gs1LinkParts('syncroflow://product/cmp-1')).toBeNull();
    expect(gs1LinkParts('https://x.it/01')).toBeNull();
  });
});

describe('productRead e placeRead (che cosa vuole il passo)', () => {
  it('prodotto, cestino, scelta, altro', () => {
    expect(productRead(resolveCode('vis-0142', sources))).toEqual({ status: 'product', id: 'cmp-1' });
    expect(productRead(resolveCode('PUZ-0012', sources))).toEqual({ status: 'trashed', id: 'cmp-6' });
    expect(productRead(resolveCode('LOC-MAGAZZINO', sources))).toEqual({ status: 'other', ref: { kind: 'location', id: 'magazzino' } });
    expect(productRead(resolveCode('nulla', sources))).toEqual({ status: 'unknown' });
  });
  it('uno scaffale vale la sua posizione (AU-V14); una categoria non è una posizione', () => {
    expect(placeRead(resolveCode('SCAF-MAG-A1', sources), sources)).toEqual({ status: 'location', id: 'magazzino', shelfId: '1732300000000-gen1' });
    expect(placeRead(resolveCode('vetrina', sources), sources)).toEqual({ status: 'location', id: 'vetrina' });
    expect(placeRead(resolveCode('LIB-PELLICCE', sources), sources)).toEqual({ status: 'other', ref: { kind: 'category', id: 'pellicce' } });
    expect(placeRead(resolveCode('VIS-0142', sources), sources)).toEqual({ status: 'other', ref: { kind: 'product', id: 'cmp-1' } });
    const doppio = { ...sources, categories: [...categories, { id: 'x', name: 'X', barcode: 'LOC-MAGAZZINO' }] };
    expect(placeRead(resolveCode('LOC-MAGAZZINO', doppio), doppio)).toEqual({ status: 'location', id: 'magazzino' });
  });
});

describe('testi', () => {
  it('nomi, voci della scelta e messaggi', () => {
    expect(codeName({ kind: 'shelf', id: '1732300000000-gen1' }, sources)).toBe('Magazzino › A1');
    expect(codeName({ kind: 'category', id: 'visone' }, sources)).toBe('Pellicce › Visone');
    expect(codeChoiceLabel({ kind: 'product', id: 'cmp-1' }, sources)).toBe('Prodotto VIS-0142 (Vetrina)');
    expect(codeChoiceLabel({ kind: 'location', id: 'magazzino' }, sources)).toBe('Posizione Magazzino');
    expect(codeIsText('LOC-MAGAZZINO', { kind: 'location', id: 'magazzino' }, sources)).toBe('"LOC-MAGAZZINO" è la posizione "Magazzino".');
    expect(shelfAsLocationText(shelves[0], sources)).toBe('A1 è uno scaffale di Magazzino: si usa la posizione Magazzino (lo scaffale non si registra nel prodotto).');
  });
});

describe('codici già usati (NG25)', () => {
  it('codeOwner guarda prodotti, posizioni (anche il nome), categorie, scaffali e tag (anche l\'UID)', () => {
    expect(codeOwner('vis-0142', sources)).toBe('dal prodotto VIS-0142');
    expect(codeOwner('LOC-MAGAZZINO', sources)).toBe('dalla posizione "Magazzino"');
    expect(codeOwner('stand a', sources)).toBe('dalla posizione "Stand A"');
    expect(codeOwner('LIB-PELLICCE', sources)).toBe('dalla categoria "Pellicce"');
    expect(codeOwner('04A23B1C', sources)).toBe('dallo scaffale "Magazzino › A1"');
    expect(codeOwner('041122 33', sources)).toBe('dalla posizione "Stand A"');
    expect(codeOwner('LOC-NUOVO', sources)).toBeNull();
    expect(codeOwner('  ', sources)).toBeNull();
  });
  it('la cosa che si modifica può tenere il suo codice, per ogni tipo', () => {
    expect(codeOwner('LOC-MAGAZZINO', sources, { kind: 'location', id: 'magazzino' })).toBeNull();
    expect(codeOwner('LIB-PELLICCE', sources, { kind: 'category', id: 'pellicce' })).toBeNull();
    expect(codeOwner('SCAF-MAG-A1', sources, { kind: 'shelf', id: '1732300000000-gen1' })).toBeNull();
    expect(codeOwner('VIS-0142', sources, { kind: 'product', id: 'cmp-1' })).toBeNull();
    // stesso id in due tipi diversi: si esclude solo il tipo giusto
    expect(codeOwner('LOC-MAGAZZINO', sources, { kind: 'category', id: 'magazzino' })).toBe('dalla posizione "Magazzino"');
  });
  it('codeError e codeCheck: blocca solo un codice cambiato in questo salvataggio; un doppione di prima si segnala', () => {
    expect(codeError('SCAF-MAG-A1', sources)).toBe('Il codice "SCAF-MAG-A1" è già usato dallo scaffale "Magazzino › A1".');
    const doppi = { ...sources, locations: [...locations, { id: 'banco_uno', label: 'Banco Uno', barcode: 'LOC-DOPPIO' }, { id: 'banco_due', label: 'Banco Due', barcode: 'LOC-DOPPIO' }] };
    const self = { kind: 'location' as const, id: 'banco_uno' };
    expect(codeCheck('LOC-DOPPIO', 'LOC-DOPPIO', doppi, self)).toEqual({
      error: null,
      warning: 'Il codice "LOC-DOPPIO" è usato anche dalla posizione "Banco Due": lo Scanner chiederà quale aprire. Cambialo in uno dei due per non confonderli.',
    });
    expect(codeCheck('loc-doppio ', 'LOC-DOPPIO', doppi, self).error).toBeNull();
    expect(codeCheck('LOC-DOPPIO', 'LOC-UNO', doppi, self)).toEqual({ error: 'Il codice "LOC-DOPPIO" è già usato dalla posizione "Banco Due".', warning: null });
    expect(codeCheck('LOC-DOPPIO', undefined, doppi)).toEqual({ error: 'Il codice "LOC-DOPPIO" è già usato dalla posizione "Banco Uno".', warning: null });
    expect(codeCheck('LOC-LIBERO', 'LOC-DOPPIO', doppi, self)).toEqual({ error: null, warning: null });
    expect(codeCheck('', 'LOC-DOPPIO', doppi, self)).toEqual({ error: null, warning: null });
  });
});
