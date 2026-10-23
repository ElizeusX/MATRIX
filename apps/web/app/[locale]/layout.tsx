import type { ReactNode } from "react";
import "./locale.css";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function LocaleLayout({ children, params }: {children:ReactNode;params:Promise<{locale:string}>}) {
 const {locale}=await params;
 if(locale!=="uk"&&locale!=="en") notFound();
 return <><header className="localeHeader"><Link href={`/${locale}`} className="logo">MATRIX<span>.</span></Link><nav><Link href={`/${locale}/catalog`}>{locale==="uk"?"Каталог":"Catalog"}</Link><Link href={`/${locale}/cart`}>{locale==="uk"?"Кошик":"Cart"}</Link></nav><div className="langs"><Link href="/uk">УКР</Link><span> / </span><Link href="/en">ENG</Link></div></header>{children}</>;
}
