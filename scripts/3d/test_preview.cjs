// Run with NODE_PATH pointing at a Playwright installation, and preview server on :8765.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
   const page=await browser.newPage({viewport,hasTouch:viewport.width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://unpkg.com/@google/model-viewer@4.4.0/dist/model-viewer.min.js',r=>r.fulfill({path:path.resolve('apps/web/node_modules/@google/model-viewer/dist/model-viewer.min.js'),contentType:'text/javascript'}));
   await page.goto('http://127.0.0.1:8765/preview/3d.html?product=hilton-2');
   await page.waitForFunction(()=>document.querySelector('model-viewer')?.loaded,null,{timeout:60000});
   const result=await page.locator('model-viewer').evaluate(m=>({size:m.getDimensions(),ar:m.hasAttribute('ar'),ios:m.hasAttribute('ios-src')}));
   assert(Math.abs(result.size.x-2.8)<.001);assert(Math.abs(result.size.z-1.8)<.001);
   assert(!result.ar&&!result.ios);assert(await page.locator('#ar-disabled').isDisabled());
   assert.equal(await page.locator('#measure-height').textContent(),'—');
   await page.locator('#reset-view').click();
   // Exercise iPhone-style fallback where the element fullscreen API is absent.
   await page.locator('#viewer').evaluate(v=>{v.requestFullscreen=undefined});
   await page.locator('#fullscreen-view').click();
   assert(await page.locator('#viewer').evaluate(v=>v.classList.contains('fullscreen-fallback')));
   await page.locator('#fullscreen-view').click();
   assert(!await page.locator('#viewer').evaluate(v=>v.classList.contains('fullscreen-fallback')));
   await page.locator('#viewer').screenshot({path:`artifacts/3d/browser-${viewport.width}.png`});
   await page.locator('#switch-lang').click();
   assert((await page.locator('#warning-description').textContent()).includes('height is unknown'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.deepEqual(errors,[]);await page.close();
  }
  // Synthetic approval fixtures test launch wiring, NOT native AR or a real product approval.
  for(const scenario of ['approved','wrong-scale','unsupported','launch-error']){
   const p=await browser.newPage();
   await p.route('**/model-manifests/hilton-2.json',r=>r.fulfill({json:{slug:'hilton-2',status:'approved',enabled_3d:true,enabled_ar:true,rights_confirmed:true,geometry_verified:true,width_mm:2800,depth_mm:1800,height_mm:980,glb_url:'models/fixture.glb',usdz_url:'models/fixture.usdz'}}));
   await p.route('https://unpkg.com/@google/model-viewer@4.4.0/dist/model-viewer.min.js',r=>r.fulfill({contentType:'text/javascript',body:`
    customElements.define('model-viewer',class extends HTMLElement {
     connectedCallback(){setTimeout(()=>this.dispatchEvent(new Event('load')),0)}
     getDimensions(){return {x:2.8,y:${scenario==='wrong-scale'?'.85':'.98'},z:1.8}}
     get canActivateAR(){return ${scenario!=='unsupported'}}
     get updateComplete(){return Promise.resolve(true)}
     activateAR(){this.dataset.launched='yes';return ${scenario==='launch-error'?"Promise.reject(new Error('unsupported'))":"Promise.resolve()"}}
    });`}));
   await p.goto('http://127.0.0.1:8765/preview/3d.html?product=hilton-2');
   await p.waitForFunction(()=>!document.querySelector('#reset-view').disabled);
   if(scenario==='wrong-scale'||scenario==='unsupported')assert(await p.locator('#ar-disabled').isDisabled());
   else {
    await p.locator('#ar-disabled').click();
    assert.equal(await p.locator('model-viewer').getAttribute('data-launched'),'yes');
    assert.equal(await p.locator('model-viewer').getAttribute('ar-scale'),'fixed');
    assert.equal(await p.locator('model-viewer').getAttribute('ar-modes'),'scene-viewer quick-look');
    assert.equal(await p.locator('model-viewer').getAttribute('ios-src'),'models/fixture.usdz');
    if(scenario==='launch-error')assert((await p.locator('#ar-description').textContent()).includes('Продовжуйте'));
   }
   if(scenario==='wrong-scale')assert.equal(await p.locator('model-viewer').getAttribute('ar'),null);
   await p.close();
  }
  const unavailable=await browser.newPage();
  await unavailable.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null});
  await unavailable.goto('http://127.0.0.1:8765/preview/3d.html?product=hilton-2');
  await unavailable.getByText('Не вдалося відкрити 3D',{exact:true}).waitFor();
  assert.equal(await unavailable.locator('model-viewer').count(),0);
  assert(await unavailable.locator('#ar-disabled').isDisabled());
  await unavailable.close();
  console.log('PASS: mobile/desktop 3D loads, actual bounds, AR blocked, fullscreen fallback, language, overflow');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
