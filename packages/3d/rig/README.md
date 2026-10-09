---
description: Rigging card that puts a skeleton and weights on a GLB through three engine-native lanes — auto SOMA-77 weights, donor copy, and anyCreature species bridge.
kind: package-library
---

# @melite/3d-rig

`@melite/3d-rig` is the rig card: "skeleton + weights on this GLB". It is engine-native over the vendored autorig and poser node packs — no checkpoints ride. The cardPackages SSOT composes it from `./card`; the rig-report parsing lives behind `./validate-rig-report`.

## Contract

- `./card` — the card definition with three modes, dispatched per family (`transfer_rig`, `gem_soma`, `anycreature`). `auto` uses `KimodoExportFBX` with `apply_weights` — template weights from the SOMA-77 skeleton in `melite-autorig-nodes`. `copy` runs `KimodoTransferWeights` plus `SaveRiggedModel`, moving weights from `donor_glb` to the target. `species` uses the `RayCreatureRigBridge` (`melite-poser-nodes`) onto the anyCreature skeleton, with `height_ratio`, `max_influences`, and `strip_body`. Shared knobs: `mesh_glb` (required), `file_format` (`glb` or `fbx` — fbx is the Unity-facing path), `preserve_texture`, and `decimate_ratio`. The card also re-exports the validate-rig report helpers.
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

- **Skintokens lane is deferred** — the card ships auto/copy/species only; the skintokens path is not boarded.
- **fbx is the engine-facing export** — GLB is the interchange default; fbx exists for Unity import and is not validated further here.
