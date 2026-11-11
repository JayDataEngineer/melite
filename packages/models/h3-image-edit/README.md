---
description: MiniMax H3 Image Edit — the reference-guided edit lane of the MiniMax-H3-Image checkpoint (same weights as the h3-image t2i sibling); 4MP reference pre-scale, GetImageSize canvas, conditioning-emitted latent.
kind: package-library
---

# h3-image-edit

h3-image-edit registers MiniMax H3 Image Edit (form `form_edit`,
label "MiniMax H3 Image Edit", genre `image`): the edit lane of
the MiniMax-H3-Image checkpoint — the same weights as the
`h3-image` t2i sibling (the registry's one-family-one-card law
boards the pair on two cards).

The lane (the official image_minimax_h3_image_edit template,
verbatim topology): every stated picture pre-scales to 4
megapixels (area) then snaps to the 32-multiple canvas grid — the
template's own working-range law ("doesn't work well in low
resolution"; the community identity craft grounds the same law:
reference pictures at 4MP carry the identity). The scaled anchor
(image_1, cited in-prompt as `<Picture 1>`) sizes the conditioning
canvas through GetImageSize (a stated pair overrides); ONE
`MiniMaxH3ImageConditioning` — vae connected, so reference latents
anchor identity — emits the positive conditioning AND the canvas
latent; the negative rides `ConditioningZeroOut` at cfg 1
(distilled guidance — no negative_prompt seat). KSampler at the
template's counts (6 steps, euler/simple) on the conditioning's
own latent; decode + save.

Action-focused prompting is this model's craft: name the RESULT of
the edit ("the plant disappears behind the bench"), not the
instruction alone.
