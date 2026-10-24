# MATRIX 3D & AR — deployment, quality and operator guide

## Current implementation status
**Implemented:** secure draft and version storage; private rights-attested JPG/PNG reference uploads;
self-contained GLB + USDZ upload; checks of source file contents and geometry; admin review
with manufacturer dimension matching; public GLB/USDZ only for explicitly approved models;
Next.js <model-viewer> touch/360°/zoom/fullscreen overlay; native AR launch on supported
Android/iPhone; server-side and client-side dimensions validation; production CI checks;
GitHub Pages **concept-only GLB** for Hilton-2.

**Not implemented / not verified:** a photogrammetry / image-to-3D ML model, real reconstruction
from multiple photographs, automatic accurate USDZ conversion, room mesh collision detection,
reliable camera-based room tape-measuring, device-hardware testing on iOS and Android.
Do not advertise these features as available.

## Pilot MATRIX sofa — Hilton-2
Public source provides **width 2800mm** and **depth 1800mm**.
The exact **height is not verified**. This is a hard AR approval blocker.

For mobile Pages usability testing, `scripts/3d/generate_hilton2_concept.py` generates
`preview/models/hilton-2-concept.glb`. The 3D geometry has an **illustrative 850mm
height** and invented internal upholstery/shape. It is not reconstructed from photographs,
not an authentic 3D product representation, and must **never** be used for 1:1 room sizing.
The concept appears only in the Pages preview and is clearly labelled **draft / no AR**.
No USDZ for this concept is produced.

When confirmed height and sufficient licensed photographs are available, replace the
conceptual geometry with a reconstructed/modelled GLB and corresponding reviewed USDZ,
then upload through the admin review flow.

## Confirm product dimensions
In the real application: `/admin/3d` → type product slug →
fill width / depth / height **in millimetres** → affirm producer measurement → Save.
Missing values must stay null. Saving new dimensions automatically withdraws the
approval of earlier 3D versions. Approval requires all 3 manufacturer-confirmed values.
Manual volume measurements on compatible phones are indicative, not guarantees.

## File and coordinate contract
- **GLB 2.0** must contain embedded buffer and textures with no external URIs.
- Scene coordinates: **X = width, Y = vertical height, Z = depth**, in **metres**.
- Ground contact at **Y = 0**, model centered horizontally.
- Static unskinned triangle mesh, positions as float32 VEC3.
- Embedded position data, no external dependencies, animations, sparse accessors
  or unsupported compressed extensions. Use standard glTF export without Draco/Meshopt
  for first approved releases; optimize only with a verified compatible pipeline.
- GLB binary positions are measured by the Go service from actual vertices, and compared
  to producer dimensions within 1% or 5mm. Metadata min/max alone are not trusted.
- USDZ must be an **uncompressed** valid USD package with a root USD scene first.
  This server checks package structure, **not** full USD geometry congruence.
  A human reviewer must independently check USDZ on Apple hardware.
- Test floor placement and lighting on the target devices before publication.

## Administrator workflow
1. Log into `/admin` using a securely bootstrapped admin. Go to `/admin/3d`.
2. Select the existing product slug, e.g. `hilton-2`. No duplicate product is created.
3. Enter confirmed width, depth, height in mm. **Never invent missing height**.
4. Create a new 3D draft. Describe photo rights, reference sources and modelling method.
5. Upload source photos (JPG or PNG, up to 15 MB each) with specific rights attestations.
6. Generate a real mesh externally using photogrammetry, authored Blender geometry
   or a licensed image-to-3D pipeline. Perform visual QA from multiple angles.
7. Upload finished **GLB**, maximum 50 MB; then **USDZ** if iPhone AR is needed.
8. Review the measured dimensions and compare with the manufacturer and photos.
9. Record notes. Check license rights and independently verified geometry. For AR,
   check that USDZ is exactly the same size and works in Apple Quick Look.
10. Approve. Only now does the public API expose its files and show the 3D/AR viewer.

An approved model cannot be replaced in place. Start a fresh version. Disabling an
approved model immediately removes its public URLs. Changing product dimensions
withdraws approval from prior versions.

## Runtime and security
```sh
docker compose up -d db
docker compose exec -T db psql -U matrix -d matrix < database/migrations/001_init.sql
docker compose exec -T db psql -U matrix -d matrix < database/migrations/002_operations.sql
docker compose exec -T db psql -U matrix -d matrix < database/migrations/003_product_3d.sql
docker compose exec -T db psql -U matrix -d matrix < database/migrations/004_3d_photo_sources.sql
docker compose up -d --build api web
```

`MODEL_STORAGE_DIR` is a private path. Docker Compose binds `/data/3d` as a
persistent named volume `models3d`. Back up model files together with PostgreSQL.
Never store private drafts in the `preview/` folder or in public source control.

Allowed photo formats: JPEG / PNG with dimensions constrained to <=7000x7000 and
<=28 million pixels. Allowed model formats: GLB (<50 MB) and USDZ (<70 MB), validated
before storing. Admin operations require valid secure sessions and same-origin requests.
Production requires HTTPS, COOKIE_SECURE=true, storage access restriction, backups,
malware scanning where available, and request-size limits at the proxy.

## API contracts
Public:
- `GET /api/v1/models/{slug}`: 404 until approved/rights/measurements published.
- `GET /api/v1/models/assets/{uuid}/model.glb`: verified published model.
- `GET /api/v1/models/assets/{uuid}/model.usdz`: only if enabled and reviewed for AR.

Authenticated admin (requires secure session):
- `GET /api/v1/admin/models?slug=hilton-2`
- `POST /api/v1/admin/models` JSON `{"slug":"hilton-2","notes":"licensed photos"}`
- `POST /api/v1/admin/products/{slug}/dimensions` JSON with width_mm/depth_mm/height_mm
- `POST /api/v1/admin/models/{uuid}/files/glb` multipart file `model`.
- `POST /api/v1/admin/models/{uuid}/files/usdz` multipart file `model`.
- `GET /api/v1/admin/models/{uuid}/file/model.glb` draft/approved preview.
- `POST /api/v1/admin/models/{uuid}/photos` multipart `photo`, `source_notes`,
   `rights_confirmed=true`. Photos remain private.
- `GET /api/v1/admin/models/{uuid}/photos`: photo metadata.
- `GET /api/v1/admin/models/photos/{photoUUID}`: authorized photo preview.
- `POST /api/v1/admin/models/{uuid}/review` JSON with `action` approve/reject/disable,
  `rights_confirmed`, `geometry_confirmed`, `enable_ar`, `usdz_scale_confirmed`, `notes`.

## Device testing and AR safety
- iOS: Safari with Apple AR Quick Look; verified .usdz and MIME `model/vnd.usdz+zip`.
- Android: compatible Google Scene Viewer, Play Services for AR; GLB.
- Unsupported browser: standalone touch 3D remains accessible, AR CTA disabled.
- `ar-scale=fixed` prevents pinch-based visual resizing in compatible modes;
  some native AR launchers may have different behavior.
- Model dimensions reflect confirmed bounding box, but actual AR camera placement
  may drift; available phone sensors do not replace a tape measure.

### External references
- https://modelviewer.dev/docs/
- https://developer.apple.com/documentation/arkit/previewing-a-model-with-ar-quick-look
- https://developers.google.com/ar/develop/scene-viewer
- https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

## Verification before claiming the feature complete
- Full browser production build and Go unit tests.
- Actual source photo/rights audit and manufacturer width/depth/**height**.
- Physically check both GLB and USDZ against real item, measure all 3 axes.
- Open public approved asset URLs only after review.
- Test AR placement on at least one supported iPhone and Android device.
- Record known error tolerance and approximate floor-detection accuracy.
- Confirm that private drafts never resolve via public links.
- Run full HTTPS staging QA and mobile accessibility tests.
