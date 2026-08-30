import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/cfn.glb")
for ob in bpy.data.objects:
    if ob.type == 'MESH':
        c = ob.matrix_world @ (sum((Vector(v) for v in ob.bound_box), Vector()) / 8)
        bb = [ob.matrix_world @ Vector(v) for v in ob.bound_box]
        zs = [p.z for p in bb]; xs = [p.x for p in bb]; ys = [p.y for p in bb]
        print("WRLD %s parent=%s bone=%s loc=[%.2f %.2f %.2f] span=[%.2f %.2f %.2f]"
              % (ob.name, ob.parent.name if ob.parent else None,
                 getattr(ob, "parent_bone", None), c.x, c.y, c.z,
                 max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs)))
from mathutils import Vector
