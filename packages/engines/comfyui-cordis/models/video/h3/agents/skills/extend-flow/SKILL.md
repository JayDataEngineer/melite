---
name: extend-flow
description: Extend a clip with more seconds — when the take is RIGHT and the story needs MORE of it. The continuation anchors on the prior clip's last frame (taken in-graph), generates fresh motion and sound at full denoise, and joins prior + new into one film. Use instead of re-rolling when the existing content should be kept, not fixed.
---

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
`params.extend[0]`; the flow id `extend-video` is a RUN-DOOR name —
add_stage refuses it, naming its card riders) and the run starts at
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

## What lands

The extended film: prior seconds verbatim (their own soundtrack), then
the new seconds (fresh motion AND fresh audio), joined by the film
tail's file law — one mp4 under the run's `extend_film` prefix.
Multi-window extends (stated > 362f) use BOTH join primitives: the
in-chain windows assemble under ChainAssemble (`extend_chain`
prefix), then prior file + assembly join through the concat's
`append` seat — one film, two joins composed (the flow skill's "What
runs" carries the full wiring). The
extended film is itself a stageable clip: chained extends feed
`extend_film` back as the next call's `source_clip` (the
timeline-craft skill owns the drift-control law for long chains —
overlap is the engine's own seam machinery, never a hand-set knob).
