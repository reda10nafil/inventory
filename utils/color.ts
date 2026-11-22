// Trasparenza su un colore del tema, al posto di `${colore}20`, che si rompe se il colore non è un esadecimale a 6 cifre.
// Accetta #RGB, #RGBA, #RRGGBB, #RRGGBBAA, rgb() e rgba(); l'alfa si moltiplica per quella che il colore ha già.
// Restituisce `rgba(...)`: per un esadecimale pieno la resa è identica alla concatenazione (es. alfa 0x20 / 255).
export function withAlpha(color: string, alpha: number): string {
  const rgba = parseColor(color);
  if (!rgba) return color;
  const [r, g, b, a] = rgba;
  const out = Math.max(0, Math.min(1, a * alpha));
  return `rgba(${r}, ${g}, ${b}, ${Number(out.toFixed(4))})`;
}

function parseColor(color: string): [number, number, number, number] | null {
  const c = color.trim();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = h.split('').map((x) => x + x).join('');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const fn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c);
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3]), fn[4] === undefined ? 1 : Number(fn[4])];
  return null;
}
