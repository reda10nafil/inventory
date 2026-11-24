// ETI (ticket 22): codice che nasce da solo per posizioni e categorie (`suggestCode`, stessa regola di
// `suggestShelfCode`), mai uno già usato: `codeCheck` non lo rifiuta.
import { codeCheck, codeTaken, suggestCode, type CodeSources } from '../utils/codes';

const sources: CodeSources = {
  products: [{ id: 'cmp-1', sku: 'VIS-0142' }],
  locations: [{ id: 'magazzino', label: 'Magazzino', barcode: 'LOC-MAGAZZINO' }, { id: 'vetrina', label: 'Vetrina' }],
  categories: [{ id: 'pellicce', name: 'Pellicce', barcode: 'LIB-PELLICCE' }, { id: 'visone', name: 'Visone', parentId: 'pellicce' }],
  shelves: [{ id: 's1', name: 'A1', locationId: 'magazzino', barcode: 'LOC-DEPOSITO' }],
};

describe('suggestCode', () => {
  it('prefisso e nome senza accenti, in maiuscolo coi trattini; per una sottocategoria tutto il percorso', () => {
    const free = () => false;
    expect(suggestCode('LOC', ['Deposito Nord'], free)).toBe('LOC-DEPOSITO-NORD');
    expect(suggestCode('LOC', ['  Città / Più giù  '], free)).toBe('LOC-CITTA-PIU-GIU');
    expect(suggestCode('LIB', ['Pellicce', 'Visone'], free)).toBe('LIB-PELLICCE-VISONE');
  });

  it('un nome senza lettere latine né cifre dà il prefisso numerato, mai vuoto (rilievo del revisore)', () => {
    expect(suggestCode('LIB', ['', '  '], () => false)).toBe('LIB-1');
    expect(suggestCode('LOC', ['★★'], (c) => c === 'LOC-1')).toBe('LOC-2');
  });

  it('mai un codice già usato: -2, -3… (anche se lo usa una cosa di un altro tipo)', () => {
    expect(suggestCode('LOC', ['Magazzino'], codeTaken(sources))).toBe('LOC-MAGAZZINO-2');
    expect(suggestCode('LOC', ['Deposito'], codeTaken(sources))).toBe('LOC-DEPOSITO-2'); // usato da uno scaffale
    const taken = new Set(['LIB-BORSE', 'LIB-BORSE-2']);
    expect(suggestCode('LIB', ['Borse'], (c) => taken.has(c))).toBe('LIB-BORSE-3');
  });

  it('la cosa stessa non conta: rigenerare il codice di Magazzino dà il suo', () => {
    expect(suggestCode('LOC', ['Magazzino'], codeTaken(sources, { kind: 'location', id: 'magazzino' }))).toBe('LOC-MAGAZZINO');
  });

  it('il codice proposto passa il controllo del salvataggio (nessun rifiuto, nessun avviso)', () => {
    for (const [prefix, names] of [['LOC', ['Magazzino']], ['LOC', ['Vetrina']], ['LIB', ['Pellicce']], ['LIB', ['Pellicce', 'Visone']]] as const) {
      const code = suggestCode(prefix, names, codeTaken(sources));
      expect(codeCheck(code, undefined, sources)).toEqual({ error: null, warning: null });
    }
  });
});
