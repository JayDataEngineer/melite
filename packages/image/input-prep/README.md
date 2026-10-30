---
description: Source-intake card that stages an image or audio file, optionally crops and scales it, and emits it for downstream cards.
kind: package-bundle
---

# @melite/image-input-prep

`@melite/image-input-prep` is the input-prep card (`id: 'input-prep'`, stage row `input_prep`): source intake for a flow. The lane is LoadImage -> [ImageCrop] -> [ImageScale] -> SaveImage, or LoadAudio -> SaveAudio — all ComfyUI core nodes, so the card is stock-only with no `requires`. The compose delegates to the input family's declared `prep` action (`@melite/models-input`), pinned to committed goldens in that family's tests. The faces are split (the dual-face law): the root module is the host composition marker the web profile row-mounts — it registers nothing — and the card definition rides `./card`, which the cardPackages SSOT composes as `@melite/image-input-prep/card`.

## Contract

- `.` — the host composition marker: row-mounted by the web profile, it registers nothing (the card def and the crop studio ride the other faces).
- `./card` — the card face the cardPackages SSOT composes (`@melite/image-input-prep/card`): the card definition and registration. Schema: `source` (required, path role, file picker — the arm stages uploads, asset drops, prior-run artifacts, or mount paths into the ComfyUI input dir before the doc renders), `media_type` (`image` | `audio`, default `image`), and the image transforms: `crop_x`/`crop_y`/`crop_width`/`crop_height` and `scale_width`/`scale_height` (defaults −1 = off), `scale_method` (default `lanczos`). Only `source` is declared in the action — the transform keys ride the compose door's explicit-params overlay so old drafts keep parsing; they are never declared knobs. Compose binds the owning family's declared `prep` action through `ACTION_BINDINGS` (an unbound family refuses loud at dispatch) behind the gated resolve: crop/scale are the only admitted riders, the audio lane refuses seated image transforms, a sub-`MIN_DIM` crop or scale target refuses as the blank-image class, and anything above the 16384px ceiling refuses as an engine abort. Flow: producer-only (`inputs: {}` — a file arrives via the params face, never a producer link), emitting `image` or `audio` bound to `SaveImage.0`/`SaveAudio.0` by `media_type`. The card is hidden from the sidebar (a flow-staging utility, image order 12).
- `./package.json` — the manifest.
- `./client` — the studio registration bundle (tsdown's `lib/client.js`, loader-marked): mounts the ANNY-style stage view (operator 2026-11) under key `input-prep` on the `cards.stage.view` slot. The studio (src/ui/studio) is the preview + transform card: the image with a drag-to-crop box (draw/move/resize/clear, one atomic commit at release, the 8px blank-image floor honored at the UI), and the optional scale rail — `scale_width`/`scale_height`, ×2/½ presets derived from the crop box, and the resample model choice (`scale_method`, the input family's own vocabulary). The node face never emits the studio (tsconfig.host excludes `src/client/**` + `src/ui/studio/**`; one builder per plane).

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
