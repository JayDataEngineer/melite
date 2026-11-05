---
description: Rigging card that puts a skeleton and weights on a GLB through two engine-native lanes — auto SOMA-77 weights and donor copy.
kind: package-library
---

# @melite/3d-rig

`@melite/3d-rig` is the rig card: "skeleton + weights on this GLB". It is engine-native over the vendored autorig and poser node packs — no checkpoints ride. The cardPackages SSOT composes it from `./card`; the rig-report parsing lives behind `./validate-rig-report`.

## Contract

- `./card` — the card definition with two modes, dispatched per family (`transfer-rig`, `gem-soma`). `auto` uses `KimodoExportFBX` with `apply_weights` — template weights from the SOMA-77 skeleton in `melite-autorig-nodes`; the node writes the rigged GLB itself, so `mesh_glb` (required) and `preserve_texture` are the auto lane's whole surface. `copy` runs `KimodoTransferWeights` plus `SaveRiggedModel`, moving weights from `donor_glb` to the target. (The `species` lane — `RayCreatureRigBridge` over the anyCreature skeleton — died with the blender lane, 2026-11-01, and the `@melite/models-anycreature` family behind it is deleted; the `file_format` fbx door and `decimate_ratio` died in the same removal.) The card also re-exports the validate-rig report helpers.
- `./validate-rig-report` — `parseValidateRigOutput`, `validateRigReport`, and `ValidateRigOutputError`, with the `ValidateRigJson`, `ValidateRigViolation` (severity `CRITICAL` or `WARNING`), and `ValidateRigOutput` (`passed`, `violations`, `stats`) types. The same names re-export from the card module.
- `.` — the row-mounted host face; it registers nothing.
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

The card runs whenever a flow stages a mesh through it; no agent tool face ships.

#### What the model sees

Nothing — the lanes bind template, donor, or bridge weights; no neural model loads on this card.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **The dead lanes stay dead** — skintokens died in the 2026-10-12 operator kill; the species lane died with the blender lane (2026-11-01, operator: melite carries no blender); the card ships auto/copy, period.
- **fbx is the engine-facing export** — GLB is the interchange default; fbx exists for Unity import and is not validated further here.
