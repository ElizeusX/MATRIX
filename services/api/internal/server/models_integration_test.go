package server

import (
 "archive/zip"
 "bytes"
 "database/sql"
 "encoding/json"
 "fmt"
 "image"
 "image/color"
 "image/png"
 "mime/multipart"
 "net/http"
 "net/http/httptest"
 "os"
 "path/filepath"
 "strings"
 "testing"

 _ "github.com/lib/pq"
 "golang.org/x/crypto/bcrypt"
)

func TestModelLifecyclePostgres(t *testing.T){
 dsn:=os.Getenv("MATRIX_TEST_DATABASE_URL")
 if dsn==""{t.Skip("MATRIX_TEST_DATABASE_URL not configured")}
 db,err:=sql.Open("postgres",dsn);if err!=nil{t.Fatal(err)}
 defer db.Close()
 for _,file:=range []string{"001_init.sql","002_operations.sql","003_product_3d.sql","004_3d_photo_sources.sql"}{
  raw,err:=os.ReadFile(filepath.Join("..","..","..","..","database","migrations",file))
  if err!=nil{t.Fatal(err)}
  if _,err:=db.Exec(string(raw));err!=nil{t.Fatalf("migration %s: %v",file,err)}
 }
 t.Cleanup(func(){_,_=db.Exec("TRUNCATE TABLE product_3d_source_photos,product_3d_models,admin_sessions,order_items,orders,admin_users,products,categories CASCADE")})
 _,err=db.Exec("INSERT INTO categories(slug,title_uk) VALUES('ci-furniture','CI Category') ON CONFLICT DO NOTHING");if err!=nil{t.Fatal(err)}
 _,err=db.Exec(`INSERT INTO products(slug,title_uk,category_id,width_mm,depth_mm,height_mm,published,available)
 VALUES('ci-sofa','Synthetic CI sofa',(SELECT id FROM categories WHERE slug='ci-furniture'),2800,1800,NULL,true,false)
 ON CONFLICT(slug) DO UPDATE SET height_mm=NULL,published=true`);if err!=nil{t.Fatal(err)}
 hash,err:=bcrypt.GenerateFromPassword([]byte("only-test-no-default-admin"),bcrypt.MinCost);if err!=nil{t.Fatal(err)}
 var admin string
 err=db.QueryRow(`INSERT INTO admin_users(email,password_hash,role) VALUES('ci-admin@matrix.test',$1,'owner')
 ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id::text`,string(hash)).Scan(&admin)
 if err!=nil{t.Fatal(err)}
 token:=strings.Repeat("a",64)
 _,err=db.Exec("INSERT INTO admin_sessions(token_hash,admin_id,expires_at) VALUES($1,$2::uuid,now()+interval '1 hour')",hashToken(token),admin)
 if err!=nil{t.Fatal(err)}
 s:=New(db);s.SiteOrigin="http://localhost:3000"
 s.SecureCookies=false
 dir:=t.TempDir();t.Setenv("MODEL_STORAGE_DIR",dir)
 handler:=s.Handler()
 send:=func(method,path string,body []byte,typ string,admin bool)*httptest.ResponseRecorder{
  req:=httptest.NewRequest(method,path,bytes.NewReader(body))
  if typ!=""{req.Header.Set("Content-Type",typ)}
  if admin{
   req.Header.Set("Origin","http://localhost:3000")
   req.AddCookie(&http.Cookie{Name:"matrix_admin",Value:token})
  }
  recorder:=httptest.NewRecorder();handler.ServeHTTP(recorder,req)
  return recorder
 }
 post:=func(path string,v any)*httptest.ResponseRecorder{
  body,err:=json.Marshal(v);if err!=nil{t.Fatal(err)}
  return send("POST",path,body,"application/json",true)
 }
 creation:=post("/api/v1/admin/models",map[string]string{"slug":"ci-sofa","notes":"synthetic CI geometry, not a real product"})
 if creation.Code!=201{t.Fatalf("create draft: %d %s",creation.Code,creation.Body.String())}
 var info struct{ID string `json:"id"`}
 if err:=json.Unmarshal(creation.Body.Bytes(),&info);err!=nil||info.ID==""{t.Fatalf("invalid created model: %v",err)}
 if got:=send("GET","/api/v1/models/ci-sofa",nil,"",false);got.Code!=404{t.Fatalf("draft publicly accessible: %d",got.Code)}
 demo,err:=os.ReadFile(filepath.Join("..","..","..","..","preview","models","hilton-2-concept.glb"))
 if err!=nil{t.Fatalf("generate pilot GLB in CI before tests: %v",err)}
 upload:=func(format string,data []byte)*httptest.ResponseRecorder{
  buf:=new(bytes.Buffer);writer:=multipart.NewWriter(buf)
  name:="model."+format;part,err:=writer.CreateFormFile("model",name);if err!=nil{t.Fatal(err)}
  if _,err:=part.Write(data);err!=nil{t.Fatal(err)};if err:=writer.Close();err!=nil{t.Fatal(err)}
  return send("POST","/api/v1/admin/models/"+info.ID+"/files/"+format,buf.Bytes(),writer.FormDataContentType(),true)
 }
 glb:=upload("glb",demo)
 if glb.Code!=201{t.Fatalf("upload GLB: %d %s",glb.Code,glb.Body.String())}
 var measurements struct{Bounds struct{W int64 `json:"width_mm"`;D int64 `json:"depth_mm"`;H int64 `json:"height_mm"`} `json:"measured_bounds"`}
 if err:=json.Unmarshal(glb.Body.Bytes(),&measurements);err!=nil{t.Fatal(err)}
 if measurements.Bounds.W!=2800||measurements.Bounds.D!=1800||measurements.Bounds.H!=850{
  t.Fatalf("unexpected generated concept geometry: %+v",measurements)
 }
 if got:=send("GET","/api/v1/admin/models/"+info.ID+"/file/model.glb",nil,"",false);got.Code!=401{t.Fatalf("draft read without admin: %d",got.Code)}
 if got:=send("GET","/api/v1/admin/models/"+info.ID+"/file/model.glb",nil,"",true);got.Code!=200{t.Fatalf("admin draft preview: %d",got.Code)}
 // Upload signed-off source photo and verify it is private.
 photo:=image.NewRGBA(image.Rect(0,0,160,120))
 for y:=0;y<120;y++{for x:=0;x<160;x++{photo.Set(x,y,color.RGBA{R:125,G:135,B:128,A:255})}}
 buf:=new(bytes.Buffer);if err:=png.Encode(buf,photo);err!=nil{t.Fatal(err)}
 form:=new(bytes.Buffer);multipartWriter:=multipart.NewWriter(form)
 _=multipartWriter.WriteField("rights_confirmed","true")
 _=multipartWriter.WriteField("source_notes","Synthetic locally generated image, test rights only")
 imagePart,err:=multipartWriter.CreateFormFile("photo","ci.png");if err!=nil{t.Fatal(err)}
 _,_=imagePart.Write(buf.Bytes());_=multipartWriter.Close()
 photoResult:=send("POST","/api/v1/admin/models/"+info.ID+"/photos",form.Bytes(),multipartWriter.FormDataContentType(),true)
 if photoResult.Code!=201{t.Fatalf("photo upload: %d %s",photoResult.Code,photoResult.Body.String())}
 // Approval without manufacturer-confirmed height is prohibited.
 approve:=func(action string,ar bool)*httptest.ResponseRecorder{
  return post("/api/v1/admin/models/"+info.ID+"/review",map[string]any{
   "action":action,"rights_confirmed":true,"geometry_confirmed":true,"usdz_scale_confirmed":true,
   "enable_ar":ar,"notes":"Reviewed synthetic bounding box for CI; not a real product"})
 }
 if got:=approve("approve",false);got.Code!=409{t.Fatalf("missing height approved: %d %s",got.Code,got.Body.String())}
 // A valid USDZ is required when AR is requested.
 usdzBuf:=new(bytes.Buffer);zw:=zip.NewWriter(usdzBuf)
 entry,err:=zw.CreateHeader(&zip.FileHeader{Name:"scene.usda",Method:zip.Store});if err!=nil{t.Fatal(err)}
 _,_=entry.Write([]byte(strings.Repeat("#usda 1.0\n",30)))
 if err:=zw.Close();err!=nil{t.Fatal(err)}
 if got:=upload("usdz",usdzBuf.Bytes());got.Code!=201{t.Fatalf("usdz upload: %d %s",got.Code,got.Body.String())}
 if got:=post("/api/v1/admin/products/ci-sofa/dimensions",map[string]any{"width_mm":2800,"depth_mm":1800,"height_mm":850});got.Code!=200{t.Fatalf("dimensions update: %d %s",got.Code,got.Body.String())}
 if got:=approve("approve",true);got.Code!=200{t.Fatalf("approved synthetic fixtures: %d %s",got.Code,got.Body.String())}
 published:=send("GET","/api/v1/models/ci-sofa",nil,"",false)
 if published.Code!=200{t.Fatalf("manifest not published: %d %s",published.Code,published.Body.String())}
 modelFile:=send("GET",fmt.Sprintf("/api/v1/models/assets/%s/model.glb",info.ID),nil,"",false)
 if modelFile.Code!=200||modelFile.Body.Len()==0||modelFile.Header().Get("Content-Type")!="model/gltf-binary"{t.Fatalf("public GLB response: %d %s",modelFile.Code,modelFile.Header().Get("Content-Type"))}
 usdFile:=send("GET",fmt.Sprintf("/api/v1/models/assets/%s/model.usdz",info.ID),nil,"",false)
 if usdFile.Code!=200||usdFile.Header().Get("Content-Type")!="model/vnd.usdz+zip"{t.Fatalf("public USDZ response: %d",usdFile.Code)}
 if got:=approve("disable",false);got.Code!=200{t.Fatalf("disabling model: %d %s",got.Code,got.Body.String())}
 if got:=send("GET","/api/v1/models/ci-sofa",nil,"",false);got.Code!=404{t.Fatalf("disabled model publicly accessible: %d",got.Code)}
}
