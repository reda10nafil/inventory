import {
  DEFAULT_FUR_TYPES,
  furTypeDeleteError,
  furTypeFromCsv,
  furTypeIdFor,
  furTypeLabel,
  furTypeLinkedFields,
  furTypeNameError,
  furTypeRenameMessage,
  furTypeUsage,
  furTypeLegacyNames,
  furTypeUsageText,
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

// C2 (ticket 21): controlli dell'editor dei valori in Campi Personalizzati › Tipo di pelle (OptionsEditor)
describe('furTypeUsageText (C2)', () => {
  it('conta i prodotti, cestino compreso, e dice quanti sono nel cestino', () => {
    expect(furTypeUsageText({ active: 0, trashed: 0 })).toBe('Nessun prodotto');
    expect(furTypeUsageText({ active: 1, trashed: 0 })).toBe('1 prodotto');
    expect(furTypeUsageText({ active: 3, trashed: 0 })).toBe('3 prodotti');
    expect(furTypeUsageText({ active: 2, trashed: 1 })).toBe('3 prodotti (1 nel cestino)');
    expect(furTypeUsageText({ active: 0, trashed: 1 })).toBe('1 prodotto (nel cestino)');
  });
});

describe('furTypeDeleteError (C2)', () => {
  const libero = { active: 0, trashed: 0 };
  it('un valore libero si elimina', () => expect(furTypeDeleteError(DEFAULT_FUR_TYPES, 'ermellino', libero)).toBeNull());
  it('l\'ultimo valore non si elimina (una lista vuota tornerebbe ai predefiniti)', () => {
    expect(furTypeDeleteError([{ id: 'solo', label: 'Solo' }], 'solo', libero)).toBe('Deve restare almeno un tipo di pelle.');
  });
  it('un valore usato non si elimina, col conteggio; il cestino conta e si dice', () => {
    expect(furTypeDeleteError(DEFAULT_FUR_TYPES, 'visone', { active: 2, trashed: 0 }))
      .toBe('Il tipo di pelle "Visone" è usato da 2 prodotti. Cambia il tipo di pelle di quei prodotti prima di eliminarlo, oppure rinominalo.');
    expect(furTypeDeleteError(DEFAULT_FUR_TYPES, 'astrakan', { active: 0, trashed: 1 }))
      .toBe('Il tipo di pelle "Astrakan" è usato da 1 prodotto nel cestino. Cambia il tipo di pelle di quei prodotti prima di eliminarlo, oppure rinominalo. Quelli nel cestino si possono anche eliminare per sempre dal Cestino.');
    expect(furTypeDeleteError(DEFAULT_FUR_TYPES, 'volpe', { active: 1, trashed: 2 })).toMatch(/usato da 1 prodotto e 2 nel cestino\./);
  });
});

describe('furTypeLinkedFields e furTypeRenameMessage (C2)', () => {
  const fields = [
    { name: 'Pelle interna', linkTo: 'furType' as const },
    { name: 'Vecchia pelle', linkTo: 'furType' as const, deletedAt: '2026-11-20T10:00:00.000Z' },
    { name: 'Reparto', linkTo: 'locations' as const },
    { name: 'Note' },
  ];
  it('campi personalizzati attivi con «Sorgente Dati: Tipi di pelle»', () => {
    expect(furTypeLinkedFields(fields)).toEqual(['Pelle interna']);
    expect(furTypeLinkedFields([])).toEqual([]);
  });
  it('il messaggio dice che i prodotti seguono il nome nuovo', () => {
    expect(furTypeRenameMessage('Visone', 'Visone Black', { active: 2, trashed: 1 }, []))
      .toBe('«Visone» ora si chiama «Visone Black». I 3 prodotti che lo usano mostrano il nome nuovo.');
    expect(furTypeRenameMessage('Lapin', 'Coniglio', { active: 0, trashed: 0 }, [])).toBe('«Lapin» ora si chiama «Coniglio».');
    expect(furTypeRenameMessage('Volpe', 'Volpe rossa', { active: 1, trashed: 0 }, [])).toMatch(/Il prodotto che lo usa mostra il nome nuovo\.$/);
  });
  it('VAL: avvisa solo dove un campo collegato ha ancora il nome scritto (compilato prima)', () => {
    expect(furTypeRenameMessage('Visone', 'Visone Black', { active: 2, trashed: 0 }, [{ field: 'Pelle interna', count: 1 }]))
      .toBe('«Visone» ora si chiama «Visone Black». I 2 prodotti che lo usano mostrano il nome nuovo. Nel campo «Pelle interna» 1 prodotto compilato prima ha il nome scritto: lì resta «Visone».');
    expect(furTypeRenameMessage('Visone', 'V', { active: 0, trashed: 0 }, [{ field: 'A', count: 3 }, { field: 'B', count: 0 }]))
      .toBe('«Visone» ora si chiama «V». Nel campo «A» 3 prodotti compilati prima hanno il nome scritto: lì resta «Visone».');
    expect(furTypeRenameMessage('Visone', 'V', { active: 0, trashed: 0 })).toBe('«Visone» ora si chiama «V».');
  });
});

describe('furTypeUsage e furTypeLegacyNames (VAL, punto 7)', () => {
  const PELLE = { id: 'field_pelle', name: 'Pelle interna', linkTo: 'furType' };
  const products = [
    { furType: 'visone', customData: [] },
    { furType: 'volpe', customData: [{ value: 'visone', fieldSnapshot: PELLE }] },
    { furType: 'volpe', deletedAt: '2026-11-23T08:00:00.000Z', customData: [{ value: 'Visone', fieldSnapshot: PELLE }] },
    { furType: 'volpe', customData: [{ value: 'Visone', fieldSnapshot: { id: 'field_testo', name: 'Note' } }] },
  ];
  const visone = { id: 'visone', label: 'Visone' };
  it('conta il tipo del prodotto e i campi collegati, con l\'id o col nome scritto prima', () => {
    expect(furTypeUsage(products, visone)).toEqual({ active: 2, trashed: 1 });
    expect(furTypeUsage(products, { id: 'lapin', label: 'Lapin' })).toEqual({ active: 0, trashed: 0 });
  });
  it('i campi dove resta il nome scritto, col nome di adesso del campo', () => {
    expect(furTypeLegacyNames(products, [{ id: 'field_pelle', name: 'Pelle (interna)' }], visone)).toEqual([{ field: 'Pelle (interna)', count: 1 }]);
    expect(furTypeLegacyNames(products, [], { id: 'volpe', label: 'Volpe' })).toEqual([]);
  });
});
