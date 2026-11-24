import { choiceRowSize } from '../utils/fieldValues';
import { RAIL_GAP, railGap, railLastPart, railOffsets, railOpenScroll } from '../utils/choiceRail';

// UX1-0: un campo a scelta col binario in una colonna prende la riga intera; il binario (`ChoiceRail`) taglia l'ultima
// pillola a vista e porta in vista la scelta all'apertura.

describe('riga intera per il binario (richiesta dell\'utente del 24)', () => {
  it('il binario in una colonna da 1/2 o 1/3 si disegna su una riga intera', () => {
    expect(choiceRowSize('medium', 'chips')).toBe('full');
    expect(choiceRowSize('small', 'chips')).toBe('full');
    expect(choiceRowSize('full', 'chips')).toBe('full');
  });

  it('la tendina resta nella colonna; a capo, elenco verticale, ruota ed elenco dal basso come prima', () => {
    for (const look of ['dropdown', 'wrap', 'list', 'wheel', 'sheet'] as const) {
      expect(choiceRowSize('medium', look)).toBe('medium');
      expect(choiceRowSize('small', look)).toBe('small');
      expect(choiceRowSize('full', look)).toBe('full');
    }
  });

  it('i riquadri restano come prima (larghi già da soli, senza cambiare i testi del campo)', () => {
    expect(choiceRowSize('medium', 'tiles')).toBe('medium');
  });
});

describe('binario: ultima pillola tagliata', () => {
  const cut = railLastPart;

  it('le posizioni partono da 0 e sommano larghezza e spazio', () => {
    expect(railOffsets([50, 60, 70], 8)).toEqual([0, 58, 126]);
  });

  it('tutte dentro: lo spazio resta 8', () => {
    expect(railGap([60, 60, 60], 343)).toBe(RAIL_GAP);
    expect(railGap([], 343)).toBe(RAIL_GAP);
    expect(railGap([60, 60], 0)).toBe(RAIL_GAP);
  });

  it('già tagliata a metà: lo spazio resta 8', () => {
    // la quarta parte a 266: se ne vedono 37 px su 90
    expect(railGap([80, 80, 82, 90, 70], 303)).toBe(RAIL_GAP);
  });

  it('ultima quasi tutta dentro: lo spazio si allarga e la taglia', () => {
    const widths = [90, 80, 80, 70, 100];
    expect(cut(widths, 343, RAIL_GAP)).toBeGreaterThan(0.7);
    const gap = railGap(widths, 343);
    expect(gap).toBeGreaterThan(RAIL_GAP);
    expect(gap).toBeLessThanOrEqual(RAIL_GAP * 2);
    expect(cut(widths, 343, gap)).toBeGreaterThanOrEqual(0.3);
    expect(cut(widths, 343, gap)).toBeLessThanOrEqual(0.7);
  });

  it('ultima appena affacciata: si taglia quella prima', () => {
    const widths = [60, 60, 60, 60, 60, 90, 90];
    // la sesta comincia a 340 su 343: se ne vedono 3 px
    expect(cut(widths, 343, RAIL_GAP)).toBeLessThan(0.3);
    const gap = railGap(widths, 343);
    expect(gap).toBeGreaterThan(RAIL_GAP);
    expect(cut(widths, 343, gap)).toBeGreaterThanOrEqual(0.3);
    expect(cut(widths, 343, gap)).toBeLessThanOrEqual(0.7);
  });

  it('ultima appena affacciata con poche pillole prima: lo spazio si stringe fino a 4 (Tipo di pelle in Attuale, 359 px)', () => {
    const widths = [76, 68, 87, 79, 92, 90, 62];
    expect(cut(widths, 359, RAIL_GAP)).toBeLessThan(0.3);
    const gap = railGap(widths, 359);
    expect(gap).toBeLessThan(RAIL_GAP);
    expect(gap).toBeGreaterThanOrEqual(4);
    expect(cut(widths, 359, gap)).toBeGreaterThanOrEqual(0.3);
  });

  it('se nessuno spazio da 4 a 16 la taglia, resta 8', () => {
    expect(railGap([40, 300, 200], 343)).toBe(RAIL_GAP);
    expect(railGap([400, 100], 343)).toBe(RAIL_GAP);
  });
});

describe('binario: la scelta in vista all\'apertura', () => {
  it('nessuna scelta, o scelta già tutta a vista: non scorre', () => {
    expect(railOpenScroll([80, 80, 80, 80, 80, 80], 343, 8, -1)).toBe(0);
    expect(railOpenScroll([80, 80, 80, 80, 80, 80], 343, 8, 1)).toBe(0);
  });

  it('scelta fuori vista o sotto la sfumatura: scorre fino a 24 px prima di lei', () => {
    // la sesta parte a 440
    expect(railOpenScroll([80, 80, 80, 80, 80, 80], 343, 8, 5)).toBe(440 - 24);
    // la quarta finisce a 344, oltre il bordo
    expect(railOpenScroll([80, 80, 80, 80, 80, 80], 343, 8, 3)).toBe(264 - 24);
    // la quarta finisce a 330, sotto la sfumatura (gli ultimi 20 px)
    expect(railOpenScroll([80, 80, 80, 80, 80, 80], 343, 3, 3)).toBe(249 - 24);
    expect(railOpenScroll([80, 80, 80, 80, 80, 80], 370, 8, 3)).toBe(0);
  });
});
