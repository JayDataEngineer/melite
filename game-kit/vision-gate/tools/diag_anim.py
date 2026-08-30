import bpy
for name in ["cf", "cfcat"]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath="/tmp/%s.glb" % name)
    # do NOT clear actions: evaluate the animation as imported
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    acts = [a.name for a in bpy.data.actions]
    print("ANIM %s actions=%s frame=1" % (name, acts[:4]))
    for ob in bpy.data.objects:
        if ob.type != 'MESH':
            continue
        ob2 = ob.evaluated_get(dg)
        mw = ob2.matrix_world
        ws = [mw @ v.co for v in ob2.data.vertices]
        xs = [p.x for p in ws]; ys = [p.y for p in ws]; zs = [p.z for p in ws]
        print("F1 %s %s v=%d x=[%.2f,%.2f] y=[%.2f,%.2f] z=[%.2f,%.2f]"
              % (name, ob.name, len(ob.data.vertices), min(xs), max(xs),
                 min(ys), max(ys), min(zs), max(zs)))
