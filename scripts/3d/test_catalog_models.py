#!/usr/bin/env python3
"""Independent export checks: actual vertices, asset identity and paired USD scale."""
import json
import pathlib
import struct
import zipfile
import numpy as np
from pxr import Usd, UsdGeom
from catalog_profiles import profiles
from build_catalog_models import ROOT, OUT


def inspect(slug, record):
    manifest=json.loads((ROOT/f'preview/model-manifests/{slug}.json').read_text())
    data=(ROOT/'preview'/manifest['glb_url']).read_bytes()
    assert data[:4]==b'glTF' and struct.unpack_from('<II',data,4)==(2,len(data)),slug
    n,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a
    doc=json.loads(data[20:20+n]);binary=data[28+n:]
    assert struct.unpack_from('<II',data,20+n)==(len(binary),0x004e4942)
    ex=doc['asset']['extras'];assert ex['product_slug']==slug and ex['approval']=='DRAFT_ONLY'
    assert not ex['accurate_AR'] and not ex['geometry_verified'] and not ex['room_measurement_allowed']
    points=[]
    for mesh in doc['meshes']:
        for prim in mesh['primitives']:
            def read(index,width):
                a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
                dt={5126:'<f4',5125:'<u4'}[a['componentType']]
                start=v.get('byteOffset',0)+a.get('byteOffset',0)
                assert start+a['count']*width*4<=len(binary)
                return np.frombuffer(binary,dtype=dt,count=a['count']*width,offset=start).reshape(-1,width)
            p=read(prim['attributes']['POSITION'],3);norm=read(prim['attributes']['NORMAL'],3)
            uv=read(prim['attributes']['TEXCOORD_0'],2);ids=read(prim['indices'],1)
            assert np.isfinite(p).all() and np.isfinite(norm).all() and np.isfinite(uv).all()
            assert len(norm)==len(p)==len(uv) and ids.max()<len(p) and len(ids)%3==0
            assert np.linalg.norm(norm,axis=1).min()>.9
            points.append(p)
    points=np.concatenate(points);size=np.ptp(points,axis=0)
    expected=np.array([manifest['width_mm'] or manifest['estimated_width_mm'],manifest['estimated_height_mm'],manifest['depth_mm'] or manifest['estimated_depth_mm']])/1000
    assert np.allclose(size,expected,atol=1e-5),(slug,size,expected)
    assert abs(points[:,1].min())<1e-6
    assert data and len(data)<4*1024*1024,(slug,len(data))
    assert len(doc['meshes'])>=15 and len(doc['images'])==2
    assert all('uri' not in i for i in doc['images']),slug
    assert manifest['height_mm'] is None and manifest['geometry_verified'] is False
    known=record.get('width') is not None and record.get('depth') is not None
    assert manifest['width_mm']==record.get('width') and manifest['depth_mm']==record.get('depth')
    assert manifest['enabled_ar']==manifest['preview_ar']==known
    assert manifest['dimensions_estimated']==(not known)
    if known:
        usdz=ROOT/'preview'/manifest['usdz_url']
        with zipfile.ZipFile(usdz) as z:
            for f in z.infolist():
                assert f.compress_type==zipfile.ZIP_STORED
                with usdz.open('rb') as raw:
                    raw.seek(f.header_offset+26);name,extra=struct.unpack('<HH',raw.read(4))
                assert (f.header_offset+30+name+extra)%64==0
            assert z.namelist()==['furniture.usdc','fabric.png']
        stage=Usd.Stage.Open(str(usdz));assert stage
        assert UsdGeom.GetStageMetersPerUnit(stage)==1 and UsdGeom.GetStageUpAxis(stage)=='Y'
        usdpoints=np.concatenate([np.array(UsdGeom.Mesh(p).GetPointsAttr().Get()) for p in stage.Traverse() if p.IsA(UsdGeom.Mesh)])
        assert np.allclose(usdpoints,points,atol=1e-6),slug
    else:assert 'usdz_url' not in manifest
    return len(data),known


def main():
    records={p['slug']:p for p in json.loads((ROOT/'data/catalog.json').read_text())['products']}
    results=[inspect(slug,records[slug]) for slug in profiles()]
    print(f'PASS: {len(results)} product-specific textured GLBs, {sum(ar for _,ar in results)} matching USDZ pairs; {max(b for b,_ in results)//1024} KiB maximum GLB; estimates remain drafts.')


if __name__=='__main__':main()
