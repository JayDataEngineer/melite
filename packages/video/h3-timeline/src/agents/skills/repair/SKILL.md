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

## The recipe's laws (read these before the two shapes below)

A hand fix on a staged clip: track the hands, re-render only the mask,
hold everything else.

    params.repair = [{
      source_clip:        'prior_film.mp4',   // staged leaf; MUST carry audio
      repair_prompt:      'clean hands, natural fingers, the rest unchanged',
      region_prompt:      'hands',            // what SAM3 tracks, per frame
      denoise:            0.32,               // the 0.30–0.35 window
      mask_grow:          0,                  // grow-0 first: sharpest seam
      detection_threshold: 0.5,
      window_start:       0,                  // frames at the 24 fps clock
      window_length:      90,
      clip_seconds:       6,
      overlap_frames:     39,
      resolution:         '736p',
      seed:               0,
      steps:              6,
    }])

THE HOLD LAW: everything outside the tracked mask is HELD — the frame
around the region and the entire soundtrack. An output where the
background moves, the lighting shifts or the audio changes is a
failure, not a style choice. Start at `mask_grow` 0 and grow (16 is
the served default, 96 the ceiling) only when the mask clips the
feature.

THE REGION IS THE PROMPT: `region_prompt` is what the detector tracks
("hands", "the left forearm", "her face") — it is NOT the edit
instruction. `repair_prompt` says what the region should become. A
region the detector cannot find yields an empty mask and a pass that
changes nothing; judge the mask before judging the pixels.

## Worked recipe (two real shapes)

**A. One region in a short clip — the default press.** Source
`demo_clip.mp4` (6.0 s = 144 f, 24 fps). The hands are wrong from 3.2 s.
Seat one repair entry and nothing else:

```
params.repair = [{
  source_clip: "demo_clip.mp4",
  repair_prompt: "natural hands, five fingers, no extra digits",
  region_prompt: "hands",
  denoise: 0.32, mask_grow: 16, detection_threshold: 0.5,
  window_start: 77, window_length: 90, clip_seconds: 3.75,
  overlap_frames: 22, resolution: "736p", seed: 0, steps: 6
}]
```

`window_start` 77 = 3.21 s, so the window covers 3.21–6.96 s — the whole
end of the clip, one press, no splice. Everything outside the tracked
mask (and the audio) is held from the source. 90 f at 736p is the green
window; do not widen it to "just get the start of the clip too" —
`window_start: 0` with 144 f is two windows and two presses.

**B. A region on a composed film — the splice-aware press.** The film
was built from 90 f windows at step 68 f (`start_seconds` 0 / 2.833 /
5.667 …), so seams sit at 3.75 s, 6.583 s, … To fix the hands in the
window that starts at 2.833 s, use that window's own numbers:

```
window_start: 68, window_length: 90, clip_seconds: 3.75, overlap_frames: 22
```

The repaired run returns ONE 90 f clip; it replaces the same slot in the
assembly. This door does not splice: re-join with the same 22 f overlap
the film was built with (or trim the overlap in an editor) — never weld a
repair window onto a different step, the seam drifts by the difference.
A region that straddles a seam needs the window on both sides; press them
in order and keep each window's own `window_start`.

## Companion surfaces

- `refine` sharpens the whole window after a repair lands — the
  repair fixes the region, the refine tightens the detail.
- `swap` (replace) is the OTHER person-shaped door: it swaps a whole
  person from identity art; repair never reads identity art.
- `video-timeline` composes films; a repair is its own run with its
  own terminal.
