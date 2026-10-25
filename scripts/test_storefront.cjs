// Isolated synthetic API: no real orders, payments or production data are used.
const {chromium} = require('playwright');
const {createServer} = require('node:http');
const {spawn} = require('node:child_process');
const assert = require('node:assert/strict');
const product = {id:'test-hilton',slug:'hilton-2',category:'corner-sofas',title_uk:'Хілтон-2',title_en:'Hilton-2',description_uk:'Тестова модель',description_en:'Test furniture',price_minor:2500000,base_price_minor:2500000,original_minor:null,settlement_price_minor:2500000,discount_bps:0,currency:'UAH',width_mm:2800,depth_mm:1800,available:true,published:true};
const bed = {...product,id:'test-bed',slug:'lizhko-faro',category:'beds',title_en:'Faro',title_uk:'Фаро'};
let submitted;
const api = createServer((req,res)=>{
 res.setHeader('Content-Type','application/json');
 if(req.url==='/api/v1/products')return res.end(JSON.stringify({items:[product,bed]}));
 if(req.url==='/api/v1/products/hilton-2')return res.end(JSON.stringify(product));
 if(req.url==='/api/v1/products/lizhko-faro')return res.end(JSON.stringify(bed));
 if(req.url==='/api/v1/config')return res.end(JSON.stringify({liqpay_enabled:false}));
 if(req.url==='/api/v1/orders'&&req.method==='POST'){
  let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{submitted=JSON.parse(body);res.end(JSON.stringify({order_number:'TEST-001'}))});return;
 }
 res.statusCode=404;res.end('{}');
});
(async()=>{
 await new Promise(resolve=>api.listen(8080,'127.0.0.1',resolve));
 const server=spawn(process.execPath,['apps/web/node_modules/next/dist/bin/next','start','apps/web','--hostname','127.0.0.1'],{stdio:'inherit'});
 let browser;
 try {
  let ready=false;
  for(let i=0;i<60;i++){try{const r=await fetch('http://127.0.0.1:3000/en');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,1000));}
  assert(ready,'Next server did not become ready');
  browser=await chromium.launch({headless:true});
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:1000}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const route of ['/en','/uk','/en/catalog','/en/product/hilton-2','/en/cart']){
    await page.goto('http://127.0.0.1:3000'+route);
    await page.locator('main').waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow');
    await page.screenshot({path:`artifacts/3d/storefront-${width}-${route.replaceAll('/','-')}.png`,fullPage:true});
   }
   await page.goto('http://127.0.0.1:3000/en/catalog?category=beds');
   await page.getByRole('searchbox').fill('Faro');await page.getByRole('button',{name:'Search',exact:true}).click();
   await page.waitForURL(/q=Faro/);assert.equal(new URL(page.url()).searchParams.get('category'),'beds');
   assert.equal(await page.locator('.productCard').count(),1);
   await page.goto('http://127.0.0.1:3000/en/product/hilton-2');
   await page.getByRole('button',{name:'Add to cart',exact:true}).click();
   await page.getByRole('button',{name:'Added ✓',exact:true}).waitFor();
   await page.goto('http://127.0.0.1:3000/en/cart');
   await page.locator('.checkoutForm').waitFor();
   await page.getByLabel('Name',{exact:true}).fill('Test customer');
   await page.getByLabel('Phone',{exact:true}).fill('+380000000000');
   await page.getByLabel('Delivery address').fill('Test address only');
   await page.locator('[name=consent]').check();
   await page.getByRole('button',{name:'Place order',exact:true}).click();
   await page.getByRole('heading',{name:'Order received'}).waitFor();
   assert.deepEqual(submitted.items,[{product_id:'test-hilton',quantity:1}]);
   assert.equal(submitted.payment_method,'manual');
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: storefront desktop/mobile routes, category search, cart and synthetic checkout');
 } finally {if(browser)await browser.close();server.kill();api.close();}
})().catch(e=>{console.error(e);process.exitCode=1;api.close()});
