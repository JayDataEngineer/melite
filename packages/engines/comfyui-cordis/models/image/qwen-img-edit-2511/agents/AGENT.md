---
name: Qwen Image Edit (vn lora)
description: Edit or pose stills with qwen-image-edit-2511 lightning — 4 steps, cfg 1.0, vn_character_sheet lora for character sheets. The cheap iterate loop before any expensive animation.
---

# qwen-img-edit-2511 (image-edit lane, merged 2026-09-05)

UNETLoader (diffusion-only checkpoint) + CLIPLoader type qwen_image +
VAELoader qwen_image_vae + LoraLoader vn_character_sheet 0.9 +
TextEncodeQwenImageEdit. Lightning: 4 steps, cfg 1.0, euler/simple.

Feed the base image via the run door `image` field (absolute path),
or wire a previous card's output (the `/v1/assets/runs/<run>/<file>`
URL the estate's stage stamps) — the compose resolves the asset URL
to the on-disk artifact under `data/runs/output/<run>/<file>` and
stages it into ComfyUI's input dir (phase 1 validates the ref
existence on the mounts BEFORE any run registers).

Skill: `pose-iteration` (this family) + `prompt-enhance` (qwen-scoped).
Compose door: `melite_construct` `add_stage` with the image-edit card
and `model="qwen-img-edit-2511"`, your prompt/image (or the lightning
route `qwen-img-edit-2511-lightning4` for the 4-step distilled cell;
`qwen-img-edit-2511-int8` for the standard 20-step int8 ConvRot cell)
— onto the shared bench; the run starts at the user's Run press, the
progress rides the card. The image-edit card is the queue-native
interface.

(2026-09-05) The pre-flip `img-edit` family head is RETIRED — same
physical lane, but the duplicate catalog row served the default
mode with no variant/quant surface (the "rides on defaults" fossil:
img-edit had `variants = ()`, the card surface rendered an empty
selector in default mode, and the user could not tell which lane
they were on). The cascade gate (`Model declares no variants` is
a construction refusal — ONE PATTERN, OR COMPILE ERROR) killed the
fossil; the lightning / standard cascade now lives on
qwen-img-edit-2511 alone.
