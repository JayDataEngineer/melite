---
description: Qwen Image 2.1 — one base checkpoint serving text-to-image here and reference-cached editing in the sibling edit package.
kind: package-library
---

# qwen-img-21

qwen-img-21 registers Qwen Image 2.1 (form `form_generate`, label "Qwen Image 2.1", genre `image`, engine `comfyui`). Naming law: the family id names model and version, never an operation — ONE 2.1 base checkpoint serves text-to-image here AND reference-cached editing in the sibling qwen-img-edit-21 package, which rides the same weights (the edit wraps the same unet in QwenImage21Cache; no separate edit weights exist).

## Defaults, variants, weights

Defaults: 1024×1024, `euler` / `simple` (the official templates' own pair — no geometry or step-count defaults ride the family). Two variant rows, Base (`base`, 25 steps, the official template's own count — DEFAULT) and Turbo (`turbo`, 8 steps), each spanning both download tiers (`int8_convrot` / `bf16` quant cells). Provisions: the 8B Qwen3VL text encoder in bf16 (about 17.5 GB) and INT8 ConvRot (about 9.35 GB), plus the 2.1 VAE (bf16, about 676 MB), all from Comfy-Org/Qwen-Image-2.1. Both variants require provisioning: the 2.1 files are not on the box by default, and engine validation refuses loud without them. Recipes: `upstream-solvers` (euler / simple — the official templates' own pair) and the no-op `default`.

## The t2i action

`t2i` builds the official template graph: ONE TextEncodeQwenImage21 node (positive on output 0, negative on output 1), EmptyLatentImage at the card's resolution, KSampler, decode and save under `<run>/gen`. Params: `prompt` (required — the one relation word) plus the sampling block and the `reference_images` seat (stated reference images ride the lane's own arm). This lane carries no prompt guide — it is a text-to-image lane, not an edit lane.

## Mod surface

The DECL boards `mask` and `loras`. `./mods/loras` is the flavor seam with an empty row set — no first-party 2.1 adapters yet, nothing is fetched from it, and user-provided files ride the pack's bag. `./mods/mask` is the bare-flavor mask boarding: the pack contract owns the region fields, and a stated region rides the crop_stitch DetailerForEach arm — a stated photo base is the canvas the detailer reworks (nothing generates), otherwise the render feeds the arm; region-without-crop_stitch still refuses at the card gate.

## Model Experience

### Request context and condition

A run needs the prompt; the sampling block rides defaults. Resolution is stated per run through the card's width and height pair.

#### What the model sees

The prompt and negative, the latent size, the sampler pair, steps, cfg, and seed; the graph is the single-encoder chain above.

#### Token effect

Zero-direct: an engine graph, not a token stream.

#### KV Cache effect

Independent: each run is self-contained.

## Known Limitations and Deferred Work

- **Provision-heavy default** — even the INT8 tier pulls roughly 17 GB (unet plus encoder) before the first image.
- **No LoRA rows** — the mods seam is empty until a first-party adapter lands; third-party files have no declared picker rows.
- **Edit lives next door** — this family offers t2i only; reference editing is qwen-img-edit-21's lane over the same weights.
- **Live behavior unobserved** — not verified against the running model.

Exports: the plugin root, `./package.json`, `./mods/loras`, `./mods/mask`.
