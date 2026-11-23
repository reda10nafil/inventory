import type { CustomField, Product } from '../types';
import {
  automationsUsing, canUseScannedLocation, fieldChoices, fieldOf, fieldValueOf, flowErrors, isKnownStep, locationInUseText,
  loopIndex, moveStepBy, notesWithTag, resumeIndex, runStep, salePriceInput, startError, type RunContext, type RunStep,
} from '../utils/automationRun';

const NOW = '2026-11-23T10:00:00.000Z';
const base: Product = {
  id: 'p1', sku: 'AST-0033', furType: 'astrakan', location: 'sartoria', status: 'available', images: [], customData: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', sellPrice: 1450,
};
const item = (extra: Partial<Product> = {}): Product => ({ ...base, ...extra });
const field = (extra: Partial<CustomField>): CustomField => ({
  id: 'f', name: 'Campo', type: 'text_short', uiType: 'text', required: false, order: 20, ...extra,
});
const COND = field({ id: 'field_cond', name: 'Condizione', type: 'single_choice', uiType: 'segmented', options: [{ id: 'opt_0', label: 'Nuovo' }, { id: 'opt_1', label: 'Buono' }] });
const FORN = field({ id: 'field_forn', name: 'Fornitore' });
const SPESS = field({ id: 'field_spess', name: 'Spessore', type: 'number' });
const FIELDS: CustomField[] = [
  field({ id: 'sku', name: 'SKU / Codice', isSystem: true }), COND, FORN, SPESS,
  field({ id: 'field_foto', name: 'Foto dettagli', type: 'images', uiType: 'images' }),
  field({ id: 'field_cons', name: 'Posizione di consegna', type: 'single_choice', uiType: 'picker', linkTo: 'locations' }),
  field({ id: 'field_vecchio', name: 'Vecchio', deletedAt: NOW }),
];
const ctx = (extra: Partial<RunContext> = {}): RunContext => ({
  locationId: null,
  locations: [{ id: 'vetrina', label: 'Vetrina' }, { id: 'stand_b', label: 'Stand B' }, { id: 'sartoria', label: 'Sartoria' }],
  fields: FIELDS, now: NOW, ...extra,
});
const st = (type: string, config: RunStep['config'] = {}, label?: string): RunStep => ({ id: type, type, config, label });

describe('salePriceInput (AU-V01)', () => {
  it('la virgola è il decimale e il punto le migliaia, come nella Vendita flash', () => {
    expect(salePriceInput('1300,50')).toEqual({ ok: true, price: 1300.5 });
    expect(salePriceInput('5.900')).toEqual({ ok: true, price: 5900 });
    expect(salePriceInput('1.300,50')).toEqual({ ok: true, price: 1300.5 });
    expect(salePriceInput('  ')).toEqual({ ok: true, price: undefined });
  });
  it('un prezzo che non è un numero si rifiuta (la finestra resta aperta)', () => {
    expect(salePriceInput('abc').ok).toBe(false);
    expect(salePriceInput('-5').ok).toBe(false);
  });
});

describe('runStep: note in fila (AU-V02)', () => {
  it('ogni tag si aggiunge alle note della copia che riceve, a capo', () => {
    let p = item({ technicalNotes: 'In sartoria.' });
    for (const tag of ['Controllato', 'Da Pulire']) {
      const r = runStep(p, st('add_tag', { tag }), ctx());
      if (!r.ok || r.op !== 'patch') throw new Error('rifiutato');
      p = { ...p, ...r.patch };
    }
    expect(p.technicalNotes).toBe('In sartoria.\n[Controllato]\n[Da Pulire]');
  });
  it('un tag già presente non si ripete: patch vuota, il passo riesce', () => {
    const r = runStep(item({ technicalNotes: '[Controllato]' }), st('add_tag', { tag: 'Controllato' }), ctx());
    expect(r).toMatchObject({ ok: true, op: 'patch', patch: {} });
    expect(notesWithTag('[A]', 'A')).toBeNull();
    expect(notesWithTag(undefined, 'A')).toBe('[A]');
  });
  it('un tag vuoto si rifiuta', () => {
    expect(runStep(item(), st('add_tag', { tag: '  ' }), ctx())).toMatchObject({ ok: false });
  });
});

describe('runStep: «Imposta Campo» in customData (P17)', () => {
  it('scrive il campo scelto con la sua scheda, non nelle note', () => {
    const r = runStep(item({ technicalNotes: 'nota' }), st('set_field', { fieldId: 'field_cond', fieldName: 'Condizione', fieldValue: 'Buono' }), ctx());
    if (!r.ok || r.op !== 'patch') throw new Error('rifiutato');
    // VAL: si salva l'id dell'opzione
    expect(r.patch).toEqual({ customData: [{ value: 'opt_1', fieldSnapshot: COND }] });
    expect(r.patch.technicalNotes).toBeUndefined();
  });
  it('sostituisce il valore che c\'era, al suo posto, e lascia gli altri campi', () => {
    const other = { value: 'Milano', fieldSnapshot: FORN };
    const p = item({ customData: [{ value: 'Nuovo', fieldSnapshot: { ...COND, name: 'Condizione vecchia' } }, other] });
    const r = runStep(p, st('set_field', { fieldId: 'field_cond', fieldValue: 'buono' }), ctx());
    if (!r.ok || r.op !== 'patch') throw new Error('rifiutato');
    expect(r.patch.customData).toEqual([{ value: 'opt_1', fieldSnapshot: COND }, other]);
  });
  it('stesso valore: patch vuota (anche salvato prima di VAL con l\'etichetta, o come testo)', () => {
    const r = runStep(item({ customData: [{ value: 'Buono', fieldSnapshot: COND }] }), st('set_field', { fieldId: 'field_cond', fieldValue: 'Buono' }), ctx());
    expect(r).toMatchObject({ ok: true, op: 'patch', patch: {} });
    expect(runStep(item({ customData: [{ value: 'opt_1', fieldSnapshot: COND }] }), st('set_field', { fieldId: 'field_cond', fieldValue: 'buono' }), ctx()))
      .toMatchObject({ ok: true, op: 'patch', patch: {} });
    expect(runStep(item({ customData: [{ value: '2,5', fieldSnapshot: SPESS }] }), st('set_field', { fieldId: 'field_spess', fieldValue: '2,50' }), ctx()))
      .toMatchObject({ ok: true, op: 'patch', patch: {} });
  });
  it('automazione di prima con il nome scritto a mano: il campo con lo stesso nome', () => {
    const r = runStep(item(), st('set_field', { fieldName: 'fornitore', fieldValue: 'Pellicceria Bianchi' }), ctx());
    expect(r).toMatchObject({ ok: true, patch: { customData: [{ value: 'Pellicceria Bianchi', fieldSnapshot: FORN }] } });
  });
  it('campo che non c\'è (o è nel cestino, o di sistema) → rifiuto, nessuna nota', () => {
    for (const config of [{ fieldName: 'Stato', fieldValue: 'OK' }, { fieldId: 'field_vecchio', fieldValue: 'x' }, { fieldName: 'SKU / Codice', fieldValue: 'x' }]) {
      const r = runStep(item(), st('set_field', config), ctx());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.refusal).toMatch(/modifica l'automazione/);
    }
  });
  it('valori: numero con la virgola, opzione per etichetta o id, testo', () => {
    // VAL: il numero come numero, la scelta con l'id dell'opzione (nel passo resta il testo, `label`)
    expect(fieldValueOf(SPESS, '2,5')).toEqual({ ok: true, value: 2.5, label: '2,5' });
    expect(fieldValueOf(SPESS, 'tanto').ok).toBe(false);
    expect(fieldValueOf(COND, 'opt_0')).toEqual({ ok: true, value: 'opt_0', label: 'Nuovo' });
    expect(fieldValueOf(COND, 'buono')).toEqual({ ok: true, value: 'opt_1', label: 'Buono' });
    expect(fieldValueOf(COND, 'Rotto').ok).toBe(false);
    expect(fieldValueOf(FORN, '  Bianchi ')).toEqual({ ok: true, value: 'Bianchi', label: 'Bianchi' });
    expect(fieldValueOf(FORN, '').ok).toBe(false);
  });
  it('campi che si possono scegliere: personalizzati, attivi, testo, numero, valuta, scelta con opzioni', () => {
    expect(fieldChoices(FIELDS).map((f) => f.id)).toEqual(['field_cond', 'field_forn', 'field_spess']);
    expect(fieldOf({ fieldId: 'field_cond', fieldName: 'Altro nome' }, FIELDS)).toBe(COND);
    expect(fieldOf({}, FIELDS)).toBeUndefined();
  });
});

describe('runStep: rifiuti (AU-V03, AU-V04, AU-V05, AU-V06)', () => {
  it('prodotto nel cestino: nessun passo lo tocca', () => {
    const p = item({ deletedAt: NOW });
    for (const step of [st('add_tag', { tag: 'A' }), st('set_field', { fieldId: 'field_forn', fieldValue: 'x' }), st('move_to', { locationId: 'vetrina' }), st('mark_sold', { pricePrompt: true })]) {
      expect(runStep(p, step, ctx())).toEqual({ ok: false, refusal: 'AST-0033 è nel cestino.' });
    }
  });
  it('nessun prodotto letto', () => {
    expect(runStep(undefined, st('add_tag', { tag: 'A' }), ctx())).toMatchObject({ ok: false, refusal: expect.stringMatching(/Nessun prodotto letto/) });
  });
  it('già venduto: rifiuto prima della finestra del prezzo', () => {
    expect(runStep(item({ status: 'sold' }), st('mark_sold', { pricePrompt: true }), ctx())).toEqual({ ok: false, refusal: 'AST-0033 risulta già venduto.' });
  });
  it('vendita: con conferma la finestra propone il listino con la virgola; senza, si vende', () => {
    expect(runStep(item({ sellPrice: 3800.5 }), st('mark_sold', { pricePrompt: true }), ctx())).toEqual({ ok: true, op: 'ask_price', proposal: '3800,5' });
    expect(runStep(item(), st('mark_sold', { pricePrompt: false }), ctx())).toMatchObject({ ok: true, op: 'sell' });
  });
  it('posizione del passo eliminata (AU-V05)', () => {
    const r = runStep(item(), st('move_to', { useLastScannedLocation: false, locationId: 'deposito_eliminato' }), ctx());
    expect(r).toEqual({ ok: false, refusal: 'La posizione di questo passo non esiste più: modifica l\'automazione.' });
  });
  it('«Sposta nella posizione letta» senza lettura di posizione (AU-V06)', () => {
    const r = runStep(item(), st('move_to', { useLastScannedLocation: true }), ctx());
    expect(r).toMatchObject({ ok: false, refusal: expect.stringMatching(/Nessuna posizione letta/) });
    expect(runStep(item(), st('move_to', { useLastScannedLocation: true }), ctx({ locationId: 'stand_b' }))).toEqual({ ok: true, op: 'move', to: 'stand_b', text: '📦 Spostato in Stand B' });
  });
  it('posizione fissa senza la chiave della spunta (automazioni scritte a mano)', () => {
    expect(runStep(item(), st('move_to', { locationId: 'vetrina' }), ctx())).toMatchObject({ ok: true, op: 'move', to: 'vetrina' });
    expect(runStep(item(), st('move_to', {}), ctx())).toMatchObject({ ok: false, refusal: expect.stringMatching(/non ha una posizione/) });
  });
  it('già in quella posizione: non è un rifiuto (niente da spostare, il passo riesce)', () => {
    expect(runStep(item(), st('move_to', { locationId: 'sartoria' }), ctx())).toEqual({ ok: true, op: 'patch', patch: {}, text: '📦 AST-0033 è già in Sartoria' });
  });
  it('tipo di passo sconosciuto: messaggio, nessuna caduta', () => {
    const r = runStep(item(), { type: 'carico', config: { qty: 2 } as never }, ctx());
    expect(r).toMatchObject({ ok: false, refusal: expect.stringMatching(/Passo sconosciuto \(«carico»\)/) });
    expect(runStep(item(), { type: 'carico' }, ctx()).ok).toBe(false);
    expect(isKnownStep({ type: 'carico' })).toBe(false);
  });
});

describe('flowErrors e startError (P16, AU-V06)', () => {
  const SP = st('scan_product', {}, 'Scansiona Prodotto');
  const SL = st('scan_location', {}, 'Scansiona Posizione');
  it('flussi validi: una lettura sola; posizione, prodotto, sposta nella posizione letta', () => {
    expect(flowErrors([SP])).toEqual([]);
    expect(flowErrors([SL, SP, st('move_to', { useLastScannedLocation: true })])).toEqual([]);
    expect(flowErrors([SP, st('add_tag', { tag: 'A' }), st('add_tag', { tag: 'B' }), st('set_field', { fieldId: 'field_cond', fieldValue: 'Buono' }), st('mark_sold', { pricePrompt: true })], { fields: FIELDS })).toEqual([]);
  });
  it('vuoto; primo passo che non è una lettura', () => {
    expect(flowErrors([])).toEqual(['Aggiungi almeno uno step.']);
    expect(flowErrors([st('move_to', { locationId: 'vetrina' })])).toEqual(['Il primo passo deve essere una lettura: «Scansiona Prodotto» o «Scansiona Posizione».']);
  });
  it('azione senza prodotto letto prima; sposta nella posizione letta senza «Scansiona Posizione»', () => {
    expect(flowErrors([SL, st('add_tag', { tag: 'A' }, 'Tag A')])).toEqual(['Passo 2 («Tag A»): serve prima «Scansiona Prodotto».']);
    expect(flowErrors([SP, st('move_to', { useLastScannedLocation: true }, 'Sposta nella Posizione Scansionata')]))
      .toEqual(['Passo 2 («Sposta nella Posizione Scansionata»): «Sposta nella Posizione Scansionata» vuole prima «Scansiona Posizione».']);
  });
  it('con le posizioni e i campi di adesso: posizione eliminata, campo che non c\'è; tipo sconosciuto', () => {
    const errs = flowErrors([SP, st('move_to', { locationId: 'sparita' }), st('set_field', { fieldName: 'Stato', fieldValue: 'OK' }), { type: 'carico' }], { locations: ctx().locations, fields: FIELDS });
    expect(errs).toEqual(['Passo 2: la posizione non esiste più.', 'Passo 3: il campo non c\'è tra i campi personalizzati.', 'Passo 4: tipo sconosciuto («carico»).']);
  });
  it('startError: solo le automazioni che non iniziano con una lettura', () => {
    expect(startError([st('move_to', { locationId: 'vetrina' })])).toBe('Questa automazione non inizia con una lettura.');
    expect(startError([])).toBe('Questa automazione non inizia con una lettura.');
    expect(startError([SP, st('move_to', { useLastScannedLocation: true })])).toBeNull();
  });
});

describe('resumeIndex e loopIndex', () => {
  const flow = [st('scan_location'), st('scan_product'), st('add_tag', { tag: 'A' }), st('move_to', { useLastScannedLocation: true })];
  it('dopo un rifiuto si torna al «Scansiona Prodotto» prima del passo', () => {
    expect(resumeIndex(flow, 3)).toBe(1);
    expect(resumeIndex([st('scan_location'), st('move_to', { locationId: 'x' })], 1)).toBe(0);
    expect(resumeIndex([st('move_to')], 0)).toBe(0);
  });
  it('a fine flusso l\'ultimo «Scansiona Prodotto», -1 se non c\'è', () => {
    expect(loopIndex(flow)).toBe(1);
    expect(loopIndex([st('scan_location')])).toBe(-1);
  });
});

describe('costruttore: riordino e spunta (AU-V12, AU-V06)', () => {
  const steps = [{ id: 'a', order: 0 }, { id: 'b', order: 1 }, { id: 'c', order: 2 }];
  it('sposta su e giù e rinumera order; ai bordi non cambia', () => {
    expect(moveStepBy(steps, 2, -1)).toEqual([{ id: 'a', order: 0 }, { id: 'c', order: 1 }, { id: 'b', order: 2 }]);
    expect(moveStepBy(steps, 0, 1).map((s) => s.id)).toEqual(['b', 'a', 'c']);
    expect(moveStepBy(steps, 0, -1).map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(moveStepBy(steps, 2, 1).map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(steps.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
  it('«Usa l\'ultima posizione» solo con un «Scansiona Posizione» prima', () => {
    const flow = [st('scan_product'), st('scan_location'), st('add_tag')];
    expect(canUseScannedLocation(flow, 1)).toBe(false);
    expect(canUseScannedLocation(flow, 2)).toBe(true);
    expect(canUseScannedLocation(flow, 3)).toBe(true);
    expect(canUseScannedLocation([st('scan_product')], 1)).toBe(false);
  });
});

describe('dopo il parere del revisore', () => {
  it('prodotto già nella posizione del passo: niente spostamento, la catena continua (come prima di ESE)', () => {
    const r = runStep(item({ location: 'vetrina' }), st('move_to', { locationId: 'vetrina' }), ctx());
    expect(r).toEqual({ ok: true, op: 'patch', patch: {}, text: '📦 AST-0033 è già in Vetrina' });
    expect(runStep(item({ location: 'stand_b' }), st('move_to', { useLastScannedLocation: true }), ctx({ locationId: 'stand_b' })))
      .toMatchObject({ ok: true, op: 'patch', patch: {} });
  });
  it('valuta: si salva il numero (VAL), così la Scheda lo mostra («12,5» non diventa «NaN €»)', () => {
    const COSTO = field({ id: 'field_costo', name: 'Costo riparazione', type: 'currency' });
    expect(fieldValueOf(COSTO, '12,5')).toEqual({ ok: true, value: 12.5, label: '12,5' });
    expect(fieldValueOf(COSTO, '1.200,50')).toEqual({ ok: true, value: 1200.5, label: '1.200,50' });
    expect(fieldValueOf(COSTO, '180')).toEqual({ ok: true, value: 180, label: '180' });
    expect(fieldValueOf(SPESS, '2,5')).toEqual({ ok: true, value: 2.5, label: '2,5' });
  });
  it('valuta: il valore scritto nel passo dal costruttore, eseguito, resta lo stesso numero («2,125» non diventa 2125)', () => {
    const COSTO = field({ id: 'field_costo', name: 'Costo riparazione', type: 'currency' });
    const scritto = fieldValueOf(COSTO, '2,125');
    if (!scritto.ok) throw new Error(scritto.error);
    const r = runStep(item(), st('set_field', { fieldId: 'field_costo', fieldValue: scritto.label }), ctx({ fields: [...FIELDS, COSTO] }));
    expect(r).toMatchObject({ ok: true, op: 'patch', patch: { customData: [{ value: 2.125, fieldSnapshot: COSTO }] } });
    expect(scritto.label).toBe('2,125');
  });
  it('il costruttore controlla anche il valore di «Imposta Campo» (opzione tolta, testo in un numero)', () => {
    const SP = st('scan_product');
    expect(flowErrors([SP, st('set_field', { fieldName: 'Condizione', fieldValue: 'Rotto' }, 'Imposta Condizione = Rotto')], { fields: FIELDS }))
      .toEqual(['Passo 2 («Imposta Condizione = Rotto»): «Rotto» non è tra i valori di «Condizione».']);
    expect(flowErrors([SP, st('set_field', { fieldId: 'field_spess', fieldValue: 'tanto' })], { fields: FIELDS }))
      .toEqual(['Passo 2: «tanto» non è un numero (per esempio 12,5).']);
  });
});

describe('posizione eliminata usata da un\'automazione (AU-V05)', () => {
  const autos = [
    { name: 'Scarico', steps: [st('scan_product'), st('move_to', { locationId: 'deposito' })] },
    { name: 'Letta', steps: [st('scan_location'), st('scan_product'), st('move_to', { useLastScannedLocation: true, locationId: 'deposito' })] },
    { name: 'Altro', steps: [st('scan_product'), st('move_to', { locationId: 'vetrina' })] },
  ];
  it('solo i passi «Sposta in» con quella posizione fissa', () => {
    expect(automationsUsing(autos, 'deposito').map((a) => a.name)).toEqual(['Scarico']);
    expect(automationsUsing(autos, 'stand_a')).toEqual([]);
  });
  it('testo dell\'avviso', () => {
    expect(locationInUseText([])).toBe('');
    expect(locationInUseText(['Scarico'])).toBe('L\'automazione «Scarico» la usa in un passo «Sposta in»: dopo l\'eliminazione quel passo si rifiuta finché non modifichi l\'automazione.');
    expect(locationInUseText(['A', 'B'])).toMatch(/^Le automazioni «A», «B» la usano/);
  });
});
