import {readFile} from "node:fs/promises";
import path from "node:path";
export interface ApprovedModel {
 id:string;
 slug:string;
 version:number;
 status:"approved";
 width_mm:number;
 depth_mm:number;
 height_mm:number;
 glb_url:string;
 usdz_url?:string;
 enabled_3d:boolean;
 enabled_ar:boolean;
 geometry_verified:boolean;
 rights_confirmed:boolean;
}

export async function getApprovedModel(slug:string):Promise<ApprovedModel|null>{
 try {
  const base=process.env.MATRIX_API_INTERNAL_URL||"http://localhost:8080";
  const response=await fetch(base+"/api/v1/models/"+encodeURIComponent(slug),{cache:"no-store"});
  if(!response.ok)return null;
  const model=await response.json() as ApprovedModel;
  if(model.status!=="approved"||!model.geometry_verified||!model.rights_confirmed||
     !model.enabled_3d||!model.glb_url||!model.width_mm||!model.depth_mm||!model.height_mm)return null;
  return model;
 }catch{return null}
}


// Drafts are an explicit display type; they never pass the approved API gate.
export interface PreviewModel {
 id:string; slug:string; version:number; status:"draft";
 width_mm:number|null; depth_mm:number|null; height_mm:null;
 estimated_width_mm:number; estimated_depth_mm:number; estimated_height_mm:number;
 dimensions_estimated?:boolean; camera_orbit?:string; preview_ar:boolean; height_estimate_source:string;
 glb_url:string; usdz_url?:string; enabled_3d:boolean; enabled_ar:boolean;
 geometry_verified:false; rights_confirmed:boolean;
}
export type FurnitureModel=ApprovedModel|PreviewModel;

export async function getFurnitureModel(slug:string):Promise<FurnitureModel|null>{
 const approved=await getApprovedModel(slug);
 if(approved)return approved;
 if(!/^[a-z0-9-]{1,129}$/.test(slug))return null;
 try {
  const file=path.join(process.cwd(),"public/model-manifests",slug+".json");
  const m=JSON.parse(await readFile(file,"utf8"));
  if(m.slug!==slug||m.status!=="draft"||m.enabled_3d!==true||m.rights_confirmed!==true||m.geometry_verified!==false||m.height_mm!==null)return null;
  if(![m.width_mm??m.estimated_width_mm,m.depth_mm??m.estimated_depth_mm,m.estimated_height_mm].every(n=>typeof n==="number"&&Number.isFinite(n)&&n>0))return null;
  const revision=m.shape_revision===2?"-v2":"";
  if(m.glb_url!==`models/${slug}${revision}-draft.glb`)return null;
  const canAR=m.preview_ar===true&&m.dimensions_estimated!==true&&[m.width_mm,m.depth_mm].every(n=>typeof n==="number"&&Number.isFinite(n)&&n>0)&&typeof m.height_estimate_source==="string"&&m.height_estimate_source.trim().length>0&&m.usdz_url===`models/${slug}${revision}-estimated.usdz`;
  return {...m,id:"draft-"+slug,version:m.shape_revision??1,enabled_ar:m.enabled_ar===true&&canAR,
   glb_url:"/"+m.glb_url,usdz_url:canAR?"/"+m.usdz_url:undefined} as PreviewModel;
 }catch{return null}
}
