"use strict";

// Product-specific photo-guided drafts. Missing dimensions remain estimates;
// native AR uses matching GLB/USDZ pairs and explicit estimated-preview policy.
const params = new URLSearchParams(location.search);
const requested = params.get("product") || "hilton-2";
const products = Array.isArray(window.MATRIX_CATALOG) ? window.MATRIX_CATALOG : [];
const product = products.find(p => p.slug === requested);
const fallback = products.find(p => p.slug === "hilton-2" && p.width && p.depth);
const chosen = product || (params.has("product") ? null : fallback) || null;
const $ = id => document.getElementById(id);
let lang = "uk";
try { if(localStorage.getItem("matrix-static-preview-locale")==="en")lang="en" }catch{}

const i18n={
 uk:{
  back:"Каталог",home:"Головна",pre:"3D ЗА ФОТО · МОДЕЛЬ ДЛЯ ОГЛЯДУ",
  secondary:"Подивіться в 3D.",description:"Обертайте модель пальцем, наближайте двома та розглядайте її з різних сторін. Форма, подушки та деталі опрацьовані за фото вибраного товару. Пропорції потребують перевірки.",
  specs:"Розміри за каталогом",width:"Ширина",depth:"Глибина",height:"Висота",
  verified:"ЗА КАТАЛОГОМ",unverified:"УМОВНА",
  warning:"Це спрощений 3D-концепт конкретної моделі. Ширина та глибина відповідають запису в каталозі, але конструкція, тканини, подушки та висота НЕ підтверджені виробником. Не використовуйте для точних замірів.",
  arTitle:"AR поки недоступне",arDesc:"Потрібні підтверджена висота, реальна 3D-реконструкція і перевірені GLB/USDZ. Не використовуйте чернетку для вимірювання кімнати.",
  arButton:"Після перевірки моделі",gesture:"↻ Обертайте одним пальцем · Масштабуйте двома",
  reset:"Скинути",fullscreen:"На весь екран",exitFull:"Згорнути",
  loading:"Завантаження 3D-моделі",loadingSmall:"Підготовка моделі вибраного товару…",
  failTitle:"Не вдалося відкрити 3D",failDesc:"Потрібен браузер із WebGL 2 та доступ до інтернету…17612 tokens truncated…mated(m)?m.estimated_height_mm:m.height_mm][i];return positive(v)&&Math.abs(v*1000-expected)<=Math.max(5,expected*.01)});}
 function eligible(m,size){return matches(m,size)&&m.enabled_ar===true&&safeAsset(m.usdz_url,'.usdz');}
 const policy={viewable,approved,estimated,matches,eligible};
 if(typeof module!=='undefined')module.exports=policy;else root.MATRIX_AR_POLICY=policy;
})(typeof window==='undefined'?globalThis:window);

