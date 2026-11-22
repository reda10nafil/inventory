"""Genera constants/themes/<stile>.ts dai 93 token di token-stili.json e stampa i contrasti principali.
Uso (dalla radice): python -I "piani di implementazione/ui-ux/temi/genera_temi.py" "piani di implementazione/ui-ux/temi/token-stili.json" constants/themes attuale
(senza stile li genera tutti e 5). Stampa anche i contrasti principali di ogni stile."""
import json
import re
import sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2])
only = sys.argv[3:]
stili = json.load(open(src, encoding='utf-8'))['stili']

FONT_FILES = {
    'Inter': {'400': 'Inter_400Regular', '500': 'Inter_500Medium', '600': 'Inter_600SemiBold', '700': 'Inter_700Bold', '800': 'Inter_800ExtraBold'},
    'Outfit': {'400': 'Outfit_400Regular', '500': 'Outfit_500Medium', '600': 'Outfit_600SemiBold', '700': 'Outfit_700Bold', '800': 'Outfit_800ExtraBold'},
    'Urbanist': {'400': 'Urbanist_400Regular', '500': 'Urbanist_500Medium', '600': 'Urbanist_600SemiBold', '700': 'Urbanist_700Bold', '800': 'Urbanist_800ExtraBold'},
    'Manrope': {'400': 'Manrope_400Regular', '500': 'Manrope_500Medium', '600': 'Manrope_600SemiBold', '700': 'Manrope_700Bold', '800': 'Manrope_800ExtraBold'},
}
# Peso più alto che ogni stile usa nella tela (i pesi del codice oltre questo diventano questo).
MAX_WEIGHT = {'babilonia': '600', 'ishtar': '700', 'attuale': '600', 'ardesia': '700', 'minimal': '600'}
DATA = {'warehouse': '#3B82F6', 'showcase': '#D4AF37', 'workshop': '#8B5CF6', 'stand': '#10B981'}


def rgba(c):
    c = c.strip()
    m = re.fullmatch(r'#([0-9a-fA-F]{6})', c)
    if m:
        h = m.group(1)
        return [int(h[i:i + 2], 16) for i in (0, 2, 4)] + [1.0]
    m = re.fullmatch(r'rgba?\(([^)]*)\)', c)
    if m:
        p = [x.strip() for x in m.group(1).split(',')]
        return [float(p[0]), float(p[1]), float(p[2]), float(p[3]) if len(p) > 3 else 1.0]
    raise ValueError(c)


def over(top, bottom):
    a = top[3]
    return [top[i] * a + bottom[i] * (1 - a) for i in range(3)] + [1.0]


def mix(a, b, w):
    return [a[i] * (1 - w) + b[i] * w for i in range(3)] + [1.0]


def hexc(c):
    return '#' + ''.join(f'{round(v):02X}' for v in c[:3])


def norm(c):
    """Colore della tela in forma RN: esadecimale o rgba() con alfa decimale."""
    c = c.strip()
    if c == 'transparent':
        return c
    v = rgba(c)
    if v[3] >= 1:
        return hexc(v)
    a = ('%.3f' % v[3]).rstrip('0').rstrip('.')
    return f'rgba({int(v[0])},{int(v[1])},{int(v[2])},{a})'


def border_color(b):
    b = b.strip()
    if b in ('0', 'none'):
        return None
    m = re.fullmatch(r'1px solid (.+)', b)
    return norm(m.group(1))


def px(v):
    v = v.strip()
    if v in ('0', 'none'):
        return 0
    m = re.fullmatch(r'(-?[\d.]+)px', v)
    n = float(m.group(1))
    return 9999 if n >= 999 else (int(n) if n == int(n) else n)


def em(v, size):
    v = v.strip()
    if v == '0':
        return 0
    return round(float(v.replace('em', '')) * size, 2)


def gradient(v):
    m = re.fullmatch(r'linear-gradient\((\d+)deg,(.+)\)', v.strip())
    if not m:
        return None
    angle = int(m.group(1))
    parts = re.findall(r'(#[0-9A-Fa-f]{6}|rgba?\([^)]*\))\s*(\d+%)?', m.group(2))
    colors = [norm(c) for c, _ in parts]
    locs = [int(p[:-1]) / 100 for _, p in parts if p]
    g = {'colors': colors, 'angle': angle}
    if len(locs) == len(colors):
        g['locations'] = locs
    return g


def fill(v):
    """Riempimento: colore pieno (ultimo colore della sfumatura) + sfumatura facoltativa."""
    g = gradient(v)
    if g:
        return g['colors'][-1], g
    return norm(v), None


def shadow(v):
    v = v.strip()
    if v == 'none':
        return {}
    return {'boxShadow': v}


def glows(bg_img):
    res = []
    for m in re.finditer(r'radial-gradient\((\d+)px (\d+)px at ([\d.]+)% ([\d.]+)%,(rgba\([^)]*\)),transparent (\d+)%\)', bg_img):
        # in `radial-gradient(420px 380px at …)` le due misure sono i raggi dell'ellisse (non i diametri)
        res.append({'x': float(m.group(3)) / 100, 'y': float(m.group(4)) / 100, 'rx': int(m.group(1)),
                    'ry': int(m.group(2)), 'color': norm(m.group(5)), 'stop': int(m.group(6)) / 100})
    return res


def contrast(fg, bg):
    def lum(c):
        r = []
        for v in c[:3]:
            v = v / 255
            r.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
        return 0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2]
    a, b = lum(fg), lum(bg)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)


def ts(v, ind=0):
    """Oggetto Python → letterale TypeScript leggibile."""
    pad = '  ' * ind
    if isinstance(v, dict):
        if not v:
            return '{}'
        items = [f"{pad}  {k if re.fullmatch(r'[A-Za-z_]\w*', k) else repr(k)}: {ts(x, ind + 1)}," for k, x in v.items()]
        return '{\n' + '\n'.join(items) + f'\n{pad}}}'
    if isinstance(v, list):
        if all(not isinstance(x, (dict, list)) for x in v):
            return '[' + ', '.join(ts(x) for x in v) + ']'
        return '[\n' + '\n'.join(f'{pad}  {ts(x, ind + 1)},' for x in v) + f'\n{pad}]'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if v is None:
        return 'null'
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "\\'") + "'"


def build(sid, s):
    k = s['token']
    bg = rgba(k['bg'])
    surface_opaque = over(rgba(k['surface']), bg)
    text = rgba(k['text'])
    dark = sum(bg[:3]) / 3 < 128
    fam = k['font'].split(',')[0]
    mx = MAX_WEIGHT[sid]
    files = {w: FONT_FILES[fam][min(w, mx)] for w in ('400', '500', '600', '700', '800')}
    btn, g_btn = fill(k['btn-bg'])
    chip_act, g_chip = fill(k['chip-active-bg'])
    tab_bg, g_tab = fill(k['tab-active-bg'])
    border = border_color(k['surface-border'])
    line = border_color(k['section-line']) if k['section-line'] != '0' else None
    good = rgba(k['good'])
    bar_border = border_color(k['bar-border'])
    blur = re.fullmatch(r'blur\((\d+)px\) saturate\((\d+)%\)', k['bar-blur'])
    pads = [px(x) for x in k['bar-outer-pad'].split()] if k['bar-outer-pad'] != '0' else [0, 0, 0, 0]
    inset = [px(x) for x in k['photo-inset'].split()] if k['photo-inset'] != '0' else [0, 0, 0, 0]
    sec_size = px(k['section-size'])
    title_size = px(k['title-size'])
    if k['tab-indicator'] == 'block':
        indicator = 'line'
    elif tab_bg == 'transparent':
        indicator = 'color'
    elif g_tab:
        indicator = 'pill'
    else:
        indicator = 'box'
    w = lambda x: str(min(int(x), int(mx)))

    colors = {
        'background': norm(k['bg']),
        'backgroundSecondary': hexc(mix(bg, surface_opaque, 0.5)),
        'surface': norm(k['surface']),
        'surfaceElevated': hexc(mix(surface_opaque, text, 0.06)),
        'textPrimary': norm(k['text']),
        'textSecondary': norm(k['text-2']),
        'textMuted': norm(k['text-3']),
        'border': border,
        'borderLight': line or border,
        'success': norm(k['good']),
        'error': norm(k['danger']),
        'warning': norm(k['warn-text']),
        'info': norm(k['info']),
        'notification': norm(k['danger']),
        'available': norm(k['good']),
        'sold': norm(k['text-3']),
        'alert': norm(k['warn-text']),
        **DATA,
        'accent': norm(k['accent']),
        'accentInk': norm(k['accent-ink']),
        'accentSoft': norm(k['accent-soft']),
        'onAccent': norm(k['on-accent']),
        'button': btn,
        'onButton': norm(k['btn-text']),
        'buttonSecondary': norm(k['btn2-bg']),
        'onButtonSecondary': norm(k['btn2-text']),
        'buttonSecondaryBorder': border_color(k['btn2-border']),
        'chip': norm(k['chip-bg']),
        'chipText': norm(k['chip-text']),
        'chipBorder': border_color(k['chip-border']),
        'chipActive': chip_act,
        'chipActiveText': norm(k['chip-active-text']),
        'chipActiveBorder': border_color(k['chip-active-border']),
        'input': norm(k['input-bg']),
        'inputText': norm(k['input-text']),
        'inputBorder': border_color(k['input-border']),
        'placeholder': norm(k['placeholder']),
        'fieldIcon': norm(k['field-icon']),
        'tile': norm(k['tile-bg']),
        'tileBorder': border_color(k['tile-border']),
        'tileSelected': norm(k['tile-sel-bg']),
        'tileSelectedBorder': border_color(k['tile-sel-border']),
        'tileSelectedText': norm(k['tile-sel-text']),
        'checkRing': norm(k['check-ring']),
        'checkOn': norm(k['check-on']),
        'iconWrap': norm(k['icon-wrap-bg']),
        'statNumber': norm(k['stat-num']),
        'dash': norm(k['dash']),
        'infoSoft': norm(k['info-soft']),
        'warningSoft': norm(k['warn-soft']),
        'warningLine': norm(k['warn-line']),
        'warningText': norm(k['warn-text']),
        'soldBadge': norm(k['sold-bg']),
        'soldBadgeText': norm(k['sold-text']),
        'alertBadge': norm(k['alert-bg']),
        'alertBadgeText': norm(k['alert-text']),
        'successSurface': f'rgba({int(good[0])},{int(good[1])},{int(good[2])},0.14)',
        'onSuccessSurface': norm(k['good']),
        'warningSurface': norm(k['warn-soft']),
        'warningSurfaceBorder': norm(k['warn-line']),
        'onWarningSurface': norm(k['warn-text']),
        'onData': '#FFFFFF',
        'scrim': 'rgba(0,0,0,0.5)',
        'scrimStrong': 'rgba(0,0,0,0.7)',
        'cameraBackground': '#000000',
        'qrPaper': '#FFFFFF',
        'qrInk': '#000000',
        'shadow': '#461E2A' if sid == 'ishtar' else '#000000',
    }
    c = colors
    sec = {'fontSize': sec_size, 'fontWeight': w(k['section-weight']), 'color': norm(k['section-color'])}
    if k['section-transform'] == 'uppercase':
        sec['textTransform'] = 'uppercase'
        sec['letterSpacing'] = em(k['section-tracking'], sec_size)
    typography = {
        'heroData': {'fontSize': 48, 'fontWeight': w(700), 'color': c['statNumber']},
        'heroLabel': {'fontSize': 11, 'fontWeight': w(600), 'color': c['textSecondary'], 'textTransform': 'uppercase', 'letterSpacing': 1},
        'cardTitle': {'fontSize': 16, 'fontWeight': w(600), 'color': c['textPrimary']},
        'cardValue': {'fontSize': 24, 'fontWeight': w(700), 'color': c['textPrimary']},
        'cardLabel': {'fontSize': 13, 'fontWeight': '400', 'color': c['textSecondary']},
        'body': {'fontSize': 15, 'fontWeight': '400', 'color': c['textPrimary']},
        'bodySecondary': {'fontSize': 15, 'fontWeight': '400', 'color': c['textSecondary']},
        'caption': {'fontSize': 13, 'fontWeight': '400', 'color': c['textSecondary']},
        'sectionHeader': sec,
        'buttonPrimary': {'fontSize': 16, 'fontWeight': w(600), 'color': c['onButton']},
        'buttonSecondary': {'fontSize': 16, 'fontWeight': w(600), 'color': c['accentInk']},
        'h2': {'fontSize': 24, 'fontWeight': w(700), 'color': c['textPrimary']},
        'h3': {'fontSize': 18, 'fontWeight': w(600), 'color': c['textPrimary']},
        'overline': {},
    }
    card_shadow = shadow(k['card-shadow'])
    theme = {
        'id': sid,
        'name': s['nome'],
        'dark': dark,
        'colors': colors,
        'typography': typography,
        'radius': {
            'small': 8, 'medium': 12, 'large': 16, 'full': 9999,
            'card': px(k['card-radius']), 'tile': px(k['tile-radius']), 'photo': px(k['photo-radius']),
            'chip': px(k['chip-radius']), 'badge': px(k['badge-radius']), 'input': px(k['input-radius']),
            'inputSmall': px(k['input-radius-small']), 'area': px(k['area-radius']), 'iconWrap': px(k['icon-wrap-radius']),
            'button': px(k['btn-radius']), 'bar': px(k['bar-radius']), 'tabActive': px(k['tab-active-radius']),
        },
        'shadows': {
            'small': card_shadow, 'card': card_shadow, 'cardElevated': card_shadow,
            'button': shadow(k['btn-shadow']), 'bar': shadow(k['bar-shadow']), 'tabActive': shadow(k['tab-active-shadow']),
        },
        'spacing': {'screenPadding': 16, 'cardGap': 12, 'sectionGap': 24},
        'font': {'family': fam, 'files': files},
        'title': {'size': title_size, 'weight': w(k['title-weight']), 'tracking': em(k['title-tracking'], title_size)},
        'section': {'uppercase': k['section-transform'] == 'uppercase', 'tracking': em(k['section-tracking'], sec_size), 'line': line},
        'label': {'size': px(k['label-size']), 'weight': w(k['label-weight']), 'color': norm(k['label-color'])},
        'weights': {'strong': w(k['strong']), 'price': w(k['price-weight'])},
        'input': {'height': px(k['input-height'])},
        'photo': {'inset': {'top': inset[0], 'right': inset[1], 'bottom': inset[2], 'left': inset[3]}},
        'gradients': {n: g for n, g in (('button', g_btn), ('chipActive', g_chip), ('tabActive', g_tab)) if g},
        'backdrop': {'glows': glows(k['bg-img']), **({'gradient': gradient(re.search(r'linear-gradient\([^()]*(?:\([^)]*\)[^()]*)*\)', k['bg-img']).group(0))} if 'linear-gradient' in k['bg-img'] else {})},
        'bar': {
            'floating': px(k['bar-radius']) > 0,
            'marginHorizontal': pads[1] if len(pads) > 1 else 0,
            'marginBottom': pads[2] if len(pads) > 2 else 0,
            'paddingBottom': px(k['bar-pad-bottom']),
            'background': norm(k['bar-bg']),
            'borderColor': bar_border or 'transparent',
            'borderWidth': 1 if bar_border else 0,
            'glass': {'blur': int(blur.group(1)), 'saturate': int(blur.group(2))} if blur else None,
        },
        'tab': {
            'color': norm(k['tab-color']),
            'activeColor': norm(k['tab-active-color']),
            'activeBackground': tab_bg,
            'activeIndicator': indicator,
            'labelSize': px(k['tab-label-size']),
            'activeWeight': w(k['tab-active-weight']),
        },
    }
    # contrasti (testo su fondo, fondi semitrasparenti composti sul fondo pagina o sulla superficie)
    S = surface_opaque
    def on(f, b, base=S):
        return contrast(rgba(f), over(rgba(b), base))
    checks = [
        ('testo / superficie', on(k['text'], k['surface'], bg)),
        ('testo 2 / superficie', on(k['text-2'], k['surface'], bg)),
        ('testo 3 / superficie', on(k['text-3'], k['surface'], bg)),
        ('testo 3 / fondo', contrast(rgba(k['text-3']), bg)),
        ('accento inchiostro / superficie', on(k['accent-ink'], k['surface'], bg)),
        ('su accento / accento', contrast(rgba(k['on-accent']), rgba(k['accent']))),
        ('pulsante: testo / fondo', contrast(rgba(k['btn-text']), rgba(btn))),
        ('pillola attiva: testo / fondo', on(k['chip-active-text'], chip_act)),
        ('pillola: testo / fondo', on(k['chip-text'], k['chip-bg'])),
        ('riquadro scelto: testo / fondo', on(k['tile-sel-text'], k['tile-sel-bg'])),
        ('segnaposto / campo', on(k['placeholder'], k['input-bg'])),
        ('Venduto', on(k['sold-text'], k['sold-bg'])),
        ('Attenzione', on(k['alert-text'], k['alert-bg'])),
        ('avviso: testo / velo', on(k['warn-text'], k['warn-soft'])),
        ('errore / superficie', on(k['danger'], k['surface'], bg)),
        ('riuscito / superficie', on(k['good'], k['surface'], bg)),
        ('barra: voce / fondo', on(k['tab-color'], k['bar-bg'], bg)),
        ('barra: voce attiva / fondo attivo', on(k['tab-active-color'], tab_bg if tab_bg != 'transparent' else k['bar-bg'], over(rgba(k['bar-bg']), bg))),
        ('bianco su colori di dati (min)', min(contrast([255, 255, 255, 1], rgba(x)) for x in DATA.values())),
    ]
    return theme, checks


HEADER = """import type {{ AppTheme }} from './types';

// {nome}: generato dai 93 token di `piani di implementazione/ui-ux/temi/token-stili.json` (tela
// https://claude.ai/artifact/GSuFD111jGM9FSNt5W5fHK). I valori che la tela non dà sono ricavati così:
// - backgroundSecondary: a metà tra il fondo e la superficie (superficie composta sul fondo);
// - surfaceElevated: superficie composta sul fondo, spostata del 6% verso il colore del testo;
// - border / borderLight: colore di `surface-border` / `section-line` (o `surface-border` se manca);
// - success, error, warning, info, notification, available, sold, alert: `good`, `danger`, `warn-text`, `info`,
//   `danger`, `good`, `text-3`, `warn-text`;
// - successSurface: `good` al 14%; warningSurface e i testi sopra: `warn-soft`, `warn-line`, `warn-text`;
// - riempimenti sfumati (pulsante, pillola attiva, voce attiva): colore pieno = ultimo colore della sfumatura,
//   la sfumatura sta in `gradients`;
// - ombre: `boxShadow` dai token; `small`, `card` e `cardElevated` usano `card-shadow`;
// - pesi: oltre {mx} si usa {mx} (peso più alto della tela per questo stile), anche nei file del carattere;
// - fissi in tutti gli stili: colori predefiniti delle posizioni (dati), `onData` bianco, velature nere,
//   fondo della fotocamera, carta e inchiostro dei codici; `shadow` {ombra}.
"""

for sid, s in stili.items():
    if only and sid not in only:
        continue
    theme, checks = build(sid, s)
    body = HEADER.format(nome=s['nome'], mx=MAX_WEIGHT[sid], ombra='bordeaux (come le ombre della tela)' if sid == 'ishtar' else 'nero')
    body += f"\nexport const {sid}: AppTheme = {ts(theme)};\n"
    (out / f'{sid}.ts').write_text(body, encoding='utf-8', newline='\n')
    print(f'== {s["nome"]} ({sid}.ts)')
    for name, v in checks:
        flag = '' if v >= 4.5 else ('  < 4.5' if v >= 3 else '  < 3 !')
        print(f'   {name:38s} {v:5.2f}{flag}')
