---
description: MiniMax H3 Image — the image checkpoint of the H3 line; the t2i lane of the h3-image/h3-image-edit pair (one checkpoint, two cards), conditioning-emitted canvas latent, ConditioningZeroOut guidance.
kind: package-library
---

# h3-image

h3-image registers MiniMax H3 Image (form `form_generate`, label
"MiniMax H3 Image", genre `image`): the t2i lane of the
MiniMax-H3-Image checkpoint. The pair law: one checkpoint serves
two cards — this family boards the image-gen card for t2i; the
sibling `h3-image-edit` family boards the image-edit card for the
reference-guided edit lane on the same weights.

The lane (the official Comfy-Org template's own topology): ONE
`MiniMaxH3ImageConditioning` node conditions on the prompt (and
optional reference pictures through its own vision path, cited
in-prompt as `<Picture n>`) and emits BOTH the positive
conditioning and the canvas latent; the negative rides
`ConditioningZeroOut` at cfg 1 (distilled guidance — the lane has
no negative_prompt seat); KSampler at the template's own counts
(6 steps, euler/simple); decode + save. The node's area law:
~2048x2048 pixels of working area, 32-multiple canvas.

The encoder tiers and vae provision from the
Comfy-Org/MiniMax-H3-Image repo; the qwen3vl-32b encoder files
are content-identical to the h3 VIDEO family's seated files (the
downloader dedups by content — a box that seats h3 already owns
both encoder tiers). Three download tiers on the unet: INT8
ConvRot (the official template pick), W4A8 (paired with the nvfp4
encoder), BF16.
