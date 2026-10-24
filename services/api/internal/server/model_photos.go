package server

import (
 "bytes"
 "crypto/sha256"
 "database/sql"
 "encoding/hex"
 "errors"
 "image"
 _ "image/jpeg"
 _ "image/png"
 "io"
 "net/http"
 "os"
 "path/filepath"
 "strings"
)

// Source photos stay private. Do not harvest from the manufacturer website
// without documented reproduction rights and explicit admin attestation.
func(s *Server) uploadSourcePhoto(w http.ResponseWriter,r *http.Request){
 id:=r.PathValue("id")
 if !idUUID.MatchString(id){fail(w,400,"invalid model id");return}
 r.Body=http.MaxBytesReader(w,r.Body,16<<20)
 if err:=r.ParseMultipartForm(4<<20);err!=nil{fail(w,413,"invalid photo upload");return}
 if r.MultipartForm!=nil{defer r.MultipartForm.RemoveAll()}
 if r.FormValue("rights_confirmed")!="true" {fail(w,403,"explicit photo usage rights required");return}
 notes:=strings.TrimSpace(r.FormValue("source_notes"))
 if len(notes)<5||len(notes)>1000{fail(w,400,"source attribution and rights notes required");return}
 file,header,err:=r.FormFile("photo")
 if err!=nil{fail(w,400,"photo file missing");return}
 defer file.Close()
 data,err:=io.ReadAll(io.LimitReader(file,15<<20+1))
 if err!=nil||len(data)>15<<20||len(data)==0{fail(w,413,"photo exceeds 15 MB");return}
 mime:=http.DetectContentType(data)
 ext:=strings.ToLower(filepath.Ext(header.Filename))
 if !((mime=="image/jpeg"&&(ext==".jpg"||ext==".jpeg"))||(mime=="image/png"&&ext==".png")){fail(w,415,"only valid JPG and PNG photos are allowed");return}
 cfg,format,err:=image.DecodeConfig(bytes.NewReader(data))
 if err!=nil||cfg.Width<=0||cfg.Height<=0||cfg.Width>7000||cfg.Height>7000||int64(cfg.Width)*int64(cfg.Height)>28_000_000{fail(w,422,"photo dimensions invalid");return}
 if (mime=="image/jpeg"&&format!="jpeg")||(mime=="image/png"&&format!="png"){fail(w,422,"image MIME mismatch");return}
 // Full decode detects malformed compressed payload before storing privately.
 if _,_,err:=image.Decode(bytes.NewReader(data));err!=nil{fail(w,422,"corrupt photo");return}
 tx,err:=s.DB.BeginTx(r.Context(),nil);if err!=nil{fail(w,503,"database unavailable");return};defer tx.Rollback()
 var status string
 if err:=tx.QueryRowContext(r.Context(),"SELECT status FROM product_3d_models WHERE id=$1::uuid FOR UPDATE",id).Scan(&status);err!=nil{fail(w,404,"model draft not found");return}
 if status=="approved"{fail(w,409,"create new draft version for additional photos");return}
 hash:=sha256.Sum256(data);digest:=hex.EncodeToString(hash[:])
 fileName:="photo-"+id+"-"+digest[:20]+ext
 dir:=os.Getenv("MODEL_STORAGE_DIR");if dir==""{dir="./model-data"}
 if err:=os.MkdirAll(dir,0700);err!=nil{fail(w,503,"storage unavailable");return}
 created,err:=storeModel(filepath.Join(dir,fileName),data)
 if err!=nil{fail(w,503,"photo storage unavailable");return}
 var photoID string
 err=tx.QueryRowContext(r.Context(),`INSERT INTO product_3d_source_photos(model_id,file_key,sha256,media_type,width_px,height_px,source_notes,rights_confirmed,uploaded_by)
 VALUES($1::uuid,$2,$3,$4,$5,$6,$7,true,$8::uuid)
 ON CONFLICT(model_id,sha256) DO UPDATE SET source_notes=EXCLUDED.source_notes RETURNING id::text`,id,fileName,digest,mime,cfg.Width,cfg.Height,notes,adminID(r)).Scan(&photoID)
 if err!=nil{if created{os.Remove(filepath.Join(dir,fileName))};fail(w,503,"photo database unavailable");return}
 if _,err:=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id,new_value) VALUES($1::uuid,'3d.photo_upload','product_3d_source_photo',$2,jsonb_build_object('sha256',$3::text))`,adminID(r),photoID,digest);err!=nil{if created{os.Remove(filepath.Join(dir,fileName))};fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{if created{os.Remove(filepath.Join(dir,fileName))};fail(w,503,"database unavailable");return}
 jsonReply(w,201,map[string]any{"id":photoID,"size_px":[]int{cfg.Width,cfg.Height},"status":"private_source_photo"})
}
func(s *Server) listSourcePhotos(w http.ResponseWriter,r *http.Request){
 id:=r.PathValue("id")
 if !idUUID.MatchString(id){fail(w,400,"invalid model id");return}
 rows,err:=s.DB.QueryContext(r.Context(),`SELECT id::text,source_notes,media_type,width_px,height_px,uploaded_at FROM product_3d_source_photos
 WHERE model_id=$1::uuid ORDER BY uploaded_at DESC LIMIT 100`,id)
 if err!=nil{fail(w,503,"database unavailable");return}
 defer rows.Close()
 type photo struct{ID string `json:"id"`;Notes string `json:"notes"`;Mime string `json:"mime"`;Width int `json:"width"`;Height int `json:"height"`;UploadedAt string `json:"uploaded_at"`}
 list:=[]photo{}
 for rows.Next(){var p photo;if err:=rows.Scan(&p.ID,&p.Notes,&p.Mime,&p.Width,&p.Height,&p.UploadedAt);err!=nil{fail(w,503,"database unavailable");return};list=append(list,p)}
 if err:=rows.Err();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]any{"items":list})
}
func(s *Server) sourcePhotoFile(w http.ResponseWriter,r *http.Request){
 id:=r.PathValue("photoID")
 if !idUUID.MatchString(id){fail(w,404,"photo not found");return}
 var key,mime string
 err:=s.DB.QueryRowContext(r.Context(),"SELECT file_key,media_type FROM product_3d_source_photos WHERE id=$1::uuid",id).Scan(&key,&mime)
 if errors.Is(err,sql.ErrNoRows){fail(w,404,"photo not found");return}
 if err!=nil{fail(w,503,"database unavailable");return}
 if !strings.HasPrefix(key,"photo-")||filepath.Base(key)!=key{fail(w,500,"invalid file reference");return}
 dir:=os.Getenv("MODEL_STORAGE_DIR");if dir==""{dir="./model-data"}
 f,err:=os.Open(filepath.Join(dir,key));if err!=nil{fail(w,404,"photo unavailable");return}
 defer f.Close()
 info,err:=f.Stat();if err!=nil||info.IsDir()||info.Size()>15<<20{fail(w,404,"photo unavailable");return}
 w.Header().Set("Content-Type",mime)
 w.Header().Set("Cache-Control","private, no-store")
 w.Header().Set("Content-Security-Policy","default-src 'none'")
 http.ServeContent(w,r,key,info.ModTime(),f)
}
