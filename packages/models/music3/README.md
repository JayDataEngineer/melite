---
description: MiniMax Music 3 text-to-music — caption and lyrics conditioning over INT8 ConvRot weights, mp3 output under the run directory.
kind: package-library
---

# music3

music3 registers the MiniMax Music 3 family (form `form_music`, label "MiniMax Music 3", genre `audio`, engine `comfyui`): text-to-music with lyrics. Weights: three INT8 ConvRot provisions from Comfy-Org/MiniMax-Music-3 — the DiT (`minimax_music3_dit_int8_convrot.safetensors`, about 2.5 GB), the pruned text encoder (about 9.2 GB), and the DAV VAE (about 0.22 GB). The `lane_inputs` pin `clip_type: minimax` and the three file names.

## The compose action

`compose` builds: UNETLoader + CLIPLoader (type `minimax`) + VAELoader → MiniMaxMusic3TextEncode (caption + lyrics, `top_k` 50) → ConditioningZeroOut (the negative arm) → EmptyMiniMaxMusic3LatentAudio → KSampler (euler / simple) → VAEDecodeAudio → SaveAudioAdvanced (mp3, V0) under `<run>/music`.

Params: `prompt` (required — the caption), `lyrics`, `duration` [5, 360] seconds, `guidance_scale` [0.1, 10], `lm_cfg_scale` [0.1, 10], `n_diffusion_steps` [1, 200], `seed` (seed-sentinel rule).

## Variants and recipes

One variant (`standard`, INT8 ConvRot cell, about 20 GB VRAM peak). Recipes: `short_sting` (duration 5), `full_length` (duration 360), and the no-op `default`.

## Model Experience

### Request context and condition

A run needs the caption; lyrics, duration, and both CFG scales ride defaults. Use `short_sting` or `full_length` to jump to the duration bounds, or state `duration` directly.

#### What the model sees

The caption and lyrics, the duration, both CFG scales, and the step count; the solver pair (euler / simple) is fixed by the build, not a param.

#### Token effect

Zero-direct: an engine graph, not a token stream.

#### KV Cache effect

Independent: each run is self-contained.

## Known Limitations and Deferred Work

- **Fixed solver** — sampler and scheduler are hardcoded in the build; the params surface offers no solver override.
- **Lyrics optional by type only** — the DECL requires just the caption; lyric-less output quality is not verified against the running model.
- **Single quant** — one INT8 ConvRot tier; no bf16 cell is declared.
- **Provision weight** — roughly 12 GB of downloads before the first note.

Exports: the plugin root, `./package.json`.
