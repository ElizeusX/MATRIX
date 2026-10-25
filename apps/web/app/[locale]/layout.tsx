import type { ReactNode } from "react";
import "./locale.css";
import "./showroom.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand, FurnitureIcon } from "../../components/Brand";
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "uk" && locale !== "en") notFound();
  return (
    <div className="storefront">
      <a className="storeSkip" href="#store-content">
        {locale === "uk" ? "До основного вмісту" : "Skip to content"}
      </a>
      <header className="localeHeader">
        <Link href={`/${locale}`} className="matrixBrand" aria-label="MATRIX">
          <Brand />
        </Link>
        <nav aria-label={locale === "uk" ? "Навігація" : "Navigation"}>
          <Link href={`/${locale}/catalog`}>
            {locale === "uk" ? "Каталог" : "Catalog"}⌄
          </Link>
          <Link href={`/${locale}#about`}>
            {locale === "uk" ? "Про нас" : "About us"}
          </Link>
        </nav>
        <div className="storeTools">
          <Link
            className="storeSearch"
            href={`/${locale}/catalog`}
            aria-label={locale === "uk" ? "Пошук" : "Search"}
          >
            <FurnitureIcon kind="search" />
          </Link>
          <Link
            href={`/${locale}/cart`}
            aria-label={locale === "uk" ? "Кошик" : "Cart"}
          >
            <FurnitureIcon kind="bag" />
          </Link>
          <Link
            className="storeLanguage"
            href={locale === "uk" ? "/en" : "/uk"}
            lang={locale === "uk" ? "en" : "uk"}
          >
            {locale === "uk" ? "EN" : "УКР"}
          </Link>
        </div>
      </header>
      <div id="store-content">{children}</div>
      <footer className="storeFooter">
        <Link href={`/${locale}`} className="matrixBrand">
          <Brand />
        </Link>
        <a href="mailto:matrix-mebli@ukr.net">matrix-mebli@ukr.net</a>
        <span>© MATRIX {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
