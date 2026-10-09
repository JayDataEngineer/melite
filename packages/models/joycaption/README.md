---
description: JoyCaption family, stylized natural-language captioning on the beta-one 8B VLM for prompt inversion.
kind: package-library
---

# @melite/models-joycaption

The JoyCaption family — stylized natural-language image captioning on JoyCaption beta-one (the 8B VLM), with descriptive, SD-prompt, MJ, and booru-list templates for recreating an image in FLUX, Ideogram, or an image-edit lane. Defaults pin `fancyfeast/llama-joycaption-beta-one-hf-llava`, the Descriptive template, long length, and no extra option.

One Standard variant rides the DECL, deliberately: the upstream loader takes any repo id or local path — there is no closed set to enumerate — so the family default stamps beta-one and custom paths ride explicit checkpoint params; a variant per checkpoint would be a lie of closedness. The single F32 cell peaks at 20 GB.

The tagger card binds the tag action: LoadImage (or the wired spell), `JJC_DownloadAndLoadJoyCaptionModel` (memory mode Default), `JJC_JoyCaption` on the stated template, SaveText under `<run>/tags`. The generation constants — max_new_tokens 512, temperature 0.6, top_p 0.9 — are fixed in the build. The `input_image` field is required, carrying the same tagger cure as the other tagger family. The package re-serves the card kit's weightless parser under the old Tag names (parseTagFacts) for the family's consumers.

## Declaration

`src/index.ts` declares the DECL and the `family-joycaption` plugin and re-exports the weightless facts parser; `src/actions.ts` owns the tag segment and its typed params.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL serves the estate's model catalog (label, description, variants, defaults) and the tagger card that boards the family; it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the package registers a model family and composes engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **One variant, deliberately** — the closed variant set would be a lie; custom checkpoints ride explicit params, not the picker matrix.
- **Nothing to tag is a refusal** — the required input_image relation refuses before a run registers rather than tagging a default.
- **Fixed generation constants** — the token cap and sampling constants are hardcoded in the action build, so tuning them is a DECL change, not a knob.
- **F32 only, 20 GB** — no quantized cells ride the DECL; the VLM lane needs the headroom.
