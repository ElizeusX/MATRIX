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

async function assertProductCards(page, width, locale) {
  const card = page.locator('.product-card').first();
  const button = card.locator('.product-details-button');
  const title = await card.locator('h3').textContent();
  assert.equal(await page.locator('.product-card .product-open, .product-card .product-3d-link').count(), 0);
  assert.equal(await card.locator('button').count(), 2, 'one details target and one independent favorite');
  assert.equal(await button.getAttribute('aria-haspopup'), 'dialog');
  assert((await button.getAttribute('aria-label')).includes(title));
  await card.scrollIntoViewIfNeeded();
  const badge = card.locator('.product-ar-badge');
  await badge.waitFor({ state: 'visible' });
  assert.equal((await badge.textContent()).trim(), '3D / AR');
  assert(await badge.evaluate(el => el.tagName === 'SPAN' && !el.hasAttribute('tabindex') && !el.closest('a,button')));
  assert.equal(await badge.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
  assert.equal(await page.locator('.product-card[data-slug="hilton-p"] .product-ar-badge').count(), 0, '3D-only product has no AR badge');
  const outer = await card.boundingBox();
  const target = await button.boundingBox();
  assert(Math.abs(outer.width - target.width) <= 2 && Math.abs(outer.height - target.height) <= 2, `details target covers the whole card: ${JSON.stringify({ outer, target })}`);
  for (const selector of ['.product-photo', 'h3', '.product-meta p', '.product-ar-badge']) {
    await card.scrollIntoViewIfNeeded();
    const b = await card.locator(selector).boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    assert(await page.locator('#product-dialog').isVisible(), `${selector} opens details at ${width}/${locale}`);
    assert.equal(await page.locator('#dialog-title').textContent(), title);
    assert(await page.locator('#dialog-3d').isVisible(), '3D is embedded in product details');
    assert.equal(await page.locator('#product-dialog a[href^="3d.html"]').count(), 0, 'details never navigate to a separate 3D screen');
    const photos = await page.locator('#dialog-gallery').boundingBox();
    const inline3D = await page.locator('#dialog-3d').boundingBox();
    assert(photos.y + photos.height <= inline3D.y + 1, 'inline 3D stays below the photographs');
    await page.keyboard.press('Escape');
  }
  // Padding also belongs to the details target.
  await button.click({ position: { x: target.width / 2, y: target.height - 10 } });
  assert(await page.locator('#product-dialog').isVisible());
  await page.keyboard.press('Escape');
  for (const key of ['Enter', 'Space']) {
    await button.focus();
    await page.keyboard.press(key);
    assert(await page.locator('#product-dialog').isVisible(), `${key} opens details`);
    await page.keyboard.press('Escape');
  }
  const favorite = card.locator('.favorite-btn');
  await favorite.click();
  assert.equal(await favorite.getAttribute('aria-pressed'), 'true');
  assert(!(await page.locator('#product-dialog').isVisible()), 'favorite does not open details');
  await favorite.click();
  assert.equal(await favorite.getAttribute('aria-pressed'), 'false');
  assert(!(await page.locator('#product-dialog').isVisible()));
  await card.scrollIntoViewIfNeeded();
  await card.locator(".product-ar-badge").waitFor({ state: "visible" });
  await page.screenshot({ path: `artifacts/mobile/catalog-${width}-${locale}.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  fs.mkdirSync('artifacts/mobile', { recursive: true });
  try {
    const retired = JSON.parse(fs.readFileSync('data/discontinued-products.json')).products;
    const catalogPage = await browser.newPage();
    await catalogPage.addInitScript(slugs => localStorage.setItem('matrix-static-preview-favorites-v1', JSON.stringify(slugs)), retired.map(p => p.slug));
    await catalogPage.goto('http://127.0.0.1:8765/preview/');
    await catalogPage.locator('.product-card').first().waitFor();
    assert.equal(await catalogPage.locator('.product-card').count(), 66);
    for (const {slug} of retired) assert.equal(await catalogPage.locator(`.product-card[data-slug="${slug}"]`).count(), 0, slug);
    await catalogPage.locator('#favorites-trigger').click();
    assert.equal(await catalogPage.locator('.favorite-item').count(), 0, 'retired favorites cannot reappear');
    await catalogPage.locator('#favorites-close').click();
    for (const query of ['Лондон-5', 'Венера', 'Атланта-Т', 'Вегас-Т', 'Монако', 'Фелліні']) {
      await catalogPage.locator('#catalog-search').fill(query);
      assert.equal(await catalogPage.locator('.product-card').count(), 0, query);
    }
    await catalogPage.close();
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
        if ([320, 390, 1440].includes(width)) await assertProductCards(page, width, locale);
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
    console.log('PASS: responsive layout, UA/EN, enlarged text, hero/story separation, touch targets, menu, category filters, full-card details, keyboard access, independent favorites, passive AR badges and AR link');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
