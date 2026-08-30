import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/bresc2.glb")
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes:
    mods = [m.name for m in o.modifiers]
    for m in list(o.modifiers):
        if m.type == 'ARMATURE':
            o.modifiers.remove(m)
    print("NOMOD %s had_mods=%s parent=%s parent_type=%s" % (
        o.name, mods, o.parent.name if o.parent else None, o.parent_type if o.parent else None))
m = meshes[0]
bb = [m.matrix_world @ Vector(v) for v in m.bound_box]
cen = sum(bb, Vector()) / 8
target = bpy.data.objects.new("Target", None)
bpy.context.collection.objects.link(target)
target.location = cen
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
bpy.context.collection.objects.link(cam)
cam.location = Vector((cen.x, cen.y - 3.0, cen.z))
con = cam.constraints.new('TRACK_TO')
con.target = target
con.track_axis = 'TRACK_NEGATIVE_Z'
con.up_axis = 'UP_Y'
bpy.context.scene.camera = cam
light = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", 'SUN'))
bpy.context.collection.objects.link(light)
light.rotation_euler = (0.9, 0.3, 0.5)
light.data.energy = 4
bpy.context.scene.render.resolution_x = 640
bpy.context.scene.render.resolution_y = 640
bpy.context.scene.render.filepath = "/tmp/proof/nomod_front.png"
bpy.ops.render.render(write_still=True)
print("NOMOD-RENDER-OK")
