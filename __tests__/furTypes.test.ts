import {
  DEFAULT_FUR_TYPES,
  furTypeFromCsv,
  furTypeIdFor,
  furTypeLabel,
  furTypeNameError,
  parseFurTypes,
  withSystemFieldNames,
} from '../utils/furTypes';

describe('parseFurTypes (M01)', () => {
  it('senza lista salvata dà i tipi di pelle di sempre, stessi id', () => {
    expect(parseFurTypes(null).map((c) => c.id)).toEqual(['visone', 'volpe', 'zibellino', 'cincilla', 'ermellino', 'astrakan', 'altro']);
    expect(parseFurTypes(undefined)).toEqual([...DEFAULT_FUR_TYPES]);
  });
  it('lista vuota o rovinata → predefiniti', () => {
    expect(parseFurTypes('[]')).toEqual([...DEFAULT_FUR_TYPES]);
    expect(parseFurTypes('{non json')).toEqual([...DEFAULT_FUR_TYPES]);
    expect(parseFurTypes('{"id":"x"}')).toEqual([...DEFAULT_FUR_TYPES]);
  });
  it('legge la lista salvata e scarta voci senza id o nome e doppioni', () => {
    const raw = JSON.stringify([{ id: 'viti', label: 'Viti' }, { id: '', label: 'X' }, { id: 'y' }, { id: 'viti', label: 'Doppia' }, { id: 'dadi', label: ' Dadi ' }]);
    expect(parseFurTypes(raw)).toEqual([{ id: 'viti', label: 'Viti' }, { id: 'dadi', label: 'Dadi' }]);
  });
  it('la lista predefinita non si modifica da fuori', () => {
    const list = parseFurTypes(null);
    list.push({ id: 'z', label: 'Z' });
    expect(DEFAULT_FUR_TYPES).toHaveLength(7);
  });
});

describe('furTypeIdFor', () => {
  it('toglie accenti e simboli', () => {
    expect(furTypeIdFor('Cincillà', [])).toBe('cincilla');
    expect(furTypeIdFor('Volpe & Lapin 2', [])).toBe('volpe_lapin_2');
  });
  it('non riusa un id che c\'è già', () => {
    expect(furTypeIdFor('Volpe', DEFAULT_FUR_TYPES)).toBe('volpe_2');
    expect(furTypeIdFor('Volpe', [...DEFAULT_FUR_TYPES, { id: 'volpe_2' }])).toBe('volpe_3');
  });
  it('un nome senza lettere né cifre dà comunque un id (lo stesso di M01)', () => {
    expect(furTypeIdFor('€€', [])).toBe('categoria');
  });
});

describe('furTypeNameError', () => {
  it('nome vuoto', () => expect(furTypeNameError('  ', DEFAULT_FUR_TYPES)).toBe('Inserisci un nome per il tipo di pelle'));
  it('nome già usato, maiuscole e accenti indifferenti', () => {
    expect(furTypeNameError('cincilla', DEFAULT_FUR_TYPES)).toBe('Esiste già il tipo di pelle "cincilla"');
    expect(furTypeNameError(' VOLPE ', DEFAULT_FUR_TYPES)).toMatch(/Esiste già/);
  });
  it('rinominare con lo stesso nome (o cambiando solo le maiuscole) va bene', () => {
    expect(furTypeNameError('VOLPE', DEFAULT_FUR_TYPES, 'volpe')).toBeNull();
    expect(furTypeNameError('Lapin', DEFAULT_FUR_TYPES)).toBeNull();
  });
});

describe('furTypeLabel', () => {
  it('nome del tipo, l\'id se non è più in lista, vuoto se il prodotto non ne ha uno', () => {
    expect(furTypeLabel(DEFAULT_FUR_TYPES, 'cincilla')).toBe('Cincillà');
    expect(furTypeLabel(DEFAULT_FUR_TYPES, 'elettronica')).toBe('elettronica');
    expect(furTypeLabel(DEFAULT_FUR_TYPES, undefined)).toBe('');
    expect(furTypeLabel(DEFAULT_FUR_TYPES, '')).toBe('');
  });
});

describe('furTypeFromCsv (C1)', () => {
  it('id o nome di un tipo in lista → id; sconosciuto resta com\'è; vuoto = nessuno', () => {
    expect(furTypeFromCsv('visone', DEFAULT_FUR_TYPES)).toBe('visone');
    expect(furTypeFromCsv(' Cincillà ', DEFAULT_FUR_TYPES)).toBe('cincilla');
    expect(furTypeFromCsv('VOLPE', DEFAULT_FUR_TYPES)).toBe('volpe');
    expect(furTypeFromCsv('lapin', DEFAULT_FUR_TYPES)).toBe('lapin');
    expect(furTypeFromCsv('  ', DEFAULT_FUR_TYPES)).toBe('');
  });
});

describe('withSystemFieldNames (C1)', () => {
  const fur = (name: string, extra: object = {}) => ({ id: 'furType', name, isSystem: true, required: true, ...extra });
  it('il campo `furType` salvato prima di M01 («Tipo Pelle») e da M01 («Categoria») si chiama «Tipo di pelle» e non è obbligatorio', () => {
    expect(withSystemFieldNames([fur('Tipo Pelle')])[0]).toEqual({ id: 'furType', name: 'Tipo di pelle', isSystem: true, required: false });
    expect(withSystemFieldNames([fur('Categoria')])[0]).toEqual({ id: 'furType', name: 'Tipo di pelle', isSystem: true, required: false });
  });
  it('il campo `folder` («Cartella») si chiama «Categoria»', () => {
    expect(withSystemFieldNames([{ id: 'folder', name: 'Cartella', isSystem: true, required: false }])[0].name).toBe('Categoria');
  });
  it('un nome scelto dall\'utente resta; il tipo di pelle non è comunque obbligatorio', () => {
    expect(withSystemFieldNames([fur('Materiale')])[0]).toEqual({ id: 'furType', name: 'Materiale', isSystem: true, required: false });
    expect(withSystemFieldNames([{ id: 'folder', name: 'Reparto', isSystem: true }])[0].name).toBe('Reparto');
  });
  it('i campi personalizzati con gli stessi nomi non si toccano', () => {
    const custom = [{ id: 'field_1', name: 'Tipo Pelle', isSystem: false, required: true }, { id: 'field_2', name: 'Cartella', isSystem: false }];
    expect(withSystemFieldNames(custom)).toEqual(custom);
  });
  it('un campo già con i nomi nuovi resta lo stesso oggetto', () => {
    const f = { id: 'furType', name: 'Tipo di pelle', isSystem: true, required: false };
    expect(withSystemFieldNames([f])[0]).toBe(f);
  });
});
