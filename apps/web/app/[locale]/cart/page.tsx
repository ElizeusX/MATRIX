import Link from "next/link";
import CartCheckout from "../../../components/CartCheckout";
export default async function Cart({params}:{params:Promise<{locale:"uk"|"en"}>}){
 const {locale}=await params;
 return <main className="cartPage"><div className="eyebrow">MATRIX / CART</div><h1>{locale==="en"?"Your cart":"Ваш кошик"}</h1><CartCheckout locale={locale}/><Link className="cta" href={`/${locale}/catalog`}>{locale==="en"?"Browse catalog":"Переглянути каталог"} ↗</Link></main>;
}
