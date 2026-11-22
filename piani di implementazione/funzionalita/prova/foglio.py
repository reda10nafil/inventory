"""Foglio delle fette M nei 5 stili (solo per sviluppo): righe = schermate, colonne = stili, a metà grandezza.
Uso: python -I foglio.py <cartella delle schermate di stili-fette.cjs> <file .jpg di uscita>
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

src, out = Path(sys.argv[1]), Path(sys.argv[2])
STILI = ['attuale', 'babilonia', 'ishtar', 'ardesia', 'minimal']
nomi = sorted({p.name.split('-', 1)[1] for p in src.glob('attuale-*.png')}, key=lambda s: int(s.split('-')[0]))
W, H, GAP, TOP = 188, 406, 8, 22
foglio = Image.new('RGB', (len(STILI) * (W + GAP) - GAP, len(nomi) * (H + GAP + TOP)), 'white')
d = ImageDraw.Draw(foglio)
for r, nome in enumerate(nomi):
    y = r * (H + GAP + TOP)
    for c, stile in enumerate(STILI):
        x = c * (W + GAP)
        d.text((x + 2, y + 5), f'{stile} · {nome[:-4]}', fill='black')
        f = src / f'{stile}-{nome}'
        if f.exists():
            foglio.paste(Image.open(f).convert('RGB').resize((W, H)), (x, y + TOP))
foglio.save(out, quality=72)
print(out, foglio.size)
