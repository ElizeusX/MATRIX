package pricing

import (
 "errors"
 "math/big"
 "time"
)

// Monetary amounts are integer minor units; rates are basis points (10000 = 100%).
// No binary floating-point calculations are used.
type Promotion struct {
 DiscountBPS int64
 StartsAt time.Time
 EndsAt time.Time
 Cancelled bool
}

func (p Promotion) Active(at time.Time) bool {
 return !p.Cancelled && p.DiscountBPS > 0 && !at.Before(p.StartsAt) && at.Before(p.EndsAt)
}

type Rule struct {
 BaseMinor int64
 GlobalAdjustmentBPS int64
 ProductAdjustmentBPS int64
 GlobalPromotion *Promotion
 ProductPromotion *Promotion
}

type Quote struct {
 OriginalMinor int64 `json:"original_minor"`
 FinalMinor int64 `json:"final_minor"`
 DiscountBPS int64 `json:"discount_bps"`
}

func mulRound(value, numerator, denominator int64) (int64,error) {
 if denominator <= 0 || value < 0 || numerator < 0 {return 0, errors.New("invalid monetary input")}
 a:=new(big.Int).Mul(big.NewInt(value),big.NewInt(numerator))
 a.Add(a,big.NewInt(denominator/2))
 a.Quo(a,big.NewInt(denominator))
 if !a.IsInt64() {return 0,errors.New("price overflow")}
 return a.Int64(),nil
}

func Calculate(r Rule, at time.Time) (Quote,error) {
 if r.BaseMinor < 0 {return Quote{},errors.New("negative base price")}
 if r.GlobalAdjustmentBPS <= -10000 || r.ProductAdjustmentBPS <= -10000 {return Quote{},errors.New("adjustment makes price nonpositive")}
 base,err:=mulRound(r.BaseMinor,10000+r.GlobalAdjustmentBPS,10000)
 if err!=nil{return Quote{},err}
 base,err=mulRound(base,10000+r.ProductAdjustmentBPS,10000)
 if err!=nil{return Quote{},err}
 if r.BaseMinor>0&&base==0{return Quote{},errors.New("adjustments would erase positive base price")}
 discount:=int64(0)
 if r.GlobalPromotion!=nil && r.GlobalPromotion.Active(at){discount=r.GlobalPromotion.DiscountBPS}
 // Product discounts override global discounts, including an explicit zero.
 if r.ProductPromotion!=nil && r.ProductPromotion.Active(at){discount=r.ProductPromotion.DiscountBPS}
 if discount<0 || discount>10000{return Quote{},errors.New("discount out of range")}
 final,err:=mulRound(base,10000-discount,10000)
 if err!=nil{return Quote{},err}
 return Quote{OriginalMinor:base,FinalMinor:final,DiscountBPS:discount},nil
}

// ConvertMinor uses the number of target-currency minor units per one source minor unit,
// expressed as a rational numerator/denominator pair.
func ConvertMinor(sourceMinor, numerator, denominator int64)(int64,error){
 return mulRound(sourceMinor,numerator,denominator)
}
