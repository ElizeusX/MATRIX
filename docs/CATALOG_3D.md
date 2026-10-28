# Catalog 3D model implementation

The existing Hilton-2 pilot is supplemented with 65 distinct, reproducible,
photo-guided draft models. These are authored surface studies, not photogrammetry,
engineering drawings, or a guarantee of exact fabric/geometry.

## Sources and geometry

`catalog_profiles.py` has one explicit profile for every non-pilot product,
reviewed against its local primary photo. No random colors, handedness or seat
counts are used. Double beds and daybeds use separate builders. Bed headboards
include horizontal, vertical, grid and diagonal patterns; slatted frames are open
where the source photo shows them. Sofa profiles select loose/tufted/grid/headrest
cushions, straight/L/U layouts and visible arm details. Internal mechanisms and
hidden hardware are not modeled. Fabrics are procedural approximations.

`catalog_surfaces.py` builds crowned rounded panels with smooth welded normals,
seam piping and embedded base-color/normal maps. GLB has optional sheen with PBR
fallback. USDZ uses the same baked vertices, metre units, Y up, floor origin,
uncompressed USDC/texture entries and 64-byte alignment. GLB files are under 3 MiB
for the added models. USD uses woven diffuse texture; glTF also has normal/sheen.

## Dimensions and publication

- 47 added products have usable numeric catalog width/depth; height is estimated
  from the authored profile. Together with Hilton-2, 48 offer estimated AR.
- 18 added products have absent/ambiguous source dimensions. Visual configuration
  estimates are stored separately, shown with ≈ labels, and never enable AR.
- Every added manifest stays `status: draft`, `geometry_verified: false`,
  `height_mm: null`. Estimates do not grant approval or precise room measuring.
- Browser AR requires a matching loaded mesh, enabled estimated-preview flag,
  GLB/USDZ pair and compatible device. Unsupported browsers retain 3D viewing.
- Approved API assets remain preferred by Next.js. The local draft fallback has
  its own type/validation and cannot satisfy the approved API contract.

## Reproduce and deploy

See `preview/README.md` for commands. Pages generates assets before deploying;
Next.js workflows generate and sync public files before building. Docker Compose
uses the repository root context and builds assets in a Python stage, then copies
only generated public assets into the Node image.

Independent checks decode real GLB positions/indices/normals and compare exported
USD mesh vertices. They verify product identity, source W/D, estimated H, bounds,
floor placement, texture embedding and USDZ package alignment. Browser tests cover
two viewports and five distinct furniture forms. Device-native AR placement and
manufacturer geometry/size review remain outstanding.

## Shape revision 2

The first catalog pass shared too much construction geometry. Revision 2 replaces
that assembly with explicit photo-specific families and independent seat-module,
back-pillow and stitch-channel counts in `shape_profiles.py`.

- Neo/Molly: continuous upholstered seat/front shells and full back cushions with
  depressed stitch channels. No separate narrow strip seats or floating headrests.
- Loft/Bliss/Hit: tall boxed front modules, narrow arms, sewn edges and loose pillows.
- Hilton-P: left chaise and shorter right corner return with inward-facing back
  cushions; no symmetric pair of full-depth ottomans.
- Delta: continuous asymmetric swept back and one seat; no generic sofa arms or
  row of raised backrest blocks.
- Beds: continuous padded headboards, two half-width banks of slats for doubles,
  and a right-side padded return with correctly oriented slats for daybeds.

`upholstery_shapes.py` sculpts channels, tuft depressions and local compression into
continuous fabric meshes. `photo_shape_review.json` records independent visual
observations for five active representative products. `test_photo_shapes.py` checks those
module counts/proportions and the asymmetric/curved construction. Browser CI captures
the actual model-viewer canvas and `build_photo_review.py` pairs it with each source
photograph for visual review. These checks supplement human photo comparison; they
are not a manufacturer accuracy certification.

New asset names contain `-v2-` so an existing browser/AR cache cannot display the old
geometry after deployment. The manifest selects the matching GLB and USDZ revision.
Dimensions and AR approval status are unchanged.
