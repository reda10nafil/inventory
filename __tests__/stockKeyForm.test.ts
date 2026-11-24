// S1b (ticket 13): quale forma per le chiavi di `stock` quando la giacenza sta su uno scaffale.
// - Forma 1: l'id dello scaffale da solo («1732…-a1»). Per sapere in che posizione sta serve l'elenco degli scaffali.
// - Forma 2: la posizione e lo scaffale nella chiave («magazzino/1732…-a1»), con `/` come separatore.
// Le tre domande del ticket, più il separatore. La forma 1 è un lettore di prova scritto qui; la forma 2 è quella
// dell'app (`stockKey`, `placeOfKey`, `qtyAt` di utils/stock.ts), scelta per questi test. Resoconto e scelta nel
// ticket 13 e in side-session-notes/…/s1b/forma-chiavi.md.
import type { TimelineEvent } from '../types';
import { newShelfId } from '../utils/shelves';
import { newLocationId, placeOfKey, qtyAt, replayStock, stockKey } from '../utils/stock';

type Stock = Record<string, number>;
type ShelfRef = { id: string; locationId: string };

const A1 = '1732300000000-gen1';
const SHELVES: ShelfRef[] = [{ id: A1, locationId: 'magazzino' }];

// Forma 1 (lettore di prova): una chiave è una posizione oppure l'id di uno scaffale dell'elenco
const forma1 = {
  key: (place: string, shelf?: string) => shelf ?? place,
  placeOf: (key: string, shelves: readonly ShelfRef[]) => shelves.find((s) => s.id === key)?.locationId ?? key,
  qtyAt: (stock: Stock, place: string, shelves: readonly ShelfRef[]) =>
    Object.entries(stock).filter(([k]) => forma1.placeOf(k, shelves) === place).reduce((a, [, q]) => a + q, 0),
};

// Forma 2: le funzioni dell'app (la posizione è la parte prima dell'ultimo `/`; senza `/` la chiave è la posizione)
const forma2 = {
  key: (place: string, shelf?: string) => stockKey(place, shelf),
  placeOf: placeOfKey,
  qtyAt: (stock: Stock, place: string) => qtyAt({ location: 'magazzino', status: 'available', stock }, place),
};

/** 5 pezzi in Magazzino e 3 sullo scaffale A1 di Magazzino, scritti con due carichi «iniziale». */
const prodotto = (key: (place: string, shelf?: string) => string) => {
  const stock: Stock = { [key('magazzino')]: 5, [key('magazzino', A1)]: 3 };
  const events = Object.entries(stock).map(([to, qty]) => ({ type: 'stock' as const, details: { movement: 'carico' as const, qty, to } }));
  return { stock, events: events as Pick<TimelineEvent, 'type' | 'details'>[] };
};

describe('forma delle chiavi, domanda 1: il totale di una posizione si calcola dal solo prodotto?', () => {
  it('forma 1: no, senza l\'elenco degli scaffali Magazzino conta 5 invece di 8', () => {
    const { stock } = prodotto(forma1.key);
    expect(forma1.qtyAt(stock, 'magazzino', SHELVES)).toBe(8);
    expect(forma1.qtyAt(stock, 'magazzino', [])).toBe(5);
  });

  it('forma 2: sì, Magazzino conta 8 anche senza elenco', () => {
    const { stock } = prodotto(forma2.key);
    expect(forma2.qtyAt(stock, 'magazzino')).toBe(8);
  });
});

describe('forma delle chiavi, domanda 2: se uno scaffale cambia posizione, la giacenza si sposta senza un evento?', () => {
  const spostato: ShelfRef[] = [{ id: A1, locationId: 'vetrina' }];

  it('forma 1: sì, 3 pezzi passano da Magazzino a Vetrina senza nessun evento', () => {
    const { stock, events } = prodotto(forma1.key);
    const prima = { magazzino: forma1.qtyAt(stock, 'magazzino', SHELVES), vetrina: forma1.qtyAt(stock, 'vetrina', SHELVES) };
    const dopo = { magazzino: forma1.qtyAt(stock, 'magazzino', spostato), vetrina: forma1.qtyAt(stock, 'vetrina', spostato) };
    expect(prima).toEqual({ magazzino: 8, vetrina: 0 });
    expect(dopo).toEqual({ magazzino: 5, vetrina: 3 });
    // Gli eventi rigiocati danno ancora le stesse chiavi: la differenza per posizione non ha un evento che la spieghi
    const rigiocata = replayStock(events);
    expect(rigiocata).toEqual(stock);
    expect(forma1.qtyAt(rigiocata, 'vetrina', [])).toBe(0);
  });

  it('forma 2: no, la posizione sta nella chiave e i totali restano quelli degli eventi', () => {
    const { stock, events } = prodotto(forma2.key);
    const rigiocata = replayStock(events);
    expect(rigiocata).toEqual(stock);
    expect({ magazzino: forma2.qtyAt(rigiocata, 'magazzino'), vetrina: forma2.qtyAt(rigiocata, 'vetrina') }).toEqual({ magazzino: 8, vetrina: 0 });
  });
});

describe('forma delle chiavi, domanda 3: uno scaffale che un altro dispositivo non conosce', () => {
  it('forma 1: la chiave sembra una posizione sconosciuta e Magazzino perde i suoi 3 pezzi', () => {
    const { stock } = prodotto(forma1.key);
    expect(forma1.placeOf(A1, [])).toBe(A1);
    expect(forma1.qtyAt(stock, 'magazzino', [])).toBe(5);
  });

  it('forma 2: la giacenza resta in Magazzino; manca solo il nome dello scaffale', () => {
    const { stock } = prodotto(forma2.key);
    expect(forma2.placeOf(`magazzino/${A1}`)).toBe('magazzino');
    expect(forma2.qtyAt(stock, 'magazzino')).toBe(8);
  });
});

describe('forma delle chiavi: il separatore', () => {
  // `newLocationId` è la regola di Impostazioni › Posizioni; posizioni predefinite di LocationsContext
  const DEFAULTS = ['magazzino', 'vetrina', 'stand_a', 'stand_b', 'stand_c', 'sartoria'];

  it('non compare negli id delle posizioni create dall\'app né in quelli degli scaffali', () => {
    for (const name of ['Magazzino', 'Stand A/B', 'Retro / Scala', 'Più giù', 'a//b']) expect(newLocationId(name)).not.toContain('/');
    for (const id of DEFAULTS) expect(id).not.toContain('/');
    for (let i = 0; i < 50; i += 1) expect(newShelfId([], 1732300000000 + i, Math.random())).not.toContain('/');
  });

  it('nessun separatore = posizione; con più separatori la posizione è tutto prima dell\'ultimo', () => {
    expect(forma2.placeOf('magazzino')).toBe('magazzino');
    expect(forma2.placeOf(`a/b/${A1}`)).toBe('a/b');
    // Lati vuoti: non è uno scaffale, è la chiave così com'è
    expect(forma2.placeOf('magazzino/')).toBe('magazzino/');
    expect(forma2.placeOf(`/${A1}`)).toBe(`/${A1}`);
  });

  it('costo della forma 2: una chiave «a/b» salvata prima (solo da un CSV scritto a mano) si legge come posizione «a»', () => {
    // La posizione «a/b» non può esistere nell'elenco (vedi sopra): la chiave era già una posizione sconosciuta
    expect(forma2.placeOf('a/b')).toBe('a');
    expect(forma2.qtyAt({ 'a/b': 2 }, 'a')).toBe(2);
  });
});
