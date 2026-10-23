import Link from "next/link";
export default async function Cart({params}:{params:Promise<{locale:"uk"|"en"}>}){
 const {locale}=await params;
 return <main className="cartPage"><div className="eyebrow">MATRIX / CART</div><h1>{locale==="en"?"Your cart":"Ваш кошик"}</h1><p className="empty">{locale==="en"?"Online ordering will become available once confirmed prices, payment terms and inventory are published. There are currently no purchasable products.":"Онлайн-замовлення стане доступним після публікації підтверджених цін, умов оплати та наявності товарів. Наразі товари недоступні для покупки."}</p><Link className="cta" href={`/${locale}/catalog`}>{locale==="en"?"Browse catalog":"Переглянути каталог"} ↗</Link></main>;
}
