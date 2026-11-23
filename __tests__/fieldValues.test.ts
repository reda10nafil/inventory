import type { CustomField } from '../types';
import {
  choiceLabel, choiceList, choiceOptions, fieldError, fieldOptions, formValue, invalidNumberFields, isSelected, newOptionId, normalizeField,
  numberOf, optionDeleteError, optionNameError, optionOf, optionUsage, retiredNameError, sameValue, savedValue, savesLabel, stepFrom, stepperDefaults,
  stepperRange, toggleOption, valueText, NO_FLAGS,
} from '../utils/fieldValues';

// VAL (ticket 23): valori dei campi personalizzati.
const field = (extra: Partial<CustomField>): CustomField => ({
  id: 'f', name: 'Campo', type: 'text_short', uiType: 'text', required: false, order: 20, ...extra,
});
const LABELS = ['XS', 'S', 'M', 'L', 'XL'];
const opts = (labels: string[]) => labels.map((label, i) => ({ id: `opt_${i}`, label }));
const TAGLIA = field({ id: 'field_cmp_taglia', name: 'Taglia', type: 'single_choice', uiType: 'grid', dataset: LABELS, options: opts(LABELS) });
// dopo «M» → «Media» con l'editor di VAL: stessi id, etichetta nuova
const TAGLIA_DOPO = { ...TAGLIA, options: TAGLIA.options!.map((o) => (o.id === 'opt_2' ? { ...o, label: 'Media' } : o)), dataset: ['XS', 'S', 'Media', 'L', 'XL'] };
const DETT = field({ id: 'field_cmp_dett', name: 'Dettagli', type: 'multi_choice', uiType: 'grid', options: opts(['Cappuccio', 'Cintura', 'Tasche', 'Collo sciallato']) });
const COSTO = field({ id: 'field_cmp_riparazione', name: 'Costo riparazione', type: 'currency', unit: '€' });
const SPESS = field({ id: 'field_cmp_spessore', name: 'Spessore', type: 'number', unit: 'mm' });
const PEZZI = field({ id: 'field_cmp_pezzi', name: 'Pezzi', type: 'number', uiType: 'stepper', dataset: { min: 1, max: 20, step: 1 } });

describe('opzioni a id stabili (CAM-F1)', () => {
  it('le opzioni salvate tengono i loro id; un campo con le sole etichette riceve opt_<posizione>', () => {
    expect(fieldOptions(TAGLIA).map((o) => o.id)).toEqual(['opt_0', 'opt_1', 'opt_2', 'opt_3', 'opt_4']);
    expect(fieldOptions({ options: [{ id: 'xs', label: 'XS' }, { id: 'm', label: 'M' }] }).map((o) => o.id)).toEqual(['xs', 'm']);
    expect(fieldOptions({ dataset: ['Nuovo', '', 'Buono'] })).toEqual([{ id: 'opt_0', label: 'Nuovo' }, { id: 'opt_2', label: 'Buono' }]);
    expect(fieldOptions({ options: [{ id: 'a', label: 'A' }, { id: 'a', label: 'B' }] }).map((o) => o.id)).toEqual(['a', 'a_2']);
    expect(fieldOptions({ options: [{ id: 'r', label: 'Rosso', color: '#f00', icon: 'star' }] })).toEqual([{ id: 'r', label: 'Rosso', color: '#f00', icon: 'star' }]);
  });
  it('il registro si normalizza una volta: options con gli id, dataset allineato; nulla da fare → stesso oggetto', () => {
    expect(normalizeField(TAGLIA)).toBe(TAGLIA);
    const soloEtichette = field({ type: 'single_choice', dataset: ['A', 'B'] });
    expect(normalizeField(soloEtichette)).toMatchObject({ options: [{ id: 'opt_0', label: 'A' }, { id: 'opt_1', label: 'B' }], dataset: ['A', 'B'] });
    const disallineato = { ...TAGLIA_DOPO, dataset: ['XS', 'S', 'Media', 'L'] };
    expect(normalizeField(disallineato).dataset).toEqual(['XS', 'S', 'Media', 'L', 'XL']);
    const collegato = field({ type: 'single_choice', linkTo: 'locations', dataset: null });
    expect(normalizeField(collegato)).toBe(collegato);
    expect(normalizeField(SPESS)).toBe(SPESS);
  });
  it('un id nuovo non è una posizione e non si riusa', () => {
    const id = newOptionId(TAGLIA.options!, 1732370000000, () => 0.5);
    expect(id).toMatch(/^opt_1732370000000_[a-z0-9]+$/);
    expect(TAGLIA.options!.some((o) => o.id === id)).toBe(false);
    let n = 0;
    const doppio = newOptionId([{ id: 'opt_1_i' }], 1, () => (n++ === 0 ? 0.5 : 0.6666));
    expect(doppio).not.toBe('opt_1_i');
    expect(n).toBe(2);
  });
  it('editor: uso anche con l\'etichetta di prima, nome doppio, valore usato o ultimo non eliminabile', () => {
    const products = [
      { customData: [{ value: 'M', fieldSnapshot: TAGLIA }] },
      { customData: [{ value: 'opt_2', fieldSnapshot: TAGLIA_DOPO }] },
      { deletedAt: '2026-11-23T08:00:00.000Z', customData: [{ value: 'M', fieldSnapshot: TAGLIA }] },
      { customData: [{ value: 'L', fieldSnapshot: TAGLIA }] },
    ];
    expect(optionUsage(products, TAGLIA_DOPO, 'opt_2')).toEqual({ active: 2, trashed: 1 });
    expect(optionUsage(products, TAGLIA_DOPO, 'opt_4')).toEqual({ active: 0, trashed: 0 });
    const now = fieldOptions(TAGLIA_DOPO);
    expect(optionNameError(' media ', now)).toBe('Esiste già il valore "media".');
    expect(optionNameError('Media', now, 'opt_2')).toBeNull();
    expect(optionNameError('  ', now)).toBe('Inserisci il nome del valore.');
    expect(optionDeleteError(now, 'opt_2', { active: 2, trashed: 1 })).toBe('Il valore "Media" è usato da 3 prodotti (1 nel cestino). Rinominalo, oppure cambia il valore di quei prodotti prima di eliminarlo.');
    expect(optionDeleteError(now, 'opt_4', { active: 0, trashed: 0 })).toBeNull();
    expect(optionDeleteError([now[0]], 'opt_0', { active: 0, trashed: 0 })).toBe('Deve restare almeno un valore.');
  });
});

describe('etichetta di prima ↔ id nuovo', () => {
  it('ordine: id di adesso, etichetta di adesso, etichetta nella copia del prodotto (anche rinominata)', () => {
    const now = fieldOptions(TAGLIA_DOPO);
    expect(optionOf('opt_3', now)?.label).toBe('L');
    expect(optionOf('L', now)?.id).toBe('opt_3');
    // VIS-0142 ha «M» con la copia di prima: dopo il rinomina è «Media»
    expect(optionOf('M', now, TAGLIA)?.label).toBe('Media');
    expect(optionOf('M', now)).toBeUndefined();
    expect(optionOf('', now)).toBeUndefined();
    expect(optionOf(null, now)).toBeUndefined();
  });
  it('l\'etichetta di adesso viene prima della copia: un editor di prima che rinumerava non sposta il valore', () => {
    // prima di VAL: [A, B, C], prodotto «B» (copia opt_1 = B); poi «A» eliminata → [B (opt_0), C (opt_1)]
    const copia = { options: opts(['A', 'B', 'C']) };
    const adesso = fieldOptions({ options: opts(['B', 'C']) });
    expect(optionOf('B', adesso, copia)?.label).toBe('B');
  });
  it('etichetta da mostrare: un\'opzione eliminata con la sua etichetta nella copia, un valore sconosciuto com\'è', () => {
    const now = fieldOptions(TAGLIA_DOPO);
    expect(choiceLabel('M', now, TAGLIA)).toBe('Media');
    expect(choiceLabel('opt_9', fieldOptions({ options: opts(['A']) }), { options: [...opts(['A']), { id: 'opt_9', label: 'Vecchia' }] })).toBe('Vecchia');
    expect(choiceLabel('Boh', now)).toBe('Boh');
  });
  it('scelto: per opzione, con l\'etichetta di prima o l\'id', () => {
    const now = fieldOptions(TAGLIA_DOPO);
    const media = now[2];
    expect(isSelected('M', media, now, TAGLIA)).toBe(true);
    expect(isSelected('opt_2', media, now)).toBe(true);
    expect(isSelected('L', media, now, TAGLIA)).toBe(false);
    expect(isSelected(null, media, now)).toBe(false);
  });
  it('il tocco salva l\'id; la multipla toccata passa tutto agli id e tiene i valori sconosciuti', () => {
    const now = fieldOptions(TAGLIA_DOPO);
    expect(toggleOption('M', now[3], now, false, { snapshot: TAGLIA })).toBe('opt_3');
    expect(toggleOption('M', now[2], now, false, { snapshot: TAGLIA })).toBeNull();
    const d = fieldOptions(DETT);
    expect(toggleOption(['Collo sciallato', 'Tasche', 'Cintura'], d[0], d, true)).toEqual(['opt_3', 'opt_2', 'opt_1', 'opt_0']);
    expect(toggleOption(['Tasche', 'opt_2', 'Sparita'], d[2], d, true)).toEqual(['Sparita']);
    expect(toggleOption('Tasche', d[1], d, true)).toEqual(['opt_2', 'opt_1']);
    expect(choiceList('Tasche')).toEqual(['Tasche']);
    expect(choiceList(undefined)).toEqual([]);
  });
  it('Posizioni e Categorie collegate salvano ancora il nome; i tipi di pelle l\'id (punto 7)', () => {
    const loc = field({ type: 'single_choice', linkTo: 'locations' });
    const pelle = field({ type: 'single_choice', linkTo: 'furType' });
    const lists = { locations: [{ id: 'sartoria', label: 'Sartoria' }], furTypes: [{ id: 'visone', label: 'Visone' }] };
    expect(savesLabel(loc)).toBe(true);
    expect(savesLabel(pelle)).toBe(false);
    const lo = choiceOptions(loc, lists);
    expect(toggleOption(undefined, lo[0], lo, false, { byLabel: true })).toBe('Sartoria');
    const po = choiceOptions(pelle, lists);
    expect(toggleOption(undefined, po[0], po, false)).toBe('visone');
    // il nome salvato prima di VAL si riconosce ancora
    expect(isSelected('Visone', po[0], po)).toBe(true);
    expect(choiceOptions(TAGLIA, lists)).toHaveLength(5);
  });
});

describe('numeri (CAM-F2)', () => {
  it('«12,50» e «1.250,00» si leggono; i vecchi valori testo pure', () => {
    expect(numberOf('12,50')).toBe(12.5);
    expect(numberOf('1.250,00')).toBe(1250);
    expect(numberOf('180')).toBe(180);
    expect(numberOf(2.5)).toBe(2.5);
    expect(numberOf('abc')).toBeUndefined();
    expect(numberOf(undefined)).toBeUndefined();
  });
  it('si salvano come numero; vuoto = nessun valore; un testo che non è un numero si rifiuta', () => {
    expect(savedValue(COSTO, '12,50')).toEqual({ ok: true, value: 12.5 });
    expect(savedValue(SPESS, '2,5')).toEqual({ ok: true, value: 2.5 });
    expect(savedValue(SPESS, '  ')).toEqual({ ok: true, value: undefined });
    expect(savedValue(SPESS, 'tanto')).toEqual({ ok: false });
    expect(savedValue(TAGLIA, 'opt_2')).toEqual({ ok: true, value: 'opt_2' });
    expect(invalidNumberFields([SPESS, COSTO, TAGLIA], { field_cmp_spessore: 'tanto', field_cmp_riparazione: '12,5' }).map((f) => f.name)).toEqual(['Spessore']);
  });
  it('nel modulo un numero salvato si scrive con la virgola, il testo di prima resta com\'è', () => {
    expect(formValue(COSTO, 12.5)).toBe('12,5');
    expect(formValue(COSTO, '12,50')).toBe('12,50');
    expect(formValue(PEZZI, 2)).toBe(2);
  });
  it('testo da mostrare: «12,50 €», «2,5 mm», scelte con l\'etichetta di adesso', () => {
    expect(valueText(COSTO, '12,50')).toBe('12,50 €');
    expect(valueText(COSTO, 12.5)).toBe('12,50 €');
    expect(valueText(COSTO, '180')).toBe('180 €');
    expect(valueText(COSTO, 'boh')).toBe('boh');
    expect(valueText(SPESS, 2.5)).toBe('2,5 mm');
    expect(valueText(SPESS, '3')).toBe('3 mm');
    expect(valueText(TAGLIA_DOPO, 'M', { options: fieldOptions(TAGLIA_DOPO), snapshot: TAGLIA })).toBe('Media');
    expect(valueText(DETT, ['Tasche', 'opt_0'], { options: fieldOptions(DETT) })).toBe('Tasche, Cappuccio');
    expect(valueText(field({}), true)).toBe('Sì');
    expect(valueText(SPESS, '')).toBe('');
  });
});

describe('contatore (CAM-F3)', () => {
  it('in Aggiungi parte dal minimo, che si salva', () => {
    expect(stepperDefaults([PEZZI, SPESS, TAGLIA])).toEqual({ field_cmp_pezzi: 1 });
    expect(stepperRange(PEZZI)).toEqual({ min: 1, max: 20, step: 1 });
    expect(stepperRange(field({ type: 'number', uiType: 'stepper' }))).toEqual({ min: 0, max: 100, step: 1 });
  });
  it('+ e − nei limiti; senza valore (prodotto di prima) parte dal minimo', () => {
    const r = stepperRange(PEZZI);
    expect(stepFrom(2, r, 1)).toBe(3);
    expect(stepFrom('2', r, -1)).toBe(1);
    expect(stepFrom(1, r, -1)).toBe(1);
    expect(stepFrom(20, r, 1)).toBe(20);
    expect(stepFrom(undefined, r, 1)).toBe(1);
    expect(stepFrom(0.1, { min: 0, max: 1, step: 0.2 }, 1)).toBe(0.3);
  });
});

describe('stesso valore in due forme (Modifica, Cronologia, «Imposta Campo»)', () => {
  it('scelte per opzione, numeri per valore, vuoto e assente uguali', () => {
    const now = fieldOptions(TAGLIA_DOPO);
    expect(sameValue(TAGLIA, 'M', 'opt_2', { options: now, snapshots: [TAGLIA, TAGLIA_DOPO] })).toBe(true);
    expect(sameValue(TAGLIA, 'M', 'opt_3', { options: now, snapshots: [TAGLIA, TAGLIA_DOPO] })).toBe(false);
    expect(sameValue(DETT, ['Tasche', 'Cintura'], ['opt_1', 'opt_2'], { options: fieldOptions(DETT) })).toBe(true);
    expect(sameValue(SPESS, '3', 3)).toBe(true);
    expect(sameValue(COSTO, '12,50', 12.5)).toBe(true);
    expect(sameValue(COSTO, '12,50', 12)).toBe(false);
    expect(sameValue(SPESS, '', undefined)).toBe(true);
    expect(sameValue(field({}), 'a', 'b')).toBe(false);
  });
});

describe('riga sotto il campo dopo un salvataggio rifiutato', () => {
  it('obbligatorio vuoto e numero sbagliato; sparisce quando il campo è a posto', () => {
    const flagged = { missing: ['field_cmp_taglia'], wrong: ['field_cmp_spessore'] };
    expect(fieldError(TAGLIA, null, flagged)).toBe('Campo obbligatorio: compilalo per salvare.');
    expect(fieldError(TAGLIA, 'opt_2', flagged)).toBeUndefined();
    expect(fieldError(SPESS, 'tanto', flagged)).toBe('Scrivi un numero, per esempio 12,5.');
    expect(fieldError(SPESS, '2,5', flagged)).toBeUndefined();
    expect(fieldError(COSTO, 'boh', flagged)).toBeUndefined();
    expect(fieldError(TAGLIA, null, NO_FLAGS)).toBeUndefined();
  });
});

describe('dopo il parere del revisore', () => {
  it('un nome che dei prodotti hanno ancora salvato per un\'altra opzione (rinominata) non si riusa', () => {
    const products = [
      { customData: [{ value: 'M', fieldSnapshot: TAGLIA }] },
      { customData: [{ value: 'M', fieldSnapshot: TAGLIA }] },
      { customData: [{ value: 'opt_3', fieldSnapshot: TAGLIA_DOPO }] },
    ];
    const bozza = fieldOptions(TAGLIA_DOPO);
    // rinomina già salvata: «M» nuovo rifiutato, «Media» → «M» (la stessa opzione) va bene
    expect(retiredNameError('M', products, TAGLIA_DOPO, bozza)).toBe('Il nome "M" è ancora salvato in 2 prodotti per il valore "Media": scegline un altro, altrimenti quei prodotti passerebbero al valore nuovo.');
    expect(retiredNameError('M', products, TAGLIA_DOPO, bozza, 'opt_2')).toBeNull();
    // rinomina nella stessa bozza, non ancora salvata: il campo salvato ha ancora «M»
    expect(retiredNameError(' M ', products, TAGLIA, bozza)).toMatch(/per il valore "Media"/);
    expect(retiredNameError('XXL', products, TAGLIA_DOPO, bozza)).toBeNull();
    expect(retiredNameError('M', products, undefined, bozza)).toBeNull();
    // un'etichetta che non porta a nessuna opzione (tolta prima di VAL) si può riprendere
    expect(retiredNameError('Boh', [{ customData: [{ value: 'Boh', fieldSnapshot: TAGLIA }] }], TAGLIA_DOPO, bozza)).toBeNull();
  });
  it('un\'etichetta che c\'è solo in dataset non si perde normalizzando', () => {
    const f = field({ type: 'single_choice', dataset: ['A', 'B', 'C'], options: [{ id: 'a', label: 'A' }, { id: 'opt_1', label: 'X' }] });
    expect(normalizeField(f).options).toEqual([{ id: 'a', label: 'A' }, { id: 'opt_1', label: 'X' }, { id: 'opt_1_2', label: 'B' }, { id: 'opt_2', label: 'C' }]);
    expect(normalizeField(f).dataset).toEqual(['A', 'X', 'B', 'C']);
  });
  it('i modelli hanno dataset uguale alle etichette delle opzioni (nessuna scelta persa)', () => {
    const { SECTOR_TEMPLATES } = require('../constants/sectorTemplates');
    const { PREDEFINED_TEMPLATES } = require('../lib/templates');
    const choice = (f: any) => f.type === 'single_choice' || f.type === 'multi_choice';
    const fields = [...SECTOR_TEMPLATES.flatMap((t: any) => t.fields), ...PREDEFINED_TEMPLATES.flatMap((t: any) => t.customFields)].filter(choice);
    expect(fields.length).toBeGreaterThan(40);
    for (const f of fields) {
      expect((f.options || []).map((o: any) => o.label)).toEqual(f.dataset || []);
      expect(normalizeField(f)).toBe(f);
    }
  });
});
