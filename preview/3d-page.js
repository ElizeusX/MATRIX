"use strict";

// MATRIX mobile concept preview: each known-size product gets a SEPARATE
// original GLB file generated from recorded width and depth. Shapes / height
// are illustrative, not reconstructed from photos. AR intentionally disabled.
const params = new URLSearchParams(location.search);
const requested = params.get("product") || "hilton-2";
const products = Array.isArray(window.MATRIX_CATALOG) ? window.MATRIX_CATALOG : [];
const product = products.find(p => p.slug === requested &&
  Number.isInteger(p.width) && Number.isInteger(p.depth) &&
  p.width >= 300 && p.depth >= 300 && p.width <= 8000 && p.depth <= 6000);
const fallback = products.find(p => p.slug === "hilton-2" && p.width && p.depth);
const chosen = product || (params.has("product") ? null : fallback) || null;
const $ = id => document.getElementById(id);
let lang = "uk";
try { if(localStorage.getItem("matrix-static-preview-locale")==="en")lang="en" }catch{}

const i18n={
 uk:{
  back:"Каталог",home:"Головна",pre:"3D-ПРЕВʼЮ · ОКРЕМІ КОНЦЕПТИ ТОВАРІВ · AR ВИМКНЕНО",
  secondary:"Подивіться в 3D.",description:"Обертайте модель пальцем, наближайте двома та розглядайте її з різних сторін. Це персональна концептуальна модель вибраного товару, а не точна 3D-реконструкція.",
  specs:"Розміри за каталогом",width:"Ширина",depth:"Глибина",height:"Висота",
  verified:"ЗА КАТАЛОГОМ",unverified:"УМОВНА",
  warning:"Це спрощений 3D-концепт конкретної моделі. Ширина та глибина відповідають запису в каталозі, але конструкція, тканини, подушки та висота 85 см НЕ підтверджені виробником. Не використовуйте для точних замірів.",
  arTitle:"AR поки недоступне",arDesc:"Потрібні підтверджена висота, реальна 3D-реконструкція і перевірені GLB/USDZ. Не використовуйте чернетку для вимірювання кімнати.",
  arButton:"Після перевірки моделі",gesture:"↻ Обертайте одним пальцем · Масштабуйте двома",
  reset:"Скинути",fullscreen:"На весь екран",exitFull:"Згорнути",
  loading:"Завантаження 3D-моделі",loadingSmall:"Підготовка моделі вибраного товару…",
  failTitle:"Не вдалося відкрити 3D",failDesc:"Потрібен браузер із WebGL 2 та доступ до інтернету. Спробуйте Safari або Chrome з увімкненим апаратним прискоренням.",
  retry:"Повторити завантаження",nextTitle:"Ваш простір —",nextTitleEm:"наступний крок.",
  nextText:"Ми поступово готуємо точні 3D-моделі MATRIX для AR на iPhone й Android. Навіть після запуску AR-розміри залишатимуться приблизними — перед покупкою виміряйте кімнату рулеткою.",
  browse:"Повернутися до каталогу",footer:"3D-концепти · без замовлень та AR",
  reference:"Фото з каталогу виробника · 3D-форма не реконструйована з фото",
  headingUnavailable:"Товар із підтвердженими габаритами не знайдено",
  titleFallback:"Концепт"
 },
 en:{
  back:"Catalog",home:"Home",pre:"3D PREVIEW · INDIVIDUAL PRODUCT CONCEPTS · AR OFF",
  secondary:"Explore it in 3D.",description:"Rotate with one finger and zoom with two. Each product with usable dimensions has its own concept model, but this is not an accurate photogrammetry reconstruction.",
  specs:"Catalog dimensions",width:"Width",depth:"Depth",height:"Height",
  verified:"CATALOG VALUE",unverified:"ASSUMED",
  warning:"This is a simplified 3D concept for the selected model. Width and depth follow the catalog, but construction, fabric, cushions and 85cm height are NOT manufacturer-verified. Not suitable for precise room measuring.",
  arTitle:"AR is not available yet",arDesc:"AR requires a verified height, an authentic reconstruction and reviewed GLB/USDZ assets. Do not use this draft to measure your room.",
  arButton:"Available after model verification",gesture:"↻ Drag to rotate · Pinch to zoom",
  reset:"Reset",fullscreen:"Full screen",exitFull:"Exit full screen",
  loading:"Loading 3D model",loadingSmall:"Preparing your selected product concept…",
  failTitle:"Could not open 3D",failDesc:"A browser with WebGL 2 and an internet connection are required. Try Safari or Chrome with hardware acceleration enabled.",
  retry:"Try again",nextTitle:"Your room —",nextTitleEm:"the next step.",
  nextText:"We are preparing accurate 3D furniture models for compatible iPhones and Android devices. Even with AR, measurements are approximate; use a tape measure before buying.",
  browse:"Back to catalog",footer:"3D concepts · no purchases or AR",
  reference:"Photo from manufacturer catalog · 3D geometry is not photo-reconstructed",
  headingUnavailable:"No suitable product dimensions found",
  titleFallback:"Concept"
 }
};
const pilot = chosen?.slug === "hilton-2";
const pilotCopy = {
 uk: {pre:"ХІЛТОН-2 · ЧЕРНЕТКА ЗА ФОТО · AR ВИМКНЕНО",description:"Обертайте диван і наближайте деталі. Форма опрацьована за фотографіями виробника, але пропорції ще не перевірені за кресленнями.",warning:"Чернетка за фото: ширина 280 см, глибина 180 см. Висота виробу невідома; вертикальні пропорції моделі умовні. Тканина — візуальна імітація. Не використовуйте для замірів або замовлення обивки.",unverified:"НЕ ПІДТВЕРДЖЕНА",reference:"Фото виробника · синя конфігурація з оттоманкою ліворуч. Порівняйте з чернеткою.",arButton:"Переглянути у своїй кімнаті",footer:"Хілтон-2 · чернетка за фото · AR вимкнено"},
 en: {pre:"HILTON-2 · PHOTO-GUIDED DRAFT · AR OFF",description:"Rotate the sofa and zoom into details. Shapes follow manufacturer photographs; proportions still need drawing-based review.",warning:"Photo-guided draft: width 280 cm, depth 180 cm. Product height is unknown; vertical proportions are provisional. Fabric is an appearance study. Do not use for measuring or selecting upholstery.",unverified:"UNCONFIRMED",reference:"Manufacturer photo · blue left-chaise configuration. Compare with the draft.",arButton:"View in your room",footer:"Hilton-2 · photo-guided draft · AR off"}
};
const text = key => (pilot && pilotCopy[lang][key]) || i18n[lang][key];
const name = () => chosen ? (lang==="uk"?chosen.uk:(chosen.en||chosen.uk)) : text("headingUnavailable");

function setContent(){
 document.documentElement.lang=lang;
 document.title=name()+" · MATRIX 3D";
 $("heading-primary").textContent=name()+".";
 $("crumb-product").textContent=name();
 $("heading-secondary").textContent=text("secondary");
 $("intro-description").textContent=text("description");
 $("specs-heading").textContent=text("specs");
 for(const [id,key] of [["back-label","back"],["crumb-home","home"],["announcement","pre"],
  ["width-label","width"],["depth-label","depth"],["height-label","height"],
  ["verified-width","verified"],["verified-depth","verified"],["unverified-height","unverified"],
  ["warning-description","warning"],["ar-title","arTitle"],["ar-description","arDesc"],
  ["ar-button-label","arButton"],["gesture-hint","gesture"],["reset-label","reset"],
  ["loading-title","loading"],["loading-subtitle","loadingSmall"],["browse-label","browse"],
  ["footer-note","footer"],["reference-note","reference"]]){
  const el=$(id);if(el)el.textContent=text(key);
 }
 $("fullscreen-label").textContent=document.fullscreenElement?text("exitFull"):text("fullscreen");
 $("details-heading").replaceChildren(document.createTextNode(text("nextTitle")),document.createElement("br"));
 const em=document.createElement("em");em.textContent=text("nextTitleEm");$("details-heading").append(em);
 $("details-text").textContent=text("nextText");
 $("switch-lang").innerHTML=lang==="uk"?"UA <span>/ EN</span>":"EN <span>/ UA</span>";
 if(chosen){
  $("measure-width").textContent=(chosen.width/10).toLocaleString(lang==="uk"?"uk-UA":"en-US");
  $("measure-depth").textContent=(chosen.depth/10).toLocaleString(lang==="uk"?"uk-UA":"en-US");
  $("reference-photo").src=chosen.image;
  $("reference-photo").alt=name()+" — MATRIX";
  $("measure-height").textContent=pilot?"—":"85";
 }
}
$("switch-lang").addEventListener("click",()=>{
 lang=lang==="uk"?"en":"uk";
 try{localStorage.setItem("matrix-static-preview-locale",lang)}catch{}
 setContent();renderApproval();
});

const modelPath = pilot ? "models/hilton-2-draft.glb" : chosen ? "models/"+encodeURIComponent(chosen.slug)+"-concept.glb" : null;
let modelNode = null;
let manifest=null;
let measuredSize=null;
const policy=window.MATRIX_AR_POLICY;
let libraryLoad = null;
let ready = false;
let isLoading = false;
let loadSequence = 0;

function ensureLibrary(){
 if(customElements.get("model-viewer"))return Promise.resolve();
 if(!libraryLoad){
  libraryLoad=new Promise((resolve,reject)=>{
   const script=document.createElement("script");
   script.type="module";
   script.src="https://unpkg.com/@google/model-viewer@4.4.0/dist/model-viewer.min.js";
   script.onload=()=>customElements.whenDefined("model-viewer").then(resolve,reject);
   script.onerror=()=>reject(new Error("3D viewer library unavailable"));
   document.head.append(script);
  });
 }
 return libraryLoad;
}
function failViewer(){
 measuredSize=null;$("ar-disabled").disabled=true;
 isLoading=false;ready=false;modelNode=null;
 $("reset-view").disabled=true;
 $("fullscreen-view").disabled=true;
 const box=document.createElement("div");box.className="model-failure";
 const title=document.createElement("strong");title.textContent=text("failTitle");
 const note=document.createElement("p");note.textContent=text("failDesc");
 const retry=document.createElement("button");retry.type="button";retry.textContent=text("retry");
 retry.addEventListener("click",()=>{libraryLoad=null;void openViewer()});
 box.append(title,note,retry);$("model-slot").replaceChildren(box);
}
function supports3D(){
 try {
  const gl=document.createElement("canvas").getContext("webgl2");
  if(!gl)return false;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
 }catch{return false}
}
async function openViewer(){
 if(!chosen || isLoading)return;
 if(!supports3D()){failViewer();return;}
 isLoading=true;ready=false;
 const sequence=++loadSequence;
 const loading=$("loading-message");
 if(loading){$("model-slot").replaceChildren(loading);$("loading-title").textContent=text("loading")}
 else{
  const box=document.createElement("div");box.className="loading";
  const spin=document.createElement("span");spin.className="spinner";spin.setAttribute("aria-hidden","true");
  const title=document.createElement("strong");title.textContent=text("loading");
  box.append(spin,title);$("model-slot").replaceChildren(box);
 }
 try{
  try {
   const response=await fetch("model-manifests/"+encodeURIComponent(chosen.slug)+".json",{cache:"no-store"});
   const candidate=response.ok?await response.json():null;
   manifest=candidate?.slug===chosen.slug?candidate:null;
  }catch{manifest=null;}
  await ensureLibrary();
  if(sequence!==loadSequence)return;
  const viewer=document.createElement("model-viewer");
  viewer.setAttribute("src",policy.approved(manifest)?manifest.glb_url:modelPath);
  viewer.setAttribute("alt",(pilot?"Photo-guided draft of ":"Concept of ")+chosen.uk+"; height unverified; no AR");
  viewer.setAttribute("camera-controls","");
  viewer.setAttribute("interaction-prompt","auto");
  viewer.setAttribute("shadow-intensity","0.8");
  viewer.setAttribute("exposure","1");
  viewer.setAttribute("camera-orbit","-25deg 75deg auto");
  viewer.setAttribute("field-of-view","32deg");
  viewer.setAttribute("ar-modes","scene-viewer quick-look");
  // No ar attribute: compatible phones cannot launch this draft.
  // AR, Quick Look, WebXR are intentionally NOT activated for these drafts.
  const hiddenAR=document.createElement("button");hiddenAR.slot="ar-button";hiddenAR.hidden=true;viewer.append(hiddenAR);
  viewer.addEventListener("ar-status",event=>{
   if(event.detail?.status==="failed"){
    $("ar-description").textContent=lang==="uk"?"AR недоступне на цьому пристрої. Продовжуйте перегляд у 3D.":"AR unavailable on this device. Continue in 3D.";
   }
  });
  viewer.addEventListener("load",async()=>{
   if(sequence!==loadSequence)return;
   isLoading=false;ready=true;modelNode=viewer;
   $("reset-view").disabled=false;$("fullscreen-view").disabled=false;
   measuredSize=viewer.getDimensions();
   if(policy.approved(manifest)&&!policy.matches(manifest,measuredSize)){
    $("warning-description").textContent=lang==="uk"?"Габарити файлу не відповідають затвердженим даним. AR заблоковано.":"File dimensions differ from approved data. AR blocked.";
    return;
   }
   if(policy.eligible(manifest,measuredSize)){
    viewer.setAttribute("ios-src",manifest.usdz_url);
    viewer.setAttribute("ar-scale","fixed");viewer.setAttribute("ar-placement","floor");
    viewer.setAttribute("ar","");
    await viewer.updateComplete;
    $("ar-disabled").disabled=!viewer.canActivateAR;
    renderApproval();
   }
  },{once:true});
  viewer.addEventListener("error",()=>{if(sequence===loadSequence)failViewer()},{once:true});
  $("model-slot").replaceChildren(viewer);
 }catch{if(sequence===loadSequence)failViewer()}
}
function renderApproval(){
 if(!policy.eligible(manifest,measuredSize))return;
 $("measure-height").textContent=(manifest.height_mm/10).toLocaleString();
 $("measure-width").textContent=(manifest.width_mm/10).toLocaleString();
 $("measure-depth").textContent=(manifest.depth_mm/10).toLocaleString();
 $("unverified-height").textContent=text("verified");
 $("viewer-tag").textContent=lang==="uk"?"МОДЕЛЬ ЗАТВЕРДЖЕНО":"APPROVED MODEL";
 $("announcement").textContent="MATRIX / 3D & AR";
 $("ar-title").textContent=lang==="uk"?"Переглянути у своїй кімнаті":"View in your room";
 $("ar-description").textContent=modelNode?.canActivateAR?(lang==="uk"?"Наведіть камеру на підлогу. Переміщуйте та повертайте диван жестами.":"Aim at the floor. Move and rotate the sofa with gestures."):(lang==="uk"?"AR не підтримується цим пристроєм. 3D-перегляд доступний.":"This device does not support AR. 3D remains available.");
 $("warning-description").textContent=lang==="uk"?"AR може мати похибки розміщення та масштабу. Перед покупкою перевірте простір рулеткою.":"AR placement and scale can be inaccurate. Measure your room before buying.";
}
$("ar-disabled").addEventListener("click",()=>{
 if(!ready||!modelNode||!policy.eligible(manifest,measuredSize)||!modelNode.canActivateAR)return;
 // Keep native launch within the user's click gesture (Quick Look / Scene Viewer).
 void modelNode.activateAR().catch(()=>{
  $("ar-description").textContent=lang==="uk"?"Не вдалося запустити AR. Продовжуйте перегляд у 3D.":"Could not launch AR. Continue in 3D.";
 });
});
$("reset-view").addEventListener("click",()=>{
 if(!ready||!modelNode)return;
 modelNode.setAttribute("camera-orbit","-25deg 75deg auto");
 modelNode.setAttribute("field-of-view","32deg");
});
$("fullscreen-view").addEventListener("click",()=>{
 if(!ready)return;
 const panel=$("viewer");
 if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
 else if(panel.classList.contains("fullscreen-fallback")){panel.classList.remove("fullscreen-fallback");$("fullscreen-label").textContent=text("fullscreen");}
 else if(panel.requestFullscreen)void panel.requestFullscreen().catch(()=>{panel.classList.add("fullscreen-fallback");$("fullscreen-label").textContent=text("exitFull")});
 else {panel.classList.add("fullscreen-fallback");$("fullscreen-label").textContent=text("exitFull");}
});
document.addEventListener("fullscreenchange",()=>{$("fullscreen-label").textContent=document.fullscreenElement?text("exitFull"):text("fullscreen")});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("viewer").classList.remove("fullscreen-fallback");$("fullscreen-label").textContent=text("fullscreen")}});
setContent();
if(chosen)void openViewer();
else failViewer();
