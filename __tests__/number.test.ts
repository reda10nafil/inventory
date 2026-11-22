import { formatNumber, formatNumberInput, parseNumber, parseStoredNumber } from '../utils/number';

describe('parseStoredNumber (CSV)', () => {
  it('il punto da solo è il decimale della macchina', () => {
    expect(parseStoredNumber('2.125')).toBe(2.125);
    expect(parseStoredNumber('0.125')).toBe(0.125);
    expect(parseStoredNumber('1234.5')).toBe(1234.5);
  });
  it('le forme italiane valgono come nei moduli', () => {
    expect(parseStoredNumber('1234,50')).toBe(1234.5);
    expect(parseStoredNumber('4.500,50')).toBe(4500.5);
    expect(parseStoredNumber('')).toBeUndefined();
  });
});

describe('parseNumber: primo gruppo 0', () => {
  it('«0.125» non è mai 125', () => expect(parseNumber('0.125')).toBe(0.125));
  it('nei moduli «2.125» resta il punto delle migliaia', () => expect(parseNumber('2.125')).toBe(2125));
});

describe('formatNumber (P19)', () => {
  it('formato italiano', () => {
    expect(formatNumber(2.1)).toBe('2,1');
    expect(formatNumber(115)).toBe('115');
    expect(formatNumber(1250)).toBe('1.250');
    expect(formatNumber(1250.5)).toBe('1.250,5');
    expect(formatNumber(0.1 + 0.2)).toBe('0,3');
    expect(formatNumber(-3.25)).toBe('-3,25');
  });
});

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
