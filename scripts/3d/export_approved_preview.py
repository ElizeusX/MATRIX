#!/usr/bin/env python3
"""Export ONLY an already approved public API model into the static Pages release.
Usage: python scripts/3d/export_approved_preview.py https://your-matrix-api.example hilton-2
No credentials or approval bypass. Run after /admin/3d review, inspect diff, commit.
"""
import argparse, hashlib, json, pathlib, re, urllib.parse, urllib.request, zipfile, io
ROOT=pathlib.Path(__file__).resolve().parents[2]

def export(base,slug):
    parsed=urllib.parse.urlsplit(base)
    if parsed.scheme!='https' or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError('A public HTTPS API origin is required')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,119}',slug):raise ValueError('Invalid product slug')
    origin=parsed.scheme+'://'+parsed.netloc
    def read(url,limit):
        p=urllib.parse.urlsplit(url)
        if (p.scheme,p.netloc)!=(parsed.scheme,parsed.netloc):raise ValueError('Asset must use the same API origin')
        with urllib.request.urlopen(url,timeout=30) as response:
            final=urllib.parse.urlsplit(response.geturl())
            if (final.scheme,final.netloc)!=(parsed.scheme,parsed.netloc):raise ValueError('Cross-origin redirect rejected')
            data=response.read(limit+1)
            if len(data)>limit:raise ValueError('Asset exceeds size budget')
            return data
    m=json.loads(read(origin+'/api/v1/models/'+slug,64*1024))
    if not (m.get('slug')==slug and m.get('status')=='approved' and all(m.get(k) is True for k in ['enabled_3d','geometry_verified','rights_confirmed'])):
        raise ValueError('API did not return an approved product model')
    if not all(isinstance(m.get(k),int) and not isinstance(m[k],bool) and m[k]>0 for k in ['width_mm','depth_mm','height_mm']):
        raise ValueError('Confirmed dimensions are required')
    pending=[]
    for kind,limit in [('glb',50<<20),('usdz',70<<20)]:
        if kind=='usdz' and not m.get('enabled_ar'):m.pop('usdz_url',None);continue
        source=m.get(kind+'_url','')
        if not source.startswith('/api/v1/models/assets/') or not source.endswith('/model.'+kind):raise ValueError('Unexpected approved asset URL')
        data=read(origin+source,limit)
        if kind=='glb' and data[:4]!=b'glTF':raise ValueError('Invalid GLB response')
        if kind=='usdz':
            with zipfile.ZipFile(io.BytesIO(data)) as package:
                if not package.namelist() or not package.namelist()[0].endswith(('.usd','.usdc','.usda')):raise ValueError('Missing USD root')
                if any(i.compress_type!=zipfile.ZIP_STORED for i in package.infolist()):raise ValueError('Compressed USDZ rejected')
        digest=hashlib.sha256(data).hexdigest()
        target='models/'+slug+'-'+digest[:20]+'.'+kind
        pending.append((ROOT/'preview'/target,data));m[kind+'_url']=target;m[kind+'_sha256']=digest
    # Only change the active manifest after both complete downloads succeeded.
    for target,data in pending:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    target=ROOT/'preview/model-manifests'/(slug+'.json');target.parent.mkdir(exist_ok=True)
    temp=target.with_suffix('.tmp');temp.write_text(json.dumps(m,indent=2)+'\n');temp.replace(target)
    print('Exported approved model:',slug,'AR:',m.get('enabled_ar',False))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('api_origin');parser.add_argument('slug')
    args=parser.parse_args();export(args.api_origin,args.slug)
