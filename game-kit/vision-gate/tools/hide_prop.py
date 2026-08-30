import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/cff.glb")
for ob in bpy.data.objects:
    if ob.type == 'MESH' and ob.name != 'geometry_0.001':
        bpy.data.objects.remove(ob, do_unlink=True)
bpy.ops.export_scene.gltf(filepath="/tmp/cff_body.glb", export_format='GLB')
print("BODY-ONLY-EXPORTED")
