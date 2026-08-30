#!/usr/bin/env python3
"""clean_floaters.py — drop tiny disconnected mesh components from a GLB.

Static-prop cleanup after TRELLIS: small floating fragments (spit debris)
get deleted when a connected component holds < min_faces of the total or
sits fully above the object's top decile. Pure numpy GLB rewrite.
"""
import json
import struct
import sys
from pathlib import Path

import numpy as np

MIN_FACE_FRACTION = 0.005  # component < 0.5% of faces = floater
TOP_DECILE = 0.90          # fully above 90th-percentile vertex Y = floater


def read_glb(path: Path):
    raw = path.read_bytes()
    assert raw[:4] == b"glTF", "not a glb"
    json_len = struct.unpack_from("<I", raw, 12)[0]
    header = json.loads(raw[20 : 20 + json_len])
    bin_start = 20 + json_len
    bin_len = struct.unpack_from("<I", raw, bin_start)[0]
    blob = np.frombuffer(raw, dtype=np.uint8, count=bin_len, offset=bin_start + 8)
    return header, blob


def accessor(header, blob, idx):
    acc = header["accessors"][idx]
    comp = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[acc["type"]]
    dtype = {5120: "i1", 5121: "u1", 5122: "i2", 5123: "u2", 5125: "u4", 5126: "f4"}[acc["componentType"]]
    bva = header["bufferViews"][acc["bufferView"]]
    off = (bva.get("byteOffset", 0) or 0) + (acc.get("byteOffset", 0) or 0)
    arr = blob[off : off + acc["count"] * comp * np.dtype(dtype).itemsize]
    return np.frombuffer(arr.tobytes(), dtype=dtype).reshape(acc["count"], comp).astype(np.float64)


def tri_components(tris: np.ndarray) -> tuple[np.ndarray, int]:
    n = int(tris.max()) + 1
    parent = np.arange(n)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b, c in tris:
        ra, rb, rc = find(a), find(b), find(c)
        if ra != rb:
            parent[rb] = ra
        if ra != rc:
            parent[rc] = ra
    labels = np.array([find(i) for i in range(n)])
    return labels, len(set(labels.tolist()))


def main() -> int:
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    header, blob = read_glb(src)

    # single-mesh single-primitive props (our lanes emit exactly that)
    mesh = header["meshes"][0]
    prim = mesh["primitives"][0]
    pos = accessor(header, blob, prim["attributes"]["POSITION"])
    idx_acc = header["accessors"][prim["indices"]]
    bva = header["bufferViews"][idx_acc["bufferView"]]
    itype = {5121: "u1", 5123: "u2", 5125: "u4"}[idx_acc["componentType"]]
    ioff = (bva.get("byteOffset", 0) or 0) + (idx_acc.get("byteOffset", 0) or 0)
    itc = blob[ioff : ioff + idx_acc["count"] * np.dtype(itype).itemsize]
    tris = np.frombuffer(itc.tobytes(), dtype=itype).reshape(-1, 3).astype(np.int64)

    # weld by position first — TRELLIS marching-cubes output is a soup of
    # geometrically-shared but index-distinct vertices, so raw index-based
    # union-find would see every triangle as its own component.
    welded, inverse = np.unique(np.round(pos, 4), axis=0, return_inverse=True)
    wtris = inverse[tris]

    labels, ncomp = tri_components(wtris)
    face_counts = np.bincount(labels[wtris].ravel(), minlength=ncomp)
    y_top = np.percentile(welded[:, 1], TOP_DECILE * 100)
    drop = set()
    for comp in range(ncomp):
        if face_counts[comp] < MIN_FACE_FRACTION * len(tris):
            drop.add(comp)
            continue
        verts = welded[labels == comp]
        if verts.min(axis=0)[1] > y_top:
            drop.add(comp)
    if not drop:
        print(json.dumps({"components": ncomp, "dropped": 0, "kept_faces": len(wtris)}))
        if dst != src:
            import shutil
            shutil.copy(src, dst)
        return 0

    keep_vert = ~np.isin(labels, list(drop))
    remap = np.full(labels.shape, -1, dtype=np.int64)
    remap[keep_vert] = np.arange(keep_vert.sum())
    new_tris = remap[wtris]
    new_tris = new_tris[(new_tris >= 0).all(axis=1)]
    new_pos = welded[keep_vert]

    # ── rebuild a minimal GLB (POSITION + indices only; UVs/NORMals dropped)
    def pad4(b):
        return b + b"\x00" * ((4 - len(b) % 4) % 4)

    pos_bytes = new_pos.astype(np.float32).tobytes()
    idx_bytes = new_tris.astype(np.uint32).tobytes().replace  # placeholder
    idx_bytes = new_tris.astype(np.uint32).tobytes()
    views = [
        {"buffer": 0, "byteOffset": 0, "byteLength": len(pos_bytes)},
        {"buffer": 0, "byteOffset": len(pad4(pos_bytes)), "byteLength": len(idx_bytes)},
    ]
    accs = [
        {"bufferView": 0, "componentType": 5126, "count": len(new_pos), "type": "VEC3"},
        {"bufferView": 1, "componentType": 5125, "count": len(new_tris) * 3, "type": "SCALAR"},
    ]
    new_header = {
        "asset": {"version": "2.0", "generator": "clean_floaters"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": mesh.get("name", "prop")}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "material": 0}]}],
        "materials": header.get("materials", [{"name": "mat"}]),
        "accessors": accs,
        "bufferViews": views,
        "buffers": [{"byteLength": len(pad4(pos_bytes)) + len(pad4(idx_bytes))}],
    }
    if "images" in header or "textures" in header:
        print("WARN: textures stripped — re-run replay lane if UVs needed")

    j = json.dumps(new_header).encode()
    bin_payload = pad4(pos_bytes) + pad4(idx_bytes)
    out = b"glTF" + struct.pack("<II", 2, 12 + 8 + len(j) + 8 + len(bin_payload))
    out += struct.pack("<I", len(j)) + b"JSON" + j
    out += struct.pack("<I", len(bin_payload)) + b"BIN\x00" + bin_payload
    dst.write_bytes(out)
    print(json.dumps({"components": ncomp, "dropped": len(drop), "faces": len(tris), "kept_faces": int(len(new_tris))}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
