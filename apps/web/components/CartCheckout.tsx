"use client";
import { FormEvent,useEffect,useMemo,useState } from "react";
import { CART_KEY,CartLine,readCart,saveCart } from "./AddToCart";
import type { Product } from "../lib/catalog";
import { money } from "../lib/catalog";
type CartProduct={item:Product;quantity:number};
export default function CartCheckout({locale}:{locale:"uk"|"en"}){
 const [cart,setCart]=useState<CartLine[]>([]);
 const [products,setProducts]=useState<Product[]>([]);
 const [busy,setBusy]=useState(false);
 const [liqpayEnabled,setLiqpayEnabled]=useState(false);
 const [paymentMethod,setPaymentMethod]=useState("manual");
 const [paymentForm,setPaymentForm]=useState<{url:string;data:string;signature:string}|null>(null);
 const [error,setError]=useState("");
 const [confirmation,setConfirmation]=useState("");
 useEffect(()=>{
  setCart(readCart());
  fetch("/api/v1/config").then(r=>r.ok?r.json():{}).then(d=>setLiqpayEnabled(!!d.liqpay_enabled)).catch(()=>{});
  fetch("/api/v1/products",{cache:"no-store"}).then(r=>r.ok?r.json():{items:[]}).then(data=>setProducts(data.items||[])).catch(()=>setError(locale==="uk"?"Каталог тимчасово недоступний":"Catalog is unavailable"));
 },[locale]);
 const lines=useMemo(()=>cart.map(x=>({item:products.find(p=>p.id===x.id),quantity:x.quantity})).filter((x):x is CartProduct=>!!x.item),[cart,products]);
 const unavailable=lines.some(x=>!x.item.available||!x.item.published||x.item.price_minor==null||x.item.price_minor<=0)||cart.length!==lines.length;
 const total=lines.reduce((sum,x)=>sum+(x.item.price_minor||0)*x.quantity,0);
 function change(id:string,quantity:number){const next=quantity<=0?cart.filter(x=>x.id!==id):cart.map(x=>x.id===id?{...x,quantity:Math.min(99,quantity)}:x);setCart(next);saveCart(next)}
 async function checkout(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(unavailable||busy||lines.length===0)return;
  setBusy(true);setError("");
  const form=new FormData(e.currentTarget);
  const data={name:form.get("name"),phone:form.get("phone"),email:form.get("email"),address:form.get("address"),comment:form.get("comment"),consent:form.get("consent")==="on",payment_method:paymentMethod,items:cart.map(x=>({product_id:x.id,quantity:x.quantity}))};
  try{
   const res=await fetch("/api/v1/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
   const order=await res.json();
   if(!res.ok)throw new Error(order.error||"Order failed");
   setConfirmation(order.order_number);if(order.payment_url&&order.payment_data&&order.payment_signature)setPaymentForm({url:order.payment_url,data:order.payment_data,signature:order.payment_signature});setCart([]);localStorage.removeItem(CART_KEY);
  }catch(err){setError(String(err))}finally{setBusy(false)}
 }
 if(confirmation)return <section role="status"><h2>{locale==="uk"?"Замовлення прийнято":"Order received"}</h2><p>{locale==="uk"?"Номер":"Number"}: <strong>{confirmation}</strong></p><p>{locale==="uk"?"Оплата ще не підтверджена. Ми зв'яжемося з вами щодо деталей.":"Payment has not been confirmed. We will contact you about the details."}</p>{paymentForm&&<form method="post" action={paymentForm.url}><input type="hidden" name="data" value={paymentForm.data}/><input type="hidden" name="signature" value={paymentForm.signature}/><button type="submit">{locale==="uk"?"Перейти до безпечної оплати LiqPay":"Continue to secure LiqPay payment"}</button></form>}</section>;
 return <div className="cartCheckout">{cart.length===0?<p>{locale==="uk"?"Ваш кошик порожній.":"Your cart is empty."}</p>:<><div className="cartLines">{lines.map(({item,quantity})=><div className="cartLine" key={item.id}><div><strong>{locale==="uk"?item.title_uk:(item.title_en||item.title_uk)}</strong><p>{item.price_minor==null?"—":money(item.price_minor,locale)}</p></div><label>{locale==="uk"?"Кількість":"Qty"} <input type="number" min={0} max={99} value={quantity} onChange={e=>change(item.id,Number(e.target.value))}/></label><button onClick={()=>change(item.id,0)}>{locale==="uk"?"Видалити":"Remove"}</button></div>)}</div><h2>{locale==="uk"?"Разом":"Total"}: {money(total,locale)}</h2>{unavailable?<p role="alert">{locale==="uk"?"Один або кілька товарів зараз недоступні. Видаліть їх перед оформленням.":"One or more items are unavailable. Remove them before checkout."}</p>:<form onSubmit={checkout} className="checkoutForm"><h2>{locale==="uk"?"Оформлення":"Checkout"}</h2><label>{locale==="uk"?"Ім'я":"Name"}<input name="name" minLength={2} maxLength={160} required/></label><label>{locale==="uk"?"Телефон":"Phone"}<input name="phone" type="tel" minLength={8} maxLength={32} required/></label><label>Email<input name="email" type="email"/></label><label>{locale==="uk"?"Адреса доставки":"Delivery address"}<textarea name="address" minLength={5} maxLength={1000} required/></label><label>{locale==="uk"?"Коментар":"Comment"}<textarea name="comment" maxLength={2000}/></label><label>{locale==="uk"?"Спосіб оплати":"Payment method"}<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="manual">{locale==="uk"?"Узгодити з продавцем":"Arrange with merchant"}</option>{liqpayEnabled&&<option value="liqpay">LiqPay — Visa / Mastercard</option>}</select></label><label className="consent"><input name="consent" type="checkbox" required/>{locale==="uk"?"Погоджуюся на обробку даних для виконання замовлення":"I consent to processing of order information"}</label><button disabled={busy||unavailable}>{busy?"…":locale==="uk"?"Підтвердити замовлення":"Place order"}</button></form>}</>}{error&&<p role="alert">{error}</p>}</div>;
}
