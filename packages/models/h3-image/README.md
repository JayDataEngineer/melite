---
description: MiniMax H3 Image — the image checkpoint of the H3 line: text-to-image here, reference-guided editing in the sibling h3-image-edit package (same weights).
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
(6 steps, euler/simple); decode + save. The model's own canvas
law: native 4K (~16 MP) with a 2K drafting floor, 32-multiple
sides, area 655,360–20,000,000 px and aspect 1:3–3:1. Recommended
4K canvases: 4096×4096, 4736×3552, 5024×3360, 5472×3072,
6272×2688, 7104×2368; the 2K set: 2048×2048, 2720×1536,
3552×1184. Per-side span: 480–7680 (7680×2560 is the widest legal
3:1 pair at 19.66 MP)

The encoder tiers and vae provision from the
Comfy-Org/MiniMax-H3-Image repo; the qwen3vl-32b encoder files
are content-identical to the h3 VIDEO family's seated files (the
downloader dedups by content — a box that seats h3 already owns
both encoder tiers). Three download tiers on the unet: INT8
ConvRot (the official template pick), W4A8 (paired with the nvfp4
encoder), BF16.

Exports include `./mods/loras`, the family's loras flavor seed
carrying NO first-party rows — the H3-Image release ships no
adapters, and the h3 VIDEO turbo line is the video unet's, never
this checkpoint's; user-provided files ride the pack's bag, and an
id with no row refuses at compose naming the empty registry. The
DECL also boards `./mods/mask`, the shared bare-flavor mask mod:
the pack contract owns the region fields, and the t2i action
serves the stated-region detailer arm on this lane's own
conditioning.

## Model Experience

#### What the model sees

The prompt (the one required relation word), the canvas pair, and
the sampling block (6 steps / cfg 1 / euler / simple at the 2K
drafting default 2048×2048; state any recommended 4K pair for
native-4K output — the lane judges the model's own grain, area and
aspect rails). ONE `MiniMaxH3ImageConditioning` node conditions on
the prompt and emits BOTH the positive conditioning and the canvas
latent; the negative rides `ConditioningZeroOut` — the lane has no
negative seat. Reference pictures are NOT served on this lane
(the conditioning node's vision path rides the edit sibling).

#### Token effect

Zero-direct — the package registers a family DECL and composes
engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — no persistent prompt prefix; registering or removing
the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **No first-party LoRA rows** — the release ships no adapters; a
  flavor id with no row refuses at compose, and user filename rows
  are never fetched (a missing file fails at engine validation).
- **No negative seat** — a stated non-empty `negative_prompt`
  refuses at compose, never drops silently (distilled guidance at
  cfg 1).
- **The canvas is the model's published law** — native 4K (~16 MP),
  32-multiple sides, area 655,360–20,000,000 px, aspect 1:3–3:1.
  The DECL declares that span (480–7680 per side) and the pair law;
  an out-of-span pair refuses at the form/write door with the
  model's own numbers, never a form-invented 2048 ceiling.
- **Provisioning is required** — the H3-Image files are not on a
  box by default; a missing file refuses loud at engine validation
  (the encoder dedups against the h3 video family's seated files).

Exports: the plugin root, `./package.json`, `./mods/loras`, `./mods/mask`.
