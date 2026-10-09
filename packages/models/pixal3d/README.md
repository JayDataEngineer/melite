---
description: Pixal3D pixel-aligned image-to-mesh — MoGe camera conditioning, the shared TRELLIS.2 sampler chain, textured GLB output at the hero tier.
kind: package-library
---

# pixal3d

pixal3d registers the Pixal3D family (form `form_img_to_mesh`, label "Pixal3D", genre `3d`, engine `comfyui`): pixel-aligned image-to-3D — MoGe camera conditioning feeds DINOv3+NAF pixel-aligned embeddings through the shared TRELLIS.2 sampler chain to a textured `.glb`. Positioning: the hero-asset tier — nearest reconstruction fidelity, slower than TRELLIS.2. The DECL also declares the studio lane (`3d/img-to-mesh`, kind `assembly`), writing `input_image`, `rigged_glb`, and `target_glb`.

## The mesh action

`mesh` outputs one GLB. The declared surface is wide: `input_image`; `seed` (seed-sentinel rule); `resolution` (1024 / 1536 / 512); `steps`, `shape_steps`, `tex1_steps`, `tex2_steps` [4, 60]; `cfg`, `shape_cfg`, `tex1_cfg`, `tex2_cfg` [1, 15]; per-stage sampler and scheduler enums; `bg_removal`; `camera_fov`; the remesh block (`remesh_resolution` [128, 2048], `remesh_qef`, `remesh_drop_inverted`, `remesh_drop_enclosed`, `remesh_fix_poles`); `decimate_faces` [10000, 2000000]; `smooth_angle` [0, 180]; `atlas_size`, `ao_size`, `normal_size`; `sd3_shift` [1, 10]; `rescale_struct`, `rescale_shape` [0.1, 1]; `override_struct`, `override_shape` [0, 1].

Defaults sample the middle of that surface: resolution 1024, 12 steps at cfg 7.5, shape pass 20 steps / cfg 7.5, texture passes 12 each, remesh at 768, decimation to 700000 faces, 4096 atlas, 2048 normal map, shift 5, `camera_fov` auto, seed 42.

## Weights

`lane_inputs` pin five files: the unet (`pixal3d_int8_convrot.safetensors`), the TRELLIS.2 shape and texture VAEs (bf16), the CLIP vision tower (`dino_v3_L_naf_fp32.safetensors`), and BiRefNet (`birefnet.safetensors`) for background removal; MoGe's `moge_2_vitl_normal_fp16.safetensors` (geometry estimation) rides the provisions. Variants: `1024` (bf16 about 12 GB / int8 about 8 GB VRAM), `1536` (bf16 16 / int8 10 — the hero tier), `512` (fast).

## Model Experience

### Request context and condition

A run needs the input image; every other knob has a declared default tuned for the 1024 tier. Reach for the 1536 variant when reconstruction fidelity matters more than runtime.

#### What the model sees

One image, the resolution tier, the shape and texture sampler stacks, the remesh and atlas block, and the seed; the graph is the MoGe → pixel-aligned encoder → TRELLIS.2 chain above.

#### Token effect

Zero-direct: an engine graph, not a token stream.

#### KV Cache effect

Independent: each run is self-contained.

## Known Limitations and Deferred Work

- **Wide param surface** — dozens of declared params; the card schema owns admission, and the action trusts the walked shape.
- **Hero-tier latency** — the 1536 tier's runtime cost is the accepted trade; not verified against the running model.
- **Provision weight** — several multi-GB files land before the first mesh.

Exports: the plugin root, `./package.json`.
