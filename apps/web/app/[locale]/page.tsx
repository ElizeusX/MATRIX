import Link from "next/link";
import { FurnitureIcon } from "../../components/Brand";
import { getApprovedModel } from "../../lib/ar-models";
import { getProducts, money } from "../../lib/catalog";
import { sourceProducts, sourcePhoto } from "../../lib/source-catalog";
const copy = {
  uk: {
    title: "Меблі, що пасують вашому стилю",
    description: "Створюємо простір для комфортного та впевненого життя",
    cta: "Переглянути каталог",
    categories: ["Дивани", "Кутові дивани", "Ліжка"],
    collection: "Колекція MATRIX",
    all: "Всі товари",
    price: "Ціна уточнюється",
    art: "Інтер’єрна візуалізація",
    about: "Сучасні меблі для вашого простору",
    story:
      "MATRIX — фабрика м’яких меблів у Черкасах. Комфорт, стиль і гармонія у кожній деталі.",
  },
  en: {
    title: "Furniture that fits your style",
    description: "Creating space for a comfortable, confident life.",
    cta: "Explore catalog",
    categories: ["Sofas", "Corner sofas", "Beds"],
    collection: "The MATRIX collection",
    all: "All products",
    price: "Price on request",
    art: "Illustrative showroom interior",
    about: "Modern furniture for your space",
    story:
      "MATRIX is an upholstered furniture manufacturer in Cherkasy, Ukraine. Comfort, style and harmony in every detail.",
  },
};
export default async function LocalHome({
  params,
}: {
  params: Promise<{ locale: "uk" | "en" }>;
}) {
  const { locale } = await params;
  const t = copy[locale];
  const [live, hiltonModel] = await Promise.all([
    getProducts(),
    getApprovedModel("hilton-2"),
  ]);
  const selected = ["hilton-2", "pryamyy-dyvan-monako", "lizhko-faro", "molly"]
    .map((slug) => sourceProducts.find((p) => p.slug === slug))
    .filter((p): p is (typeof sourceProducts)[number] => !!p);
  return (
    <main id="main">
      <section className="showroomHero" aria-labelledby="home-title">
        <div className="showroomText">
          <p className="heroPagination">
            MATRIX / COLLECTION <span />
          </p>
          <h1 id="home-title">{t.title}</h1>
          <p>{t.description}</p>
          <Link className="showroomCta" href={`/${locale}/catalog`}>
            {t.cta}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        {hiltonModel && (
          <Link
            className="showroomAr"
            href={`/${locale}/product/hilton-2#matrix3d-title`}
            aria-label="Хілтон-2: 3D / AR"
          >
            <span>3D</span>
            <FurnitureIcon kind="cube" />
            <span>
              Хілтон-2
              <br />
              3D / AR
            </span>
            <span aria-hidden="true">+</span>
          </Link>
        )}
        <span className="showroomCaption">{t.art}</span>
      </section>
      <section
        className="showroomCategories"
        aria-label={locale === "uk" ? "Колекції" : "Collections"}
      >
        {(["sofa", "corner", "bed"] as const).map((kind, i) => (
          <Link
            key={kind}
            href={`/${locale}/catalog?category=${["straight-sofas", "corner-sofas", "beds"][i]}`}
          >
            <FurnitureIcon kind={kind} />
            <span>{t.categories[i]}</span>
            <span className="categoryArrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </section>
      <section className="homeCollection">
        <div className="homeSectionHeading">
          <h2>{t.collection}</h2>
          <Link href={`/${locale}/catalog`}>
            {t.all} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="homeProducts">
          {selected.map((p) => {
            const current = live.find((item) => item.slug === p.slug);
            return (
              <article className="homeProduct" key={p.slug}>
                <Link href={`/${locale}/product/${p.slug}`}>
                  <div className="homeProductPhoto">
                    <img
                      src={sourcePhoto(p.slug)!}
                      alt={locale === "uk" ? p.uk : p.en}
                      width="600"
                      height="400"
                      loading="lazy"
                    />
                  </div>
                  <h3>{locale === "uk" ? p.uk : p.en}</h3>
                  <p>
                    {current?.available && current.price_minor != null
                      ? money(current.price_minor, locale, current.currency)
                      : t.price}
                  </p>
                </Link>
                {p.slug === "hilton-2" && hiltonModel && (
                  <Link
                    className="home3d"
                    href={`/${locale}/product/${p.slug}#matrix3d-title`}
                    aria-label={`${locale === "uk" ? p.uk : p.en}: 3D`}
                  >
                    <FurnitureIcon kind="cube" />
                    <span>3D</span>
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section className="homeStory" id="about">
        <span className="eyebrow">MATRIX · MADE FOR HOME</span>
        <h2>{t.about}</h2>
        <p>{t.story}</p>
        <Link href={`/${locale}/catalog`}>{t.cta} →</Link>
      </section>
    </main>
  );
}
