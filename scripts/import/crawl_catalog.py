"""Refresh the complete public catalog and primary photos.

pip install -r scripts/import/requirements.txt
python scripts/import/crawl_catalog.py --cache /tmp/matrix-source
Requires curl. Requests use three workers and fail on missing pages/media.
"""
import argparse, concurrent.futures, hashlib, json, re, subprocess
from pathlib import Path
from urllib.parse import unquote, quote, urlsplit
from lxml import html, etree
from build_catalog import build, ROOT

def crawl(cache):
 cache.mkdir(parents=True,exist_ok=True);(cache/'images').mkdir(exist_ok=True)
 def fetch(url,path):
  if not path.exists():
   temp=path.with_suffix(path.suffix+'.tmp')
   subprocess.run(['curl','-fsSL','--retry','2','--max-time','60',url,'-o',str(temp)],check=True)
   temp.replace(path)
  return path
 first=fetch('https://matrix-mebli.com/furnitures/',cache/'catalog.html')
 match=re.search(r'max_page_furniture\s*=\s*(\d+)',first.read_text())
 if not match:raise ValueError('Catalog pagination metadata missing')
 count=int(match.group(1))
 def page(i):return fetch(f'https://matrix-mebli.com/furnitures/page/{i}/',cache/f'page{i}.html')
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:pages=[first]+list(pool.map(page,range(2,count+1)))
 items={}
 for path in pages:
  doc=html.parse(str(path));cards=doc.xpath('//a[contains(@class,"furniture-list_link")]')
  if not cards:raise ValueError(f'No catalog cards in {path}')
  for a in cards:
   url=a.get('href');items[url]=dict(url=url,title=' '.join(a.xpath('.//h4//text()')),summary=' '.join(a.xpath('.//div[@class="content-block"]//text()')).strip(),thumbnail=a.xpath('.//img/@data-lazy-src')[:1] or a.xpath('.//img/@src')[:1])
 sitemap=fetch('https://matrix-mebli.com/wp-sitemap-posts-furniture-1.xml',cache/'furniture-sitemap.xml')
 urls=etree.parse(str(sitemap)).xpath('//*[local-name()="loc"]/text()')
 if set(map(unquote,urls))!=set(map(unquote,items)):raise ValueError('Catalog differs from furniture sitemap; inspect before importing')
 (cache/'listing.json').write_text(json.dumps(list(items.values()),ensure_ascii=False,indent=2))
 def product(pair):
  i,item=pair;fetch(item['url'],cache/f'product-{i:03}.html')
  source=item['thumbnail'][0];parts=urlsplit(source);path=parts.path
  if parts.netloc.endswith('wp.com'):path=path.removeprefix('/matrix-mebli.com')
  url='https://i0.wp.com/matrix-mebli.com'+quote(unquote(path),safe='/')+'?w=1200&ssl=1'
  target=fetch(url,cache/'images'/f'{i:03}.jpg')
  # Reject error HTML instead of silently publishing a broken image.
  data=target.read_bytes()
  if not data.startswith(b'\xff\xd8'):raise ValueError(f'Expected JPEG: {url}')
  print(i,item['title'],flush=True)
  return dict(index=i,path=str(target.resolve()),download_url=url,source_url=source,sha256=hashlib.sha256(data).hexdigest())
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:photos=list(pool.map(product,enumerate(items.values())))
 (cache/'photos.json').write_text(json.dumps(photos,ensure_ascii=False,indent=2))
 build(cache)

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--cache',type=Path,required=True);args=parser.parse_args();crawl(args.cache)
