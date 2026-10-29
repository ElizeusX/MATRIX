# Product photo branding

All 66 main photographs and 358 unique gallery photographs use a centered,
colorless glass MATRIX watermark. The mark is derived from the supplied
`Isolated MATRIX Logo with Gold M(2).png`: folded M, MATRIX wordmark and
«МЕБЛІ ВІД ВИРОБНИКА» tagline. Image generation changed its material to clear
glass. The generated PNG has real alpha transparency, without a background plate.
It is applied at 28% opacity, 30% of photograph width, capped at 34% of height,
with the watermark rectangle centered horizontally and vertically.

The corner logos have been removed. For this migration, the affected corner
rectangles were copied from the exact original source JPEGs, verified against
the source SHA-256 recorded during the previous update. These rectangles do not
overlap the earlier legacy-logo cleanup. No new inpainting is used in this
migration. The previous reviewed cleanup at the center of each photo is retained.

Lossless WebP output retains original dimensions and every pixel outside the
old corner rectangle and new centered watermark rectangle. The migration checks
all of these pixels and verifies restored corner pixels against the originals.
Both storefront copies are byte-identical. Every photograph has a new
`-glass-v2.webp` filename to refresh browser caches, including gallery images.

`data/product-watermarks.json` records source and output hashes, dimensions,
previous output hashes, old corner bounds, new centered bounds, and source URLs.
Original manufacturer URLs remain in `sourceImages` for provenance;
storefront `images` contain local paths. Database migration 009 updates existing
primary media keys after migration 008, preserving row IDs and order history.
Fresh database seeds already use the new keys.

## Reproduce the one-time corner-to-center migration

The migration requires the v1 catalog, manifest and photographs from commit
`51bd47b4b0ee9e6c3340d2ef93569ed3d9a4c19d`, together with the current glass PNG
at `preview/media/matrix-product-watermark.png`. Keep original JPEG downloads
outside git. The script downloads only checksum-matching originals and stages
the whole batch before changing storefront photos.

```sh
npm ci --prefix scripts/media
node scripts/media/center_watermarks.cjs --cache ../source-photos
python scripts/import/check_catalog.py
python scripts/media/check_watermarks.py
```

The migration intentionally rejects v2 manifests to prevent applying another
watermark to an already-processed photograph. Its Sharp dependency is pinned in
`scripts/media/package-lock.json`.

## Rebuild from original photographs

The original legacy stamp was burned into the source JPEGs. The previous
localized reconstruction remains a reconstruction, not recovered original
content. To rebuild from scratch, install `scripts/media/requirements.txt`,
retain the original photo cache, and download `lama_fp32.onnx` from
https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx.
Expected SHA-256:
`1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6`.

```sh
python scripts/media/refresh_watermarks.py --cache ../original-photo-cache --model ../lama_fp32.onnx --force
python scripts/import/check_catalog.py
python scripts/media/check_watermarks.py
```

The rebuild uses the current glass PNG and centered placement. Completed v2
photos are reused only when both their output hash and the glass-logo hash match.
Low-contrast legacy detections are in `data/product-watermark-overrides.json`.
Model weights and original download caches must not be committed.

The original model is based on the Apache-2.0 LaMa project:
https://github.com/advimman/lama and https://github.com/Carve-Photos/lama.
The legacy alpha reference was derived from the manufacturer's raster logo at
https://matrix-mebli.com/wp-content/uploads/2023/11/logo_.png. It is used only to
locate the old stamp, never displayed as branding.

## Glass asset generation

The built-in image-generation tool edited the user's attached logo with real
transparent output. The generation instruction was:

> Edit the attached MATRIX logo into a transparent clear-glass watermark asset
> for furniture photographs. Preserve the exact distinctive folded M silhouette,
> exact MATRIX wordmark, and exact Ukrainian tagline «МЕБЛІ ВІД ВИРОБНИКА», the
> same proportions, lettering and arrangement. Change only the material:
> colorless crystal glass with thin white and pale gray beveled edges, restrained
> specular highlights, translucent interior, subtle frosted glass lettering,
> almost no shadow. Remove the gold color and black fill from the logo.
> Everything outside the logo including the gaps between letters must be
> genuinely transparent alpha. No plate, no rectangle, no backdrop, no
> checkerboard, no product or scene. Front-facing flat logo, centered, tight clean
> margins, high resolution. This is a reusable subtle glass watermark, not a solid
> white or gold brand logo. Ensure the M and both text lines remain legible and accurate.

Catalog reimports reuse reviewed mappings for unchanged source checksums.
