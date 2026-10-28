"""Offline validation of the imported catalog and both storefront asset copies."""
import hashlib, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
snapshot=json.loads((ROOT/'data/catalog.json').read_text());products=snapshot['products']
retired={p['slug'] for p in json.loads((ROOT/'data/discontinued-products.json').read_text())['products']}
assert len(retired)==10
assert len(products)==66
assert len({p['slug'] for p in products})==len(products)
assert len({p['sourceUrl'] for p in products})==len(products)
assert retired.isdisjoint(p['slug'] for p in products)
neo=next(p for p in products if p['slug']=='pryamyy-dyvan-neo-230')
assert neo['uk']==neo['en']=='Прямий диван Нео 196'
assert json.loads((ROOT/'apps/web/lib/source-catalog.json').read_text())==snapshot
js=(ROOT/'preview/catalog.js').read_text().split('window.MATRIX_CATALOG = ',1)[1].removesuffix(';\n')
assert json.loads(js)==products
for p in products:
 assert p['images'] and p['sourceUrl'].startswith('https://matrix-mebli.com/furniture/')
 assert len(p['images'])==len(p['sourceImages'])
 assert all('/wp-content/uploads/' in u for u in p['sourceImages'])
 assert all(u.startswith('media/products/gallery/') for u in p['images'])
 for photo in p['images']:
  assert (ROOT/'preview'/photo).read_bytes()==(ROOT/'apps/web/public'/photo).read_bytes()
 for base in [ROOT/'preview',ROOT/'apps/web/public']:
  data=(base/p['image']).read_bytes();assert data.startswith(b'RIFF') and data[8:12]==b'WEBP'
  assert hashlib.sha256(data).hexdigest()==p['imageSha256']
 assert not p['sourcePriceText'],'Price handling must be reviewed before importing priced products'
elli=next(p for p in products if p['slug']=='elli')
assert elli['dimensions']=='238(2410)х1100' and elli['width'] is None
lira=next(p for p in products if p['slug']=='lira-2')
assert '1400/1600' in lira['sleepingArea'] and lira['sleepWidth'] is None
assert len([p for p in products if p['slug']=='rubin'])==1
seed=(ROOT/'database/seeds/verified_catalog.sql').read_text()
assert len(re.findall(r'INSERT INTO products\(',seed))==len(products)
assert 'published=' not in seed and 'available=' not in seed and 'base_price_minor=' not in seed
for slug in retired:
 assert slug not in seed
 for base in [ROOT/'preview',ROOT/'apps/web/public']:
  assert not (base/'media/products'/f'{slug}.jpg').exists()
migration=(ROOT/'database/migrations/005_discontinued_products.sql').read_text()
assert set(re.findall(r"'([^']+)'",migration))==retired
assert 'published = FALSE' in migration and 'available = FALSE' in migration
print(f'PASS: {len(products)} unique products, {2*len(products)} primary photo copies plus local galleries, exact source variants, JSON/JS parity, safe SQL seed, 10 retired products excluded')
