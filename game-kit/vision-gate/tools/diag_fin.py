import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/cff.glb")
for ob in bpy.data.objects:
    if ob.type == 'MESH':
        bb = [ob.matrix_world @ Vector(v) for v in ob.bound_box]
        xs = [p.x for p in bb]; ys = [p.y for p in bb]; zs = [p.z for p in bb]
        mats = [m.name if m else None for m in ob.data.materials]
        print("FIN %s v=%d x=[%.2f,%.2f] y=[%.2f,%.2f] z=[%.2f,%.2f] mats=%s hide=%s"
              % (ob.name, len(ob.data.vertices), min(xs), max(xs), min(ys), max(ys),
                 min(zs), max(zs), mats, ob.hide_render))
