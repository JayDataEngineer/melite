---
description: MiniMax H3 family, joint video and audio generation across timeline, single-shot, and keyframe lanes.
kind: package-library
---

# @melite/models-h3

The MiniMax H3 family — joint video and audio generation, one family owning three lanes (the one-model law): multi-window timeline films on route `h3-timeline`, single-shot FL2VA and Ref2VA clips on route `h3-fl2va`, and the keyframe lane. The survivor-id correction (2026-09-22): the family is `h3`, a model names a checkpoint, a variant names a lane; a dead-era draft addressing `h3` resolves to the family default — the timeline lane, the one deliberate behavior shift. It serves a catalog row (offered, comfyui) with a studio block: the `video/h3-timeline` tenant owns the card's parameters.

Provisions pin the weights with sha256 digests, byte sizes, and target folders. The mods row boards the loras pack with steps married at max: twelve user-picked distill and refiner rows (LightX2V, Kijai, arena winners, DMAD, TaoMate); no recipe stamps them, the absent-bag default builds from the pack's `h3_silver_dareties` row (`H3_DEFAULT_LORA_ID`), and a missing row refuses at load.

The film action is the video lane's single seat: the card's schema gate runs card-side and dispatches here; the action owns the t4r guide admission, the clips law, the lora steps, and both renderers, returning the artifact handle. The timeline contract pins the frame math: 22-frame seam overlap, the 22+17k carried grid capped at 362 frames, and the 9-slot image bus. The film mix owns audio placement — one owner for compose stamps and the film-time overlay; a positioned clip without a numeric start frame refuses loud. The schema module mirrors the h3-timeline card's param schema 1:1 — one spelling, never a second copy.

The manifest also exports `./mods/loras`, `./actions`, `./schema`, `./timelineContract`, `./filmMix`, and `./secondPass` (the second-pass seat: shared vocabulary and refusal laws for the edit door's refine switch, the film handoff's latent upscale, a stated `chain_run`, and the postImage limb — one arm per doc, and a full-noise sigma refuses: a second pass is never a re-render).

## Declaration

`src/index.ts` declares the DECL and the `family-h3` plugin; the subpaths above are the card, flow, and agents' published seams. The timeline lane serves the three-member quant offer (2026-10-26: "the system needs ALL THREE") — `int8` (the smhfacct hybrid default), `int8_convrot_pruned` (the Comfy-Org pruned ConvRot dit), `int8_convrot` (the 34 GB non-pruned per-cell tier) — beside the community Singularity fine-tune at `int8_pruned` (convrot unstated upstream; a pick-only per-variant `lane_inputs.unet` override; the audition and VRAM peaks owed to bench experiments).

## Model Experience

#### What the model sees

None — the DECL serves the estate's model catalog and the h3-timeline card; it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct — the package registers a family and composes engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — no persistent prompt prefix; registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **LoRA steps marry at max** — while a counting bag row rides, steps are the bag's (the higher designed count wins); an authored step count loses.
- **The carried grid snaps** — authored ranges need not land on the 22+17k grid: a span of 24 frames or more admits by snapping its end UP to the next rung (reported, later windows re-tile); only sub-floor spans or snaps past the cap refuse.
- **Ref caps are loud** — 9 image-bus slots (8 loose references, 7 with a last-frame anchor), 3 videos, 3 audios, 8 refmods; an over-cap stack refuses at the gate, never silent.
- **Dense-LoRA adaln drops are watched, not yet guarded** — a dense row can silently drop 51 adaln_proj keys on the pruned base; the guard rides the arena's first stacked load.
