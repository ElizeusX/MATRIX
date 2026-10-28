"""Review mappings survive imports, while changed photographs are not substituted."""
import unittest
from product_media import apply_media

class ProductMediaTest(unittest.TestCase):
 def setUp(self):
  self.p=dict(slug='sofa',image='media/products/sofa.jpg',imageSha256='raw',images=['https://example.test/1.jpg','https://example.test/new.jpg'])
  self.m=dict(primary={'sofa':dict(path='media/products/sofa.webp',sourceSha256='raw',sha256='edited')},gallery={'https://example.test/1.jpg':dict(path='media/products/gallery/1.webp')})
 def test_reimport_and_repeated_application(self):
  mapped=apply_media(self.p,self.m)
  self.assertEqual(mapped['image'],'media/products/sofa.webp')
  self.assertEqual(mapped['imageSha256'],'edited')
  self.assertEqual(mapped['images'],['media/products/gallery/1.webp','https://example.test/new.jpg'])
  self.assertEqual(mapped['sourceImages'][0],'https://example.test/1.jpg')
  self.assertEqual(apply_media(mapped.copy(),self.m),mapped)
 def test_new_source_is_not_replaced_with_old_product_photo(self):
  self.p['imageSha256']='new-original'
  mapped=apply_media(self.p,self.m)
  self.assertEqual(mapped['image'],'media/products/sofa.jpg')
  self.assertEqual(mapped['imageSha256'],'new-original')
 def test_no_manifest_keeps_original_import_contract(self):
  original=self.p.copy()
  self.assertEqual(apply_media(self.p,{}),original)
if __name__=='__main__':unittest.main()
