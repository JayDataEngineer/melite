# Container-side render helpers (docker cp in, docker exec python3.13). Gate law: flat mean-color fill, never sample textures.
import importlib.util, os
spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)
with open("/tmp/proof/bridged.glb", "rb") as f:
    glb = f.read()
views = [
    {"name": "front", "azimuth": 0, "elevation": 5},
    {"name": "left", "azimuth": 270, "elevation": 5},
]
outs = br.render_glb(glb, views=views, resolution=512, samples=16,
                     transparent=False, focal_length=50,
                     framing=1.2, width=512, height=512)
for r in outs:
    with open("/tmp/proof/bridged_" + r["name"] + ".png", "wb") as f:
        f.write(r["png_bytes"])
print("WROTE", [r["name"] for r in outs])
