// Run against the preview server on :8765 with Playwright available via NODE_PATH.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

async function assertMobileFlow(page, width) {
  const box = selector => page.locator(selector).boundingBox();
  const title = await box('#hero-title');
  const description = await box('.hero-description');
  const cta = await box('.showroom-hero .underlined-link');
  const visual = await box('.showroom-visual');
  const ar = await box('.hero-ar');
  const caption = await box('.showroom-caption');
  const categories = await box('.showroom-categories');
  assert(title.y + title.height <= description.y + 1, `title overlaps description at ${width}`);
  assert(description.y + description.height <= cta.y + 1, `description overlaps CTA at ${width}`);
  assert(cta.y + cta.height <= visual.y + 1, `CTA overlaps image at ${width}`);
  assert(visual.y + visual.height <= categories.y + 1, `image overlaps categories at ${width}`);
  assert(ar.y >= visual.y && ar.y + ar.height <= caption.y, `AR overlaps caption at ${width}`);
  assert(ar.x >= visual.x && ar.x + ar.width <= visual.x + visual.width, `AR outside image at ${width}`);
  assert(cta.height >= 48 && ar.height >= 44, `small touch targets at ${width}`);
  assert.equal(await page.locator('.showroom-hero .underlined-link').evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
  assert.equal(await page.locator('.story .underlined-link').evaluate(el => getComputedStyle(el).position), 'static', 'story CTA must stay in its own section');
  const story = await box('.story');
  const storyCta = await box('.story .underlined-link');
  assert(storyCta.y >= story.y && storyCta.y + storyCta.height <= story.y + story.height, 'story CTA escaped its section');
  for (const selector of ['.menu-toggle', '.wordmark', '.header-tools', '.showroom-category']) {
    for (const el of await page.locator(selector).all()) {
      const b = await el.boundingBox();
      assert(b.x >= 0 && b.x + b.width <= width + 1, `${selector} outside viewport at ${width}`);
    }
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  fs.mkdirSync('artifacts/mobile', { recursive: true });
  try {
    for (const width of [320, 375, 390, 430, 580, 581, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:8765/preview/');
      await page.locator('.product-card').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      for (const locale of ['uk', 'en']) {
        if (locale === 'en') await page.locator('#lang-switch').click();
        await page.screenshot({ path: `artifacts/mobile/storefront-${width}-${locale}.png`, fullPage: false });
        const overflow = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll('body *')].filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width && (rect.x < -1 || rect.right > innerWidth + 1);
          }).map(el => ({ selector: el.className, bounds: el.getBoundingClientRect().toJSON() }))
        }));
        assert(overflow.width <= width, `page overflow at ${width}/${locale}: ${JSON.stringify(overflow)}`);
        if (width <= 580) await assertMobileFlow(page, width);
        await page.screenshot({ path: `artifacts/mobile/storefront-${width}-${locale}.png`, fullPage: false });
      }
      if (width <= 580) {
        await page.locator('#hero-title').evaluate(el => { el.style.fontSize = '64px'; });
        await page.locator('.hero-description').evaluate(el => { el.style.fontSize = '22px'; });
        await assertMobileFlow(page, width);
        await page.locator('#menu-toggle').click();
        assert(await page.locator('#main-nav').isVisible());
        await page.locator('#menu-toggle').click();
      }
      await page.locator('[data-category="corner-sofas"]').click();
      assert.equal(await page.locator('.filter.active').getAttribute('data-filter'), 'corner-sofas');
      assert.equal(await page.locator('.hero-ar').getAttribute('href'), '3d.html?product=hilton-2');
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: responsive layout, UA/EN, enlarged text, hero/story separation, touch targets, menu, category filters and AR link');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
