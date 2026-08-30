# Container-side render helpers (docker cp in, docker exec python3.13).
import importlib.util, os
spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)
with open("/tmp/cf.glb", "rb") as f:
    glb = f.read()
os.makedirs("/tmp/cfproof", exist_ok=True)
views = [
    {"name": "front", "azimuth": 0, "elevation": 5},
    {"name": "left", "azimuth": 270, "elevation": 5},
    {"name": "threeq", "azimuth": 315, "elevation": 12},
]
outs = br.render_glb(glb, views=views, resolution=512, samples=24,
                     transparent=False, focal_length=50, framing=1.15,
                     width=512, height=512)
for o in outs:
    p = "/tmp/cfproof/%s.png" % o["name"]
    open(p, "wb").write(o["png_bytes"])
    print("CF-RENDER", p, len(o["png_bytes"]))
