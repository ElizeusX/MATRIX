"""Offline validation of the imported catalog and both storefront asset copies."""
import hashlib, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
snapshot=json.loads((ROOT/'data/catalog.json').read_text());products=snapshot['products']
assert len(products)==76
assert len({p['slug'] for p in products})==76
assert len({p['sourceUrl'] for p in products})==76
assert json.loads((ROOT/'apps/web/lib/source-catalog.json').read_text())==snapshot
js=(ROOT/'preview/catalog.js').read_text().split('window.MATRIX_CATALOG = ',1)[1].removesuffix(';\n')
assert json.loads(js)==products
for p in products:
 assert p['images'] and p['sourceUrl'].startswith('https://matrix-mebli.com/furniture/')
 assert all('/wp-content/uploads/' in u for u in p['images'])
 for base in [ROOT/'preview',ROOT/'apps/web/public']:
  data=(base/p['image']).read_bytes();assert data.startswith(b'\xff\xd8')
  assert hashlib.sha256(data).hexdigest()==p['imageSha256']
 assert not p['sourcePriceText'],'Price handling must be reviewed before importing priced products'
elli=next(p for p in products if p['slug']=='elli')
assert elli['dimensions']=='238(2410)х1100' and elli['width'] is None
lira=next(p for p in products if p['slug']=='lira-2')
assert '1400/1600' in lira['sleepingArea'] and lira['sleepWidth'] is None
assert len([p for p in products if p['slug']=='rubin'])==1
seed=(ROOT/'database/seeds/verified_catalog.sql').read_text()
assert len(re.findall('INSERT INTO products\\(',seed))==76
assert 'published=' not in seed and 'available=' not in seed and 'base_price_minor=' not in seed
print(f'PASS: {len(products)} unique products, 152 local photo copies, exact source variants, JSON/JS parity, safe SQL seed')
