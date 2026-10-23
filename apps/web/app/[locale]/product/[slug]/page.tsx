import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "../../../../components/AddToCart";
import {getProduct,money} from "../../../../lib/catalog";
const verified:{[slug:string]:{uk:string;en:string;size:string;sleep:string}}={
 "hilton-2":{uk:"Кутовий диван Хілтон-2",en:"Hilton-2 corner sofa",size:"2800 × 1800",sleep:"2100 × 1300"},
 "molly":{uk:"Прямий диван Моллі",en:"Molly straight sofa",size:"2450 × 1150",sleep:"1950 × 1600"},
 "eldorado":{uk:"Прямий диван Ельдорадо",en:"Eldorado straight sofa",size:"2460 × 1080",sleep:"1980 × 1600"},
 "smart":{uk:"Кутовий диван Смарт",en:"Smart corner sofa",size:"2460 × 1650",sleep:"1980 × 1600"}
};
export function generateStaticParams(){return Object.keys(verified).flatMap(slug=>[{locale:"uk",slug},{locale:"en",slug}]);}
export default async function Product({params}:{params:Promise<{locale:"uk"|"en";slug:string}>}){
 const {locale,slug}=await params;const p=await getProduct(slug);const fact=verified[slug];
 if(!p&&!fact)notFound();
 const title=p?(locale==="en"?(p.title_en||p.title_uk):p.title_uk):(locale==="en"?fact.en:fact.uk);
 return <main className="productDetail"><Link href={`/${locale}/catalog`}>← {locale==="en"?"Catalog":"Каталог"}</Link><div className="detailLayout"><div className="detailMedia">{locale==="en"?"Original image pending usage rights":"Оригінальне фото очікує підтвердження прав"}</div><section><div className="eyebrow">MATRIX FURNITURE</div><h1>{title}</h1>{fact&&<><p>{locale==="en"?"Overall dimensions":"Габаритні розміри"}: {fact.size} mm</p><p>{locale==="en"?"Sleeping area":"Спальне місце"}: {fact.sleep} mm</p></>}{p&&<p>{locale==="en"?(p.description_en||p.description_uk):(p.description_uk||"")}</p>}{p?.available&&p.price_minor!=null&&p.price_minor>0?<><h2>{money(p.price_minor,locale)}</h2><AddToCart product={p} locale={locale}/></>:<><p className="muted">{locale==="en"?"Price and availability must be confirmed before ordering.":"Ціну та наявність потрібно підтвердити перед замовленням."}</p><button disabled className="disabledBuy">{locale==="en"?"Ordering temporarily unavailable":"Замовлення тимчасово недоступне"}</button></>}</section></div></main>;
}
