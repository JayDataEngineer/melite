#!/usr/bin/env python3
# Container-side POSED A/B gate render - BROADSIDE experiment (v2.1).
# Lineage: game-kit/vision-gate/tools/render_posed_compare_v3.py verbatim,
# with only PAIRS + outdir changed: v3 delivery baseline vs the broadside
# bridge run (pmt8re6x3ucp0xl). Same camera, same GATE-RENDER MATERIAL LAW
# (flat mean-color fill, never sample textures), same 25-degree leg swing.
import importlib.util
import json
import os
import subprocess
import tempfile

spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)

ANCHOR = "mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH']"
POSE_BLOCK_LINES = [
    "# --- bridge_broadside posed-compare injection (scratch copy only) ---",
    "import re as _re",
    "import mathutils as _mu",
    "_arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)",
    "if _arm is not None and config.get('pose_regex'):",
    "    if _arm.animation_data is not None and _arm.animation_data.action is not None:",
    "        _arm.animation_data.action = None",
    "    _pat = _re.compile(config['pose_regex'])",
    "    _deg = float(config.get('pose_deg', 30.0))",
    "    _ax = config.get('pose_axis', 'X')",
    "    _rot = _mu.Matrix.Rotation(math.radians(_deg), 4, _ax)",
    "    _hit = []",
    "    for pb in _arm.pose.bones:",
    "        if _pat.search(pb.name):",
    "            pb.matrix_basis = _rot @ pb.matrix_basis",
    "            _hit.append(pb.name)",
    "    print('POSED', len(_hit), sorted(_hit))",
    "    bpy.context.view_layer.update()",
]
POSE_BLOCK = chr(10).join(POSE_BLOCK_LINES)

PAIRS = [
    ("v3base", "/tmp/bridge_v4/baseline_v3.glb"),
    ("broad", "/tmp/bridge_v4/broadside.glb"),
]
VIEWS = [
    {"name": "front", "azimuth": 0, "elevation": 5},
    {"name": "left", "azimuth": 270, "elevation": 5},
    {"name": "back", "azimuth": 180, "elevation": 5},
]

src = br._RENDER_SCRIPT
n = src.count(ANCHOR)
if n != 1:
    raise SystemExit("pose anchor matched %d times, expected 1" % n)
patched = src.replace(ANCHOR, POSE_BLOCK + chr(10) + ANCHOR)
compile(patched, "render_posed_inner", "exec")

POSE_REGEX = os.environ.get("POSE_REGEX", "^(LFront1Rt|LBack1Rt|RFront1Rt|RBack1Rt)$")
POSE_DEG = float(os.environ.get("POSE_DEG", "25"))
outdir = "/tmp/proof/broadside_gate_posed"
os.makedirs(outdir, exist_ok=True)

for tag, path in PAIRS:
    with open(path, "rb") as f:
        glb_bytes = f.read()
    with tempfile.TemporaryDirectory(prefix="posed_render_") as tmpdir:
        glb_path = os.path.join(tmpdir, "input.glb")
        with open(glb_path, "wb") as f:
            f.write(glb_bytes)
        cfg = {
            "views": VIEWS,
            "resolution": 512,
            "width": 512, "height": 512,
            "samples": 16,
            "transparent": False,
            "focal_length": 50,
            "framing": 1.2,
            "pose_regex": POSE_REGEX,
            "pose_deg": POSE_DEG,
            "pose_axis": "X",
        }
        cfg_path = os.path.join(tmpdir, "config.json")
        with open(cfg_path, "w") as f:
            json.dump(cfg, f)
        cmd = ["blender", "--background", "--python-expr", patched, "--",
               glb_path, tmpdir, json.dumps(cfg)]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=600,
                              env={**os.environ, "BLENDER_USER_CONFIG": tmpdir,
                                   "HOME": tmpdir})
        posed_line = None
        for line in (proc.stdout or "").splitlines():
            if line.startswith("POSED"):
                posed_line = line
        ok = proc.returncode == 0
        count = 0
        for view in VIEWS:
            png = os.path.join(tmpdir, view["name"] + ".png")
            if os.path.exists(png):
                with open(png, "rb") as fi:
                    data = fi.read()
                with open(os.path.join(outdir, tag + "_" + view["name"] + ".png"), "wb") as fo:
                    fo.write(data)
                count += 1
        print(tag, "ok", ok, "renders", count, posed_line,
              (proc.stderr or "")[-200:] if not ok else "")
