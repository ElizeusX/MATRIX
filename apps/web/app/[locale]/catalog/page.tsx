import Link from "next/link";
const items=[
 {slug:"hilton-2",cat:"corner-sofas",uk:"Кутовий диван Хілтон-2",en:"Hilton-2 corner sofa",measure:"2800 × 1800 mm"},
 {slug:"molly",cat:"straight-sofas",uk:"Прямий диван Моллі",en:"Molly straight sofa",measure:"2450 × 1150 mm"},
 {slug:"eldorado",cat:"straight-sofas",uk:"Прямий диван Ельдорадо",en:"Eldorado straight sofa",measure:"2460 × 1080 mm"},
 {slug:"smart",cat:"corner-sofas",uk:"Кутовий диван Смарт",en:"Smart corner sofa",measure:"2460 × 1650 mm"}
];
export default async function Catalog({params,searchParams}:{params:Promise<{locale:"uk"|"en"}>;searchParams:Promise<{category?:string;q?:string}>}){
 const {locale}=await params; const {category,q}=await searchParams;
 const rows=items.filter(x=>(!category||x.cat===category)&&(!q||(locale==="en"?x.en:x.uk).toLowerCase().includes(q.toLowerCase())));
 return <main className="catalog"><div className="eyebrow">MATRIX / COLLECTION</div><h1>{locale==="en"?"Furniture catalog":"Каталог меблів"}</h1><form className="search" action={`/${locale}/catalog`}><input name="q" type="search" defaultValue={q||""} aria-label={locale==="en"?"Search products":"Пошук товарів"} placeholder={locale==="en"?"Search":"Пошук"}/><button type="submit">{locale==="en"?"Search":"Знайти"}</button></form><div className="filters"><Link href={`/${locale}/catalog`}>{locale==="en"?"All":"Усі"}</Link>{[["corner-sofas","Кутові дивани","Corner sofas"],["straight-sofas","Прямі дивани","Straight sofas"],["beds","Ліжка","Beds"]].map(c=><Link key={c[0]} href={`/${locale}/catalog?category=${c[0]}`}>{locale==="en"?c[2]:c[1]}</Link>)}</div><div className="productGrid">{rows.map(x=><Link className="productCard" href={`/${locale}/product/${x.slug}`} key={x.slug}><div className="noPhoto">{locale==="en"?"Photo pending authorization":"Фото очікує дозволу"}</div><h2>{locale==="en"?x.en:x.uk}</h2><p>{x.measure}</p><span className="muted">{locale==="en"?"Price on request":"Ціна уточнюється"}</span></Link>)}</div>{rows.length===0&&<p>{locale==="en"?"Nothing found":"Нічого не знайдено"}</p>}</main>;
}
