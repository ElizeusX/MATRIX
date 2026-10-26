"use client";

import {useEffect,useRef,useState} from "react";
import type {FurnitureModel} from "../lib/ar-models";
import {FurnitureIcon} from "./Brand";
import "./furniture-3d.css";

type ViewerElement = HTMLElement & {
 getDimensions?:()=>{x:number;y:number;z:number};
 activateAR?:()=>Promise<void>;
 canActivateAR?:boolean;
 updateComplete?:Promise<boolean>;
};

const copy={
 uk:{
  heading:"Переглянути в 3D",intro:"Обертайте модель, щоб роздивитися меблі з усіх боків.",
  start:"Відкрити 3D",close:"Закрити 3D",loading:"Завантаження 3D-моделі…",
  zoom:"Збільшити",reset:"Скинути вигляд",fullscreen:"На весь екран",exitFullscreen:"Закрити повний екран",
  dimensions:"Габарити",hideDimensions:"Приховати розміри",
  ar:"Переглянути у своїй кімнаті",unavailableAR:"AR недоступне в цьому браузері або на пристрої. 3D-перегляд працює окремо.",
  placement:"У AR наведіть камеру на підлогу та розмістіть меблі. Розміри перевірено за даними виробника.",
  disclaimer:"AR — приблизна візуалізація. Перед покупкою виміряйте кімнату рулеткою. Виявлення зіткнень зі стінами не гарантується.",
  failure:"Не вдалося відкрити 3D. Перевірте інтернет і підтримку WebGL 2 у браузері.",
  badScale:"3D-модель не відповідає підтвердженим габаритам. AR заблоковано до перевірки.",
  status:"Модель має підтверджені габарити."
 },
 en:{
  heading:"View in 3D",intro:"Rotate the model to explore the furniture from every angle.",
  start:"Open 3D",close:"Close 3D",loading:"Loading 3D model…",
  zoom:"Zoom in",reset:"Reset view",fullscreen:"Full screen",exitFullscreen:"Exit full screen",
  dimensions:"Dimensions",hideDimensions:"Hide dimensions",
  ar:"View in your room",unavailableAR:"AR isn't supported by this device or browser. The 3D viewer is still available.",
  placement:"In AR, aim your camera at the floor and position the furniture. Dimensions were verified against manufacturer measurements.",
  disclaimer:"AR positioning is approximate. Check the room with a tape measure before purchasing. Collision detection is not guaranteed.",
  failure:"Could not open 3D. Check your connection and browser WebGL 2 support.",
  badScale:"Rendered model dimensions differ from the verified product data. AR is disabled pending review.",
  status:"The model has confirmed dimensions."
 }
};
const round=(n:number)=>Math.round(n/10);
export default function Furniture3D({model,locale}:{model:FurnitureModel;locale:"uk"|"en"}){
 const draft=model.status==="draft";
 const unknown=draft&&model.dimensions_estimated===true;
 const initialOrbit=draft&&model.camera_orbit&&/^-?\d+deg \d+deg auto$/.test(model.camera_orbit)?model.camera_orbit:"-25deg 75deg auto";
 const width=model.width_mm??(draft?model.estimated_width_mm:0);
 const depth=model.depth_mm??(draft?model.estimated_depth_mm:0);
 const height=model.height_mm??(draft?model.estimated_height_mm:0);
 const t={...copy[locale],...(draft?(locale==="uk"?{
  status:"Чернетка за фото · розміри не підтверджено",
  placement:"Приблизне AR: висота оцінена за пропорціями фото. Геометрія і тканина не затверджені.",
  disclaimer:unknown?"Ширина, глибина та висота невідомі або неоднозначні. Усі розміри моделі приблизні. AR вимкнено.":`Висота виробу невідома: використано приблизно ${Math.round(height/10)} см. Форма і тканина опрацьовані за фото. Не використовуйте AR для точних замірів; уточніть розміри у виробника.`
 }:{
  status:"Photo-guided draft · dimensions unverified",
  placement:"Estimated AR: height follows photo proportions. Geometry and fabric are unverified.",
  disclaimer:unknown?"Width, depth and height are missing or ambiguous. All model dimensions are estimates. AR is disabled.":`Product height is unknown: this preview uses approximately ${Math.round(height/10)} cm. Shape and fabric follow photos. Do not use AR for accurate measurements; confirm dimensions with the manufacturer.`
 }):{})};
 const [open,setOpen]=useState(false);
 const [registered,setRegistered]=useState(false);
 const [ready,setReady]=useState(false);
 const [validatedSource,setValidatedSource]=useState("");
 const [error,setError]=useState("");
 const [badScale,setBadScale]=useState(false);
 const [arSupport,setARSupport]=useState(false);
 const [showDimensions,setShowDimensions]=useState(true);
 const [full,setFull]=useState(false);
 const container=useRef<HTMLDivElement>(null);
 const viewer=useRef<ViewerElement>(null);
 useEffect(()=>{
  if(!open)return;
  let alive=true;
  try {
   const gl=document.createElement("canvas").getContext("webgl2");
   if(!gl){setError(t.failure);return;}
   gl.getExtension("WEBGL_lose_context")?.loseContext();
  }catch{setError(t.failure);return;}
  void import("@google/model-viewer")
   .then(()=>{if(alive)setRegistered(true)})
   .catch(()=>{if(alive)setError(t.failure)});
  return ()=>{alive=false};
 },[open,t.failure]);
 useEffect(()=>{
  if(!registered||!open)return;
  const node=viewer.current;
  if(!node)return;
  const loaded=()=>{
   const size=node.getDimensions?.();
   if(!size||![size.x,size.y,size.z].every(Number.isFinite)){
    setBadScale(true);setError(t.badScale);return;
   }
   const values=[size.x*1000,size.z*1000,size.y*1000];
   const expected=[width,depth,height];
   const matches=values.every((v,i)=>Math.abs(v-expected[i])<=Math.max(5,expected[i]*0.01));
   setBadScale(!matches);
   setError(matches?"":t.badScale);
   setValidatedSource(model.glb_url);
   setReady(true);
   setARSupport(matches && Boolean(node.canActivateAR));
  };
  const arStatus=()=>setARSupport(Boolean(node.canActivateAR));
  const failed=()=>{setReady(false);setARSupport(false);setError(t.failure)};
  node.addEventListener("load",loaded);
  node.addEventListener("ar-status",arStatus);
  node.addEventListener("error",failed);
  return ()=>{node.removeEventListener("load",loaded);node.removeEventListener("ar-status",arStatus);node.removeEventListener("error",failed)};
 },[open,registered,model.glb_url,width,depth,height,t.badScale,t.failure]);
 const arEligible=ready&&validatedSource===model.glb_url&&!badScale&&model.enabled_ar&&!!model.usdz_url&&(!draft||(model.preview_ar&&!unknown&&!!model.height_estimate_source));
 useEffect(()=>{
  const node=viewer.current;let alive=true;
  if(!node||!arEligible){setARSupport(false);return;}
  void Promise.resolve(node.updateComplete).then(()=>{if(alive)setARSupport(Boolean(node.canActivateAR))});
  return ()=>{alive=false};
 },[arEligible]);
 const close=()=>{setOpen(false);setRegistered(false);setReady(false);setARSupport(false);setBadScale(false);setFull(false);setError("")};
 function launchAR(){
  if(!arEligible||!ready||badScale||!model.enabled_ar||!model.usdz_url||!arSupport){
   setError(t.unavailableAR);return;
  }
  // Activation must happen synchronously within the original click gesture.
  void viewer.current?.activateAR?.().catch(()=>setError(t.unavailableAR));
 }
 return <section className="matrix3d" aria-labelledby="matrix3d-title">
  <div className="matrix3d-heading"><div><span className="matrix3d-overline">MATRIX / 3D & AR</span><h2 id="matrix3d-title">{t.heading}</h2><p>{t.intro}</p></div><span className="matrix3d-verified">{t.status}</span></div>
  {!open?<button className="matrix3d-primary" type="button" onClick={()=>setOpen(true)}>{t.start}<span aria-hidden="true">↗</span></button>:
  <div ref={container} className={`matrix3d-stage ${full?"matrix3d-full":""}`}>
   <div className="matrix3d-topbar">
    <span className="matrix3d-verified">MATRIX / 3D</span>
    <button type="button" onClick={close} aria-label={t.close}>{t.close}<FurnitureIcon kind="close"/></button>
   </div>
   {!registered&&!error&&<div className="matrix3d-loading" role="status">{t.loading}</div>}
   {registered&&<model-viewer
      ref={viewer}
      src={model.glb_url}
      ios-src={model.enabled_ar?model.usdz_url:undefined}
      alt={locale==="uk"?"Тривимірна модель меблів MATRIX":"3D MATRIX furniture model"}
      ar={arEligible}
      ar-modes="scene-viewer quick-look"
      ar-scale="fixed"
      ar-placement="floor"
      camera-controls={true}
      camera-orbit={initialOrbit}
      field-of-view="35deg"
      interaction-prompt="auto"
      shadow-intensity="0.75"
      exposure="1"
      loading="eager"
   ><button slot="ar-button" hidden aria-hidden="true" tabIndex={-1} /></model-viewer>}
   {ready&&showDimensions&&<div className="matrix3d-measures" aria-label={t.dimensions}>
    <span>↔ {unknown?"≈ ":""}{round(width)} cm</span><span>↗ {unknown?"≈ ":""}{round(depth)} cm</span><span>↕ {draft?"≈ ":""}{round(height)} cm</span>
   </div>}
   {error&&<p className="matrix3d-error" role="alert">{error}</p>}
   <div className="matrix3d-toolbar">
    <button type="button" disabled={!ready} onClick={()=>viewer.current?.setAttribute("field-of-view","24deg")}>{t.zoom}</button>
    <button type="button" disabled={!ready} onClick={()=>{viewer.current?.setAttribute("field-of-view","35deg");viewer.current?.setAttribute("camera-orbit",initialOrbit)}}>{t.reset}</button>
    <button type="button" onClick={()=>setShowDimensions(v=>!v)}>{showDimensions?t.hideDimensions:t.dimensions}</button>
    <button type="button" onClick={()=>setFull(v=>!v)}>{full?t.exitFullscreen:t.fullscreen}</button>
   </div>
   {model.enabled_ar&&model.usdz_url&&<div className="matrix3d-arbar">
    <button type="button" className="matrix3d-arbutton" disabled={!arEligible||!arSupport} onClick={launchAR}>{t.ar} ↗</button>
    {!arSupport&&ready&&<small>{t.unavailableAR}</small>}
   </div>}
  </div>}
  <p className="matrix3d-disclaimer">{t.disclaimer}</p>
 </section>;
}

