package server

import (
 "crypto/sha256"
 "encoding/base64"
 "database/sql"
 "encoding/hex"
 "encoding/json"
 "errors"
 "math/big"
 "net/http"
 "os"
 "strings"

 "github.com/ElizeusX/MATRIX/services/api/internal/payments"
)

func liqpay()payments.LiqPay {
 return payments.LiqPay{PublicKey:os.Getenv("LIQPAY_PUBLIC_KEY"),PrivateKey:os.Getenv("LIQPAY_PRIVATE_KEY")}
}
func liqpayConfigured()bool {
 return os.Getenv("LIQPAY_PUBLIC_KEY")!=""&&os.Getenv("LIQPAY_PRIVATE_KEY")!=""&&os.Getenv("LIQPAY_SERVER_URL")!=""
}
func liqpayMinor(amount json.Number)(int64,error){
 raw:=amount.String()
 rational,ok:=new(big.Rat).SetString(raw)
 if !ok||rational.Sign()<0{return 0,errors.New("invalid payment amount")}
 rational.Mul(rational,big.NewRat(100,1))
 if !rational.IsInt(){return 0,errors.New("nonintegral minor unit")}
 n:=rational.Num()
 if !n.IsInt64(){return 0,errors.New("amount overflow")}
 return n.Int64(),nil
}

func(s *Server)liqpayWebhook(w http.ResponseWriter,r *http.Request){
 if !liqpayConfigured(){fail(w,503,"payment integration disabled");return}
 r.Body=http.MaxBytesReader(w,r.Body,16<<10)
 if err:=r.ParseForm();err!=nil{fail(w,400,"invalid callback");return}
 data:=r.PostForm.Get("data")
 signature:=r.PostForm.Get("signature")
 provider:=liqpay()
 if data==""||signature==""||!provider.Verify(data,signature){fail(w,401,"invalid payment signature");return}
 if len(data)>16000{fail(w,400,"invalid callback");return}
 // Only use callback data to locate the order; independently requery merchant status.
 decoded,err:=base64.StdEncoding.DecodeString(data)
 if err!=nil{fail(w,400,"invalid callback data");return}
 var callback struct{OrderID string `json:"order_id"`}
 if err:=json.Unmarshal(decoded,&callback);err!=nil||!strings.HasPrefix(callback.OrderID,"MX-")||len(callback.OrderID)>80{fail(w,400,"invalid order reference");return}
 status,err:=provider.FetchStatus(callback.OrderID)
 if err!=nil{fail(w,503,"provider verification unavailable");return}
 if status.Currency!="UAH"{fail(w,409,"payment currency mismatch");return}
 minor,err:=liqpayMinor(status.Amount)
 if err!=nil{fail(w,409,"payment amount invalid");return}
 tx,err:=s.DB.BeginTx(r.Context(),&sql.TxOptions{Isolation:sql.LevelSerializable})
 if err!=nil{fail(w,503,"database unavailable");return}
 defer tx.Rollback()
 var id,method,oldStatus string;var expected int64
 err=tx.QueryRowContext(r.Context(),"SELECT id::text,payment_method,status,total_minor FROM orders WHERE order_number=$1 FOR UPDATE",callback.OrderID).Scan(&id,&method,&oldStatus,&expected)
 if err!=nil||method!="liqpay"||expected!=minor{fail(w,409,"payment order mismatch");return}
 hash:=sha256.Sum256(decoded);eventID:=hex.EncodeToString(hash[:])
 payload:=json.RawMessage(decoded)
 var inserted string
 err=tx.QueryRowContext(r.Context(),`INSERT INTO payment_events(provider,provider_event_id,order_id,verified,payload) VALUES('liqpay',$1,$2::uuid,true,$3) ON CONFLICT DO NOTHING RETURNING provider_event_id`,eventID,id,payload).Scan(&inserted)
 if err!=nil&&!errors.Is(err,sql.ErrNoRows){fail(w,503,"payment unavailable");return}
 confirmed:=status.Status=="success"||(status.Status=="sandbox"&&os.Getenv("LIQPAY_SANDBOX")=="true")
 if confirmed&&(oldStatus=="awaiting_payment"||oldStatus=="pending"){
  if _,err:=tx.ExecContext(r.Context(),"UPDATE orders SET status='paid' WHERE id=$1::uuid AND status IN ('pending','awaiting_payment')",id);err!=nil{fail(w,503,"payment unavailable");return}
 }
 if err:=tx.Commit();err!=nil{fail(w,503,"payment unavailable");return}
 jsonReply(w,200,map[string]string{"status":"acknowledged"})
}
