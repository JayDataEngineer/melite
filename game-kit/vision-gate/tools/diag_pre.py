import bpy
for name in ["cfbase", "cfmorph"]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath="/tmp/%s.glb" % name)
    arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    if arm is not None and arm.animation_data is not None:
        arm.animation_data.action = None
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    print("PRE %s actions=%s" % (name, [a.name for a in bpy.data.actions][:3]))
    for ob in bpy.data.objects:
        if ob.type == 'MESH' and len(ob.data.vertices) > 1000:
            ob2 = ob.evaluated_get(dg)
            mw = ob2.matrix_world
            ws = [mw @ v.co for v in ob2.data.vertices]
            ys = [p.y for p in ws]; zs = [p.z for p in ws]
            print("PREREST %s %s y=[%.2f,%.2f] z=[%.2f,%.2f]"
                  % (name, ob.name, min(ys), max(ys), min(zs), max(zs)))
