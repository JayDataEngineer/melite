---
description: The Moss model family — DECL and mods for the melite estate.
kind: package-library
---

# moss-image

moss-image registers MOSS-Image (form `form_generate`, label "MOSS-Image", genre `image`, engine `comfyui`): OpenMOSS's 5B DiT in the FLUX.2 latent space, served through Comfy-Org's repack, Apache-2.0. Defaults are the template's own: 1024×1024, 50 steps, CFG 3, `er_sde` / `simple` — and unlike klein the knobs wire: the template's plain KSampler takes them. The flow shift is declared (5.0) and rides ModelSamplingAuraFlow. Prompts take line breaks and quoted text for rendered typography and native JSON bbox layouts — prompt-side craft, no extra knob. Provisions carry the template's OWN files with digests: the `qwen3.5_9b_w4a8_gptq` tokenizer (~7.3 GB) and the small flux2 VAE (~250 MB) — the first cure's klein-pair dedupe was reverted once the operator's render proved the template files load-bearing. A 300 s timeout floor keeps the 50-step lane from being judged hung.

## Variants and recipes

- `sft` (DEFAULT) — the supervised-fine-tuned checkpoint, 50 steps / CFG 3 (envelope steps [25,50], cfg [1,5]), two per-quant cells naming their own unets: `int8_convrot` (5.4 GB, the official ConvRot artifact, DEFAULT) and `bf16` (10.2 GB).
- Recipes: `quick-iter` (28 steps, the template's 25–30 fast band; wants the SFT variant) and the no-op `default`.

## The t2i action

`prompt` is required; the declared surface is prompt, negative_prompt, width, height, seed, steps, cfg, sampler, scheduler. The graph: UNETLoader + the declared shift wrap + CLIPLoader (`moss_image`) + VAELoader, the CLIPTextEncode pair, EmptyFlux2LatentImage at card resolution, SkipLayerGuidanceDiTSimple on single layer 22, and the plain KSampler → decode and save under `<run>/gen`. NO advanced stack: the Flux2Scheduler/KSamplerSelect/CFGGuider/RandomNoise/SamplerCustomAdvanced topology — the klein sigma ladder — never emits on this lane; it was the 2026-10-20 weave burn. The negative arm bites: CFG 3 is live guidance, so a stated negative encodes and steers, while a blank one composes ConditioningZeroOut. No reference seat: a stated `reference_images` key refuses.

## Mods

The DECL boards `mask` and `loras`. `./mods/mask` is the bare-flavor mask boarding: the pack contract owns the region fields, no gen lane builds a region arm, and a stated region refuses loud at admission. `./mods/loras` is the klein-style seed with no first-party rows — user-provided files ride the pack's bag until a MOSS adapter exists. A stated ip-adapter entry refuses loud (`refuseIPAdapterFiring`).

Exports: the plugin root, `./package.json`, `./mods/loras`, `./mods/mask`.

## Model Experience

#### What the model sees

The prompt and negative, the flux2 canvas size, the sampling knobs, and the declared shift; the graph is the template chain above.

#### Token effect

Zero-direct — the prompt rides the composed engine graph, never language-model context.

#### KV Cache effect

Independent — each generation is its own engine request; no shared prefix.

## Known Limitations and Deferred Work

- **The sampler pair follows the repack author** — OpenMOSS's own HF-loader flow runs euler/sgm_uniform; the family follows the Comfy-Org template's er_sde/simple, the reference for the provisioned weights.
- **Live behavior unobserved** — documented from the DECL and action build, not verified against the running model.
