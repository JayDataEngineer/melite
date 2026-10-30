---
description: the mask card (the swap lane R0a preprocessing door) — clip in, tracked person mask + grey-mannequin motion reference + staged mask frames out (SAM3 track + H3 arms)
kind: package-library
---

# @melite/video-track

`@melite/video-track` is the track card (`id: 'track'`, label "Video Mask", sidebar `video` order 10): the swap lane's R0a preprocessing door — clip in, tracked person mask + grey-mannequin motion reference + staged mask frames out. The chain: `VHS_LoadVideo` at 24 fps scaled to the track's 1008 edge (`ImageScaleToMaxDimension`, area) → `SAM3_VideoTrack` on `sam3.1_multiplex_fp16` (the person arm proposes the swap subject, the face arm the mannequin's face region) → three `H3PeopleMask` arms (the tunable edit mask, the mannequin arm fixed at headroom 0 / hold 1, the face arm fixed at headroom 0 / hold 0) → `H3GreyMannequins` (the blur pair hides identity while keeping motion) → `VHS_VideoCombine` h264 mp4 under `<runId>/mannequin` (the declared hero file), and the grown edit mask (`GrowMaskWithBlur`) saved + previewed under `<runId>/mask`. Pure staging: the swap itself rides the timeline's replace mod downstream, whose mask seat takes ONE image (the pixel-max union over the frames is recommended), never the folder.

## Contract

- `.` — the host half: the composition marker the web profile mounts; it registers nothing (the dual-face law).
- `./card` — the card face the cardPackages SSOT composes (`@melite/video-track/card`): registration, schema, and compose. Schema: `clip` (required), `prompt` (default `person`) and `face_prompt` (default `face`) — the SAM3 text arms, `detection_threshold` (0.05..0.95, default 0.35), the edit-arm mask shape (`headroom` 0..1 default 0.1, `hold_frames` 0..10 default 2, `max_people` 0..10 default 1, `mask_expand` 0..128 default 40), the mannequin blur pair (defaults 0.04 / 0.05), and `frame_load_cap` (0 = whole clip). The SAM3 checkpoint rows live in the mask-select family's DECL (`provisionOwner`) — the card serves the export, authors no row of its own — and `armWeights` checks the touched SAM3 weight at compose, so an absent weight refuses loud. Flow: `clip` video in, `video` out bound to `VHS_VideoCombine`; `requiresModel: false`; requires `ComfyUI-VideoHelperSuite` + `comfyui-h3-oneclick-swap`.
- `./package.json` — the manifest.

## Model Experience

#### What the model sees

SAM3 receives the scaled frames and the two text arms as engine inputs; the card stages files and conditions no language-model context.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **The hat-fix branch is a documented delta, not composed** — the reference chain records it; this lane does not build it.
- **The face arm is fixed to the reference** — headroom 0, hold 0; only the edit arm is tunable.
- **An absent SAM3 weight refuses at compose** — loud, never a silent downstream death.
