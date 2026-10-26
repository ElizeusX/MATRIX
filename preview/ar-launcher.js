/* Prepare native AR before the click so Safari keeps the user's activation. */
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
  let sequence=0,slug=null,viewer=null,manifest=null,phase="idle",controller=null,deadline=null,capabilityTimer=null;
  function stopTimers(){root.clearTimeout(deadline);root.clearInterval(capabilityTimer);deadline=capabilityTimer=null}
  function report(next){
   phase=next;
   if(next!=="loading")stopTimers();
   onState({phase,manifest});
  }
  function reset(){
   ++sequence;stopTimers();controller?.abort();controller=null;
   viewer?.remove();viewer=null;manifest=null;slug=null;report("idle");
  }
  async function prepare(nextSlug){
   if(nextSlug===slug)return;
   reset();
   if(typeof nextSlug!=="string"||!/^[a-z0-9-]+$/.test(nextSlug)){report("unavailable");return;}
   slug=nextSlug;
   const current=sequence;
   const active=()=>current===sequence&&phase==="loading";
   controller=new root.AbortController();
   report("loading");
   deadline=root.setTimeout(()=>{if(active()){controller.abort();viewer?.remove();report("error")}},30000);
   try{
    const response=await root.fetch("model-manifests/"+encodeURIComponent(slug)+".json",{cache:"no-store",signal:controller.signal});
    const candidate=response.ok?await response.json():null;
    if(!active())return;
    if(candidate?.slug!==slug||!policy.available(candidate)){report("unavailable");return;}
    manifest=candidate;
    await loadLibrary();
    if(!active())return;
    const node=root.document.createElement("model-viewer");
    viewer=node;
    node.className="dialog-ar-viewer";
    node.setAttribute("aria-hidden","true");node.setAttribute("tabindex","-1");
    node.setAttribute("loading","eager");
    node.setAttribute("src",manifest.glb_url);
    node.setAttribute("ar-modes","scene-viewer quick-look");
    const hiddenButton=root.document.createElement("button");hiddenButton.slot="ar-button";hiddenButton.hidden=true;node.append(hiddenButton);
    node.addEventListener("error",()=>{if(current===sequence)report("error")},{once:true});
    node.addEventListener("ar-status",event=>{if(current===sequence&&event.detail?.status==="failed")report("failed")});
    node.addEventListener("load",async()=>{
     if(!active())return;
     try{
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
  return {prepare,launch,reset};
 }
 root.MATRIX_AR_LAUNCHER={create};
})(window);
