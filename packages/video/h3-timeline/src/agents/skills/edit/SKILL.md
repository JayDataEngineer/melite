---
name: edit
description: "The video-edit matrix on the h3-timeline: ONE bag whose dials state the cell — mask source (per-frame SAM3 region, whole frame, or one staged PNG resized in-graph), identity anchors (the source itself, or a still + mannequin pair), and the denoise pole. The five legacy edit names (replace, repair, extend, refine, upscale) do not stay as doors: a doc stating one composes through to its cell here, and an unstated dial refuses loud (never a silent drop). NOT a new camera (Reshoot) — the refine pass (refine + scale), the continuation (continuation + extend_seconds), and the deferred 2x upscale of a prior chain run (chain_run) are dials ON this door."
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
(the denoise pole) — the door composes the cell. Five legacy doors
were FIXED cells of this matrix; their names still compose (the
door translates a legacy doc into its cell at the compose door,
never a frozen peer), and the free cells compose here.

THE EDIT BAG'S STARTING CELLS (§0.8's flow model): the cells are
DIAL VALUES an agent stages into the one bag — the UI face is the
four-axes field grammar itself, no checkbox layer; a cell never
renders. The six named cells over
this one schema: `repair-region` (region × self × 0.32, sound held;
the mask slot chooses the how — the SAM3 region track or one staged
PNG, the static read is the MASK DIAL's value, never a second
cell), `identity-swap` (region × still+mannequin × 1, the masked
side re-rendered whole — ONE cell for both reads: clothing vs
identity is PROMPT WORDS, never two; push denoise toward 0.55 to
keep source motion riding through), `whole-frame-restyle`
(whole-frame × self × 0.6, under the boil floor), `refine-2x`
(whole-frame × self × 0.32 with the refine switch ON at 2x, the
learned upscale riding this edit's own latents in the same run),
`extend-continuation` (whole-frame × self × 1, fresh seconds past
the forced seam, state extend_seconds), and `upscale-2x` (the
deferred second pass of a PRIOR chain run: state chain_run, the
recipe's pass-2 window serves). A cell stages its dials into the
bag; cells COMPOSE — repair + upscale in the same run is both
cells' dials in the one bag, never a combined route. The wire is
the bag — cell ids never ride it. The user states the same matrix
through the bag's own seats: the Mask source menu (region /
whole-frame / static-png opens the staged-PNG MASK SLOT), the
Identity anchors menu (still+mannequin opens the still + mannequin
slots), the Denoise pole, the Refine switch (opens scale), the
Continuation switch (opens extend_seconds).

It is NOT:
- **a new camera** — that is `reshoot`, a different chain (MoGe +
  CrossView), never a masked edit. It is the ONE door this family
  refuses to fold: not a cell of the mask × anchors × denoise
  matrix.

It IS (the postures that read like doors but are DIALS here): a
continuation (`continuation` + `extend_seconds`, the forced seam
appends fresh full-denoise seconds), a no-reference second pass
(`refine` + `scale`, the learned upscale riding this edit's own
latents in the same run), and a deferred 2x upscale of a PRIOR run
(`chain_run`, the checkpointed scenes resume through the requeue
loop — a different mechanism than the refine switch).

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
     The design window is 56 f (2.33s = 56f); a 2x window past the
     measured 141 f OOM refuses.
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
   - `chain_run` (text, "") — THE UPSCALE POSTURE'S ARMING SEAT:
     the engine-side run name of a PRIOR chain run. Stating it
     turns the edit into the DEFERRED 2x second pass — the run's
     checkpointed scenes resume scene by scene through the requeue
     loop (CheckpointManager → UpscaleAdapter → … →
     UpscaleLoopEnd), a DIFFERENT mechanism than the refine switch
     (same-run handoff): one door, the SOURCE names which. The
     execute door resolves the name to the newest per-scene
     lineage; unknown names refuse loud THERE. Recipe pass-2
     window: denoise 0.24, steps 20; a BLANK edit_prompt is lawful
     (the run's own scene prompts serve). Refine and continuation
     REFUSE under this posture — one second-pass mechanism, one
     source posture. Mask, anchor, and window dials are inert
     here (no clip rides).
   - `segment_crf` (0–51, 18) — the H.264 quality of the persisted
     HQ scene segments the resumed run re-encodes (the adapter's
     own seat; 18 is its default). Rides ONLY the upscale posture —
     a fresh edit never states it.
   - `carry` (boolean, true) — THE ONE SPLIT CONCEPT. ON (the
     default): the edit runs the WHOLE film — the engine splits it
     into segments on the film's own timeline and each segment
     continues from the last frame of the previous, joined with the
     derived AV-legal overlap (39/90/141/192/243 frames — the
     engine's continuity law, DERIVED, never typed). OFF: the joins
     cut — each segment stands alone. NEVER type frame arithmetic:
     `window_start` / `window_length` / `clip_seconds` /
     `overlap_frames` are internal engine seats now (an unstated
     window IS the whole film; an off-grid or out-of-vocabulary
     value refuses at compose, naming the cure — `carry: true`).
     The burn this law buries: an agent once typed
     `window_length: 90` on a 243 f film, repaired 90 of 243
     frames, and reported it as a repair pass (run-e79f3b304e4b);
     another typed `overlap_frames: 22` and the engine refused
     eight nodes deep (run-1f91718b7cde).
   - `resolution` (select, 'auto') — the plan's resolution tier.
     AUTO (the default) derives the source film's own tier - never
     state it unless you deliberately want another regime (480p
     quick preview, 576p, 736p, 768p, 1080p ~2.5× slower).
   - `seed` (0–4294967295, 0) — the chain plan's `base_seed`; the
     sampler seed stays the doc seed.
   - `steps` (1–30, 6) — the chain plan's `default_steps`; the sampler
     steps stay the doc marriage.
6. **Confirm.** Show the bound clip, the mask in words ("the tracked
   hands, grown 16 px, blurred 0"), the anchors, the pole, and that
   every other arm is empty.


## Worked recipe (two real shapes)

**A. One region on a clip - the default press, the WHOLE film.** Source
`demo_clip.mp4` (6.0 s, 24 fps). The hands are wrong from 3.2 s.
Seat one edit entry and nothing else:

```
params.edit = [{
  source_clip: "demo_clip.mp4",
  edit_prompt: "natural hands, five fingers, no extra digits",
  region_prompt: "hands",
  mask_source: "region", reference: "self",
  denoise: 0.32, keep_audio: true, mask_grow: 16, detection_threshold: 0.5,
  carry: true, seed: 0, steps: 6
}]
```

`carry: true` (the default — stating it is optional) runs the WHOLE
film: the engine splits it into segments on the film's own timeline,
each segment continues from the last frame of the previous, and the
joined film comes back in ONE press. No frame numbers, no splice, no
second press. Everything outside the tracked mask (and the audio) is
held from the source. THE LAW: if you find yourself computing
`window_start` from a timestamp, STOP - that arithmetic is the burn
this door was rebuilt to make impossible. State the transformation
once; the film's own timeline does the splitting.

**B. A region on a composed film - the same press.** A film built
from windows at any step, seams anywhere, hands wrong in the middle
of it: the SAME entry as A. The engine's plan reads the source film
itself (its spans, its geometry, its soundtrack) and re-joins with
the derived AV-legal overlap - there are no seam numbers to copy, no
window slots to replace, no editor re-join. The composed-film case
and the single-clip case are now literally the same statement. (The
old splice craft - copy the build's own `window_start`/`overlap`
numbers by hand - is RETIRED: it repaired 90 of 243 frames once and
called itself a repair pass.)

## The seam craft (measured, one home)

- NO CROSSFADE, EVER: a blend of two INDEPENDENT renders is
  a DOUBLE EXPOSURE (the ghost), not a soft step and not a cure for
  the pop - measured Δ8.86–9.80 across the carry against Δ4.3
  between adjacent frames inside one window. The crossfade is not
  served; an off-grid carry REFUSES at compose instead.
- The carried span is BIT-IDENTICAL: the finalize drops the incoming
  window's re-rendered head, so every frame the film emits across
  the join is the previous window's own decode, never a blend - and
  the audio seam keeps its soft step.
- The honest postures: a film that must be seamless TODAY on the
  audio too presses ONE 56 f window (2.33 s) — a single window is seam-free
  by construction; a longer film tiles or presses window
  by window. Judge each window before pressing the next, and judge
  the join before calling the film done.
- The measured OOM ceilings: 141 f @2x (the refine handoff), and a
  430 f window @1.0 OOM'd too (20.08 GiB allocated, 830 MiB short) -
  budget the window, never widen it on hope.

## One door per doc

The edit arm races every other armed door — replace, repair, extend,
refine, upscale, reshoot — and each pair refuses loud naming the door
to empty. The lora bag is the one co-arm: it rides WITH a door (the
lora plane is the doc's own), never blocks one, and empties with
`loras` to disarm.
