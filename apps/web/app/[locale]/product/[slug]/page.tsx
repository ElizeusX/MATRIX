import Link from "next/link";
import { notFound } from "next/navigation";
const items:{[slug:string]:{uk:string;en:string;size:string;sleep:string}}={
 "hilton-2":{uk:"Кутовий диван Хілтон-2",en:"Hilton-2 corner sofa",size:"2800 × 1800",sleep:"2100 × 1300"},
 "molly":{uk:"Прямий диван Моллі",en:"Molly straight sofa",size:"2450 × 1150",sleep:"1950 × 1600"},
 "eldorado":{uk:"Прямий диван Ельдорадо",en:"Eldorado straight sofa",size:"2460 × 1080",sleep:"1980 × 1600"},
 "smart":{uk:"Кутовий диван Смарт",en:"Smart corner sofa",size:"2460 × 1650",sleep:"1980 × 1600"}
};
export function generateStaticParams(){return Object.keys(items).flatMap(slug=>[{locale:"uk",slug},{locale:"en",slug}]);}
export default async function Product({params}:{params:Promise<{locale:"uk"|"en";slug:string}>}){
 const {locale,slug}=await params;const p=items[slug];if(!p)notFound();
 return <main className="productDetail"><Link href={`/${locale}/catalog`}>← {locale==="en"?"Catalog":"Каталог"}</Link><div className="detailLayout"><div className="detailMedia">{locale==="en"?"Original image pending usage rights":"Оригінальне фото очікує підтвердження прав"}</div><section><div className="eyebrow">MATRIX FURNITURE</div><h1>{locale==="en"?p.en:p.uk}</h1><p>{locale==="en"?"Overall dimensions":"Габаритні розміри"}: {p.size} mm</p><p>{locale==="en"?"Sleeping area":"Спальне місце"}: {p.sleep} mm</p><p className="muted">{locale==="en"?"Price and availability must be confirmed before ordering.":"Ціну та наявність потрібно підтвердити перед замовленням."}</p><button disabled className="disabledBuy">{locale==="en"?"Ordering temporarily unavailable":"Замовлення тимчасово недоступне"}</button></section></div></main>;
}
