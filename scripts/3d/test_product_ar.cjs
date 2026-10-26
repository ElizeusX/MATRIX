// Native-launch wiring with synthetic devices; no claim of real device AR support.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const policy=require('../../preview/ar-policy.js');
const draft=require('../../preview/model-manifests/hilton-2.json');
const source=fs.readFileSync(require.resolve('../../preview/ar-launcher.js'),'utf8');
const dimensions={x:2.8,y:.98,z:1.8};
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};

function fixture(options={}){
 let state,launched=0,inClick=false,fetches=0;
 const nodes=[],timeouts=new Map(),intervals=new Map();let timerId=0;
 class Node extends EventTarget {
  constructor(tag){super();this.tag=tag;this.attrs={};this.children=[];this.canActivateAR=options.supported!==false;this.updateComplete=Promise.resolve()}
  setAttribute(name,value){this.attrs[name]=value}
  append(node){this.children.push(node)}
  remove(){this.removed=true}
  getDimensions(){return options.size||dimensions}
  activateAR(){
   assert(inClick,'native launch must remain synchronous inside the click');
   launched++;
   if(options.launchThrows)throw new Error('native failure');
   return options.launchRejects?Promise.reject(new Error('native failure')):Promise.resolve();
  }
 }
 const container=new Node('dialog');
 const document={head:new Node('head'),createElement:tag=>{const n=new Node(tag);nodes.push(n);return n}};
 const root={document,MATRIX_AR_POLICY:policy,AbortController,
  customElements:{get:()=>options.libraryMissing?undefined:Node,whenDefined:()=>Promise.resolve()},
  fetch:async(url,init)=>{
   fetches++;
   if(options.fetch)return options.fetch(url,init);
   if(options.networkError)throw new Error('offline');
   return {ok:!options.notFound,json:async()=>options.manifest||{...draft}};
  },
  setTimeout:(fn,delay)=>{const id=++timerId;timeouts.set(id,{fn,delay});return id},clearTimeout:id=>timeouts.delete(id),
  setInterval:fn=>{const id=++timerId;intervals.set(id,fn);return id},clearInterval:id=>intervals.delete(id)};
 vm.runInNewContext(source,{window:root});
 const launcher=root.MATRIX_AR_LAUNCHER.create({container,onState:next=>state=next});
 return {launcher,nodes,container,document,intervals,timeouts,get state(){return state},get launched(){return launched},get fetches(){return fetches},
  get viewer(){return nodes.findLast(n=>n.tag==='model-viewer')},
  click(){inClick=true;launcher.launch();inClick=false},
  async load(){this.viewer.dispatchEvent(new Event('load'));await tick()},
  async poll(){for(let i=0;i<22;i++){for(const fn of [...intervals.values()])fn();await tick()}}};
}

(async()=>{
 for(const manifest of [{...draft},{...draft,status:'approved',geometry_verified:true,height_mm:980}]){
  const f=fixture({manifest});await f.launcher.prepare('hilton-2');
  assert.equal(f.state.phase,'loading');assert(!('ar' in f.viewer.attrs));
  f.click();assert.equal(f.launched,0);
  await f.load();assert.equal(f.state.phase,'ready');assert.equal(f.viewer.attrs['ios-src'],manifest.usdz_url);
  assert(f.state.loaded);assert('camera-controls' in f.viewer.attrs);assert(!('aria-hidden' in f.viewer.attrs));
  f.viewer.setAttribute('camera-orbit','0deg 0deg auto');f.viewer.setAttribute('field-of-view','20deg');
  f.launcher.resetView();assert.equal(f.viewer.attrs['camera-orbit'],'-25deg 75deg auto');assert.equal(f.viewer.attrs['field-of-view'],'32deg');
  assert.equal(f.viewer.attrs['ar-modes'],'scene-viewer quick-look');assert.equal(f.viewer.attrs['ar-scale'],'fixed');
  assert.equal(f.viewer.attrs['ar-placement'],'floor');assert.equal(f.viewer.attrs.loading,'eager');
  f.click();assert.equal(f.launched,1);assert.equal(f.fetches,1);
  await f.launcher.prepare('hilton-2','Translated product');assert.equal(f.fetches,1,'relabeling must reuse the prepared model');assert.equal(f.viewer.attrs.alt,'Translated product');
  f.launcher.reset();assert(f.viewer.removed);f.click();assert.equal(f.launched,1);
  assert.equal(f.state.loaded,false);
  assert.equal(f.intervals.size,0);assert.equal(f.timeouts.size,0);
 }
 for(const change of [{rights_confirmed:false},{enabled_3d:false},{glb_url:'https://untrusted.test/model.glb'},{slug:'different-product'}]){
  const f=fixture({manifest:{...draft,...change}});await f.launcher.prepare('hilton-2');
  assert.equal(f.state.phase,'unavailable');assert(!f.viewer);f.click();assert.equal(f.launched,0);
 }
 for(const change of [{enabled_ar:false},{dimensions_estimated:true},{usdz_url:'https://untrusted.test/model.usdz'}]){
  const f=fixture({manifest:{...draft,...change}});await f.launcher.prepare('hilton-2');await f.load();
  assert(f.state.loaded,'3D remains available when AR is unavailable');assert.equal(f.state.phase,'unavailable');
  assert(!('ar' in f.viewer.attrs));f.click();assert.equal(f.launched,0);f.launcher.resetView();f.launcher.reset();
 }
 const mismatch=fixture({size:{...dimensions,y:.85}});await mismatch.launcher.prepare('hilton-2');await mismatch.load();
 assert.equal(mismatch.state.phase,'mismatch');assert(!('ar' in mismatch.viewer.attrs));mismatch.click();assert.equal(mismatch.launched,0);
 const unsupported=fixture({supported:false});await unsupported.launcher.prepare('hilton-2');await unsupported.load();await unsupported.poll();
 assert.equal(unsupported.state.phase,'unsupported');assert(unsupported.state.loaded,'unsupported AR devices can still view 3D');unsupported.click();assert.equal(unsupported.launched,0);
 const delayed=fixture({supported:false});await delayed.launcher.prepare('hilton-2');await delayed.load();
 delayed.viewer.canActivateAR=true;await delayed.poll();assert.equal(delayed.state.phase,'ready');delayed.click();assert.equal(delayed.launched,1);
 for(const options of [{launchRejects:true},{launchThrows:true}]){
  const f=fixture(options);await f.launcher.prepare('hilton-2');await f.load();f.click();await tick();assert.equal(f.state.phase,'failed');
 }
 for(const options of [{networkError:true},{notFound:true}]){
  const f=fixture(options);await f.launcher.prepare('hilton-2');assert.equal(f.state.phase,options.notFound?'unavailable':'error');assert(!f.viewer);
 }
 const failure=fixture();await failure.launcher.prepare('hilton-2');failure.viewer.dispatchEvent(new Event('error'));
 assert.equal(failure.state.phase,'error');assert.equal(failure.state.loaded,false);failure.click();assert.equal(failure.launched,0);
 const changed=fixture();await changed.launcher.prepare('hilton-2');await changed.load();changed.viewer.getDimensions=()=>({...dimensions,x:1});
 changed.click();assert.equal(changed.state.phase,'mismatch');assert.equal(changed.launched,0);
 const timeout=fixture();await timeout.launcher.prepare('hilton-2');[...timeout.timeouts.values()].find(t=>t.delay===30000).fn();
 assert.equal(timeout.state.phase,'error');assert(timeout.viewer.removed);await timeout.load();assert.equal(timeout.state.phase,'error');
 let resolveOld,oldSignal;
 const race=fixture({fetch:(url,init)=>url.includes('hilton-2')?new Promise(resolve=>{resolveOld=resolve;oldSignal=init.signal}):Promise.resolve({ok:true,json:async()=>({...draft,slug:'another-product',glb_url:'models/another.glb',usdz_url:'models/another.usdz'})})});
 const old=race.launcher.prepare('hilton-2');await tick();await race.launcher.prepare('another-product');
 resolveOld({ok:true,json:async()=>({...draft})});await old;await race.load();
 assert(oldSignal.aborted);assert.equal(race.viewer.attrs.src,'models/another.glb');assert.equal(race.state.manifest.slug,'another-product');
 race.click();assert.equal(race.launched,1);race.launcher.reset();
 const missingLibrary=fixture({libraryMissing:true});const opening=missingLibrary.launcher.prepare('hilton-2');await tick();
 missingLibrary.document.head.children[0].onerror();await opening;assert.equal(missingLibrary.state.phase,'error');
 console.log('PASS: inline 3D camera/reset, 3D-only and unsupported AR devices, synchronous native AR, approval/scale checks, errors, teardown and product-switch races');
})().catch(error=>{console.error(error);process.exitCode=1});
