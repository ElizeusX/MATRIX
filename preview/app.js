"use strict";

/**
 * MATRIX static design preview.
 * No live catalog API, payments, prices, inventory or checkout.
 * Catalog data and photographs are imported from the public MATRIX site.
 */
const products = Object.freeze(window.MATRIX_CATALOG);

const translations = {
  uk: {
    skip:"До основного вмісту", preview:"Дизайн-превʼю • Ціни та замовлення вимкнено",
    navCollection:"Каталог",nav3D:"3D / AR",catalog3DInfo:"Для кожної моделі доступна 3D-чернетка за фото. Для моделей з шириною та глибиною є приблизне AR. Висоту не підтверджено; пропорції і тканини потребують перевірки.",catalog3DDemo:"Спробувати 3D ↗",navStory:"Філософія",navContact:"Контакти",
    heroEyebrow:"МЕБЛІ З ХАРАКТЕРОМ",heroLine1:"Меблі, що",heroLine2:"пасують вашому стилю",
    heroDescription:"Створюємо простір для комфортного та впевненого життя",
    explore:"Переглянути каталог",heroAside:"Дизайн-превʼю",artNote:"Інтер’єрна візуалізація",
    tickerOne:"СПОКІЙНА ЕСТЕТИКА",tickerTwo:"СТВОРЕНО ДЛЯ ЖИТТЯ",
    collectionTitle:"Знайдіть своє.",collectionIntro:"Дивани та ліжка MATRIX: фотографії, розміри й деталі кожної моделі.",
    catCorner:"Кутові дивани",catStraight:"Прямі дивани",catBeds:"Ліжка",catUnspecified:"Категорія уточнюється",
    productsTitle:"Колекція MATRIX",productsIntro:"Фотографії та характеристики моделей із каталогу виробника.",
    all:"Усі моделі",empty:"Нічого не знайдено. Спробуйте інший запит.",
    catalogFootnote:"Всі товари без підтвердженої ціни. Замовлення не приймаються.",
    storyTitle:"Місце для ваших історій.",
    storyText:"Предмети, з якими проживають щоденні моменти. У цьому превʼю ми показуємо напрям дизайну майбутнього магазину MATRIX — без вигаданих цін і характеристик.",
    storyCTA:"Зв’язатися з нами",contactTitle:"Ваш дім. Ваш MATRIX.",
    contactText:"Потрібна консультація? Зв’яжіться з виробником. Демоверсія не приймає замовлень.",
    footerLine:"Дизайн-превʼю майбутнього магазину",backTop:"Нагору ↑",
    missing:"Ціна й наявність уточнюються. Онлайн-замовлення недоступне.",
    toFavorites:"Додати в обране ♡",removeFavorites:"Прибрати з обраного ♥",
    consult:"Запитати про модель ↗",favoritesTitle:"Обрані моделі",
    favoritesNote:"Список зберігається лише на цьому пристрої. Це не кошик і не замовлення.",
    favoriteEmpty:"Ви ще не додали жодної моделі.",category:"Категорія",
    dimensions:"Габарити",sleepArea:"Спальне місце",mm:"мм",pending:"Уточнюється",
    photoDemo:"Концепт · не фото виробу",details:"Переглянути модель",open3D:"Переглянути в 3D",
    search:"Пошук моделі",menuOpen:"Відкрити меню",menuClose:"Закрити меню",
    close:"Закрити",heart:"Додати в обране",count:"моделей"
  },
  en: {
    skip:"Skip to main content",preview:"Design preview • Prices & ordering disabled",
    navCollection:"Catalog",nav3D:"3D / AR",catalog3DInfo:"Every product has a photo-guided 3D draft. Products with catalog width and depth offer estimated AR. Heights are unconfirmed; proportions and fabrics need review.",catalog3DDemo:"Try 3D ↗",navStory:"Our approach",navContact:"Contact",
    heroEyebrow:"FURNITURE WITH CHARACTER",heroLine1:"Furniture that",heroLine2:"fits your style",
    heroDescription:"Creating space for a comfortable, confident life.",
    explore:"Explore catalog",heroAside:"Design preview",artNote:"Illustrative showroom interior",
    tickerOne:"QUIET AESTHETICS",tickerTwo:"MADE FOR LIVING",
    collectionTitle:"Find your own.",collectionIntro:"Explore MATRIX sofas and beds with product photographs, dimensions and details.",
    catCorner:"Corner sofas",catStraight:"Straight sofas",catBeds:"Beds",catUnspecified:"Category unconfirmed",
    productsTitle:"Product collection",productsIntro:"Product photographs and specifications from the manufacturer’s catalog.",
    all:"All models",empty:"Nothing found. Try a different search.",
    catalogFootnote:"Prices have not been confirmed. Orders are not accepted.",
    storyTitle:"Room for your stories.",
    storyText:"Furniture accompanies everyday moments. This preview shows the direction of MATRIX's future online store, without invented prices or specifications.",
    storyCTA:"Contact us",contactTitle:"Your home. Your MATRIX.",
    contactText:"Need advice? Contact the manufacturer. This demonstration does not accept orders.",
    footerLine:"Preview of the upcoming online store",backTop:"Back to top ↑",
    missing:"Price and availability are pending. Online ordering is disabled.",
    toFavorites:"Add to favorites ♡",removeFavorites:"Remove from favorites ♥",
    consult:"Ask about this model ↗",favoritesTitle:"Saved models",
    favoritesNote:"This list is saved on this device only. It is not a cart or an order.",
    favoriteEmpty:"No saved models yet.",category:"Category",
    dimensions:"Overall dimensions",sleepArea:"Sleeping area",mm:"mm",pending:"Unconfirmed",
    photoDemo:"Concept · not a product photo",details:"View product",open3D:"View in 3D",
    search:"Search models",menuOpen:"Open menu",menuClose:"Close menu",
    close:"Close",heart:"Add to favorites",count:"models"
  }
};

const $ = (selector) => document.querySelector(selector);
const grid = $("#product-grid");
const search = $("#catalog-search");
const dialog = $("#product-dialog");
const savedDialog = $("#favorites-dialog");
const STORAGE_KEY = "matrix-static-preview-favorites-v1";

const state = { locale:"uk", filter:"all", query:"", favorites:new Set(), activeProduct:null };
try {
  const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY)||"[]");
  if(Array.isArray(value))for(const id of value)if(products.some(p=>p.id===id))state.favorites.add(id);
  if(window.localStorage.getItem("matrix-static-preview-locale")==="en")state.locale="en";
} catch { /* private browsing or disabled storage; the preview still works */ }

function t(key){return translations[state.locale][key]||key}
function hasModelPreview(p){
 return typeof p.slug==="string"&&/^[a-z0-9-]+$/.test(p.slug);
}
function getCategory(category){
  return category==="corner-sofas"?t("catCorner"):category==="straight-sofas"?t("catStraight"):category==="beds"?t("catBeds"):t("catUnspecified");
}
function elementsForProduct(p,index){
  const fragment=document.createElement("article");
  fragment.className="product-card";
  const visual=document.createElement("div");
  visual.className="product-visual-wrap";
  const visualButton=document.createElement("button");
  visualButton.type="button";
  visualButton.className="product-art";
  visualButton.dataset.open=p.id;
  visualButton.dataset.tone=String(index%9);
  visualButton.setAttribute("aria-label",t("details")+": "+p[state.locale]);
  const photo=document.createElement("img");
  photo.className="product-photo";
  photo.src=p.image;photo.alt=p[state.locale];photo.loading="lazy";photo.decoding="async";
  visualButton.append(photo);
  const overlay=document.createElement("div");
  overlay.className="product-topline";
  const tag=document.createElement("span");
  tag.className="product-tag";
  tag.textContent="MATRIX / "+String(index+1).padStart(2,"0");
  const fav=document.createElement("button");
  fav.type="button";fav.className="favorite-btn";
  fav.dataset.favorite=p.id;
  fav.setAttribute("aria-label",t("heart")+": "+p[state.locale]);
  fav.setAttribute("aria-pressed",String(state.favorites.has(p.id)));
  if(state.favorites.has(p.id))fav.classList.add("selected");
  fav.innerHTML=window.matrixIcon('heart');
  overlay.append(tag,fav);visual.append(visualButton,overlay);
  const info=document.createElement("div");info.className="product-meta";
  const category=document.createElement("span");category.textContent=getCategory(p.category);
  const headingRow=document.createElement("div");headingRow.className="product-title-row";
  const name=document.createElement("h3");name.textContent=p[state.locale];
  const open=document.createElement("button");open.className="product-open";open.type="button";
  open.dataset.open=p.id;open.setAttribute("aria-label",t("details")+": "+p[state.locale]);
  open.innerHTML=window.matrixIcon("arrow");headingRow.append(name,open);
  const price=document.createElement("p");price.textContent=t("missing");
  info.append(category,headingRow,price);
  if(hasModelPreview(p)){
    const link=document.createElement("a");
    link.className="product-3d-link";
    link.href="3d.html?product="+encodeURIComponent(p.slug);
    link.setAttribute("aria-label",t("open3D")+": "+p[state.locale]);
    const label=document.createElement("span");
    label.textContent=p.slug==="hilton-2"?(state.locale==="uk"?"Переглянути в 3D":"View in 3D"):t("open3D");
    const arrow=document.createElement("span");arrow.innerHTML=window.matrixIcon("cube");arrow.setAttribute("aria-hidden","true");
    link.append(label,arrow);
    info.append(link);
  }
  fragment.append(visual,info);
  return fragment;
}
function drawProducts(){
 for(const tile of document.querySelectorAll("[data-category]")){const active=tile.dataset.category===state.filter;tile.classList.toggle("active",active);tile.setAttribute("aria-pressed",String(active));}
 const q=state.query.trim().toLocaleLowerCase();
 const filtered=products.filter(p=>{
  const categoryMatch=state.filter==="all"||p.category===state.filter;
  return categoryMatch&&(p.uk.toLocaleLowerCase().includes(q)||p.en.toLocaleLowerCase().includes(q));
 });
 grid.replaceChildren(...filtered.map((p,i)=>elementsForProduct(p,i)));
 $("#empty-message").hidden=filtered.length!==0;
 $("#catalog-count").textContent=String(filtered.length).padStart(2,"0")+" "+t("count").toUpperCase();
 for(const filter of document.querySelectorAll("[data-filter]")){
  const active=filter.dataset.filter===state.filter;
  filter.classList.toggle("active",active);
  filter.setAttribute("aria-pressed",String(active));
 }
 updateFavoritesCount();
}
function updateFavoritesCount(){
 const count=$("#favorite-count");
 count.hidden=state.favorites.size===0;
 count.textContent=String(state.favorites.size);
}
function saveFavorites(){
 try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify([...state.favorites]))}catch{}
}
function toggleFavorite(id){
 if(!products.some(p=>p.id===id))return;
 if(state.favorites.has(id))state.favorites.delete(id);
 else state.favorites.add(id);
 saveFavorites();
 drawProducts();
 if(state.activeProduct===id)updateModalFavorite();
 if(savedDialog.open)drawSaved();
}
function updateModalFavorite(){
 const button=$("#dialog-favorite");
 const selected=state.favorites.has(state.activeProduct);
 button.replaceChildren(document.createTextNode((selected?t("removeFavorites"):t("toFavorites")).replace(/[♡♥]/g,"")));button.insertAdjacentHTML("beforeend",window.matrixIcon("heart"));
 button.setAttribute("aria-pressed",String(selected));
}
function specRow(label,value){
 const row=document.createElement("div");row.className="spec-row";
 const left=document.createElement("span");left.textContent=label;
 const right=document.createElement("strong");right.textContent=value;
 row.append(left,right);
 return row;
}

function openProduct(id){
 const p=products.find(x=>x.id===id);
 if(!p)return;
 state.activeProduct=id;
 openProductContents(id);
 dialog.showModal();
 document.body.classList.add("dialog-open");
}
function drawSaved(){
 const list=$("#favorites-list");list.replaceChildren();
 const items=products.filter(p=>state.favorites.has(p.id));
 if(items.length===0){
  const empty=document.createElement("p");empty.className="favorite-note";empty.textContent=t("favoriteEmpty");
  list.append(empty);return;
 }
 for(const p of items){
  const row=document.createElement("div");row.className="favorite-item";
  const name=document.createElement("span");name.textContent=p[state.locale];
  const open=document.createElement("button");open.type="button";open.innerHTML=window.matrixIcon("arrow");open.dataset.savedOpen=p.id;
  const remove=document.createElement("button");remove.type="button";remove.innerHTML=window.matrixIcon("close");
  remove.dataset.savedRemove=p.id;remove.setAttribute("aria-label",t("removeFavorites")+": "+p[state.locale]);
  row.append(name,open,remove);list.append(row);
 }
}
function updateLanguage(){
 document.documentElement.lang=state.locale;
 const current=$("#language-current");const other=$("#language-other");
 current.textContent=state.locale==="uk"?"UA":"EN";
 other.textContent=state.locale==="uk"?"EN":"UA";
 for(const el of document.querySelectorAll("[data-i18n]")){
  const key=el.dataset.i18n;
  if(key==="storyTitle"||key==="contactTitle"){
   const text=t(key).split(" ");
   if(key==="contactTitle"){
    el.replaceChildren(document.createTextNode(state.locale==="uk"?"Ваш дім.":"Your home."),document.createElement("br"));
    const em=document.createElement("em");em.textContent=state.locale==="uk"?"Ваш MATRIX.":"Your MATRIX.";el.append(em);
   }else {
    el.replaceChildren(document.createTextNode(state.locale==="uk"?"Місце для ":"Room for "));
    const em=document.createElement("em");em.textContent=state.locale==="uk"?"ваших історій.":"your stories.";el.append(em);
   }
  }else {el.textContent=t(key).replace(/[↗♡♥]/g,"").trim();if(["consult","toFavorites","catalog3DDemo"].includes(key))el.insertAdjacentHTML("beforeend",window.matrixIcon(key==="toFavorites"?"heart":key==="catalog3DDemo"?"cube":"arrow"));}
 }
 search.placeholder=t("search");search.setAttribute("aria-label",t("search"));
 $("#menu-toggle").setAttribute("aria-label",t($("#main-nav").classList.contains("open")?"menuClose":"menuOpen"));
 $("#favorites-trigger").setAttribute("aria-label",t("favoritesTitle"));
 $("#dialog-close").setAttribute("aria-label",t("close"));
 $("#favorites-close").setAttribute("aria-label",t("close"));
 drawProducts();drawSaved();
 if(dialog.open&&state.activeProduct)openProductContents(state.activeProduct);
}
function openProductContents(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 $("#dialog-title").textContent=p[state.locale];
 $("#dialog-category").textContent=getCategory(p.category);
 $("#dialog-specs").replaceChildren(
  specRow(t("category"),getCategory(p.category)),
  specRow(t("dimensions"),p.dimensions?`${p.dimensions} ${t("mm")}`:t("pending")),
  specRow(t("sleepArea"),p.sleepingArea?`${p.sleepingArea} ${t("mm")}`:t("pending"))
 );
 const conceptLink=$("#dialog-3d-link");
 conceptLink.hidden=!hasModelPreview(p);
 if(hasModelPreview(p)){
  conceptLink.href="3d.html?product="+encodeURIComponent(p.slug);
  conceptLink.textContent=(p.slug==="hilton-2"?(state.locale==="uk"?"Переглянути в 3D":"View in 3D"):t("open3D"));conceptLink.insertAdjacentHTML("beforeend",window.matrixIcon("cube"));
 }
 const ar=$("#dialog-ar");const arReason=$("#dialog-ar-reason");
 const hasCatalogSize=Number.isInteger(p.width)&&Number.isInteger(p.depth)&&p.width>=300&&p.depth>=300&&p.width<=8000&&p.depth<=6000;
 ar.hidden=arReason.hidden=false;
 ar.disabled=!hasCatalogSize;
 ar.onclick=()=>{location.href="3d.html?product="+encodeURIComponent(p.slug)+"#viewer"};
 ar.textContent=state.locale==="uk"?"Переглянути у своїй кімнаті":"View in your room";
 arReason.textContent=hasCatalogSize?(state.locale==="uk"?"Приблизне AR: висоту не підтверджено. Оцінку та застереження показано у 3D-перегляді.":"Estimated AR: height is unconfirmed. The estimate and limitations are shown in the 3D viewer."):(state.locale==="uk"?"AR недоступне: ширина та глибина потребують уточнення. 3D-перегляд доступний.":"AR unavailable: width and depth need confirmation. 3D viewing is available.");
 const description=$("#dialog-description");description.textContent=p.description;description.lang="uk";description.hidden=!p.description;
 const note=$("#dialog-source-note");note.hidden=!p.flags.length;
 note.textContent=state.locale==="uk"?"Варіанти та неоднозначні дані наведено як у джерелі. Уточніть характеристики у виробника.":"Variants and ambiguous specifications are shown as supplied. Confirm details with the manufacturer.";
 const gallery=$("#dialog-gallery");gallery.replaceChildren();
 const photo=document.createElement("img");photo.src=p.image;photo.alt=p[state.locale];photo.className="dialog-main-photo";
 gallery.append(photo);
 const thumbs=document.createElement("div");thumbs.className="gallery-thumbs";
 for(const [index,url] of [p.image,...p.images].entries()){
  const button=document.createElement("button");button.type="button";
  button.setAttribute("aria-label",(state.locale==="uk"?"Фото ":"Photo ")+(index+1));
  const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";
  button.append(img);button.addEventListener("click",()=>{photo.src=url});thumbs.append(button);
 }
 gallery.append(thumbs);
 $("#dialog-source").href=p.sourceUrl;$("#dialog-source").textContent=state.locale==="uk"?"Модель на сайті виробника ↗":"View manufacturer’s page ↗";
 $("#dialog-contact").href="mailto:matrix-mebli@ukr.net?subject="+encodeURIComponent("MATRIX: "+p.uk);
 updateModalFavorite();
}
function setFilter(value,scroll=false){
 state.filter=value;
 drawProducts();
 if(scroll)$("#products").scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
}
function setMenu(isOpen){
 $("#main-nav").classList.toggle("open",isOpen);
 $("#menu-toggle").setAttribute("aria-expanded",String(isOpen));
 $("#menu-toggle").setAttribute("aria-label",t(isOpen?"menuClose":"menuOpen"));
}
$("#menu-toggle").addEventListener("click",()=>setMenu(!$("#main-nav").classList.contains("open")));
for(const link of document.querySelectorAll(".main-nav a"))link.addEventListener("click",()=>setMenu(false));
$("#lang-switch").addEventListener("click",()=>{
 state.locale=state.locale==="uk"?"en":"uk";
 try{window.localStorage.setItem("matrix-static-preview-locale",state.locale)}catch{}
 updateLanguage();
});
search.addEventListener("input",()=>{state.query=search.value;drawProducts()});
for(const filter of document.querySelectorAll("[data-filter]"))filter.addEventListener("click",()=>setFilter(filter.dataset.filter));
for(const tile of document.querySelectorAll("[data-category]"))tile.addEventListener("click",()=>setFilter(tile.dataset.category,true));
grid.addEventListener("click",e=>{
 const clicked=e.target.closest("button");
 if(!clicked)return;
 if(clicked.dataset.favorite)toggleFavorite(clicked.dataset.favorite);
 if(clicked.dataset.open)openProduct(clicked.dataset.open);
});
$("#dialog-favorite").addEventListener("click",()=>{if(state.activeProduct)toggleFavorite(state.activeProduct)});
$("#favorites-trigger").addEventListener("click",()=>{drawSaved();savedDialog.showModal();document.body.classList.add("dialog-open")});
$("#favorites-list").addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.savedRemove)toggleFavorite(b.dataset.savedRemove);
 if(b.dataset.savedOpen){savedDialog.close();openProduct(b.dataset.savedOpen)}
});
$("#dialog-close").addEventListener("click",()=>dialog.close());
$("#favorites-close").addEventListener("click",()=>savedDialog.close());
for(const d of [dialog,savedDialog]){
 d.addEventListener("close",()=>{
   if(!dialog.open&&!savedDialog.open)document.body.classList.remove("dialog-open");
 });
 d.addEventListener("click",e=>{if(e.target===d)d.close()});
}
updateLanguage();


