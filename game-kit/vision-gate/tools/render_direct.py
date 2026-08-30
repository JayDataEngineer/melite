import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/tmp/bresc2.glb")
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
print("IMPORT meshes=%d armatures=%d" % (len(meshes), len(arms)))
for o in meshes:
    bb = [o.matrix_world @ Vector(v) for v in o.bound_box]
    xs = [p.x for p in bb]; ys = [p.y for p in bb]; zs = [p.z for p in bb]
    areas = [p.area for p in o.data.polygons]
    degenerate = sum(1 for a in areas if a < 1e-10)
    print("  %s verts=%d faces=%d degen=%d total_area=%.4f x=[%.2f,%.2f] y=[%.2f,%.2f] z=[%.2f,%.2f] mats=%d mat0=%s" % (
        o.name, len(o.data.vertices), len(o.data.polygons), degenerate,
        sum(areas), min(xs), max(xs), min(ys), max(ys), min(zs), max(zs),
        len(o.data.materials),
        o.data.materials[0].name if o.data.materials else None))
for a in arms:
    print("  armature %s bones=%d" % (a.name, len(a.data.bones)))
m = meshes[0]
bb = [m.matrix_world @ Vector(v) for v in m.bound_box]
cen = sum(bb, Vector()) / 8
target = bpy.data.objects.new("Target", None)
bpy.context.collection.objects.link(target)
target.location = cen
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
bpy.context.collection.objects.link(cam)
cam.location = Vector((cen.x, cen.y - 4.2, cen.z))
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
bpy.context.scene.render.filepath = "/tmp/proof/direct_front.png"
bpy.context.scene.render.film_transparent = False
bpy.ops.render.render(write_still=True)
print("DIRECT-RENDER-OK")
