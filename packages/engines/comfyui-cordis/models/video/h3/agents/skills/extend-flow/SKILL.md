---
name: extend-flow
description: Extend a clip with more seconds — when the take is RIGHT and the story needs MORE of it. The continuation anchors on the prior clip's last frame (taken in-graph), generates fresh motion and sound at full denoise, and joins prior + new into one film. Use instead of re-rolling when the existing content should be kept, not fixed.
---

> THE COLLAPSE — THE `extend` NAME IS A PRESET CELL, NOT A DOOR. This
> leaf documents the LEGACY spelling so old docs keep composing: state
> the cell on the ONE Video edit bag (`params.edit`).
> `extend: [{...}]` resolves to `edit: [{ continuation: true,
> mask_source: "whole-frame", reference: "self", denoise: 1 }]` — the
> joined continuation. New docs state the edit bag directly.

# Extend Flow

## The decision

Extend when the clip's take is right and the story needs more of it.
Re-roll (same seed, new prompt) when the take itself is wrong — an
extension continues content, it never corrects it. A masked fix of a
region is the repair door; a person swap is the replace door; one door
per doc.

## The drive

One card, one bag: bench the h3-timeline card with the `extend` arm
(`melite_construct add_stage` card "h3-timeline", the seats below in
`params.extend[0]` — the card is the door) and the run starts at
the user's Run press. The seats:

- `source_clip` — the prior clip, a stageable video. An earlier run's
  artifact URL lands (`/melite-media/runs/<run_id>/<file>.mp4`).
- `extend_prompt` — MOTION and SOUND picking up exactly where the clip
  ends. Verb first, sound second (the keyframe-flow prompting law:
  the anchor already defines composition, so the prompt drives what
  HAPPENS NEXT, never a static restatement).
- `extend_seconds` — on the engine grid (frames become seconds at
  the schema fps default): 2.33, 3.75, 5.17 … 15.08 = 362f, the
  largest SINGLE window. Off-grid refuses at the compose door, never
  a silent snap. Beyond 362f the door composes N uniform windows
  under the 39-frame context overlap — delivered = N×w − (N−1)×39
  exactly, or a loud refusal naming the neighbors (ceiling 32
  windows).
- `seed` — the plan base seed; the reference runs 0. Same seed across
  re-extends of one clip keeps the world texture.

## The anchor law

The prior clip's LAST FRAME is the continuation's identity anchor —
taken in-graph off the loaded clip (negative batch index), riding both
the plan's picture seat and the r2v reference seats. No frame is
extracted out-of-graph, no frame count is probed: the engine reads its
own tail. The whole clip also rides the motion-identity reference
seat, so the continuation keeps the clip's world texture, not just
its final pose.

## THE SEAM LAW — say this before the press

The anchor is an IMAGE REFERENCE, not a pixel lock. The continuation
is a fresh window at full denoise, so its first frame is a NEW pose,
not the frame it was handed. The join size follows SEED CONTINUITY —
measured on the film plane (0–255 scale, the schema fps default):

    adjacent frames inside a window   : Δ1.0–1.3
    same-seed extend, butt-join       : Δ3.1
    chained extend (fresh seed)       : Δ1.7
    prompt names a NEW action         : Δ≈35

Keep `seed` at the source film's seed and the butt-join lands at a
SOFT step — two to three times the interior noise, not a hard wall
(an anchor-only join with differing seeds measures a ≈25 Δ band).
What still holds across the seam: character, wardrobe, studio,
lighting and style; what moves is the moment.

So: **extend continues the STORY, not the MOTION.** Tell the operator
that in the confirmation, and judge the boundary frames before calling
it done. If the ask is "the dance keeps going from exactly where it
stopped", extend is the wrong door today — the cures are holding the
anchor frame as the window's first frame (a mask/hold shape) or
carrying the prior latent, and neither is wired on this arm.

A prompt that names a NEW action ("she looks up and speaks") moves the
subject at the seam far more than the anchor does — the biggest term
in the table above. Write `extend_prompt` as a continuation of the
same action.

## What lands

The extended film: prior seconds verbatim (their own soundtrack), then
the new seconds (fresh motion AND fresh audio), joined by the film
tail's file law — one mp4 under the run's `extend_film` prefix.
Multi-window extends (stated > 362f) use BOTH join primitives: the
in-chain windows assemble under ChainAssemble (`extend_chain`
prefix), then prior file + assembly join through the concat's
`append` seat — one film, two joins composed. The
extended film is itself a stageable clip: chained extends feed
`extend_film` back as the next call's `source_clip` (the
timeline-craft skill owns the drift-control law for long chains —
overlap is the engine's own seam machinery, never a hand-set knob).
The canvas snaps to the model bucket on this arm too: a source off
the bucket lands re-seated (1344x768 -> 1280x736; aspect held to
~0.6 %) — budget the ~5 % resize in any join math downstream.

