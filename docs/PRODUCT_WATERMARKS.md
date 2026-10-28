# Product photo branding

Catalog cards, product pages and galleries use local, lossless WebP photographs.
The new watermark is the supplied gold M, MATRIX wordmark and Ukrainian tagline,
trimmed to its visible bounds, at 72% opacity in the bottom-right corner. Photos
without a detected legacy mark retain their original bytes and receive no new mark.

`data/product-watermarks.json` records every source URL, source/output checksum,
original dimensions, detector confidence and the two changed bounding rectangles.
The preview and Next.js asset copies are byte-identical. Original manufacturer
URLs remain in `sourceImages` for provenance; storefront `images` are local paths.

## Rebuild

1. Install `scripts/media/requirements.txt` in an isolated Python environment.
2. Download `lama_fp32.onnx` from
   https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx.
   Expected SHA-256:
   `1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6`.
3. Run from the repository root:

   ```sh
   python scripts/media/refresh_watermarks.py --cache ../source-photos --model ../lama_fp32.onnx
   python scripts/import/check_catalog.py
   python scripts/media/check_watermarks.py
   ```

The external cache retains original photographs and supports forced rebuilds.
Neither model weights nor temporary source downloads belong in git. Completed
items are checkpointed for resuming an interrupted batch. `--force` requires the
original cache. Review low-confidence detections and image contact sheets before
merging a regenerated batch. Explicit, visually checked low-contrast cases are
recorded in `data/product-watermark-overrides.json`.

## Restoration limits

The old logo is burned into compressed source photos. Content beneath it is a
localized reconstruction, not a recovered original. A fixed LaMa ONNX model fills
only a fitted glyph mask with a narrow margin for JPEG edge artifacts. Surrounding
pixels and image dimensions remain unchanged. Lossless output and an assertion
verify pixel equality outside that mask and the new logo rectangle. LaMa may
reconstruct fabric texture or a seam beneath an old mark; it does not redraw the
whole photograph. The model is based on the Apache-2.0 LaMa project:
https://github.com/advimman/lama and ONNX export
https://github.com/Carve-Photos/lama.

The legacy alpha reference was derived from the manufacturer's existing raster
logo at https://matrix-mebli.com/wp-content/uploads/2023/11/logo_.png, isolating
its silhouette from a smaller stamp on the logo image itself. It is used only to
locate the old watermark, never displayed as branding.

Catalog reimports reuse mappings only for unchanged source checksums. New source
photographs require running the media batch again. Database migration 008 updates
existing primary media keys while retaining each row's identifiers and source URL.
