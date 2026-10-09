---
description: UltraShape 1.0 image-guided mesh refinement — sharpens coarse image-to-3D output before rigging; unoffered registration.
kind: package-library
---

# mesh_refine

mesh_refine registers the UltraShape Mesh Refine family (form `form_3d_mesh_refine`, genre `3d`), unoffered: image-guided refinement of a coarse mesh — the UltraShape 1.0 DiT — that carves sharp limb separation and hard-surface edges into blobby image-to-3D output, TRELLIS-shaped meshes especially, using the same guide image that produced the coarse pass. Its place in the line is pre-rig cleanup: run it BEFORE the SOMAX rig pass, so proximity-based weight transfer cannot glue arm vertices to torso bones.

## Declaration surface

One variant (`standard`, native route `mesh_refine`) plus the no-op `default` recipe. No defaults, no actions, no provisions. The sixteen node-input keys the legacy lane once named are gone from the DECL on purpose: the live node definitions own that truth now, and restating it here would be a second copy waiting to drift.

## Model Experience

### Request context and condition

The guide image and the coarse mesh are the serving lane's inputs; this package contributes the registration — the id, label, and route a card names. Refinement controls ride the node definitions, not a declared param surface.

#### What the model sees

Undeclared here — the DECL names no params or weights; the engine lane that serves `mesh_refine` owns the graph.

#### Token effect

None — the package contributes no model-visible input.

#### KV Cache effect

Independent — nothing shared is declared.

## Known Limitations and Deferred Work

- **No declared knobs** — refinement strength and iteration controls are the node definitions' truth; cards cannot tune them through this package.
- **Pipeline ordering is advisory** — the before-SOMAX rule is stated in prose, not enforced by a declared relation.
- **Live behavior unobserved** — not verified against the running model.

Exports: the plugin root, `./package.json`.
