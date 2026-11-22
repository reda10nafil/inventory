// Numeri scritti dall'utente in formato italiano: la virgola è il separatore dei decimali.
// «2,5» → 2.5; «4.500» → 4500; «4.500,50» → 4500.5; «2.1» (vecchi valori o CSV) → 2.1.
// Prima Aggiungi e Modifica usavano parseFloat: «2,5» diventava 2 e «4.500» diventava 4,5 (P03).

const THOUSANDS = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;

export function parseNumber(input: string | number | null | undefined): number | undefined {
  if (input == null) return undefined;
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
  let s = input.trim().replace(/\s|€/g, '');
  if (!s) return undefined;
  if (THOUSANDS.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) {
    if (s.includes('.')) return undefined; // «1.2,3»: forma ambigua, meglio non indovinare
    s = s.replace(',', '.');
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return undefined;
  const value = Number(s);
  return Number.isFinite(value) ? value : undefined;
}

/** Numero da mostrare: «2,1», «1.250», «1.250,5» (P19: la Scheda scriveva «2.1 kg»). Fino a 3 decimali. */
export function formatNumber(value: number): string {
  const rounded = Math.round(Math.abs(value) * 1000) / 1000;
  const [int, dec] = String(rounded).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}${grouped}${dec ? `,${dec}` : ''}`;
}

/** Valore da mettere in un campo del modulo: virgola come decimale, senza separatore delle migliaia. */
export function formatNumberInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  return String(value).replace('.', ',');
}
