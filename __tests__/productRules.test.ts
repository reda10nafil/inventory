import { canMove, canSell } from '../utils/productRules';

const p = (extra: object = {}) => ({ status: 'available' as const, location: 'vetrina', ...extra });

describe('canSell (P05, P06)', () => {
  it('vende un prodotto disponibile', () => expect(canSell(p())).toBe(true));
  it('non rivende un prodotto venduto', () => expect(canSell(p({ status: 'sold' }))).toBe(false));
  it('non vende dal cestino', () => expect(canSell(p({ deletedAt: '2026-11-21' }))).toBe(false));
  it('non vende un prodotto che non c\'è', () => expect(canSell(undefined)).toBe(false));
});

describe('canMove', () => {
  it('sposta in un\'altra posizione', () => expect(canMove(p(), 'magazzino')).toBe(true));
  it('non sposta nella stessa posizione', () => expect(canMove(p(), 'vetrina')).toBe(false));
  it('non sposta dal cestino', () => expect(canMove(p({ deletedAt: 'x' }), 'magazzino')).toBe(false));
});
