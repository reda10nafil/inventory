import { missingModelFields, modelLayout } from '../constants/formModels';
import { savedValue } from '../utils/fieldValues';
import type { CustomField } from '../types';

test('modello Borse: crea i campi che mancano e li mette nei gruppi', () => {
  const missing = missingModelFields('borse', []);
  expect(missing.length).toBeGreaterThan(20);
  const fields: CustomField[] = missing.map((f, i) => ({ ...f, id: `f${i}`, order: i }));
  expect(missingModelFields('borse', fields)).toEqual([]);
  const layout = modelLayout('borse', fields)!;
  const sections = layout.filter((f) => f.type === 'section').map((f) => f.label);
  expect(sections).toEqual(expect.arrayContaining(['Informazioni generali', 'Materiali', 'Caratteristiche tecniche', 'Dimensioni', 'Organizzazione interna', 'Colori disponibili', 'Qualità e produzione']));
  expect(layout.filter((f) => f.type === 'custom')).toHaveLength(fields.length);
  expect(modelLayout('attuale', fields)).toBeNull();
  const colori = fields.find((f) => f.name === 'Colori disponibili')!;
  expect(savedValue(colori, ['nero', 'tortora'])).toEqual({ ok: true, value: ['nero', 'tortora'] });
  const zip = fields.find((f) => f.name === 'Vano porta smartphone')!;
  expect(savedValue(zip, false)).toEqual({ ok: true, value: false });
});

test('un campo con lo stesso nome ma tipo diverso non si riusa', () => {
  const other: CustomField = { id: 'x', name: 'Categoria', type: 'text_short', uiType: 'text', required: false, order: 0 };
  expect(missingModelFields('borse', [other]).some((f) => f.name === 'Categoria')).toBe(true);
});

test('Modifica: un prodotto Borse ha i gruppi del modello, uno qualunque no', () => {
  const { productModelGroups } = require('../constants/formModels');
  const fields: CustomField[] = missingModelFields('borse', []).map((f, i) => ({ ...f, id: `f${i}`, order: i }));
  const colori = fields.find((f) => f.name === 'Colori disponibili')!;
  const groups = productModelGroups([colori.id], fields);
  expect(groups.map((g: { label: string }) => g.label)).toContain('Caratteristiche tecniche');
  expect(groups.flatMap((g: { ids: string[] }) => g.ids)).toHaveLength(fields.length);
  expect(productModelGroups(['altro'], fields)).toBeNull();
});
