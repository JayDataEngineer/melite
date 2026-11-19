---
description: MiniMax H3 Image Edit — the reference-guided edit lane of the MiniMax-H3-Image checkpoint: same weights as the h3-image t2i sibling, the 4MP reference pre-scale and the conditioning canvas law.
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

Exports include `./mods/loras`, the family's loras flavor seed
carrying NO first-party rows — the h3 VIDEO turbo line is the
video unet's, never this checkpoint's; user-provided files ride
the pack's bag, and an id with no row refuses at compose naming
the empty registry. The DECL also boards `./mods/mask`, the shared
bare-flavor mask mod: the pack contract owns the region fields,
and the edit action serves the crop_stitch region tail through its
own bag merge (regionSegs over the scaled anchor, the detailer
reworking each crop against the lane's own conditioning).

## Model Experience

#### What the model sees

Every stated picture pre-scaled to 4MP and snapped to the
32-multiple grid — anchor AND references alike; the prompt citing
the pictures as `<Picture n>`; the canvas sized by the scaled
anchor (GetImageSize) or the stated pair. ONE
`MiniMaxH3ImageConditioning` node — vae connected, so reference
latents anchor identity — emits BOTH the positive conditioning and
the canvas latent; the negative rides `ConditioningZeroOut`; the
sampler runs on the conditioning's OWN latent.

#### Token effect

Zero-direct — the package registers a family DECL and composes
engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — no persistent prompt prefix; registering or removing
the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **The 4MP pre-scale is unconditional** — low-resolution sources
  are upscaled into the 4MP frame, never previewed at their own
  size (the template's own working-range law: H3-Image composes
  low-resolution work poorly).
- **No negative seat** — a stated negative has no seat and refuses
  field-named at the card (distilled guidance at cfg 1).
- **The input list counts whole against the cap** — 100 slots,
  anchor included; an over-cap list refuses naming the surplus,
  never drops an image quietly.
- **The stated canvas pair is gated** — match OFF + both integer
  axes ≥ 16; match ON with a stated pair refuses with the flip in
  the voice.
- **No first-party LoRA rows** — a flavor id with no row refuses
  at compose; user filename rows are never fetched.

Exports: the plugin root, `./package.json`, `./mods/loras`, `./mods/mask`.
