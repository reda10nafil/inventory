import { formatNumberInput, parseNumber } from '../utils/number';

describe('parseNumber (P03)', () => {
  it('virgola come decimale', () => {
    expect(parseNumber('2,5')).toBe(2.5);
    expect(parseNumber('0,75')).toBe(0.75);
  });

  it('punto delle migliaia', () => {
    expect(parseNumber('4.500')).toBe(4500);
    expect(parseNumber('1.234.567')).toBe(1234567);
    expect(parseNumber('4.500,50')).toBe(4500.5);
    expect(parseNumber('4.500 €')).toBe(4500);
  });

  it('punto decimale dei valori vecchi e dei CSV', () => {
    expect(parseNumber('2.1')).toBe(2.1);
    expect(parseNumber('1234.5')).toBe(1234.5);
    expect(parseNumber('115')).toBe(115);
  });

  it('vuoto o non numerico → undefined', () => {
    expect([undefined, null, '', '  ', 'abc', '2,5kg', '1.2,3', '--1'].map(parseNumber)).toEqual(Array(8).fill(undefined));
  });

  it('numeri già numerici', () => {
    expect(parseNumber(3)).toBe(3);
    expect(parseNumber(NaN)).toBeUndefined();
  });

  it('andata e ritorno nel modulo', () => {
    for (const n of [2.1, 4500, 0.75, 115, 4500.5]) expect(parseNumber(formatNumberInput(n))).toBe(n);
    expect(formatNumberInput(2.1)).toBe('2,1');
    expect(formatNumberInput(undefined)).toBe('');
  });
});
