#!/usr/bin/env python3
"""Build separate, clearly labeled 3D *concepts* for every MATRIX catalog item
with trustworthy numeric width and depth. These are NOT photogrammetry and
must NEVER be enabled for full-scale AR or represented as exact furniture.

Generated files are ephemeral GitHub Pages build artifacts, not committed binary
assets. Every file corresponds to its own product slug and factual W/D. Height
is a deliberately arbitrary visual concept (0.85 m), never a manufacturer fact.
"""
import argparse
import hashlib
import json
import pathlib
from generate_hilton2_concept import Writer

ROOT = pathlib.Path(__file__).resolve().parents[2]
CATALOG = ROOT / "preview/catalog.js"
OUTPUT = ROOT / "preview/models"
CONCEPT_HEIGHT_M = 0.85  # UNVERIFIED for every model; AR always disabled.


def product_records():
    raw = CATALOG.read_text(encoding="utf-8")
    begin = raw.index("[")
    end = raw.rindex("]")
    rows = json.loads(raw[begin:end + 1])
    for p in rows:
        width = p.get("width")
        depth = p.get("depth")
        slug = p.get("slug")
        if (
            isinstance(width, int) and not isinstance(width, bool)
            and isinstance(depth, int) and not isinstance(depth, bool)
            and 300 <= width <= 8000 and 300 <= depth <= 6000
            and isinstance(slug, str) and slug and len(slug) < 130
            and all(c in "abcdefghijklmnopqrstuvwxyz0123456789-" for c in slug)
        ):
            yield p


def synthesize(p):
    w, d = p["width"] / 1000, p["depth"] / 1000
    half = w / 2
    rear = d / 2
    front = -d / 2
    seed = hashlib.sha256(p["slug"].encode("utf8")).digest()
    material_offset = seed[0] % 5
    writer = Writer()

    # All fabrics, arm profiles and backrests are stylistic placeholders.
    # Bounding box remains W x D x 0.85 m even for long corner sofas.
    height = CONCEPT_HEIGHT_M
    arm_width = min(0.18, w * 0.07)
    back_depth = min(0.23, d * 0.19)
    is_corner = p.get("category") == "corner-sofas"
    unknown = p.get("category") == "unspecified"
    chaise_on_right = (seed[1] % 2) == 0

    # Studio upholstered base. The real upholstery layout is NOT known.
    writer.box("concept_frame", (-half, 0.15, front),
               (half, 0.37, rear - 0.08), 0)
    for pos in (-half + 0.095, half - 0.095):
        for z in (front + 0.11, rear - 0.13):
            writer.box("concept_foot_%d" % len(writer.meshes),
                       (pos - 0.037, 0, z - 0.038),
                       (pos + 0.037, 0.17, z + 0.038), 2)

    # Back (not reconstructed; the heights and depths are merely for visual UX).
    writer.box("concept_back",
               (-half, 0.35, rear - back_depth),
               (half, height, rear), 0)

    seat_width = w - arm_width * 2
    segment_count = max(2, min(5, round(w / 0.76)))
    for ix in range(segment_count):
        x0 = -half + arm_width + ix * seat_width / segment_count + 0.013
        x1 = -half + arm_width + (ix + 1) * seat_width / segment_count - 0.013
        z0 = front + 0.13
        if is_corner:
            # A left/right chaise is an intentionally invented visual cue; it
            # does NOT tell the buyer which side the actual sofa occupies.
            chaise_ix = segment_count - 1 if chaise_on_right else 0
            if ix != chaise_ix:
                z0 = max(front + 0.13, rear - min(0.86, d * 0.63))
        elif d > 1.3:
            z0 = front + 0.11
        writer.box("concept_seat_%d" % ix, (x0, 0.37, z0),
                   (x1, 0.50, rear - back_depth - 0.04),
                   (material_offset + ix) % 2)

        cx = (x0 + x1) / 2
        radx = max(0.09, (x1 - x0) / 2 - 0.012)
        radz = min(back_depth * 0.65, 0.15)
        writer.cushion("concept_back_cushion_%d" % ix,
                       (cx, 0.63, rear - back_depth - radz * 0.35),
                       (radx, 0.19, radz), 1)

    writer.box("concept_left_arm",
               (-half, 0.34, front + 0.07),
               (-half + arm_width, 0.70, rear - 0.03), 0)
    writer.box("concept_right_arm",
               (half - arm_width, 0.34, front + 0.07),
               (half, 0.70, rear - 0.03), 0)

    if unknown:
        # The source category is ambiguous. Nothing here is category evidence.
        writer.cushion("concept_generic_pillow", (0, 0.60, 0.08),
                       (min(w * 0.1, 0.24), 0.19, 0.08), 3)
    else:
        pillow_x = half * (0.62 if seed[2] % 2 else -0.62)
        writer.cushion("concept_decorative_pillow",
                       (pillow_x, 0.64, rear - back_depth - 0.20),
                       (min(0.20, w / 8), 0.18, 0.075), 3)

    return writer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(OUTPUT))
    args = parser.parse_args()
    folder = pathlib.Path(args.output)
    folder.mkdir(parents=True, exist_ok=True)
    records = list(product_records())
    seen = set()
    for p in records:
        if p["slug"] in seen:
            raise SystemExit(f"Duplicate product slug: {p['slug']}")
        seen.add(p["slug"])
        writer = synthesize(p)
        dest = folder / (p["slug"] + "-concept.glb")
        writer.output(dest)
    print(f"Concept-only GLB models generated: {len(records)}. AR disabled for all; height not verified.")
    if len(records) < 10:
        raise SystemExit("Unexpectedly small catalog: check imports")


if __name__ == "__main__":
    main()
