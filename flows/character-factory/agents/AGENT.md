# Driving character-factory

You drive the rig→motion leg, in order, through the queue door. The
body comes to you as a GLB path (the lift leg is upstream — see
below). Your job:

1. **Rig** (`{model:}` rig, `mesh_glb=<body glb path>`, `mode=auto`)
   — SOMA-77 template weights. `preserve_texture: true` keeps the
   source PBR set. (The historic `file_format=fbx` arm is GONE with
   the blender lane — GLB is the node's only output format.)
2. **Motion** (`{model:}` motion, `model=kimodo`,
   `prompt=<verb-first action>`, `preview_glb=<rigged mesh>`) —
   the kimodo text-to-motion NPZ skinned onto the rigged mesh
   (somax bake in-graph). The stage returns the motion NPZ AND the
   animated GLB.

One call can drive both stages — `{flow: "character-factory",
mesh: <body glb path>, prompt: <action>}` — the row's merged run
rigs then animates in-graph.

## The lift leg (upstream, not a stage)

The photo→mesh lift is NOT a row stage: the lift's served producer
(img-to-mesh's Save3DAdvanced) is a terminal FILE_3D save and no
in-graph hop can carry it. Drive the lift as its own press —
`{model:}` img-to-mesh (`model=pixal3d`, `input_image=<photo>`,
repair knobs ON; reject in the gallery when the mesh melts — the
card cannot see the result, you or the user can), or the `{flow:}`
object-forge row — then feed the artifact path to this row's `mesh`
initial. That press→press handoff is the run-chain (the
rig card → fit-seat receipt shape).

After the run settles: view the artifacts (melite_view on the run
id). Never claim the take without viewing.

## When the subject is a creature, not a human

The motion stage is human-shaped (kimodo moves SOMA bodies). For
creatures, replace the motion stage with the MOTION phase (leaf
skill §MOTION): pull a dataset clip through the game profile's
unimate MCPs, then rig `copy` (donor = the animated clip mesh) onto
the body. No kimodo, no SOMA — the bridge script seats the motion.
