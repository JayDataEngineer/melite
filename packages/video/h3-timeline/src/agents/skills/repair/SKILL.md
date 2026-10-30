---
name: repair
description: "Region repair on the h3-timeline: seat a source clip plus a repair prompt and a region prompt on the repair mod bag; a per-frame SAM3 mask tracks the named region, the masked region re-renders at partial denoise, and the rest of the frame plus the audio is held. Mod-bag door — NOT a re-render and NOT the replace swap."
genre: video
---

# Repair (region repair) — SPEC

> STATUS: LANDED 2026-11-12 (the third edit bag). The emission composes
> per the family renderer (`models/h3` chainEdit.ts): VHS window load →
> SAM3 text-tracking mask → grow → the masked-edit chain on the family's
> own model + lora plane → decode → the run-scoped film terminal. Prose
> never overrides the loaded bundle: the fields below are quoted off the
> card's served repair kind.
>
> VERIFIED LIVE 2026-10-30 against a real GPU render (run
> run-7492bb0d9f57-8b4b87f8 — a 141 f window = 5.875 s rendered
> window-only at 1312×736, 48 kHz, exactly the authored span) and
> against the tree's skill-coverage batch (receipt
> `contracts/receipts/2026-11-13-cards-bag-skills-coverage.md`).
> NOT yet verified live: the grow-0 seam test and a multi-window repair
> of one film — treat those as unproven until they are pressed.

## What it is (and is NOT)

A repair re-renders a REGION of a clip you already have: a text-named
region ("hands", "a face") is tracked frame by frame, the tracked mask
grows by `mask_grow` pixels of seam ring, and only that masked area is
re-rendered at partial denoise. Everything outside the mask — and the
audio — is held from the source.

It is NOT:
- **a re-render** — denoise stays inside the refinement window
  (0.05–0.50); 1 or more refuses, because a full-noise pass is a
  reshoot and the reshoot door exists;
- **the replace swap** — replace swaps a whole person from staged
  identity art (its own branch and terminal); repair fixes a part of
  the existing frame;
- **the refine arm** — refine is unmasked: it sharpens the WHOLE
  window; repair is scoped by the tracked mask;
- **a fresh generation** — the source clip anchors the frame and the
  soundtrack; nothing from a prior generation re-enters.

One door per doc: ANY two armed mod bags REFUSE loud naming both —
the fifteen pairs are replace↔repair, replace↔extend, repair↔extend,
replace↔reshoot, repair↔reshoot, extend↔reshoot, replace↔refine,
repair↔refine, extend↔refine, reshoot↔refine, replace↔upscale,
repair↔upscale, extend↔upscale, refine↔upscale, reshoot↔upscale.
The repair branch returns before the film action, so an armed repair
beside any other arm would be silently dropped. Pick one and empty the
others. (Armed = the bag is PRESENT and non-empty; an absent or empty
`repair` bag is an unused arm — the film composes exactly as before,
byte-identical.)

## The flow (bind, confirm, press)

1. **Get the clip.** A repair reads ONE staged video leaf by name
   (`source_clip`) — the footage with the region you want fixed.
2. **Arm and bind.** Seat ONE entry on the `repair` mod bag:
   `params.repair = [entry]` — never flat (a flat `repair_clip` beside
   the doc refuses as unknown param(s)). `source_clip`,
   `repair_prompt` and `region_prompt` are required: an empty entry
   refuses LOUD naming the seat.
3. **Name the region.** `region_prompt` is the SAM3 detection target —
   the words you would say looking at the frame ("hands", "a person",
   "a face"). The mask tracks every matching object per frame; it is
   not a painted mask and there is no mask seat.
4. **Set the dials.** The entry fields (the card's served ranges):
   - `denoise` (0.05–0.5, 0.32) — the masked pass's partial denoise;
     the refine window is 0.30–0.35, lower is subtler. 1 or more
     refuses (a repair is a refine, never a re-render).
   - `mask_grow` (0–96, 16) — pixels the tracked mask grows before the
     edit: the seam ring. 0 repairs exactly the detected region (the
     grow-0 seam test) and is the sharpest, least forgiving setting.
   - `detection_threshold` (0–1, 0.5) — the SAM3 score threshold;
     lower finds more objects with noisier masks.
   - `window_start` (0–100000, 0) — frames at the film clock (24 fps)
     to skip before the repair window; 0 starts at the clip head.
   - `window_length` (0–100000, 0) — frames in the window; 0 runs to
     the end of the clip (the whole-clip posture). `clip_seconds`
     still caps the render budget.
   - `clip_seconds` (2.5–15, 6) — the plan's own render budget; its
     widget band [2.5, 15] is the law.
   - `overlap_frames` (22–56, step 17, 39) — the plan's window
     overlap; the engine's combo is exactly [22, 39, 56].
   - `resolution` (select, '736p') — the plan's resolution tier:
     480p quick preview, 576p, 736p (the reference default), 768p,
     1080p (~2.5× slower and much more memory).
   - `seed` (0–4294967295, 0) — the chain plan's `base_seed`; the
     sampler seed stays the doc seed.
   - `steps` (1–30, 6) — the chain plan's `default_steps`; the sampler
     steps stay the doc marriage.
5. **Confirm.** Show the bound clip, the region in words ("the hands,
   grown 16 px"), the window in frames, and that every other arm is
   empty.
   THE LANE CLAUSE: that wait is chat-lane law — on a headless
   commission the brief IS the confirmation (state the values in the
   run record, then execute; never stall a commission waiting for a
   watcher who isn't there).
6. **Press.** The user presses Run. Browser/chat agents never
   execute; headless commissions ride `melite_flow` per the maker
   runbook.

## Companion surfaces

- `refine` sharpens the whole window after a repair lands — the
  repair fixes the region, the refine tightens the detail.
- `swap` (replace) is the OTHER person-shaped door: it swaps a whole
  person from identity art; repair never reads identity art.
- `video-timeline` composes films; a repair is its own run with its
  own terminal.
