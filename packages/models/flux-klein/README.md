---
description: The FLUX.1 Klein model family — DECL and mods for the melite estate.
kind: package-library
---

# flux-klein

flux-klein registers FLUX.2 Klein 4B (form `form_generate`, label "FLUX.2 Klein 4B", genre `image`, engine `comfyui`): BFL's Apache-2.0 4B Klein — the low-VRAM image lane the estate's heavier families cannot serve. Defaults are the official distilled template's own: 1024×1024, 4 steps, cfg 1, euler; `scheduler` declares the card domain and wires nothing (the Flux2Scheduler node computes the empirical shift from steps and canvas). Provisions carry the shared lane weights with sha256 digests — the flux2 tokenizer `qwen_3_4b` (~8 GB) and `flux2-vae` (~336 MB) from Comfy-Org's ungated split repo; the unet rides the cell artifacts. The licence row is `apache-2.0`; the 9B tier is the non-commercial one and stays unprovisioned (no anonymously authorable sha256/size exists for it).

## Variants and recipes

- `distilled` (DEFAULT) — 4 steps / cfg 1, envelope steps [4,8] cfg [1,2], one BF16 cell (~7.8 GB, 16 GB VRAM peak); its `resolver_defaults` own the declared 4/1 face (BFL pins the tier fixed).
- `base` — 20 steps / cfg 5, envelope steps [10,60] cfg [2,8] (widened 2026-10-22 so BFL's own 50/4 author recipe fits), one BF16 cell of the base weights; its `lane_inputs.unet` override re-spells the run's UNETLoader to `flux-2-klein-base-4b`.
- Recipes: `author-base` (BFL's base defaults, 50 steps / cfg 4, patch-only, wants the Base variant) and the no-op `default`.

## The t2i action

`prompt` is required (every image lane states what the picture is); the declared surface is prompt, negative_prompt, width, height, seed, steps, cfg, sampler, scheduler. The graph: UNETLoader + LoRA stack → CLIPLoader (`flux2`) + VAELoader, the CLIPTextEncode pair, EmptyFlux2LatentImage at card resolution, and the FLUX.2 advanced sampling stack (Flux2Scheduler → KSamplerSelect, RandomNoise, CFGGuider, SamplerCustomAdvanced) → decode and save under `<run>/gen`. The negative arm branches on the stated prompt: blank composes ConditioningZeroOut — the true unconditional the 4-step distilled checkpoint trained against — and a stated negative encodes for real. No reference seat: a stated `reference_images` key refuses at the card's gated resolve; unstated canvas values fall to the DECL defaults, and a family that declares neither refuses loud.

## Mods

The DECL boards `mask` and `loras`. `./mods/mask` is the bare-flavor mask boarding: the pack contract owns the region fields, no gen lane builds a region arm, and a stated region refuses loud at admission. `./mods/loras` is the flavor seed with no first-party rows — user-provided files ride the pack's bag; rows land the day a first-party Klein adapter exists. A stated ip-adapter entry refuses loud (`refuseIPAdapterFiring`).

Exports: the plugin root, `./package.json`, `./mods/loras`, `./mods/mask`.

## Model Experience

#### What the model sees

The prompt and negative, the flux2 canvas size, and the sampling stack's steps, seed, and cfg; the graph is the template chain above.

#### Token effect

Zero-direct — the prompt rides the composed engine graph, never language-model context.

#### KV Cache effect

Independent — each generation is its own engine request; no shared prefix.

## Known Limitations and Deferred Work

- **The 9B tier is absent by licence** — the non-commercial BFL weights carry no authorable sha256/size; the lane lands when operator HF credentials unblock it.
- **No reference seat** — the create card takes no reference inputs (operator ruling, 2026-10-11); ReferenceLatent composes only when an edit arms it.
- **Live behavior unobserved** — documented from the DECL and action build, not verified against the running model.
