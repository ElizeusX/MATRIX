/* Shared browser/Node policy. Approval is data, never inferred from device support. */
(function(root){
 const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 const safeAsset=(url,extension)=>typeof url==='string'&&/^models\/[a-z0-9][a-z0-9._-]*$/.test(url)&&url.endsWith(extension);
 function approved(m){return !!m&&m.status==='approved'&&m.enabled_3d===true&&m.geometry_verified===true&&m.rights_confirmed===true&&[m.width_mm,m.depth_mm,m.height_mm].every(positive)&&safeAsset(m.glb_url,'.glb');}
 function matches(m,size){return approved(m)&&!!size&&[size.x,size.z,size.y].every((v,i)=>{const expected=[m.width_mm,m.depth_mm,m.height_mm][i];return positive(v)&&Math.abs(v*1000-expected)<=Math.max(5,expected*.01)});}
 function eligible(m,size){return matches(m,size)&&m.enabled_ar===true&&safeAsset(m.usdz_url,'.usdz');}
 const policy={approved,matches,eligible};
 if(typeof module!=='undefined')module.exports=policy;else root.MATRIX_AR_POLICY=policy;
})(typeof window==='undefined'?globalThis:window);
