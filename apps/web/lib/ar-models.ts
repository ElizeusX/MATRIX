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
