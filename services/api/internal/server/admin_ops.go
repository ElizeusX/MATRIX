package server

import (
 "database/sql"
 "encoding/json"
 "errors"
 "net/http"
 "strings"
)

func (s *Server)updateOrderStatus(w http.ResponseWriter,r *http.Request){
 var v struct{
  Number string `json:"number"`
  Status string `json:"status"`
  Tracking string `json:"tracking"`
 }
 if decode(r,&v)!=nil||!strings.HasPrefix(v.Number,"MX-")||len(v.Tracking)>200{fail(w,400,"invalid order update");return}
 // Never allow manual 'paid': that state is reserved for cryptographically verified payment.
 allowed:=map[string]map[string]bool{
  "pending":{"canceled":true},
  "awaiting_payment":{"canceled":true},
  "paid":{"processing":true,"shipped":true,"refunded":true},
  "processing":{"shipped":true,"canceled":true},
  "shipped":{"delivered":true,"refunded":true},
  "delivered":{"refunded":true},
 }
 tx,err:=s.DB.BeginTx(r.Context(),nil)
 if err!=nil{fail(w,503,"database unavailable");return};defer tx.Rollback()
 var id,old string
 err=tx.QueryRowContext(r.Context(),"SELECT id::text,status FROM orders WHERE order_number=$1 FOR UPDATE",v.Number).Scan(&id,&old)
 if errors.Is(err,sql.ErrNoRows){fail(w,404,"order not found");return}
 if err!=nil{fail(w,503,"database unavailable");return}
 if !allowed[old][v.Status]{fail(w,409,"invalid order transition");return}
 if _,err:=tx.ExecContext(r.Context(),"UPDATE orders SET status=$1,tracking_reference=NULLIF($2,''),fulfilled_at=CASE WHEN $1='delivered' THEN now() ELSE fulfilled_at END WHERE id=$3::uuid",v.Status,v.Tracking,id);err!=nil{fail(w,503,"database unavailable");return}
 oldPayload,_:=json.Marshal(map[string]string{"status":old})
 newPayload,_:=json.Marshal(map[string]string{"status":v.Status,"tracking":v.Tracking})
 _,err=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id,old_value,new_value) VALUES($1::uuid,'orders.transition','order',$2,$3::jsonb,$4::jsonb)`,adminID(r),id,string(oldPayload),string(newPayload))
 if err!=nil{fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]string{"number":v.Number,"status":v.Status})
}
func(s *Server)cancelPromotion(w http.ResponseWriter,r *http.Request){
 var v struct{ID string `json:"id"`}
 if decode(r,&v)!=nil||len(v.ID)<30||len(v.ID)>40{fail(w,400,"invalid promotion id");return}
 tx,err:=s.DB.BeginTx(r.Context(),nil);if err!=nil{fail(w,503,"database unavailable");return};defer tx.Rollback()
 result,err:=tx.ExecContext(r.Context(),"UPDATE promotions SET cancelled_at=now() WHERE id::text=$1 AND cancelled_at IS NULL",v.ID)
 if err!=nil{fail(w,503,"database unavailable");return}
 count,_:=result.RowsAffected()
 if count==0{fail(w,404,"promotion not found or already cancelled");return}
 _,err=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id) VALUES($1::uuid,'promotion.cancel','promotion',$2)`,adminID(r),v.ID)
 if err!=nil{fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]string{"status":"cancelled"})
}
func(s *Server)createCategory(w http.ResponseWriter,r *http.Request){
 var v struct{Slug string `json:"slug"`;TitleUK string `json:"title_uk"`;TitleEN string `json:"title_en"`}
 if decode(r,&v)!=nil||!slugOK(v.Slug)||len(v.TitleUK)<2||len(v.TitleUK)>120||len(v.TitleEN)>120{fail(w,400,"invalid category");return}
 tx,err:=s.DB.BeginTx(r.Context(),nil);if err!=nil{fail(w,503,"database unavailable");return};defer tx.Rollback()
 var id string
 if err:=tx.QueryRowContext(r.Context(),"INSERT INTO categories(slug,title_uk,title_en) VALUES($1,$2,$3) ON CONFLICT(slug) DO UPDATE SET title_uk=EXCLUDED.title_uk,title_en=EXCLUDED.title_en RETURNING id::text",v.Slug,v.TitleUK,v.TitleEN).Scan(&id);err!=nil{fail(w,503,"database unavailable");return}
 _,err=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id) VALUES($1::uuid,'category.upsert','category',$2)`,adminID(r),id)
 if err!=nil{fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]string{"id":id})
}
func slugOK(s string)bool{
 if len(s)<2||len(s)>120{return false}
 for _,r:=range s{if !((r>='a'&&r<='z')||(r>='0'&&r<='9')||r=='-'){return false}}
 return true
}
