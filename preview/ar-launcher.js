/* Inline product viewer; prepare native AR before the user's launch click. */
(function(root){
 "use strict";
 let library;
 function loadLibrary(){
  if(root.customElements.get("model-viewer"))return Promise.resolve();
  if(!library){
   library=new Promise((resolve,reject)=>{
    const script=root.document.createElement("script");
    const timer=root.setTimeout(()=>{script.remove();reject(new Error("AR library timed out"))},20000);
    script.type="module";
    script.src="https://unpkg.com/@google/model-viewer@4.4.0/dist/model-viewer.min.js";
    script.onload=()=>root.customElements.whenDefined("model-viewer").then(()=>{root.clearTimeout(timer);resolve()},reject);
    script.onerror=()=>{root.clearTimeout(timer);script.remove();reject(new Error("AR library unavailable"))};
    root.document.head.append(script);
   }).catch(error=>{library=null;throw error});
  }
  return library;
 }
 function create({container,onState}){
  const policy=root.MATRIX_AR_POLICY;
  let sequence=0,slug=null,viewer=null,manifest=null,loaded=false,modelLabel="",phase="idle",controller=null,deadline=null,capabilityTimer=null;
  function stopTimers(){root.clearTimeout(deadline);root.clearInterval(capabilityTimer);deadline=capabilityTimer=null}
  function report(next){
   phase=next;
   if(next!=="loading")stopTimers();
   onState({phase,manifest,loaded});
  }
  function reset(){
   ++sequence;stopTimers();controller?.abort();controller=null;
   viewer?.remove();viewer=null;manifest=null;loaded=false;slug=null;report("idle");
  }
  function cameraOrbit(){return typeof manifest?.camera_orbit==="string"&&/^-?\d+deg \d+deg auto$/.test(manifest.camera_orbit)?manifest.camera_orbit:"-25deg 75deg auto"}
  async function prepare(nextSlug,label){
   if(nextSlug===slug){modelLabel=label;viewer?.setAttribute("alt",label||"MATRIX 3D");return;}
   reset();
   if(typeof nextSlug!=="string"||!/^[a-z0-9-]+$/.test(nextSlug)){report("unavailable");return;}
   slug=nextSlug;
   modelLabel=label;
   const current=sequence;
   const active=()=>current===sequence&&phase==="loading";
   controller=new root.AbortController();
   report("loading");
   deadline=root.setTimeout(()=>{if(active()){controller.abort();viewer?.remove();report("error")}},30000);
   try{
    const response=await root.fetch("model-manifests/"+encodeURIComponent(slug)+".json",{cache:"no-store",signal:controller.signal});
    const candidate=response.ok?await response.json():null;
    if(!active())return;
    if(candidate?.slug!==slug||!policy.viewable(candidate)){report("unavailable");return;}
    manifest=candidate;
    await loadLibrary();
    if(!active())return;
    const node=root.document.createElement("model-viewer");
    viewer=node;
    node.className="dialog-model-viewer";
    node.setAttribute("alt",modelLabel||"MATRIX 3D");
    node.setAttribute("camera-controls","");node.setAttribute("touch-action","pan-y");
    node.setAttribute("camera-orbit",cameraOrbit());node.setAttribute("field-of-view","32deg");
    node.setAttribute("shadow-intensity","0.8");node.setAttribute("exposure","1");
    node.setAttribute("loading","eager");
    node.setAttribute("src",manifest.glb_url);
    node.setAttribute("ar-modes","scene-viewer quick-look");
    const hiddenButton=root.document.createElement("button");hiddenButton.slot="ar-button";hiddenButton.hidden=true;node.append(hiddenButton);
    node.addEventListener("error",()=>{if(current===sequence){loaded=false;report("error")}},{once:true});
    node.addEventListener("ar-status",event=>{if(current===sequence&&event.detail?.status==="failed")report("failed")});
    node.addEventListener("load",async()=>{
     if(!active())return;
     loaded=true;report("loading");
     try{
      if(!policy.available(manifest)){report("unavailable");return;}
      if(!policy.eligible(manifest,node.getDimensions())){report("mismatch");return;}
      node.setAttribute("ios-src",manifest.usdz_url);
      node.setAttribute("ar-scale","fixed");node.setAttribute("ar-placement","floor");node.setAttribute("ar","");
      await node.updateComplete;
      if(!active())return;
      let attempts=0;
      const check=()=>{
       if(!active())return;
       if(node.canActivateAR)report("ready");
       else if(++attempts>=20)report("unsupported");
      };
      capabilityTimer=root.setInterval(check,250);
      check();
     }catch{if(current===sequence)report("error")}
    },{once:true});
    container.append(node);
   }catch{if(active())report("error")}
  }
  function launch(){
   if(phase!=="ready"||!viewer?.canActivateAR)return;
   const current=sequence;
   try{
    if(!policy.available(manifest)||!policy.eligible(manifest,viewer.getDimensions())){report("mismatch");return;}
    // No fetch, await or navigation before activateAR: keep the original tap.
    const launched=viewer.activateAR();
    Promise.resolve(launched).catch(()=>{if(current===sequence)report("failed")});
   }catch{if(current===sequence)report("failed")}
  }
  function resetView(){
   if(!loaded||!viewer)return;
   viewer.setAttribute("camera-orbit",cameraOrbit());viewer.setAttribute("field-of-view","32deg");
  }
  return {prepare,launch,reset,resetView};
 }
 root.MATRIX_AR_LAUNCHER={create};
})(window);
