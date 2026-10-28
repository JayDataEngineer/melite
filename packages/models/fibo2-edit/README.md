---
description: Fibo 2.0 Edit — BRIA's image-editing model (the Comfy-Org repack); the third image-edit family, encoder-emitted latent, dev/edit-turbo lanes.
kind: package-library
---

# fibo2-edit

fibo2-edit registers Fibo 2.0 Edit (form `form_edit`, label "Fibo 2.0 Edit", genre `image`): BRIA's licensed image-editing model, boarded from the Comfy-Org repack as the image-edit card's third family beside the two qwen-img-edit lanes. The lane: UNETLoader → CLIPLoader (combo `fibo2`) + VAELoader → TextEncodeFibo2 — ONE encoder call emits positive AND negative (an empty `negative_prompt` rides the model's trained null caption, so CFG works text-only), cites input images in-prompt as `<image_N>` (up to 16), and — with the VAE seat connected — splices reference latents into BOTH conditionings → KSampler on the encoder's own emitted latent (128-channel, trained size: the node's width/height stay 0 = the first input image's aspect at ~1MP) → decode and save under `<run>/edit`. With `input_mask` + `mask_mode: crop_stitch` the mask rides MaskToSEGS → DetailerForEach instead (no KSampler, no decode under it).

## The BF16-encoder rule (upstream issue 17248, open)

The INT8 Qwen3-VL text encoder fails on image-conditioned encoding. Every edit lane here encodes through the BF16 encoder (`qwen3vl_4b_bf16.safetensors`, provisioned); the INT8 encoder's seat is the text-only FLUX-shared use, and it is deliberately NOT provisioned — the manage rail never offers it for this family.

## Params and law

Declared surface: `input_images`, `image1`, `image2`, `image3`, `reference_images`, `input_mask` (validation-only aliases the lane admits as wire keys), `prompt`, `negative_prompt`, `match_input_resolution` (the declared no-op, draft compatibility), `seed`, `steps`, `cfg`, `sampler`, `scheduler`. Laws: `prompt` is required (the instruction, not a description of the image); an anchor is required — the ordered `input_images` list or a legacy spelling; the image cap is 16 total, anchor included (`max_images`); no stated size exists (the encoder emits the latent — a draft stating width/height refuses field-named); the solver span stays steps 1–50. Defaults: 30 steps, `euler` / `simple`, cfg 5 — the dev lane's official pair.

Variants: `dev` (30 steps CFG 5, the reference checkpoint) and `edit-turbo` (8 steps CFG 1, the distilled checkpoint), each with `int8_convrot` and `bf16` quant cells (8.4 GB / 16.5 GB unets). Every variant declares its `sampler_envelope`; the community 4-step turbo report is deliberately not pinned. NO Recipe group: nothing upstream canonical enough to pin, and a stamp-less Recipe group is exactly what recipe-rows LAW A refuses — a canned one-click lands with upstream truth.

## Mod surface

The DECL boards `mask` and `loras`. `./mods/mask` is the bare flavor whose region contract rides the crop_stitch detailer over the encoder conditioning; automatic inpainting with a named field refuses on every lane — no lane inpaints in place. `./mods/loras` is the seam with an empty row set (no first-party Fibo adapters); user files ride the same bag the pack registers.

## Known Limitations and Deferred Work

- **INT8 encoder unusable for edits** — upstream issue 17248 (open): the int8 vision tower fails on image-conditioned encoding; BF16 encoder only, pinned in `lane_inputs.text_encoder`.
- **Graph goldens deferred** — the golden driver's wiring gate judges against the recorded boot fixture (`tests/walls/fixtures/object_info.boot.json`), which predates `TextEncodeFibo2`; goldens land the day the engine hop re-records it. The branch pins ride `tests/action.spec.ts` structural asserts meanwhile.
- **Facts rows pending the pin audit** — `model-facts.json` (the `fibo2-edit` card row + `core_node_types` entry for `comfy_extras/nodes_fibo2.py`) and the recorded engine's `engine_node_types` are the engine pin audit's writes; until they land the offered-cells and flows walls carry named pending reds.
- **Live behavior unobserved** — not verified against the running model.

Exports: the plugin root, `./package.json`, `./mods/loras`, `./mods/mask`.
