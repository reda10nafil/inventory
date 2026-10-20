import pathlib, re

p = pathlib.Path('services/mockData.ts')
c = p.read_text(encoding='utf-8')
# Replace all old SKUs VIS-,VOL-,ZIB-,CIN-,ERM-,AST- with LOG-
# We will generate generic LOG SKUs
sku_map = {
    'VIS-001-2024':'LOG-2026-001',
    'VOL-045-2024':'LOG-2026-002',
    'ZIB-012-2024':'LOG-2026-003',
    'CIN-007-2023':'LOG-2026-004',
    'VIS-022-2024':'LOG-2026-005',
    'VOL-058-2023':'LOG-2026-006',
    'ERM-003-2024':'LOG-2026-007',
    'VIS-035-2023':'LOG-2026-008',
    'AST-001-2024':'LOG-2026-009',
    'ZIB-018-2024':'LOG-2026-010',
    'VOL-072-2023':'LOG-2026-011',
    'VIS-048-2024':'LOG-2026-012',
    'VIS-087-2024':'LOG-2026-013',
    'CIN-015-2023':'LOG-2026-014',
    'VOL-089-2024':'LOG-2026-015',
    'VIS-061-2023':'LOG-2026-016',
    'ZIB-025-2024':'LOG-2026-017',
    'ERM-008-2024':'LOG-2026-018',
    'VOL-102-2024':'LOG-2026-019',
    'VIS-074-2023':'LOG-2026-020',
    'CIN-022-2024':'LOG-2026-021',
    'AST-005-2024':'LOG-2026-022',
}
for old,new in sku_map.items():
    c = c.replace(old,new)
# fix header comment
c = c.replace('FurInventory Pro - Mock Data Service','SyncroFlow - Logistica Universale Mock Data (generico, no settore pellicce)')
# fix technicalNotes to generic logistics
# replace fur specific notes with logistics
replacements = [
    ('Visone scandinavo femmina, lavorazione tradizionale, cucitura doppia','Unità logistica elettronica - pallet standard, tracciato RFID, peso verificato'),
    ('Volpe argentata, pelo lungo, cucitura a mano','Componente meccanica - imballo rinforzato, lotto verificato'),
    ('Zibellino russo premium, lavorazione artigianale esclusiva','Materiale tessile premium - rotolo, lotto certificato'),
    ('Cincillà sudamericano, pelo corto e denso, qualità eccellente','Prodotto chimico - fusto sigillato, scheda sicurezza allegata'),
]
for o,n in replacements:
    c = c.replace(o,n)
# generic fix for remaining technicalNotes containing pellicce terms: replace visone/volpe/zibellino etc with generico
c = re.sub(r'Visone[^,]*,','Unità elettronica,',c)
c = re.sub(r'Volpe[^,]*,','Unità meccanica,',c)
c = re.sub(r'Zibellino[^,]*,','Unità tessile,',c)
c = re.sub(r'Cincillà[^,]*,','Unità chimica,',c)
c = re.sub(r'Ermellino[^,]*,','Unità farmaceutica,',c)
c = re.sub(r'Astrakan[^,]*,','Imballaggio speciale,',c)
# furType values already changed to elettronica/meccanica etc keep but we also replace remaining
c = c.replace("'cincilla'","'chimica'")
c = c.replace("'ermellino'","'farmaceutica'")
c = c.replace("'astrakan'","'imballaggio'")
# ensure SKU placeholder in comment not fur
c = c.replace('FUR','LOG')

p.write_text(c, encoding='utf-8')
print('mockData fixed')
print(c[:1000])
