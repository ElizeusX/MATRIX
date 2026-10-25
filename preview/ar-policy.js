/* Explicit estimated previews do not grant manufacturer/model approval. */
(function(root){
 const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 const safeAsset=(url,extension)=>typeof url==='string'&&/^models\/[a-z0-9][a-z0-9._-]*$/.test(url)&&url.endsWith(extension);
 const viewable=m=>!!m&&m.enabled_3d===true&&m.rights_confirmed===true&&safeAsset(m.glb_url,'.glb')&&[m.width_mm??m.estimated_width_mm,m.depth_mm??m.estimated_depth_mm,m.height_mm??m.estimated_height_mm].every(positive);
 const base=m=>!!m&&m.enabled_3d===true&&m.rights_confirmed===true&&[m.width_mm,m.depth_mm].every(positive)&&safeAsset(m.glb_url,'.glb');
 function approved(m){return base(m)&&m.status==='approved'&&m.geometry_verified===true&&positive(m.height_mm);}
 function estimated(m){return base(m)&&m.status==='draft'&&m.preview_ar===true&&m.height_mm===null&&positive(m.estimated_height_mm)&&typeof m.height_estimate_source==='string'&&m.height_estimate_source.trim().length>0;}
 function matches(m,size){return (approved(m)||estimated(m))&&!!size&&[size.x,size.z,size.y].every((v,i)=>{const expected=[m.width_mm,m.depth_mm,estimated(m)?m.estimated_height_mm:m.height_mm][i];return positive(v)&&Math.abs(v*1000-expected)<=Math.max(5,expected*.01)});}
 function eligible(m,size){return matches(m,size)&&m.enabled_ar===true&&safeAsset(m.usdz_url,'.usdz');}
 const policy={viewable,approved,estimated,matches,eligible};
 if(typeof module!=='undefined')module.exports=policy;else root.MATRIX_AR_POLICY=policy;
})(typeof window==='undefined'?globalThis:window);

