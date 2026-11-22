import { DEFAULT_GS1_CONFIG, keepGS1DigitalLink, parseGS1DigitalLink } from '../utils/gs1';

const cfg = { ...DEFAULT_GS1_CONFIG, baseUrl: 'https://syncroflow.app/id', serialMode: 'progressive' as const };
const link = 'https://syncroflow.app/id/01/VIS-0142/21/000142';

describe('parseGS1DigitalLink', () => {
  it('legge GTIN, seriale e lotto', () => {
    expect(parseGS1DigitalLink(`${link}?10=L%202026`)).toEqual({ gtin: 'VIS-0142', serial: '000142', lotto: 'L 2026' });
    expect(parseGS1DigitalLink('https://x.it/01/ABC')).toEqual({ gtin: 'ABC', serial: undefined, lotto: undefined });
  });
});

describe('keepGS1DigitalLink (P01)', () => {
  it('stesso SKU e nessun lotto: il link non cambia', () => {
    expect(keepGS1DigitalLink(cfg, link, 'VIS-0142', 6)).toBe(link);
    expect(keepGS1DigitalLink({ ...cfg, serialMode: 'uuid' }, link, ' VIS-0142 ', 6)).toBe(link);
  });

  it('il dominio cambiato dopo non tocca i link già fatti', () => {
    expect(keepGS1DigitalLink({ ...cfg, baseUrl: 'https://altro.it' }, link, 'VIS-0142', 6)).toBe(link);
  });

  it('SKU cambiato: stesso seriale, SKU nuovo', () => {
    expect(keepGS1DigitalLink(cfg, link, 'VIS-0143', 6)).toBe('https://syncroflow.app/id/01/VIS-0143/21/000142');
  });

  it('lotto cambiato: stesso seriale, lotto nuovo', () => {
    const c = { ...cfg, enableLotto: true, lottoFieldId: 'f' };
    expect(keepGS1DigitalLink(c, link, 'VIS-0142', 6, 'A1')).toBe(`${link}?10=A1`);
    expect(keepGS1DigitalLink(c, `${link}?10=A1`, 'VIS-0142', 6, 'A1')).toBe(`${link}?10=A1`);
  });

  it('senza link: lo crea come Aggiungi', () => {
    expect(keepGS1DigitalLink(cfg, undefined, 'NEW-1', 6)).toBe('https://syncroflow.app/id/01/NEW-1/21/000007');
  });
});
