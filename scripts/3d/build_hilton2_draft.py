#!/usr/bin/env python3
"""Photo-guided surface study, NOT a measured replica. See docs/HILTON2_PILOT.md.
Reproducible: python -m pip install numpy Pillow usd-core; python scripts/3d/build_hilton2_draft.py
All mesh coordinates are baked metres, Y-up. USD and glTF share the same vertices.
"""
import io, json, math, pathlib, struct, zipfile, tempfile
from pxr import Sdf
import numpy as np
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT/'preview/models'

class Model:
    def __init__(self): self.parts=[]
    def panel(self,name,center,size,radius=.04,bulge=.006,tilt=0,material=0):
        # Tessellated upholstery panels: rounded edge transitions, crowned faces,
        # slight broad compression near the edge, rather than flat box primitives.
        half=np.array(size)/2; core=half-radius
        verts=[]; norms=[]; uv=[]; faces=[]
        n=16
        for axis in range(3):
            axes=[a for a in range(3) if a!=axis]
            for sign in [-1,1]:
                start=len(verts)
                for j in range(n+1):
                    v=-1+2*j/n
                    for i in range(n+1):
                        u=-1+2*i/n
                        p=np.zeros(3);p[axis]=sign*half[axis];p[axes]=[u*half[axes[0]],v*half[axes[1]]]
                        nearest=np.clip(p,-core,core);delta=p-nearest
                        p=nearest+radius*delta/np.linalg.norm(delta)
                        crown=(1-u*u)**2*(1-v*v)**2
                        p[axis]+=sign*bulge*crown
                        # Back cushions incline toward the rear as they rise.
                        p[2]-=tilt*p[1]
                        p+=center
                        verts.append(p);uv.append(((u+1)*size[axes[0]]*3,(v+1)*size[axes[1]]*3))
                for j in range(n):
                    for i in range(n):
                        a=start+j*(n+1)+i;b=a+1;c=a+n+1;d=c+1
                        tris=[(a,b,d),(a,d,c)]
                        normal=np.cross(np.array(verts[b])-verts[a],np.array(verts[d])-verts[a])
                        if normal[axis]*sign<0:tris=[(a,d,b),(a,c,d)]
                        faces.extend(tris)
        self.parts.append([name,np.array(verts),np.array(faces,dtype=np.uint32),np.array(uv),material])

    def finish(self):
        allv=np.concatenate([p[1] for p in self.parts]);lo=allv.min(0);hi=allv.max(0)
        scale=np.array([2.8,.98,1.8])/(hi-lo) # .98 is study height, never product data.
        for part in self.parts:
            p=(part[1]-lo)*scale;p[:,0]-=1.4;p[:,2]-=.9;part[1]=p.astype('<f4')
            normals=np.zeros_like(p)
            for tri in part[2]:
                a,b,c=p[tri];norm=np.cross(b-a,c-a)
                for k in tri:normals[k]+=norm
            # Weld normals across coincident face-edge vertices to avoid shading seams.
            groups={}
            for i,v in enumerate(p):groups.setdefault(tuple(np.round(v,6)),[]).append(i)
            for ids in groups.values():normals[ids]=normals[ids].sum(0)
            normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12)
            part.append(normals.astype('<f4'))


def fabric():
    rng=np.random.default_rng(412);s=512
    # Original, seamless procedural nap. Not extracted from a branded/watermarked photo.
    noise=rng.random((s,s)); cloud=np.zeros((s,s))
    for k in [4,8,16,32]:
        small=Image.fromarray((rng.random((k,k))*255).astype('uint8'))
        cloud+=np.asarray(small.resize((s,s),Image.Resampling.BICUBIC))/255/k**.35
    cloud=(cloud-cloud.mean())/cloud.std()
    value=1+.045*cloud+.055*(noise-.5)
    color=np.clip(value[:,:,None]*np.array([65,83,104]),0,255).astype('uint8')
    y,x=np.mgrid[:s,:s];h=.06*np.sin(x*math.pi)+.06*np.sin(y*math.pi/2)+.18*(noise-.5)
    dx=np.roll(h,-1,1)-np.roll(h,1,1);dy=np.roll(h,-1,0)-np.roll(h,1,0)
    normal=np.dstack((-dx,-dy,np.ones_like(h)));normal/=np.linalg.norm(normal,axis=2)[:,:,None]
    out=[]
    for arr in [color,np.uint8(np.clip((normal+1)*127.5,0,255))]:
        f=io.BytesIO();Image.fromarray(arr).save(f,format='PNG');out.append(f.getvalue())
    return out


def export(model):
    OUT.mkdir(exist_ok=True,parents=True)
    textures=fabric();buf=bytearray();views=[];access=[];meshes=[]
    def view(raw,target=None):
        buf.extend(b'\0'*((-len(buf))%4));v={'buffer':0,'byteOffset':len(buf),'byteLength':len(raw)}
        if target:v['target']=target
        views.append(v);buf.extend(raw);return len(views)-1
    def accessor(arr,kind,ctype):
        v=view(arr.tobytes(),34963 if kind=='SCALAR' else 34962)
        a={'bufferView':v,'componentType':ctype,'count':len(arr),'type':kind}
        if kind=='VEC3':a.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
        access.append(a);return len(access)-1
    for name,p,f,uv,mat,n in model.parts:
        meshes.append({'name':name,'primitives':[{'attributes':{'POSITION':accessor(p,'VEC3',5126),'NORMAL':accessor(n,'VEC3',5126),'TEXCOORD_0':accessor(uv.astype('<f4'),'VEC2',5126)},'indices':accessor(f.flatten().astype('<u4'),'SCALAR',5125),'material':mat,'mode':4}]})
    images=[{'bufferView':view(t),'mimeType':'image/png'} for t in textures]
    materials=[]
    for name,factor in [('Blue_microfiber_appearance_study',1),('Recessed_panel_edges',.68)]:
        materials.append({'name':name,'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'baseColorFactor':[factor,factor,factor,1],'metallicFactor':0,'roughnessFactor':.92},'normalTexture':{'index':1,'scale':.28}})
    extras={'product_slug':'hilton-2','approval':'DRAFT_ONLY','accurate_AR':False,'room_measurement_allowed':False,'verified_width_m':2.8,'verified_depth_m':1.8,'height_m_UNVERIFIED':.98,'geometry_verified':False,'method':'Authored photo-guided upholstery surface study; not photogrammetry','rights':'User confirmed photo-use rights on 2026-10-24','limitations':'Unmeasured proportions, procedural fabric; underside and concealed hardware omitted.'}
    doc={'asset':{'version':'2.0','generator':'MATRIX Hilton-2 photo-guided draft v1','extras':extras},'scene':0,'scenes':[{'nodes':list(range(len(meshes)))}],'nodes':[{'name':m['name'],'mesh':i} for i,m in enumerate(meshes)],'meshes':meshes,'accessors':access,'bufferViews':views,'buffers':[{'byteLength':len(buf)}],'materials':materials,'images':images,'textures':[{'source':i,'sampler':0} for i in range(2)],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]}
    j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);buf+=b'\0'*((-len(buf))%4)
    glb=struct.pack('<III',0x46546c67,2,28+len(j)+len(buf))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(buf),0x004e4942)+buf
    (OUT/'hilton-2-draft.glb').write_bytes(glb)
    # USDZ remains a draft. Explicit estimated-preview opt-in may publish a matching copy.
    usd=['#usda 1.0\n( defaultPrim = "Hilton2"\n metersPerUnit = 1\n upAxis = "Y"\n)\ndef Xform "Hilton2" {', 'custom string reviewStatus = "DRAFT_UNVERIFIED_HEIGHT_ESTIMATED_PREVIEW_ONLY"']
    for index,material in enumerate(materials):
        factor=1 if index==0 else .68
        usd.append(f'''def Material "Fabric{index}" {{
 token outputs:surface.connect = </Hilton2/Fabric{index}/PBR.outputs:surface>
 def Shader "PBR" {{
  uniform token info:id = "UsdPreviewSurface"
  color3f inputs:diffuseColor.connect = </Hilton2/Fabric{index}/Texture.outputs:rgb>
  float inputs:roughness = 0.92
  float inputs:metallic = 0
  token outputs:surface
 }}
 def Shader "UV" {{
  uniform token info:id = "UsdPrimvarReader_float2"
  token inputs:varname = "st"
  float2 outputs:result
 }}
 def Shader "Texture" {{
  uniform token info:id = "UsdUVTexture"
  asset inputs:file = @fabric.png@
  token inputs:sourceColorSpace = "sRGB"
  token inputs:wrapS = "repeat"
  token inputs:wrapT = "repeat"
  float4 inputs:scale = ({factor}, {factor}, {factor}, 1)
  float2 inputs:st.connect = </Hilton2/Fabric{index}/UV.outputs:result>
  float3 outputs:rgb
 }}
}}''')
    def tuples(a):return ','.join('('+','.join(f'{float(v):.7g}' for v in row)+')' for row in a)
    for name,p,f,uv,mat,n in model.parts:
        usd.append(f'''def Mesh "{name}" (prepend apiSchemas = ["MaterialBindingAPI"]) {{
 uniform token subdivisionScheme = "none"
 point3f[] points = [{tuples(p)}]
 int[] faceVertexCounts = [{','.join(['3']*len(f))}]
 int[] faceVertexIndices = [{','.join(map(str,f.flatten()))}]
 normal3f[] normals = [{tuples(n)}] ( interpolation = "vertex" )
 texCoord2f[] primvars:st = [{tuples(uv)}] ( interpolation = "vertex" )
 rel material:binding = </Hilton2/Fabric{mat}>
}}''')
    usd.append('}')
    review=ROOT/'artifacts/3d';review.mkdir(parents=True,exist_ok=True)
    layer=Sdf.Layer.CreateAnonymous();layer.ImportFromString('\n'.join(usd))
    with tempfile.TemporaryDirectory(dir=review) as tmp:
        crate=pathlib.Path(tmp)/'hilton2.usdc';layer.Export(str(crate));usdbytes=crate.read_bytes()
    with zipfile.ZipFile(review/'hilton-2-draft.usdz','w',compression=zipfile.ZIP_STORED) as z:
        for name,data in [('hilton2.usdc',usdbytes),('fabric.png',textures[0])]:
            info=zipfile.ZipInfo(name);padding=(-(z.fp.tell()+30+len(name)+4))%64
            info.extra=struct.pack('<HH',0x1986,padding)+b'\0'*padding
            z.writestr(info,data)
    manifest_path=ROOT/'preview/model-manifests/hilton-2.json'
    if manifest_path.exists() and json.loads(manifest_path.read_text()).get('preview_ar') is True:
        (OUT/'hilton-2-estimated.usdz').write_bytes((review/'hilton-2-draft.usdz').read_bytes())
    report={**extras,'bounds_m':{'width':2.8,'depth':1.8,'study_height_not_product_height':.98},'triangles':sum(len(p[2]) for p in model.parts),'glb_bytes':len(glb),'parts':[p[0] for p in model.parts]}
    (OUT/'hilton-2-draft.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


def main():
    m=Model()
    # Left chaise configuration matches the blue catalog photograph.
    # Concealed legs, internal mechanisms, invisible fasteners are not invented.
    m.panel('chaise_upholstered_plinth',(-.79,.175,.10),(.94,.35,1.78),.045,.003)
    m.panel('main_upholstered_plinth',(.43,.175,-.21),(1.48,.35,1.16),.035,.003)
    m.panel('chaise_seat',(-.79,.43,.12),(.96,.18,1.78),.055,.012)
    for i,x in enumerate([.06,.80]):m.panel(f'seat_{i+1}',(x,.43,-.10),(.735,.18,.91),.045,.009)
    for side in [-1,1]:
        x=side*1.25
        m.panel(f'arm_body_{"left" if side<0 else "right"}',(x,.29,-.25),(.30,.58,1.25),.075,.004)
        m.panel(f'arm_crown_{"left" if side<0 else "right"}',(x,.635,-.24),(.33,.16,1.29),.055,.02)
    # Rear panels visible in the manufacturer rear photograph, no hidden hardware.
    for i,(x,width) in enumerate([(-.76,.74),(.37,1.50)]):
        m.panel(f'rear_lower_panel_{i}',(x,.19,-.78),(width,.38,.19),.02,.001)
        m.panel(f'rear_upper_panel_{i}',(x,.575,-.78),(width,.38,.19),.025,.002)
    for i,x in enumerate([-.76,0,.76]):
        m.panel(f'backrest_{i+1}',(x,.675,-.56),(.75,.34,.20),.045,.012,tilt=.23)
        m.panel(f'headrest_{i+1}',(x,.904,-.63),(.75,.16,.205),.043,.007,tilt=.24)
    m.finish();export(m)
if __name__=='__main__':main()
