# Driving character-factory

You drive three card stages, in order, through the queue door. Your job:

1. **Lift** (`{model:}` img-to-mesh, `model=pixal3d`,
   `input_image=<photo>`) — repair knobs ON (the card's own
   defaults). Reject in the gallery when the mesh melts; the card
   cannot see the result, you (or the user) can.
2. **Rig** (`{model:}` rig, `mesh_glb=<lift mesh>`, `mode=auto`)
   — SOMA-77 template weights. `preserve_texture: true` keeps the
   lift's PBR set. Need Unity FBX instead of GLB?
   `file_format=fbx` (headless-Blender convert in the autorig
   subprocess).
3. **Motion** (`{model:}` motion, `model=kimodo`,
   `prompt=<verb-first action>`, `preview_glb=<rigged mesh>`) —
   the kimodo text-to-motion NPZ skinned onto the rigged mesh
   (somax bake in-graph). The stage returns the motion NPZ AND the
   animated GLB.

After the run settles: view the artifacts (melite_view on the run
id). Never claim the take without viewing.

## When the subject is a creature, not a human

The motion stage is human-shaped (kimodo moves SOMA bodies). For
creatures, replace stage 3 with the MOTION phase (leaf skill §MOTION):
pull a dataset clip through the game profile's unimate MCPs, then
rig `copy` (donor = the animated clip mesh) onto the lift. No
kimodo, no SOMA — the bridge script seats the motion.
