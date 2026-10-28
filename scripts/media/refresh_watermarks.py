"""Replace the legacy burned-in logo in catalog photos, retaining all other pixels.

Usage (from repository root):
  pip install -r scripts/media/requirements.txt
  python scripts/media/refresh_watermarks.py --cache ../source-photos --model ../lama_fp32.onnx

The model is intentionally external to git. See docs/PRODUCT_WATERMARKS.md.
No source photographs are overwritten; the cache is required for forced rebuilds.
"""
from __future__ import annotations
import argparse, concurrent.futures, hashlib, io, json, shutil, sys, threading, urllib.parse, urllib.request
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
BASES = (ROOT/'preview', ROOT/'apps/web/public')
MANIFEST = ROOT/'data/product-watermarks.json'
MODEL_SHA256 = '1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6'
LOGO = BASES[0]/'media/matrix-product-watermark.png'
REFERENCE = Path(__file__).with_name('legacy-watermark-alpha.png')
REFERENCE_URL = 'https://matrix-mebli.com/wp-content/uploads/2023/11/logo_.png'
LOCAL = threading.local()
OVERRIDES=json.loads((ROOT/'data/product-watermark-overrides.json').read_text())
sys.path.insert(0,str(ROOT/'scripts/import'))
from product_media import apply_media

def sha(path):
 return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def highpass(a):
 return a-cv2.GaussianBlur(a, (0,0), 2)

def detect(image):
 """Find both proportional and fixed-size legacy stamps, centered in the photo."""
 w,h=image.size
 small=np.array(image.resize((1200,round(h*1200/w)),Image.Resampling.LANCZOS))
 cy=small.shape[0]//2
 grey=cv2.cvtColor(small,cv2.COLOR_RGB2GRAY).astype('float32')
 target=highpass(-np.log(np.maximum(255-grey,4)))
 ref=(np.array(Image.open(REFERENCE))>127).astype('float32')
 best=(-1,None)
 def search(width):
  nonlocal best
  height=round(width*ref.shape[0]/ref.shape[1])
  if height+4>target.shape[0]:return
  m=cv2.resize(ref,(width,height),interpolation=cv2.INTER_AREA)
  template=highpass(-np.log(1-.4*m))
  left=max(0,(1200-width)//2-24);right=min(1200,(1200+width)//2+24)
  top=max(0,cy-height//2-24);bottom=min(target.shape[0],cy+(height+1)//2+24)
  scores=cv2.matchTemplate(target[top:bottom,left:right],template,cv2.TM_CCOEFF_NORMED)
  _,score,_,(x,y)=cv2.minMaxLoc(scores)
  if score>best[0]:best=(score,(left+x,top+y,width,height))
 for width in range(240,1195,12):search(width)
 rough=best[1][2]
 for width in range(max(200,rough-12),min(1200,rough+13),2):search(width)
 score,box=best
 return float(score),[round(v*w/1200) for v in box]

def model_session(model):
 if not hasattr(LOCAL,'session'):
  import onnxruntime as ort
  opts=ort.SessionOptions();opts.intra_op_num_threads=2;opts.inter_op_num_threads=1
  opts.log_severity_level=3
  LOCAL.session=ort.InferenceSession(str(model),opts,providers=['CPUExecutionProvider'])
 return LOCAL.session

def restore(image,box,model):
 """Infer only inside a tight glyph mask; composite onto original-size RGB."""
 arr=np.array(image);h,w=arr.shape[:2];x,y,bw,bh=box
 ref=(np.array(Image.open(REFERENCE))>127).astype('uint8')*255
 mask=np.zeros((h,w),np.uint8)
 glyph=cv2.resize(ref,(bw,bh),interpolation=cv2.INTER_NEAREST)
 mask[y:y+bh,x:x+bw]=glyph
 radius=max(3,round(w/1200*5))
 mask=cv2.dilate(mask,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(radius*2+1,radius*2+1)))
 # Square context with symmetric padding preserves the crop's aspect ratio.
 side=max(round(w*7/12),bw+radius*2+round(w*.12));left=round(x+bw/2-side/2);top=round(y+bh/2-side/2)
 pad=max(0,-left,-top,left+side-w,top+side-h)
 padded=cv2.copyMakeBorder(arr,pad,pad,pad,pad,cv2.BORDER_REFLECT_101)
 pm=cv2.copyMakeBorder(mask,pad,pad,pad,pad,cv2.BORDER_CONSTANT)
 l=left+pad;t=top+pad
 crop=padded[t:t+side,l:l+side];cm=pm[t:t+side,l:l+side]
 inp=cv2.resize(crop,(512,512),interpolation=cv2.INTER_AREA).astype('float32')/255
 inp_mask=cv2.resize(cm,(512,512),interpolation=cv2.INTER_NEAREST).astype('float32')/255
 pred=model_session(model).run(None,{'image':inp.transpose(2,0,1)[None],'mask':inp_mask[None,None]})[0]
 pred=cv2.resize(pred[0].transpose(1,2,0),(side,side),interpolation=cv2.INTER_CUBIC)
 # Feather inward only: all pixels outside the glyph mask remain identical.
 weight=np.clip(cv2.distanceTransform(cm,cv2.DIST_L2,3)/max(1,w/1200*2),0,1)[:,:,None]
 patch=np.clip(np.rint(pred*weight+crop*(1-weight)),0,255).astype('uint8')
 padded[t:t+side,l:l+side]=patch
 out=padded[pad:pad+h,pad:pad+w].copy()
 assert np.array_equal(out[mask==0],arr[mask==0]),'Restoration changed an unmasked pixel'
 ys,xs=np.where(mask>0)
 return Image.fromarray(out),[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]

def brand(image):
 logo=Image.open(LOGO).convert('RGBA')
 width=max(80,round(image.width*.15));height=round(width*logo.height/logo.width)
 if height>image.height*.24:
  height=round(image.height*.24);width=round(height*logo.width/logo.height)
 logo=logo.resize((width,height),Image.Resampling.LANCZOS)
 logo.putalpha(logo.getchannel('A').point(lambda a:round(a*.72)))
 gap=max(8,round(image.width*.02));x=image.width-width-gap;y=image.height-height-gap
 result=image.convert('RGBA');result.alpha_composite(logo,(x,y))
 return result.convert('RGB'),[x,y,x+width,y+height]

def download(url,path):
 if not path.exists():
  req=urllib.request.Request(urllib.parse.quote(url,safe=':/?=&%'),headers={'User-Agent':'MATRIX catalog media maintenance'})
  for attempt in range(3):
   try:
    with urllib.request.urlopen(req,timeout=40) as response:data=response.read()
    with Image.open(io.BytesIO(data)) as image:image.verify()
    path.write_bytes(data);break
   except Exception:
    if attempt==2:raise
 return path

def process(job,model,threshold):
 key,source,path,output=job
 image=ImageOps.exif_transpose(Image.open(path)).convert('RGB')
 score,box=detect(image)
 override=OVERRIDES.get(key[0],{}).get(key[1])
 if override:box=override['box']
 detected=bool(override) or score>=threshold
 mask_bounds=brand_bounds=None
 if detected:
  result,mask_bounds=restore(image,box,model)
  result,brand_bounds=brand(result)
  output=output.with_suffix('.webp')
  output.parent.mkdir(parents=True,exist_ok=True)
  result.save(output,'WEBP',lossless=True,method=4,exact=True)
  decoded=np.array(Image.open(output).convert('RGB'));original=np.array(image)
  outside=np.ones(original.shape[:2],bool)
  for x1,y1,x2,y2 in [mask_bounds,brand_bounds]:outside[y1:y2,x1:x2]=False
  assert np.array_equal(decoded[outside],original[outside]),'Lossless output changed outside pixels'
 else:
  output=output.with_suffix(path.suffix)
  output.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,output)
 rel=output.relative_to(BASES[0]).as_posix()
 destination=BASES[1]/rel;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(output,destination)
 return key,dict(sourceUrl=source,sourceSha256=sha(path),path=rel,sha256=sha(output),size=list(image.size),
                 replaced=detected,confidence=round(score,4),manualOverride=bool(override),fit=box,legacyBounds=mask_bounds,brandBounds=brand_bounds)

def write_catalog(snapshot):
 text=json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n'
 (ROOT/'data/catalog.json').write_text(text)
 (ROOT/'apps/web/lib/source-catalog.json').write_text(text)
 (ROOT/'preview/catalog.js').write_text('// Generated by scripts/import/build_catalog.py.\nwindow.MATRIX_CATALOG = '+json.dumps(snapshot['products'],ensure_ascii=False,indent=2)+';\n')

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--cache',required=True,type=Path);parser.add_argument('--model',required=True,type=Path)
 parser.add_argument('--workers',default=2,type=int);parser.add_argument('--threshold',default=.14,type=float);parser.add_argument('--force',action='store_true')
 args=parser.parse_args()
 assert sha(args.model)==MODEL_SHA256,'Unexpected model checksum'
 args.cache.mkdir(parents=True,exist_ok=True)
 snapshot=json.loads((ROOT/'data/catalog.json').read_text())
 old=json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
 manifest=dict(version=1,logo='media/matrix-product-watermark.png',logoSha256=sha(LOGO),modelSha256=MODEL_SHA256,primary={},gallery={})
 jobs=[]
 for p in snapshot['products']:
  key=p['slug'];cache=args.cache/f'primary-{key}.jpg'
  previous=old.get('primary',{}).get(key)
  if previous and not previous.get('needsReprocess') and previous['replaced'] and p['image']==previous['path'] and not args.force and (BASES[0]/previous['path']).exists() and sha(BASES[0]/previous['path'])==previous['sha256']:
   manifest['primary'][key]=previous;continue
  if previous and p['image']!=previous['path']:
   shutil.copyfile(BASES[0]/p['image'],cache)
  if not cache.exists():
   assert not previous,'Original cache required to force a rebuild'
   shutil.copyfile(BASES[0]/p['image'],cache)
  jobs.append((('primary',key),p['sourceImage'],cache,BASES[0]/f'media/products/{key}.jpg'))
 urls=list(dict.fromkeys(u for p in snapshot['products'] for u in p.get('sourceImages',p['images'])))
 pending=[]
 for url in urls:
  digest=hashlib.sha256(url.encode()).hexdigest()[:20];cache=args.cache/f'{digest}.jpg'
  previous=old.get('gallery',{}).get(url)
  if previous and not previous.get('needsReprocess') and previous['replaced'] and not args.force and (BASES[0]/previous['path']).exists() and sha(BASES[0]/previous['path'])==previous['sha256']:
   manifest['gallery'][url]=previous;continue
  pending.append((url,cache,digest))
 with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
  list(pool.map(lambda v:download(v[0],v[1]),pending))
 for url,cache,digest in pending:jobs.append((('gallery',url),url,cache,BASES[0]/f'media/products/gallery/{digest}.jpg'))
 # Save each completed item: interruption/resume does not repeat completed edits.
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
  futures=[pool.submit(process,j,args.model,args.threshold) for j in jobs]
  for i,future in enumerate(concurrent.futures.as_completed(futures)):
   (kind,key),entry=future.result();manifest[kind][key]=entry
   MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
   if (i+1)%10==0:print(f'{i+1}/{len(jobs)} processed',flush=True)
 manifest['primary']=dict(sorted(manifest['primary'].items()));manifest['gallery']=dict(sorted(manifest['gallery'].items()))
 MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 for p in snapshot['products']:
  apply_media(p,manifest)
  if p['image'].endswith('.webp'):
   for base in BASES:(base/f'media/products/{p["slug"]}.jpg').unlink(missing_ok=True)
 write_catalog(snapshot)
 used={entry['path'] for kind in ('primary','gallery') for entry in manifest[kind].values()}
 for base in BASES:
  for photo in (base/'media/products/gallery').glob('*'):
   if photo.relative_to(base).as_posix() not in used:photo.unlink()
 print(f'DONE: {sum(x["replaced"] for kind in ("primary","gallery") for x in manifest[kind].values())} replacements, {len(jobs)} assets processed',flush=True)

if __name__=='__main__':main()
