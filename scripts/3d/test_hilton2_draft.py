#!/usr/bin/env python3
"""Read real mesh positions independently; compare both exports, including units."""
import json, pathlib, struct, zipfile
import numpy as np
from pxr import Usd, UsdGeom
root=pathlib.Path(__file__).resolve().parents[2]
data=(root/'preview/models/hilton-2-draft.glb').read_bytes()
assert data[:4]==b'glTF' and struct.unpack_from('<II',data,4)==(2,len(data))
n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);binary=data[28+n:]
extras=doc['asset']['extras'];assert extras['approval']=='DRAFT_ONLY' and not extras['accurate_AR'] and not extras['geometry_verified']
assert not extras['room_measurement_allowed']
points=[]
for mesh in doc['meshes']:
 for p in mesh['primitives']:
  a=doc['accessors'][p['attributes']['POSITION']];v=doc['bufferViews'][a['bufferView']]
  pts=np.frombuffer(binary,dtype='<f4',count=a['count']*3,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,3)
  assert np.isfinite(pts).all();points.append(pts)
  indices=doc['accessors'][p['indices']];iv=doc['bufferViews'][indices['bufferView']]
  ids=np.frombuffer(binary,dtype='<u4',count=indices['count'],offset=iv['byteOffset'])
  assert ids.max()<len(pts) and len(ids)%3==0
points=np.concatenate(points);size=np.ptp(points,axis=0)
assert np.allclose(size,[2.8,.98,1.8],atol=1e-5),size
assert abs(points[:,1].min())<1e-6
assert len(data)<4*1024*1024
assert all('uri' not in i and i['mimeType']=='image/png' for i in doc['images'])
usdz=root/'artifacts/3d/hilton-2-draft.usdz'
with zipfile.ZipFile(usdz) as z:
 for f in z.infolist():
  assert f.compress_type==zipfile.ZIP_STORED
  with usdz.open('rb') as raw:
   raw.seek(f.header_offset+26);name,extra=struct.unpack('<HH',raw.read(4))
  assert (f.header_offset+30+name+extra)%64==0
stage=Usd.Stage.Open(str(usdz));assert stage
assert UsdGeom.GetStageMetersPerUnit(stage)==1 and UsdGeom.GetStageUpAxis(stage)=='Y'
bounds=UsdGeom.BBoxCache(Usd.TimeCode.Default(),['default']).ComputeWorldBound(stage.GetDefaultPrim()).ComputeAlignedRange()
assert np.allclose(bounds.GetSize(),size,atol=1e-5)
# Also compare vertices, not just equal bounding boxes.
usdpoints=np.concatenate([np.array(UsdGeom.Mesh(p).GetPointsAttr().Get()) for p in stage.Traverse() if p.IsA(UsdGeom.Mesh)])
assert np.allclose(usdpoints,points,atol=1e-6)
assert (root/'preview/models/hilton-2-estimated.usdz').read_bytes()==usdz.read_bytes(), 'Estimated AR must use the same validated USDZ geometry'
manifest=json.loads((root/'preview/model-manifests/hilton-2.json').read_text())
assert manifest['height_mm'] is None and abs(manifest['estimated_height_mm']/1000-size[1])<1e-5
print(f'PASS: GLB/USDZ vertices, metres/Y-up, floor, PBR, package alignment, draft status. Bounds {size}; {len(data)} bytes')
