"""Build the catalog from cached public HTML, preserving ambiguous source text.

Requires Python 3.10+, lxml. Run from the repository root:
  python scripts/import/build_catalog.py --cache ../source
The cache contains listing.json, product-NNN.html and photos.json from the crawl.
"""
import argparse, json, re, shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit, quote
from lxml import html

ROOT = Path(__file__).resolve().parents[2]
DISCONTINUED_SLUGS = {p['slug'] for p in json.loads((ROOT/'data/discontinued-products.json').read_text())['products']}
DIMENSION_OVERRIDES = json.loads((ROOT/'data/dimension-overrides.json').read_text())['products']
LETTERS = dict(zip('абвгґдеєжзиіїйклмнопрстуфхцчшщьюя', ['a','b','v','h','g','d','e','ye','zh','z','y','i','yi','y','k','l','m','n','o','p','r','s','t','u','f','kh','ts','ch','sh','shch','','yu','ya']))
ALIASES = {'Кутовий диван Хілтон-2': 'hilton-2', 'Кутовий диван Хілтон-П': 'hilton-p', 'Прямий диван Моллі': 'molly', 'Ліра-2': 'lira-2', 'Прямий диван Ельдорадо-2': 'eldorado-2', 'Прямий диван Ельдорадо': 'eldorado', 'Прямий диван Еллі': 'elli', 'Кутовий диван Смарт': 'smart', 'Прямий диван Рубін': 'rubin'}

def translit(text):
 return ''.join(LETTERS.get(c,c) for c in text.lower())
def clean(text):return ' '.join(text.split())
def texts(doc,xpath):return '\n'.join(clean(x.text_content()) for x in doc.xpath(xpath) if clean(x.text_content()))
def sql(value):return 'NULL' if value is None else "'"+str(value).replace("'","''")+"'"
def pair(value):
 # Never truncate alternatives, three-dimensional sizes, or apparent typos.
 m=re.fullmatch(r'(\d{3,4})\s*[хx×]\s*(\d{3,4})',value,re.I)
 if not m:return [None,None]
 nums=list(map(int,m.groups()))
 return nums if all(500<=n<=5000 for n in nums) else [None,None]

def apply_dimension_override(product):
 # Explicit manufacturer corrections take priority over the older public site.
 # Primary numeric dimensions are supplied explicitly, never parsed from variants.
 update=DIMENSION_OVERRIDES.get(product['slug'],{})
 product.update(update)
 for field,flag in [('dimensions','dimensions_require_confirmation'),('sleepingArea','sleeping_dimensions_require_confirmation')]:
  if field in update:product['flags']=[f for f in product['flags'] if f!=flag]
 return product

def build(cache):
 listing=json.loads((cache/'listing.json').read_text());photos=json.loads((cache/'photos.json').read_text());products=[];product_photos=[]
 for i,item in enumerate(listing):
  title=clean(item['title']);lower=title.lower()
  slug=ALIASES.get(title) or re.sub(r'[^a-z0-9]+','-',translit(title)).strip('-')
  if slug in DISCONTINUED_SLUGS:continue
  doc=html.parse(str(cache/f'product-{i:03}.html'))
  category='beds' if lower.startswith('ліжко') else 'corner-sofas' if lower.startswith('кутовий диван') else 'straight-sofas' if lower.startswith(('прямий диван','диван прямий')) else 'unspecified'
  summary=texts(doc,'//div[@class="presentation-list_desc"]') or clean(item['summary'])
  size=re.search(r'габаритні розміри\s*(.*?)(?=спальне місце|$)',summary,re.I)
  sleep=re.search(r'спальне місце\s*(.*)',summary,re.I)
  size=size.group(1).strip() if size else '';sleep=sleep.group(1).strip() if sleep else ''
  description=texts(doc,'//div[@class="description"]')
  images=[]
  for img in doc.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," slider-full ")]//img'):
   u=img.get('data-lazy-src') or img.get('src','')
   if '/wp-content/uploads/' in u and u not in images:images.append(u)
  if not images:images=item['thumbnail']
  width,depth=pair(size);a,b=pair(sleep)
  # The source does not label the two sleeping dimensions consistently; keep
  # exact display text and only normalize unambiguous sofa dimensions.
  length,sw=(max(a,b),min(a,b)) if a and b and category in ('corner-sofas','straight-sofas') else (None,None)
  flags=[]
  if size and width is None:flags.append('dimensions_require_confirmation')
  if sleep and a is None:flags.append('sleeping_dimensions_require_confirmation')
  if category=='unspecified':flags.append('category_requires_confirmation')
  price=texts(doc,'//div[@class="price-block"]')
  p=dict(id=slug,slug=slug,uk=title,en=title,category=category,sourceUrl=item['url'],description=description,dimensions=size,sleepingArea=sleep,width=width,depth=depth,sleepLength=length,sleepWidth=sw,image=f'media/products/{slug}.jpg',images=images,sourceImage=photos[i]['source_url'],downloadUrl=photos[i]['download_url'],imageSha256=photos[i]['sha256'],sourcePriceText=price,flags=flags)
  products.append(apply_dimension_override(p))
  product_photos.append(photos[i])
 assert len({p['slug'] for p in products})==len(products),'Duplicate slugs'
 payload=dict(source='https://matrix-mebli.com',retrievedAt=datetime.now(timezone.utc).date().isoformat(),catalogPages=int(re.search(r'max_page_furniture\s*=\s*(\d+)',(cache/'catalog.html').read_text()).group(1)),products=products)
 (ROOT/'data').mkdir(exist_ok=True)
 (ROOT/'data/catalog.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'preview/catalog.js').write_text('// Generated by scripts/import/build_catalog.py.\nwindow.MATRIX_CATALOG = '+json.dumps(products,ensure_ascii=False,indent=2)+';\n')
 shutil.copyfile(ROOT/'data/catalog.json',ROOT/'apps/web/lib/source-catalog.json')
 (ROOT/'apps/web/public/media/products').mkdir(parents=True,exist_ok=True)
 for p,photo in zip(products,product_photos):
  original=Path(photo['path'])
  if not original.exists():original=cache/'images'/f'{photo["index"]:03}.jpg'
  for base in [ROOT/'preview',ROOT/'apps/web/public']:
   shutil.copyfile(original,base/p['image'])
 write_seed(products)
 print(f'{len(products)} products, {sum(len(p["images"]) for p in products)} gallery references, {sum(bool(p["description"]) for p in products)} descriptions')

def write_seed(products):
 seed=['-- Imported catalog with explicit manufacturer corrections. Prices, availability and publication are not inferred.','BEGIN;',"INSERT INTO categories(slug,title_uk,title_en) VALUES ('corner-sofas','Дивани кутові','Corner sofas'),('straight-sofas','Дивани прямі','Straight sofas'),('beds','Ліжка','Beds') ON CONFLICT(slug) DO NOTHING;"]
 for p in products:
  dims_label='виробник' if p.get('dimensionSource')=='manufacturer' else 'джерело'
  sleep_label='виробник' if p.get('sleepingAreaSource')=='manufacturer' else 'джерело'
  desc='\n'.join(filter(None,[p['description'],(f'Габаритні розміри ({dims_label}): '+p['dimensions']) if p['dimensions'] else '',(f'Спальне місце ({sleep_label}): '+p['sleepingArea']) if p['sleepingArea'] else '']))
  vals=[p['slug'],p['sourceUrl'],p['uk'],p['en'],desc or None,p['width'],p['depth'],p['sleepWidth'],p['sleepLength']]
  seed.append('INSERT INTO products(category_id,slug,source_url,title_uk,title_en,description_uk,width_mm,depth_mm,sleeping_width_mm,sleeping_length_mm) VALUES ((SELECT id FROM categories WHERE slug='+sql(p['category'])+'),'+','.join(map(sql,vals))+') ON CONFLICT(slug) DO UPDATE SET source_url=COALESCE(products.source_url,EXCLUDED.source_url),description_uk=COALESCE(products.description_uk,EXCLUDED.description_uk);')
  seed.append('INSERT INTO product_media(product_id,object_key,alt_uk,alt_en,source_url,sort_order) SELECT id,'+','.join(map(sql,[p['image'],p['uk'],p['en'],p['sourceImage']]))+',0 FROM products WHERE slug='+sql(p['slug'])+' ON CONFLICT(object_key) DO NOTHING;')
 seed.append('COMMIT;')
 (ROOT/'database/seeds/verified_catalog.sql').write_text('\n'.join(seed)+'\n')

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--cache',type=Path,required=True);args=parser.parse_args();build(args.cache)
