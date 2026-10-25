// Uses the same local server and Playwright runtime as the existing AR smoke test.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  for (const width of [390, 768, 1440]) {
   const page = await browser.newPage({viewport:{width,height:1000}});
   const errors = [];
   page.on('pageerror', error => errors.push(error.message));
   await page.goto('http://127.0.0.1:8765/preview/');
   await page.locator('.product-card').first().waitFor();
   assert(await page.locator('.matrix-brand').first().evaluate(img => img.complete && img.naturalWidth > 0));
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   await page.screenshot({path:`artifacts/3d/showroom-${width}.png`,fullPage:true});
   await page.locator('[data-filter="beds"]').click();
   const bedCount = await page.locator('.product-card').count();
   assert(bedCount > 0);
   await page.locator('#catalog-search').fill('zz-no-model');
   assert.equal(await page.locator('.product-card').count(),0);
   await page.locator('#empty-message').waitFor({state:'visible'});
   await page.locator('#catalog-search').fill('');
   await page.locator('.product-card').first().waitFor();
   await page.locator('.product-open').first().click();
   await page.locator('#product-dialog').waitFor({state:'visible'});
   await page.locator('#dialog-favorite').click();
   await page.locator('#dialog-close').click();
   await page.locator('#favorites-trigger').click();
   await page.locator('#favorites-dialog').waitFor({state:'visible'});
   assert.equal(await page.locator('.favorite-item').count(),1);
   await page.keyboard.press('Escape');
   await page.locator('#lang-switch').click();
   assert.equal(await page.locator('html').getAttribute('lang'),'en');
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.locator('main').evaluate(el => getComputedStyle(el).animationName),'none');
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('PASS: showroom responsive layouts, logo, filters, search, product dialog, favorites, language, reduced motion');
 } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
