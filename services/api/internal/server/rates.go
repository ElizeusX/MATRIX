package server

import (
 "encoding/json"
 "net/http"
)

type rateInput struct {
 Currency string `json:"currency"`
 Numerator int64 `json:"numerator"`
 Denominator int64 `json:"denominator"`
}

func(s *Server)setRate(w http.ResponseWriter,r *http.Request){
 var v rateInput
 if err:=decode(r,&v);err!=nil||!(v.Currency=="EUR"||v.Currency=="USD")||v.Numerator<=0||v.Denominator<=0||v.Numerator>1_000_000_000||v.Denominator>1_000_000_000{
  fail(w,400,"invalid exchange rate");return
 }
 tx,err:=s.DB.BeginTx(r.Context(),nil)
 if err!=nil{fail(w,503,"database unavailable");return}
 defer tx.Rollback()
 _,err=tx.ExecContext(r.Context(),`INSERT INTO exchange_rates(currency,numerator,denominator,source) VALUES($1,$2,$3,'manual') ON CONFLICT(currency) DO UPDATE SET numerator=EXCLUDED.numerator,denominator=EXCLUDED.denominator,source='manual',updated_at=now()`,v.Currency,v.Numerator,v.Denominator)
 if err!=nil{fail(w,503,"database unavailable");return}
 snapshot,_:=json.Marshal(v)
 _,err=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id,new_value) VALUES($1::uuid,'currency.rate_update','exchange_rates',$2,$3::jsonb)`,adminID(r),v.Currency,string(snapshot))
 if err!=nil{fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]string{"currency":v.Currency,"status":"rate updated"})
}
