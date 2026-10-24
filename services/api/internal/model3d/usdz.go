package model3d

import (
 "archive/zip"
 "bytes"
 "errors"
 "path"
 "strings"
)

func InspectUSDZ(data []byte)error {
 if len(data)<128||len(data)>70<<20{return errors.New("USDZ size invalid")}
 reader,err:=zip.NewReader(bytes.NewReader(data),int64(len(data)))
 if err!=nil{return err}
 if len(reader.File)==0||len(reader.File)>2000{return errors.New("USDZ package empty or excessive")}
 rootScene:=false
 var uncompressed uint64
 for i,f:=range reader.File {
  name:=f.Name
  if f.Flags&1!=0||f.Method!=zip.Store||strings.HasPrefix(name,"/")||strings.Contains(name,"\\")||path.Clean(name)!=name||name==".."||strings.HasPrefix(name,"../"){return errors.New("invalid USDZ entry")}
  if f.FileInfo().IsDir(){continue}
  if f.UncompressedSize64>200<<20{return errors.New("USDZ entry too large")}
  uncompressed+=f.UncompressedSize64
  if uncompressed>150<<20{return errors.New("USDZ uncompressed package too large")}
  if i==0&&(strings.HasSuffix(strings.ToLower(name),".usdc")||strings.HasSuffix(strings.ToLower(name),".usda")||strings.HasSuffix(strings.ToLower(name),".usd")){rootScene=true}
 }
 if !rootScene{return errors.New("USDZ must begin with a USD root scene")}
 return nil
}
