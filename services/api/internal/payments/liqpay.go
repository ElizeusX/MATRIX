package payments

import (
 "crypto/subtle"
 "encoding/base64"
 "encoding/json"
 "errors"
 "net/http"
 "net/url"
 "strings"
 "time"

 "golang.org/x/crypto/sha3"
)

// LiqPay uses SHA3-256(private_key + base64_payload + private_key).
// Never expose a private key to the browser.
type LiqPay struct { PublicKey string; PrivateKey string; Client *http.Client }
type Checkout struct {
 PublicKey string `json:"public_key"`
 Version int `json:"version"`
 Action string `json:"action"`
 Amount string `json:"amount"`
 Currency string `json:"currency"`
 Description string `json:"description"`
 OrderID string `json:"order_id"`
 ServerURL string `json:"server_url,omitempty"`
 ResultURL string `json:"result_url,omitempty"`
}
func (l LiqPay) Sign(encoded string)string{
 sum:=sha3.Sum256([]byte(l.PrivateKey+encoded+l.PrivateKey))
 return base64.StdEncoding.EncodeToString(sum[:])
}
func (l LiqPay) Verify(encoded,signature string)bool{
 expected:=l.Sign(encoded)
 return subtle.ConstantTimeCompare([]byte(signature),[]byte(expected))==1
}
func (l LiqPay) CreateCheckout(c Checkout)(url.Values,error){
 if l.PublicKey==""||l.PrivateKey==""||c.Amount==""||c.OrderID==""||c.Currency!="UAH"||c.ServerURL==""{return nil,errors.New("checkout configuration incomplete")}
 c.PublicKey=l.PublicKey;c.Version=7;c.Action="pay"
 raw,err:=json.Marshal(c);if err!=nil{return nil,err}
 encoded:=base64.StdEncoding.EncodeToString(raw)
 return url.Values{"data":{encoded},"signature":{l.Sign(encoded)}},nil
}
type Status struct{
 OrderID string `json:"order_id"`
 Status string `json:"status"`
 Amount json.Number `json:"amount"`
 Currency string `json:"currency"`
 TransactionID json.Number `json:"transaction_id"`
}
// FetchStatus queries LiqPay directly; a browser redirect or unsigned callback is never trusted.
func(l LiqPay)FetchStatus(orderID string)(Status,error){
 if l.PublicKey==""||l.PrivateKey==""||orderID==""{return Status{},errors.New("merchant credentials missing")}
 raw,_:=json.Marshal(map[string]any{"action":"status","version":7,"public_key":l.PublicKey,"order_id":orderID})
 encoded:=base64.StdEncoding.EncodeToString(raw)
 client:=l.Client;if client==nil{client=&http.Client{Timeout:10*time.Second}}
 resp,err:=client.PostForm("https://www.liqpay.ua/api/request",url.Values{"data":{encoded},"signature":{l.Sign(encoded)}})
 if err!=nil{return Status{},err}
 defer resp.Body.Close()
 if resp.StatusCode!=200{return Status{},errors.New("payment status request failed")}
 var status Status
 dec:=json.NewDecoder(http.MaxBytesReader(nil,resp.Body,65536));dec.UseNumber()
 if err:=dec.Decode(&status);err!=nil{return Status{},err}
 if status.OrderID!=orderID{return Status{},errors.New("payment order mismatch")}
 return status,nil
}
func IsPaidStatus(status string)bool{return strings.EqualFold(status,"success")||strings.EqualFold(status,"sandbox")}
