"""Rounded, crowned upholstery, seam piping and embedded PBR GLB/USDZ export."""
import io
import json
import math
import pathlib
import struct
import tempfile
import zipfile
import numpy as np
from PIL import Image
from pxr import Sdf
from build_hilton2_draft import Model


class SurfaceModel(Model):
    segments=10
    def panel(self, name, center, size, radius=.035, bulge=.003, tilt=0, material=0):
        # Avoid self-intersection on thin seams and timber parts.
        super().panel(name, center, size, min(radius, min(size)*.44), bulge, tilt, material)

    def line(self, name, points, radius=.0022, material=1):
        points=np.array(points,dtype=float)
        verts=[]; faces=[]; uv=[]
        for i,p in enumerate(points):
            tangent=points[min(i+1,len(points)-1)]-points[max(0,i-1)]
            tangent/=max(np.linalg.norm(tangent),1e-10)
            ref=np.array([0.,1.,0.]) if abs(tangent[1])<.9 else np.array([1.,0.,0.])
            a=np.cross(tangent,ref);a/=np.linalg.norm(a);b=np.cross(tangent,a)
            for j in range(6):
                v=p+radius*(a*math.cos(j*math.tau/6)+b*math.sin(j*math.tau/6))
                verts.append(v);uv.append((i*.03,j/6))
            if i:
                for j in range(6):
                    k=i*6+j;q=i*6+(j+1)%6
                    faces.extend([(k-6,k,q),(k-6,q,q-6)])
        self.parts.append([name,np.array(verts),np.array(faces,dtype=np.uint32),np.array(uv),material])

    def seam(self,name,c,size,plane='top',tilt=0):
        # Rounded rectangular piping in the seat top or cushion front plane.
        x,y,z=c;w,h,d=size
        inset=min(.065,w*.15,(d if plane=='top' else h)*.18)
        a,b=(w/2-inset,d/2-inset) if plane=='top' else (w/2-inset,h/2-inset)
        r=min(.035,a*.25,b*.25);pts=[]
        for sx,sy,start in [(1,1,0),(-1,1,90),(-1,-1,180),(1,-1,270)]:
            for angle in np.linspace(start,start+90,6):
                t=math.radians(angle);u=sx*(a-r)+r*math.cos(t);v=sy*(b-r)+r*math.sin(t)
                pts.append((x+u,y+h/2+.001,z+v) if plane=='top' else (x+u,y+v,z+d/2+.001-tilt*v))
        pts.append(pts[0]);self.line(name,pts)

    def finish(self, target):
        points=np.concatenate([p[1] for p in self.parts]);lo=points.min(0);hi=points.max(0)
        scale=np.array(target)/(hi-lo)
        for part in self.parts:
            p=(part[1]-lo)*scale;p[:,0]-=target[0]/2;p[:,2]-=target[2]/2
            part[1]=p.astype('<f4')
            f=part[2];n=np.cross(p[f[:,1]]-p[f[:,0]],p[f[:,2]]-p[f[:,0]])
            normals=np.zeros_like(p)
            for j in range(3): np.add.at(normals,f[:,j],n)
            _,inverse=np.unique(np.round(p,6),axis=0,return_inverse=True)
            welded=np.zeros((inverse.max()+1,3));np.add.at(welded,inverse,normals)
            normals=welded[inverse];normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12)
            part.append(normals.astype('<f4'))


def fabric():
    rng=np.random.default_rng(20261025);s=256;y,x=np.mgrid[:s,:s]
    # Seamless original woven fabric, neutral so each photo profile can tint it.
    h=.035*np.cos(x*math.tau/4)+.035*np.cos(y*math.tau/4)+rng.normal(0,.02,(s,s))
    cloud=np.zeros((s,s))
    for cells in (4,8,16,32):
        # Periodic broad nap variation makes close upholstery reads less uniform.
        small=Image.fromarray(rng.integers(0,255,(cells,cells),dtype=np.uint8))
        tiled=Image.fromarray(np.tile(np.asarray(small),(3,3)))
        cloud+=np.asarray(tiled.resize((s*3,s*3),Image.Resampling.BICUBIC),dtype=float)[s:s*2,s:s*2]/255/cells**.3
    cloud=(cloud-cloud.mean())/cloud.std()
    color=np.uint8(np.clip(233+2.4*cloud+70*h+rng.normal(0,1.6,(s,s)),0,255))
    dx=np.roll(h,-1,1)-np.roll(h,1,1);dy=np.roll(h,-1,0)-np.roll(h,1,0)
    normal=np.dstack((-dx,-dy,np.ones_like(h)));normal/=np.linalg.norm(normal,axis=2)[:,:,None]
    out=[]
    for a in [np.repeat(color[:,:,None],3,axis=2),np.uint8((normal+1)*127.5)]:
        b=io.BytesIO();Image.fromarray(a).save(b,format='PNG');out.append(b.getvalue())
    return out


def export(model, folder, slug, profile, extras, textures):
    folder=pathlib.Path(folder);folder.mkdir(parents=True,exist_ok=True)
    buf=bytearray();views=[];access=[];meshes=[]
    def view(raw,target=None):
        buf.extend(b'\0'*(-len(buf)%4));v=dict(buffer=0,byteOffset=len(buf),byteLength=len(raw))
        if target:v['target']=target
        views.append(v);buf.extend(raw);return len(views)-1
    def acc(arr,kind,ctype):
        a=dict(bufferView=view(arr.tobytes(),34963 if kind=='SCALAR' else 34962),componentType=ctype,count=len(arr),type=kind)
        if kind=='VEC3':a.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
        access.append(a);return len(access)-1
    for name,p,f,uv,mat,n in model.parts:
        meshes.append(dict(name=name,primitives=[dict(attributes=dict(POSITION=acc(p,'VEC3',5126),NORMAL=acc(n,'VEC3',5126),TEXCOORD_0=acc(uv.astype('<f4'),'VEC2',5126)),indices=acc(f.flatten().astype('<u4'),'SCALAR',5125),material=mat,mode=4)]))
    palette=profile.get('shape',{}).get('palette',{})
    to_linear=lambda v: v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    def rgb(hexcolor):return [to_linear(int(hexcolor[i:i+2],16)/255) for i in (1,3,5)]
    color=rgb(palette.get('body',profile['color']))
    family=profile.get('shape',{}).get('family')
    secondary=rgb(palette['secondary']) if 'secondary' in palette else color
    back=rgb(palette.get('back',profile['color']))
    cap=rgb(profile.get('shape',{}).get('cap_color','#42382e'))
    feet=[.32,.31,.28] if family in ('venera','bed','fellini') else [.035,.035,.035]
    accent=rgb('#ad839e') if family=='delta' else rgb('#d0c6a7')
    colors=[color,[v*.65 for v in color],feet,cap,accent,secondary,back]
    names=['Photo_fabric','Stitched_recess','Feet','Caps_and_slats','Accent_pillow','Secondary_fabric','Back_cushion_fabric']
    materials=[]
    for i,(name,c) in enumerate(zip(names,colors)):
        pbr=dict(baseColorFactor=c+[1],metallicFactor=.65 if i==2 else 0,roughnessFactor=.35 if i in (2,3) else .88)
        mat=dict(name=name,pbrMetallicRoughness=pbr)
        if i not in (2,3):
            pbr['baseColorTexture']={'index':0};mat['normalTexture']={'index':1,'scale':.35}
            mat['extensions']={'KHR_materials_sheen':{'sheenColorFactor':[.16,.16,.16],'sheenRoughnessFactor':.85}}
        materials.append(mat)
    images=[dict(bufferView=view(t),mimeType='image/png') for t in textures]
    doc=dict(asset=dict(version='2.0',generator='MATRIX photo-specific continuous upholstery v2',extras=extras),
        extensionsUsed=['KHR_materials_sheen'],scene=0,scenes=[dict(nodes=list(range(len(meshes))))],
        nodes=[dict(name=m['name'],mesh=i) for i,m in enumerate(meshes)],meshes=meshes,
        buffers=[dict(byteLength=len(buf))],bufferViews=views,accessors=access,materials=materials,
        images=images,textures=[dict(source=i,sampler=0) for i in range(2)],
        samplers=[dict(magFilter=9729,minFilter=9987,wrapS=10497,wrapT=10497)])
    j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*(-len(j)%4);buf+=b'\0'*(-len(buf)%4)
    glb=struct.pack('<III',0x46546c67,2,28+len(j)+len(buf))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(buf),0x004e4942)+buf
    (folder/f'{slug}-v2-draft.glb').write_bytes(glb)
    if extras['dimensions_estimated']:return len(glb)
    # Matching vertices, Y-up/metres, embedded texture and aligned uncompressed USDZ.
    usd=['#usda 1.0\n(defaultPrim="Furniture"\nmetersPerUnit=1\nupAxis="Y")\ndef Xform "Furniture" {',
         'custom string reviewStatus = "DRAFT_UNVERIFIED_HEIGHT_ESTIMATED_PREVIEW_ONLY"']
    for i,c in enumerate(colors):
        textured=i not in (2,3)
        diffuse=f'color3f inputs:diffuseColor.connect = </Furniture/Mat{i}/Texture.outputs:rgb>' if textured else f'color3f inputs:diffuseColor = ({",".join(map(str,c))})'
        usd.append(f'''def Material "Mat{i}" {{
 token outputs:surface.connect = </Furniture/Mat{i}/PBR.outputs:surface>
 def Shader "PBR" {{
  uniform token info:id = "UsdPreviewSurface"
  {diffuse}
  float inputs:roughness = {0.35 if i in (2,3) else .88}
  float inputs:metallic = {0.65 if i==2 else 0}
  token outputs:surface
 }}''')
        if textured:
            usd.append(f'''def Shader "UV" {{
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
 float4 inputs:scale = ({','.join(map(str,c))},1)
 float2 inputs:st.connect = </Furniture/Mat{i}/UV.outputs:result>
 float3 outputs:rgb
 }}''')
        usd.append('}')
    def tuples(a):return ','.join('('+','.join(f'{float(v):.7g}' for v in row)+')' for row in a)
    for part_index,(name,p,f,uv,mat,n) in enumerate(model.parts):
        name="part_"+str(part_index)
        usd.append(f'''def Mesh "{name}" (prepend apiSchemas = ["MaterialBindingAPI"]) {{
 uniform token subdivisionScheme = "none"
 point3f[] points = [{tuples(p)}]
 int[] faceVertexCounts = [{','.join(['3']*len(f))}]
 int[] faceVertexIndices = [{','.join(map(str,f.flatten()))}]
 normal3f[] normals = [{tuples(n)}] (interpolation="vertex")
 texCoord2f[] primvars:st = [{tuples(uv)}] (interpolation="vertex")
 rel material:binding = </Furniture/Mat{mat}>
}}''')
    usd.append('}');layer=Sdf.Layer.CreateAnonymous()
    if not layer.ImportFromString('\n'.join(usd)):raise RuntimeError(slug+' USD import failed')
    with tempfile.TemporaryDirectory() as tmp:
        crate=pathlib.Path(tmp)/'furniture.usdc';layer.Export(str(crate));usdbytes=crate.read_bytes()
    with zipfile.ZipFile(folder/f'{slug}-v2-estimated.usdz','w',compression=zipfile.ZIP_STORED) as z:
        for name,data in [('furniture.usdc',usdbytes),('fabric.png',textures[0])]:
            info=zipfile.ZipInfo(name);padding=(-(z.fp.tell()+30+len(name)+4))%64
            info.extra=struct.pack('<HH',0x1986,padding)+b'\0'*padding;z.writestr(info,data)
    return len(glb)
