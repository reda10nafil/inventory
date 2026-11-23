// IND-P5 (ticket 28): passi della Conta e uscita col tasto Indietro di sistema.
import { countLeave, hasWrittenCounts, previousCountStep } from '../utils/countBack';

describe('countBack (IND-P5)', () => {
  it('passo precedente: riepilogo → elenco → posizione; dalla posizione e dall\'esito si esce', () => {
    expect(previousCountStep('summary')).toBe('count');
    expect(previousCountStep('count')).toBe('place');
    expect(previousCountStep('place')).toBeNull();
    expect(previousCountStep('done')).toBeNull();
  });

  it('quantità scritte: contano anche quelle non valide, non le vuote', () => {
    expect(hasWrittenCounts({})).toBe(false);
    expect(hasWrittenCounts({ a: '', b: '   ' })).toBe(false);
    expect(hasWrittenCounts({ a: '', b: '3' })).toBe(true);
    expect(hasWrittenCounts({ a: 'tre' })).toBe(true);
    expect(hasWrittenCounts({ a: '0' })).toBe(true);
  });

  it('uscita: dentro la Conta si torna di un passo, dalla posizione con quantità si chiede, altrimenti si esce', () => {
    expect(countLeave('summary', true)).toBe('step');
    expect(countLeave('count', false)).toBe('step');
    expect(countLeave('count', true)).toBe('step');
    expect(countLeave('place', true)).toBe('ask');
    expect(countLeave('place', false)).toBe('leave');
    // all'esito la conta è già registrata: si esce senza domanda
    expect(countLeave('done', true)).toBe('leave');
    expect(countLeave('done', false)).toBe('leave');
  });
});
