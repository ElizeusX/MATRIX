"""Retired listings must not return or shift photos onto the next active model."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_catalog


class DiscontinuedImportTest(unittest.TestCase):
 def test_retired_listings_are_excluded_and_photos_stay_paired(self):
  retired=json.loads((build_catalog.ROOT/'data/discontinued-products.json').read_text())['products']
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);cache=root/'cache';cache.mkdir()
   for name in ['preview/media/products','apps/web/lib','database/seeds']:
    (root/name).mkdir(parents=True)
   # Exercise every retired name, including source capitalization and "Монако 2".
   titles=['Прямий диван Моллі',*[p['uk'] for p in retired],'Кутовий диван Смарт']
   listing=[];photos=[]
   for i,title in enumerate(titles):
    image=cache/f'{i}.jpg';image.write_bytes(b'\xff\xd8'+bytes([i]))
    url=f'https://matrix-mebli.com/wp-content/uploads/{i}.jpg'
    listing.append(dict(title=title,url=f'https://matrix-mebli.com/furniture/{i}/',summary='',thumbnail=[url]))
    photos.append(dict(path=str(image),index=i,source_url=url,download_url=url,sha256=hashlib.sha256(image.read_bytes()).hexdigest()))
    # Retired products deliberately have no cached page: skip before parsing.
    if i in (0,len(titles)-1):
     (cache/f'product-{i:03}.html').write_text('<html><body><div class="presentation-list_desc">Габаритні розміри 2400х1000</div></body></html>')
   (cache/'listing.json').write_text(json.dumps(listing))
   (cache/'photos.json').write_text(json.dumps(photos))
   (cache/'catalog.html').write_text('max_page_furniture = 1')
   with patch.object(build_catalog,'ROOT',root):
    build_catalog.build(cache)
   snapshot=json.loads((root/'data/catalog.json').read_text())
   self.assertEqual([p['slug'] for p in snapshot['products']],['molly','smart'])
   self.assertEqual(snapshot['products'][0]['dimensions'],'2450х1150')
   self.assertEqual(snapshot['products'][0]['sleepingArea'],'2000х1600')
   self.assertEqual(snapshot,json.loads((root/'apps/web/lib/source-catalog.json').read_text()))
   for product,index in zip(snapshot['products'],[0,len(titles)-1]):
    for base in ['preview','apps/web/public']:
     self.assertEqual((root/base/product['image']).read_bytes(),(cache/f'{index}.jpg').read_bytes())
   for product in retired:
    self.assertNotIn(product['slug'],(root/'database/seeds/verified_catalog.sql').read_text())
    self.assertNotIn(product['slug'],(root/'preview/catalog.js').read_text())


if __name__=='__main__':unittest.main()
