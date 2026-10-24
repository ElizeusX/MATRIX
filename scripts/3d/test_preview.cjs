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
  console.log('PASS: mobile/desktop 3D loads, actual bounds, AR blocked, fullscreen fallback, language, overflow');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
