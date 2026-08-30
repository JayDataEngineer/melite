#!/usr/bin/env python3
# REST-pose A/B for the broadside experiment: same PAIRS/views/material law
# as render_posed_compare_broadside.py but NO pose injection - isolates
# orientation damage from pose damage.
import importlib.util, os, json, tempfile
spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)
PAIRS = [("v3base", "/tmp/bridge_v4/baseline_v3.glb"), ("broad", "/tmp/bridge_v4/broadside.glb")]
views = [{"name": "front", "azimuth": 0, "elevation": 5},
         {"name": "left", "azimuth": 270, "elevation": 5},
         {"name": "back", "azimuth": 180, "elevation": 5}]
outdir = "/tmp/proof/broadside_gate_rest"
os.makedirs(outdir, exist_ok=True)
for tag, path in PAIRS:
    with open(path, "rb") as f:
        glb = f.read()
    outs = br.render_glb(glb, views=views, resolution=512, samples=16,
                         transparent=False, focal_length=50, framing=1.2,
                         width=512, height=512)
    n = 0
    for r in outs:
        with open(os.path.join(outdir, tag + "_" + r["name"] + ".png"), "wb") as f:
            f.write(r["png_bytes"]); n += 1
    print("WROTE", tag, n)
