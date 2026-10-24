package server

import (
 "database/sql"
 "errors"
 "log/slog"
 "net/http"
 "os"
 "path/filepath"
 "strings"
)

// Delete a nonapproved draft and its privately stored files. Approved versions
// must be disabled instead so public product references never break silently.
func(s *Server)deleteDraftModel(w http.ResponseWriter,r *http.Request){
 id:=r.PathValue("id")
 if !idUUID.MatchString(id){fail(w,400,"invalid model id");return}
 tx,err:=s.DB.BeginTx(r.Context(),nil)
 if err!=nil{fail(w,503,"database unavailable");return}
 defer tx.Rollback()
 var status string
 var glb,usdz sql.NullString
 err=tx.QueryRowContext(r.Context(),"SELECT status,glb_file,usdz_file FROM product_3d_models WHERE id=$1::uuid FOR UPDATE",id).Scan(&status,&glb,&usdz)
 if errors.Is(err,sql.ErrNoRows){fail(w,404,"draft not found");return}
 if err!=nil{fail(w,503,"database unavailable");return}
 if status=="approved"{fail(w,409,"approved models must be disabled, not deleted");return}
 rows,err:=tx.QueryContext(r.Context(),"SELECT file_key FROM product_3d_source_photos WHERE model_id=$1::uuid",id)
 if err!=nil{fail(w,503,"database unavailable");return}
 keys:=[]string{}
 for rows.Next(){var key string;if err:=rows.Scan(&key);err!=nil{rows.Close();fail(w,503,"database unavailable");return};keys=append(keys,key)}
 err=rows.Err();rows.Close()
 if err!=nil{fail(w,503,"database unavailable");return}
 if glb.Valid{keys=append(keys,glb.String)}
 if usdz.Valid{keys=append(keys,usdz.String)}
 if _,err:=tx.ExecContext(r.Context(),"DELETE FROM product_3d_models WHERE id=$1::uuid",id);err!=nil{fail(w,503,"database unavailable");return}
 if _,err:=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id)
 VALUES($1::uuid,'3d.delete_draft','product_3d_model',$2)`,adminID(r),id);err!=nil{fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{fail(w,503,"database unavailable");return}
 dir:=os.Getenv("MODEL_STORAGE_DIR");if dir==""{dir="./model-data"}
 for _,name:=range keys{
  if filepath.Base(name)!=name||!(strings.HasPrefix(name,id+"-")||strings.HasPrefix(name,"photo-"+id+"-")){continue}
  if err:=os.Remove(filepath.Join(dir,name));err!=nil&&!errors.Is(err,os.ErrNotExist){slog.Warn("orphaned model file after draft deletion","file",name,"error",err)}
 }
 jsonReply(w,200,map[string]string{"id":id,"status":"deleted"})
}
