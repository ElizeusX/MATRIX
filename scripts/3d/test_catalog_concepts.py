#!/usr/bin/env python3
"""Validate that every dimensioned MATRIX catalog product got ITS OWN valid draft GLB.
Independent of the storefront. Full AR use is explicitly forbidden for these concepts.
"""
import json
import math
import pathlib
import struct

from build_catalog_concepts import OUTPUT, product_records


def inspect(path: pathlib.Path, product):
    data = path.read_bytes()
    if len(data) < 32 or data[:4] != b"glTF":
        raise AssertionError(f"{path}: not GLB")
    version, total = struct.unpack_from("<II", data, 4)
    if version != 2 or total != len(data):
        raise AssertionError(f"{path}: corrupt GLB header")
    json_len, kind = struct.unpack_from("<II", data, 12)
    if kind != 0x4E4F534A:
        raise AssertionError(f"{path}: missing JSON chunk")
    meta = json.loads(data[20:20 + json_len])
    extras = meta["asset"]["extras"]
    assert extras["product_slug"] == product["slug"], product["slug"]
    assert extras["accurate_AR"] is False
    assert extras["room_measurement_allowed"] is False
    assert extras["source_catalog_width_mm"] == product["width"]
    assert extras["source_catalog_depth_mm"] == product["depth"]
    assert extras["height_m_UNVERIFIED"] == 0.85
    vertices = []
    offset_bin = 20 + json_len
    bin_len, bin_type = struct.unpack_from("<II", data, offset_bin)
    assert bin_type == 0x004E4942 and len(data) == offset_bin + 8 + bin_len
    binary = data[offset_bin + 8:]
    # POSITION accessors only. Normal vectors are directions, not vertices,
    # and would incorrectly extend the bounding box to +/-1 meter.
    position_indices = {
        primitive["attributes"]["POSITION"]
        for mesh in meta["meshes"]
        for primitive in mesh["primitives"]
    }
    for index in position_indices:
        accessor = meta["accessors"][index]
        if accessor.get("type") != "VEC3" or accessor.get("componentType") != 5126:
            raise AssertionError("Unsupported POSITION accessor")
        view = meta["bufferViews"][accessor["bufferView"]]
        start = view["byteOffset"] + accessor.get("byteOffset", 0)
        for i in range(accessor["count"]):
            position = struct.unpack_from("<fff", binary, start + 12 * i)
            assert all(math.isfinite(v) for v in position)
            vertices.append(position)
    assert vertices, product["slug"]
    width = (max(v[0] for v in vertices) - min(v[0] for v in vertices)) * 1000
    depth = (max(v[2] for v in vertices) - min(v[2] for v in vertices)) * 1000
    height = (max(v[1] for v in vertices) - min(v[1] for v in vertices)) * 1000
    assert abs(width - product["width"]) <= 1.5, (product["slug"], width, product["width"])
    assert abs(depth - product["depth"]) <= 1.5, (product["slug"], depth, product["depth"])
    assert abs(height - 850) <= 1.5, (product["slug"], height)
    assert len(meta["meshes"]) >= 10, (product["slug"], len(meta["meshes"]))


def main():
    records = list(product_records())
    expected = {p["slug"] + "-concept.glb" for p in records}
    actual = {p.name for p in OUTPUT.glob("*-concept.glb")}
    missing = expected - actual
    if missing:
        raise SystemExit("Missing concept models: " + ", ".join(sorted(missing)))
    # The legacy Hilton file is legitimately overwritten by the generalized builder.
    for p in records:
        inspect(OUTPUT / (p["slug"] + "-concept.glb"), p)
    print(f"SUCCESS: {len(records)} distinct product concepts, GLB integrity and exact W/D extents; AR disabled.")


if __name__ == "__main__":
    main()
