"""Offline asset/provenance validation; requires only the Python standard library."""
import hashlib,json,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
manifest=json.loads((ROOT/'data/product-watermarks.json').read_text())
products=json.loads((ROOT/'data/catalog.json').read_text())['products']
assert set(manifest['primary'])=={p['slug'] for p in products}
assert set(manifest['gallery'])=={url for p in products for url in p['sourceImages']}
assert len(manifest['primary'])==66 and len(manifest['gallery'])==358
assert manifest['version']==2
assert manifest['style']['name']=='centered-glass-v2'
assert manifest['style']['position']=='center' and manifest['style']['opacity']==.28

def dimensions(data):
 assert data[:4]==b'RIFF' and data[8:12]==b'WEBP'
 offset=12
 while offset+8<=len(data):
  kind=data[offset:offset+4];size=struct.unpack_from('<I',data,offset+4)[0]
  if kind==b'VP8L':
   assert data[offset+8]==0x2f
   bits=struct.unpack_from('<I',data,offset+9)[0]
   return [(bits&0x3fff)+1,((bits>>14)&0x3fff)+1]
  offset+=8+size+(size%2)
 raise AssertionError('Expected a lossless WebP image')

for section in ['primary','gallery']:
 for key,entry in manifest[section].items():
  assert entry.get('branded',entry['replaced']),f'Missing glass watermark: {key}'
  assert entry['path'].startswith('media/products/') and entry['path'].endswith('-glass-v2.webp')
  assert len(entry['sourceSha256'])==64
  copies=[(ROOT/base/entry['path']).read_bytes() for base in ['preview','apps/web/public']]
  assert copies[0]==copies[1],entry['path']
  assert hashlib.sha256(copies[0]).hexdigest()==entry['sha256'],entry['path']
  assert dimensions(copies[0])==entry['size'],entry['path']
  w,h=entry['size']
  assert entry['style']=='centered-glass-v2'
  x1,y1,x2,y2=entry['brandBounds']
  assert abs((x1+x2)-w)<=1 and abs((y1+y2)-h)<=1,(key,'Watermark must be centered')
  assert x2-x1<=round(w*.30)+1 and y2-y1<=round(h*.34)+1
  if entry.get('cornerRemovedBounds'):
   assert entry['cornerSourceSha256']==entry['sourceSha256']
   assert len(entry['previousSha256'])==64
  for bounds in [entry['legacyBounds'],entry['brandBounds']]:
   if bounds is None:
    assert not entry['replaced'];continue
   x1,y1,x2,y2=bounds
   assert 0<=x1<x2<=w and 0<=y1<y2<=h,(key,bounds)
for p in products:
 primary=manifest['primary'][p['slug']]
 assert (p['image'],p['imageSha256'])==(primary['path'],primary['sha256'])
 assert p['images']==[manifest['gallery'][u]['path'] for u in p['sourceImages']]
for base in ['preview','apps/web/public']:
 logo=(ROOT/base/manifest['logo']).read_bytes()
 assert hashlib.sha256(logo).hexdigest()==manifest['logoSha256']
 assert not list((ROOT/base/'media/products').glob('*.jpg')),'Old primary assets must not remain available'
 actual={(p.relative_to(ROOT/base)).as_posix() for p in (ROOT/base/'media/products').rglob('*.webp')}
 expected={e['path'] for section in ['primary','gallery'] for e in manifest[section].values()}
 assert actual==expected,'Unreferenced or missing product assets'
print('PASS: 66 primary photos and 358 gallery photos, lossless dimensions, hashes, provenance, local URLs and identical storefront copies')
