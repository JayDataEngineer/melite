---
description: Image-to-mesh card that boards three mesh families — pixal3d, trellis2-native, and transfer-rig — plus the mesh studio client.
kind: package-library
---

# @melite/3d-img-to-mesh

`@melite/3d-img-to-mesh` is the image-to-mesh card. One card serves three families, each with its own declared action: `pixal3d` and `trellis2-native` run the `mesh` action (image in, mesh out); `transfer-rig` runs `transfer` (rig transfers between two GLBs). The cardPackages SSOT composes the card from `./card`; the browser studio rides `./client`.

## Contract

- `./card` — the card definition (`id: 'img-to-mesh'`). Family dispatch keys on `model.family ?? model.id`; an unbound family refuses loudly. Per-family requirements: pixal3d needs the `ComfyUI-MoGe` pack, transfer-rig needs `melite-autorig-nodes`, trellis2-native needs none; the card-level `requires` is the union. Flow seats: `input_image` (image), `rigged_glb` and `target_glb` (mesh) in; mesh out, bound to `Save3DAdvanced.0` or `SaveRiggedModel.0` per action. Autofill literals (RemeshMesh band/project_back, ImageCropToMask background/grow_mask, MoGeInference apply_mask/batch_size/force_projection/fov_x_degrees) ride the compose; `remesh_qef`, `remesh_drop_inverted`, `remesh_drop_enclosed`, and `remesh_fix_poles` are card params.
- `./client` — `ImgToMeshStudio`, a DeclarativeStudio registration exposing the `input` and `generation` stages with the mesh preview; the plugin injects into `slots`.
- `.` — the row-mounted host face; it registers nothing.
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

A run conditions the mesh graph only when the card composes; the package ships no agent tool face.

#### What the model sees

The active family's mesh model receives `input_image` plus the gated card params; the transfer action receives both GLBs.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **Per-family surfaces differ** — only pixal3d and transfer-rig carry pack requirements today; a new family must declare both its action and its slice.
- **Studio exposure is fixed** — `ImgToMeshStudio` folds the input and generation stages; other stages are not exposed yet.
