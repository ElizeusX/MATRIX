// Real WebGL coverage of different product forms and native-launch policy fixtures.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  fs.mkdirSync('artifacts/3d',{recursive:true});
  for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
   for(const slug of ['kutovyy-dyvan-neo-2','hilton-p','lizhko-faro','delta','pryamyy-dyvan-loft','molly','kutovyy-dyvan-elehant','rubin']){
    const page=await browser.newPage({viewport,hasTouch:viewport.width<500});const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://unpkg.com/@google/model-viewer@4.4.0/dist/model-viewer.min.js',r=>r.fulfill({path:path.resolve('apps/web/node_modules/@google/model-viewer/dist/model-viewer.min.js'),contentType:'text/javascript'}));
    await page.goto('http://127.0.0.1:8765/preview/3d.html?product='+slug);
    await page.waitForFunction(()=>document.querySelector('model-viewer')?.loaded,null,{timeout:60000});
    await page.waitForFunction(()=>!document.querySelector('#reset-view').disabled);
    const m=JSON.parse(fs.readFileSync('preview/model-manifests/'+slug+'.json'));
    const actual=await page.locator('model-viewer').evaluate(v=>({src:v.getAttribute('src'),size:v.getDimensions(),ar:v.hasAttribute('ar')}));
    assert.equal(actual.src,m.glb_url);assert(Math.abs(actual.size.x*1000-(m.width_mm??m.estimated_width_mm))<1);
    assert(Math.abs(actual.size.z*1000-(m.depth_mm??m.estimated_depth_mm))<1);
    assert.equal(actual.ar,m.enabled_ar);
    assert((await page.locator('#measure-height').textContent()).startsWith('≈'));
    assert(await page.locator('#ar-disabled').isDisabled()); // Chromium desktop has no native AR.
    if(m.dimensions_estimated)assert((await page.locator('#verified-width').textContent()).includes('ОЦІНКА'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(viewport.width>500){
     await page.locator('#viewer').screenshot({path:`artifacts/3d/catalog-${slug}.png`});
     const data=await page.locator('model-viewer').evaluate(v=>v.toDataURL('image/png'));
     fs.writeFileSync(`artifacts/3d/catalog-model-${slug}.png`,Buffer.from(data.split(',')[1],'base64'));
    }
    else if(slug==='kutovyy-dyvan-neo-2')await page.screenshot({path:'artifacts/3d/catalog-mobile.png',fullPage:true});
    await page.locator('#switch-lang').click();
    assert((await page.locator('#warning-description').textContent()).includes(m.dimensions_estimated?'all dimensions':'height is unknown'));
    assert.deepEqual(errors,[]);await page.close();
   }
  }
  const page=await browser.newPage();
  const retired=JSON.parse(fs.readFileSync('data/discontinued-products.json')).products;
  for(const slug of ['missing-product',...retired.map(p=>p.slug)]){
   await page.goto('http://127.0.0.1:8765/preview/3d.html?product='+slug);
   assert.equal(await page.locator('model-viewer').count(),0,slug);
   assert((await page.locator('#heading-primary').textContent()).includes('не знайдено'),slug);
  }
  await page.close();
  console.log('PASS: real mobile/desktop WebGL, per-product assets, estimated dimensions, AR gating, bilingual warnings, overflow, invalid slug.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
