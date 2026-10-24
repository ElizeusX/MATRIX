// Package model3d extracts true vertex bounds from a strict subset of glTF 2.0
// binary scenes. Unsupported compression/animation is rejected rather than
// inventing dimensions or trusting attacker-supplied accessor min/max.
package model3d

import (
 "encoding/binary"
 "encoding/json"
 "errors"
 "fmt"
 "math"
)

type Bounds struct {
 WidthMM int64 `json:"width_mm"`
 DepthMM int64 `json:"depth_mm"`
 HeightMM int64 `json:"height_mm"`
 FloorOffsetMM int64 `json:"floor_offset_mm"`
}

type glTF struct {
 Asset struct{Version string `json:"version"`} `json:"asset"`
 Scene *int `json:"scene"`
 Scenes []struct{Nodes []int `json:"nodes"`} `json:"scenes"`
 Nodes []struct {
  Mesh *int `json:"mesh"`
  Children []int `json:"children"`
  Matrix []float64 `json:"matrix"`
  Translation []float64 `json:"translation"`
  Rotation []float64 `json:"rotation"`
  Scale []float64 `json:"scale"`
  Skin *int `json:"skin"`
 } `json:"nodes"`
 Meshes []struct{
  Primitives []struct{
   Attributes map[string]int `json:"attributes"`
   Mode *int `json:"mode"`
   Targets []json.RawMessage `json:"targets"`
   Extensions map[string]json.RawMessage `json:"extensions"`
  } `json:"primitives"`
 } `json:"meshes"`
 Accessors []struct{
  BufferView *int `json:"bufferView"`
  ComponentType int `json:"componentType"`
  Count int `json:"count"`
  Type string `json:"type"`
  ByteOffset int `json:"byteOffset"`
  Sparse json.RawMessage `json:"sparse"`
 } `json:"accessors"`
 BufferViews []struct{
  Buffer int `json:"buffer"`
  ByteOffset int `json:"byteOffset"`
  ByteLength int `json:"byteLength"`
  ByteStride int `json:"byteStride"`
 } `json:"bufferViews"`
 Buffers []struct{ByteLength int `json:"byteLength"`;URI string `json:"uri"`} `json:"buffers"`
 Animations []json.RawMessage `json:"animations"`
 Skins []json.RawMessage `json:"skins"`
 ExtensionsRequired []string `json:"extensionsRequired"`
}

type matrix [16]float64
func identity()matrix {return matrix{1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1}}
func multiply(a,b matrix)matrix{
 var o matrix
 for col:=0;col<4;col++{for row:=0;row<4;row++{
  for k:=0;k<4;k++{o[col*4+row]+=a[k*4+row]*b[col*4+k]}
 }}
 return o
}
func nodeMatrix(n struct{Mesh *int `json:"mesh"`;Children []int `json:"children"`;Matrix []float64 `json:"matrix"`;Translation []float64 `json:"translation"`;Rotation []float64 `json:"rotation"`;Scale []float64 `json:"scale"`;Skin *int `json:"skin"`})(matrix,error){
 if len(n.Matrix)>0{
  if len(n.Matrix)!=16||len(n.Translation)>0||len(n.Rotation)>0||len(n.Scale)>0{return matrix{},errors.New("invalid node matrix")}
  var m matrix;copy(m[:],n.Matrix)
  for _,v:=range m{if math.IsNaN(v)||math.IsInf(v,0){return matrix{},errors.New("invalid transform")}}
  return m,nil
 }
 t:=[3]float64{};s:=[3]float64{1,1,1};q:=[4]float64{0,0,0,1}
 if len(n.Translation)>0{if len(n.Translation)!=3{return matrix{},errors.New("translation must have 3 values")};copy(t[:],n.Translation)}
 if len(n.Scale)>0{if len(n.Scale)!=3{return matrix{},errors.New("scale must have 3 values")};copy(s[:],n.Scale)}
 if len(n.Rotation)>0{if len(n.Rotation)!=4{return matrix{},errors.New("rotation must have 4 values")};copy(q[:],n.Rotation)}
 for _,v:=range append(append(t[:],s[:]...),q[:]...){if math.IsNaN(v)||math.IsInf(v,0){return matrix{},errors.New("invalid transform")}}
 x,y,z,w:=q[0],q[1],q[2],q[3]
 norm:=x*x+y*y+z*z+w*w
 if math.Abs(norm-1)>0.01{return matrix{},errors.New("quaternion must be normalized")}
 m:=matrix{
  (1-2*(y*y+z*z))*s[0],(2*(x*y+z*w))*s[0],(2*(x*z-y*w))*s[0],0,
  (2*(x*y-z*w))*s[1],(1-2*(x*x+z*z))*s[1],(2*(y*z+x*w))*s[1],0,
  (2*(x*z+y*w))*s[2],(2*(y*z-x*w))*s[2],(1-2*(x*x+y*y))*s[2],0,
  t[0],t[1],t[2],1,
 }
 return m,nil
}
func transform(m matrix, p [3]float64)[3]float64{
 return [3]float64{
  m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
  m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
  m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14],
 }
}

// InspectGLB enforces self-contained non-animated glTF with float32 triangle
// positions. It derives bounds from binary vertices, not declared min/max.
func InspectGLB(data []byte)(Bounds,error){
 if len(data)<32||len(data)>50<<20{return Bounds{},errors.New("GLB size invalid")}
 if string(data[:4])!="glTF"||binary.LittleEndian.Uint32(data[4:8])!=2||int(binary.LittleEndian.Uint32(data[8:12]))!=len(data){return Bounds{},errors.New("invalid GLB header")}
 offset:=12
 if offset+8>len(data){return Bounds{},errors.New("missing GLB JSON")}
 jsonLen:=int(binary.LittleEndian.Uint32(data[offset:offset+4]));chunkType:=binary.LittleEndian.Uint32(data[offset+4:offset+8]);offset+=8
 if chunkType!=0x4E4F534A||jsonLen<=0||jsonLen>4<<20||jsonLen%4!=0||offset+jsonLen>len(data){return Bounds{},errors.New("invalid GLB JSON chunk")}
 var asset glTF
 if err:=json.Unmarshal(data[offset:offset+jsonLen],&asset);err!=nil{return Bounds{},err}
 offset+=jsonLen
 if asset.Asset.Version!="2.0"||len(asset.Animations)>0||len(asset.Skins)>0||len(asset.ExtensionsRequired)>0{return Bounds{},errors.New("unsupported or animated glTF")}
 if offset+8>len(data){return Bounds{},errors.New("GLB must contain an embedded BIN chunk")}
 binaryLen:=int(binary.LittleEndian.Uint32(data[offset:offset+4]))
 if binary.LittleEndian.Uint32(data[offset+4:offset+8])!=0x004E4942||binaryLen%4!=0||binaryLen<12||offset+8+binaryLen!=len(data){return Bounds{},errors.New("invalid GLB BIN chunk")}
 binaryPart:=data[offset+8:]
 if len(asset.Buffers)!=1||asset.Buffers[0].URI!=""||asset.Buffers[0].ByteLength<=0||asset.Buffers[0].ByteLength>binaryLen{return Bounds{},errors.New("GLB contains external or invalid buffers")}
 if len(asset.Scenes)==0||len(asset.Nodes)==0||len(asset.Meshes)==0{return Bounds{},errors.New("empty glTF scene")}
 scene:=0;if asset.Scene!=nil{scene=*asset.Scene}
 if scene<0||scene>=len(asset.Scenes){return Bounds{},errors.New("invalid default scene")}
 min:=[3]float64{math.Inf(1),math.Inf(1),math.Inf(1)}
 max:=[3]float64{math.Inf(-1),math.Inf(-1),math.Inf(-1)}
 vertices:=0
 visited:=make(map[int]bool)
 var walk func(int,matrix,int)error
 walk=func(index int,parent matrix,depth int)error{
  if depth>100||index<0||index>=len(asset.Nodes)||visited[index]{return errors.New("invalid or cyclic node tree")}
  visited[index]=true
  defer delete(visited,index)
  node:=asset.Nodes[index]
  if node.Skin!=nil{return errors.New("skinned meshes are not supported")}
  local,err:=nodeMatrix(node);if err!=nil{return err}
  world:=multiply(parent,local)
  if node.Mesh!=nil{
   if *node.Mesh<0||*node.Mesh>=len(asset.Meshes){return errors.New("invalid mesh index")}
   for _,prim:=range asset.Meshes[*node.Mesh].Primitives{
    if prim.Mode!=nil&&*prim.Mode!=4{return errors.New("only triangle meshes are supported")}
    if len(prim.Targets)!=0||len(prim.Extensions)!=0{return errors.New("compressed and morph targets require offline validation")}
    accessorID,ok:=prim.Attributes["POSITION"]
    if !ok||accessorID<0||accessorID>=len(asset.Accessors){return errors.New("POSITION accessor missing")}
    a:=asset.Accessors[accessorID]
    if a.ComponentType!=5126||a.Type!="VEC3"||a.BufferView==nil||a.Count<3||a.Count>1_000_000||len(a.Sparse)>0{return errors.New("unsupported vertex attribute")}
    if *a.BufferView<0||*a.BufferView>=len(asset.BufferViews){return errors.New("invalid bufferView")}
    v:=asset.BufferViews[*a.BufferView]
    if v.Buffer!=0||v.ByteOffset<0||v.ByteLength<0||a.ByteOffset<0{return errors.New("invalid buffer offset")}
    stride:=v.ByteStride;if stride==0{stride=12}
    if stride<12||stride>255||stride%4!=0{return errors.New("invalid vertex stride")}
    if a.Count>(1_000_000-vertices){return errors.New("too many vertices")}
    end:=int64(v.ByteOffset)+int64(a.ByteOffset)+int64(a.Count-1)*int64(stride)+12
    if end>int64(v.ByteOffset)+int64(v.ByteLength)||end>int64(asset.Buffers[0].ByteLength){return errors.New("vertex bytes out of range")}
    base:=v.ByteOffset+a.ByteOffset
    for i:=0;i<a.Count;i++{
     pos:=base+i*stride
     point:=[3]float64{}
     for j:=0;j<3;j++{
      point[j]=float64(math.Float32frombits(binary.LittleEndian.Uint32(binaryPart[pos+j*4:pos+j*4+4])))
      if math.IsNaN(point[j])||math.IsInf(point[j],0){return errors.New("non-finite vertex")}
     }
     transformed:=transform(world,point)
     for j:=0;j<3;j++{if transformed[j]<min[j]{min[j]=transformed[j]};if transformed[j]>max[j]{max[j]=transformed[j]}}
    }
    vertices+=a.Count
   }
  }
  for _,child:=range node.Children{if err:=walk(child,world,depth+1);err!=nil{return err}}
  return nil
 }
 for _,root:=range asset.Scenes[scene].Nodes{if err:=walk(root,identity(),0);err!=nil{return Bounds{},err}}
 if vertices==0{return Bounds{},errors.New("scene has no positions")}
 for j:=0;j<3;j++{if max[j]-min[j]<0.01||max[j]-min[j]>15{return Bounds{},fmt.Errorf("axis %d outside furniture dimensions",j)}}
 if min[1]<-0.015||min[1]>0.015{return Bounds{},errors.New("model must rest on Y=0 floor; re-export with floor origin")}
 return Bounds{
  WidthMM:int64(math.Round(1000*(max[0]-min[0]))),
  DepthMM:int64(math.Round(1000*(max[2]-min[2]))),
  HeightMM:int64(math.Round(1000*(max[1]-min[1]))),
  FloorOffsetMM:int64(math.Round(1000*min[1])),
 },nil
}
func Matches(b Bounds,w,d,h int64)bool{
 if w<=0||d<=0||h<=0{return false}
 near:=func(a,c int64)bool{tol:=int64(math.Ceil(float64(c)*0.01));if tol<5{tol=5};return a>=c-tol&&a<=c+tol}
 return near(b.WidthMM,w)&&near(b.DepthMM,d)&&near(b.HeightMM,h)&&b.FloorOffsetMM>=-15&&b.FloorOffsetMM<=15
}
