#!/usr/bin/env python3
# Container-side A/B gate render: wolf_statue bridge v2 (live-run baseline
# artifact) vs v3 (manual_bridge_v3). docker cp in, docker exec python3.13.
# Gate law: flat mean-color fill materials only - NEVER sample textures.
# Uses blender_render.render_glb exactly like proof_render.py (same views,
# resolution, focal length, framing), then adds pure-silhouette stats.
import importlib.util, os, json

spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)

PAIRS = [
    ("v2", "/tmp/bridge_v3/baseline_true.glb"),
    ("v3", "/tmp/bridge_v3/bridged.glb"),
]
views = [
    {"name": "front", "azimuth": 0, "elevation": 5},
    {"name": "left", "azimuth": 270, "elevation": 5},
    {"name": "back", "azimuth": 180, "elevation": 5},
]
outdir = "/tmp/proof/v3gate"
os.makedirs(outdir, exist_ok=True)

for tag, path in PAIRS:
    with open(path, "rb") as f:
        glb = f.read()
    outs = br.render_glb(glb, views=views, resolution=512, samples=16,
                         transparent=False, focal_length=50,
                         framing=1.2, width=512, height=512)
    for r in outs:
        with open(os.path.join(outdir, tag + "_" + r["name"] + ".png"), "wb") as f:
            f.write(r["png_bytes"])
    print("WROTE", tag, [r["name"] for r in outs])

import numpy as np
from PIL import Image

def mask_of(p):
    im = np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)
    corners = np.stack([im[2, 2], im[2, -3], im[-3, 2], im[-3, -3]])
    bg = corners.mean(axis=0)
    return (np.abs(im - bg).sum(axis=2) > 24)

def iou(a, b):
    union = np.logical_or(a, b).sum()
    inter = np.logical_and(a, b).sum()
    return float(inter) / float(union) if union else 0.0

masks, stats = {}, {}
for tag, _path in PAIRS:
    masks[tag] = {}
    for v in views:
        m = mask_of(os.path.join(outdir, tag + "_" + v["name"] + ".png"))
        masks[tag][v["name"]] = m
        stats[tag + "_" + v["name"] + "_area_frac"] = round(float(m.mean()), 4)
for v in views:
    stats["iou_v2_v3_" + v["name"]] = round(iou(masks["v2"][v["name"]], masks["v3"][v["name"]]), 4)
with open(os.path.join(outdir, "stats.json"), "w") as f:
    json.dump(stats, f, indent=2)
print("STATS " + json.dumps(stats))
