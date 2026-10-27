---
description: The Openjutsu card — character/subject swap in video on the viggle-animate family, one reference still + one driving clip.
kind: package-bundle
---

# @melite/video-openjutsu

`@melite/video-openjutsu` is the openjutsu card over the viggle-animate family — the estate's character/subject swap door. The card (`openjutsu`, boarding `viggle-animate`) seats the two required inputs (`ref_image` identity still, `clip` driving footage, or a `$`-wired clip from an upstream stage) over honest defaults: 124 frames (5–3600), size 0 = follow the clip, steps 3 on the fixed DMD2 sigma schedule (euler, no CFG — the frozen text embed is the lane's whole text surface). `./card` carries the card def; the manifest's cardPackages SSOT composes it; the root face registers nothing (no client face — the swap lane rides the shared card chrome).

## Contract

- `./card` — the card definition. The schema's numeric domains mirror the action's ParamSpec rows (the two-homes law): length 5–3600 default 124, width/height 0–16384 step 32 default 0, steps 1–8 default 3, shift_video/shift_audio 0.1–20 default 3, seed default −1 minted by the `seed-sentinel` rule (−1 never reaches the graph). Flow kinds: inputs `clip` = video, `ref_image` = image; output the VHS_VideoCombine mp4/webm. The compose gate resolves the loras + model riders, refuses undeclared params field-named (a typo'd key never composes), dispatches ACTION_BINDINGS by `model.family ?? model.id`, and byte-honestly leaves the audio seat out when the clip is `$`-wired (no VHS_LoadVideo exists to carry it).
- `.` — the host face; it registers nothing.
- `./package.json` — the manifest.

## License

The card contributes no weights; the boarded family's license lives in
@melite/models-viggle-animate (README + ATTRIBUTION): the MiniMax H3
Community License Agreement — commercial use permitted, worldwide
EXCLUDING the EU, UK, South Korea and the US; H3 is the estate's licensed
exception to its open-weights rule, never an open-weights release.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The card composes engine graphs through the family's action; it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the card has no text surface of its own; the swap lane's text conditioning is the family's frozen embed.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so boarding or removing the card invalidates nothing cached.
