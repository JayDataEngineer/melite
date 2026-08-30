import bpy, sys
for name in ["cfbase", "cfmorph", "cfcat"]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath="/tmp/%s.glb" % name)
    for ob in bpy.data.objects:
        if ob.type == 'MESH' and len(ob.data.vertices) > 100:
            ws = [ob.matrix_world @ v.co for v in ob.data.vertices]
            xs = [p.x for p in ws]; ys = [p.y for p in ws]; zs = [p.z for p in ws]
            print("D2 %s %s v=%d x=[%.2f,%.2f] y=[%.2f,%.2f] z=[%.2f,%.2f]"
                  % (name, ob.name, len(ob.data.vertices), min(xs), max(xs),
                     min(ys), max(ys), min(zs), max(zs)))
