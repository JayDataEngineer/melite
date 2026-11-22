---
description: Qwen Image Edit 2.1 — the cached-reference edit lane over the shared 2.1 checkpoint; up to 16 images, edits at the stated target resolution.
kind: package-library
---

# qwen-img-edit-21

qwen-img-edit-21 registers Qwen Image Edit 2.1 (form `form_edit`, label "Qwen Image Edit 2.1", genre `image`): the instruction-edit lane over the SAME physical 2.1 checkpoint as the t2i sibling. The lane: UNETLoader → QwenImage21Cache (the reference-prefix KV cache wrapped around the base unet — no separate edit weights exist) → TextEncodeQwenImage21 conditioning on the anchor images through its `image_N` autogrow slots (positive AND negative from ONE node) → EmptyLatentImage at the stated target resolution → KSampler → decode and save under `<run>/edit`. This is not the 2511 lane (VAEEncode-of-source at source resolution); the branch key is the lane's `text_encode_node`.

## Params and law

Declared surface: `input_images`, `image1`, `image2`, `image3`, `reference_images`, `input_mask` (validation-only aliases the lane admits as wire keys), `prompt`, `negative_prompt`, `width`, `height`, `seed`, `steps`, `cfg`, `sampler`, `scheduler`. Laws: `width` and `height` ride together — a stated pair sizes the render at w×h (no geometry prefills); `prompt` is required (the instruction, not a description of the image); an anchor is required — the ordered `input_images` list or a legacy spelling (`image1` / `image2` / `image3` / `reference_images`). The image cap is 16 total, anchor included (`max_images`).

Defaults: family solver pair `euler` / `simple`; the Turbo variant (DEFAULT, declared first) resolves 8 steps / cfg 1, the Base variant resolves 25 steps / cfg 1; no geometry prefills. Variants: `turbo` (the 8-step distilled lane, DEFAULT) and `base` (25 steps), each spanning `int8_convrot` / `bf16` quant cells. Recipes: `remove-background` (the official template's canned prompt verbatim), `drift-lock` (the first-party Consistency LoRA — stamps `qwen21_consistency`), `upstream-solvers`, `default`.

## Mod surface

The DECL boards `mask` and `loras`: the bare mask flavor whose region contract rides the crop_stitch detailer over the cached model; automatic inpainting with a named field refuses on every lane — no lane inpaints in place. `./mods/loras` carries one first-party row (`qwen21_consistency`, fetched from ausboss/Qwen-Image-2.1-Consistency-LoRA); user files ride the pack's bag beside it.

## Model Experience

### Request context and condition

A run needs the anchor image and the edit instruction; target resolution and the sampling block ride defaults. Reference sets beyond the anchor go in `input_images` order, up to the 16-image ceiling.

#### What the model sees

The anchor and reference images (up to 16), the instruction, the target resolution, and the sampling block; the cached lane above.

#### Token effect

Zero-direct: an engine graph, not a token stream.

#### KV Cache effect

Within a run, the cache is the lane's point: QwenImage21Cache prefixes reference KV around the base unet, so the edit shares context with its anchors. Across runs it stays independent.

## Known Limitations and Deferred Work

- **16-image ceiling** — beyond `max_images` the kit refuses loud; larger reference sets need trimming.
- **Resolution pair rides together** — a lone width or height is refused (the range rule made law).
- **One first-party LoRA row** — `qwen21_consistency`, stamped by the `drift-lock` recipe; switch it off for movement edits.
- **Live behavior unobserved** — not verified against the running model.

Exports: the plugin root, `./package.json`, `./mods/loras`, `./mods/mask`.
