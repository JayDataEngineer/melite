# Isolation: base vs morphed vs assembled, proven params (256/1.2).
import importlib.util, os
spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)
os.makedirs("/tmp/cfproof", exist_ok=True)
for name in ["cfbase", "cfmorph", "cf"]:
    with open("/tmp/%s.glb" % name, "rb") as f:
        glb = f.read()
    try:
        outs = br.render_glb(glb, views=[{"name": "front", "azimuth": 0, "elevation": 5}],
                             resolution=256, samples=16, transparent=False,
                             focal_length=50, framing=1.2, width=256, height=256)
        p = "/tmp/cfproof/%s.png" % name
        open(p, "wb").write(outs[0]["png_bytes"])
        print("ISO-RENDER", name, len(outs[0]["png_bytes"]))
    except Exception as e:
        print("ISO-FAIL", name, repr(e)[:200])
