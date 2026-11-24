import { appendLayoutFields, LATE_BASE_FIELD_IDS, matchTemplateFields, withLateBaseFields } from '../utils/templateFields';

describe('matchTemplateFields (D12)', () => {
  const existing = [
    { id: 'f1', name: 'Condizione' },
    { id: 'f2', name: 'Vecchio', deletedAt: '2026-11-01' },
  ];
  it('riusa i campi attivi con lo stesso nome, crea gli altri', () => {
    const out = matchTemplateFields([{ name: 'Brand' }, { name: ' condizione ' }, { name: 'Vecchio' }], existing);
    expect(out.map((o) => [o.field.name, o.existingId])).toEqual([['Brand', undefined], [' condizione ', 'f1'], ['Vecchio', undefined]]);
  });
  it('un nome ripetuto nel modello vale una volta', () => {
    expect(matchTemplateFields([{ name: 'A' }, { name: 'a' }], [])).toHaveLength(1);
  });
});

describe('appendLayoutFields (D12, P11)', () => {
  const current = [{ id: 'sku', type: 'base' as const, size: 'full' as const, visible: true }, { id: 'f1', type: 'custom' as const, size: 'small' as const, visible: false }];
  it('aggiunge in fondo solo i campi che mancano, visibili', () => {
    const out = appendLayoutFields(current, ['f1', 'f9', 'f9', 'f8']);
    expect(out.map((f) => f.id)).toEqual(['sku', 'f1', 'f9', 'f8']);
    expect(out[1]).toEqual(current[1]); // quello già presente non cambia
    expect(out[2]).toEqual({ id: 'f9', type: 'custom', size: 'medium', visible: true });
  });
  it('revisore di S2: un campo di sistema abbinato da un modello entra come Base', () => {
    const out = appendLayoutFields(current, ['height', 'f9'], 'medium', ['height', 'weight']);
    expect(out.slice(2)).toEqual([{ id: 'height', type: 'base', size: 'medium', visible: true }, { id: 'f9', type: 'custom', size: 'medium', visible: true }]);
  });
});

describe('withLateBaseFields (S2, «Altezza» nei layout salvati prima)', () => {
  const f = (id: string, type: 'base' | 'custom' | 'section' = 'base', visible = true) => ({ id, type, size: 'small' as const, visible });
  it('mette «Altezza» dopo l\'ultima misura che c\'è, in memoria', () => {
    const saved = [f('sku'), f('section_misure', 'section'), f('length'), f('width'), f('weight'), f('section_capo', 'section'), f('field_x', 'custom')];
    expect(withLateBaseFields(saved).map((x) => x.id)).toEqual(['sku', 'section_misure', 'length', 'width', 'weight', 'height', 'section_capo', 'field_x']);
    expect(withLateBaseFields(saved)[5]).toEqual({ id: 'height', type: 'base', size: 'small', visible: true });
    expect(saved.map((x) => x.id)).not.toContain('height'); // l'originale non cambia
    const moved = [f('weight'), f('sku'), f('length')];
    expect(withLateBaseFields(moved).map((x) => x.id)).toEqual(['weight', 'sku', 'length', 'height']);
  });
  it('un layout che ha già l\'Altezza (anche nascosta) o non ha misure resta lo stesso array', () => {
    const withHeight = [f('length'), f('height', 'base', false), f('weight')];
    expect(withLateBaseFields(withHeight)).toBe(withHeight);
    const noMeasures = [f('sku'), f('technicalNotes')];
    expect(withLateBaseFields(noMeasures)).toBe(noMeasures);
  });
  it('revisore di S2: tolta dall’utente non torna; con le misure tutte nascoste nasce nascosta', () => {
    expect(LATE_BASE_FIELD_IDS).toEqual(['height']);
    const removed = [f('length'), f('width'), f('weight')];
    expect(withLateBaseFields(removed, ['height'])).toBe(removed);
    const hidden = [f('length', 'base', false), f('width', 'base', false), f('weight', 'base', false)];
    expect(withLateBaseFields(hidden)[3]).toEqual({ id: 'height', type: 'base', size: 'small', visible: false });
    const oneVisible = [f('length', 'base', false), f('weight')];
    expect(withLateBaseFields(oneVisible)[2].visible).toBe(true);
  });
});
