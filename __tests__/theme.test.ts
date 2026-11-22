import { withAlpha } from '../utils/color';
import { oggi } from '../constants/themes';
import { theme as today } from '../constants/theme';

describe('withAlpha', () => {
  it('rende come la concatenazione esadecimale di oggi', () => {
    expect(withAlpha('#D4AF37', 0x20 / 255)).toBe('rgba(212, 175, 55, 0.1255)');
    expect(withAlpha('#D4AF37', 0.125)).toBe('rgba(212, 175, 55, 0.125)');
  });

  it('accetta esadecimali corti e a 8 cifre e moltiplica l\'alfa', () => {
    expect(withAlpha('#FFF', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(withAlpha('#00000080', 0.5)).toBe('rgba(0, 0, 0, 0.251)');
  });

  it('accetta rgb() e rgba()', () => {
    expect(withAlpha('rgb(10, 20, 30)', 0.2)).toBe('rgba(10, 20, 30, 0.2)');
    expect(withAlpha('rgba(255,255,255,.5)', 0.5)).toBe('rgba(255, 255, 255, 0.25)');
  });

  it('lascia stare ciò che non sa leggere', () => {
    expect(withAlpha('transparent', 0.5)).toBe('transparent');
  });
});

describe('tema oggi', () => {
  it('riprende i valori di constants/theme', () => {
    expect(oggi.colors.background).toBe(today.background);
    expect(oggi.colors.accent).toBe(today.primary);
    expect(oggi.colors.textSecondary).toBe(today.textSecondary);
  });

  it('ha tutte le chiavi tipografiche usate nel codice', () => {
    for (const key of ['caption', 'cardTitle', 'body', 'sectionHeader', 'buttonPrimary', 'cardValue', 'buttonSecondary', 'h3', 'heroLabel', 'overline', 'h2', 'bodySecondary'] as const) {
      expect(oggi.typography[key]).toBeDefined();
    }
  });
});
