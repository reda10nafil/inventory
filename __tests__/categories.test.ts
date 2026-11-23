import {
  CATEGORY_SEPARATOR,
  categoryAncestors,
  categoryDeleteError,
  categoryName,
  categoryNameError,
  categoryPath,
  categoryPicker,
  categoryTree,
  categoryWithDescendants,
  childrenOf,
  kindLine,
  parentIdOf,
  parentOptions,
  productKind,
  rootCategories,
} from '../utils/categories';

// Le cartelle del campionario (senza `parentId`, come i dati di prima di C1) più due sottocategorie
const OGGI = [
  { id: 'pellicce', name: 'Pellicce' },
  { id: 'collezione-inverno', name: 'Collezione Inverno' },
  { id: 'usato-e-permute', name: 'Usato e permute' },
];
const CON_SOTTO = [
  ...OGGI,
  { id: 'pellicce-visone', name: 'Visone', parentId: 'pellicce' },
  { id: 'pellicce-volpe', name: 'Volpe', parentId: 'pellicce' },
  { id: 'usato-visone', name: 'Visone', parentId: 'usato-e-permute' },
];
const ids = (list: { id: string }[]) => list.map((c) => c.id);

describe('albero delle categorie (C1)', () => {
  it('le cartelle di oggi sono tutte categorie principali, nell\'ordine salvato', () => {
    expect(ids(rootCategories(OGGI))).toEqual(['pellicce', 'collezione-inverno', 'usato-e-permute']);
    expect(categoryTree(OGGI).map(({ category, depth }) => `${category.id}:${depth}`)).toEqual(['pellicce:0', 'collezione-inverno:0', 'usato-e-permute:0']);
  });

  it('ogni principale seguita dalle sue sottocategorie', () => {
    expect(categoryTree(CON_SOTTO).map(({ category, depth }) => `${category.id}:${depth}`)).toEqual([
      'pellicce:0', 'pellicce-visone:1', 'pellicce-volpe:1', 'collezione-inverno:0', 'usato-e-permute:0', 'usato-visone:1',
    ]);
    expect(ids(childrenOf(CON_SOTTO, 'pellicce'))).toEqual(['pellicce-visone', 'pellicce-volpe']);
    expect(ids(categoryAncestors(CON_SOTTO, 'pellicce-volpe'))).toEqual(['pellicce']);
  });

  it('un genitore che non esiste più: la sottocategoria si legge come principale', () => {
    const list = [...OGGI, { id: 'orfana', name: 'Orfana', parentId: 'sparita' }];
    expect(parentIdOf(list, 'orfana')).toBeUndefined();
    expect(ids(rootCategories(list))).toContain('orfana');
    expect(categoryPath(list, 'orfana')).toBe('Orfana');
    expect(categoryTree(list)).toHaveLength(4);
  });

  it('genitore = se stessa o un giro (dati rovinati): principali, nessun ciclo infinito', () => {
    const list = [
      { id: 'a', name: 'A', parentId: 'b' },
      { id: 'b', name: 'B', parentId: 'a' },
      { id: 'c', name: 'C', parentId: 'a' },
      { id: 'd', name: 'D', parentId: 'd' },
    ];
    expect(parentIdOf(list, 'a')).toBeUndefined();
    expect(parentIdOf(list, 'b')).toBeUndefined();
    expect(parentIdOf(list, 'd')).toBeUndefined();
    expect(parentIdOf(list, 'c')).toBe('a');
    expect(categoryTree(list).map(({ category, depth }) => `${category.id}:${depth}`)).toEqual(['a:0', 'c:1', 'b:0', 'd:0']);
    expect(categoryPath(list, 'c')).toBe('A › C');
  });

  it('regge anche più livelli (le schermate ne creano uno solo)', () => {
    const list = [...CON_SOTTO, { id: 'visone-lungo', name: 'Lungo', parentId: 'pellicce-visone' }];
    expect(categoryPath(list, 'visone-lungo')).toBe('Pellicce › Visone › Lungo');
    expect([...categoryWithDescendants(list, 'pellicce')].sort()).toEqual(['pellicce', 'pellicce-visone', 'pellicce-volpe', 'visone-lungo']);
  });
});

describe('nome completo «Categoria › Sottocategoria»', () => {
  it('principale, sottocategoria, nessuna, id sconosciuto', () => {
    expect(CATEGORY_SEPARATOR).toBe(' › ');
    expect(categoryPath(CON_SOTTO, 'pellicce')).toBe('Pellicce');
    expect(categoryPath(CON_SOTTO, 'pellicce-visone')).toBe('Pellicce › Visone');
    expect(categoryPath(CON_SOTTO, undefined)).toBe('');
    expect(categoryPath(CON_SOTTO, 'giacche')).toBe('giacche');
    expect(categoryName(CON_SOTTO, 'usato-visone')).toBe('Visone');
    expect(categoryName(CON_SOTTO, 'giacche')).toBe('giacche');
  });
});

describe('filtro per categoria', () => {
  it('una principale include le sue sottocategorie, una sottocategoria solo sé', () => {
    expect([...categoryWithDescendants(CON_SOTTO, 'pellicce')].sort()).toEqual(['pellicce', 'pellicce-visone', 'pellicce-volpe']);
    expect([...categoryWithDescendants(CON_SOTTO, 'pellicce-volpe')]).toEqual(['pellicce-volpe']);
    expect([...categoryWithDescendants(CON_SOTTO, 'sparita')]).toEqual(['sparita']);
  });
});

describe('pillole a due righe', () => {
  it('nessuna scelta, principale, sottocategoria, id sconosciuto', () => {
    expect(categoryPicker(CON_SOTTO, undefined)).toEqual({ children: [] });
    expect(categoryPicker(CON_SOTTO, 'giacche')).toEqual({ children: [] });
    const p = categoryPicker(CON_SOTTO, 'pellicce');
    expect([p.rootId, p.childId, ids(p.children)]).toEqual(['pellicce', undefined, ['pellicce-visone', 'pellicce-volpe']]);
    const s = categoryPicker(CON_SOTTO, 'usato-visone');
    expect([s.rootId, s.childId, ids(s.children)]).toEqual(['usato-e-permute', 'usato-visone', ['usato-visone']]);
    expect(categoryPicker(CON_SOTTO, 'collezione-inverno').children).toEqual([]);
  });
});

describe('genitori possibili (un livello)', () => {
  it('le principali tranne la categoria stessa; una categoria con sottocategorie resta principale', () => {
    expect(ids(parentOptions(CON_SOTTO))).toEqual(['pellicce', 'collezione-inverno', 'usato-e-permute']);
    expect(ids(parentOptions(CON_SOTTO, 'collezione-inverno'))).toEqual(['pellicce', 'usato-e-permute']);
    expect(ids(parentOptions(CON_SOTTO, 'pellicce-volpe'))).toEqual(['pellicce', 'collezione-inverno', 'usato-e-permute']);
    expect(parentOptions(CON_SOTTO, 'pellicce')).toEqual([]);
  });
});

describe('categoryNameError', () => {
  it('nome vuoto', () => expect(categoryNameError(CON_SOTTO, '  ', undefined)).toMatch(/Inserisci/));
  it('doppione allo stesso livello, maiuscole e accenti indifferenti', () => {
    expect(categoryNameError(CON_SOTTO, ' pellicce ', undefined)).toBe('Esiste già la categoria "Pellicce"');
    expect(categoryNameError(CON_SOTTO, 'VOLPE', 'pellicce')).toBe('"Pellicce" ha già la sottocategoria "Volpe"');
  });
  it('lo stesso nome sotto un altro genitore o tra le principali va bene; rinominare se stessa anche', () => {
    expect(categoryNameError(CON_SOTTO, 'Volpe', 'usato-e-permute')).toBeNull();
    expect(categoryNameError(CON_SOTTO, 'Visone', undefined)).toBeNull();
    expect(categoryNameError(CON_SOTTO, 'PELLICCE', undefined, 'pellicce')).toBeNull();
  });
  it('un genitore che non esiste conta come «principale»', () => {
    expect(categoryNameError(CON_SOTTO, 'Pellicce', 'sparita')).toMatch(/Esiste già/);
  });
});

describe('categoryDeleteError', () => {
  const products = [
    { libraryId: 'pellicce-visone' },
    { libraryId: 'collezione-inverno', deletedAt: '2026-11-22' },
  ];
  it('con sottocategorie non si elimina', () => {
    expect(categoryDeleteError(CON_SOTTO, [], 'pellicce')).toBe('La categoria "Pellicce" ha 2 sottocategorie: spostale o eliminale prima.');
    expect(categoryDeleteError(CON_SOTTO, [], 'usato-e-permute')).toMatch(/1 sottocategoria:/);
  });
  it('con prodotti non nel cestino non si elimina', () => {
    expect(categoryDeleteError(CON_SOTTO, products, 'pellicce-visone')).toBe('La categoria "Visone" contiene 1 prodotto. Spostarli prima di eliminare.');
  });
  it('vuota, o solo con prodotti nel cestino: si elimina', () => {
    expect(categoryDeleteError(CON_SOTTO, products, 'pellicce-volpe')).toBeNull();
    expect(categoryDeleteError(CON_SOTTO, products, 'collezione-inverno')).toBeNull();
  });
});

describe('riga corta e nomi del prodotto', () => {
  const label = (id: string) => ({ visone: 'Visone', volpe: 'Volpe' } as Record<string, string>)[id] ?? id;
  it('kindLine: quello che manca si salta, due nomi uguali una volta', () => {
    expect(kindLine('Collezione Inverno', 'Visone')).toBe('Collezione Inverno · Visone');
    expect(kindLine('', 'Visone')).toBe('Visone');
    expect(kindLine('Borse', '')).toBe('Borse');
    expect(kindLine('', '')).toBe('');
    expect(kindLine('Visone', 'visone')).toBe('Visone');
  });
  it('productKind: prodotto di oggi (cartella e tipo di pelle) e prodotto senza tipo di pelle', () => {
    expect(productKind({ libraryId: 'collezione-inverno', furType: 'visone' }, CON_SOTTO, label)).toEqual({
      path: 'Collezione Inverno', name: 'Collezione Inverno', furType: 'Visone', line: 'Collezione Inverno · Visone', full: 'Collezione Inverno · Visone',
    });
    expect(productKind({ libraryId: 'pellicce-volpe', furType: '' }, CON_SOTTO, label)).toEqual({
      path: 'Pellicce › Volpe', name: 'Volpe', furType: '', line: 'Volpe', full: 'Pellicce › Volpe',
    });
    expect(productKind({ furType: 'volpe' }, CON_SOTTO, label).line).toBe('Volpe');
  });
});

describe('categoryDeleteError con gli scaffali (S1a)', () => {
  it('una categoria usata da uno scaffale non si elimina', () => {
    expect(categoryDeleteError(CON_SOTTO, [], 'pellicce-volpe', [{ libraryId: 'pellicce-volpe' }])).toBe('La categoria "Volpe" è usata da 1 scaffale: cambia la sua categoria o eliminalo prima, da Impostazioni › Scaffali.');
    expect(categoryDeleteError(CON_SOTTO, [], 'pellicce-volpe', [{ libraryId: 'pellicce-volpe' }, { libraryId: 'pellicce-volpe' }, {}])).toMatch(/2 scaffali: cambia la loro categoria o eliminali prima/);
    expect(categoryDeleteError(CON_SOTTO, [], 'pellicce-volpe', [{ libraryId: 'altro' }, {}])).toBeNull();
  });
});
