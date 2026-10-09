---
description: TRELLIS.2 Native family — background-removed image to textured GLB through voxel structure, shape, and texture stages, with the mesh action on the ComfyUI engine.
kind: package-library
---

# @melite/models-trellis2-native

`@melite/models-trellis2-native` is the model family package for TRELLIS.2 on native ComfyUI (`form_img_to_mesh`, genre 3d): background-removed conditioning flows to a voxel structure, a shape latent, and a texture atlas, saved as a `.glb`. The DECL declares the `mesh` action, a three-resolution variant rail, and the five-file lift-chain provisioning. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`; the img-to-mesh card binds the action. The lane is this package's own `actions.ts`, pinned to committed goldens.

## Declaration

Variants: `1024` (default; BF16 at ~12 GB VRAM peak or INT8 ConvRot at ~8 GB), `1536` (hero quality; 16/10 GB), and a hidden fast `512`. Family defaults fix the sampler table (euler/normal structure and shape, euler/simple then euler/normal texture), `steps` 12 / `shape_steps` 20, `cfg` 7.5, remesh at 768 faces decimated to 700k, atlas 4096, AO 1024, normal 2048, `sd3_shift` 5, and `seed` 42. The `mesh` action requires `input_image` — the 3D lift is image-conditioned and takes no text prompt — and its facts door refuses any of the five load keys missing: `unet`, `vae`, `texture_vae`, `clip_vision`, `background_removal`. Provisions pin the weights, including `birefnet.safetensors` from Comfy-Org's BiRefNet repo for background removal. The build runs structure, shape, upsample, remesh, texture, and the atlas/AO/normal bakes, then saves through `MeshToFile3D` + `Save3DAdvanced`.

## Model Experience

### Request context and condition

#### What the model sees

- **input_image** — required; the source image the lift conditions on.
- **resolution / bg_removal** — the closed variant table and the birefnet on/off/auto pick.
- **sampler rows and seed** — the per-stage sampler/scheduler/steps/cfg table and the sentinel-minted seed.

#### Token effect

Zero-direct token effect — the fields ride the composed ComfyUI graph; no harness context is spent.

#### KV Cache effect

Independent — each mesh run is its own engine request; no shared prefix.

## Known Limitations and Deferred Work

- **No text conditioning** — the lane accepts no prompt; shape intent must come from the image alone.
- **VRAM peaks are cell-declared** — the 8–16 GB figures are the DECL's measured rows, not runtime guarantees on every GPU.
- **Image quality ceiling** — background removal and texture fidelity are not verified against the running engine.
