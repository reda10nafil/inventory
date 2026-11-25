/** RFC 4180 compatible CSV helpers for the product import/export workflow. */
// IMP (DATI): il separatore si sceglie («;» di Excel in italiano, riconosciuto da `detectDelimiter` di `csvImport.ts`)
export function stringifyCsv(rows: readonly (readonly unknown[])[], delimiter = ','): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = value == null ? '' : String(value);
          return /["\r\n]/.test(text) || text.includes(delimiter) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(delimiter),
    )
    .join('\r\n');
}

export function parseCsv(input: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('Il file CSV contiene virgolette non chiuse.');
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}
