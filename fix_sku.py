import pathlib
files = ['__tests__/chatPayload.test.ts','__tests__/bossShare.test.ts','e2e/meshQRLoop.detox.test.ts','scripts/profileRam.js','src/db/models/ChatMessage.ts','scripts/test_detox_mercusys.sh','services/mockData.ts','src/screens/settings/SectorTemplatesScreen.tsx']
for f in files:
    p = pathlib.Path(f)
    if p.exists():
        c = p.read_text(encoding='utf-8')
        orig = c
        c = c.replace('FUR-2026','LOG-2026').replace('FUR-001','LOG-001').replace('FUR-','LOG-')
        c = c.replace('LOG-LOG-','LOG-')
        # also fix furType leftover to generic
        c = c.replace("'visone'", "'elettronica'")
        c = c.replace("'volpe'", "'meccanica'")
        c = c.replace("'zibellino'", "'tessile'")
        if c!=orig:
            p.write_text(c, encoding='utf-8')
            print(f'fixed {f}')
        else:
            print(f'skip {f}')
    else:
        print(f'not found {f}')
