"use client";
import { useState } from "react";
import { Product } from "../lib/catalog";

export const CART_KEY="matrix_cart_v1";
export type CartLine={id:string;quantity:number};
export function readCart():CartLine[]{
 try{
  const raw=JSON.parse(localStorage.getItem(CART_KEY)||"[]") as CartLine[];
  return Array.isArray(raw)?raw.filter(x=>typeof x.id==="string"&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=99).slice(0,40):[];
 }catch{return []}
}
export function saveCart(lines:CartLine[]){localStorage.setItem(CART_KEY,JSON.stringify(lines))}
export default function AddToCart({product,locale}:{product:Product;locale:"uk"|"en"}){
 const [quantity,setQuantity]=useState(1);
 const [added,setAdded]=useState(false);
 const disabled=!product.available||!product.published||product.price_minor==null||product.price_minor<=0;
 return <div className="buyActions"><label>{locale==="uk"?"Кількість":"Quantity"} <input type="number" min={1} max={99} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(99,Number(e.target.value)||1)))}/></label><button disabled={disabled} onClick={()=>{const lines=readCart();const found=lines.find(x=>x.id===product.id);if(found){found.quantity=Math.min(99,found.quantity+quantity)}else{lines.push({id:product.id,quantity})}saveCart(lines);setAdded(true)}}>{added?(locale==="uk"?"Додано ✓":"Added ✓"):(locale==="uk"?"Додати до кошика":"Add to cart")}</button></div>;
}
