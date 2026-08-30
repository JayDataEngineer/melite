# Container-side render helpers (docker cp in, docker exec python3.13).
import importlib.util
spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)
with open("/tmp/dh_norm.glb", "rb") as f:
    glb = f.read()
outs = br.render_glb(glb, views=[{"name":"front","azimuth":0,"elevation":5}], resolution=256,
                     samples=16, transparent=False, focal_length=50, framing=1.2,
                     width=256, height=256)
open("/tmp/proof/dh_norm_front.png", "wb").write(outs[0]["png_bytes"])
print("SANITY-RENDER-OK", len(outs[0]["png_bytes"]), "bytes")
