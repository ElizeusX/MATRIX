#!/usr/bin/env python3
"""Basic independent GLB archive checks for the explicitly unverified 3D draft."""
import json
import pathlib
import struct
import sys

def validate(path: pathlib.Path):
    data = path.read_bytes()
    if len(data) < 32 or data[:4] != b"glTF":
        raise SystemExit("not a GLB file")
    version, total = struct.unpack_from("<II", data, 4)
    if version != 2 or total != len(data):
        raise SystemExit("invalid GLB header or length")
    size, kind = struct.unpack_from("<II", data, 12)
    if kind != 0x4E4F534A or 20 + size > len(data):
        raise SystemExit("missing glTF JSON chunk")
    doc = json.loads(data[20:20 + size])
    if doc.get("asset", {}).get("extras", {}).get("accurate_AR") is not False:
        raise SystemExit("draft is incorrectly marked AR-ready")
    if doc.get("asset", {}).get("extras", {}).get("height_m_UNVERIFIED") != 0.85:
        raise SystemExit("draft illustrative height should be explicit")
    if len(doc.get("meshes", [])) < 10:
        raise SystemExit("the pilot must have a structured sofa mesh, not a box")
    print(f"Checked concept GLB: {len(doc['meshes'])} mesh parts, {len(data):,} bytes, AR disabled")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: check_glb_header.py <model.glb>")
    validate(pathlib.Path(sys.argv[1]))
