package server

import (
 "net/http"
 "time"
)

func(s *Server)auditLogs(w http.ResponseWriter,r *http.Request){
 rows,err:=s.DB.QueryContext(r.Context(),"SELECT action,entity_type,coalesce(entity_id,''),created_at FROM audit_logs ORDER BY created_at DESC LIMIT 100")
 if err!=nil{fail(w,503,"database unavailable");return}
 defer rows.Close()
 type item struct{Action string `json:"action"`;EntityType string `json:"entity_type"`;EntityID string `json:"entity_id"`;CreatedAt time.Time `json:"created_at"`}
 result:=[]item{}
 for rows.Next(){var v item;if err:=rows.Scan(&v.Action,&v.EntityType,&v.EntityID,&v.CreatedAt);err!=nil{fail(w,503,"database unavailable");return};result=append(result,v)}
 if err:=rows.Err();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]any{"items":result})
}
func(s *Server)adminCategories(w http.ResponseWriter,r *http.Request){
 rows,err:=s.DB.QueryContext(r.Context(),"SELECT slug,title_uk,coalesce(title_en,'') FROM categories ORDER BY title_uk")
 if err!=nil{fail(w,503,"database unavailable");return}
 defer rows.Close()
 type item struct{Slug string `json:"slug"`;TitleUK string `json:"title_uk"`;TitleEN string `json:"title_en"`}
 list:=[]item{}
 for rows.Next(){var x item;if err:=rows.Scan(&x.Slug,&x.TitleUK,&x.TitleEN);err!=nil{fail(w,503,"database unavailable");return};list=append(list,x)}
 if err:=rows.Err();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]any{"items":list})
}
func(s *Server)adminPromotions(w http.ResponseWriter,r *http.Request){
 rows,err:=s.DB.QueryContext(r.Context(),`SELECT id::text,coalesce(product_id::text,''),discount_bps,starts_at,ends_at,cancelled_at FROM promotions ORDER BY starts_at DESC LIMIT 100`)
 if err!=nil{fail(w,503,"database unavailable");return}
 defer rows.Close()
 type item struct{ID string `json:"id"`;ProductID string `json:"product_id"`;DiscountBPS int64 `json:"discount_bps"`;StartsAt time.Time `json:"starts_at"`;EndsAt time.Time `json:"ends_at"`;CancelledAt *time.Time `json:"cancelled_at"`}
 list:=[]item{}
 for rows.Next(){var x item;if err:=rows.Scan(&x.ID,&x.ProductID,&x.DiscountBPS,&x.StartsAt,&x.EndsAt,&x.CancelledAt);err!=nil{fail(w,503,"database unavailable");return};list=append(list,x)}
 if err:=rows.Err();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]any{"items":list})
}
