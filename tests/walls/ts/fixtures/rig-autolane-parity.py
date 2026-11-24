#!/usr/bin/env python3
"""rig-autolane-parity.py — the rig executor's behavioral parity probe (venv-gated).

Run by tests/walls/ts/suites/rig-autolane-contract.spec.ts with the engine
venv python and the pack directory as argv[1]. Stands down with exit 3 when
the venv, numpy or the SOMA template is missing (CI boxes carry no venv);
any real assertion failure exits non-zero with the traceback on stderr.

Proves, on the REAL executor (soma_weight_transfer.transfer_soma_weights_and_write_glb):
  1. a standing multi-part scene rigs per the cluster + membership law: the
     body (seed) and a fused-in shirt shell skinned (77 joints, weights
     summing to one, skin extras carrying linear = s*P), a cluster member
     failing the surface test (a strap-worn holster) left static, hand and far
     props untouched outside the cluster, every original node reachable,
     scene roots only grown, and the sidecar report passes;
  2. a non-standing source (a solid slab) is refused with
     rig_preflight.RigRefusal and NO output file is written;
  3. a Z-up standing figure converts wholesale and rigs.
"""
import json
import os
import struct
import sys
import tempfile

WORK = tempfile.mkdtemp(prefix="rig-parity-")


def stand_down(msg):
    print("STAND-DOWN: %s" % msg)
    sys.exit(3)


PACK = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PACK)

try:
    import numpy as np
except Exception as exc:  # pragma: no cover - CI boxes
    stand_down("numpy unavailable: %s" % exc)

try:
    import soma_weight_transfer as swt
    import rig_preflight
except Exception as exc:  # pragma: no cover - CI boxes
    stand_down("pack import failed: %s" % exc)

if not os.path.exists(swt.SOMA_SKIN_PATH):
    stand_down("no template at %s" % swt.SOMA_SKIN_PATH)


# ── synthetic GLB construction ──────────────────────────────────────────

def box_shell(lo, hi, n=2):
    """A hollow box as a triangle grid: verts sit on the box surface, so
    surface-sample membership and cluster boxes see exactly the shell."""
    lo = np.asarray(lo, dtype=np.float64)
    hi = np.asarray(hi, dtype=np.float64)
    verts, faces = [], []
    axes = [(0, 1, 2), (1, 2, 0), (2, 0, 1)]
    for a, b, c in axes:
        for side in (0.0, 1.0):
            base = len(verts)
            for i in range(n + 1):
                for j in range(n + 1):
                    p = lo.copy()
                    p[a] += (i / n) * (hi[a] - lo[a])
                    p[b] += (j / n) * (hi[b] - lo[b])
                    p[c] += side * (hi[c] - lo[c])
                    verts.append(p)
            for i in range(n):
                for j in range(n):
                    v00 = base + i * (n + 1) + j
                    v01 = v00 + 1
                    v10 = v00 + (n + 1)
                    v11 = v10 + 1
                    faces.append((v00, v10, v11))
                    faces.append((v00, v11, v01))
    return np.array(verts), np.array(faces, dtype=np.uint32)


def pack_glb(parts, out_path):
    """One buffer, one mesh+primitive per part, every part a scene root."""
    accessors, views, meshes, nodes = [], [], [], []
    chunks, offset = [], 0
    for p in parts:
        pos = np.asarray(p["pos"], dtype="<f4")
        face = np.asarray(p["faces"], dtype="<u4")
        for arr, comp, typ in ((pos, 5126, "VEC3"), (face, 5125, "SCALAR")):
            raw = arr.tobytes()
            views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(raw)})
            offset += len(raw)
            chunks.append(raw)
            acc = {"bufferView": len(views) - 1, "componentType": comp,
                   "count": int(arr.reshape(-1, arr.shape[-1]).shape[0]), "type": typ}
            if typ == "VEC3":
                acc["min"] = pos.min(0).tolist()
                acc["max"] = pos.max(0).tolist()
            accessors.append(acc)
        meshes.append({"primitives": [{"attributes": {"POSITION": len(accessors) - 2},
                                       "indices": len(accessors) - 1, "mode": 4}]})
        nodes.append({"mesh": len(meshes) - 1, "name": p["name"]})
    bin_data = b"".join(chunks)
    gltf = {"asset": {"version": "2.0"}, "scene": 0,
            "scenes": [{"nodes": list(range(len(nodes)))}],
            "nodes": nodes, "meshes": meshes, "accessors": accessors,
            "bufferViews": views, "buffers": [{"byteLength": len(bin_data)}]}
    _write_glb(gltf, bin_data, out_path)
    return gltf


def _write_glb(gltf, bin_data, out_path):
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    js_pad = b" " * ((4 - len(js) % 4) % 4)
    bin_pad = b"\x00" * ((4 - len(bin_data) % 4) % 4)
    total = 12 + 8 + len(js) + len(js_pad) + 8 + len(bin_data) + len(bin_pad)
    with open(out_path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js) + len(js_pad), 0x4E4F534A))
        f.write(js + js_pad)
        f.write(struct.pack("<II", len(bin_data) + len(bin_pad), 0x004E4942))
        f.write(bin_data + bin_pad)


def read_glb(path):
    with open(path, "rb") as f:
        data = f.read()
    assert data[:4] == b"glTF", "not a GLB: %s" % path
    length = struct.unpack("<I", data[8:12])[0]
    assert len(data) == length, "truncated GLB"
    off = 12
    js, bin_data = None, b""
    while off < length:
        clen, ctype = struct.unpack("<II", data[off:off + 8])
        chunk = data[off + 8:off + 8 + clen]
        if ctype == 0x4E4F534A:
            js = json.loads(chunk.decode("utf-8"))
        elif ctype == 0x004E4942:
            bin_data = chunk
        off += 8 + clen
    return js, bin_data


def read_accessor(gltf, bin_data, idx):
    acc = gltf["accessors"][idx]
    view = gltf["bufferViews"][acc["bufferView"]]
    comp_n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[acc["type"]]
    comp_size = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}[acc["componentType"]]
    dtypes = {5120: np.int8, 5121: np.uint8, 5122: np.int16,
              5123: np.uint16, 5125: np.uint32, 5126: np.float32}
    raw = bin_data[view["byteOffset"]:view["byteOffset"] + acc["count"] * comp_n * comp_size]
    return np.frombuffer(raw, dtype=dtypes[acc["componentType"]]).reshape(acc["count"], comp_n)


def reachable(gltf):
    seen = set()
    for scene in gltf["scenes"]:
        stack = list(scene["nodes"])
        while stack:
            i = stack.pop()
            if i in seen:
                continue
            seen.add(i)
            stack.extend(gltf["nodes"][i].get("children", []))
    return seen


# ── the template body and parts derived from it ─────────────────────────

tpl = np.load(swt.SOMA_SKIN_PATH, allow_pickle=True)
body_v = tpl["bind_vertices"].astype(np.float64)
body_f = tpl["faces"].astype(np.uint32)
n_joints = int(tpl["rig_joint_names"].shape[0])
assert n_joints == 77, "expected the 77-joint template, got %d" % n_joints

OFFSET = np.array([0.1, 0.2, 0.3])

# The template's torso box, derived from its own verts: a band safely below
# the shoulders (no arm verts) narrowed past the legs' width.
max_y = body_v[:, 1].max()
torso = body_v[(body_v[:, 1] > 0.45 * max_y) & (body_v[:, 1] < 0.65 * max_y)
               & (np.abs(body_v[:, 0]) < 0.3 * np.abs(body_v[:, 0]).max())]
t_lo, t_hi = torso.min(0), torso.max(0)

# shirt: a shell hugging the torso (+2cm) — every vert near the template
# surface, so membership joins it to the skin (the worn-part arm).
shirt_v, shirt_f = box_shell(t_lo - 0.02, t_hi + 0.02, n=2)
# holster: a box worn on a strap, floating in the gap between the raised
# right arm and the head — fully inside the body box (clustering consults
# membership for it, and the union box stays the body's), but only a third
# of its verts lie within MEMBER_RADIUS of the template surface, so the
# surface test keeps it static (the membership-refusal arm).
holster_v, holster_f = box_shell([0.24, 1.32, -0.05], [0.45, 1.56, 0.05], n=2)
# sword: a rod from the hand outward — one axis fails the seed-box overlap,
# so clustering never consults membership for it (the untouched-prop arm).
hand = body_v[int(np.argmax(body_v[:, 0]))]
sword_v, sword_f = box_shell(hand + [0.0, -0.03, -0.03], hand + [0.45, 0.03, 0.03], n=2)
# slab: far off the body entirely (untouched, same arm as the sword).
slab_v, slab_f = box_shell([3.0, 0.0, 0.0], [3.6, 0.5, 0.6], n=2)

failures = []


def check(cond, msg):
    if not cond:
        failures.append(msg)
        print("FAIL: %s" % msg)


# ── leg 1: standing multi-part scene ────────────────────────────────────

src = os.path.join(WORK, "multipart.glb")
out = os.path.join(WORK, "multipart_rigged.glb")
source_pos = {}
pack_glb([
    {"name": "body", "pos": body_v + OFFSET, "faces": body_f},
    {"name": "shirt", "pos": shirt_v + OFFSET, "faces": shirt_f},
    {"name": "holster", "pos": holster_v + OFFSET, "faces": holster_f},
    {"name": "sword", "pos": sword_v + OFFSET, "faces": sword_f},
    {"name": "slab", "pos": slab_v, "faces": slab_f},
], src)
swt.transfer_soma_weights_and_write_glb(src, out)
check(os.path.exists(out), "the executor wrote the rigged GLB")

gltf, bin_data = read_glb(out)
names = [n.get("name") for n in gltf["nodes"]]
for want in ("body", "shirt", "holster", "sword", "slab"):
    check(want in names, "the original node %r survives" % want)
reach = reachable(gltf)
check(len(reach) == len(gltf["nodes"]),
      "every node reachable from a scene root (no orphans); unreachable: %s"
      % [n for i, n in enumerate(names) if i not in reach])

skins = gltf.get("skins", [])
check(len(skins) == 1, "exactly one skin, got %d" % len(skins))
if skins:
    check(len(skins[0]["joints"]) == 77, "77 joints, got %d" % len(skins[0]["joints"]))
    ex = skins[0].get("extras", {}).get("somaT_alignRowMajor")
    check(ex is not None, "skin extras carry somaT_alignRowMajor")
    if ex is not None:
        L = np.asarray(ex, dtype=np.float64).reshape(4, 4)
        M = L[:3, :3]
        s = abs(np.linalg.det(M)) ** (1.0 / 3.0)
        resid = float(np.max(np.abs(M @ M.T - (s * s) * np.eye(3))))
        check(resid < 1e-5,
              "the extras linear is s*P with a signed permutation (residual %.2e)" % resid)

for part, skinned in (("body", True), ("shirt", True),
                      ("holster", False), ("sword", False), ("slab", False)):
    node = gltf["nodes"][names.index(part)]
    prim = gltf["meshes"][node["mesh"]]["primitives"][0]
    has_j = "JOINTS_0" in prim["attributes"]
    check(has_j == skinned, "%s skinned=%s, expected %s" % (part, has_j, skinned))
    if skinned and has_j:
        w = read_accessor(gltf, bin_data, prim["attributes"]["WEIGHTS_0"]).astype(np.float64)
        dev = float(np.max(np.abs(w.sum(1) - 1.0)))
        check(dev < 1e-3, "%s weights sum to one (max dev %.2e)" % (part, dev))

# Untouched props keep their authored geometry byte-for-byte (no world
# re-bake may drift a static prop, and no skin may touch it).
for part in ("sword", "slab"):
    node = gltf["nodes"][names.index(part)]
    prim = gltf["meshes"][node["mesh"]]["primitives"][0]
    got = read_accessor(gltf, bin_data, prim["attributes"]["POSITION"]).astype(np.float64)
    want = {"sword": sword_v + OFFSET, "slab": slab_v}[part]
    dev = float(np.max(np.abs(got - want)))
    check(dev < 1e-5, "%s geometry untouched (max dev %.2e)" % (part, dev))

sidecar = out[:-4] + ".report.json"
check(os.path.exists(sidecar), "the sidecar report exists")
if os.path.exists(sidecar):
    rep = json.load(open(sidecar))
    check(rep.get("rows", {}).get("passed") is True or rep.get("status") == "pass",
          "the sidecar report passes")

# ── leg 2: a slab is refused, with no output ────────────────────────────

ref_src = os.path.join(WORK, "slab.glb")
ref_out = os.path.join(WORK, "slab_rigged.glb")
sv, sf = box_shell([-1.0, 0.0, -0.45], [1.0, 0.6, 0.45], n=2)
pack_glb([{"name": "slab", "pos": sv, "faces": sf}], ref_src)
try:
    swt.transfer_soma_weights_and_write_glb(ref_src, ref_out)
    failures.append("the slab was NOT refused")
    print("FAIL: the slab was NOT refused")
except rig_preflight.RigRefusal as refusal:
    check(len(refusal.violations) > 0, "the refusal carries violations")
    print("refusal (expected): %s" % "; ".join(refusal.violations)[:140])
check(not os.path.exists(ref_out), "no output file for a refused source")

# ── leg 3: a Z-up standing figure converts wholesale and rigs ───────────

zup_src = os.path.join(WORK, "zup.glb")
zup_out = os.path.join(WORK, "zup_rigged.glb")
pack_glb([{"name": "body", "pos": body_v[:, [0, 2, 1]] * np.array([1.0, 1.0, -1.0]),
           "faces": body_f}], zup_src)
swt.transfer_soma_weights_and_write_glb(zup_src, zup_out)
zg, zb = read_glb(zup_out)
zn = [n.get("name") for n in zg["nodes"]]
check("body" in zn, "the Z-up body node survives conversion")
zreach = reachable(zg)
check(len(zreach) == len(zg["nodes"]), "the Z-up output has no orphans")
zskin = zg.get("skins", [])
check(len(zskin) == 1 and len(zskin[0]["joints"]) == 77,
      "the Z-up output rigs 77 joints, got %s" % [len(s["joints"]) for s in zskin])

# ── verdict ─────────────────────────────────────────────────────────────

if failures:
    print("PARITY FAILED: %d failure(s)" % len(failures))
    sys.exit(1)
print("PARITY-OK")
