---
name: img-to-mesh
description: "Image → 3D — one image lifted into a textured .glb mesh (TRELLIS.2 native or Pixal3D pixel-aligned). Rig-copy lane for transfer_rig on the same surface."
---

You are the agent interface for the **img-to-mesh card** (three
families board one surface):

- `trellis2-native` — one image → one textured 3D mesh (.glb) on
  ComfyUI's NATIVE TRELLIS.2 core (DINOv3 conditioning, no extension
  packs). The default lift.
- `pixal3d` — the pixel-aligned hero tier. Same chain, alt
  conditioning (Pixal3DConditioning carries a proj_pack + camera
  transform; TRELLIS.2's doesn't). MoGe pass for per-image FOV.
- `transfer_rig` — copy a SOMA rig onto a clothed GLB via GPU KNN
  weight transfer (KimodoTransferWeights on our autorig pack).
  Different inputs — surfaces through the same studio.

## When to use this card

- The user wants a **3D mesh/asset from an image** (a prop, a hero
  object, a concept lift).
- A flow needs a **.glb** for downstream 3D work (rigging in
  the character lane, kit assembly, viewer inspection).
- The user wants to **transfer a SOMA rig** onto a clothed GLB
  (transfer_rig, the rig-copy lane).

## The knobs

- `input_image` (REQUIRED for trellis2-native + pixal3d): one clear
  object, tight framing. No text prompt — the image IS the
  conditioning.
- `rigged_glb` + `target_glb` (REQUIRED for transfer_rig): the
  SOMA-rigged donor + the clothed target.
- `resolution`: 1024 standard / 1536 hero (the 1536 route stamps the
  upsample target; 512 is not an engine-supported target).
- `steps` + `cfg`: the STRUCTURE stage (the lift). Shape runs a
  calibrated 20/7.5, texture a calibrated 12/1.0 — fixed upstream
  truth, not card knobs.
- `camera_fov` (pixal3d only): per-image horizontal FoV feeding
  the camera transform matrix. `auto` = MoGeInference estimates
  from the source image (recommended); a literal degree value
  (35 / 49.13 / 60 / 75 / 90) skips MoGe (operator-vouched
  calibrated camera, no MoGe VRAM).
- `filename_prefix` is run-owned; it is not a card parameter.

## Artifacts

- `<prefix>_<counter:05>.glb` — the TEXTURED mesh (atlas
  baked via ApplyTextureToMesh), in the run output. The saver mints
  the counter (Save3DAdvanced/SaveGLB spell); resolution and seed
  never appear in the name.

## Honest edges

- The 512 target is not offered: the live Trellis2 upsample node
  requires at least 1024. Use 1024 for iteration and 1536 for a
  higher-resolution asset.
- Only the provisioned INT8 ConvRot cells are offered; the engine
  has no BF16 checkpoint for these lanes.
- Pixal3D and TRELLIS.2 share the entire sampler chain (structure →
  shape → upsample → texture → apply → bake → glb). The only delta
  is the conditioning node + a MoGe pass on pixal3d. Switching
  models is a single field flip — output fidelity difference is the
  pixel alignment (pixal3d) vs DINO-only (trellis2-native), not the
  graph.
- VRAM peak ~8–12 GiB (int8) + ~1.3 GiB MoGe on pixal3d: the
  queue serializes GPU runs.
