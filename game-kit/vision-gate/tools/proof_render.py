# Container-side render helpers (docker cp in, docker exec python3.13).
import importlib.util, os, traceback
spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)
views = [
    {"name": "front", "azimuth": 0, "elevation": 5},
    {"name": "left", "azimuth": 270, "elevation": 5},
    {"name": "back", "azimuth": 180, "elevation": 5},
]
os.makedirs("/tmp/proof", exist_ok=True)
for tag in ("hair", "machete"):
    try:
        with open("/tmp/" + tag + ".glb", "rb") as f:
            glb = f.read()
        outs = br.render_glb(glb, views=views, resolution=512, samples=16,
                             transparent=False, focal_length=50,
                             framing=1.2, width=512, height=512)
        print("RESULT", tag, "count:", len(outs))
        for r in outs:
            with open("/tmp/proof/" + tag + "_" + r["name"] + ".png", "wb") as f:
                f.write(r["png_bytes"])
        print("WROTE", tag, [r["name"] for r in outs])
    except Exception:
        print("FAILED", tag)
        traceback.print_exc()
