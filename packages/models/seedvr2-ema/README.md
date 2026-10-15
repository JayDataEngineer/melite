---
description: SeedVR2 upscaler family — diffusion one-step image super-resolution at 3B (FP16) or 7B (FP8), with the upscale action on the ComfyUI engine.
kind: package-library
---

# @melite/models-seedvr2-ema

`@melite/models-seedvr2-ema` is the model family package for SeedVR2, the diffusion image upscaler (`form_upscale`, genre image). It declares the family, the `upscale` action, and three provisions from `huggingface.co/numz/SeedVR2_comfyUI` (folder `SEEDVR2`, each sha256- and size-pinned). The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`; the upscale-tools card binds the action. The lane is this package's own `actions.ts`, pinned to committed goldens in `tests/golden/`.

## Declaration

Variants: `3b` (3B FP16, ~7 GB VRAM, the default), `7b` (7B FP8, about 3x slower), and a hidden `vae-fp16` row folded into the family. Recipe rows `preview_256`, `fhd_1080`, and `uhd_2160` stamp resolution picks, plus the empty `Default`. Family defaults: `resolution` 1080, `max_resolution` 4096, `batch_size` 1, `seed` 0. The `upscale` action's declared params: `input_image` (string, accepts a `$`-spelled upstream tensor reference or a loader name), `resolution` (bounds 256–2160), `max_resolution` (512–4096), `batch_size` (1–16), and a seed-sentinel `seed`. The build wires `SeedVR2LoadDiTModel` + `SeedVR2LoadVAEModel` from the lane's `unet`/`vae` facts and saves under `<run>/gen`.

`relations.required` names `input_image`: an upscale needs its source — the request states the image to upscale.

## Model Experience

### Request context and condition

#### What the model sees

- **input_image** — required; the source image or `$`-spelled upstream tensor.
- **resolution / max_resolution** — the target and cap the upscaler sizes to.
- **batch_size, seed** — throughput and the minted generation seed.

#### Token effect

Zero-direct token effect — the fields ride the composed ComfyUI graph; no harness context is spent.

#### KV Cache effect

Independent — each upscale run is its own engine request; no shared prefix.

## Known Limitations and Deferred Work

- **Two model sizes, one lane file** — the 7B variant reuses the same segment; per-variant tuning beyond the lane_inputs stamp does not exist.
- **Lane_inputs keys ride unvalidated** — keys the segment never reads (checkpoint, texture_vae) pass through the facts door unchecked, by declared contract.
- **Speed** — 7B FP8 is roughly 3x the 3B cost; there is no batching-across-images lane.
