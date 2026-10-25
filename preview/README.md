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

## Product-specific photo-guided 3D

All **76 products** have their own 3D view at `3d.html?product=<slug>`.
The Hilton-2 pilot is retained; the other **75** drafts use authored photo profiles
in `scripts/3d/catalog_profiles.py` and `scripts/3d/shape_profiles.py`. Profiles record silhouette, seat count,
chaise orientation, headboard pattern, fabric appearance and visible details.
The models include rounded crowned upholstery, piping, original woven PBR
textures, metal feet, timber accents, shelves and bed slats where pictured.
No manufacturer watermarks or photo pixels are embedded in the models.

These remain **photo-guided drafts**, not scans or manufacturer-approved replicas.
All heights are estimated. **53 products** (including Hilton-2) have usable catalog
width/depth and matching GLB/USDZ exports for explicitly estimated AR. The other
**23** have missing or ambiguous width/depth: all dimensions are labeled estimates,
and AR stays disabled. Source catalog values are never repaired or overwritten
with estimates. Beds show one representative visual configuration, not every size.

```sh
python -m pip install -r scripts/3d/requirements.txt
python scripts/3d/build_catalog_models.py --sync-web
python scripts/3d/test_catalog_models.py
python scripts/3d/test_photo_shapes.py
node scripts/3d/test_ar_policy.cjs
```

Pages builds all model assets before uploading the preview. `--sync-web` also
copies them into Next.js public assets; approved API models take precedence over
the local drafts. Docker Compose generates them in a separate Python build stage.
Generated catalog binaries/manifests are deployment artifacts and are ignored by
Git; the existing Hilton-2 pilot assets remain committed.

For browser smoke tests, start `python -m http.server 8765 --bind 127.0.0.1`
and run `node scripts/3d/test_catalog_viewers.cjs` with Playwright available.
Tests check real WebGL loads for straight, corner, U-shaped, bed and chaise forms,
mobile overflow, language switching, and AR gating. Native Quick Look/Scene Viewer
placement still needs review on actual iPhone/Android devices.

Shape revision 2 uses continuous stitched shells, product-family arm/base proportions,
separate seat/back counts and dedicated curved/corner-return construction. Model URLs
contain `-v2-` to invalidate old cached geometry. CI includes source-photo / real WebGL
comparison images; see `docs/CATALOG_3D.md` for the reviewed shape observations.
