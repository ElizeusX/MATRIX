package model3d

import (
 "archive/zip"
 "bytes"
 "encoding/binary"
 "encoding/json"
 "strings"
 "math"
 "testing"
)

func fixtureGLB(width,depth,height float32)[]byte {
 verts:=[][3]float32{{0,0,0},{width,0,0},{width,height,depth},{0,height,depth}}
 raw:=make([]byte,len(verts)*12)
 for i,p:=range verts{
  for j,v:=range p{binary.LittleEndian.PutUint32(raw[i*12+j*4:],mathBits(v))}
 }
 doc:=map[string]any{
  "asset":map[string]string{"version":"2.0"},
  "buffers":[]any{map[string]any{"byteLength":len(raw)}},
  "bufferViews":[]any{map[string]any{"buffer":0,"byteLength":len(raw)}},
  "accessors":[]any{map[string]any{"bufferView":0,"componentType":5126,"count":len(verts),"type":"VEC3"}},
  "meshes":[]any{map[string]any{"primitives":[]any{map[string]any{"attributes":map[string]int{"POSITION":0}}}}},
  "nodes":[]any{map[string]int{"mesh":0}},
  "scenes":[]any{map[string]any{"nodes":[]int{0}}},
  "scene":0,
 }
 j,_:=json.Marshal(doc)
 for len(j)%4!=0{j=append(j,' ')}
 n:=12+8+len(j)+8+len(raw)
 b:=make([]byte,n)
 copy(b[:4],[]byte("glTF"));binary.LittleEndian.PutUint32(b[4:],2);binary.LittleEndian.PutUint32(b[8:],uint32(n))
 binary.LittleEndian.PutUint32(b[12:],uint32(len(j)));binary.LittleEndian.PutUint32(b[16:],0x4E4F534A);copy(b[20:],j)
 offset:=20+len(j);binary.LittleEndian.PutUint32(b[offset:],uint32(len(raw)));binary.LittleEndian.PutUint32(b[offset+4:],0x004E4942);copy(b[offset+8:],raw)
 return b
}
func mathBits(v float32)uint32{return math.Float32bits(v)}
func TestVerifiedBounds(t *testing.T){
 model:=fixtureGLB(2.8,1.8,0.85)
 got,err:=InspectGLB(model)
 if err!=nil{t.Fatal(err)}
 if !Matches(got,2800,1800,850){t.Fatalf("incorrect scale: %+v",got)}
 if Matches(got,2800,1800,900){t.Fatal("accepted wrong height")}
 if Matches(got,0,1800,850){t.Fatal("accepted missing dimensions")}
}
func TestRejectCorruptGLB(t *testing.T){
 raw:=fixtureGLB(2.8,1.8,0.85)
 raw[0]='!'
 if _,err:=InspectGLB(raw);err==nil{t.Fatal("bad magic accepted")}
}
func TestRejectUnverifiedDimensions(t *testing.T){
 model:=fixtureGLB(2.8,1.8,0.85)
 actual,_:=InspectGLB(model)
 if Matches(actual,2800,1800,0){t.Fatal("unknown height accepted")}
}
func TestUSDZNotArbitraryZip(t *testing.T){
 buf:=new(bytes.Buffer)
 w:=zip.NewWriter(buf)
 f,_:=w.CreateHeader(&zip.FileHeader{Name:"scene.usda",Method:zip.Store})
 _,_=f.Write([]byte(strings.Repeat("#usda 1.0\n",20)))
 _=w.Close()
 if err:=InspectUSDZ(buf.Bytes());err!=nil{t.Fatal(err)}
 bad:=new(bytes.Buffer);z:=zip.NewWriter(bad)
 f,_=z.Create("scene.usda");_,_=f.Write([]byte(strings.Repeat("#usda 1.0\n",20)));_=z.Close()
 if err:=InspectUSDZ(bad.Bytes());err==nil{t.Fatal("compressed zip accepted")}
}
