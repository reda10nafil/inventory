import { isEmptyValue, missingRequiredFields } from '../utils/formValidation';
import type { CustomField } from '../types';

const field = (id: string, required: boolean, extra: Partial<CustomField> = {}) =>
  ({ id, name: id.toUpperCase(), type: 'text_short', uiType: 'text', required, order: 0, ...extra }) as CustomField;

describe('isEmptyValue', () => {
  it('riconosce i valori vuoti', () => {
    expect([undefined, null, '', '  ', [], NaN].every(isEmptyValue)).toBe(true);
    expect([0, 'a', ['x'], false].some(isEmptyValue)).toBe(false);
  });
});

describe('missingRequiredFields (D24)', () => {
  const custom = [field('a', true), field('b', true), field('c', false), field('d', true, { deletedAt: '2026-11-01' })];
  const layout = [
    { id: 'sku', type: 'base' as const, visible: true },
    { id: 'a', type: 'custom' as const, visible: true },
    { id: 'b', type: 'custom' as const, visible: false },
    { id: 'c', type: 'custom' as const, visible: true },
    { id: 'd', type: 'custom' as const, visible: true },
  ];

  it('segnala solo gli obbligatori mostrati e vuoti', () => {
    expect(missingRequiredFields(layout, custom, {}).map((f) => f.id)).toEqual(['a']);
  });

  it('non segnala un obbligatorio compilato, anche con 0', () => {
    expect(missingRequiredFields(layout, custom, { a: 0 })).toEqual([]);
  });
});

describe('missingRequiredFields con i dati del campionario', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const seed = require('../piani di implementazione/ui-ux/campionario/seed.json');
  const fields = seed.furinventory_custom_fields as CustomField[];
  const layout = seed.furinventory_layout_config.fields;

  it('con il modulo vuoto chiede la Taglia (unico personalizzato obbligatorio)', () => {
    expect(missingRequiredFields(layout, fields, {}).map((f) => f.name)).toEqual(['Taglia']);
  });

  it('con la Taglia scelta non chiede nulla', () => {
    expect(missingRequiredFields(layout, fields, { field_cmp_taglia: 'm' })).toEqual([]);
  });
});
