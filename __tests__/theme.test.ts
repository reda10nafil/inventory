import { withAlpha } from '../utils/color';
import { formatPrice } from '../utils/price';
import { DEFAULT_STYLE, THEMES, isStyleId, oggi, themeFor } from '../constants/themes';
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

describe('stili pronti', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path') as typeof import('path');
  const root = path.join(__dirname, '..');
  const webFonts = fs.readFileSync(path.join(root, 'constants/themes/fonts.web.ts'), 'utf8');

  it('chi non ha scelto vede lo stile predefinito', () => {
    expect(themeFor(null).id).toBe(DEFAULT_STYLE);
    expect(isStyleId('oggi')).toBe(false);
  });

  it.each(Object.values(THEMES))('$name: ogni file del carattere è nell\'app Android e nel registro web', (t) => {
    for (const file of new Set(Object.values(t!.font.files))) {
      expect(fs.existsSync(path.join(root, 'android/app/src/main/assets/fonts', `${file}.ttf`))).toBe(true);
      expect(webFonts).toContain(`import { ${file} } from`);
    }
  });

  it.each(Object.values(THEMES))('$name: ha tutte le chiavi tipografiche', (t) => {
    for (const key of Object.keys(oggi.typography)) expect(t!.typography[key as keyof typeof oggi.typography]).toBeDefined();
  });
});

describe('formatPrice', () => {
  it('scrive i prezzi in formato italiano', () => {
    expect(formatPrice(4200)).toBe('4.200 €');
    expect(formatPrice(950)).toBe('950 €');
    expect(formatPrice(1450.5)).toBe('1.450,50 €');
    expect(formatPrice(1234567)).toBe('1.234.567 €');
    expect(formatPrice(-80)).toBe('-80 €');
  });
});
