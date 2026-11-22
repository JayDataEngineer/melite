---
description: TRELLIS.2 Native family — image-conditioned textured GLB through voxel structure, shape, and texture stages, with the mesh action on the ComfyUI engine.
kind: package-library
---

# @melite/models-trellis2-native

`@melite/models-trellis2-native` is the model family package for TRELLIS.2 on native ComfyUI (`form_img_to_mesh`, genre 3d): the photo conditions a voxel structure, a shape latent, and a texture atlas, saved as a `.glb`. The DECL declares the `mesh` action, one variant row (`1024`, INT8 ConvRot, 8 GB peak) plus the high/standard/fast/quality recipe rail, and the four-file lift-chain provisions. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`; the img-to-mesh card binds the action. The lane is this package's own `actions.ts`, pinned to committed goldens.

## Declaration

Variants: `1024` (INT8 ConvRot, 8 GB VRAM peak), the lane's only body. Recipe rail: `high` (default — 1536 detail + remesh tail, still runnable), `standard` (the 1024 calibrated floor), `fast` (preview tail), `quality` (1536 hero pass, 32 GB+ VRAM). Family defaults fix the sampler table (euler/normal structure and shape, euler/simple then euler/normal texture), `steps` 12 / `shape_steps` 20, `cfg` 7.5, remesh at 768 faces decimated to 700k, atlas 4096, AO 1024, normal 2048, `sd3_shift` 5, and `seed` −1 (sentinel-minted). The `mesh` action requires `input_image` — the 3D lift is image-conditioned and takes no text prompt — and its facts door refuses any of the four load keys missing: `unet`, `vae`, `texture_vae`, `clip_vision`. Provisions pin the four lift-chain weights. The build runs structure, shape, upsample, remesh, texture, and the atlas/AO/normal bakes, then saves through `MeshToFile3D` + `Save3DAdvanced`.

## Model Experience

### Request context and condition

#### What the model sees

- **input_image** — required; the source image the lift conditions on.
- **resolution** — the variant rail's `1024` rail, stamped by the high/quality recipes at 1536.
- **red-channel crop, not background removal** — the build cuts the subject with an ImageToMask red-channel crop; no birefnet leg is provisioned.
- **sampler rows and seed** — the per-stage sampler/scheduler/steps/cfg table and the sentinel-minted seed.

#### Token effect

Zero-direct token effect — the fields ride the composed ComfyUI graph; no harness context is spent.

#### KV Cache effect

Independent — each mesh run is its own engine request; no shared prefix.

## Known Limitations and Deferred Work

- **No text conditioning** — the lane accepts no prompt; shape intent must come from the image alone.
- **VRAM peaks are cell-declared** — the 8–16 GB figures are the DECL's measured rows, not runtime guarantees on every GPU.
- **Image quality ceiling** — texture fidelity is not verified against the running engine.
