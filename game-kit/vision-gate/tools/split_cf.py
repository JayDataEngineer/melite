import bpy, os
# split delivered cranefolk: body-only glb + crest-only glb
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/cf.glb")
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for ob in meshes:
    print("SPLIT-MESH", ob.name, len(ob.data.vertices))
# body = largest mesh; crest = second largest; drop icosphere from body export
body = max(meshes, key=lambda o: len(o.data.vertices))
crest = sorted(meshes, key=lambda o: len(o.data.vertices))[-2]
# body-only
for o in meshes:
    if o is not body:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.export_scene.gltf(filepath="/tmp/cf_body.glb", export_format='GLB',
                          export_skins=True, export_animations=True)
print("SPLIT-OUT body /tmp/cf_body.glb", os.path.getsize("/tmp/cf_body.glb"))
# reload, crest-only
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/cf.glb")
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
keep = max(meshes, key=lambda o: len(o.data.vertices))
keep2 = sorted(meshes, key=lambda o: len(o.data.vertices))[-2]
for o in meshes:
    if o is not keep2:
        bpy.data.objects.remove(o, do_unlink=True)
arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
if arm is not None:
    bpy.data.objects.remove(arm, do_unlink=True)
bpy.ops.export_scene.gltf(filepath="/tmp/cf_crest.glb", export_format='GLB',
                          export_skins=False, export_animations=False)
print("SPLIT-OUT crest /tmp/cf_crest.glb", os.path.getsize("/tmp/cf_crest.glb"))
