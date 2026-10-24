# MATRIX static preview

Open `index.html` locally or serve this directory with `python -m http.server 8000`.
The preview includes all 76 imported models, local primary photos, gallery links,
source descriptions and exact dimensions, search, category filters and favorites.
`catalog.js` must load before `app.js`; both work without a catalog API.

Additional gallery photos use the source website and require an Internet connection.
Prices and checkout are disabled. The hero/category artwork remains decorative.
Product names and descriptions retain the original Ukrainian text in both UI languages.

See [source audit](../docs/SOURCE_AUDIT.md) for the import and validation workflow.
Merging changes to master can trigger the existing GitHub Pages workflow.

## Product-specific 3D concept viewer

The catalog displays **View in 3D / Дивитися у 3D** below every product with
a valid numeric overall width and depth. Each button links to a **product-specific**
page: `3d.html?product=<product-slug>` (never to the Hilton-2 model for other products).
The product detail dialog shows the same link.

The Pages workflow builds a separate `preview/models/<slug>-concept.glb` for
every eligible catalog product by running:

```sh
python3 scripts/3d/build_catalog_concepts.py
python3 scripts/3d/test_catalog_concepts.py
```

Current source catalog: 76 products, **53** with usable overall width and
depth. Each concept's bounding box matches the imported numeric width/depth.
However, **height = 0.85m is an explicit unverified design assumption for all
concepts**. Cushion placement, materials, backrest details, left/right chaise
orientation and other geometry are procedurally illustrative — **they have
not been reconstructed from individual photos**. A reference photo is displayed
beside the 3D concept to make that distinction clear.

**AR is intentionally disabled for ALL generated concept GLBs** and no
USDZ is generated. Room-scale AR will be available only after authentic
photo-based modeling, a verified manufacturer height, geometry review, asset
rights approval, and real device testing.

To test: https://elizeusx.github.io/MATRIX/#products → choose a model with
dimensions → **Дивитися у 3D**. Direct example:
https://elizeusx.github.io/MATRIX/3d.html?product=molly.
