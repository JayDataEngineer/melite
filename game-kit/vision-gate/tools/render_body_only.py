import importlib.util
spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)
with open("/tmp/cff.glb", "rb") as f:
    glb = f.read()
for name, az in [("body_front", 0), ("body_left", 270), ("body_3q", 315)]:
    outs = br.render_glb(glb, views=[{"name": name, "azimuth": az, "elevation": 5}],
                         resolution=512, samples=16, transparent=False,
                         focal_length=50, framing=1.2, width=512, height=512)
    open("/tmp/proof/%s.png" % name, "wb").write(outs[0]["png_bytes"])
    print("BODYRENDER", name, len(outs[0]["png_bytes"]))
