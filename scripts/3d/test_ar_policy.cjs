const assert=require('node:assert/strict');
const {eligible,approved,estimated}=require('../../preview/ar-policy.js');
const good={status:'approved',enabled_3d:true,enabled_ar:true,geometry_verified:true,rights_confirmed:true,width_mm:2800,depth_mm:1800,height_mm:980,glb_url:'models/ci.glb',usdz_url:'models/ci.usdz'};
const dimensions={x:2.8,y:.98,z:1.8}; // synthetic fixture, not a product assertion
assert(eligible(good,dimensions));
for(const change of [{height_mm:null},{height_mm:0},{height_mm:NaN},{status:'draft'},{enabled_ar:false},{geometry_verified:false},{rights_confirmed:false},{usdz_url:''},{glb_url:'javascript:alert(1)'},{glb_url:'https://unreviewed.example/model.glb'}])assert(!eligible({...good,...change},dimensions));
assert(!eligible(good,{...dimensions,y:.85}));assert(!eligible(good,{...dimensions,x:NaN}));
const pilot=require('../../preview/model-manifests/hilton-2.json');
assert(estimated(pilot));assert(!approved(pilot));assert.equal(pilot.height_mm,null);
assert(eligible(pilot,dimensions));
for(const change of [{preview_ar:false},{estimated_height_mm:null},{estimated_height_mm:NaN},{height_estimate_source:''},{rights_confirmed:false},{height_mm:980},{usdz_url:''}])assert(!eligible({...pilot,...change},dimensions));
assert(!eligible(pilot,{...dimensions,y:.85}));
console.log('PASS: AR approval policy, approved and explicit estimated preview, missing estimates, mismatch, rights, asset URLs');
