package payments

import (
 "encoding/base64"
 "testing"
)

func TestSignatureVerification(t *testing.T){
 provider:=LiqPay{PublicKey:"test-public",PrivateKey:"test-secret"}
 raw:=base64.StdEncoding.EncodeToString([]byte(`{"order_id":"MX-1"}`))
 sig:=provider.Sign(raw)
 if !provider.Verify(raw,sig){t.Fatal("valid signature rejected")}
 if provider.Verify(raw+"tamper",sig){t.Fatal("tampered callback accepted")}
 if provider.Verify(raw,sig+"bad"){t.Fatal("invalid signature accepted")}
}
func TestCheckoutRequest(t *testing.T){
 provider:=LiqPay{PublicKey:"test",PrivateKey:"secret"}
 form,err:=provider.CreateCheckout(Checkout{OrderID:"MX-1",Amount:"100.00",Currency:"UAH",ServerURL:"https://example.com/webhook"})
 if err!=nil{t.Fatal(err)}
 if !provider.Verify(form.Get("data"),form.Get("signature")){t.Fatal("form not signed")}
 if _,err:=provider.CreateCheckout(Checkout{OrderID:"MX-1",Amount:"100",Currency:"EUR",ServerURL:"https://example.com/webhook"});err==nil{t.Fatal("EUR checkout not allowed in UAH-only adapter")}
}
