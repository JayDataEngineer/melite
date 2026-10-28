---
description: Qwen Image Edit 2511 — the anchored instruction-edit lane: EditPlus conditioning, source-resolution edits, crop_stitch region detail, Lightning distill.
kind: package-library
---

# qwen-img-edit-2511

qwen-img-edit-2511 registers Qwen Image Edit 2511 (form `form_edit`, label "Qwen Image Edit 2511", genre `image`): instruction-driven editing on the 2511 lane. The graph: loaders → lora stack → per-slot LoadImage anchors → the TextEncodeQwenImageEditPlus pair (references ride the stock node's native image2/image3 optionals — THREE images total; past that the kit refuses loud) → ModelSamplingAuraFlow fixed at shift 1.0 → either the crop_stitch region detailer (mask stated with mask_mode crop_stitch), or the plain VAEEncode-of-source → KSampler → decode and save under `<run>/edit` (auto+mask refuses — no lane inpaints in place since the 2026-11-12 inline-inpaint retirement). Edits happen at SOURCE resolution: the input image IS the latent; the family declares no width/height and refuses a stated size.

## Defaults and the recipe-weights law

Defaults: 20 steps, `euler` / `simple`, cfg 2.5, `use_stock_nodes` false, `double_reference` false — sampling the pinned INT8 ConvRot unet. The law behind them: a recipe must match its checkpoint. The old 4-step / cfg-1 defaults were the LIGHTNING recipe for the distilled checkpoint and washed out standard-weight edits (live-evidenced run bcb995c95f2c).

Variants: `standard` (INT8 ConvRot merge, 20 steps / cfg 2.5, about 20 GB VRAM, DEFAULT) and `lightning` (the 4-step lightx2v distilled checkpoint — swaps BOTH the recipe, steps 4 / cfg 1, AND the unet via its own `lane_inputs`; the FP8 file is not on the box by default and refuses loud without provisioning). Recipes: `strong_identity` (`double_reference` true — plane truth: the TS compose plane refuses `double_reference` true loud, so selecting it guarantees a refusal until the double-encode lane exists), `upstream_solvers`, `default`.

## Mod surface

Two boarded flavors: `mask` (bare — feeds the crop_stitch region flow), and the LoRA board — `./mods/loras` declares three rows: Lightning 4-Step (lightx2v, strength 1, steps 4), Multiple Angles (the fal camera-control adapter; `<sks>` is its trigger vocabulary, strength 0.8), and MCNL Multi-Concept (strength 0.8). Rows are picker vocabulary, never auto-fetched. Provisions: the Qwen2.5-VL 7B text encoder (fp8 scaled, about 9.4 GB) and the Qwen image VAE (about 254 MB); the unet rides the variant cells.

## Model Experience

### Request context and condition

A run needs at least one anchor image and the edit instruction; up to three images ride the stock slots, and an optional mask with mask_mode crop_stitch routes the run onto the region detailer (auto+mask refuses).

#### What the model sees

Up to three anchored images, the instruction, the sampling block, and the optional mask; the lane above, at the source image's resolution.

#### Token effect

Zero-direct: an engine graph, not a token stream.

#### KV Cache effect

Independent across runs; within a run the EditPlus node conditions on the anchor images directly — there is no reference-cache wrapper here (that is the 2.1 lane's mechanism).

## Known Limitations and Deferred Work

- **Three-image ceiling** — the stock node's own truth; larger reference sets are the 2.1 lane's job.
- **strong_identity refuses** — the declared recipe cannot compose on the current TS plane until the double-encode lane exists.
- **No width/height** — stated sizes are refused; resolution control means resizing the input first.
- **Live behavior unobserved** — not verified against the running model, except where run evidence is cited above.

Exports: the plugin root, `./package.json`, `./mods/loras`, `./mods/mask`.
