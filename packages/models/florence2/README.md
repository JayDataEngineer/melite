---
description: Florence-2 captioning family, a PromptGen-tuned natural-language image tagger for prompt inversion.
kind: package-library
---

# @melite/models-florence2

The Florence-2 family — natural-language image captioning on PromptGen-tuned Florence-2 checkpoints: dense descriptive prompts for recreating an image in FLUX, Ideogram, or an image-edit lane. Defaults pin `MiaoshouAI/Florence-2-large-PromptGen-v2.0` and the `more_detailed_caption` task. Fourteen checkpoint variants ride the DECL (PromptGen v2.0 and v1.5, the microsoft releases including the ft pair, DocVQA, CogFlorence 2.1 and 2.2, SD3-Captioner, Flux-Large, Castollux), all F32; the default row alone carries vram_peak_gb 6. The variant rail is live-pinned against the engine's `DownloadAndLoadFlorence2Model` object_info (the 2026-09-22 weights rail law), so the served variant list tracks the engine, not a hand-maintained set.

The tagger card binds the tag action: LoadImage (or the wired spell), `DownloadAndLoadFlorence2Model` at fp16, `Florence2Run` on the stated task, SaveText under `<run>/tags`. The `input_image` field is required — a tagger inverts an image, and nothing to tag is a refusal. The package re-serves the card kit's weightless parser as parseTagFacts (the DRY sweep, 2026-10-18); the checkpoint rides the variant rail's stamped param.

## Declaration

`src/index.ts` declares the DECL and the `family-florence2` plugin and re-exports the weightless facts parser; `src/actions.ts` owns the tag segment and its typed params.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL serves the estate's model catalog (label, description, variants, defaults) and the tagger card that boards the family; it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the package registers a model family and composes engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **Nothing to tag is a refusal** — the required input_image relation refuses before a run registers rather than tagging a default.
- **F32 only** — every cell declares F32; no quantized variants ride the DECL.
- **The rail is the contract** — variant rows follow the engine's live object_info, so a checkpoint the engine no longer reports leaves the served set instead of riding stale.
