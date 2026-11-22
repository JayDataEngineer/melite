---
description: MiniMax Music 3 text-to-music — caption and lyrics conditioning over fp16 weights (INT8 low-VRAM cell beside), mp3 output under the run directory.
kind: package-library
---

# music3

music3 registers the MiniMax Music 3 family (form `form_music`, label "MiniMax Music 3", genre `audio`, engine `comfyui`): text-to-music with lyrics. Weights: four provisions from Comfy-Org/MiniMax-Music-3 (≈16.8 GB) — the fp16 DiT atom (`minimax_music3_dit_fp16.safetensors`, the template default) plus the INT8 ConvRot low-VRAM cell, the pruned text encoder, and the DAV VAE. The `lane_inputs` pin `clip_type: minimax` and the three file names (unet is the fp16 DiT).

## The compose action

`compose` builds: UNETLoader + CLIPLoader (type `minimax`) + VAELoader → MiniMaxMusic3TextEncode (caption + lyrics, `top_k` 50) → ConditioningZeroOut (the negative arm) → EmptyMiniMaxMusic3LatentAudio → KSampler (euler / simple) → VAEDecodeAudio → SaveAudioAdvanced (mp3, V0) under `<run>/music`.

Params: `prompt` (required — the caption), `lyrics`, `duration` [5, 360] seconds, `guidance_scale` [0.1, 10], `lm_cfg_scale` [0.1, 10], `n_diffusion_steps` [1, 200], `seed` (seed-sentinel rule).

## Variants and recipes

One variant (`standard` — the fp16 cell beside the INT8 ConvRot low-VRAM cell at about 20 GB VRAM peak). Recipes: `short-sting` (duration 5), `full-length` (duration 360), and the no-op `default`.

## Model Experience

### Request context and condition

A run needs the caption; only duration and the two CFG scales ride defaults — lyrics is a user seat. Use `short-sting` or `full-length` to jump to the duration bounds, or state `duration` directly.

#### What the model sees

The caption and lyrics, the duration, both CFG scales, and the step count; the solver pair (euler / simple) is fixed by the build, not a param.

#### Token effect

Zero-direct: an engine graph, not a token stream.

#### KV Cache effect

Independent: each run is self-contained.

## Known Limitations and Deferred Work

- **Fixed solver** — sampler and scheduler are hardcoded in the build; the params surface offers no solver override.
- **Lyrics optional by type only** — the DECL requires just the caption; lyric-less output quality is not verified against the running model.
- **Two quant cells** — the fp16 atom (the template default) and the INT8 ConvRot low-VRAM cell.
- **Provision weight** — roughly 16.8 GB of downloads before the first note.

Exports: the plugin root, `./package.json`.
