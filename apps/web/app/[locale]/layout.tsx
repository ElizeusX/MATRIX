import type { ReactNode } from "react";
import "./locale.css";
import "./showroom.css";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function LocaleLayout({ children, params }: {children:ReactNode;params:Promise<{locale:string}>}) {
 const {locale}=await params;
 if(locale!=="uk"&&locale!=="en") notFound();
 const uk=locale==="uk";
 return <div className="showroom" lang={locale}>
  <a className="skipLink" href="#main-content">{uk?"До основного вмісту":"Skip to content"}</a>
  <div className="brandNote">{uk?"MATRIX · ФАБРИКА М’ЯКИХ МЕБЛІВ · ЧЕРКАСИ":"MATRIX · UPHOLSTERED FURNITURE · MADE IN UKRAINE"}</div>
  <header className="localeHeader"><Link href={`/${locale}`} className="brandLogo" aria-label="MATRIX"><img src="/brand/matrix-logo.webp" alt="MATRIX" width="635" height="395"/></Link>
   <nav aria-label={uk?"Головна навігація":"Main navigation"}><Link href={`/${locale}/catalog`}>{uk?"Колекції":"Collections"}</Link><Link href={`/${locale}/catalog?category=beds`}>{uk?"Ліжка":"Beds"}</Link><Link href={`/${locale}/cart`}>{uk?"Кошик":"Cart"} ↗</Link></nav>
   <div className="langs"><Link href="/uk" hrefLang="uk" aria-current={uk?"page":undefined}>УКР</Link><span> / </span><Link href="/en" hrefLang="en" aria-current={!uk?"page":undefined}>ENG</Link></div>
  </header>
  <div id="main-content" tabIndex={-1}>{children}</div>
  <footer className="showroomFooter"><Link href={`/${locale}`} className="brandLogo" aria-label="MATRIX"><img src="/brand/matrix-logo.webp" alt="MATRIX" width="635" height="395"/></Link><p>{uk?"Меблі для ваших історій.":"Furniture for your everyday stories."}</p><Link href={`/${locale}/catalog`}>{uk?"Переглянути колекції":"Explore the collections"} ↗</Link></footer>
 </div>;
}
