import pathlib
p = pathlib.Path('services/mockData.ts')
c = p.read_text(encoding='utf-8')
map_vals = {
    "'visone'": "'elettronica'",
    "'volpe'": "'meccanica'",
    "'zibellino'": "'tessile'",
    "'cincilla'": "'chimica'",
    "'ermellino'": "'farmaceutica'",
    "'astrakan'": "'imballaggio'",
    "'cincillà'": "'chimica'",
}
for k,v in map_vals.items():
    c = c.replace(k,v)
# also VIS etc sku already LOG, but check remaining VIS- etc not needed as SKU fixed
p.write_text(c, encoding='utf-8')
print('furType fixed')
