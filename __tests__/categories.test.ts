import {
  DEFAULT_CATEGORIES,
  categoryIdFor,
  categoryLabel,
  categoryNameError,
  parseCategories,
  withCategoryFieldName,
} from '../utils/categories';

describe('parseCategories (M01)', () => {
  it('senza lista salvata dà i tipi di pelle di oggi, stessi id', () => {
    expect(parseCategories(null).map((c) => c.id)).toEqual(['visone', 'volpe', 'zibellino', 'cincilla', 'ermellino', 'astrakan', 'altro']);
    expect(parseCategories(undefined)).toEqual([...DEFAULT_CATEGORIES]);
  });
  it('lista vuota o rovinata → predefinite', () => {
    expect(parseCategories('[]')).toEqual([...DEFAULT_CATEGORIES]);
    expect(parseCategories('{non json')).toEqual([...DEFAULT_CATEGORIES]);
    expect(parseCategories('{"id":"x"}')).toEqual([...DEFAULT_CATEGORIES]);
  });
  it('legge la lista salvata e scarta voci senza id o nome e doppioni', () => {
    const raw = JSON.stringify([{ id: 'viti', label: 'Viti' }, { id: '', label: 'X' }, { id: 'y' }, { id: 'viti', label: 'Doppia' }, { id: 'dadi', label: ' Dadi ' }]);
    expect(parseCategories(raw)).toEqual([{ id: 'viti', label: 'Viti' }, { id: 'dadi', label: 'Dadi' }]);
  });
  it('la lista predefinita non si modifica da fuori', () => {
    const list = parseCategories(null);
    list.push({ id: 'z', label: 'Z' });
    expect(DEFAULT_CATEGORIES).toHaveLength(7);
  });
});

describe('categoryIdFor', () => {
  it('toglie accenti e simboli', () => {
    expect(categoryIdFor('Cincillà', [])).toBe('cincilla');
    expect(categoryIdFor('Viti & Bulloni M6', [])).toBe('viti_bulloni_m6');
  });
  it('non riusa un id che c\'è già', () => {
    expect(categoryIdFor('Volpe', DEFAULT_CATEGORIES)).toBe('volpe_2');
    expect(categoryIdFor('Volpe', [...DEFAULT_CATEGORIES, { id: 'volpe_2' }])).toBe('volpe_3');
  });
  it('un nome senza lettere né cifre dà comunque un id', () => {
    expect(categoryIdFor('€€', [])).toBe('categoria');
  });
});

describe('categoryNameError', () => {
  it('nome vuoto', () => expect(categoryNameError('  ', DEFAULT_CATEGORIES)).toMatch(/Inserisci/));
  it('nome già usato, maiuscole e accenti indifferenti', () => {
    expect(categoryNameError('cincilla', DEFAULT_CATEGORIES)).toMatch(/Esiste già/);
    expect(categoryNameError(' VOLPE ', DEFAULT_CATEGORIES)).toMatch(/Esiste già/);
  });
  it('rinominare con lo stesso nome (o cambiando solo le maiuscole) va bene', () => {
    expect(categoryNameError('VOLPE', DEFAULT_CATEGORIES, 'volpe')).toBeNull();
    expect(categoryNameError('Viti', DEFAULT_CATEGORIES)).toBeNull();
  });
});

describe('categoryLabel', () => {
  it('nome della categoria, oppure l\'id se non è più in lista', () => {
    expect(categoryLabel(DEFAULT_CATEGORIES, 'cincilla')).toBe('Cincillà');
    expect(categoryLabel(DEFAULT_CATEGORIES, 'elettronica')).toBe('elettronica');
    expect(categoryLabel(DEFAULT_CATEGORIES, undefined)).toBe('');
  });
});

describe('withCategoryFieldName', () => {
  const field = (name: string, extra: object = {}) => ({ id: 'furType', name, isSystem: true, ...extra });
  it('il vecchio nome predefinito si legge come «Categoria»', () => {
    expect(withCategoryFieldName([field('Tipo Pelle')])[0].name).toBe('Categoria');
  });
  it('un nome scelto dall\'utente o un altro campo restano com\'erano', () => {
    expect(withCategoryFieldName([field('Materiale')])[0].name).toBe('Materiale');
    expect(withCategoryFieldName([{ id: 'field_1', name: 'Tipo Pelle', isSystem: false }])[0].name).toBe('Tipo Pelle');
  });
});
