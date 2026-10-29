---
name: whats-next
model: qwen-img-edit-21
description: "Advance the moment — the next beat as a still: state deltas named per element (who moved where, what changed) while world and identity hold. Use for what-happens-next, next frame, continuations."
---

# What's Next

> VERIFIED LIVE 2026-11-12 against receipt `contracts/receipts/2026-11-12-models-qwen-edit-21-docs.md` (run run-6477ced34d3c-8707495a — the next-beat prompt rendered live end-to-end with the world held and the state advanced: the named-deltas pattern this skill teaches).

## What it is for

A continuation is a NEW PICTURE OF THE SAME WORLD one beat later:
the scene is the invariant, the STATE advances. It is the still
frame of a story beat — and the natural storyboarding companion to
the video lane (a chain of next-beats is a shot list).

## Name the deltas, element by element

The prompt is a state spec (the density law) — for each thing that
moves, say from where to where:

- "One second later: the rider's front wheel has just dropped past
  the coping, knees compressed to absorb, arms braced; the spray of
  dust has kicked up behind the rear wheel; the crowd's nearest
  figure has raised both arms"
- elements not named are the invariants: "the ramp, the fence, the
  sky, and everyone else hold exactly as in the image"

One beat only — a single legible change of state, not a montage.
The camera usually HOLDS (a continuation is not a camera move —
that is the `angles` skill); if the beat implies a reframing, name
it explicitly.

## The prompt pattern

"<The beat>: <per-element deltas>. Keep the faces, identities,
clothing, the setting, the lighting, and the composition exactly
as in the image; only the named changes advance."

Physics and consequence are the craft: motion leaves evidence
(motion blur on the moving part, disturbed dust, displaced water,
a swing still swinging) — name the evidence or the beat reads
posed. Emotional beats carry in the body (weight shift, breath,
gaze) — name the body, not the feeling alone.

## Guards

Under-editing: the beat must be legible without the caption —
compare and the state has clearly advanced. Leakage: nothing
unnamed moves; the world is not tidied, restyled, or re-populated.
Identity: same people, same clothes — a continuation is not a
recast.

## Composing the run

image-edit card, `model: qwen-img-edit-21`: `input_images` =
[the still], the state-spec prompt, fixed seed across the chain so
the world persists beat to beat. Hand a run of next-beats to the
video lane as the shot sequence — or compose each as the first
frame of its own shot.

## Density tripwire

A prompt under ~200 words cannot render a designed layout — one
paragraph per zone, every rendered string quoted.
