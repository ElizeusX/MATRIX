// Migrate the reviewed v1 photos without repeating the legacy-logo inpainting.
// npm ci --prefix scripts/media
// node scripts/media/center_watermarks.cjs --cache ../source-photos
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const sharp = require('sharp');
const run = promisify(execFile);
const root = path.resolve(__dirname, '../..');
const bases = ['preview', 'apps/web/public'].map(p => path.join(root, p));
const manifestPath = path.join(root, 'data/product-watermarks.json');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const readJSON = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const json = value => JSON.stringify(value, null, 2) + '\n';
const OPACITY = 0.28;

async function pool(items, count, fn) {
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: count }, async () => {
    while (next < items.length) {
      await fn(items[next++]);
      if (++done % 25 === 0) console.log(`${done}/${items.length}`);
    }
  }));
}

async function main() {
  const cacheIndex = process.argv.indexOf('--cache');
  assert(cacheIndex > 0 && process.argv[cacheIndex + 1], '--cache is required');
  const cache = path.resolve(process.argv[cacheIndex + 1]);
  await fs.mkdir(cache, { recursive: true });
  const manifest = await readJSON(manifestPath);
  assert.equal(manifest.version, 1, 'Migration requires v1 input; v2 is already centered');
  const catalog = await readJSON(path.join(root, 'data/catalog.json'));
  const products = new Map(catalog.products.map(p => [p.slug, p]));
  const logoPath = path.join(bases[0], 'media/matrix-product-watermark.png');
  const logo = await fs.readFile(logoPath);
  const logoMetadata = await sharp(logo).metadata();
  assert(logoMetadata.hasAlpha, 'Glass logo requires genuine alpha transparency');
  const jobs = ['primary', 'gallery'].flatMap(section =>
    Object.entries(manifest[section]).map(([key, entry]) => ({
      section, key, entry,
      url: section === 'primary' ? products.get(key).downloadUrl : entry.sourceUrl,
      source: path.join(cache, `${entry.sourceSha256}.jpg`),
      staged: path.join(cache, `${section}-${hash(key)}-centered.webp`),
    })));

  console.log(`Downloading ${jobs.length} checksum-verified originals`);
  await pool(jobs, 8, async job => {
    let data = await fs.readFile(job.source).catch(() => null);
    if (!data || hash(data) !== job.entry.sourceSha256) {
      const temporary = `${job.source}.download-${job.section}-${hash(job.key).slice(0, 10)}`;
      await run('curl', ['--fail', '--location', '--silent', '--show-error',
        '--retry', '2', '--max-time', '60', new URL(job.url).href, '-o', temporary]);
      data = await fs.readFile(temporary);
      assert.equal(hash(data), job.entry.sourceSha256, `Source changed: ${job.key}`);
      await fs.rename(temporary, job.source);
    }
  });

  console.log('Restoring original corner pixels and applying centered glass logo');
  await pool(jobs, 2, async job => {
    const { entry } = job;
    const beforeBytes = await fs.readFile(path.join(bases[0], entry.path));
    assert.equal(hash(beforeBytes), entry.sha256, `Reviewed input changed: ${entry.path}`);
    const before = await sharp(beforeBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const original = await sharp(job.source).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const [w, h] = entry.size;
    assert.deepEqual([before.info.width, before.info.height, before.info.channels], [w, h, 3]);
    assert.deepEqual([original.info.width, original.info.height, original.info.channels], [w, h, 3]);
    const clean = Buffer.from(before.data);
    const [x1, y1, x2, y2] = entry.brandBounds;
    const [lx1, ly1, lx2, ly2] = entry.legacyBounds;
    assert(x2 <= lx1 || lx2 <= x1 || y2 <= ly1 || ly2 <= y1,
      `Corner overlaps the reviewed legacy cleanup: ${entry.path}`);
    // The source checksum matches the v1 original. Copy its untouched corner;
    // retain the already-reviewed reconstruction of the old central stamp.
    for (let y = y1; y < y2; y++) {
      const start = (y * w + x1) * 3;
      original.data.copy(clean, start, start, (y * w + x2) * 3);
    }
    let width = Math.max(80, Math.round(w * 0.30));
    let height = Math.round(width * logoMetadata.height / logoMetadata.width);
    if (height > h * 0.34) {
      height = Math.round(h * 0.34);
      width = Math.round(height * logoMetadata.width / logoMetadata.height);
    }
    const left = Math.round((w - width) / 2), top = Math.round((h - height) / 2);
    const mark = await sharp(logo).resize(width, height).ensureAlpha().raw().toBuffer();
    for (let i = 3; i < mark.length; i += 4) mark[i] = Math.round(mark[i] * OPACITY);
    const output = await sharp(clean, { raw: { width: w, height: h, channels: 3 } })
      .composite([{ input: mark, raw: { width, height, channels: 4 }, left, top }])
      .webp({ lossless: true, effort: 4 }).toBuffer();
    const decoded = await sharp(output).removeAlpha().raw().toBuffer();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const center = x >= left && x < left + width && y >= top && y < top + height;
      const corner = x >= x1 && x < x2 && y >= y1 && y < y2;
      if (center) continue;
      const expected = corner ? original.data : before.data;
      const i = (y * w + x) * 3;
      assert(decoded[i] === expected[i] && decoded[i+1] === expected[i+1] && decoded[i+2] === expected[i+2],
        `Unexpected pixel change: ${entry.path} at ${x},${y}`);
    }
    await fs.writeFile(job.staged, output);
    job.updated = { ...entry, branded: true, previousSha256: entry.sha256, sha256: hash(output),
      cornerRemovedBounds: entry.brandBounds, brandBounds: [left, top, left + width, top + height],
      cornerSourceUrl: job.url, cornerSourceSha256: entry.sourceSha256, style: 'centered-glass-v2' };
  });

  // Commit the complete verified batch to both storefront trees only after all
  // downloads, pixel checks and encodes have succeeded.
  for (const job of jobs) {
    for (const base of bases) await fs.copyFile(job.staged, path.join(base, job.entry.path));
    manifest[job.section][job.key] = job.updated;
  }
  await fs.copyFile(logoPath, path.join(bases[1], 'media/matrix-product-watermark.png'));
  manifest.version = 2;
  manifest.logoSha256 = hash(logo);
  manifest.style = { name: 'centered-glass-v2', position: 'center', opacity: OPACITY,
    widthRatio: 0.30, maxHeightRatio: 0.34, material: 'colorless translucent glass' };
  await fs.writeFile(manifestPath, json(manifest));
  for (const product of catalog.products) product.imageSha256 = manifest.primary[product.slug].sha256;
  for (const p of ['data/catalog.json', 'apps/web/lib/source-catalog.json'])
    await fs.writeFile(path.join(root, p), json(catalog));
  await fs.writeFile(path.join(root, 'preview/catalog.js'),
    '// Generated by scripts/import/build_catalog.py.\nwindow.MATRIX_CATALOG = ' +
    JSON.stringify(catalog.products, null, 2) + ';\n');
  await versionPaths();
  console.log(`PASS: ${jobs.length} centered photos; exact source corners and unchanged surrounding pixels`);
}

async function versionPaths() {
  const manifest = await readJSON(manifestPath);
  assert.equal(manifest.version, 2);
  const catalog = await readJSON(path.join(root, 'data/catalog.json'));
  const migrations = [];
  for (const section of ['primary', 'gallery']) for (const entry of Object.values(manifest[section])) {
    const oldPath = entry.path;
    if (oldPath.endsWith('-glass-v2.webp')) continue;
    entry.path = oldPath.replace(/\.webp$/, '-glass-v2.webp');
    for (const base of bases) await fs.rename(path.join(base, oldPath), path.join(base, entry.path));
    if (section === 'primary') migrations.push([oldPath, entry.path]);
  }
  for (const p of catalog.products) {
    p.image = manifest.primary[p.slug].path;
    p.images = p.sourceImages.map(url => manifest.gallery[url].path);
  }
  await fs.writeFile(manifestPath, json(manifest));
  for (const p of ['data/catalog.json', 'apps/web/lib/source-catalog.json'])
    await fs.writeFile(path.join(root, p), json(catalog));
  await fs.writeFile(path.join(root, 'preview/catalog.js'),
    '// Generated by scripts/import/build_catalog.py.\nwindow.MATRIX_CATALOG = ' +
    JSON.stringify(catalog.products, null, 2) + ';\n');
  if (migrations.length) {
    const seedPath = path.join(root, 'database/seeds/verified_catalog.sql');
    let seed = await fs.readFile(seedPath, 'utf8');
    for (const [oldPath, newPath] of migrations) seed = seed.replaceAll(`'${oldPath}'`, `'${newPath}'`);
    await fs.writeFile(seedPath, seed);
    const rows = migrations.map(([oldPath, newPath]) => `  ('${oldPath}', '${newPath}')`).join(',\n');
    await fs.writeFile(path.join(root, 'database/migrations/009_centered_glass_watermarks.sql'),
      '-- Refresh existing primary media keys after migration 008; preserve IDs and order history.\nBEGIN;\n' +
      'UPDATE product_media AS media SET object_key = mapping.new_key\nFROM (VALUES\n' + rows +
      '\n) AS mapping(old_key, new_key)\nWHERE media.object_key = mapping.old_key;\nCOMMIT;\n');
  }
}

module.exports = { versionPaths };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
