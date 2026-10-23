export type Product={
 id:string;slug:string;category:string;
 title_uk:string;title_en:string;description_uk:string|null;description_en:string|null;
 base_price_minor:number|null;price_minor:number|null;
 original_minor:number|null;settlement_price_minor:number|null;discount_bps:number;currency:string;
 available:boolean;published:boolean
};
export async function getProducts():Promise<Product[]>{
 try{
  const base=process.env.MATRIX_API_INTERNAL_URL||"http://localhost:8080";
  const response=await fetch(base+"/api/v1/products",{cache:"no-store"});
  if(!response.ok)return [];
  const data=await response.json() as {items:Product[]};
  return Array.isArray(data.items)?data.items:[];
 }catch{return []}
}
export async function getProduct(slug:string):Promise<Product|null>{
 try{
  const base=process.env.MATRIX_API_INTERNAL_URL||"http://localhost:8080";
  const response=await fetch(base+"/api/v1/products/"+encodeURIComponent(slug),{cache:"no-store"});
  if(!response.ok)return null;
  return await response.json() as Product;
 }catch{return null}
}
export function money(minor:number,locale:"uk"|"en"="uk",currency="UAH"){
 return new Intl.NumberFormat(locale==="uk"?"uk-UA":"en-US",{style:"currency",currency}).format(minor/100);
}
