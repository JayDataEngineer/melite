---
description: the frames card (the swap lane's R0b preprocessing door) — clip in, staged frame images out (VHS load + native SaveImage)
kind: package-library
---

# @melite/video-frames

`@melite/video-frames` is the frames card (`id: 'frames'`, sidebar `video` order 9): the swap lane's R0b preprocessing door — a clip in, staged frame images out. The lane is `VHS_LoadVideo` (forced to the lane's 24 fps contract) fanned through native `SaveImage` — one numbered file per frame under `<runId>/frames`. The run tree's staged folder IS the frame folder: no new output type, downstream seats take staged paths by the run-tree convention. The load rides VHS, so an extension-less engine refuses at the door with the install rescue, never a mid-run abort.

## Contract

- `.` — the host half: the composition marker the web profile mounts; it registers nothing (the dual-face law).
- `./card` — the card face the cardPackages SSOT composes (`@melite/video-frames/card`): registration, schema, and compose. Schema: `clip` (required, path role, video file picker), `every_nth` (the frame stride, default 48 — one contact frame every 2 s at 24 fps), `frame_load_cap` (0 loads the whole clip; otherwise the first N). Stride and cap are engine-evaluated, so the load window and the saved set always agree. Flow: `clip` video in, `image` out bound to `SaveImage`; `requiresModel: false`; requires `ComfyUI-VideoHelperSuite`.
- `./package.json` — the manifest.

## Model Experience

#### What the model sees

Nothing — the card loads and saves; any downstream model receives staged files, never this package's params.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **Cap 0 loads everything** — a full-clip fan is a large frame batch, and there is no duration guard before compose.
- **24 fps is pinned, not inherited** — `force_rate` restamps the source to the lane's 24 fps regardless of its native rate.
