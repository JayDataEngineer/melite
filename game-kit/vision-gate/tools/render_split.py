import importlib.util
spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)
for name in ["cf_body", "cf_crest"]:
    with open("/tmp/%s.glb" % name, "rb") as f:
        glb = f.read()
    outs = br.render_glb(glb, views=[{"name": "front", "azimuth": 0, "elevation": 5}],
                         resolution=512, samples=16, transparent=False,
                         focal_length=50, framing=1.2, width=512, height=512)
    open("/tmp/cfproof/%s_r.png" % name, "wb").write(outs[0]["png_bytes"])
    print("SPLITRENDER", name, len(outs[0]["png_bytes"]))
