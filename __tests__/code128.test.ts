// ETI (ticket 22): Code 128 set B fatto in locale (`utils/code128.ts`), usato dallo schermo e dall'etichetta.
import { code128Bars, code128Encodable, code128Widths } from '../utils/code128';

describe('code128Widths', () => {
  it('«A»: start B, il carattere, la cifra di controllo e lo stop (vettore noto)', () => {
    // Start B = 104, «A» = 33, controllo (104 + 33 × 1) % 103 = 34, stop
    expect(code128Widths('A')?.join('')).toBe('211214' + '111323' + '131123' + '2331112');
  });

  it('larghezza in moduli: 11 per simbolo (start, caratteri, controllo) più 13 dello stop', () => {
    for (const code of ['VIS-0142', 'LOC-MAGAZZINO', 'SCAF-MAG-A1', 'a b~']) {
      const total = (code128Widths(code) ?? []).reduce((a, b) => a + b, 0);
      expect(total).toBe(11 * (code.length + 2) + 13);
    }
  });

  it('un carattere che il Code 128 B non scrive dà nessun codice, non uno spazio (che si leggerebbe come un altro codice)', () => {
    expect(code128Widths('Città')).toBeNull();
    expect(code128Widths('VIS\n0142')).toBeNull();
    expect(code128Widths('')).toBeNull();
    expect(code128Encodable('VIS-0142')).toBe(true);
    expect(code128Encodable('€')).toBe(false);
  });
});

describe('code128Bars', () => {
  it('solo le barre (gli spazi restano bianchi), una dopo l\'altra senza sovrapporsi', () => {
    const code = code128Bars('VIS-0142');
    expect(code).not.toBeNull();
    const { bars, width } = code!;
    expect(width).toBe(11 * 10 + 13);
    // 3 barre per simbolo, 4 nello stop
    expect(bars).toHaveLength(3 * 10 + 4);
    for (let i = 1; i < bars.length; i += 1) expect(bars[i].x).toBeGreaterThan(bars[i - 1].x + bars[i - 1].w - 1);
    expect(bars[bars.length - 1].x + bars[bars.length - 1].w).toBe(width);
  });

  it('nessuna barra per un testo che non si può scrivere', () => {
    expect(code128Bars('Città')).toBeNull();
  });
});
