---
description: Krea 2 text-to-image family — the 8-step Turbo and 52-step Raw checkpoints behind one declared t2i lane, with a twelve-row operator LoRA board.
kind: package-library
---

# krea-2

krea-2 registers Krea 2 (form `form_generate`, genre `image`, engine `comfyui`): text-to-image with two checkpoints behind one declared `t2i` lane — Turbo, the 8-step distilled checkpoint (fast, photorealistic, the family default), and Raw, the 52-step base checkpoint the LoRAs train on. Both ride INT8 ConvRot artifacts (about 13.5 GB each) from the Comfy-Org/Krea-2 release; the lane's text encoder (`qwen3vl_4b_fp8_scaled.safetensors`) and VAE (`qwen_image_vae.safetensors`) are the family's provisions.

## Defaults, variants, recipes

Defaults: 1024×1024, `euler`, scheduler `normal`, 8 steps, cfg 1. Variants: `turbo` (sampler envelope steps 4–8, cfg 1–2) and `raw` (resolver defaults 52 steps / cfg 3.5, envelope steps 30–60, cfg 2–6; its `lane_inputs` override re-spells the unet as `krea2_raw_int8_convrot.safetensors` — without that override the raw route would compose the turbo checkpoint at a 52-step schedule, silently). Recipes: `realism` (stamps the `krea2_realism_lora` flavor row at the flavor's own default strength 0.7), `turbo_distill` (the rank-64 turbo adapter at strength 1.0), and the no-op `default`.

## The t2i action

Params: `prompt` (required — the one relation word) plus the sampling block (steps, cfg, sampler, scheduler, width, height, seed). Build: the CLIP text pair, EmptySD3LatentImage, KSampler, decode and save under `<run>/gen`. ControlNet and IP-adapter requests refuse loud on this lane. The DECL carries a prompt guide: continuous descriptive prose ordered subject → environment → lighting → camera.

## The LoRA board

Exports include `./mods/loras`, which carries twelve operator-supplied flavor rows (among them `krea2_realism_lora`, `krea2_turbo_lora_rank_64_bf16`, `krea2_darkbrush`, `krea2_dotmatrix`, `krea2_kidsdrawing`, `krea2_neondrip`, `krea2_rainywindow`, `krea2_retroanime`, `krea2_softwatercolor`, `krea2_sunsetblur`, `krea2_vintagetarot`, `krea2filterbypass3`). They are picker vocabulary, never downloads: the DECL's `mods` list boards the flavor, and no provision fetches any row. The DECL also boards `./mods/mask`, the bare-flavor mask mod: the pack contract owns the region fields, no gen lane builds a region arm, and a stated region refuses loud at admission.

## Model Experience

### Request context and condition

A run needs the prompt; the sampling block rides defaults. Pick the variant first — Turbo for the 8-step cascade, Raw for 52-step fidelity or LoRA training.

#### What the model sees

The prompt, negative, latent size, sampler pair, steps, cfg, and seed; the graph is the four-segment chain above.

#### Token effect

Zero-direct: an engine graph, not a token stream.

#### KV Cache effect

Independent: each run is self-contained.

## Known Limitations and Deferred Work

- **Raw route depends on its override** — the raw variant's correctness rides its `lane_inputs` re-spelling; a drifted row would pair the 52-step schedule with the 8-step weights.
- **Operator-supplied LoRAs** — the twelve rows are never fetched; a missing file fails at engine validation, loudly but late.
- **Live behavior unobserved** — envelopes, recipes, and refusal voices are documented from the DECL and action build, not verified against the running model.

Exports: the plugin root, `./package.json`, `./mods/loras`, `./mods/mask`.
