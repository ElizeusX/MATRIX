"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import "./models.css";
type Model ={
 id:string;slug:string;version:number;status:string;
 width_mm:number|null;depth_mm:number|null;height_mm:number|null;
 has_glb:boolean;has_usdz:boolean;glb_url?:string;usdz_url?:string;
 geometry_verified:boolean;rights_confirmed:boolean;enabled_3d:boolean;enabled_ar:boolean;notes:string;
};
const statusText:Record<string,string>={
 draft:"Чернетка",processing:"Обробка",needs_review:"Очікує перевірки",
 approved:"Затверджено",failed:"Помилка"
};
export default function ModelManager(){
 const [slug,setSlug]=useState("hilton-2");
 const [models,setModels]=useState<Model[]>([]);
 const [isLogged,setIsLogged]=useState<boolean|null>(null);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [notes,setNotes]=useState("");
 const [reviewNotes,setReviewNotes]=useState("");
 const [rights,setRights]=useState(false);
 const [geometry,setGeometry]=useState(false);
 const [usdzChecked,setUSDZChecked]=useState(false);
 const [enableAR,setEnableAR]=useState(false);
 const [width,setWidth]=useState("");
 const [depth,setDepth]=useState("");
 const [height,setHeight]=useState("");
 const [confirmedDimensions,setConfirmedDimensions]=useState(false);
 const [file,setFile]=useState<File|null>(null);
 const [photoFile,setPhotoFile]=useState<File|null>(null);
 const [photoNote,setPhotoNote]=useState("");
 const [photoRights,setPhotoRights]=useState(false);
 const [photoList,setPhotoList]=useState<{id:string;notes:string;width:number;height:number}[]>([]);
 const [photoModelID,setPhotoModelID]=useState<string|null>(null);
 const [format,setFormat]=useState<"glb"|"usdz">("glb");
 const [preview,setPreview]=useState<string|null>(null);
 const api=async(path:string,options:RequestInit={})=>{
  const headers=options.body instanceof FormData?undefined:{"Content-Type":"application/json"};
  const res=await fetch("/api/v1/admin/"+path,{
   ...options,credentials:"same-origin",cache:"no-store",headers:{...headers,...options.headers}
  });
  const body=await res.json().catch(()=>({error:res.statusText}));
  if(res.status===401){setIsLogged(false);throw Error("Для керування моделями увійдіть до адмін-панелі.")}
  if(!res.ok)throw Error(body.error||"Запит не виконано");
  return body;
 };
 const load=useCallback(async()=>{
  if(!/^[a-z0-9-]{2,120}$/.test(slug))return;
  try{
   const data=await api("models?slug="+encodeURIComponent(slug));
   setModels(data.items||[]);setIsLogged(true);
  }catch(e){setNotice(String(e))}
 },[slug]);
 useEffect(()=>{void load()},[load]);
 async function action(work:()=>Promise<unknown>,success:string){
  setNotice("");setBusy(true);
  try{await work();setNotice(success);await load()}catch(e){setNotice(String(e))}finally{setBusy(false)}
 }
 async function setDimensions(){
  if(!confirmedDimensions)throw Error("Підтвердіть дані виробника.");
  const parse=(v:string)=>v.trim()?Math.round(Number(v)):null;
  await api("products/"+encodeURIComponent(slug)+"/dimensions",{
   method:"POST",body:JSON.stringify({width_mm:parse(width),depth_mm:parse(depth),height_mm:parse(height)})
  });
 }
 async function upload(id:string){
  if(!file)throw Error("Оберіть GLB або USDZ файл");
  const form=new FormData();form.set("model",file);
  return api("models/"+id+"/files/"+format,{method:"POST",body:form});
 }
 async function uploadPhoto(id:string){
  if(!photoFile||!photoRights)throw Error("Оберіть фото та підтвердіть права.");
  const form=new FormData();
  form.set("photo",photoFile);form.set("source_notes",photoNote);form.set("rights_confirmed","true");
  await api("models/"+id+"/photos",{method:"POST",body:form});
  const result=await api("models/"+id+"/photos");
  setPhotoList(result.items||[]);setPhotoModelID(id);setPhotoFile(null);
 }
 async function showPhotos(id:string){
  const result=await api("models/"+id+"/photos");
  setPhotoList(result.items||[]);setPhotoModelID(id);
 }
 async function review(id:string,decision:"approve"|"reject"|"disable"){
  await api("models/"+id+"/review",{method:"POST",body:JSON.stringify({
   action:decision,rights_confirmed:rights,geometry_confirmed:geometry,
   usdz_scale_confirmed:usdzChecked,enable_ar:enableAR,notes:reviewNotes
  })});
 }
 if(isLogged===false)return <main className="modelAdmin"><Link href="/admin">← MATRIX / ADMIN</Link><h1>3D / AR</h1><p role="alert">Потрібна авторизована сесія адміністратора. <Link href="/admin">Увійти →</Link></p></main>;
 return <main className="modelAdmin">
  <header className="modelAdminHeader"><Link href="/admin">← Адміністрування</Link><span>MATRIX / 3D ASSET MANAGEMENT</span></header>
  <div className="modelAdminIntro"><div className="overline">3D + AUGMENTED REALITY</div><h1>3D / AR моделі</h1><p>Завантажуйте готові GLB і USDZ, перевіряйте розміри та затверджуйте модель перед публікацією. Чернетки ніколи не доступні покупцям.</p></div>
  {notice&&<p role="status" className="modelNotice">{notice}</p>}
  <section className="modelPanel"><h2>01 · Оберіть товар</h2>
   <div className="modelRow"><label>Slug товару<input value={slug} onChange={e=>{setSlug(e.target.value.toLowerCase())}} placeholder="hilton-2"/></label><button disabled={busy} onClick={()=>void load()}>Знайти моделі</button></div>
   <p className="modelHelp">Для першого тесту: <strong>hilton-2</strong>. Висоту Хілтон-2 на сайті виробника не підтверджено — не вводьте її навмання.</p>
  </section>
  <section className="modelPanel"><h2>02 · Підтверджені фізичні габарити</h2>
   <div className="modelFormGrid"><label>Ширина, мм<input inputMode="numeric" type="number" min="50" max="12000" value={width} onChange={e=>setWidth(e.target.value)} placeholder="2800"/></label>
   <label>Глибина, мм<input inputMode="numeric" type="number" min="50" max="12000" value={depth} onChange={e=>setDepth(e.target.value)} placeholder="1800"/></label>
   <label>Висота, мм<input inputMode="numeric" type="number" min="50" max="12000" value={height} onChange={e=>setHeight(e.target.value)} placeholder="Потрібен замір"/></label></div>
   <label className="modelCheck"><input type="checkbox" checked={confirmedDimensions} onChange={e=>setConfirmedDimensions(e.target.checked)}/> Підтверджую, що розміри отримані від виробника або перевірені фізично</label>
   <button disabled={busy||!confirmedDimensions} onClick={()=>void action(setDimensions,"Розміри збережено. Попередні затвердження 3D скинуто.")}>Зберегти розміри</button>
  </section>
  <section className="modelPanel"><h2>03 · Нова версія моделі</h2>
   <label>Опис джерел фотографій / прав / методів реконструкції<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Джерело, ракурси, автор, ліцензія…"/></label>
   <button disabled={busy} onClick={()=>void action(()=>api("models",{method:"POST",body:JSON.stringify({slug,notes})}),"Нову чернетку створено. Завантажте GLB.")}>Створити чернетку</button>
  </section>
  <section className="modelPanel"><h2>04 · Версії</h2>
   {models.length===0?<p>Для цього товару немає 3D-моделей.</p>:models.map(m=><div key={m.id} className="modelVersion">
    <div className="modelVersionTop"><div><strong>Версія {m.version}</strong><span className="modelStatus">{statusText[m.status]||m.status}</span></div><small>{m.id}</small></div>
    <div className="modelMetrics"><span>GLB: {m.has_glb?"✓":"—"}</span><span>USDZ: {m.has_usdz?"✓":"—"}</span><span>{m.width_mm??"?"} × {m.depth_mm??"?"} × {m.height_mm??"?"} мм</span><span>AR: {m.enabled_ar?"активне":"вимкнено"}</span></div>
    {m.has_glb&&<div className="modelPreviewControls"><button onClick={()=>setPreview(preview===m.id?null:m.id)}> {preview===m.id?"Закрити прев'ю":"Переглянути GLB"}</button></div>}
    {preview===m.id&&m.glb_url&&<DraftViewer url={m.glb_url}/>}
    
    {m.status!=="approved"&&<div className="modelUploadPhotos">
     <h3>Фотографії для подальшої реконструкції</h3>
     <p>Оригінали залишаються приватними. Для обробки у photogrammetry потрібні ракурси з різних боків і зовнішнє GPU-середовище.</p>
     <label>Походження фото та підтвердження прав<textarea rows={2} maxLength={1000} value={photoNote} onChange={e=>setPhotoNote(e.target.value)} placeholder="Автор/виробник, згода, ракурс"/></label>
     <label>Фото JPG або PNG<input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={e=>setPhotoFile(e.target.files?.[0]||null)}/></label>
     <label className="modelCheck"><input type="checkbox" checked={photoRights} onChange={e=>setPhotoRights(e.target.checked)}/> Є дозвіл використовувати це фото для 3D-моделювання</label>
     <div className="modelRow"><button disabled={busy||!photoFile||!photoRights||photoNote.length<5} onClick={()=>void action(()=>uploadPhoto(m.id),"Фото збережене у приватному сховищі.")}>Завантажити приватне фото</button>
      <button className="secondary" onClick={()=>void action(()=>showPhotos(m.id),"Список фото завантажено.")}>Показати фото</button></div>
     {photoModelID===m.id&&<div className="modelPhotoList">{photoList.length===0&&<p>Фото ще немає.</p>}{photoList.map(item=><figure key={item.id}><img src={"/api/v1/admin/model-photos/"+item.id} alt={item.notes} loading="lazy"/><figcaption>{item.width}×{item.height}px · {item.notes}</figcaption></figure>)}</div>}
    </div>}
{m.status!=="approved"&&<div className="modelUpload">
     <label>Формат<select value={format} onChange={e=>setFormat(e.target.value as "glb"|"usdz")}><option value="glb">GLB / 3D</option><option value="usdz">USDZ / iPhone</option></select></label>
     <label>Модель<input type="file" accept={format==="glb"?".glb,model/gltf-binary":".usdz,model/vnd.usdz+zip"} onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
     <button disabled={busy||!file} onClick={()=>void action(()=>upload(m.id),"Модель завантажено для перевірки.")}>Завантажити {format.toUpperCase()}</button>
    </div>}
    {m.status==="needs_review"&&<div className="modelReview"><h3>Контрольна перевірка</h3>
     <label>Примітки перевіряючого<textarea rows={2} value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} placeholder="Фактичні заміри, джерело, тестування…"/></label>
     <label className="modelCheck"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/> Підтверджую права на фото, геометрію й текстури</label>
     <label className="modelCheck"><input type="checkbox" checked={geometry} onChange={e=>setGeometry(e.target.checked)}/> Перевірив(ла) геометрію та масштаб GLB щодо товару</label>
     <label className="modelCheck"><input type="checkbox" checked={enableAR} onChange={e=>setEnableAR(e.target.checked)}/> Публікувати також AR (потрібен USDZ)</label>
     {enableAR&&<label className="modelCheck"><input type="checkbox" checked={usdzChecked} onChange={e=>setUSDZChecked(e.target.checked)}/> Перевірив(ла), що USDZ має той самий масштаб 1:1</label>}
     <div className="modelRow"><button disabled={busy||!rights||!geometry||!reviewNotes.trim()||(enableAR&&(!m.has_usdz||!usdzChecked))} onClick={()=>void action(()=>review(m.id,"approve"),"Модель затверджена.")}>Затвердити</button><button className="secondary" disabled={busy} onClick={()=>void action(()=>review(m.id,"reject"),"Чернетку повернуто на доопрацювання.")}>На доопрацювання</button></div>
    </div>}
    {m.status==="approved"&&<button className="secondary" disabled={busy} onClick={()=>void action(()=>review(m.id,"disable"),"Публічний 3D і AR вимкнені.")}>Вимкнути показ покупцям</button>}
   </div>)}
  </section>
  <p className="modelFootnote">Важливо: завантаження готової моделі не дорівнює автоматичній реконструкції з фотографій. Для фотограмметрії потрібні додаткові знімки, GPU-середовище та ручна перевірка.</p>
 </main>
}

function DraftViewer({url}:{url:string}){
 const [loaded,setLoaded]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  let current=true;
  void import("@google/model-viewer").then(()=>{if(current)setLoaded(true)}).catch(()=>{if(current)setError("Помилка модуля 3D")});
  return ()=>{current=false};
 },[]);
 return <div className="modelDraftViewer">{error&&<p>{error}</p>}{!loaded&&!error&&<p>Завантаження превʼю…</p>}{loaded&&<model-viewer src={url} camera-controls={true} ar={false} shadow-intensity="0.6" alt="Чернетка 3D моделі меблів"/>}<small>Чернетка — не для публікації. Порівняйте геометрію з оригінальними фото перед затвердженням.</small></div>;
}
