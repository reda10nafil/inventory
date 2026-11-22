"""Fogli di confronto per il resoconto (lavoro L9) - solo per sviluppo, NON fa parte dell'app.
Per ogni schermata del campionario mette affiancate la «prima» e le «dopo» nei 5 stili, a 375 px di larghezza
ciascuna, e salva un JPEG leggero (adatto al repository pubblico).
Uso: python -I affianca.py <cartella prima> <cartella con una sottocartella per stile> <cartella di uscita>
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

prima, dopo, out = (Path(a) for a in sys.argv[1:4])
STILI = ['attuale', 'babilonia', 'ishtar', 'ardesia', 'minimal']
NOMI = {'attuale': 'Attuale rifinito', 'babilonia': 'Babilonia Vetro', 'ishtar': 'Ishtar Lab',
        'ardesia': 'Ardesia e rame', 'minimal': 'Minimal'}
SCHERMATE = ['01-inventario', '02-scheda', '03-aggiungi', '04-cronologia', '05-modifica', '06-impostazioni',
             '07-campi', '08-layout-builder', '09-automazioni']
W, H, GAP, TOP = 375, 812, 12, 28
out.mkdir(parents=True, exist_ok=True)

for nome in SCHERMATE:
    colonne = [('Prima', prima / f'{nome}.png')] + [(NOMI[s], dopo / s / f'{nome}.png') for s in STILI]
    foglio = Image.new('RGB', (len(colonne) * W + (len(colonne) - 1) * GAP, H + TOP), 'white')
    disegno = ImageDraw.Draw(foglio)
    for i, (titolo, file) in enumerate(colonne):
        x = i * (W + GAP)
        disegno.text((x + 4, 8), titolo, fill='black')
        if file.exists():
            im = Image.open(file).convert('RGB')
            im = im.resize((W, round(im.height * W / im.width)))
            foglio.paste(im.crop((0, 0, W, H)), (x, TOP))
        else:
            disegno.text((x + 4, TOP + 8), 'manca', fill='red')
    foglio.save(out / f'{nome}.jpg', quality=82, optimize=True)
    print('ok', nome)
