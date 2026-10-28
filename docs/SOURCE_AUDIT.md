# MATRIX catalog import — 2026-10-24

Source: https://matrix-mebli.com/furnitures/

All **10 catalog pages / 76 unique products** were fetched and compared with
https://matrix-mebli.com/wp-sitemap-posts-furniture-1.xml. Both sets contain the
same 76 product URLs. Individual product pages were fetched for every record.

## Manufacturer update — 2026-10-28

Ten discontinued sofas were removed at the manufacturer’s request. The active
snapshot now contains 66 products, 66 primary photos and 360 gallery references.
`data/discontinued-products.json` records their exact slugs; the importer excludes
them even if they remain on the source site. The counts below describe the original
2026-10-24 crawl.

Nine active models received manufacturer-supplied dimension corrections on the
same date. `data/dimension-overrides.json` records these values and takes priority
over older source text during reimport. Unspecified sleeping dimensions remain
unchanged; alternatives in parentheses are displayed in full.

## Imported data

- 76 original Ukrainian product names, source URLs and source dimension strings.
- 19 nonempty product descriptions (materials, filling, frame or mechanisms).
- 76 downloaded primary photographs, using the site's WordPress image CDN at
  width 1200, stored in `preview/media/products/` and `apps/web/public/media/products/`.
- 387 deduplicated gallery image references across product pages. These additional
  images are loaded from the original website; only the primary photos are local.
- Every primary photo has its original URL, download URL and SHA-256 checksum.
- No public prices were found in product price blocks. Availability is unknown.

The active snapshot is `data/catalog.json`. `preview/catalog.js` and
`apps/web/lib/source-catalog.json` are generated copies for the two frontends.
Names and descriptions remain in their source language, including in the English
interface, until editorial translations are supplied.

## Source quality

32 records have flags for ambiguous dimensions, variants or unconfirmed category.
For example, Еллі has `238(2410)х1100`; Ліра-2 has sleeping widths `1400/1600`;
some older products list implausible values such as `15000` or `26200`.
The exact strings are retained. Numeric fields are populated only for simple,
plausible two-dimensional values; variants are not silently reduced to one size.
Category is assigned only when the product name explicitly identifies it. Other
models remain `unspecified` and are visible under All models.

## Integration

The static preview uses all 66 active models, local primary photos, remote gallery
thumbnails, original descriptions, dimensions and a manufacturer-page link.
The Next.js catalog/detail pages use the same snapshot when no live catalog is
returned, and match photos to live products by slug. Live API prices and order
eligibility continue to be authoritative.

The SQL seed adds all 66 active draft products and primary-media records. On existing
products it only fills missing source URLs and descriptions; it does not overwrite
merchant prices, publication, availability or existing descriptions. Existing
nine slugs are preserved. Running the SQL twice does not duplicate records.
No hosted database has been modified by this import.

## Reproduce

Use a fresh cache directory to fetch a new snapshot:

```sh
python -m pip install -r scripts/import/requirements.txt
python scripts/import/crawl_catalog.py --cache /tmp/matrix-catalog-2026-10-24
python scripts/import/check_catalog.py
node --check preview/catalog.js
node --check preview/app.js
```

The crawler fails if catalog pagination and the furniture sitemap differ. Review
source changes, new categories, image formats and record-count assertions before
replacing this snapshot. The source material was imported at the user's request;
this audit records provenance, not ownership of the photographs.
