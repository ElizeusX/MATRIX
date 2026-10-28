"""Check the manufacturer's nine corrections and their primary configurations."""
import json
import unittest
from copy import deepcopy

from build_catalog import ROOT, apply_dimension_override

# Independent acceptance values transcribed from the manufacturer's request.
EXPECTED={
 'hilton-p':('3500х2040',3500,2040,'2700х1300',2700,1300),
 'kutovyy-dyvan-neo-2':('2520х1630',2520,1630,None,None,None),
 'kutovyy-dyvan-neo-3':('3520х1630',3520,1630,'3000х1520 (2100)',3000,1520),
 'kutovyy-dyvan-leon-lyuks-140':('2450х1500',2450,1500,None,None,None),
 'molly':('2450х1150',2450,1150,'2000х1600',2000,1600),
 'pryamyy-dyvan-neo-3':('3520х1080 (1630)',3520,1080,'3000х1520',3000,1520),
 'dyvan-pryamyy-khit':('2350х1030',2350,1030,'1970х1500',1970,1500),
 'dyvan-pryamyy-prestizh':('2400х1000',2400,1000,'1970х1470',1970,1470),
 'pryamyy-dyvan-leon':('2100х930',2100,930,'1930х1350',1930,1350),
}


class DimensionCorrectionsTest(unittest.TestCase):
 def test_catalog_and_reimport_follow_manufacturer_values(self):
  products={p['slug']:p for p in json.loads((ROOT/'data/catalog.json').read_text())['products']}
  for slug,(display,w,d,sleep,sl,sw) in EXPECTED.items():
   with self.subTest(slug=slug):
    # Reimporting outdated source text must produce the same corrected fields.
    stale=dict(slug=slug,dimensions='OLD',width=None,depth=None,
               sleepingArea='UNCHANGED',sleepLength=1111,sleepWidth=999,
               flags=['dimensions_require_confirmation','sleeping_dimensions_require_confirmation','other_flag'])
    imported=apply_dimension_override(stale)
    for p in [products[slug],imported]:
     self.assertEqual((p['dimensions'],p['width'],p['depth']),(display,w,d))
     self.assertNotIn('dimensions_require_confirmation',p['flags'])
     if sleep is not None:
      self.assertEqual((p['sleepingArea'],p['sleepLength'],p['sleepWidth']),(sleep,sl,sw))
      self.assertNotIn('sleeping_dimensions_require_confirmation',p['flags'])
    self.assertIn('other_flag',imported['flags'])
    if sleep is None:
     self.assertEqual((imported['sleepingArea'],imported['sleepLength'],imported['sleepWidth']),('UNCHANGED',1111,999))
     self.assertIn('sleeping_dimensions_require_confirmation',imported['flags'])

 def test_other_models_stay_unchanged_and_updates_are_idempotent(self):
  for product in json.loads((ROOT/'data/catalog.json').read_text())['products']:
   self.assertEqual(apply_dimension_override(deepcopy(product)),product)


if __name__=='__main__':unittest.main()
