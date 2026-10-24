const assert=require('node:assert/strict');
const {eligible}=require('../../preview/ar-policy.js');
const good={status:'approved',enabled_3d:true,enabled_ar:true,geometry_verified:true,rights_confirmed:true,width_mm:2800,depth_mm:1800,height_mm:980,glb_url:'models/ci.glb',usdz_url:'models/ci.usdz'};
const dimensions={x:2.8,y:.98,z:1.8}; // synthetic fixture, not a product assertion
assert(eligible(good,dimensions));
for(const change of [{height_mm:null},{height_mm:0},{height_mm:NaN},{status:'draft'},{enabled_ar:false},{geometry_verified:false},{rights_confirmed:false},{usdz_url:''},{glb_url:'javascript:alert(1)'},{glb_url:'https://unreviewed.example/model.glb'}])assert(!eligible({...good,...change},dimensions));
assert(!eligible(good,{...dimensions,y:.85}));assert(!eligible(good,{...dimensions,x:NaN}));
const pilot=require('../../preview/model-manifests/hilton-2.json');
if(pilot.status!=='approved')assert(!eligible(pilot,dimensions));
console.log('PASS: AR approval policy, unknown height, mismatch, draft, rights, asset URLs');
