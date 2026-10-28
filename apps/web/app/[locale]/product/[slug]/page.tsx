import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "../../../../components/AddToCart";
import Furniture3D from "../../../../components/Furniture3D";
import {getFurnitureModel} from "../../../../lib/ar-models";
import {getProduct,money} from "../../../../lib/catalog";
import {sourceProducts,sourceProduct} from "../../../../lib/source-catalog";
const photoUrl=(url:string)=>url.startsWith("media/")?"/"+url:url;
export function generateStaticParams(){return sourceProducts.flatMap(p=>[{locale:"uk",slug:p.slug},{locale:"en",slug:p.slug}]);}
export default async function Product({params}:{params:Promise<{locale:"uk"|"en";slug:string}>}){
 const {locale,slug}=await params;const [p,approved3D]=await Promise.all([getProduct(slug),getFurnitureModel(slug)]);const fact=sourceProduct(slug);
 if(!p&&!fact)notFound();
 const title=p?(locale==="en"?(p.title_en||p.title_uk):p.title_uk):(locale==="en"?fact!.en:fact!.uk);
 return <main className="productDetail"><Link href={`/${locale}/catalog`}>← {locale==="en"?"Catalog":"Каталог"}</Link><div className="detailLayout"><div className="detailVisuals"><div className="detailMedia">{fact?<><img className="detailPhoto" src={'/'+fact.image} alt={title}/><div className="sourceGallery">{fact.images.map((url,index)=><a key={url} href={photoUrl(url)} target="_blank" rel="noopener noreferrer"><img src={photoUrl(url)} alt={`${title} — ${index+1}`} loading="lazy"/></a>)}</div></>:<p>{locale==="en"?"Photo unavailable":"Фото відсутнє"}</p>}</div>{approved3D&&<Furniture3D model={approved3D} locale={locale} initiallyOpen/>}</div><section><div className="eyebrow">MATRIX FURNITURE</div><h1>{title}</h1>{fact?.dimensionSource==="manufacturer"?<p>{locale==="en"?"Overall dimensions":"Габаритні розміри"}: {fact.dimensions} mm</p>:p?.width_mm&&p?.depth_mm?<p>{locale==="en"?"Overall dimensions":"Габаритні розміри"}: {p.width_mm} × {p.depth_mm} mm</p>:fact?.dimensions&&<p>{locale==="en"?"Overall dimensions (source)":"Габаритні розміри (джерело)"}: {fact.dimensions} mm</p>}
{fact?.sleepingAreaSource==="manufacturer"?<p>{locale==="en"?"Sleeping area":"Спальне місце"}: {fact.sleepingArea} mm</p>:p?.sleeping_width_mm&&p?.sleeping_length_mm?<p>{locale==="en"?"Sleeping area":"Спальне місце"}: {p.sleeping_length_mm} × {p.sleeping_width_mm} mm</p>:fact?.sleepingArea&&<p>{locale==="en"?"Sleeping area (source)":"Спальне місце (джерело)"}: {fact.sleepingArea} mm</p>}
<p className="sourceDescription">{(locale==="en"?p?.description_en||p?.description_uk:p?.description_uk)||fact?.description}</p>
{fact&&<><p><a href={fact.sourceUrl} target="_blank" rel="noopener noreferrer">{locale==="en"?"Manufacturer’s page ↗":"Сторінка виробника ↗"}</a></p>{fact.flags.length>0&&<p className="muted">{locale==="en"?"Source variants and ambiguous values need confirmation with the manufacturer.":"Варіанти та неоднозначні значення джерела потребують уточнення у виробника."}</p>}</>}
{p?.available&&p.price_minor!=null&&p.price_minor>0?<><h2>{money(p.price_minor,locale,p.currency)}</h2>{p.discount_bps>0&&p.original_minor!=null&&<p><s>{money(p.original_minor,locale,p.currency)}</s> −{(p.discount_bps/100).toFixed(0)}%</p>}{p.currency!=="UAH"&&p.settlement_price_minor!=null&&<p className="muted">{locale==="uk"?"До сплати":"Settlement"}: {money(p.settlement_price_minor,locale,"UAH")}</p>}<AddToCart product={p} locale={locale}/></>:<><p className="muted">{locale==="en"?"Price and availability must be confirmed before ordering.":"Ціну та наявність потрібно підтвердити перед замовленням."}</p><button disabled className="disabledBuy">{locale==="en"?"Ordering temporarily unavailable":"Замовлення тимчасово недоступне"}</button></>}</section></div></main>;
}


