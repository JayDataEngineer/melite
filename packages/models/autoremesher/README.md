---
description: AutoRemesher family, AI quad remeshing of triangle-soup meshes with an explicit quad budget.
kind: package-library
---

# @melite/models-autoremesher

The AutoRemesher family — AI quad remeshing: triangle-soup meshes in, clean quad topology out, under an explicit budget with no silent defaults. The family declares on the comfyui engine, genre 3d. The lane is the action file (the ONE-IMPLEMENTATION rule): the `AutoRemesher` node is the lane.

The quad-remesh card binds the remesh action: one AutoRemesher node, GLB in, remeshed GLB out under `<run>/remeshed` — the output prefix is the run id, never a knob. Params: `input`, `target_quads` (0–200000), `edge_scaling` (0–4), `sharp_edge` (0–180), `adaptivity` (0–2), `anisotropy` (0–4). `smooth_normal` is absent by intent — the node hardcodes `--smooth-normal 0.0`. The family is weightless: the binary owns its own weights, and the facts door is the vacuous parse. The wire is pinned to committed goldens recorded while the card kit's twin still existed.

## Declaration

`src/index.ts` declares the DECL and the `family-autoremesher` plugin; `src/actions.ts` owns the remesh segment and its typed params.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL serves the estate's model catalog (label, description, variants, defaults) and the quad-remesh card that boards the family; it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the package registers a model family and composes engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **smooth_normal is not exposed** — the node hardcodes it to 0.0, so normals leave the binary unchanged and no knob exists to soften them.
- **Quad budget ceiling** — target_quads caps at 200000; a larger budget refuses at the family door.
- **Input admission stays card-side** — the input path and its admission live on the quad-remesh card; the family owns the node contract only.
