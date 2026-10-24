#!/usr/bin/env python3
"""Produce a clearly labelled, conceptual GLB sofa for mobile UX testing.

This is NOT photogrammetry, NOT a verified replica, and NOT approved for AR.
The width and depth of MATRIX Hilton-2 are supported by public catalog facts;
0.85m height and all cushion/arm details are fictional, illustrative geometry.
The output MUST remain a draft and must NOT be auto-approved/published as 1:1 AR.
Runs offline with the Python standard library (no GPU or Blender required).
"""

from __future__ import annotations
import argparse
import json
import math
import pathlib
import struct

PRODUCT_ID = "hilton-2"
WIDTH_M = 2.8      # verified by source
DEPTH_M = 1.8      # verified by source
CONCEPT_HEIGHT_M = 0.85  # illustrative ONLY: no manufacturer height confirmed

class Writer:
    def __init__(self):
        self.buf = bytearray()
        self.views = []
        self.accessors = []
        self.meshes = []
        self.nodes = []

    def append(self, payload: bytes, target: int) -> int:
        while len(self.buf) % 4:
            self.buf.append(0)
        start = len(self.buf)
        self.buf.extend(payload)
        self.views.append({"buffer": 0, "byteOffset": start, "byteLength": len(payload), "target": target})
        return len(self.views) - 1

    def vec3(self, values: list[tuple[float, float, float]]) -> int:
        raw = struct.pack("<" + "f" * (len(values) * 3), *(coord for p in values for coord in p))
        view = self.append(raw, 34962)
        extents = {
            "min": [min(v[i] for v in values) for i in range(3)],
            "max": [max(v[i] for v in values) for i in range(3)],
        }
        self.accessors.append({
            "bufferView": view, "componentType": 5126, "count": len(values),
            "type": "VEC3", **extents,
        })
        return len(self.accessors) - 1

    def triangles(self, values: list[int]) -> int:
        raw = struct.pack("<" + "H" * len(values), *values)
        view = self.append(raw, 34963)
        self.accessors.append({
            "bufferView": view, "componentType": 5123, "count": len(values), "type": "SCALAR",
            "min": [min(values)], "max": [max(values)],
        })
        return len(self.accessors) - 1

    def mesh(self, name: str, verts, normals, indices, material: int):
        p = self.vec3(verts)
        n = self.vec3(normals)
        i = self.triangles(indices)
        self.meshes.append({
            "name": name,
            "primitives": [{
                "attributes": {"POSITION": p, "NORMAL": n},
                "indices": i,
                "material": material, "mode": 4
            }]
        })
        self.nodes.append({"mesh": len(self.meshes)-1, "name": name})

    def box(self, name: str, low, high, material: int):
        x0,y0,z0=low; x1,y1,z1=high
        faces=[
            ([(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],(0,0,1)),
            ([(x1,y0,z0),(x0,y0,z0),(x0,y1,z0),(x1,y1,z0)],(0,0,-1)),
            ([(x1,y0,z1),(x1,y0,z0),(x1,y1,z0),(x1,y1,z1)],(1,0,0)),
            ([(x0,y0,z0),(x0,y0,z1),(x0,y1,z1),(x0,y1,z0)],(-1,0,0)),
            ([(x0,y1,z1),(x1,y1,z1),(x1,y1,z0),(x0,y1,z0)],(0,1,0)),
            ([(x0,y0,z0),(x1,y0,z0),(x1,y0,z1),(x0,y0,z1)],(0,-1,0)),
        ]
        verts=[];normals=[];indices=[]
        for face,normal in faces:
            start=len(verts);verts.extend(face);normals.extend([normal]*4)
            indices.extend([start,start+1,start+2,start,start+2,start+3])
        self.mesh(name,verts,normals,indices,material)

    def cushion(self, name, center, radii, material: int, rings=11, slices=23):
        # Smooth, rounded ellipsoid, deliberately conceptual rather than a photo-derived shape.
        vertices=[];normals=[];indices=[]
        for row in range(rings+1):
            theta=math.pi*row/rings
            for col in range(slices+1):
                phi=2*math.pi*col/slices
                nx=math.sin(theta)*math.cos(phi)
                ny=math.cos(theta)
                nz=math.sin(theta)*math.sin(phi)
                x=center[0]+radii[0]*nx
                y=center[1]+radii[1]*ny
                z=center[2]+radii[2]*nz
                vertices.append((x,y,z))
                lx=nx/radii[0];ly=ny/radii[1];lz=nz/radii[2]
                length=max(1e-8,math.sqrt(lx*lx+ly*ly+lz*lz))
                normals.append((lx/length,ly/length,lz/length))
        for row in range(rings):
            for col in range(slices):
                a=row*(slices+1)+col
                b=a+slices+1
                indices.extend([a,b,a+1,a+1,b,b+1])
        self.mesh(name,vertices,normals,indices,material)

    def output(self, destination: pathlib.Path):
        materials=[
            ("illustrative_olive_upholstery",[0.43,0.48,0.43,1]),
            ("illustrative_seat_cushions",[0.54,0.59,0.52,1]),
            ("illustrative_leg_frame",[0.19,0.24,0.20,1]),
            ("illustrative_warm_pillows",[0.75,0.72,0.64,1]),
        ]
        doc={
            "asset":{
                "version":"2.0",
                "generator":"MATRIX conceptual sofa draft (not photo reconstruction)",
                "extras":{"approval":"DRAFT_ONLY","accurate_AR":False,"verified_width_m":WIDTH_M,
                          "verified_depth_m":DEPTH_M,"height_m_UNVERIFIED":CONCEPT_HEIGHT_M,
                          "construction":"illustrative, NOT verified product geometry"}
            },
            "scene":0,"scenes":[{"nodes":list(range(len(self.nodes)))}],
            "nodes":self.nodes,"meshes":self.meshes,
            "buffers":[{"byteLength":len(self.buf)}],
            "bufferViews":self.views,"accessors":self.accessors,
            "materials":[{"name":name,"pbrMetallicRoughness":{
                "baseColorFactor":color,"metallicFactor":0,
                "roughnessFactor":0.93}} for name,color in materials],
        }
        j=json.dumps(doc,ensure_ascii=False,separators=(",",":")).encode("utf-8")
        j+=b" " *((-len(j))%4)
        b=bytes(self.buf);b+=b"\x00"*((-len(b))%4)
        length=12+8+len(j)+8+len(b)
        glb=struct.pack("<III",0x46546C67,2,length)+struct.pack("<II",len(j),0x4E4F534A)+j+struct.pack("<II",len(b),0x004E4942)+b
        destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes(glb)
        print(f"CONCEPT ONLY — NOT FOR AR: wrote {destination} ({len(glb):,} bytes)")


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",default="preview/models/hilton-2-concept.glb")
    args=parser.parse_args()
    w=Writer()
    # Entire illustrative shape covers documented overall W=2.8m and D=1.8m.
    # The unverified 0.85m height is explicitly not a product measurement.
    # Understructure.
    w.box("base_span",(-1.30,.14,-.20),(1.30,.32,.79),0)
    w.box("chaise_left",(-1.40,.14,-.90),(-.55,.37,.79),0)
    # Seat cushions
    w.box("seat_right",(-.50,.34,-.17),(1.32,.48,.58),1)
    w.box("seat_chaise",(-1.33,.34,-.82),(-.60,.48,.58),1)
    # Full-width back and upholstered arm profile.
    w.box("back_panel",(-1.40,.35,.61),(1.40,.85,.90),0)
    w.box("left_arm",(-1.40,.30,-.90),(-1.22,.68,.75),0)
    w.box("right_arm",(1.22,.30,-.20),(1.40,.68,.75),0)
    # Back cushions: rounded seat-back volumes.
    for index,cx in enumerate((-.92,-.18,.56,1.03)):
        radius=.35 if index<3 else .16
        w.cushion(f"back_cushion_{index+1}",(cx,.60,.52),(radius,.22,.105),1)
    # Decorative loose cushions (fictional fabric, not source claims).
    w.cushion("throw_pillow_left",(-1.01,.55,.12),(.23,.24,.085),3)
    w.cushion("throw_pillow_right",(.96,.56,.18),(.20,.20,.09),3)
    # Six legs touching the floor.
    for x in (-1.23,-.55,.60,1.23):
        for z in (.61,):
            w.box(f"rear_leg_{x}",(x-.027,0,z-.027),(x+.027,.145,z+.027),2)
    for x,z in [(-1.28,-.81),(-.52,-.78),(1.20,-.14)]:
        w.box(f"front_leg_{x}",(x-.025,0,z-.025),(x+.025,.145,z+.025),2)
    w.output(pathlib.Path(args.output))

if __name__=="__main__":
    main()
