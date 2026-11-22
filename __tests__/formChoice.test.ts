import { choiceList, isChoiceSelected, toggleChoice } from '../components/ui/formStyles';

// D01: la scelta multipla a riquadri si comporta da multipla (prima i riquadri la trattavano da singola).
const tasche = { id: 'opt_2', label: 'Tasche' };
const collo = { id: 'opt_3', label: 'Collo sciallato' };

describe('scelta multipla (D01)', () => {
  it('aggiunge le opzioni toccate senza togliere le altre', () => {
    const uno = toggleChoice(undefined, tasche, true);
    expect(uno).toEqual(['Tasche']);
    const due = toggleChoice(uno, collo, true);
    expect(due).toEqual(['Tasche', 'Collo sciallato']);
    expect(isChoiceSelected(due, tasche, true)).toBe(true);
    expect(isChoiceSelected(due, collo, true)).toBe(true);
  });

  it('toglie un\'opzione già scelta, anche se salvata con l\'id', () => {
    expect(toggleChoice(['Tasche', 'Collo sciallato'], tasche, true)).toEqual(['Collo sciallato']);
    expect(toggleChoice(['opt_2'], tasche, true)).toEqual([]);
  });

  it('legge un vecchio valore salvato da singola', () => {
    expect(choiceList('Tasche')).toEqual(['Tasche']);
    expect(choiceList(null)).toEqual([]);
    expect(isChoiceSelected('Tasche', tasche, true)).toBe(true);
    expect(toggleChoice('Tasche', collo, true)).toEqual(['Tasche', 'Collo sciallato']);
  });
});

describe('scelta singola', () => {
  it('sceglie una sola opzione e la toglie al secondo tocco', () => {
    const scelto = toggleChoice(undefined, tasche, false);
    expect(scelto).toBe('Tasche');
    expect(toggleChoice(scelto, collo, false)).toBe('Collo sciallato');
    expect(toggleChoice(scelto, tasche, false)).toBeNull();
    expect(isChoiceSelected('opt_2', tasche, false)).toBe(true);
  });
});
