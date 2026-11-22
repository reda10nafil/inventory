"""Confronta due cartelle di schermate: per ogni PNG stampa la quota di pixel diversi e il riquadro della differenza.
Uso: python -I confronta.py <prima> <dopo> [cartella-diff]. Soglia zero, sul canale più diverso:
il campionario è deterministico, quindi due schermate dello stesso codice sono identiche pixel per pixel."""
import sys
from pathlib import Path
from PIL import Image, ImageChops

a, b = Path(sys.argv[1]), Path(sys.argv[2])
out = Path(sys.argv[3]) if len(sys.argv) > 3 else None
if out:
    out.mkdir(parents=True, exist_ok=True)
for pa in sorted(a.glob('*.png')):
    pb = b / pa.name
    if not pb.exists():
        print(f'{pa.name}: manca in dopo')
        continue
    ia, ib = Image.open(pa).convert('RGB'), Image.open(pb).convert('RGB')
    if ia.size != ib.size:
        print(f'{pa.name}: dimensioni diverse {ia.size} -> {ib.size}')
        w, h = min(ia.width, ib.width), min(ia.height, ib.height)
        ia, ib = ia.crop((0, 0, w, h)), ib.crop((0, 0, w, h))
    r, g, bl = ImageChops.difference(ia, ib).split()
    d = ImageChops.lighter(ImageChops.lighter(r, g), bl).point(lambda v: 255 if v > 0 else 0)
    box = d.getbbox()
    n = sum(1 for v in d.getdata() if v)
    tot = d.width * d.height
    print(f'{pa.name}: {100 * n / tot:.3f}% diversi, riquadro {box}')
    if out and box:
        m = ib.copy()
        red = Image.new('RGB', m.size, (255, 0, 0))
        m.paste(red, mask=d)
        m.save(out / pa.name)
