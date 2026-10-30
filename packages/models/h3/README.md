---
description: MiniMax H3 family, joint video and audio generation across timeline, single-shot, and keyframe lanes.
kind: package-library
---

# @melite/models-h3

The MiniMax H3 family — joint video and audio generation, one family owning three lanes (the one-model law): multi-window timeline films on route `h3-timeline`, single-shot FL2VA and Ref2VA clips on route `h3-fl2va`, and the keyframe lane. The survivor-id correction (2026-09-22): the family is `h3`, a model names a checkpoint, a variant names a lane; the old `h3-timeline` address survives as the timeline lane's route, and a dead-era draft addressing `h3` resolves to the family default — the timeline lane, the one deliberate behavior shift. It serves a catalog row (offered, comfyui) with a studio block: the `video/h3-timeline` tenant owns the card's parameters — calls, keyframes, sampling, SLA sparsity, sharpen, interpolation, super-resolution, audio, loras, document.

Provisions pin the downloaded weights with sha256 digests, byte sizes, and target folders. The mods row boards the loras pack with steps married at max: eleven user-picked distill and refiner rows (LightX2V, Kijai, the arena winners, DMAD, TaoMate); no recipe stamps them, the absent-bag default builds from the catalog's `h3_lightx2v_turbo` row, and a missing row refuses at load.

The film action is the video lane's single seat: the card's schema gate runs card-side, then dispatches here; the action owns the t4r guide admission, the clips law, the lora steps, and both renderers, returning the artifact handle. The timeline contract pins the frame math: 22-frame seam overlap, the 22+17k carried grid capped at 362 frames, and the 9-slot image bus with caps (8 images, 3 videos, 3 audios, 8 refmods). The film mix owns the audio placement math — one owner for the compose stamps and the film-time overlay; a positioned clip row without a numeric start frame refuses loud. The schema module mirrors the h3-timeline card's param schema 1:1 — one spelling, never a second copy.

The manifest also exports `./mods/loras` (the flavor rows), `./actions` (the film action), `./schema` (the param carrier), `./timelineContract` (the frame grid), and `./filmMix` (the audio mix).

## Declaration

`src/index.ts` declares the DECL and the `family-h3` plugin; the subpath modules above are the published seams for the card, flow, and agents. The timeline lane serves the three-member quant offer (the 2026-10-26 cure: "the system needs ALL THREE") — `int8` (the smhfacct hybrid default), `int8_convrot_pruned` (the Comfy-Org pruned ConvRot dit, already provisioned), `int8_convrot` (the 34 GB non-pruned per-cell tier) — beside the community Singularity fine-tune at `int8_pruned` (convrot unstated upstream; a pick-only per-variant `lane_inputs.unet` override; the first+last-frame audition and VRAM peaks owed to the bench experiments).

## Model Experience

#### What the model sees

None — the DECL serves the estate's model catalog and the h3-timeline card; it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct — the package registers a family and composes engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — no persistent prompt prefix; registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **LoRA steps marry at max** — while a counting bag row rides, steps are the bag's (the higher designed count wins); an authored step count loses.
- **The carried grid refuses off-grid spans** — authored ranges must land on the 22+17k grid; refusals name the legal neighboring end frames, never snapping silently.
- **Ref caps are loud** — 9 image-bus slots (8 loose references, 7 with a last-frame anchor), 3 videos, 3 audios, 8 refmods; an over-cap stack refuses at the gate, never silent.
- **Dense-LoRA adaln drops are watched, not yet guarded** — a dense row can silently drop 51 adaln_proj keys on the pruned base; the guard rides the arena's first stacked load.
