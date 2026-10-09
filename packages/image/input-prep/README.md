---
description: Source-intake card that stages an image or audio file, optionally crops and scales it, and emits it for downstream cards.
kind: package-library
---

# @melite/image-input-prep

`@melite/image-input-prep` is the input-prep card (`id: 'input-prep'`, stage row `input_prep`): source intake for a flow. The lane is LoadImage -> [ImageCrop] -> [ImageScale] -> SaveImage, or LoadAudio -> SaveAudio — all ComfyUI core nodes, so the card is stock-only with no `requires`. The compose delegates to the input family's declared `prep` action (`@melite/models-input`), pinned to committed goldens in that family's tests; the package's single source module is the root face the cardPackages SSOT composes (`@melite/image-input-prep`).

## Contract

- `.` — the card definition and registration (the root module carries `inject = ['comfyui']`). Schema: `source` (required, path role, file picker — the arm stages uploads, asset drops, prior-run artifacts, or mount paths into the ComfyUI input dir before the doc renders), `media_type` (`image` | `audio`, default `image`), and the image transforms: `crop_x`/`crop_y`/`crop_width`/`crop_height` and `scale_width`/`scale_height` (defaults −1 = off), `scale_method` (default `lanczos`). Only `source` is declared in the action — the transform keys ride the compose door's explicit-params overlay so old drafts keep parsing; they are never declared knobs. Flow: producer-only (`inputs: {}` — a file arrives via the params face, never a producer link), emitting `image` or `audio` bound to `SaveImage.0`/`SaveAudio.0` by `media_type`. The card is hidden from the sidebar (a flow-staging utility, image order 12).
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

No model ever loads: the card loads, optionally transforms, and saves — the card's own principle is "a source is data, not inference".

#### What the model sees

Nothing — the lane emits a media artifact; any model downstream receives the file, not this package's params.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **Video is not boarded** — `media_type` seats image and audio only; video intake refuses at the schema.
- **Transforms are the declared matrix** — crop and scale are the only admitted transforms; anything else refuses loudly rather than dropping.
