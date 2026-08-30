# render_assembled.py - POSED-bounds-framed render for assembled (socketed,
# skinned, compact-bind) GLBs. The stock blender_render frames on BIND bounds;
# assembled files keep the body in a compact bind cloud (normal for SOMAX
# exports) with socketed props sitting high - the camera pulls back to the
# bind bbox and the posed figure renders as a speck. LAW: clear the action,
# pose one bone, frame the EVALUATED bounds.
# Container-side: docker cp in, docker exec python3.13 render_assembled.py.
import bpy, math, sys, os, json

CFG = json.load(open("/tmp/ra_config.json"))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=CFG["glb"])

arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
if arm is not None:
    if arm.animation_data is not None:
        arm.animation_data.action = None
    import re
    pat = re.compile(CFG.get("pose_regex", "LeftArm$"))
    rot = math.radians(CFG.get("pose_deg", 20))
    hit = 0
    for pb in arm.pose.bones:
        if pat.search(pb.name):
            pb.matrix_basis = mathutils_rot = __import__("mathutils").Matrix.Rotation(rot, 4, 'X') @ pb.matrix_basis
            hit += 1
    print("RA-POSED", hit)
bpy.context.view_layer.update()

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
dg = bpy.context.evaluated_depsgraph_get()
pts = []
for ob in meshes:
    ob2 = ob.evaluated_get(dg)
    mw = ob2.matrix_world
    pts.extend([mw @ v.co for v in ob2.data.vertices])
xs = [p.x for p in pts]; ys = [p.y for p in pts]; zs = [p.z for p in pts]
bb = {"x": [min(xs), max(xs)], "y": [min(ys), max(ys)], "z": [min(zs), max(zs)]}
print("RA-BOUNDS", json.dumps(bb))
cx, cy, cz = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2, (min(zs)+max(zs))/2
size = max(max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs)) * CFG.get("framing", 1.25)

scn = bpy.context.scene
scn.render.engine = 'CYCLES'
scn.cycles.samples = CFG.get("samples", 24)
scn.render.resolution_x = CFG.get("resolution", 512)
scn.render.resolution_y = CFG.get("resolution", 512)
scn.display_settings.display_device = 'Non-Color'
scn.view_settings.view_transform = 'Raw'
scn.world = bpy.data.worlds.new("w")
scn.world.background_color = (0.42, 0.42, 0.42)

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("c"))
cam.data.lens = 50
scn.collection.objects.link(cam)
scn.camera = cam
# flat material law (never sample textures in a gate render)
for ob in meshes:
    for s in ob.material_slots:
        if s.material:
            s.material.use_nodes = False
            s.material.diffuse_color = (0.78, 0.74, 0.68, 1.0)

outdir = CFG.get("outdir", "/tmp/raproof")
os.makedirs(outdir, exist_ok=True)
for view in CFG["views"]:
    az = math.radians(view.get("azimuth", 0))
    el = math.radians(view.get("elevation", 5))
    import mathutils
    d = size * 1.6
    loc = mathutils.Vector((cx + d*math.cos(el)*math.sin(az),
                            cy - d*math.cos(el)*math.cos(az),
                            cz + d*math.sin(el)))
    cam.location = loc
    direction = mathutils.Vector((cx, cy, cz)) - loc
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    p = os.path.join(outdir, view["name"] + ".png")
    scn.render.filepath = p
    bpy.ops.render.render(write_still=True)
    print("RA-RENDER", p, os.path.getsize(p))
