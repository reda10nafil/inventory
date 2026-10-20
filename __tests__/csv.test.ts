import { parseCsv, stringifyCsv } from '../utils/csv';

describe('CSV helpers', () => {
  it('round-trips commas, quotes, line breaks, and Unicode', () => {
    const rows = [
      ['SKU', 'Note', 'Foto'],
      ['LOG-2026-001', 'prima riga, con "virgolette"\nseconda riga', 'https://drive.google.com/file?id=1'],
      ['PEL-2', 'Pelliccia — prova', ''],
    ];

    expect(parseCsv(stringifyCsv(rows))).toEqual(rows);
  });

  it('accepts CRLF and skips empty trailing rows', () => {
    expect(parseCsv('SKU,Note\r\nA-1,ok\r\n\r\n')).toEqual([
      ['SKU', 'Note'],
      ['A-1', 'ok'],
    ]);
  });

  it('rejects unclosed quoted fields', () => {
    expect(() => parseCsv('SKU,Note\nA-1,"test')).toThrow('virgolette non chiuse');
  });
});
