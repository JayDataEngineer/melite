import bpy, sys, traceback
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/cfn.glb")
for ob in bpy.data.objects:
    print("DBG", ob.type, ob.name, "parent=", ob.parent.name if ob.parent else None)
arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
print("DBG arm matrix_world row3", [round(v,3) for v in arm.matrix_world.row[3]] if arm else None)
import importlib.util
spec = importlib.util.spec_from_file_location(
    "br", "/root/ComfyUI/custom_nodes/melite-poser-nodes/blender_render.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)
with open("/tmp/cfn.glb", "rb") as f:
    glb = f.read()
try:
    outs = br.render_glb(glb, views=[{"name": "front", "azimuth": 0, "elevation": 5}],
                         resolution=256, samples=8, transparent=False,
                         focal_length=50, framing=1.2, width=256, height=256)
    print("DBG outs", len(outs))
except Exception as e:
    traceback.print_exc()
