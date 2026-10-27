---
name: openjutsu
description: Character/subject swap in video — a reference still replaces the person in a driving clip via the Viggle INT8 lane (MiniMax H3 Ref2VA fine-tune). Consent and AI-labeling are hard preconditions.
model: viggle-animate
---

Openjutsu via the viggle-animate lane. One reference image, one driving clip,
one swapped video out. The INT8 Ref2VA body is the primary path — no pose
extractor, no skeleton prep: the model carries motion from the clip and
identity from the still directly.

## The three doors, in order
1. `melite_discover` — find the openjutsu card (genre video).
2. `melite_load` — open it: the `ref_image` + `clip` seats are REQUIRED
   (both `required_defaults` on the family); everything else has honest
   defaults.
3. `melite_construct` — `add_stage` with the card (`model="viggle-animate"`),
   patch your two inputs + any recipe, and the run starts at the user's Run
   press. Never curl the engine; the card owns the door.

## Inputs that matter
- `ref_image`: the identity still — a clean, front-facing crop of the person
  or character to swap IN. One person per run.
- `clip` (or a `$`-wired clip from an upstream stage): the driving footage.
  The swap follows this clip's motion and framing; 124 frames default
  (5–3600 lawful).
- `length`: match the clip or trim it; width/height 0 = follow the clip.

## Recipes (the variant knob)
- `standard` (default): DMD2 distill LoRA on, 3 steps — fast takes for
  iteration.
- `four-step`: 4 DMD updates — one notch steadier motion.
- `identity-lock`: DMD + the character-swap LoRA — the drift cure when the
  face wanders across the clip. Reach for this on long clips or strong
  profile turns; if identity still drifts, swap the reference still for a
  cleaner one before touching parameters.
Steps ride a fixed DMD2 sigma schedule (euler, no CFG) — do not add sampler
or prompt knobs; the frozen text embed IS the text surface.

## The estate-native secondary path
When the job is a full camera move or pose transfer rather than an identity
swap, the h3-timeline card with the Fun ControlNet Union 2.0 patch
(pose/depth) is the native estate path — same H3 family, different lane.
Use openjutsu for identity swaps, h3-timeline for directed motion.

## License and consent (preconditions, not parameters)
- The weights carry the MiniMax H3 Community License: use is permitted
  worldwide EXCLUDING the EU, UK, South Korea and the US (contact
  api@minimax.io for excluded territories). H3 is the estate's licensed
  exception to its open-weights rule — MiniMax permits this distribution
  arrangement; it is NOT an open-weights release.
- The upstream pack is Apache-2.0; the swap LoRA and the depth model ride
  their own rows in the family's ATTRIBUTION.
- CONSENT IS A PRECONDITION: never swap a real person who has not consented.
  Label what you generate as AI-generated. A swap without consent or without
  labeling is a refusal, not a parameter choice.
