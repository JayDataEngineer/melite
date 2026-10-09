---
description: WD14 Tagger family — booru keyword tagging of images for NovelAI, Pony, and Illustrious prompt recreation, with the tag action on the ComfyUI engine.
kind: package-library
---

# @melite/models-wd14

`@melite/models-wd14` is the model family package for the WD14 booru tagger (`form_tagger`, genre image, engine comfyui): a light ONNX lane from the WaifuDiffusion v3 lineage that reads an image and writes comma-separated Danbooru tags for NovelAI / Pony / Illustrious prompt recreation. The DECL declares the `tag` action, an eleven-checkpoint variant rail, and the required `input_image` relation. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`; the tagger card binds the action. The lane is weightless — no `lane_inputs` — and the segment is the wd14 arm of the legacy tagger lane, pinned byte-identical in `tests/action.spec.ts`.

## Declaration

The variant rail IS the checkpoint picker: one variant per live `WD14Tagger|pysssss` model name, pinned off the engine's `object_info` — unknown names are refused at selection time, and `wd-v1-4-moat-tagger-v2` rides first as the family default (its cell carries the measured ~4 GB VRAM peak; the other backbones are unmeasured and omit the figure). Family defaults: `threshold` 0.35, `character_threshold` 0.85, empty `exclude_tags`, underscores kept, no trailing comma. The `tag` action requires `input_image` — a tagger inverts an image, and nothing to tag is a refusal. The build loads the image (or a `$`-spelled upstream tensor), runs `WD14Tagger|pysssss`, and saves the text under `<run>/tags`. First run downloads the selected checkpoint's weights.

```
.
./package.json
```

## Model Experience

### Request context and condition

#### What the model sees

- **input_image** — required; the image to invert into tags.
- **checkpoint** — the variant-stamped backbone name (admitted, never rendered).
- **threshold / character_threshold** — the general and character confidence floors.
- **exclude_tags / replace_underscore / trailing_comma** — output shaping flags.

#### Token effect

Zero-direct token effect — the fields ride the composed ComfyUI graph; the tag text is engine output, not harness context.

#### KV Cache effect

Independent — each tagging run is its own engine request; no shared prefix.

## Known Limitations and Deferred Work

- **Weights not provisioned** — no provisions block; the first run fetches the checkpoint itself, so an offline estate tags nothing.
- **One measured VRAM figure** — only moat carries a peak number; the rest of the rail is unmeasured by declaration.
- **Tag vocabulary** — output is Danbooru-style tags; quality on non-anime images is not verified against the running engine.
