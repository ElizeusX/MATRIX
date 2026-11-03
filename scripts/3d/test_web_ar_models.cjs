// Exercise the actual Next.js manifest loader with generated catalog assets.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const ts=require(path.join(root,'apps/web/node_modules/typescript'));
const catalog=require(path.join(root,'data/catalog.json')).products;
const manifests=new Map(fs.readdirSync(path.join(root,'preview/model-manifests'))
 .filter(name=>name.endsWith('.json')).map(name=>[name.slice(0,-5),JSON.parse(fs.readFileSync(path.join(root,'preview/model-manifests',name)))]));
const source=fs.readFileSync(path.join(root,'apps/web/lib/ar-models.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
function loader(change={}){
 const exports={};
 vm.runInNewContext(compiled,{exports,process:{env:{},cwd:()=>path.join(root,'apps/web')},
  fetch:async()=>({ok:false}),require:name=>{
   if(name==='./source-catalog')return {sourceProduct:slug=>catalog.find(p=>p.slug===slug)};
   if(name==='node:fs/promises')return {readFile:async file=>{
    const slug=path.basename(file,'.json');
    return JSON.stringify({...manifests.get(slug),...change});
   }};
   return require(name);
  }});
 return exports.getFurnitureModel;
}
(async()=>{
 const beds=[...manifests.values()].filter(m=>m.preview_ar_basis==='estimated_bed_configuration');
 assert.equal(beds.length,10);
 for(const bed of beds){
  const m=await loader()(bed.slug);
  assert(m&&m.enabled_ar,bed.slug);assert.equal(m.status,'draft');assert.equal(m.width_mm,null);assert.equal(m.height_mm,null);
  assert.equal(m.usdz_url,'/'+bed.usdz_url);
 }
 for(const change of [{preview_ar_basis:undefined},{width_depth_estimate_source:''},{estimated_width_mm:0},{estimated_depth_mm:null},{height_estimate_source:''},{preview_ar:false},{usdz_url:'models/wrong.usdz'},{enabled_ar:false}]){
  const m=await loader(change)('lizhko-faro');assert(!m?.enabled_ar,JSON.stringify(change));
 }
 assert((await loader()('molly')).enabled_ar,'known-size sofa AR remains available');
 assert(!(await loader()('elli')).enabled_ar,'unknown-size sofas remain 3D only');
 console.log('PASS: Next.js loader enables ten estimated beds, preserves source dimensions and rejects invalid AR metadata');
})().catch(error=>{console.error(error);process.exitCode=1});
