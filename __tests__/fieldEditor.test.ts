import type { CustomField } from '../types';
import {
  BASE_LOOK_FIELDS, baseLook, appendOption, canShowInCard, cardText, restoredField, cardFields, choiceLook, defaultOf, fieldOptions, formValue, freeText, initialValues, inputMode, isSelected,
  liveField, lookFields, newOptionId, rangeFromText, savedValue, searchTexts, showInCardError, stepFrom, stepperRange, typeChangeError,
  typedChoice, valueText, wheelValues, WHEEL_MAX_VALUES,
} from '../utils/fieldValues';
import { isEmptyValue, missingRequiredFields } from '../utils/formValidation';
import { matchesSearch } from '../utils/inventoryFilter';
import { parseFurTypes } from '../utils/furTypes';

// EDC (ticket 23): editor in tre domande e lettura veloce.
const field = (extra: Partial<CustomField>): CustomField => ({
  id: 'f', name: 'Campo', type: 'text_short', uiType: 'text', required: false, order: 20, ...extra,
});
const opts = (labels: string[]) => labels.map((label, i) => ({ id: `opt_${i}`, label }));
const COLORE = field({ id: 'field_cmp_colore', name: 'Colore', type: 'single_choice', uiType: 'picker', options: opts(['Nero', 'Marrone', 'Grigio perla']), dataset: ['Nero', 'Marrone', 'Grigio perla'] });
const FORNITORE = field({ id: 'field_cmp_fornitore', name: 'Fornitore', icon: 'local-shipping' });
const SPESS = field({ id: 'field_cmp_spessore', name: 'Spessore', type: 'number', unit: 'mm' });
const PEZZI = field({ id: 'field_cmp_pezzi', name: 'Pezzi', type: 'number', uiType: 'stepper', dataset: { min: 1, max: 20, step: 1 } });
const LARG = field({ id: 'width', name: 'Larghezza', type: 'number', unit: 'cm', isSystem: true, input: 'wheel', dataset: { min: 80, max: 120, step: 10 } });
const DETT = field({ id: 'field_cmp_dett', name: 'Dettagli', type: 'multi_choice', uiType: 'grid', options: opts(['Cappuccio', 'Cintura', 'Tasche']) });
const CONSEGNA = field({ id: 'field_cmp_consegna', name: 'Posizione di consegna', type: 'single_choice', uiType: 'picker', linkTo: 'locations' });

describe('lettura dal registro con ripiego sulla copia (CAM-F6, CAM-F7)', () => {
  it('nome, icona e tipo di adesso dal registro, anche nel cestino; la copia solo se il campo non c\'è più', () => {
    const rinominato = { ...FORNITORE, name: 'Fornitore principale', icon: 'store' };
    expect(liveField(FORNITORE, [rinominato]).name).toBe('Fornitore principale');
    expect(liveField(FORNITORE, [{ ...rinominato, deletedAt: '2026-11-24T08:00:00.000Z' }]).name).toBe('Fornitore principale');
    expect(liveField(FORNITORE, [COLORE])).toBe(FORNITORE);
  });
});

describe('valore predefinito', () => {
  it('testo, numero, Sì/No, opzione che c\'è; nei limiti del contatore e tra i valori della ruota', () => {
    expect(defaultOf({ ...FORNITORE, defaultValue: 'Pellicceria Bianchi' })).toBe('Pellicceria Bianchi');
    expect(defaultOf({ ...FORNITORE, defaultValue: 'x'.repeat(150) })).toHaveLength(100);
    expect(defaultOf({ ...SPESS, defaultValue: 2.5 })).toBe(2.5);
    expect(defaultOf({ ...SPESS, defaultValue: '2,5' })).toBe(2.5);
    expect(defaultOf({ ...PEZZI, defaultValue: 5 })).toBe(5);
    expect(defaultOf({ ...PEZZI, defaultValue: 50 })).toBeUndefined();
    expect(defaultOf({ ...LARG, defaultValue: 90 })).toBe(90);
    expect(defaultOf({ ...LARG, defaultValue: 95 })).toBeUndefined();
    expect(defaultOf(field({ type: 'boolean', uiType: 'text', defaultValue: false }))).toBe(false);
    expect(defaultOf({ ...COLORE, defaultValue: 'opt_1' })).toBe('opt_1');
    expect(defaultOf({ ...COLORE, defaultValue: 'opt_9' })).toBeUndefined();
    expect(defaultOf({ ...DETT, defaultValue: 'opt_0' })).toBeUndefined();
    expect(defaultOf({ ...CONSEGNA, defaultValue: 'Sartoria' })).toBeUndefined();
    expect(defaultOf(FORNITORE)).toBeUndefined();
  });
  it('in Aggiungi: contatore dal minimo, poi il predefinito al suo posto, nella forma del modulo', () => {
    expect(initialValues([PEZZI, SPESS, COLORE])).toEqual({ field_cmp_pezzi: 1 });
    expect(initialValues([{ ...PEZZI, defaultValue: 4 }, { ...SPESS, defaultValue: 2.5 }, { ...COLORE, defaultValue: 'opt_2' }]))
      .toEqual({ field_cmp_pezzi: 4, field_cmp_spessore: '2,5', field_cmp_colore: 'opt_2' });
    expect(initialValues([{ ...LARG, defaultValue: 100 }])).toEqual({ width: '100' });
    // il predefinito si salva come gli altri valori
    expect(savedValue(SPESS, '2,5')).toEqual({ ok: true, value: 2.5 });
  });
});

describe('«Scelgo o scrivo»: un valore nuovo diventa un\'opzione solo dopo la conferma', () => {
  const options = fieldOptions(COLORE);
  it('il testo scritto sceglie l\'opzione con lo stesso nome, altrimenti resta testo', () => {
    expect(typedChoice('grigio PERLA ', options)).toBe('opt_2');
    expect(typedChoice('Blu notte', options)).toBe('Blu notte');
    expect(typedChoice('  ', options)).toBeNull();
    expect(freeText('Blu notte', options)).toBe('Blu notte');
    expect(freeText('opt_0', options)).toBe('');
    expect(freeText('Nero', options)).toBe('');
    expect(valueText(COLORE, 'Blu notte', { options })).toBe('Blu notte');
    expect(inputMode({ ...COLORE, input: 'choose_or_write' })).toBe('choose_or_write');
    expect(inputMode({ ...CONSEGNA, input: 'choose_or_write' })).toBe('choose');
    expect(inputMode({ ...DETT, input: 'choose_or_write' })).toBe('choose');
  });
  it('dopo la conferma: opzione in fondo con un id nuovo, gli altri id restano, il valore scritto prima si riconosce', () => {
    const id = newOptionId(options, 1732400000000, () => 0.25);
    const dopo = appendOption(COLORE, ' Blu notte ', id);
    expect(dopo.options!.map((o) => o.id)).toEqual(['opt_0', 'opt_1', 'opt_2', id]);
    expect(dopo.dataset).toEqual(['Nero', 'Marrone', 'Grigio perla', 'Blu notte']);
    const nuove = fieldOptions(dopo);
    expect(isSelected('Blu notte', nuove[3], nuove)).toBe(true);
    expect(COLORE.options).toHaveLength(3);
  });
});

describe('ruota e contatore col passo', () => {
  it('ruota da, a, passo; al massimo 400 valori', () => {
    expect(wheelValues(stepperRange(LARG))).toEqual([80, 90, 100, 110, 120]);
    expect(wheelValues({ min: 1, max: 2, step: 0.25 })).toEqual([1, 1.25, 1.5, 1.75, 2]);
    expect(wheelValues({ min: 0, max: 10000, step: 1 })).toHaveLength(WHEEL_MAX_VALUES);
    expect(inputMode(LARG)).toBe('wheel');
    expect(inputMode(PEZZI)).toBe('stepper');
    expect(inputMode(SPESS)).toBe('write');
    expect(inputMode({ ...LARG, type: 'currency' })).toBe('write');
    // la ruota nel modulo: il numero con la virgola, come gli altri numeri (la ruota lo legge)
    expect(formValue(LARG, 90)).toBe('90');
    expect(formValue(SPESS, 2.5)).toBe('2,5');
  });
  it('limiti scritti con la virgola; errori detti', () => {
    expect(rangeFromText({ min: '80', max: '120', step: '0,5' })).toEqual({ ok: true, range: { min: 80, max: 120, step: 0.5 } });
    expect(rangeFromText({ min: '1', max: '20', step: '0' })).toEqual({ ok: false, error: 'Il passo deve essere più di zero.' });
    expect(rangeFromText({ min: '20', max: '1', step: '1' })).toEqual({ ok: false, error: '«a» deve essere uguale o più grande di «da».' });
    expect(rangeFromText({ min: 'a', max: '1', step: '1' }).ok).toBe(false);
    expect(rangeFromText({ min: '0', max: '1000', step: '1' }, true).ok).toBe(false);
    expect(rangeFromText({ min: '0', max: '1000', step: '1' }).ok).toBe(true);
  });
  it('il contatore va avanti del passo (prima l\'editor leggeva «0,5» come 0 e il passo restava 1)', () => {
    const r = stepperRange({ dataset: { min: 0, max: 5, step: 0.5 } });
    expect(stepFrom(1, r, 1)).toBe(1.5);
    expect(stepFrom(0.5, r, -1)).toBe(0);
  });
});

describe('Sì/No', () => {
  const PELLICCIA = field({ id: 'f_si', name: 'Con cappuccio', type: 'boolean', uiType: 'text', required: true });
  it('«No» è un valore: si mostra e vale per un obbligatorio', () => {
    expect(valueText(PELLICCIA, false)).toBe('No');
    expect(valueText(PELLICCIA, true)).toBe('Sì');
    expect(isEmptyValue(false)).toBe(false);
    expect(savedValue(PELLICCIA, false)).toEqual({ ok: true, value: false });
    const layout = [{ id: 'f_si', type: 'custom' as const, visible: true }];
    expect(missingRequiredFields(layout, [PELLICCIA], { f_si: false })).toEqual([]);
    expect(missingRequiredFields(layout, [PELLICCIA], {})).toEqual([PELLICCIA]);
  });
});

describe('come si vede una scelta', () => {
  it('riquadri, pillole, tendina, elenco dal basso; lo stesso aspetto non riscrive uiType', () => {
    expect(choiceLook({ uiType: 'segmented' })).toBe('tiles');
    expect(choiceLook({ uiType: 'modal_list' })).toBe('sheet');
    expect(choiceLook({ uiType: 'grid', look: 'chips' })).toBe('chips');
    expect(choiceLook({ uiType: 'picker', look: 'dropdown' })).toBe('dropdown');
    expect(lookFields('tiles', { uiType: 'segmented' })).toEqual({ uiType: 'segmented', look: undefined });
    expect(lookFields('sheet', { uiType: 'modal_list' })).toEqual({ uiType: 'modal_list', look: undefined });
    expect(lookFields('chips', { uiType: 'segmented' })).toEqual({ uiType: 'grid', look: 'chips' });
    expect(lookFields('dropdown')).toEqual({ uiType: 'picker', look: 'dropdown' });
    expect(lookFields('tiles', { uiType: 'grid', look: 'chips' })).toEqual({ uiType: 'grid', look: undefined });
  });
  it('a capo, elenco verticale, ruota (richiesta del 24): uiType vecchio più vicino; la ruota non vale per più scelte', () => {
    expect(lookFields('wrap')).toEqual({ uiType: 'grid', look: 'wrap' });
    expect(lookFields('list')).toEqual({ uiType: 'grid', look: 'list' });
    expect(lookFields('wheel', { uiType: 'grid' })).toEqual({ uiType: 'picker', look: 'wheel' });
    expect(choiceLook({ uiType: 'picker', look: 'wheel', type: 'single_choice' })).toBe('wheel');
    expect(choiceLook({ uiType: 'picker', look: 'wheel', type: 'multi_choice' })).toBe('sheet');
    expect(choiceLook({ uiType: 'grid', look: 'boh' as any })).toBe('tiles');
  });
  it('Posizione e Tipo di pelle: binario orizzontale se non è stato scelto altro', () => {
    expect(baseLook(undefined)).toBe('chips');
    expect(baseLook({ look: undefined })).toBe('chips');
    expect(baseLook({ look: 'wheel' })).toBe('wheel');
    expect(baseLook({ look: 'wrap' })).toBe('wrap');
    expect(BASE_LOOK_FIELDS).toEqual(['location', 'furType']);
  });
});

describe('cambio di tipo (CAM-F10): solo dove i valori si leggono uguali', () => {
  const prodotti = [
    { customData: [{ value: 'Pellicceria Bianchi', fieldSnapshot: FORNITORE }, { value: ['opt_0', 'opt_1'], fieldSnapshot: DETT }] },
    { deletedAt: '2026-11-24T08:00:00.000Z', customData: [{ value: 3, fieldSnapshot: SPESS }] },
  ];
  it('permessi: testo breve ↔ lungo, numero ↔ prezzo (anche dal cestino), scelta una → più', () => {
    expect(typeChangeError(FORNITORE, 'text_long', prodotti)).toBeNull();
    expect(typeChangeError(SPESS, 'currency', prodotti)).toBeNull();
    expect(typeChangeError(COLORE, 'multi_choice', prodotti)).toBeNull();
    expect(typeChangeError(FORNITORE, 'text_short', prodotti)).toBeNull();
  });
  it('rifiutati e spiegati: tipi che si leggono diversi, più valori verso uno solo', () => {
    expect(typeChangeError(FORNITORE, 'number', prodotti)).toBe('1 prodotto ha un valore in «Fornitore»: da Testo breve a Numero o misura si leggerebbe in un altro modo. Crea un campo nuovo, oppure cambia solo tra testo breve e lungo, numero e prezzo, scelta di uno o più valori.');
    expect(typeChangeError(SPESS, 'date', prodotti)).toMatch(/^1 prodotto ha un valore in «Spessore»/);
    expect(typeChangeError(DETT, 'single_choice', prodotti)).toBe('1 prodotto ha più di un valore in «Dettagli»: con un valore solo non si leggerebbero come adesso. Togli prima i valori in più.');
    expect(typeChangeError(DETT, 'single_choice', [{ customData: [{ value: ['opt_0'], fieldSnapshot: DETT }] }])).toBeNull();
  });
  it('un campo che nessun prodotto ha compilato cambia tipo liberamente', () => {
    expect(typeChangeError(COLORE, 'date', prodotti)).toBeNull();
    expect(typeChangeError(FORNITORE, 'boolean', [{ customData: [{ value: '', fieldSnapshot: FORNITORE }] }])).toBeNull();
  });
});

describe('card e ricerca', () => {
  it('«Mostra nella card»: al massimo 2, spento per i campi di partenza', () => {
    const a = { ...COLORE, showInCard: true };
    const b = { ...FORNITORE, showInCard: true };
    const c = { ...SPESS, showInCard: true };
    expect(cardFields([COLORE, FORNITORE, SPESS])).toEqual([]);
    expect(cardFields([a, b, c]).map((f) => f.name)).toEqual(['Colore', 'Fornitore']);
    expect(cardFields([{ ...a, deletedAt: 'x' }, b])).toEqual([b]);
    expect(showInCardError([a, b, SPESS], SPESS)).toBe('Nella card ci stanno al massimo 2 campi: spegni prima «Mostra nella card» in «Colore» o «Fornitore».');
    expect(showInCardError([a, b], a)).toBeNull();
    expect(showInCardError([a], SPESS)).toBeNull();
    expect(canShowInCard(field({ type: 'images', uiType: 'images' }))).toBe(false);
    expect(showInCardError([], field({ type: 'document', uiType: 'document' }))).toBe('Testi lunghi, foto e documenti non stanno nella card.');
  });
  it('la ricerca trova un prodotto per il testo mostrato dei campi, non per gli id né per i campi collegati', () => {
    const p = {
      sku: 'VIS-0142', furType: 'visone', location: 'vetrina', createdAt: '', updatedAt: '',
      customData: [
        { value: 'Grigio perla', fieldSnapshot: COLORE },
        { value: 'Pellicceria Bianchi, Milano', fieldSnapshot: FORNITORE },
        { value: '3', fieldSnapshot: SPESS },
        { value: ['opt_2'], fieldSnapshot: DETT },
        { value: 'Sartoria', fieldSnapshot: CONSEGNA },
      ],
    } as any;
    const registro = [COLORE, { ...FORNITORE, name: 'Fornitore principale' }, SPESS, DETT, CONSEGNA];
    expect(searchTexts(p.customData, registro)).toEqual(['Grigio perla', 'Pellicceria Bianchi, Milano', '3 mm', 'Tasche']);
    const locs = [{ id: 'vetrina', label: 'Vetrina' }];
    expect(matchesSearch(p, 'bianchi', locs, [], [], registro)).toBe(true);
    expect(matchesSearch(p, 'tasche', locs, [], [], registro)).toBe(true);
    expect(matchesSearch(p, 'opt_2', locs, [], [], registro)).toBe(false);
    expect(matchesSearch(p, 'sartoria', locs, [], [], registro)).toBe(false);
    // senza il registro come prima
    expect(matchesSearch(p, 'bianchi', locs)).toBe(false);
    expect(matchesSearch(p, 'vetrina', locs, [], [], registro)).toBe(true);
  });
});

describe('dopo il parere del revisore (e799818)', () => {
  it('nella card una data si legge come data, non come testo da macchina', () => {
    const ARRIVO = field({ id: 'f_arrivo', name: 'Arrivo', type: 'date', uiType: 'date' });
    expect(cardText(ARRIVO, '2026-11-24T09:12:33.000Z')).toBe('24/11/2026');
    expect(cardText(ARRIVO, 'boh')).toBe('boh');
    expect(cardText(COLORE, 'opt_1', { options: fieldOptions(COLORE) })).toBe('Marrone');
  });
  it('un campo ripristinato dal cestino non accende una terza riga nella card', () => {
    const a = { ...COLORE, showInCard: true };
    const b = { ...FORNITORE, showInCard: true };
    const c = { ...SPESS, showInCard: true, deletedAt: '2026-11-24T08:00:00.000Z' };
    expect(restoredField([a, b, c], c)).toEqual({ ...SPESS, showInCard: undefined, deletedAt: undefined });
    expect(restoredField([a, c], c)).toEqual({ ...SPESS, showInCard: true, deletedAt: undefined });
  });
  it('la ruota nel modulo tiene il numero con la virgola, come gli altri numeri (Modifica dopo un cambio a «Lo scrivo io»)', () => {
    expect(formValue(LARG, 1.5)).toBe('1,5');
    expect(initialValues([{ ...LARG, defaultValue: 100 }])).toEqual({ width: '100' });
  });
  it('il nome del tipo a più scelte nel messaggio del cambio di tipo', () => {
    expect(typeChangeError(DETT, 'date', [{ customData: [{ value: ['opt_0'], fieldSnapshot: DETT }] }])).toMatch(/da Più scelte da un elenco a Data/);
  });
});

describe('Tipi di pelle con il colore (punto 6)', () => {
  it('parseFurTypes tiene il colore se c\'è', () => {
    expect(parseFurTypes(JSON.stringify([{ id: 'visone', label: 'Visone', color: '#8D6E63' }, { id: 'volpe', label: 'Volpe' }])))
      .toEqual([{ id: 'visone', label: 'Visone', color: '#8D6E63' }, { id: 'volpe', label: 'Volpe' }]);
  });
});
