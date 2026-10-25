#!/usr/bin/env python3
"""Regression checks against independently recorded source-photo observations.
These supplement visual side-by-side review; they do not certify a replica.
"""
import json
import pathlib
import struct
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2]

def read_meshes(slug,with_faces=False):
    m=json.loads((ROOT/f'preview/model-manifests/{slug}.json').read_text())
    assert m['shape_revision']==2 and '-v2-' in m['glb_url']
    data=(ROOT/'preview'/m['glb_url']).read_bytes();n=struct.unpack_from('<I',data,12)[0]
    doc=json.loads(data[20:20+n]);binary=data[28+n:];meshes={}
    for mesh in doc['meshes']:
        a=doc['accessors'][mesh['primitives'][0]['attributes']['POSITION']]
        v=doc['bufferViews'][a['bufferView']]
        pts=np.frombuffer(binary,dtype='<f4',count=a['count']*3,offset=v.get('byteOffset',0)).reshape(-1,3)
        if with_faces:
            ids=doc['accessors'][mesh['primitives'][0]['indices']];view=doc['bufferViews'][ids['bufferView']]
            faces=np.frombuffer(binary,dtype='<u4',count=ids['count'],offset=view.get('byteOffset',0)).reshape(-1,3)
            meshes[mesh['name']]=(pts,faces)
        else:meshes[mesh['name']]=pts
    return meshes

def main():
    reviews=json.loads((ROOT/'scripts/3d/photo_shape_review.json').read_text())['products']
    for slug,r in reviews.items():
        assert (ROOT/'preview'/r['photo']).exists()
        meshes=read_meshes(slug);total=np.ptp(np.concatenate(list(meshes.values())),axis=0)
        for prefix,count in r['counts'].items():
            # Edge piping belongs to the same shell, not an additional cushion.
            found=sum(name.startswith(prefix) and not name.endswith(('_sewn_edge','_top_welt')) for name in meshes)
            assert found==count,(slug,prefix,found,count)
        for rule in r.get('ratios',[]):
            ratio=np.ptp(meshes[rule['mesh']],axis=0)[rule['axis']]/total[rule['total_axis']]
            assert rule['min']<=ratio<=rule['max'],(slug,rule,ratio)
        assert not any('headrest_' in name or '_channel_' in name for name in meshes),slug
    hilton=read_meshes('hilton-p')
    assert np.ptp(hilton['seat_shell_0'],axis=0)[2] > np.ptp(hilton['seat_shell_2'],axis=0)[2]+.25
    delta=read_meshes('delta');assert len(delta)<=10
    assert np.ptp(delta['high_violet_sweep'],axis=0)[1]>.25
    # A closed swept back must have opposing windings on each shared edge,
    # including the narrow top/end caps seen when the buyer rotates it.
    for name,(points,faces) in read_meshes('delta',with_faces=True).items():
        if 'sweep' not in name:continue
        edges={}
        for a,b,c in faces:
            for u,v in ((a,b),(b,c),(c,a)):
                key=(min(u,v),max(u,v));count,direction=edges.get(key,(0,0))
                edges[key]=(count+1,direction+(1 if u<v else -1))
        assert all(count==2 and direction==0 for count,direction in edges.values()),name
    daybed=read_meshes('lizhko-skay');assert daybed['daybed_right_return'][:,0].min()>.8
    print('PASS: source-photo cushion/module counts, arm/seat proportions, asymmetric Hilton return, continuous Delta curve, split bed slats and right-side daybed return.')

if __name__=='__main__':main()
