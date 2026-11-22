# Campionario di prova (ticket 03) - solo per sviluppo, NON fa parte dell'app.
# Crea seed.json: campi personalizzati, layout, cartelle, 6 capi con foto (data URI), cronologia.
# Uso: python build-seed.py  ->  poi seed-web.js lo scrive nello storage del browser (spazio "local").
import base64, io, json, os
from datetime import datetime, timedelta, timezone
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FOTO = os.path.join(HERE, 'foto', 'quadrate')
NOW = datetime.now(timezone.utc)

def iso(days_ago=0, hours=0):
    return (NOW - timedelta(days=days_ago, hours=hours)).isoformat().replace('+00:00', 'Z')

def data_uri(name, size=(480, 600), q=74):
    im = Image.open(os.path.join(FOTO, name)).convert('RGB').resize(size, Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

SYSTEM_FIELDS = [
    dict(id='images', name='Foto Prodotto', type='images', uiType='images', required=False, order=0, isSystem=True, icon='add-photo-alternate'),
    dict(id='sku', name='SKU / Codice', type='text_short', uiType='text', required=True, order=1, isSystem=True, icon='qr-code'),
    dict(id='furType', name='Tipo Pelle', type='text_short', uiType='text', required=True, order=2, isSystem=True, icon='category'),
    dict(id='location', name='Posizione', type='text_short', uiType='text', required=True, order=3, isSystem=True, icon='place'),
    dict(id='folder', name='Cartella', type='text_short', uiType='text', required=False, order=4, isSystem=True, icon='folder'),
    dict(id='purchasePrice', name='Prezzo Acquisto', type='currency', uiType='text', required=False, order=5, isSystem=True, icon='shopping-cart'),
    dict(id='sellPrice', name='Prezzo Vendita', type='currency', uiType='text', required=False, order=6, isSystem=True, icon='sell'),
    dict(id='length', name='Lunghezza', type='number', uiType='text', required=False, order=7, isSystem=True, icon='straighten', unit='cm'),
    dict(id='width', name='Larghezza', type='number', uiType='text', required=False, order=8, isSystem=True, icon='straighten', unit='cm'),
    dict(id='weight', name='Peso', type='number', uiType='text', required=False, order=9, isSystem=True, icon='fitness-center', unit='kg'),
    dict(id='technicalNotes', name='Note Tecniche', type='text_long', uiType='text', required=False, order=10, isSystem=True, icon='notes'),
]

def opts(*labels):
    return list(labels), [dict(id=f'opt_{i}', label=l) for i, l in enumerate(labels)]

def cf(n, fid, name, type_, ui, icon, **kw):
    f = dict(id=fid, name=name, type=type_, uiType=ui, dataset=kw.pop('dataset', None), required=kw.pop('required', False),
             icon=icon, order=11 + n, isSystem=False)
    f.update(kw)
    return f

ds, op = {}, {}
ds['taglia'], op['taglia'] = opts('XS', 'S', 'M', 'L', 'XL')
ds['cond'], op['cond'] = opts('Nuovo', 'Ottimo', 'Buono')
ds['colore'], op['colore'] = opts('Nero', 'Marrone', 'Grigio perla', 'Naturale', 'Bianco')
ds['lav'], op['lav'] = opts('Pelle intera', 'Lasciata fuori', 'A strisce', 'Intarsio')
ds['dett'], op['dett'] = opts('Cappuccio', 'Cintura', 'Tasche', 'Collo sciallato')
ds['tratt'], op['tratt'] = opts('Pulizia', 'Lucidatura', 'Riparazione fodera', 'Accorciatura')

CUSTOM = [
    cf(0, 'field_cmp_spessore', 'Spessore', 'number', 'text', 'layers', unit='mm'),
    cf(1, 'field_cmp_pezzi', 'Pezzi', 'number', 'stepper', 'inventory', dataset=dict(min=1, max=20, step=1)),
    cf(2, 'field_cmp_riparazione', 'Costo riparazione', 'currency', 'text', 'attach-money', unit='€'),
    cf(3, 'field_cmp_arrivo', 'Data di arrivo in negozio', 'date', 'date', 'calendar-today'),
    cf(4, 'field_cmp_fornitore', 'Fornitore', 'text_short', 'text', 'local-shipping'),
    cf(5, 'field_cmp_cites', 'Codice CITES', 'text_short', 'text', 'qr-code', isBarcode=True),
    cf(6, 'field_cmp_storia', 'Storia, provenienza e lavorazioni precedenti del capo', 'text_long', 'text', 'description'),
    cf(7, 'field_cmp_fotodett', 'Foto dettagli', 'images', 'images', 'image'),
    cf(8, 'field_cmp_taglia', 'Taglia', 'single_choice', 'grid', 'straighten', dataset=ds['taglia'], options=op['taglia'], required=True),
    cf(9, 'field_cmp_cond', 'Condizione', 'single_choice', 'segmented', 'verified', dataset=ds['cond'], options=op['cond']),
    cf(10, 'field_cmp_colore', 'Colore', 'single_choice', 'picker', 'palette', dataset=ds['colore'], options=op['colore']),
    cf(11, 'field_cmp_lav', 'Lavorazione', 'single_choice', 'modal_list', 'brush', dataset=ds['lav'], options=op['lav']),
    cf(12, 'field_cmp_dett', 'Dettagli', 'multi_choice', 'grid', 'style', dataset=ds['dett'], options=op['dett']),
    cf(13, 'field_cmp_tratt', 'Trattamenti eseguiti', 'multi_choice', 'modal_list', 'science', dataset=ds['tratt'], options=op['tratt']),
    cf(14, 'field_cmp_consegna', 'Posizione di consegna', 'single_choice', 'picker', 'place', linkTo='locations'),
    cf(15, 'field_cmp_cert', 'Certificato di origine e autenticità', 'document', 'document', 'description'),
]
F = {f['id']: f for f in CUSTOM}

def L(id_, size, type_='custom', **kw):
    d = dict(id=id_, type=type_, size=size, visible=True); d.update(kw); return d

LAYOUT = dict(version=4, fields=[
    L('images', 'full', 'base'),
    L('section_prodotto', 'full', 'section', label='DATI PRODOTTO'),
    L('sku', 'full', 'base'), L('furType', 'full', 'base'),
    L('location', 'medium', 'base'), L('folder', 'medium', 'base'),
    L('section_economici', 'full', 'section', label='DATI ECONOMICI'),
    L('purchasePrice', 'medium', 'base'), L('sellPrice', 'medium', 'base'),
    L('section_misure', 'full', 'section', label='MISURE'),
    L('length', 'small', 'base'), L('width', 'small', 'base'), L('weight', 'small', 'base'),
    L('section_capo', 'full', 'section', label='DETTAGLI DEL CAPO'),
    L('field_cmp_pezzi', 'small'), L('field_cmp_arrivo', 'small'), L('field_cmp_spessore', 'small'),
    L('field_cmp_colore', 'medium'), L('field_cmp_lav', 'medium'),
    L('field_cmp_fornitore', 'medium'), L('field_cmp_riparazione', 'medium'),
    L('field_cmp_taglia', 'full'), L('field_cmp_cond', 'medium'),
    L('field_cmp_cites', 'full'),
    L('field_cmp_dett', 'full'), L('field_cmp_tratt', 'medium'), L('field_cmp_consegna', 'medium'),
    L('section_documenti', 'full', 'section', label='DOCUMENTI E FOTO'),
    L('field_cmp_fotodett', 'full'), L('field_cmp_cert', 'full'),
    L('section_note', 'full', 'section', label='NOTE'),
    L('technicalNotes', 'full', 'base'), L('field_cmp_storia', 'full'),
])

LIBRARIES = [
    dict(id='pellicce', name='Pellicce', icon='inventory', createdAt=iso(400)),
    dict(id='collezione-inverno', name='Collezione Inverno', icon='store', createdAt=iso(120)),
    dict(id='usato-e-permute', name='Usato e permute', icon='shopping-bag', createdAt=iso(60)),
]

img = {n: data_uri(n + '.jpg') for n in ['visone-zaffiro', 'volpe-rossa', 'lince', 'astrakan-swakara', 'visone-aleutian', 'puzzola']}
thumb = {n: data_uri(n + '.jpg', (240, 300), 70) for n in ['visone-aleutian', 'lince']}

def cd(fid, value):
    return dict(value=value, fieldSnapshot=F[fid])

def product(i, sku, fur, loc, lib, photos, created, **kw):
    p = dict(id=f'cmp-{i}', sku=sku, furType=fur, location=loc, status='available', images=photos, libraryId=lib,
             customData=[], createdAt=iso(created), updatedAt=iso(kw.pop('updated', created)))
    p.update(kw)
    return p

P = [
    product(1, 'VIS-0142', 'visone', 'vetrina', 'collezione-inverno',
            [img['visone-zaffiro'], img['visone-aleutian'], img['lince']], 12, updated=2,
            purchasePrice=1800, sellPrice=4200, length=115, width=60, weight=2.1,
            technicalNotes='Fodera in seta rifatta. Bottoni originali in corno. Controllare la cucitura sotto la manica sinistra.',
            gs1DigitalLink='https://syncroflow.app/id/01/VIS-0142/21/000142',
            customData=[
                cd('field_cmp_taglia', 'M'), cd('field_cmp_cond', 'Ottimo'), cd('field_cmp_colore', 'Grigio perla'),
                cd('field_cmp_lav', 'Lasciata fuori'), cd('field_cmp_pezzi', 2), cd('field_cmp_arrivo', iso(12)),
                cd('field_cmp_spessore', '3'), cd('field_cmp_fornitore', 'Pellicceria Bianchi, Milano'),
                cd('field_cmp_riparazione', '180'), cd('field_cmp_cites', 'IT-CITES-2026-004512'),
                cd('field_cmp_dett', ['Collo sciallato', 'Tasche', 'Cintura']),
                cd('field_cmp_tratt', ['Pulizia', 'Riparazione fodera']), cd('field_cmp_consegna', 'Sartoria'),
                cd('field_cmp_fotodett', [thumb['visone-aleutian'], thumb['lince']]),
                cd('field_cmp_cert', ['file:///documenti/Certificato_origine_VIS-0142.pdf', 'file:///documenti/Ricevuta_acquisto_2026.pdf']),
                cd('field_cmp_storia', 'Acquistato da un privato nel 2019, accorciato di 8 cm nel 2023. Pelle scandinava, conciatura originale.'),
            ]),
    product(2, 'VOL-0087', 'volpe', 'stand_a', 'pellicce', [img['volpe-rossa']], 40, updated=3,
            status='sold', soldAt=iso(3), purchasePrice=900, sellPrice=2600, length=120, width=58, weight=1.6,
            customData=[cd('field_cmp_taglia', 'L'), cd('field_cmp_colore', 'Naturale'), cd('field_cmp_pezzi', 1)]),
    product(3, 'LIN-0021', 'altro', 'stand_b', 'collezione-inverno', [img['lince']], 25, updated=5,
            purchasePrice=2400, sellPrice=5900, length=98, width=62, weight=1.9,
            customData=[cd('field_cmp_taglia', 'S'), cd('field_cmp_cond', 'Nuovo'), cd('field_cmp_arrivo', iso(25))]),
    product(4, 'AST-0033', 'astrakan', 'sartoria', 'usato-e-permute', [img['astrakan-swakara']], 18, updated=1,
            purchasePrice=650, sellPrice=1450, length=105, width=55, weight=1.4,
            technicalNotes='In sartoria per sostituire la fodera.',
            customData=[cd('field_cmp_tratt', ['Riparazione fodera']), cd('field_cmp_riparazione', '95')]),
    product(5, 'VIS-0098', 'visone', 'magazzino', 'pellicce', [img['visone-aleutian']], 210, updated=200,
            purchasePrice=1500, sellPrice=3800, length=110, width=60, weight=2.0,
            customData=[cd('field_cmp_taglia', 'M'), cd('field_cmp_colore', 'Marrone')]),
    product(6, 'PUZ-0012', 'altro', 'stand_c', 'pellicce', [img['puzzola']], 7, updated=7,
            purchasePrice=700, sellPrice=1900, length=118, width=57, weight=1.7),
]

def ev(i, pid, t, days, **details):
    return dict(id=f'cmp-ev-{i}', productId=pid, type=t, timestamp=iso(days), details=details)

TIMELINE = [
    ev(1, 'cmp-5', 'created', 210), ev(2, 'cmp-2', 'created', 40), ev(3, 'cmp-3', 'created', 25),
    ev(4, 'cmp-4', 'created', 18), ev(5, 'cmp-1', 'created', 12), ev(6, 'cmp-6', 'created', 7),
    ev(7, 'cmp-1', 'moved', 6, **{'from': 'Magazzino', 'to': 'Vetrina'}),
    ev(8, 'cmp-4', 'moved', 4, **{'from': 'Stand B', 'to': 'Sartoria'}),
    ev(9, 'cmp-2', 'sold', 3, finalPrice=2550),
    ev(10, 'cmp-1', 'modified', 2, changes=['Prezzo vendita: 3900 → 4200']),
    ev(11, 'cmp-1', 'photo_added', 2, photoCount=2),
]

seed = {
    'furinventory_custom_fields': SYSTEM_FIELDS + CUSTOM,
    'furinventory_layout_config': LAYOUT,
    'inventory:v1:{org}:products': P,
    'inventory:v1:{org}:timeline': sorted(TIMELINE, key=lambda e: e['timestamp'], reverse=True),
    'inventory:v1:{org}:libraries': LIBRARIES,
}
with open(os.path.join(HERE, 'seed.json'), 'w', encoding='utf-8') as fh:
    json.dump(seed, fh, ensure_ascii=False)
print('seed.json', os.path.getsize(os.path.join(HERE, 'seed.json')), 'byte;', len(CUSTOM), 'campi;', len(P), 'capi')
