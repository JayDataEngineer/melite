# Diagnose assembled cranefolk: object bounds after import + after eval.
import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/cf.glb")
for ob in bpy.data.objects:
    if ob.type == 'MESH':
        ws = [ob.matrix_world @ v.co for v in ob.data.vertices]
        xs = [p.x for p in ws]; ys = [p.y for p in ws]; zs = [p.z for p in ws]
        print("DIAG %s verts=%d bind_x=[%.3f,%.3f] y=[%.3f,%.3f] z=[%.3f,%.3f]"
              % (ob.name, len(ob.data.vertices), min(xs), max(xs),
                 min(ys), max(ys), min(zs), max(zs)))
        dg = bpy.context.evaluated_depsgraph_get()
        ob2 = ob.evaluated_get(dg)
        ws2 = [ob2.matrix_world @ v.co for v in ob2.data.vertices]
        xs = [p.x for p in ws2]; ys = [p.y for p in ws2]; zs = [p.z for p in ws2]
        print("DIAG-EVAL %s x=[%.3f,%.3f] y=[%.3f,%.3f] z=[%.3f,%.3f]"
              % (ob.name, min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)))
