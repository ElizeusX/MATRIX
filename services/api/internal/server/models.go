package server

import (
 "crypto/sha256"
 "database/sql"
 "encoding/hex"
 "encoding/json"
 "errors"
 "fmt"
 "io"
 "net/http"
 "os"
 "path/filepath"
 "regexp"
 "strings"
 "time"

 "github.com/ElizeusX/MATRIX/services/api/internal/model3d"
)

// The published model manifest is served only after a human-approved geometry,
// three manufacturer-verified dimensions and a rights assertion are recorded.
// Arbitrary draft uploads are never public.
type modelRecord struct {
 ID string `json:"id"`
 Slug string `json:"slug"`
 Version int `json:"version"`
 Status string `json:"status"`
 WidthMM *int64 `json:"width_mm"`
 DepthMM *int64 `json:"depth_mm"`
 HeightMM *int64 `json:"height_mm"`
 GlbURL string `json:"glb_url,omitempty"`
 UsdzURL string `json:"usdz_url,omitempty"`
 HasGLB bool `json:"has_glb"`
 HasUSDZ bool `json:"has_usdz"`
 GeometryVerified bool `json:"geometry_verified"`
 RightsConfirmed bool `json:"rights_confirmed"`
 Enabled3D bool `json:"enabled_3d"`
 EnabledAR bool `json:"enabled_ar"`
 Notes string `json:"notes,omitempty"`
 FailureReason string `json:"failure_reason,omitempty"`
}

var idUUID=regexp.MustCompile(`^[0-9a-fA-F-]{36}$`)

func (s *Server) publicModel(w http.ResponseWriter,r *http.Request){
 slug:=r.PathValue("slug")
 if !slugOK(slug){fail(w,404,"model unavailable");return}
 var m modelRecord
 var hasUSDZ bool
 err:=s.DB.QueryRowContext(r.Context(),`
 SELECT m.id::text,p.slug,m.version,m.status,m.measured_width_mm,m.measured_depth_mm,m.measured_height_mm,
        m.usdz_file IS NOT NULL,m.enabled_ar
 FROM product_3d_models m JOIN products p ON p.id=m.product_id
 WHERE p.slug=$1 AND p.published AND m.status='approved'
 AND m.enabled_3d AND m.geometry_verified AND m.rights_confirmed AND m.glb_file IS NOT NULL
 AND p.width_mm IS NOT NULL AND p.depth_mm IS NOT NULL AND p.height_mm IS NOT NULL
 AND abs(m.measured_width_mm-p.width_mm)<=greatest(5,ceil(p.width_mm::numeric/100))
 AND abs(m.measured_depth_mm-p.depth_mm)<=greatest(5,ceil(p.depth_mm::numeric/100))
 AND abs(m.measured_height_mm-p.height_mm)<=greatest(5,ceil(p.height_mm::numeric/100))
 ORDER BY m.version DESC LIMIT 1`,slug).
 Scan(&m.ID,&m.Slug,&m.Version,&m.Status,&m.WidthMM,&m.DepthMM,&m.HeightMM,&hasUSDZ,&m.EnabledAR)
 if errors.Is(err,sql.ErrNoRows){fail(w,404,"no approved 3D model");return}
 if err!=nil{fail(w,503,"model unavailable");return}
 m.GeometryVerified=true;m.RightsConfirmed=true;m.HasGLB=true;m.Enabled3D=true;m.HasUSDZ=hasUSDZ
 m.GlbURL="/api/v1/models/assets/"+m.ID+"/model.glb"
 if m.EnabledAR&&m.HasUSDZ{m.UsdzURL="/api/v1/models/assets/"+m.ID+"/model.usdz"}
 jsonReply(w,200,m)
}

func(s *Server) adminModels(w http.ResponseWriter,r *http.Request){
 slug:=r.URL.Query().Get("slug")
 if !slugOK(slug){fail(w,400,"valid product slug required");return}
 rows,err:=s.DB.QueryContext(r.Context(),`
 SELECT m.id::text,p.slug,m.version,m.status,m.measured_width_mm,m.measured_depth_mm,m.measured_height_mm,
 m.glb_file IS NOT NULL,m.usdz_file IS NOT NULL,m.geometry_verified,m.rights_confirmed,m.enabled_3d,m.enabled_ar,
 coalesce(m.reviewer_notes,''),coalesce(m.failure_reason,'')
 FROM product_3d_models m JOIN products p ON p.id=m.product_id WHERE p.slug=$1 ORDER BY m.version DESC LIMIT 30`,slug)
 if err!=nil{fail(w,503,"model database unavailable");return}
 defer rows.Close()
 result:=[]modelRecord{}
 for rows.Next(){
  var m modelRecord
  if err:=rows.Scan(&m.ID,&m.Slug,&m.Version,&m.Status,&m.WidthMM,&m.DepthMM,&m.HeightMM,&m.HasGLB,&m.HasUSDZ,&m.GeometryVerified,&m.RightsConfirmed,&m.Enabled3D,&m.EnabledAR,&m.Notes,&m.FailureReason);err!=nil{fail(w,503,"model database unavailable");return}
  if m.HasGLB{m.GlbURL="/api/v1/admin/models/"+m.ID+"/file/model.glb"}
  if m.HasUSDZ{m.UsdzURL="/api/v1/admin/models/"+m.ID+"/file/model.usdz"}
  result=append(result,m)
 }
 if err:=rows.Err();err!=nil{fail(w,503,"model database unavailable");return}
 jsonReply(w,200,map[string]any{"items":result})
}
func(s *Server) newDraftModel(w http.ResponseWriter,r *http.Request){
 var input struct{Slug string `json:"slug"`;Notes string `json:"notes"`}
 if decode(r,&input)!=nil||!slugOK(input.Slug)||len(input.Notes)>2000{fail(w,400,"invalid model request");return}
 tx,err:=s.DB.BeginTx(r.Context(),nil)
 if err!=nil{fail(w,503,"database unavailable");return};defer tx.Rollback()
 var productID string
 if err:=tx.QueryRowContext(r.Context(),"SELECT id::text FROM products WHERE slug=$1 FOR UPDATE",input.Slug).Scan(&productID);err!=nil{fail(w,404,"product not found");return}
 var nextVersion int
 if err:=tx.QueryRowContext(r.Context(),"SELECT coalesce(max(version),0)+1 FROM product_3d_models WHERE product_id=$1::uuid",productID).Scan(&nextVersion);err!=nil{fail(w,503,"database unavailable");return}
 var id string
 err=tx.QueryRowContext(r.Context(),`INSERT INTO product_3d_models(product_id,version,source_photo_notes,created_by) VALUES($1::uuid,$2,$3,$4::uuid) RETURNING id::text`,productID,nextVersion,input.Notes,adminID(r)).Scan(&id)
 if err!=nil{fail(w,503,"model cannot be created");return}
 if _,err:=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id) VALUES($1::uuid,'3d.model_draft','product_3d_model',$2)`,adminID(r),id);err!=nil{fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,201,map[string]any{"id":id,"version":nextVersion,"status":"draft"})
}

// uploadModel accepts multipart file 'model'. Only validated self-contained
// GLB or USDZ with no external URLs is persisted. Replacing an approved model
// requires creating a new draft version so published files remain immutable.
func(s *Server) uploadModel(w http.ResponseWriter,r *http.Request){
 id:=r.PathValue("id");kind:=r.PathValue("format")
 if !idUUID.MatchString(id)||(kind!="glb"&&kind!="usdz"){fail(w,400,"invalid model upload");return}
 r.Body=http.MaxBytesReader(w,r.Body,72<<20)
 if err:=r.ParseMultipartForm(8<<20);err!=nil{fail(w,413,"file too large or invalid");return}
 if r.MultipartForm!=nil{defer r.MultipartForm.RemoveAll()}
 file,head,err:=r.FormFile("model")
 if err!=nil{fail(w,400,"missing model file");return}
 defer file.Close()
 if strings.ToLower(filepath.Ext(head.Filename))!="."+kind{fail(w,400,"file extension must match format");return}
 data,err:=io.ReadAll(io.LimitReader(file,70<<20+1))
 if err!=nil||len(data)>70<<20{fail(w,413,"file too large");return}
 if len(data)==0{fail(w,400,"empty model file");return}
 var measured model3d.Bounds
 if kind=="glb"{
  measured,err=model3d.InspectGLB(data)
 }else{
  err=model3d.InspectUSDZ(data)
 }
 if err!=nil{fail(w,422,"model validation failed: "+err.Error());return}
 dir:=os.Getenv("MODEL_STORAGE_DIR")
 if dir==""{dir="./model-data"}
 if err:=os.MkdirAll(dir,0700);err!=nil{fail(w,503,"model storage unavailable");return}
 sha:=sha256.Sum256(data);digest:=hex.EncodeToString(sha[:])
 fileName:=id+"-"+digest[:20]+"."+kind
 path:=filepath.Join(dir,fileName)
 tx,err:=s.DB.BeginTx(r.Context(),nil)
 if err!=nil{fail(w,503,"database unavailable");return};defer tx.Rollback()
 var status string
 if err:=tx.QueryRowContext(r.Context(),"SELECT status FROM product_3d_models WHERE id=$1::uuid FOR UPDATE",id).Scan(&status);err!=nil{fail(w,404,"model draft not found");return}
 if status=="approved"{fail(w,409,"create a new version before replacing an approved model");return}
 created,err:=storeModel(path,data)
 if err!=nil{fail(w,503,"model storage unavailable");return}
 if kind=="glb"{
  _,err=tx.ExecContext(r.Context(),`UPDATE product_3d_models
  SET glb_file=$2,glb_sha256=$3,measured_width_mm=$4,measured_depth_mm=$5,measured_height_mm=$6,
  status='needs_review',geometry_verified=false,rights_confirmed=false,enabled_3d=false,enabled_ar=false,updated_at=now()
  WHERE id=$1::uuid`,id,fileName,digest,measured.WidthMM,measured.DepthMM,measured.HeightMM)
 }else{
  _,err=tx.ExecContext(r.Context(),`UPDATE product_3d_models SET usdz_file=$2,usdz_sha256=$3,
  status='needs_review',geometry_verified=false,rights_confirmed=false,enabled_3d=false,enabled_ar=false,updated_at=now()
  WHERE id=$1::uuid`,id,fileName,digest)
 }
 if err!=nil{if created{_ =os.Remove(path)};fail(w,503,"database unavailable");return}
 if _,err:=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id,new_value)
 VALUES($1::uuid,'3d.upload','product_3d_model',$2,jsonb_build_object('format',$3,'sha256',$4))`,adminID(r),id,kind,digest);err!=nil{if created{_ =os.Remove(path)};fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{if created{_ =os.Remove(path)};fail(w,503,"database unavailable");return}
 jsonReply(w,201,map[string]any{"id":id,"format":kind,"sha256":digest,"measured_bounds":measured,"status":"needs_review"})
}
func storeModel(path string,data []byte)(bool,error){
 // Content-addressed filename makes repeated uploads idempotent and safe.
 f,err:=os.OpenFile(path,os.O_WRONLY|os.O_CREATE|os.O_EXCL,0600)
 if errors.Is(err,os.ErrExist){return false,nil}
 if err!=nil{return false,err}
 if _,err=f.Write(data);err!=nil{f.Close();os.Remove(path);return false,err}
 if err=f.Close();err!=nil{os.Remove(path);return false,err}
 return true,nil
}

func(s *Server) reviewModel(w http.ResponseWriter,r *http.Request){
 id:=r.PathValue("id")
 if !idUUID.MatchString(id){fail(w,400,"invalid model id");return}
 var input struct{
  Action string `json:"action"`
  RightsConfirmed bool `json:"rights_confirmed"`
  GeometryConfirmed bool `json:"geometry_confirmed"`
  USDZScaleConfirmed bool `json:"usdz_scale_confirmed"`
  EnableAR bool `json:"enable_ar"`
  Notes string `json:"notes"`
 }
 if decode(r,&input)!=nil||len(input.Notes)>3000||!map[string]bool{"approve":true,"reject":true,"disable":true}[input.Action]{fail(w,400,"invalid review action");return}
 tx,err:=s.DB.BeginTx(r.Context(),nil)
 if err!=nil{fail(w,503,"database unavailable");return};defer tx.Rollback()
 var status string
 var glb,usdz sql.NullString
 var measuredW,measuredD,measuredH,productW,productD,productH sql.NullInt64
 err=tx.QueryRowContext(r.Context(),`
 SELECT m.status,m.glb_file,m.usdz_file,m.measured_width_mm,m.measured_depth_mm,m.measured_height_mm,
 p.width_mm,p.depth_mm,p.height_mm FROM product_3d_models m JOIN products p ON p.id=m.product_id
 WHERE m.id=$1::uuid FOR UPDATE OF m,p`,id).Scan(&status,&glb,&usdz,&measuredW,&measuredD,&measuredH,&productW,&productD,&productH)
 if errors.Is(err,sql.ErrNoRows){fail(w,404,"model not found");return}
 if err!=nil{fail(w,503,"database unavailable");return}
 switch input.Action{
 case "approve":
  if status=="approved"{fail(w,409,"approved version immutable");return}
  if status!="needs_review"||!glb.Valid||!measuredW.Valid||!measuredD.Valid||!measuredH.Valid||!productW.Valid||!productD.Valid||!productH.Valid||!input.RightsConfirmed||!input.GeometryConfirmed||strings.TrimSpace(input.Notes)==""{
   fail(w,409,"approval requires uploaded GLB, verified dimensions, rights and reviewer notes");return
  }
  bounds:=model3d.Bounds{WidthMM:measuredW.Int64,DepthMM:measuredD.Int64,HeightMM:measuredH.Int64}
  if !model3d.Matches(bounds,productW.Int64,productD.Int64,productH.Int64){fail(w,409,fmt.Sprintf("3D dimensions %d/%d/%d mm do not match product dimensions",bounds.WidthMM,bounds.DepthMM,bounds.HeightMM));return}
  if input.EnableAR&&(!usdz.Valid||!input.USDZScaleConfirmed){fail(w,409,"AR publication requires USDZ and independent scale confirmation");return}
  _,err=tx.ExecContext(r.Context(),`UPDATE product_3d_models SET status='approved',rights_confirmed=true,geometry_verified=true,
    enabled_3d=true,enabled_ar=$2,reviewer_notes=$3,reviewed_by=$4::uuid,reviewed_at=now(),updated_at=now()
    WHERE id=$1::uuid`,id,input.EnableAR,input.Notes,adminID(r))
 case "reject":
  if status=="approved"{fail(w,409,"approved models cannot be rejected; disable instead");return}
  _,err=tx.ExecContext(r.Context(),`UPDATE product_3d_models SET status='draft',enabled_3d=false,enabled_ar=false,
    rights_confirmed=false,geometry_verified=false,reviewer_notes=$2,updated_at=now() WHERE id=$1::uuid`,id,input.Notes)
 case "disable":
  if status!="approved"{fail(w,409,"model is not approved");return}
  _,err=tx.ExecContext(r.Context(),`UPDATE product_3d_models SET enabled_3d=false,enabled_ar=false,reviewer_notes=$2,updated_at=now()
   WHERE id=$1::uuid`,id,input.Notes)
 }
 if err!=nil{fail(w,503,"database unavailable");return}
 if _,err:=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id,new_value)
 VALUES($1::uuid,$2,'product_3d_model',$3,jsonb_build_object('notes',$4))`,adminID(r),"3d."+input.Action,id,input.Notes);err!=nil{fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]string{"id":id,"status":input.Action})
}

func (s *Server) servePublicModelFile(w http.ResponseWriter,r *http.Request){s.serveModelFile(w,r,false)}
func (s *Server) servePrivateModelFile(w http.ResponseWriter,r *http.Request){s.serveModelFile(w,r,true)}
func (s *Server) serveModelFile(w http.ResponseWriter,r *http.Request,private bool){
 id:=r.PathValue("id");name:=r.PathValue("filename")
 if !idUUID.MatchString(id)||(name!="model.glb"&&name!="model.usdz"){fail(w,404,"model file not found");return}
 field:="m.glb_file"
 mime:="model/gltf-binary"
 if name=="model.usdz"{field="m.usdz_file";mime="model/vnd.usdz+zip"}
 query:=`SELECT `+field+` FROM product_3d_models m`
 if !private{
  query+=` JOIN products p ON p.id=m.product_id
  WHERE m.id=$1::uuid AND p.published AND m.status='approved' AND m.rights_confirmed AND m.geometry_verified
  AND m.enabled_3d AND `
  if name=="model.usdz"{query+=`m.enabled_ar AND `}
  query+=field+` IS NOT NULL`
 }else{query+=` WHERE m.id=$1::uuid`}
 var fileName sql.NullString
 err:=s.DB.QueryRowContext(r.Context(),query,id).Scan(&fileName)
 if err!=nil||!fileName.Valid{fail(w,404,"model file not found");return}
 if !strings.HasPrefix(fileName.String,id+"-")||filepath.Base(fileName.String)!=fileName.String{
  fail(w,500,"invalid storage reference");return
 }
 dir:=os.Getenv("MODEL_STORAGE_DIR");if dir==""{dir="./model-data"}
 file,err:=os.Open(filepath.Join(dir,fileName.String))
 if err!=nil{fail(w,404,"model file unavailable");return}
 defer file.Close()
 info,err:=file.Stat();if err!=nil||info.Size()>70<<20||info.IsDir(){fail(w,404,"model file unavailable");return}
 w.Header().Set("Content-Type",mime)
 w.Header().Set("X-Content-Type-Options","nosniff")
 w.Header().Set("Content-Disposition","inline; filename=\""+name+"\"")
 if private{w.Header().Set("Cache-Control","private, no-store")}else{w.Header().Set("Cache-Control","public, max-age=3600")}
 http.ServeContent(w,r,name,info.ModTime(),file)
}

func (s *Server) updateProductDimensions(w http.ResponseWriter,r *http.Request){
 slug:=r.PathValue("slug")
 if !slugOK(slug){fail(w,400,"invalid product slug");return}
 var v struct{WidthMM *int64 `json:"width_mm"`;DepthMM *int64 `json:"depth_mm"`;HeightMM *int64 `json:"height_mm"`}
 if decode(r,&v)!=nil{fail(w,400,"invalid dimensions");return}
 for _,dimension:=range []*int64{v.WidthMM,v.DepthMM,v.HeightMM}{
  if dimension!=nil&&(*dimension<50||*dimension>12000){fail(w,400,"dimensions must be measured in millimeters");return}
 }
 tx,err:=s.DB.BeginTx(r.Context(),nil)
 if err!=nil{fail(w,503,"database unavailable");return};defer tx.Rollback()
 var productID string
 err=tx.QueryRowContext(r.Context(),`UPDATE products SET width_mm=$2,depth_mm=$3,height_mm=$4,updated_at=now()
 WHERE slug=$1 RETURNING id::text`,slug,v.WidthMM,v.DepthMM,v.HeightMM).Scan(&productID)
 if errors.Is(err,sql.ErrNoRows){fail(w,404,"product not found");return}
 if err!=nil{fail(w,503,"database unavailable");return}
 // Dimensions change invalidates the prior AR scale review. Keep immutable files
 // and history, but remove their public visibility until re-reviewed.
 if _,err:=tx.ExecContext(r.Context(),`UPDATE product_3d_models SET status='needs_review',enabled_3d=false,enabled_ar=false,
 geometry_verified=false,rights_confirmed=false,reviewer_notes='Product dimensions changed; create new draft and review',updated_at=now()
 WHERE product_id=$1::uuid AND status='approved'`,productID);err!=nil{fail(w,503,"database unavailable");return}
 vJSON,_:=json.Marshal(v)
 if _,err:=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id,new_value)
 VALUES($1::uuid,'3d.product_dimensions','product',$2,$3::jsonb)`,adminID(r),productID,string(vJSON));err!=nil{fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]string{"product":slug,"status":"dimensions_updated; models require review"})
}

var _ =time.Now
