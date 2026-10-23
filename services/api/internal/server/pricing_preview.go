package server

import (
 "net/http"
 "strconv"
 "time"

 "github.com/ElizeusX/MATRIX/services/api/internal/pricing"
)

func (s *Server) previewGlobalPricing(w http.ResponseWriter,r *http.Request){
 bps,err:=strconv.ParseInt(r.URL.Query().Get("bps"),10,64)
 if err!=nil||bps<=-10000||bps>100000{fail(w,400,"invalid adjustment");return}
 rows,err:=s.DB.QueryContext(r.Context(),"SELECT slug,base_price_minor,product_adjustment_bps FROM products WHERE base_price_minor IS NOT NULL ORDER BY slug")
 if err!=nil{fail(w,503,"database unavailable");return}
 defer rows.Close()
 type example struct{Slug string `json:"slug"`;BaseMinor int64 `json:"base_minor"`;NewMinor int64 `json:"new_minor"`}
 samples:=[]example{}
 count:=0
 for rows.Next(){
  var slug string;var base,productAdj int64
  if err:=rows.Scan(&slug,&base,&productAdj);err!=nil{fail(w,503,"database unavailable");return}
  q,err:=pricing.Calculate(pricing.Rule{BaseMinor:base,GlobalAdjustmentBPS:bps,ProductAdjustmentBPS:productAdj},time.Now().UTC())
  if err!=nil{fail(w,400,"invalid resulting price");return}
  count++
  if len(samples)<5{samples=append(samples,example{slug,base,q.FinalMinor})}
 }
 if err:=rows.Err();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]any{"affected_count":count,"samples":samples,"adjustment_bps":bps})
}
