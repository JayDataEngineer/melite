---
name: edit
description: "The video-edit matrix on the h3-timeline: ONE bag whose dials state the cell — mask source (per-frame SAM3 region, whole frame, or one staged PNG resized in-graph), identity anchors (the source itself, or a still + mannequin pair), and the denoise pole. The seven legacy doors stay (each pinned byte-exact); this door serves the whole grid on the family's one matrix seat. NOT a new camera (Reshoot) — the refine pass (refine + scale) and the continuation (continuation + extend_seconds) are dials ON this door."
genre: video
---

# Video edit (the edit matrix) — SPEC

> The emission composes per the family's matrix seat (`models/h3`
> renderH3Edit): the dial-resolved mask + anchors ride the ONE chain
> spine (chainEdit.ts) through the ONE constructor
> (contexMaskedTarget) every masked-edit seat shares. Prose never
> overrides the loaded bundle: the fields below are quoted off the
> card's served edit kind.
>
> Live-proven: the wall tier pins every dial's emission and every
> refusal on its own path (edit-matrix.spec.ts, 14 arms,
> toggle-proven). NOT yet verified live: a GPU render through this
> door — treat the first press as the lane proof.

## What it is (and is NOT)

One bag, the whole edit matrix: you state WHERE the edit lands (the
mask), WHO it keeps (the identity anchors), and HOW HARD it re-renders
(the denoise pole) — the door composes the cell. The seven legacy
doors were seven FIXED cells of this matrix; each stays frozen
byte-pinned for its own docs, and the free cells compose here.

THE NAMED CELLS (stage 3): the card serves five preset chips over
this one schema — `repair-region` (region × self × 0.32, sound held),
`identity-swap` (region × still+mannequin × 1, the masked side
re-rendered whole), `outfit-change` (region × still+mannequin × 0.55,
appearance anchored, motion riding through), `whole-frame-restyle`
(whole-frame × self × 0.6, under the boil floor), and
`static-mask-pass` (static-png × self × 0.32). A chip is a STARTING
cell, never a second door: state the cell's dials on the entry (the
GUI chip and your entry compose identically — the wire is the bag,
preset ids never ride it).

It is NOT:
- **a continuation** — more seconds appended to a prior clip is the
  `extend` door (its composition solver and forced entry seam are its
  own laws); this door refuses a continuation cell naming that door.
- **a no-reference second pass** — the `refine` bag's own body class
  (the 2x handoff) serves it; naming it here refuses the same way.
- **a new camera** — that is `reshoot`, a different chain (MoGe +
  CrossView), never a masked edit.

## The flow (bind, confirm, press)

1. **Get the clip.** An edit reads ONE staged video leaf by name
   (`source_clip`) — the footage the edit rides.
2. **Arm and bind.** Seat ONE entry on the `edit` mod bag:
   `params.edit = [entry]` — never flat. `source_clip` and
   `edit_prompt` are required: an empty dial refuses LOUD naming the
   dial.
3. **State the mask.** `mask_source` picks the door's three mask
   derivations:
   - `region` (the default) — `region_prompt` is the SAM3 detection
     target ("hands", "a person", "a face"); the mask tracks every
     matching object per frame and grows by `mask_grow`. The tuning
     seats (`mask_grow`, `mask_blur`, `detection_threshold`) are the
     coarse-mask cure: thin structures (handles, caps) tune at the
     door, never by hand.
   - `whole-frame` — an all-white mask, nothing held (the restyle
     pole).
   - `static-png` — ONE staged PNG (`mask`; the track run's pixel-max
     union is the recommended bridge). The chain decodes it and
     RESIZES it to the plan geometry in-graph: the file's own
     resolution never has to match the clip.
4. **State the anchors.** `reference` picks the identity posture:
   - `self` (the default) — the source clip rides its own reference
     seat; the identity anchor is the person already in the frame
     (zero new pixels).
   - `still+mannequin` — `still` + `mannequin` both required: the
     still anchors appearance (it MUST show the person wearing the
     target look — a garment alone hallucinates the uncovered body),
     the mannequin carries motion.
5. **Set the dials.** The entry fields (the card's served ranges):
   - `denoise` (0.05–1, 0.32) — the edit pole: partial (the repair
     window is 0.30–0.35) holds the unmasked region AND its sound; 1
     re-renders the masked side whole. Whole-frame × self at 0.8 or
     more is the identity boil and REFUSES — anchor the identity or
     use the reshoot door.
   - `mask_grow` (0–96, 16) — pixels the mask grows before the edit
     (region and static-png sources): the seam ring. 0 edits exactly
     the detected region.
   - `mask_blur` (0–48, 0) — edge softness of the grown mask: 0 is a
     hard edge, a few px feathers the boundary into the hold.
   - `detection_threshold` (0–1, 0.5) — the SAM3 score threshold
     (region source); lower finds more objects with noisier masks.
   - `keep_audio` (boolean, true) — ON rides the source soundtrack
     unchanged; OFF (full denoise only) generates fresh — a partial
     pass never drops it.
   - `refine` (boolean, false) — THE FOURTH DIAL, the refine switch:
     ON adds the learned second pass to THIS chain — the 3D-conv
     latent upscale + low-sigma refine ride the edit's OWN latents
     (same run, no re-encode of a saved clip). Partial denoise only;
     blank mask + partial + refine on = the classic refine posture.
   - `scale` (1–4, 2) — rides only the refine pass (inert when off):
     the learned upscaler's multiplier. 1 is the same-size sharpening
     pass (the capacity cure); 2 the classic second pass — a >=2x
     window past the measured 141 f OOM REFUSES naming both cures
     (cut window_length / clip_seconds, or drop under 2).
   - `continuation` (boolean, false) — THE CONTINUATION SWITCH: ON
     turns the edit into an EXTEND — fresh full-denoise seconds
     appended to the source's last frame (the forced seam), joined
     with the prior into one film. Rides blank mask + self anchors +
     denoise 1; every other cell REFUSES loud.
   - `extend_seconds` (0.91–432.29, 2.33) — rides only the
     continuation (inert when off): seconds appended. A single
     window lands on the engine grid 22+17k (2.33s = 56f, 15.08s =
     362f the largest); beyond it N uniform windows join under the
     39f context overlap, exact delivery or a refusal naming the
     neighbors (ceiling 432.29s).
   - `window_start` (0–100000, 0) — frames at the film clock (24 fps)
     to skip before the edit window.
   - `window_length` (0–100000, 0) — frames in the window; 0 runs to
     the end of the clip. A stated length must land on the engine
     grid 22+17k (56, 73, 90…) or it refuses naming the nearest.
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
6. **Confirm.** Show the bound clip, the mask in words ("the tracked
   hands, grown 16 px, blurred 0"), the anchors, the pole, and that
   every other arm is empty.

## One door per doc

The edit arm races every other armed door — replace, repair, extend,
refine, upscale, reshoot — and each pair refuses loud naming the door
to empty. The lora bag is the one co-arm: it rides WITH a door (the
lora plane is the doc's own), never blocks one, and empties with
`loras` to disarm.
