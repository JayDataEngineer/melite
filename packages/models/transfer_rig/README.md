---
description: Transfer Rig family — GPU KNN rig copy from a rigged donor GLB onto a clothed target GLB, with the transfer action on the ComfyUI engine.
kind: package-library
---

# @melite/models-transfer_rig

`@melite/models-transfer_rig` is the model family package for rig transfer (`form_img_to_mesh`, genre 3d, engine comfyui): it copies the rig from a rigged donor GLB onto a target GLB through GPU KNN weight transfer. The DECL declares the `transfer` action (the third boarding seat of the img-to-mesh card), one provision, and the lane facts. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`. The family is path-based — no checkpoints — so the facts door is the vacuous parse; the segment is the legacy `transferRigArm` verbatim, pinned to committed goldens in `tests/action.spec.ts`.

## Declaration

One variant row, `standard` with a `native` cell. `lane_inputs` names `somaskel77/skin_standard.npz`, and the matching provision pins it from the Kimodo repository (`raw.githubusercontent.com/nv-tlabs/kimodo`, folder `somaskel77`, sha256 `90ee2cdf…b0ceb2`, 531,434 bytes) — a mirrored receipt: the family whose lane loads a file declares it. The `transfer` action takes exactly two params, `rigged_glb` (the donor) and `target_glb` (the clothed mesh); both are required and the family refuses a missing arm in its own voice before any node renders. The build wires `KimodoTransferWeights` and persists with `SaveRiggedModel` (`glb: GLB` output).

```
.
./package.json
```

## Model Experience

### Request context and condition

#### What the model sees

- **rigged_glb** — required; the donor rig.
- **target_glb** — required; the clothed mesh receiving the weights.

#### Token effect

Zero-direct token effect — both fields ride the composed ComfyUI graph as path strings.

#### KV Cache effect

Independent — each transfer run is its own engine request; no shared prefix.

## Known Limitations and Deferred Work

- **Path-based only** — the action takes file paths, not upstream `$` tensor refs; callers work through the disk handoff.
- **KNN quality** — weight-transfer fidelity on meshes far from the donor topology is not verified against the running engine.
- **One skeleton prior** — `skin_standard.npz` is the only declared prior; other skeletons are a family change.
