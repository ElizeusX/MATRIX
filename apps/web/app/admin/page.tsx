"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import "./admin.css";

type Order={number:string;status:string;total_minor:number;currency:string;created_at:string};

export default function Admin(){
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [authorized,setAuthorized]=useState(false);
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState("");
 const [orders,setOrders]=useState<Order[]>([]);
 const [categories,setCategories]=useState<{slug:string;title_uk:string;title_en:string}[]>([]);
 const [promotions,setPromotions]=useState<{id:string;discount_bps:number;ends_at:string;cancelled_at:string|null}[]>([]);
 const [audit,setAudit]=useState<{action:string;created_at:string}[]>([]);
 const [bps,setBps]=useState("0");
 const [slug,setSlug]=useState("");
 const [title,setTitle]=useState("");
 const [titleEn,setTitleEn]=useState("");
 const [descriptionUK,setDescriptionUK]=useState("");
 const [descriptionEN,setDescriptionEN]=useState("");
 const [newCategory,setNewCategory]=useState("");
 const [newCategoryTitle,setNewCategoryTitle]=useState("");
 const [price,setPrice]=useState("");
 const [category,setCategory]=useState("straight-sofas");
 const [published,setPublished]=useState(false);
 const [available,setAvailable]=useState(false);
 const [discount,setDiscount]=useState("10");
 const [duration,setDuration]=useState("7");
 const [currency,setCurrency]=useState("UAH");
 const [rateCurrency,setRateCurrency]=useState("EUR");
 const [uahPerUnit,setUahPerUnit]=useState("");
 const [pricePreview,setPricePreview]=useState<{affected_count:number;samples:{slug:string;base_minor:number;new_minor:number}[];adjustment_bps:number}|null>(null);
 const api=async(path:string,options?:RequestInit)=>{
  const res=await fetch("/api/v1/admin/"+path,{credentials:"same-origin",cache:"no-store",...options,headers:{"Content-Type":"application/json",...options?.headers}});
  const data=await res.json().catch(()=>({error:"Unexpected response"}));
  if(!res.ok)throw new Error(data.error||"Request failed");
  return data;
 };
 const reload=async()=>{try{const [data,c,p,a]=await Promise.all([api("orders"),api("categories"),api("promotions"),api("audit")]);setOrders(data.items);setCategories(c.items);setPromotions(p.items);setAudit(a.items);setAuthorized(true)}catch{setAuthorized(false)}};
 useEffect(()=>{void reload()},[]);
 async function login(e:FormEvent){e.preventDefault();setLoading(true);setMessage("");try{await api("login",{method:"POST",body:JSON.stringify({email,password})});setPassword("");await reload()}catch(e){setMessage(String(e))}finally{setLoading(false)}}
 async function update(path:string,data:unknown){
  setLoading(true);setMessage("");
  try{await api(path,{method:"POST",body:JSON.stringify(data)});setMessage("Зміни збережено.");await reload()}catch(e){setMessage(String(e))}finally{setLoading(false)}
 }
 if(!authorized)return <main className="adminShell"><Link href="/uk">← MATRIX</Link><section className="adminPanel login"><div className="eyebrow">MATRIX / ADMIN</div><h1>Вхід адміністратора</h1><form onSubmit={login}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/></label><label>Пароль<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label><button disabled={loading}>Увійти</button></form>{message&&<p role="alert">{message}</p>}</section></main>;
 return <main className="adminShell"><div className="adminTop"><Link href="/uk" className="logo">MATRIX<span>.</span></Link><div><strong>Панель керування</strong><button onClick={async()=>{try{await api("logout",{method:"POST",body:"{}"});setAuthorized(false)}catch(e){setMessage(String(e))}}}>Вийти</button></div></div><h1>Адміністрування</h1>{message&&<p role="status">{message}</p>}<div className="adminGrid"><section className="adminPanel"><div className="eyebrow">01 / PRICING</div><h2>Глобальна зміна цін</h2><p>Процент застосовується до базової ціни, без накопичення.</p><label>Коригування, %<input type="number" step=".01" min="-99.99" max="1000" value={bps} onChange={e=>setBps(e.target.value)}/></label><button disabled={loading} onClick={async()=>{setMessage("");try{const p=await api("pricing/preview?bps="+Math.round(Number(bps)*100));setPricePreview(p)}catch(e){setMessage(String(e))}}}>Попередній перегляд</button>{pricePreview&&<div className="pricePreview"><p>Товарів з цінами: {pricePreview.affected_count}</p>{pricePreview.samples.map(x=><p key={x.slug}>{x.slug}: {(x.base_minor/100).toFixed(2)} → {(x.new_minor/100).toFixed(2)} UAH</p>)}<button disabled={loading||pricePreview.adjustment_bps!==Math.round(Number(bps)*100)} onClick={()=>{void update("pricing",{adjustment_bps:pricePreview.adjustment_bps});setPricePreview(null)}}>Підтвердити зміну</button></div>}</section><section className="adminPanel"><div className="eyebrow">02 / CATALOG</div><h2>Товар</h2><p>Збереження за slug: існуючий товар оновлюється.</p><label>Slug<input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="sofa-model"/></label><label>Назва українською<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Назва англійською<input value={titleEn} onChange={e=>setTitleEn(e.target.value)}/></label><label>Опис українською<textarea value={descriptionUK} onChange={e=>setDescriptionUK(e.target.value)}/></label><label>Опис англійською<textarea value={descriptionEN} onChange={e=>setDescriptionEN(e.target.value)}/></label><label>Категорія<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c.slug} value={c.slug}>{c.title_uk}</option>)}</select></label><label>Базова ціна, грн<input type="number" min="0" step=".01" value={price} onChange={e=>setPrice(e.target.value)}/></label><label className="check"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/>Опубліковано</label><label className="check"><input type="checkbox" checked={available} onChange={e=>setAvailable(e.target.checked)}/>Доступно для замовлення</label><button disabled={loading} onClick={()=>update("products",{slug,title_uk:title,title_en:titleEn,description_uk:descriptionUK,description_en:descriptionEN,category_slug:category,base_price_minor:price?Math.round(Number(price)*100):null,published,available})}>Зберегти товар</button></section><section className="adminPanel"><div className="eyebrow">03 / CAMPAIGNS</div><h2>Глобальна акція</h2><label>Знижка, %<input type="number" min="0" max="100" step=".01" value={discount} onChange={e=>setDiscount(e.target.value)}/></label><label>Тривалість, днів<input type="number" min="1" max="366" value={duration} onChange={e=>setDuration(e.target.value)}/></label><button disabled={loading} onClick={()=>{const starts=new Date();const ends=new Date(starts.getTime()+Number(duration)*86400000);void update("promotions",{discount_bps:Math.round(Number(discount)*100),starts_at:starts.toISOString(),ends_at:ends.toISOString()})}}>Запланувати акцію</button></section><section className="adminPanel"><div className="eyebrow">04 / CURRENCY</div><h2>Валюта магазину</h2><p>EUR/USD потребують підтвердженого курсу в базі.</p><label>Валюта<select value={currency} onChange={e=>setCurrency(e.target.value)}><option>UAH</option><option>EUR</option><option>USD</option></select></label><button disabled={loading} onClick={()=>update("currency",{currency})}>Змінити валюту</button><hr/><h3>Курс (ручний)</h3><label>Валюта<select value={rateCurrency} onChange={e=>setRateCurrency(e.target.value)}><option>EUR</option><option>USD</option></select></label><label>UAH за 1 {rateCurrency}<input type="number" min="0.001" step="0.001" value={uahPerUnit} onChange={e=>setUahPerUnit(e.target.value)} placeholder="Наприклад 45.000"/></label><button disabled={loading||Number(uahPerUnit)<=0} onClick={()=>update("rates",{currency:rateCurrency,numerator:1000,denominator:Math.round(Number(uahPerUnit)*1000)})}>Зберегти курс</button></section></div><section className="adminPanel"><div className="eyebrow">05 / ORDERS</div><h2>Останні замовлення</h2>{orders.length===0?<p>Поки що замовлень немає.</p>:<div className="adminTable"><table><thead><tr><th>Номер</th><th>Статус</th><th>Сума</th><th>Дата</th><th>Дії</th></tr></thead><tbody>{orders.map(o=><tr key={o.number}><td>{o.number}</td><td>{o.status}</td><td>{(o.total_minor/100).toFixed(2)} {o.currency}</td><td>{new Date(o.created_at).toLocaleString("uk-UA")}</td><td><button onClick={()=>update("orders/status",{number:o.number,status:o.status==="paid"?"processing":o.status==="processing"?"shipped":o.status==="shipped"?"delivered":"canceled",tracking:""})}>{o.status==="paid"?"В роботу":o.status==="processing"?"Відправлено":o.status==="shipped"?"Доставлено":"Скасувати"}</button></td></tr>)}</tbody></table></div>}</section><div className="adminGrid"><section className="adminPanel"><div className="eyebrow">06 / CATEGORIES</div><h2>Категорії</h2><label>Slug<input value={newCategory} onChange={e=>setNewCategory(e.target.value)}/></label><label>Назва<input value={newCategoryTitle} onChange={e=>setNewCategoryTitle(e.target.value)}/></label><button onClick={()=>update("categories",{slug:newCategory,title_uk:newCategoryTitle,title_en:""})}>Зберегти категорію</button></section><section className="adminPanel"><div className="eyebrow">07 / PROMOTIONS</div><h2>Історія акцій</h2>{promotions.length===0&&<p>Немає акцій</p>}{promotions.map(p=><div className="historyItem" key={p.id}><small>{p.id}</small><p>−{p.discount_bps/100}% до {new Date(p.ends_at).toLocaleString("uk-UA")}</p>{!p.cancelled_at&&<button onClick={()=>update("promotions/cancel",{id:p.id})}>Скасувати акцію</button>}</div>)}</section></div><section className="adminPanel"><div className="eyebrow">08 / AUDIT</div><h2>Журнал подій</h2>{audit.length===0?<p>Немає записів</p>:audit.map((a,i)=><p key={i}>{new Date(a.created_at).toLocaleString("uk-UA")} — {a.action}</p>)}</section></main>;
}
