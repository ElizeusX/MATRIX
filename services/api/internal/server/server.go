package server

import (
 "context"
 "crypto/rand"
 "crypto/sha256"
 "database/sql"
 "encoding/hex"
 "encoding/json"
 "errors"
 "fmt"
 "log/slog"
 "net"
 "net/http"
 "os"
 "regexp"
 "strings"
 "sync"
 "time"

 "github.com/ElizeusX/MATRIX/services/api/internal/pricing"
 "github.com/ElizeusX/MATRIX/services/api/internal/payments"
 "golang.org/x/crypto/bcrypt"
)

type Server struct {
 DB *sql.DB
 SiteOrigin string
 SecureCookies bool
 logger *slog.Logger
 attempts sync.Map
}

type Product struct {
 ID string `json:"id"`
 Slug string `json:"slug"`
 Category string `json:"category"`
 TitleUK string `json:"title_uk"`
 TitleEN string `json:"title_en"`
 DescriptionUK *string `json:"description_uk"`
 DescriptionEN *string `json:"description_en"`
 BasePriceMinor *int64 `json:"base_price_minor"`
 PriceMinor *int64 `json:"price_minor"`
 OriginalMinor *int64 `json:"original_minor"`
 SettlementPriceMinor *int64 `json:"settlement_price_minor"`
 DiscountBPS int64 `json:"discount_bps"`
 Currency string `json:"currency"`
 Available bool `json:"available"`
 Published bool `json:"published"`
 WidthMM *int64 `json:"width_mm"`
 DepthMM *int64 `json:"depth_mm"`
 SleepingWidthMM *int64 `json:"sleeping_width_mm"`
 SleepingLengthMM *int64 `json:"sleeping_length_mm"`
}

type ErrorResponse struct { Error string `json:"error"` }

func jsonReply(w http.ResponseWriter,status int,v any){
 w.Header().Set("Content-Type","application/json; charset=utf-8")
 w.Header().Set("Cache-Control","no-store")
 w.WriteHeader(status)
 _=json.NewEncoder(w).Encode(v)
}
func fail(w http.ResponseWriter,status int,message string){jsonReply(w,status,ErrorResponse{message})}
func decode(r *http.Request,v any)error {
 r.Body=http.MaxBytesReader(nil,r.Body,64<<10)
 d:=json.NewDecoder(r.Body)
 d.DisallowUnknownFields()
 if err:=d.Decode(v);err!=nil{return err}
 var extra any
 if err:=d.Decode(&extra);err==nil{return errors.New("unexpected trailing data")}
 return nil
}
func randomToken()(string,error){
 b:=make([]byte,32)
 if _,err:=rand.Read(b);err!=nil{return "",err}
 return hex.EncodeToString(b),nil
}
func hashToken(t string)string {
 sum:=sha256.Sum256([]byte(t))
 return hex.EncodeToString(sum[:])
}
func New(db *sql.DB)*Server {
 return &Server{DB:db,SiteOrigin:os.Getenv("SITE_ORIGIN"),SecureCookies:os.Getenv("COOKIE_SECURE")=="true",logger:slog.Default()}
}
func (s *Server) Handler() http.Handler {
 mux:=http.NewServeMux()
 mux.HandleFunc("GET /health",func(w http.ResponseWriter,r *http.Request){
  ctx,cancel:=context.WithTimeout(r.Context(),2*time.Second);defer cancel()
  if err:=s.DB.PingContext(ctx);err!=nil{fail(w,503,"database unavailable");return}
  jsonReply(w,200,map[string]string{"status":"ok","service":"matrix-api"})
 })
 mux.HandleFunc("GET /api/v1/products",s.products)
 mux.HandleFunc("GET /api/v1/config",func(w http.ResponseWriter,r *http.Request){jsonReply(w,200,map[string]bool{"liqpay_enabled":liqpayConfigured()})})
 mux.HandleFunc("POST /api/v1/payments/liqpay/webhook",s.liqpayWebhook)
 mux.HandleFunc("GET /api/v1/products/{slug}",s.product)
 // Published 3D is served only after server-side approval.
 mux.HandleFunc("GET /api/v1/models/{slug}",s.publicModel)
 mux.HandleFunc("GET /api/v1/models/assets/{id}/{filename}",s.servePublicModelFile)
 mux.HandleFunc("GET /api/v1/admin/models",s.secure(s.adminModels))
 mux.HandleFunc("POST /api/v1/admin/models",s.secure(s.newDraftModel))
 mux.HandleFunc("POST /api/v1/admin/models/{id}/files/{format}",s.secure(s.uploadModel))
 mux.HandleFunc("POST /api/v1/admin/models/{id}/photos",s.secure(s.uploadSourcePhoto))
 mux.HandleFunc("GET /api/v1/admin/models/{id}/photos",s.secure(s.listSourcePhotos))
 mux.HandleFunc("GET /api/v1/admin/model-photos/{photoID}",s.secure(s.sourcePhotoFile))
 mux.HandleFunc("POST /api/v1/admin/models/{id}/review",s.secure(s.reviewModel))
 mux.HandleFunc("GET /api/v1/admin/models/{id}/file/{filename}",s.secure(s.servePrivateModelFile))
 mux.HandleFunc("POST /api/v1/admin/products/{slug}/dimensions",s.secure(s.updateProductDimensions))
 mux.HandleFunc("POST /api/v1/orders",s.createOrder)
 mux.HandleFunc("POST /api/v1/admin/login",s.login)
 mux.HandleFunc("POST /api/v1/admin/logout",s.secure(s.logout))
 mux.HandleFunc("GET /api/v1/admin/orders",s.secure(s.adminOrders))
 mux.HandleFunc("POST /api/v1/admin/orders/status",s.secure(s.updateOrderStatus))
 mux.HandleFunc("POST /api/v1/admin/promotions/cancel",s.secure(s.cancelPromotion))
 mux.HandleFunc("POST /api/v1/admin/categories",s.secure(s.createCategory))
 mux.HandleFunc("GET /api/v1/admin/categories",s.secure(s.adminCategories))
 mux.HandleFunc("GET /api/v1/admin/promotions",s.secure(s.adminPromotions))
 mux.HandleFunc("GET /api/v1/admin/audit",s.secure(s.auditLogs))
 mux.HandleFunc("POST /api/v1/admin/pricing",s.secure(s.setGlobalPricing))
 mux.HandleFunc("GET /api/v1/admin/pricing/preview",s.secure(s.previewGlobalPricing))
 mux.HandleFunc("POST /api/v1/admin/products",s.secure(s.saveProduct))
 mux.HandleFunc("POST /api/v1/admin/promotions",s.secure(s.createPromotion))
 mux.HandleFunc("POST /api/v1/admin/currency",s.secure(s.setCurrency))
 mux.HandleFunc("POST /api/v1/admin/rates",s.secure(s.setRate))
 return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("X-Content-Type-Options","nosniff")
  w.Header().Set("X-Frame-Options","DENY")
  w.Header().Set("Referrer-Policy","strict-origin-when-cross-origin")
  mux.ServeHTTP(w,r)
 })
}
func (s *Server) originOK(r *http.Request)bool{
 origin:=r.Header.Get("Origin")
 return s.SiteOrigin!="" && origin==s.SiteOrigin
}
func (s *Server) secure(next http.HandlerFunc)http.HandlerFunc {
 return func(w http.ResponseWriter,r *http.Request){
  cookie,err:=r.Cookie("matrix_admin")
  if err!=nil||len(cookie.Value)!=64{fail(w,401,"unauthorized");return}
  var userID,role string
  err=s.DB.QueryRowContext(r.Context(),`SELECT a.id::text,a.role FROM admin_sessions sess JOIN admin_users a ON a.id=sess.admin_id WHERE sess.token_hash=$1 AND sess.expires_at>now() AND NOT a.disabled`,hashToken(cookie.Value)).Scan(&userID,&role)
  if err!=nil{fail(w,401,"unauthorized");return}
  if r.Method!="GET" && !s.originOK(r){fail(w,403,"invalid origin");return}
  if role!="owner" && role!="manager" && r.Method!="GET"{fail(w,403,"insufficient role");return}
  next(w,r.WithContext(context.WithValue(r.Context(),adminKey{},userID)))
 }
}
type adminKey struct{}
func adminID(r *http.Request)string {v,_:=r.Context().Value(adminKey{}).(string);return v}
func (s *Server) products(w http.ResponseWriter,r *http.Request){
 rows,err:=s.DB.QueryContext(r.Context(),`SELECT p.id::text,p.slug,coalesce(c.slug,''),p.title_uk,coalesce(p.title_en,''),p.description_uk,p.description_en,p.base_price_minor,p.available,p.published,p.product_adjustment_bps,p.width_mm,p.depth_mm,p.sleeping_width_mm,p.sleeping_length_mm,(SELECT global_adjustment_bps FROM pricing_settings LIMIT 1) FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.published=true ORDER BY p.created_at DESC LIMIT 100`)
 if err!=nil{fail(w,500,"database error");return}
 defer rows.Close()
 list:=[]Product{}
 for rows.Next(){
  var p Product;var base sql.NullInt64;var adjust,global int64
  var uk,en sql.NullString
  if err:=rows.Scan(&p.ID,&p.Slug,&p.Category,&p.TitleUK,&p.TitleEN,&uk,&en,&base,&p.Available,&p.Published,&adjust,&p.WidthMM,&p.DepthMM,&p.SleepingWidthMM,&p.SleepingLengthMM,&global);err!=nil{fail(w,500,"database error");return}
  if uk.Valid{p.DescriptionUK=&uk.String};if en.Valid{p.DescriptionEN=&en.String}
  if base.Valid{
   p.BasePriceMinor=&base.Int64
   quote,err:=s.quoteFor(r.Context(),p.ID,base.Int64,global,adjust)
   if err!=nil{fail(w,503,"price unavailable");return}
   if err:=s.applyCurrency(r.Context(),&p,quote);err!=nil{fail(w,503,"exchange rate unavailable");return}
  }
  list=append(list,p)
 }
 if rows.Err()!=nil{fail(w,500,"database error");return}
 jsonReply(w,200,map[string]any{"items":list,"total":len(list)})
}
func (s *Server) product(w http.ResponseWriter,r *http.Request){
 slug:=r.PathValue("slug")
 if slug==""{fail(w,404,"not found");return}
 var p Product;var base sql.NullInt64;var global,adjust int64
 var uk,en sql.NullString
 err:=s.DB.QueryRowContext(r.Context(),`SELECT p.id::text,p.slug,coalesce(c.slug,''),p.title_uk,coalesce(p.title_en,''),p.description_uk,p.description_en,p.base_price_minor,p.available,p.published,p.product_adjustment_bps,p.width_mm,p.depth_mm,p.sleeping_width_mm,p.sleeping_length_mm,(SELECT global_adjustment_bps FROM pricing_settings LIMIT 1) FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.slug=$1 AND p.published=true`,slug).Scan(&p.ID,&p.Slug,&p.Category,&p.TitleUK,&p.TitleEN,&uk,&en,&base,&p.Available,&p.Published,&adjust,&p.WidthMM,&p.DepthMM,&p.SleepingWidthMM,&p.SleepingLengthMM,&global)
 if errors.Is(err,sql.ErrNoRows){fail(w,404,"not found");return}
 if err!=nil{fail(w,500,"database error");return}
 if uk.Valid{p.DescriptionUK=&uk.String};if en.Valid{p.DescriptionEN=&en.String}
 if base.Valid{
  p.BasePriceMinor=&base.Int64
  quote,err:=s.quoteFor(r.Context(),p.ID,base.Int64,global,adjust)
  if err!=nil{fail(w,503,"price unavailable");return}
  if err:=s.applyCurrency(r.Context(),&p,quote);err!=nil{fail(w,503,"exchange rate unavailable");return}
 }
 jsonReply(w,200,p)
}
func (s *Server) applyCurrency(ctx context.Context,p *Product,quote pricing.Quote)error{
 p.SettlementPriceMinor=&quote.FinalMinor
 p.DiscountBPS=quote.DiscountBPS
 var currency string
 if err:=s.DB.QueryRowContext(ctx,"SELECT storefront_currency FROM pricing_settings").Scan(&currency);err!=nil{return err}
 p.Currency=currency
 if currency=="UAH"{p.PriceMinor=&quote.FinalMinor;p.OriginalMinor=&quote.OriginalMinor;return nil}
 var n,d int64
 if err:=s.DB.QueryRowContext(ctx,"SELECT numerator,denominator FROM exchange_rates WHERE currency=$1",currency).Scan(&n,&d);err!=nil{return err}
 current,err:=pricing.ConvertMinor(quote.FinalMinor,n,d);if err!=nil{return err}
 regular,err:=pricing.ConvertMinor(quote.OriginalMinor,n,d);if err!=nil{return err}
 p.PriceMinor=&current;p.OriginalMinor=&regular
 return nil
}
func (s *Server) quoteFor(ctx context.Context,id string,base,global,adjust int64)(pricing.Quote,error){
 now:=time.Now().UTC()
 rows,err:=s.DB.QueryContext(ctx,`SELECT product_id::text,discount_bps,starts_at,ends_at FROM promotions WHERE (product_id=$1::uuid OR product_id IS NULL) AND cancelled_at IS NULL AND starts_at<=$2 AND ends_at>$2 ORDER BY starts_at DESC`,id,now)
 if err!=nil{return pricing.Quote{},err}
 defer rows.Close()
 var globalP,productP *pricing.Promotion
 for rows.Next(){
  var pid sql.NullString;var p pricing.Promotion
  if err:=rows.Scan(&pid,&p.DiscountBPS,&p.StartsAt,&p.EndsAt);err!=nil{return pricing.Quote{},err}
  if pid.Valid&&productP==nil{v:=p;productP=&v}
  if !pid.Valid&&globalP==nil{v:=p;globalP=&v}
 }
 if err:=rows.Err();err!=nil{return pricing.Quote{},err}
 return pricing.Calculate(pricing.Rule{BaseMinor:base,GlobalAdjustmentBPS:global,ProductAdjustmentBPS:adjust,GlobalPromotion:globalP,ProductPromotion:productP},now)
}
type orderInput struct {
 Name string `json:"name"`
 Phone string `json:"phone"`
 Email string `json:"email"`
 Address string `json:"address"`
 Comment string `json:"comment"`
 Consent bool `json:"consent"`
 PaymentMethod string `json:"payment_method"`
 Items []struct { ProductID string `json:"product_id"`;Quantity int `json:"quantity"` } `json:"items"`
}
var emailPattern=regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
func (s *Server) createOrder(w http.ResponseWriter,r *http.Request){
 var input orderInput
 if err:=decode(r,&input);err!=nil{fail(w,400,"invalid json");return}
 if len(strings.TrimSpace(input.Name))<2||len(input.Name)>160||len(input.Phone)<8||len(input.Phone)>32||len(input.Address)<5||len(input.Address)>1000||len(input.Comment)>2000||!input.Consent||len(input.Items)==0||len(input.Items)>40||(input.PaymentMethod!="manual"&&(input.PaymentMethod!="liqpay"||!liqpayConfigured()))||(input.Email!=""&&!emailPattern.MatchString(input.Email)){
  fail(w,400,"invalid order");return
 }
 tx,err:=s.DB.BeginTx(r.Context(),&sql.TxOptions{Isolation:sql.LevelSerializable})
 if err!=nil{fail(w,503,"order unavailable");return}
 defer tx.Rollback()
 var global int64
 if err:=tx.QueryRowContext(r.Context(),"SELECT global_adjustment_bps FROM pricing_settings FOR SHARE").Scan(&global);err!=nil{fail(w,503,"pricing unavailable");return}
 type snapshot struct {id,title string;qty int;price int64}
 lineItems:=[]snapshot{}
 total:=int64(0)
 for _,item:=range input.Items {
  if item.Quantity<1||item.Quantity>99{fail(w,400,"invalid quantity");return}
  var id,title string;var base sql.NullInt64;var adjust int64;var available,published bool
  err:=tx.QueryRowContext(r.Context(),`SELECT id::text,title_uk,base_price_minor,product_adjustment_bps,available,published FROM products WHERE id::text=$1 FOR SHARE`,item.ProductID).Scan(&id,&title,&base,&adjust,&available,&published)
  if err!=nil||!base.Valid||!available||!published{fail(w,409,"product unavailable or unpriced");return}
  now:=time.Now().UTC()
  promos,err:=tx.QueryContext(r.Context(),`SELECT product_id,discount_bps,starts_at,ends_at FROM promotions WHERE (product_id=$1::uuid OR product_id IS NULL) AND cancelled_at IS NULL AND starts_at<=$2 AND ends_at>$2 ORDER BY starts_at DESC`,id,now)
  if err!=nil{fail(w,503,"promotion unavailable");return}
  var globalP,productP *pricing.Promotion
  for promos.Next(){
   var pid sql.NullString;var p pricing.Promotion
   if err:=promos.Scan(&pid,&p.DiscountBPS,&p.StartsAt,&p.EndsAt);err!=nil{promos.Close();fail(w,503,"promotion unavailable");return}
   if pid.Valid && productP==nil{v:=p;productP=&v}
   if !pid.Valid && globalP==nil{v:=p;globalP=&v}
  }
  promErr:=promos.Err();promos.Close()
  if promErr!=nil{fail(w,503,"promotion unavailable");return}
  quote,err:=pricing.Calculate(pricing.Rule{BaseMinor:base.Int64,GlobalAdjustmentBPS:global,ProductAdjustmentBPS:adjust,GlobalPromotion:globalP,ProductPromotion:productP},now)
  if err!=nil||quote.FinalMinor<=0{fail(w,409,"price unavailable");return}
  if quote.FinalMinor>1_000_000_000_000/int64(item.Quantity)||total>1_000_000_000_000-quote.FinalMinor*int64(item.Quantity){fail(w,400,"order total out of range");return}
  total+=quote.FinalMinor*int64(item.Quantity)
  lineItems=append(lineItems,snapshot{id,title,item.Quantity,quote.FinalMinor})
 }
 token,err:=randomToken();if err!=nil{fail(w,503,"order unavailable");return}
 number:="MX-"+strings.ToUpper(token[:16])
 var orderID string
 orderStatus:="pending";if input.PaymentMethod=="liqpay"{orderStatus="awaiting_payment"}
 err=tx.QueryRowContext(r.Context(),`INSERT INTO orders(order_number,customer_name,customer_email,customer_phone,delivery_details,comments,status,payment_method,total_minor,currency) VALUES ($1,$2,$3,$4,jsonb_build_object('address',$5),$6,$7,$8,$9,'UAH') RETURNING id::text`,number,input.Name,input.Email,input.Phone,input.Address,input.Comment,orderStatus,input.PaymentMethod,total).Scan(&orderID)
 if err!=nil{fail(w,503,"order unavailable");return}
 for _,item:=range lineItems {
  if _,err:=tx.ExecContext(r.Context(),`INSERT INTO order_items(order_id,product_id,title_snapshot,quantity,unit_price_minor,currency) VALUES($1::uuid,$2::uuid,$3,$4,$5,'UAH')`,orderID,item.id,item.title,item.qty,item.price);err!=nil{fail(w,503,"order unavailable");return}
 }
 if err:=tx.Commit();err!=nil{fail(w,503,"order unavailable");return}
 reply:=map[string]any{"order_number":number,"status":orderStatus,"total_minor":total,"currency":"UAH","message":"Order received; payment not verified"}
 if input.PaymentMethod=="liqpay"{
  provider:=liqpay()
  form,err:=provider.CreateCheckout(payments.Checkout{OrderID:number,Amount:fmt.Sprintf("%d.%02d",total/100,total%100),Currency:"UAH",Description:"MATRIX furniture "+number,ServerURL:os.Getenv("LIQPAY_SERVER_URL"),ResultURL:os.Getenv("LIQPAY_RESULT_URL")})
  if err==nil{reply["payment_url"]="https://www.liqpay.ua/api/3/checkout";reply["payment_data"]=form.Get("data");reply["payment_signature"]=form.Get("signature")}
 }
 jsonReply(w,201,reply)
}
func(s *Server)login(w http.ResponseWriter,r *http.Request){
 if !s.originOK(r){fail(w,403,"invalid origin");return}
 key,_,parseErr:=net.SplitHostPort(r.RemoteAddr);if parseErr!=nil{key=r.RemoteAddr}
 if x,ok:=s.attempts.Load(key);ok && x.(time.Time).After(time.Now()){fail(w,429,"retry later");return}
 s.attempts.Store(key,time.Now().Add(2*time.Second))
 var v struct{Email string `json:"email"`;Password string `json:"password"`}
 if decode(r,&v)!=nil||len(v.Password)>256{fail(w,400,"invalid request");return}
 var id string;var hash string
 err:=s.DB.QueryRowContext(r.Context(),"SELECT id::text,password_hash FROM admin_users WHERE email=$1 AND disabled=false",strings.ToLower(strings.TrimSpace(v.Email))).Scan(&id,&hash)
 if err!=nil||bcrypt.CompareHashAndPassword([]byte(hash),[]byte(v.Password))!=nil{fail(w,401,"invalid credentials");return}
 token,err:=randomToken();if err!=nil{fail(w,503,"login unavailable");return}
 _,err=s.DB.ExecContext(r.Context(),"INSERT INTO admin_sessions(token_hash,admin_id,expires_at) VALUES($1,$2::uuid,$3)",hashToken(token),id,time.Now().UTC().Add(12*time.Hour))
 if err!=nil{fail(w,503,"login unavailable");return}
 http.SetCookie(w,&http.Cookie{Name:"matrix_admin",Value:token,Path:"/api/v1/admin",HttpOnly:true,Secure:s.SecureCookies,SameSite:http.SameSiteStrictMode,MaxAge:43200})
 jsonReply(w,200,map[string]string{"status":"authenticated"})
}
func(s *Server)logout(w http.ResponseWriter,r *http.Request){
 c,_:=r.Cookie("matrix_admin")
 _,_=s.DB.ExecContext(r.Context(),"DELETE FROM admin_sessions WHERE token_hash=$1",hashToken(c.Value))
 http.SetCookie(w,&http.Cookie{Name:"matrix_admin",Path:"/api/v1/admin",MaxAge:-1,HttpOnly:true,Secure:s.SecureCookies,SameSite:http.SameSiteStrictMode})
 jsonReply(w,200,map[string]string{"status":"logged_out"})
}
func(s *Server)adminOrders(w http.ResponseWriter,r *http.Request){
 rows,err:=s.DB.QueryContext(r.Context(),"SELECT order_number,status,total_minor,currency,created_at FROM orders ORDER BY created_at DESC LIMIT 100")
 if err!=nil{fail(w,500,"database error");return}
 defer rows.Close()
 type order struct{Number string `json:"number"`;Status string `json:"status"`;TotalMinor int64 `json:"total_minor"`;Currency string `json:"currency"`;CreatedAt time.Time `json:"created_at"`}
 result:=[]order{}
 for rows.Next(){var o order;if err:=rows.Scan(&o.Number,&o.Status,&o.TotalMinor,&o.Currency,&o.CreatedAt);err!=nil{fail(w,500,"database error");return};result=append(result,o)}
 jsonReply(w,200,map[string]any{"items":result})
}
func(s *Server)setGlobalPricing(w http.ResponseWriter,r *http.Request){
 var v struct{AdjustmentBPS int64 `json:"adjustment_bps"`}
 if decode(r,&v)!=nil||v.AdjustmentBPS<=-10000||v.AdjustmentBPS>100000{fail(w,400,"invalid adjustment");return}
 tx,err:=s.DB.BeginTx(r.Context(),nil);if err!=nil{fail(w,503,"database unavailable");return};defer tx.Rollback()
 var old int64
 if err:=tx.QueryRowContext(r.Context(),"SELECT global_adjustment_bps FROM pricing_settings FOR UPDATE").Scan(&old);err!=nil{fail(w,503,"database unavailable");return}
 rows,err:=tx.QueryContext(r.Context(),"SELECT base_price_minor,product_adjustment_bps FROM products WHERE base_price_minor IS NOT NULL")
 if err!=nil{fail(w,503,"database unavailable");return}
 for rows.Next(){
  var base,productAdjustment int64
  if err:=rows.Scan(&base,&productAdjustment);err!=nil{rows.Close();fail(w,503,"database unavailable");return}
  if _,err:=pricing.Calculate(pricing.Rule{BaseMinor:base,GlobalAdjustmentBPS:v.AdjustmentBPS,ProductAdjustmentBPS:productAdjustment},time.Now().UTC());err!=nil{rows.Close();fail(w,400,"adjustment results in invalid product price");return}
 }
 err=rows.Err();rows.Close();if err!=nil{fail(w,503,"database unavailable");return}
 if _,err:=tx.ExecContext(r.Context(),"UPDATE pricing_settings SET global_adjustment_bps=$1,updated_at=now()",v.AdjustmentBPS);err!=nil{fail(w,503,"database unavailable");return}
 if _,err:=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,old_value,new_value) VALUES($1::uuid,'pricing.global_update','pricing_settings',jsonb_build_object('adjustment_bps',$2::bigint),jsonb_build_object('adjustment_bps',$3::bigint))`,adminID(r),old,v.AdjustmentBPS);err!=nil{fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]any{"adjustment_bps":v.AdjustmentBPS})
}
func(s *Server)saveProduct(w http.ResponseWriter,r *http.Request){
 var v struct{Slug string `json:"slug"`;TitleUK string `json:"title_uk"`;TitleEN string `json:"title_en"`;DescriptionUK string `json:"description_uk"`;DescriptionEN string `json:"description_en"`;CategorySlug string `json:"category_slug"`;BasePriceMinor *int64 `json:"base_price_minor"`;Published bool `json:"published"`;Available bool `json:"available"`}
 if decode(r,&v)!=nil||len(v.Slug)<2||len(v.Slug)>120||!regexp.MustCompile(`^[a-z0-9-]+$`).MatchString(v.Slug)||len(v.TitleUK)<2||len(v.TitleUK)>240||len(v.TitleEN)>240||len(v.DescriptionUK)>12000||len(v.DescriptionEN)>12000||v.BasePriceMinor!=nil&&(*v.BasePriceMinor<=0||*v.BasePriceMinor>1_000_000_000_000)||v.Published&&v.BasePriceMinor==nil {fail(w,400,"invalid product");return}
 tx,err:=s.DB.BeginTx(r.Context(),nil);if err!=nil{fail(w,503,"database unavailable");return};defer tx.Rollback()
 var id string
 err=tx.QueryRowContext(r.Context(),`INSERT INTO products(slug,title_uk,title_en,description_uk,description_en,category_id,base_price_minor,published,available) VALUES($1,$2,$3,NULLIF($4,''),NULLIF($5,''),(SELECT id FROM categories WHERE slug=$6),$7,$8,$9) ON CONFLICT(slug) DO UPDATE SET title_uk=EXCLUDED.title_uk,title_en=EXCLUDED.title_en,description_uk=EXCLUDED.description_uk,description_en=EXCLUDED.description_en,category_id=EXCLUDED.category_id,base_price_minor=EXCLUDED.base_price_minor,published=EXCLUDED.published,available=EXCLUDED.available,updated_at=now() RETURNING id::text`,v.Slug,v.TitleUK,v.TitleEN,v.DescriptionUK,v.DescriptionEN,v.CategorySlug,v.BasePriceMinor,v.Published,v.Available).Scan(&id)
 if err!=nil{fail(w,503,"product unavailable");return}
 if _,err:=tx.ExecContext(r.Context(),`INSERT INTO audit_logs(admin_id,action,entity_type,entity_id,new_value) VALUES($1::uuid,'product.upsert','product',$2,jsonb_build_object('slug',$3))`,adminID(r),id,v.Slug);err!=nil{fail(w,503,"database unavailable");return}
 if err:=tx.Commit();err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]string{"id":id,"slug":v.Slug})
}
func(s *Server)createPromotion(w http.ResponseWriter,r *http.Request){
 var v struct{ProductID *string `json:"product_id"`;DiscountBPS int64 `json:"discount_bps"`;StartsAt time.Time `json:"starts_at"`;EndsAt time.Time `json:"ends_at"`}
 if decode(r,&v)!=nil||v.DiscountBPS<0||v.DiscountBPS>10000||!v.EndsAt.After(v.StartsAt)||v.EndsAt.Sub(v.StartsAt)>366*24*time.Hour{fail(w,400,"invalid promotion");return}
 var id string
 err:=s.DB.QueryRowContext(r.Context(),`INSERT INTO promotions(product_id,discount_bps,starts_at,ends_at,created_by) VALUES($1::uuid,$2,$3,$4,$5::uuid) RETURNING id::text`,v.ProductID,v.DiscountBPS,v.StartsAt.UTC(),v.EndsAt.UTC(),adminID(r)).Scan(&id)
 if err!=nil{fail(w,503,"promotion unavailable");return}
 jsonReply(w,201,map[string]string{"id":id})
}
func(s *Server)setCurrency(w http.ResponseWriter,r *http.Request){
 var v struct{Currency string `json:"currency"`}
 if decode(r,&v)!=nil||(v.Currency!="UAH"&&v.Currency!="EUR"&&v.Currency!="USD"){fail(w,400,"invalid currency");return}
 if v.Currency!="UAH"{
  var exists bool
  if err:=s.DB.QueryRowContext(r.Context(),"SELECT EXISTS(SELECT 1 FROM exchange_rates WHERE currency=$1)",v.Currency).Scan(&exists);err!=nil||!exists{fail(w,409,"exchange rate missing");return}
 }
 _,err:=s.DB.ExecContext(r.Context(),"UPDATE pricing_settings SET storefront_currency=$1,updated_at=now()",v.Currency)
 if err!=nil{fail(w,503,"database unavailable");return}
 jsonReply(w,200,map[string]string{"currency":v.Currency})
}
func Run(db *sql.DB)error{
 s:=New(db)
 port:=os.Getenv("API_PORT");if port==""{port="8080"}
 srv:=&http.Server{Addr:":"+port,Handler:s.Handler(),ReadHeaderTimeout:5*time.Second,ReadTimeout:10*time.Second,WriteTimeout:15*time.Second,IdleTimeout:60*time.Second}
 s.logger.Info("MATRIX API listening","port",port)
 return srv.ListenAndServe()
}
