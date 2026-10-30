---
description: the trim card (the video lane's preprocessing door) — clip in, timestamp-trimmed clip out (VHS load window + combine)
kind: package-library
---

# @melite/video-trim

`@melite/video-trim` is the trim card (`id: 'trim'`, label "Trim Video", sidebar `video` order 8): the video lane's preprocessing door — clip in, timestamp-trimmed clip out. The lane is a `VHS_LoadVideo` window (the head skipped to `round(start × 24)`; the cap 0 for the open tail, else the rounded window length) re-combined by `VHS_VideoCombine` to h264 mp4 under `<runId>/trim`, the source clip's own audio carried through on the loader's audio slot. The window is frame-exact at the lane's 24 fps — seconds convert by round, never floor. Pure VHS nodes: an extension-less engine refuses at the door with the install rescue, never a mid-run abort.

## Contract

- `.` — the host half: the composition marker the web profile mounts; it registers nothing (the dual-face law).
- `./card` — the card face the cardPackages SSOT composes (`@melite/video-trim/card`): registration, schema, and compose. Schema: `clip` (required, path role, video file picker), `start_seconds` (min 0, default 0), `end_seconds` (min −1, default −1 — the open tail keeping everything after start). An empty window refuses: a non-negative `end_seconds` must exceed `start_seconds`. No riders — the surface is the three declared knobs, nothing else composes. Flow: `clip` video in, `video` out bound to `VHS_VideoCombine`; `requiresModel: false`; requires `ComfyUI-VideoHelperSuite`.
- `./package.json` — the manifest.

## Model Experience

#### What the model sees

Nothing — the card trims and re-combines; no model loads, and no language-model context is conditioned.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **The open tail is the only "to the end" spelling** — `end_seconds: -1`; a positive end must name a real timestamp past start or the window refuses.
- **24 fps is pinned, not inherited** — `force_rate` restamps the source to the lane's 24 fps regardless of its native rate.
