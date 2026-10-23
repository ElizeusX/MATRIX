package pricing

import (
 "testing"
 "time"
)

func TestGlobalAdjustmentIsNeverCompounded(t *testing.T){
 for _,c:=range []struct{bps int64; want int64}{{1000,2200000},{1500,2300000},{-1000,1800000},{0,2000000}}{
  got,err:=Calculate(Rule{BaseMinor:2000000,GlobalAdjustmentBPS:c.bps},time.Now())
  if err!=nil||got.FinalMinor!=c.want{t.Fatalf("%d: got %+v, %v",c.bps,got,err)}
 }
}
func TestProductDiscountOverridesGlobal(t *testing.T){
 now:=time.Now().UTC()
 g:=&Promotion{DiscountBPS:1000,StartsAt:now.Add(-time.Hour),EndsAt:now.Add(time.Hour)}
 p:=&Promotion{DiscountBPS:2000,StartsAt:now.Add(-time.Hour),EndsAt:now.Add(time.Hour)}
 got,err:=Calculate(Rule{BaseMinor:10000,GlobalPromotion:g,ProductPromotion:p},now)
 if err!=nil||got.FinalMinor!=8000||got.DiscountBPS!=2000 {t.Fatalf("%+v %v",got,err)}
}
func TestPromotionExpiresServerSide(t *testing.T){
 now:=time.Now().UTC()
 p:=&Promotion{DiscountBPS:1000,StartsAt:now.Add(time.Hour),EndsAt:now.Add(2*time.Hour)}
 for _,tt:=range []struct{at time.Time;want int64}{{now,10000},{now.Add(time.Hour),9000},{now.Add(2*time.Hour),10000}}{
  got,err:=Calculate(Rule{BaseMinor:10000,GlobalPromotion:p},tt.at)
  if err!=nil||got.FinalMinor!=tt.want{t.Fatalf("%v: %+v %v",tt.at,got,err)}
 }
}
func TestZeroAndOverflow(t *testing.T){
 if _,err:=Calculate(Rule{BaseMinor:100,GlobalAdjustmentBPS:-10000},time.Now());err==nil{t.Fatal("expected error")}
 if _,err:=ConvertMinor(100,-1,10);err==nil{t.Fatal("expected error")}
 if got,err:=ConvertMinor(101,1,2);err!=nil||got!=51{t.Fatalf("rounding got %d %v",got,err)}
}
