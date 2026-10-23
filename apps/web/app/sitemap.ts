import type { MetadataRoute } from "next";
export default function sitemap():MetadataRoute.Sitemap {
 const base=process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";
 const slugs=["hilton-2","molly","eldorado","smart"];
 return ["uk","en"].flatMap(locale=>[
 {url:`${base}/${locale}`,changeFrequency:"monthly" as const,priority:1},
 {url:`${base}/${locale}/catalog`,changeFrequency:"weekly" as const,priority:.8},
 ...slugs.map(slug=>({url:`${base}/${locale}/product/${slug}`,changeFrequency:"monthly" as const,priority:.6}))
 ]);
}
