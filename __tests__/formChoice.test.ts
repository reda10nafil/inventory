import { choiceList, isSelected, toggleOption } from '../utils/fieldValues';

// D01: la scelta multipla a riquadri si comporta da multipla (prima i riquadri la trattavano da singola).
// Da VAL (ticket 23) le scelte sono in `utils/fieldValues.ts` e salvano l'id dell'opzione; le etichette salvate prima
// restano riconosciute.
const cappuccio = { id: 'opt_0', label: 'Cappuccio' };
const tasche = { id: 'opt_2', label: 'Tasche' };
const collo = { id: 'opt_3', label: 'Collo sciallato' };
const OPTIONS = [cappuccio, { id: 'opt_1', label: 'Cintura' }, tasche, collo];

describe('scelta multipla (D01)', () => {
  it('aggiunge le opzioni toccate senza togliere le altre', () => {
    const uno = toggleOption(undefined, tasche, OPTIONS, true);
    expect(uno).toEqual(['opt_2']);
    const due = toggleOption(uno, collo, OPTIONS, true);
    expect(due).toEqual(['opt_2', 'opt_3']);
    expect(isSelected(due, tasche, OPTIONS)).toBe(true);
    expect(isSelected(due, collo, OPTIONS)).toBe(true);
    expect(isSelected(due, cappuccio, OPTIONS)).toBe(false);
  });

  it('toglie un\'opzione già scelta, salvata con l\'etichetta o con l\'id', () => {
    expect(toggleOption(['Tasche', 'Collo sciallato'], tasche, OPTIONS, true)).toEqual(['opt_3']);
    expect(toggleOption(['opt_2'], tasche, OPTIONS, true)).toEqual([]);
  });

  it('legge un vecchio valore salvato da singola', () => {
    expect(choiceList('Tasche')).toEqual(['Tasche']);
    expect(choiceList(null)).toEqual([]);
    expect(isSelected('Tasche', tasche, OPTIONS)).toBe(true);
    expect(toggleOption('Tasche', collo, OPTIONS, true)).toEqual(['opt_2', 'opt_3']);
  });
});

describe('scelta singola', () => {
  it('sceglie una sola opzione e la toglie al secondo tocco', () => {
    const scelto = toggleOption(undefined, tasche, OPTIONS, false);
    expect(scelto).toBe('opt_2');
    expect(toggleOption(scelto, collo, OPTIONS, false)).toBe('opt_3');
    expect(toggleOption(scelto, tasche, OPTIONS, false)).toBeNull();
    expect(toggleOption('Tasche', tasche, OPTIONS, false)).toBeNull();
    expect(isSelected('opt_2', tasche, OPTIONS)).toBe(true);
  });
});
