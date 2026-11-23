// Link GS1 salvati (P01, poi COD: NG02, NG27, vincolo 5 di map-3): la Modifica non li crea e non li riscrive più
// (prima `keepGS1DigitalLink` li ricostruiva con un lotto o uno SKU nuovi e li creava per i prodotti senza). Qui: il
// lettore unico legge i link di ogni versione, anche dopo un cambio di SKU, e Aggiungi li crea come prima.
import { DEFAULT_GS1_CONFIG, generateGS1DigitalLink } from '../utils/gs1';
import { gs1LinkParts, resolveCode } from '../utils/codes';

const cfg = { ...DEFAULT_GS1_CONFIG, baseUrl: 'https://syncroflow.app/id', serialMode: 'progressive' as const };
const link = 'https://syncroflow.app/id/01/VIS-0142/21/000142';

describe('gs1LinkParts (prima parseGS1DigitalLink)', () => {
  it('legge GTIN, seriale e lotto, anche in ?10= e con un altro dominio', () => {
    expect(gs1LinkParts(`${link}?10=L%202026`)).toEqual({ gtin: 'VIS-0142', serial: '000142', lot: 'L 2026' });
    expect(gs1LinkParts('https://x.it/01/ABC')).toEqual({ gtin: 'ABC' });
    expect(gs1LinkParts('https://altro.it/negozio/01/VIS-0142/10/L1/21/000142')).toEqual({ gtin: 'VIS-0142', lot: 'L1', serial: '000142' });
  });

  it('un % rotto o un testo che non è un link non fanno errori', () => {
    expect(gs1LinkParts('https://x.it/01/AB%E0%A4%A/21/%')).toEqual({ gtin: 'AB%E0%A4%A', serial: '%' });
    expect(gs1LinkParts('VIS-0142')).toBeNull();
    expect(gs1LinkParts('https://x.it/prodotti/VIS-0142')).toBeNull();
  });
});

describe('link salvati: si leggono sempre e non si riscrivono', () => {
  it('lotto acceso dopo (link vecchio senza lotto) e link con ?10=: stesso prodotto', () => {
    const products = [{ id: 'cmp-1', sku: 'VIS-0142', gs1DigitalLink: link }];
    expect(resolveCode(link, { products })).toEqual({ status: 'found', kind: 'product', id: 'cmp-1' });
    expect(resolveCode(`${link}?10=Pellicceria%20Bianchi%2C%20Milano`, { products })).toEqual({ status: 'found', kind: 'product', id: 'cmp-1' });
  });

  it('SKU cambiato dopo la stampa: il link salvato (con lo SKU vecchio) apre ancora il prodotto', () => {
    const products = [{ id: 'cmp-1', sku: 'VIS-0143', gs1DigitalLink: link }];
    expect(resolveCode(link, { products })).toEqual({ status: 'found', kind: 'product', id: 'cmp-1' });
    expect(resolveCode('https://altro.it/01/VIS-0142/21/000142', { products })).toEqual({ status: 'found', kind: 'product', id: 'cmp-1' });
    // senza seriale (seriale spento in Impostazioni): il GTIN del link salvato
    const senza = [{ id: 'cmp-1', sku: 'VIS-0143', gs1DigitalLink: 'https://syncroflow.app/id/01/VIS-0142' }];
    expect(resolveCode('https://syncroflow.app/id/01/VIS-0142', { products: senza })).toEqual({ status: 'found', kind: 'product', id: 'cmp-1' });
    expect(resolveCode('https://x.it/01/VIS-0142', { products: senza })).toEqual({ status: 'found', kind: 'product', id: 'cmp-1' });
  });

  it('Aggiungi crea il link come prima (la Modifica no)', () => {
    expect(generateGS1DigitalLink(cfg, 'NEW-1', 6)).toBe('https://syncroflow.app/id/01/NEW-1/21/000007');
    expect(generateGS1DigitalLink({ ...cfg, enableSerial: false }, ' NEW-1 ', 6)).toBe('https://syncroflow.app/id/01/NEW-1');
  });
});
